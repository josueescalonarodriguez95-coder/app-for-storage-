/*
  Estado de la app — design_handoff_storage_control/README.md, sección "Estado".
*/

import type { Cliente, Mudanza, MotivoSalida, Objeto, TipoObjeto, Usuario } from '../db/schema'

export type Screen = 'scan' | 'inv' | 'entrada' | 'salida' | 'detalle' | 'mud' | 'etq'

export type Filtro = 'Todos' | 'En bodega' | 'Fuera' | Extract<TipoObjeto, 'Guacal' | 'Obra' | 'Pedestal'>

export interface PiezaFormulario {
  ref: string
  descripcion: string
  largo: string
  ancho: string
}

export interface CamposEntrada {
  tipo: TipoObjeto
  descripcion: string
  cliente: string
  largo: string
  ancho: string
  alto: string
  peso: string
  nave: string
  rack: string
  nivel: string
  piezas: PiezaFormulario[]
  fotoUrl: string | null
}

export type FormatoEtiqueta = '60 × 40 mm' | '100 × 70 mm' | 'A4 · 12 por hoja'

export interface AppState {
  screen: Screen
  user: Usuario | null
  usuarios: Usuario[]
  clientes: Cliente[]
  items: Objeto[]
  mudanzas: Mudanza[]
  query: string
  filtro: Filtro
  selId: string | null
  scanned: string | null
  outId: string | null
  motivo: MotivoSalida
  mudLink: string | null
  recibe: string
  doc: string
  mudSel: string | null
  entrada: CamposEntrada
  etqSel: string[]
  formato: FormatoEtiqueta
  toast: string
  cargando: boolean
}


export const CAMPOS_ENTRADA_VACIOS: CamposEntrada = {
  tipo: 'Guacal',
  descripcion: '',
  cliente: '',
  largo: '',
  ancho: '',
  alto: '',
  peso: '',
  nave: 'N2',
  rack: '',
  nivel: '',
  piezas: [],
  fotoUrl: null,
}

export const ESTADO_INICIAL: AppState = {
  screen: 'inv',
  user: null,
  usuarios: [],
  clientes: [],
  items: [],
  mudanzas: [],
  query: '',
  filtro: 'Todos',
  selId: null,
  scanned: null,
  outId: null,
  motivo: 'Mudanza',
  mudLink: null,
  recibe: '',
  doc: '',
  mudSel: null,
  entrada: CAMPOS_ENTRADA_VACIOS,
  etqSel: [],
  formato: '60 × 40 mm',
  toast: '',
  cargando: true,
}
