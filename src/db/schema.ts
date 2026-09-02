/*
  Modelo de datos — Storage Control (Bodega Ramos)
  Fuente: design_handoff_storage_control/README.md, sección "Modelo de datos sugerido".
*/

export type TipoObjeto = 'Guacal' | 'Obra' | 'Pedestal' | 'Escultura'
export type EstadoObjeto = 'En bodega' | 'Fuera' | 'Reservado' | 'En tránsito'
export type EstadoMudanza = 'Reservado' | 'En tránsito' | 'Cerrada'
export type EstadoCarga = 'Pendiente' | 'Cargado' | 'Devuelto'
export type EventoMovimiento = 'Entrada' | 'Ubicado' | 'Inspección' | 'Reservado' | 'Salida' | 'Devolución'
export type RolUsuario = 'bodega' | 'admin'
export type MotivoSalida = 'Mudanza' | 'Devolución' | 'Exhibición'
export type TipoCliente = 'Galería' | 'Museo' | 'Particular' | 'Fundación'

export interface Medidas {
  largo: number | null
  ancho: number | null
  /** null en piezas planas (obras 2D dentro de un guacal, sólo largo × ancho). */
  alto: number | null
}

export interface Ubicacion {
  nave: string
  rack: string
  nivel: string
}

export interface Cliente {
  id: string
  nombre: string
  tipo: TipoCliente
  contacto: string
}

export interface Usuario {
  id: string
  nombre: string
  iniciales: string
  rol: RolUsuario
  turno: string
}

export interface Objeto {
  /** Número de inventario, p. ej. RD-1042. Es lo que codifica el QR. */
  id: string
  tipo: TipoObjeto
  descripcion: string
  clienteId: string
  /** null cuando el objeto está fuera. */
  ubicacion: Ubicacion | null
  medidas: Medidas
  pesoKg: number | null
  fotoUrl: string | null
  estado: EstadoObjeto
  /** ISO 8601 */
  fechaEntrada: string
  /** ISO 8601, null mientras el objeto está en bodega */
  fechaSalida: string | null
  /** null si es un objeto suelto; apunta al guacal si es una pieza. */
  contenedorId: string | null
  /** Referencia corta dentro del guacal (P-01, P-02...). Sólo cuando contenedorId no es null. */
  ref: string | null
}

export interface Movimiento {
  id: string
  objetoId: string
  evento: EventoMovimiento
  /** ISO 8601 */
  fechaHora: string
  nota: string
  usuarioId: string
  /** sólo en salidas */
  recibeNombre: string | null
  /** sólo en salidas */
  recibeDoc: string | null
  /** sólo en salidas */
  firmaUrl: string | null
  mudanzaId: string | null
}

export interface Mudanza {
  codigo: string
  clienteId: string
  /** ISO 8601 */
  fecha: string
  destino: string
  cuadrilla: string
  estado: EstadoMudanza
}

export interface MudanzaObjeto {
  mudanzaId: string
  objetoId: string
  estadoCarga: EstadoCarga
}
