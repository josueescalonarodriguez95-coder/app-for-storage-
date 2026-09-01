import { getDB } from './db'
import { CLIENTES, USUARIOS, MUDANZAS, MUDANZA_OBJETOS, construirObjetosYMovimientos } from './seed'

/** Siembra los datos de ejemplo del README la primera vez que se abre la app en este iPad. */
export async function seedIfEmpty(): Promise<void> {
  const db = await getDB()
  const count = await db.count('usuarios')
  if (count > 0) return

  const { objetos, movimientos } = construirObjetosYMovimientos()
  const tx = db.transaction(
    ['clientes', 'usuarios', 'objetos', 'movimientos', 'mudanzas', 'mudanzaObjetos'],
    'readwrite',
  )
  await Promise.all([
    ...CLIENTES.map((c) => tx.objectStore('clientes').put(c)),
    ...USUARIOS.map((u) => tx.objectStore('usuarios').put(u)),
    ...objetos.map((o) => tx.objectStore('objetos').put(o)),
    ...movimientos.map((m) => tx.objectStore('movimientos').put(m)),
    ...MUDANZAS.map((m) => tx.objectStore('mudanzas').put(m)),
    ...MUDANZA_OBJETOS.map((mo) => tx.objectStore('mudanzaObjetos').put(mo)),
    tx.done,
  ])
}

/** Todos los registros, incluidas las piezas de guacal (contenedorId != null). */
export async function listObjetos() {
  const db = await getDB()
  return db.getAll('objetos')
}

/** Un registro por su número de inventario, sea guacal/obra/pedestal/vitrina o una pieza. */
export async function getObjeto(id: string) {
  const db = await getDB()
  return db.get('objetos', id)
}

/**
 * Sólo los registros de primer nivel (guacales, obras sueltas, pedestales, vitrinas).
 * Es la lista que se ve en Inventario, en los contadores de la cabecera y en el badge del menú:
 * las piezas de un guacal no son un registro independiente en esas vistas.
 */
export async function listObjetosPrincipales() {
  const objetos = await listObjetos()
  return objetos.filter((o) => o.contenedorId === null)
}

/** Piezas contenidas en un guacal, en el orden de su referencia (P-01, P-02...). */
export async function listPiezas(contenedorId: string) {
  const db = await getDB()
  const piezas = await db.getAllFromIndex('objetos', 'contenedorId', contenedorId)
  return piezas.sort((a, b) => (a.ref ?? '').localeCompare(b.ref ?? ''))
}

/** Historial de un objeto, del movimiento más antiguo al más reciente. Sólo lectura, append-only. */
export async function listMovimientosByObjeto(objetoId: string) {
  const db = await getDB()
  const movimientos = await db.getAllFromIndex('movimientos', 'objetoId', objetoId)
  return movimientos.sort((a, b) => a.fechaHora.localeCompare(b.fechaHora))
}

export async function listClientes() {
  const db = await getDB()
  return db.getAll('clientes')
}

export async function listUsuarios() {
  const db = await getDB()
  return db.getAll('usuarios')
}

export async function listMudanzas() {
  const db = await getDB()
  return db.getAll('mudanzas')
}
