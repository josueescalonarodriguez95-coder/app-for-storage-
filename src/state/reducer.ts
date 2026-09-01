import type { Cliente, Mudanza, MotivoSalida, Objeto, Usuario } from '../db/schema'
import { ESTADO_INICIAL, type AppState, type CamposEntrada, type FormatoEtiqueta, type Filtro, type Screen } from './types'

export type Action =
  | { type: 'CARGADO_INICIAL'; usuarios: Usuario[]; clientes: Cliente[]; items: Objeto[]; mudanzas: Mudanza[] }
  | { type: 'DATOS_REFRESCADOS'; usuarios: Usuario[]; clientes: Cliente[]; items: Objeto[]; mudanzas: Mudanza[] }
  | { type: 'ITEMS_ACTUALIZADOS'; items: Objeto[] }
  | { type: 'IR_A'; screen: Screen }
  | { type: 'CAMBIAR_USUARIO'; user: Usuario }
  | { type: 'SET_QUERY'; query: string }
  | { type: 'SET_FILTRO'; filtro: Filtro }
  | { type: 'SET_SEL_ID'; selId: string | null }
  | { type: 'SET_SCANNED'; scanned: string | null }
  | { type: 'SET_OUT_ID'; outId: string | null }
  | { type: 'SET_MOTIVO'; motivo: MotivoSalida }
  | { type: 'SET_MUD_LINK'; mudLink: string | null }
  | { type: 'SET_RECIBE'; recibe: string }
  | { type: 'SET_DOC'; doc: string }
  | { type: 'SET_MUD_SEL'; mudSel: string | null }
  | { type: 'SET_CAMPO_ENTRADA'; campos: Partial<CamposEntrada> }
  | { type: 'RESET_ENTRADA' }
  | { type: 'TOGGLE_ETQ_SEL'; id: string }
  | { type: 'SET_FORMATO'; formato: FormatoEtiqueta }
  | { type: 'MOSTRAR_TOAST'; toast: string }
  | { type: 'LIMPIAR_TOAST' }
  | { type: 'ERROR_CARGA'; mensaje: string }

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'CARGADO_INICIAL': {
      const mudActiva = action.mudanzas.find((m) => m.estado !== 'Cerrada') ?? action.mudanzas[0]
      return {
        ...state,
        usuarios: action.usuarios,
        user: action.usuarios[0] ?? null,
        clientes: action.clientes,
        items: action.items,
        mudanzas: action.mudanzas,
        selId: action.items[0]?.id ?? null,
        mudSel: mudActiva?.codigo ?? null,
        mudLink: mudActiva?.codigo ?? null,
        cargando: false,
      }
    }
    // Refresco silencioso (p. ej. al volver a primer plano en iOS): trae lo que se haya guardado
    // desde otra pestaña/instancia sin resetear en qué pantalla o formulario está el usuario.
    case 'DATOS_REFRESCADOS': {
      const usuarioVigente = action.usuarios.find((u) => u.id === state.user?.id) ?? action.usuarios[0] ?? null
      const selIdVigente = state.selId && action.items.some((i) => i.id === state.selId) ? state.selId : (action.items[0]?.id ?? null)
      const mudActiva = action.mudanzas.find((m) => m.estado !== 'Cerrada') ?? action.mudanzas[0]
      const mudSelVigente = state.mudSel && action.mudanzas.some((m) => m.codigo === state.mudSel) ? state.mudSel : (mudActiva?.codigo ?? null)
      return {
        ...state,
        usuarios: action.usuarios,
        user: usuarioVigente,
        clientes: action.clientes,
        items: action.items,
        mudanzas: action.mudanzas,
        selId: selIdVigente,
        mudSel: mudSelVigente,
      }
    }
    case 'ITEMS_ACTUALIZADOS':
      return { ...state, items: action.items }
    case 'IR_A':
      return { ...state, screen: action.screen }
    case 'CAMBIAR_USUARIO':
      return { ...state, user: action.user }
    case 'SET_QUERY':
      return { ...state, query: action.query }
    case 'SET_FILTRO':
      return { ...state, filtro: action.filtro }
    case 'SET_SEL_ID':
      return { ...state, selId: action.selId }
    case 'SET_SCANNED':
      return { ...state, scanned: action.scanned }
    case 'SET_OUT_ID':
      return { ...state, outId: action.outId }
    case 'SET_MOTIVO':
      return { ...state, motivo: action.motivo }
    case 'SET_MUD_LINK':
      return { ...state, mudLink: action.mudLink }
    case 'SET_RECIBE':
      return { ...state, recibe: action.recibe }
    case 'SET_DOC':
      return { ...state, doc: action.doc }
    case 'SET_MUD_SEL':
      return { ...state, mudSel: action.mudSel }
    case 'SET_CAMPO_ENTRADA':
      return { ...state, entrada: { ...state.entrada, ...action.campos } }
    case 'RESET_ENTRADA':
      return { ...state, entrada: ESTADO_INICIAL.entrada }
    case 'TOGGLE_ETQ_SEL':
      return {
        ...state,
        etqSel: state.etqSel.includes(action.id)
          ? state.etqSel.filter((id) => id !== action.id)
          : [...state.etqSel, action.id],
      }
    case 'SET_FORMATO':
      return { ...state, formato: action.formato }
    case 'MOSTRAR_TOAST':
      return { ...state, toast: action.toast }
    case 'LIMPIAR_TOAST':
      return { ...state, toast: '' }
    case 'ERROR_CARGA':
      return { ...state, cargando: false, errorCarga: action.mensaje }
    default:
      return state
  }
}
