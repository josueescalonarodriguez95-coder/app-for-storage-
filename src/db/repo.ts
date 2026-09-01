import { supabase } from './supabaseClient'
import { CLIENTES, USUARIOS, MUDANZAS, MUDANZA_OBJETOS, construirObjetosYMovimientos } from './seed'
import {
  filaACliente,
  filaAMovimiento,
  filaAMudanza,
  filaAMudanzaObjeto,
  filaAObjeto,
  filaAUsuario,
  movimientoAFila,
  mudanzaAFila,
  mudanzaObjetoAFila,
  objetoAFila,
} from './mappers'

/** Siembra los datos de ejemplo del README la primera vez que alguien abre la app (una sola
 * vez para todos los dispositivos, porque ahora la base es compartida). */
export async function seedIfEmpty(): Promise<void> {
  const { count, error } = await supabase.from('usuarios').select('*', { count: 'exact', head: true })
  if (error) throw error
  if ((count ?? 0) > 0) return

  const { objetos, movimientos } = construirObjetosYMovimientos()
  const { error: e1 } = await supabase.from('clientes').upsert(CLIENTES)
  if (e1) throw e1
  const { error: e2 } = await supabase.from('usuarios').upsert(USUARIOS)
  if (e2) throw e2
  const { error: e3 } = await supabase.from('objetos').upsert(objetos.map(objetoAFila))
  if (e3) throw e3
  const { error: e4 } = await supabase.from('movimientos').upsert(movimientos.map(movimientoAFila))
  if (e4) throw e4
  const { error: e5 } = await supabase.from('mudanzas').upsert(MUDANZAS.map(mudanzaAFila))
  if (e5) throw e5
  const { error: e6 } = await supabase.from('mudanza_objetos').upsert(MUDANZA_OBJETOS.map(mudanzaObjetoAFila))
  if (e6) throw e6
}

/**
 * Mantiene el personal en turno igual al de seed.ts, incluso si ya se había sembrado antes
 * (por id, así que no toca objetos, mudanzas ni nada más que ya se haya registrado). Se corre
 * siempre al abrir la app, no sólo cuando la base está vacía.
 */
export async function syncUsuarios(): Promise<void> {
  const { error } = await supabase.from('usuarios').upsert(USUARIOS)
  if (error) throw error
}

/** Todos los registros, incluidas las piezas de guacal (contenedorId != null). */
export async function listObjetos() {
  const { data, error } = await supabase.from('objetos').select('*')
  if (error) throw error
  return (data ?? []).map(filaAObjeto)
}

/** Un registro por su número de inventario, sea guacal/obra/pedestal/vitrina o una pieza. */
export async function getObjeto(id: string) {
  const { data, error } = await supabase.from('objetos').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data ? filaAObjeto(data) : undefined
}

/**
 * Sólo los registros de primer nivel (guacales, obras sueltas, pedestales, vitrinas).
 * Es la lista que se ve en Inventario, en los contadores de la cabecera y en el badge del menú:
 * las piezas de un guacal no son un registro independiente en esas vistas.
 */
export async function listObjetosPrincipales() {
  const { data, error } = await supabase.from('objetos').select('*').is('contenedor_id', null)
  if (error) throw error
  return (data ?? []).map(filaAObjeto)
}

/** Piezas contenidas en un guacal, en el orden de su referencia (P-01, P-02...). */
export async function listPiezas(contenedorId: string) {
  const { data, error } = await supabase.from('objetos').select('*').eq('contenedor_id', contenedorId)
  if (error) throw error
  return (data ?? []).map(filaAObjeto).sort((a, b) => (a.ref ?? '').localeCompare(b.ref ?? ''))
}

/** Historial de un objeto, del movimiento más antiguo al más reciente. Sólo lectura, append-only. */
export async function listMovimientosByObjeto(objetoId: string) {
  const { data, error } = await supabase
    .from('movimientos')
    .select('*')
    .eq('objeto_id', objetoId)
    .order('fecha_hora', { ascending: true })
  if (error) throw error
  return (data ?? []).map(filaAMovimiento)
}

export async function listClientes() {
  const { data, error } = await supabase.from('clientes').select('*')
  if (error) throw error
  return (data ?? []).map(filaACliente)
}

export async function listUsuarios() {
  const { data, error } = await supabase.from('usuarios').select('*')
  if (error) throw error
  return (data ?? []).map(filaAUsuario)
}

export async function listMudanzas() {
  const { data, error } = await supabase.from('mudanzas').select('*')
  if (error) throw error
  return (data ?? []).map(filaAMudanza)
}

/** Objetos vinculados a una mudanza, con su registro y su estado de carga. */
export async function listObjetosDeMudanza(mudanzaId: string) {
  const { data, error } = await supabase
    .from('mudanza_objetos')
    .select('*, objetos(*)')
    .eq('mudanza_id', mudanzaId)
  if (error) throw error
  return (data ?? [])
    .map((fila) => ({
      vinculo: filaAMudanzaObjeto(fila),
      objeto: fila.objetos ? filaAObjeto(fila.objetos) : undefined,
    }))
    .filter((x): x is { vinculo: ReturnType<typeof filaAMudanzaObjeto>; objeto: ReturnType<typeof filaAObjeto> } => x.objeto !== undefined)
}
