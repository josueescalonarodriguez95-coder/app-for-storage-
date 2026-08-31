import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Objeto, Movimiento, Mudanza, MudanzaObjeto, Cliente, Usuario } from './schema'

interface StorageControlDB extends DBSchema {
  objetos: {
    key: string
    value: Objeto
    indexes: { contenedorId: string; clienteId: string }
  }
  movimientos: {
    key: string
    value: Movimiento
    indexes: { objetoId: string }
  }
  mudanzas: {
    key: string
    value: Mudanza
  }
  mudanzaObjetos: {
    key: [string, string]
    value: MudanzaObjeto
    indexes: { mudanzaId: string; objetoId: string }
  }
  clientes: {
    key: string
    value: Cliente
  }
  usuarios: {
    key: string
    value: Usuario
  }
}

const DB_NAME = 'storage-control'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<StorageControlDB>> | null = null

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<StorageControlDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const objetos = db.createObjectStore('objetos', { keyPath: 'id' })
        objetos.createIndex('contenedorId', 'contenedorId')
        objetos.createIndex('clienteId', 'clienteId')

        const movimientos = db.createObjectStore('movimientos', { keyPath: 'id' })
        movimientos.createIndex('objetoId', 'objetoId')

        db.createObjectStore('mudanzas', { keyPath: 'codigo' })

        const mudanzaObjetos = db.createObjectStore('mudanzaObjetos', {
          keyPath: ['mudanzaId', 'objetoId'],
        })
        mudanzaObjetos.createIndex('mudanzaId', 'mudanzaId')
        mudanzaObjetos.createIndex('objetoId', 'objetoId')

        db.createObjectStore('clientes', { keyPath: 'id' })
        db.createObjectStore('usuarios', { keyPath: 'id' })
      },
    })
  }
  return dbPromise
}
