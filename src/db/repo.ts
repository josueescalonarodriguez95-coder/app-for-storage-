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

export async function listObjetos() {
  const db = await getDB()
  return db.getAll('objetos')
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
