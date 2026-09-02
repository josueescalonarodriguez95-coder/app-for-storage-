import { supabase } from './supabaseClient'
import { movimientoAFila, mudanzaAFila, mudanzaObjetoAFila, objetoAFila } from './mappers'
import { listClientes, listMudanzas, listObjetosDeMudanza, listObjetosPrincipales } from './repo'
import type { Cliente, MotivoSalida, Movimiento, Mudanza, Objeto, TipoCliente } from './schema'

/** Los siguientes `cantidad` números de inventario libres, en orden: el mayor RD-#### existente
 * + 1, + 2, etc. Todos de una sola consulta, para poder darle uno a cada unidad de un lote sin
 * que se repitan (llamar a nextObjetoId() varias veces seguidas devolvería el mismo número las
 * veces, porque ninguno queda guardado hasta el final). */
export async function nextObjetoIds(cantidad: number): Promise<string[]> {
  const objetos = await listObjetosPrincipales()
  const maximo = objetos.reduce((max, o) => {
    const n = Number(o.id.replace(/^RD-/, ''))
    return Number.isFinite(n) && n > max ? n : max
  }, 1066)
  return Array.from({ length: cantidad }, (_, i) => `RD-${maximo + 1 + i}`)
}

/** Siguiente número de inventario libre: el mayor RD-#### existente + 1. */
export async function nextObjetoId(): Promise<string> {
  const [id] = await nextObjetoIds(1)
  return id
}

function inferirTipoCliente(nombre: string): TipoCliente {
  const n = nombre.toLowerCase()
  if (n.includes('galería') || n.includes('galeria')) return 'Galería'
  if (n.includes('museo')) return 'Museo'
  if (n.includes('fundación') || n.includes('fundacion')) return 'Fundación'
  return 'Particular'
}

/**
 * El campo "Cliente" del formulario es texto libre (README, "Registrar entrada").
 * Reutiliza un cliente existente por nombre o crea uno nuevo.
 */
export async function resolverCliente(nombreLibre: string): Promise<string> {
  const nombre = nombreLibre.trim() || 'Sin asignar'
  const clientes = await listClientes()
  const existente = clientes.find((c) => c.nombre.toLowerCase() === nombre.toLowerCase())
  if (existente) return existente.id

  const cliente: Cliente = {
    id: `cli-${crypto.randomUUID()}`,
    nombre,
    tipo: inferirTipoCliente(nombre),
    contacto: '',
  }
  const { error } = await supabase.from('clientes').insert(cliente)
  if (error) throw error
  return cliente.id
}

export interface NuevaEntrada {
  id: string
  tipo: Objeto['tipo']
  descripcion: string
  clienteId: string
  nave: string
  rack: string
  nivel: string
  largo: number | null
  ancho: number | null
  alto: number | null
  pesoKg: number | null
  piezas: Array<{ ref: string; descripcion: string; largo: number | null; ancho: number | null }>
  usuarioId: string
  fotoUrl: string | null
}

/**
 * Crea el registro y su primera entrada de historial en una sola transacción (RPC
 * crear_objeto_con_entrada, ver supabase/schema.sql) — README, "Registrar entrada": estado
 * «En bodega», ubicación y medidas concatenadas, historial firmado por el usuario en turno, y
 * el contenido si es guacal.
 */
export async function crearObjetoConEntrada(datos: NuevaEntrada): Promise<void> {
  const ahora = new Date().toISOString()

  const objeto: Objeto = {
    id: datos.id,
    tipo: datos.tipo,
    descripcion: datos.descripcion.trim() || `${datos.tipo} sin describir`,
    clienteId: datos.clienteId,
    ubicacion: { nave: datos.nave, rack: datos.rack || 'R09', nivel: datos.nivel || 'B1' },
    medidas: { largo: datos.largo, ancho: datos.ancho, alto: datos.alto },
    pesoKg: datos.pesoKg,
    fotoUrl: datos.fotoUrl,
    estado: 'En bodega',
    fechaEntrada: ahora,
    fechaSalida: null,
    contenedorId: null,
    ref: null,
  }

  const piezas: Objeto[] =
    datos.tipo === 'Guacal'
      ? datos.piezas.map((p) => ({
          id: `${datos.id}-${p.ref}`,
          tipo: 'Obra',
          descripcion: p.descripcion.trim() || 'Sin describir',
          clienteId: datos.clienteId,
          ubicacion: objeto.ubicacion,
          medidas: { largo: p.largo, ancho: p.ancho, alto: null },
          pesoKg: null,
          fotoUrl: null,
          estado: 'En bodega',
          fechaEntrada: ahora,
          fechaSalida: null,
          contenedorId: datos.id,
          ref: p.ref,
        }))
      : []

  const movimiento: Movimiento = {
    id: `${datos.id}-mov-1`,
    objetoId: datos.id,
    evento: 'Entrada',
    fechaHora: ahora,
    nota: 'Registrado desde el iPad de muelle',
    usuarioId: datos.usuarioId,
    recibeNombre: null,
    recibeDoc: null,
    firmaUrl: null,
    mudanzaId: null,
  }

  const { error } = await supabase.rpc('crear_objeto_con_entrada', {
    p_objeto: objetoAFila(objeto),
    p_piezas: piezas.map(objetoAFila),
    p_movimiento: movimientoAFila(movimiento),
  })
  if (error) throw error
}

export interface DatosSalida {
  objetoId: string
  motivo: MotivoSalida
  mudLink: string
  recibeNombre: string
  recibeDoc: string
  firmaUrl: string | null
  usuarioId: string
}

/**
 * Confirma la salida en una sola transacción (RPC confirmar_salida) — README, "Registrar
 * salida": el objeto pasa a «Fuera», se le pone fecha de salida, se le borra la ubicación, y
 * se añade al historial una entrada «Salida» con nota
 * `motivo · código de mudanza · recibe <nombre> (<id>)`, firmada por el usuario en turno.
 */
export async function confirmarSalida(datos: DatosSalida): Promise<void> {
  const { data: existe, error: errGet } = await supabase
    .from('objetos')
    .select('id')
    .eq('id', datos.objetoId)
    .maybeSingle()
  if (errGet) throw errGet
  if (!existe) throw new Error(`Objeto ${datos.objetoId} no encontrado`)

  const ahora = new Date().toISOString()
  const quienRecibe = datos.recibeNombre.trim() + (datos.recibeDoc.trim() ? ` (${datos.recibeDoc.trim()})` : '')

  const movimiento: Movimiento = {
    id: `${datos.objetoId}-mov-${ahora}`,
    objetoId: datos.objetoId,
    evento: 'Salida',
    fechaHora: ahora,
    nota: `${datos.motivo} · ${datos.mudLink} · recibe ${quienRecibe}`,
    usuarioId: datos.usuarioId,
    recibeNombre: datos.recibeNombre.trim(),
    recibeDoc: datos.recibeDoc.trim() || null,
    firmaUrl: datos.firmaUrl,
    mudanzaId: datos.mudLink,
  }

  const { error } = await supabase.rpc('confirmar_salida', {
    p_objeto_id: datos.objetoId,
    p_fecha_salida: ahora,
    p_movimiento: movimientoAFila(movimiento),
  })
  if (error) throw error
}

/**
 * Borra un registro por error (guacal, obra suelta, pedestal o vitrina) junto con sus piezas,
 * su historial y sus vínculos a mudanzas, en una sola transacción (RPC
 * eliminar_objeto_cascada). No está en el diseño original —el README pide que el historial sea
 * append-only— pero hace falta para poder limpiar una alta hecha por equivocación.
 */
export async function eliminarObjeto(id: string): Promise<void> {
  const { error } = await supabase.rpc('eliminar_objeto_cascada', { p_id: id })
  if (error) throw error
}

/** Quita el vínculo entre un objeto y una mudanza (no borra el objeto ni la mudanza). */
export async function desvincularDeMudanza(mudanzaId: string, objetoId: string): Promise<void> {
  const { error } = await supabase.from('mudanza_objetos').delete().eq('mudanza_id', mudanzaId).eq('objeto_id', objetoId)
  if (error) throw error
}

/** Siguiente código de mudanza libre: el mayor MD-### existente + 1. */
async function nextMudanzaCodigo(): Promise<string> {
  const mudanzas = await listMudanzas()
  const maximo = mudanzas.reduce((max, m) => {
    const n = Number(m.codigo.replace(/^MD-/, ''))
    return Number.isFinite(n) && n > max ? n : max
  }, 204)
  return `MD-${maximo + 1}`
}

export interface NuevaMudanza {
  clienteNombre: string
  destino: string
  fecha: string
  cuadrilla: string
}

/** Crea una mudanza nueva — cliente, dirección de destino, fecha y cuadrilla; arranca
 * «Reservado» hasta que se cierre. Devuelve el código para dejarla seleccionada de una. */
export async function crearMudanza(datos: NuevaMudanza): Promise<string> {
  const clienteId = await resolverCliente(datos.clienteNombre)
  const codigo = await nextMudanzaCodigo()
  const mudanza: Mudanza = {
    codigo,
    clienteId,
    fecha: datos.fecha,
    destino: datos.destino.trim() || 'Sin dirección',
    cuadrilla: datos.cuadrilla.trim() || 'Por asignar',
    estado: 'Reservado',
  }
  const { error } = await supabase.from('mudanzas').insert(mudanzaAFila(mudanza))
  if (error) throw error
  return codigo
}

export interface NuevoArticuloMudanza {
  mudanzaId: string
  clienteId: string
  descripcion: string
  cantidad: number
  usuarioId: string
}

/**
 * Agrega uno o varios artículos iguales a una mudanza (p. ej. "Silla" × 2 al recibirlas):
 * cada unidad queda como su propio objeto, con su propio historial y su propio QR — así se
 * puede pegar una etiqueta en cada silla, no una sola etiqueta que diga "2 sillas".
 */
export async function agregarArticulosAMudanza(datos: NuevoArticuloMudanza): Promise<Objeto[]> {
  const cantidad = Math.max(1, Math.round(datos.cantidad) || 1)
  const ahora = new Date().toISOString()
  const descripcion = datos.descripcion.trim() || 'Sin describir'
  const ids = await nextObjetoIds(cantidad)

  const nuevos: Objeto[] = ids.map((id) => ({
    id,
    tipo: 'Obra',
    descripcion,
    clienteId: datos.clienteId,
    ubicacion: null,
    medidas: { largo: null, ancho: null, alto: null },
    pesoKg: null,
    fotoUrl: null,
    estado: 'Reservado',
    fechaEntrada: ahora,
    fechaSalida: null,
    contenedorId: null,
    ref: null,
  }))

  const movimientos: Movimiento[] = nuevos.map((o) => ({
    id: `${o.id}-mov-1`,
    objetoId: o.id,
    evento: 'Entrada',
    fechaHora: ahora,
    nota: `Recibido para la mudanza ${datos.mudanzaId}`,
    usuarioId: datos.usuarioId,
    recibeNombre: null,
    recibeDoc: null,
    firmaUrl: null,
    mudanzaId: datos.mudanzaId,
  }))

  const vinculos = nuevos.map((o) => ({ mudanzaId: datos.mudanzaId, objetoId: o.id, estadoCarga: 'Pendiente' as const }))

  const { error: e1 } = await supabase.from('objetos').insert(nuevos.map(objetoAFila))
  if (e1) throw e1
  const { error: e2 } = await supabase.from('movimientos').insert(movimientos.map(movimientoAFila))
  if (e2) throw e2
  const { error: e3 } = await supabase.from('mudanza_objetos').insert(vinculos.map(mudanzaObjetoAFila))
  if (e3) throw e3

  return nuevos
}

/**
 * Borra una mudanza por error, junto con todos sus artículos (cada uno con su propio borrado
 * en cascada — historial y vínculo incluidos). No se puede dejar la mudanza a medio borrar con
 * artículos sueltos flotando sin adónde ir, así que se borra todo junto.
 */
export async function eliminarMudanza(codigo: string): Promise<void> {
  const vinculados = await listObjetosDeMudanza(codigo)
  await Promise.all(vinculados.map((v) => eliminarObjeto(v.objeto.id)))
  const { error } = await supabase.from('mudanzas').delete().eq('codigo', codigo)
  if (error) throw error
}
