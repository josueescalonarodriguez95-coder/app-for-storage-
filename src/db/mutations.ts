import { getDB } from './db'
import { listClientes, listObjetosPrincipales } from './repo'
import type { Cliente, MotivoSalida, Movimiento, Objeto, TipoCliente } from './schema'

/** Siguiente número de inventario libre: el mayor RD-#### existente + 1. */
export async function nextObjetoId(): Promise<string> {
  const objetos = await listObjetosPrincipales()
  const maximo = objetos.reduce((max, o) => {
    const n = Number(o.id.replace(/^RD-/, ''))
    return Number.isFinite(n) && n > max ? n : max
  }, 1066)
  return `RD-${maximo + 1}`
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
  const db = await getDB()
  await db.put('clientes', cliente)
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
 * Crea el registro y su primera entrada de historial en una sola transacción —
 * README, "Registrar entrada": estado «En bodega», ubicación y medidas concatenadas,
 * historial firmado por el usuario en turno, y el contenido si es guacal.
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

  const db = await getDB()
  const tx = db.transaction(['objetos', 'movimientos'], 'readwrite')
  await Promise.all([
    tx.objectStore('objetos').put(objeto),
    ...piezas.map((p) => tx.objectStore('objetos').put(p)),
    tx.objectStore('movimientos').put(movimiento),
    tx.done,
  ])
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
 * Confirma la salida — README, "Registrar salida": el objeto pasa a «Fuera», se le pone fecha
 * de salida, se le borra la ubicación, y se añade al historial una entrada «Salida» con nota
 * `motivo · código de mudanza · recibe <nombre> (<id>)`, firmada por el usuario en turno.
 */
export async function confirmarSalida(datos: DatosSalida): Promise<void> {
  const db = await getDB()
  const objeto = await db.get('objetos', datos.objetoId)
  if (!objeto) throw new Error(`Objeto ${datos.objetoId} no encontrado`)

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

  const tx = db.transaction(['objetos', 'movimientos'], 'readwrite')
  await Promise.all([
    tx.objectStore('objetos').put({ ...objeto, estado: 'Fuera', fechaSalida: ahora, ubicacion: null }),
    tx.objectStore('movimientos').put(movimiento),
    tx.done,
  ])
}
