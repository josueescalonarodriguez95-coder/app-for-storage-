import type { Cliente } from '../db/schema'
import type { AppState } from './types'

export function nombreCliente(clientes: Cliente[], clienteId: string): string {
  return clientes.find((c) => c.id === clienteId)?.nombre ?? 'Sin cliente'
}

export function tituloPantalla(state: AppState): { kicker: string; title: string } {
  switch (state.screen) {
    case 'inv':
      return { kicker: 'Base de datos', title: 'Inventario' }
    case 'scan':
      return { kicker: 'Lectura de código', title: 'Escáner QR' }
    case 'entrada':
      return { kicker: 'Alta de registro', title: 'Registrar entrada' }
    case 'salida':
      return { kicker: 'Baja temporal', title: 'Registrar salida' }
    case 'mud':
      return { kicker: 'Logística', title: 'Mudanzas' }
    case 'etq':
      return { kicker: 'Impresión', title: 'Etiquetas QR' }
    case 'detalle': {
      const item = state.items.find((i) => i.id === state.selId)
      if (!item) return { kicker: 'Detalle', title: '—' }
      const cliente = state.clientes.find((c) => c.id === item.clienteId)
      return { kicker: `${item.tipo} · ${cliente?.nombre ?? 'Sin cliente'}`, title: item.id }
    }
  }
}

export function contadorEnBodega(state: AppState): number {
  return state.items.filter((i) => i.estado !== 'Fuera').length
}

export function contadorFuera(state: AppState): number {
  return state.items.filter((i) => i.estado === 'Fuera').length
}

/** Mudanzas activas (no cerradas): el número que se muestra como badge del menú. */
export function contadorMudanzasActivas(state: AppState): number {
  return state.mudanzas.filter((m) => m.estado !== 'Cerrada').length
}
