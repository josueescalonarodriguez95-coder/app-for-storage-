import type { ReactNode } from 'react'
import type { EstadoCarga, EstadoMudanza, EstadoObjeto } from '../../db/schema'

/**
 * Etiqueta de estado — README, tabla de "Etiquetas de estado" (radio 9px, 12px, peso 600).
 * `size="lg"` es la variante junto a un número de cabecera (Salida, Mudanzas): 10px/13px, del prototipo.
 */
export function Badge({ bg, fg, children, size = 'sm' }: { bg: string; fg: string; children: ReactNode; size?: 'sm' | 'lg' }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: size === 'lg' ? '4px 11px' : '3px 10px',
        borderRadius: size === 'lg' ? 10 : 'var(--radius-badge)',
        fontSize: size === 'lg' ? 13 : 12,
        fontWeight: 600,
        background: bg,
        color: fg,
      }}
    >
      {children}
    </span>
  )
}

const ESTADO_OBJETO_TOKENS: Record<EstadoObjeto, { bg: string; fg: string }> = {
  'En bodega': { bg: 'var(--status-en-bodega-bg)', fg: 'var(--status-en-bodega-text)' },
  Fuera: { bg: 'var(--status-fuera-bg)', fg: 'var(--status-fuera-text)' },
  'En tránsito': { bg: 'var(--status-en-transito-bg)', fg: 'var(--status-en-transito-text)' },
  Reservado: { bg: 'var(--status-reservado-bg)', fg: 'var(--status-reservado-text)' },
}

export function EstadoObjetoBadge({ estado, size }: { estado: EstadoObjeto; size?: 'sm' | 'lg' }) {
  const { bg, fg } = ESTADO_OBJETO_TOKENS[estado]
  return (
    <Badge bg={bg} fg={fg} size={size}>
      {estado}
    </Badge>
  )
}

const ESTADO_CARGA_TOKENS: Record<EstadoCarga, { bg: string; fg: string }> = {
  Cargado: { bg: 'var(--status-cargado-bg)', fg: 'var(--status-cargado-text)' },
  Pendiente: { bg: 'var(--status-pendiente-bg)', fg: 'var(--status-pendiente-text)' },
  Devuelto: { bg: 'var(--status-devuelto-bg)', fg: 'var(--status-devuelto-text)' },
}

export function EstadoCargaBadge({ estado }: { estado: EstadoCarga }) {
  const { bg, fg } = ESTADO_CARGA_TOKENS[estado]
  return (
    <Badge bg={bg} fg={fg}>
      {estado}
    </Badge>
  )
}

/**
 * El README no da un color propio para "Cerrada" (sólo Reservado y En tránsito comparten
 * tabla con los estados de Objeto). Reutiliza el gris neutro de En bodega/Devuelto, que es
 * el mismo lenguaje visual para "asunto resuelto" en esa tabla.
 */
const ESTADO_MUDANZA_TOKENS: Record<EstadoMudanza, { bg: string; fg: string }> = {
  Reservado: { bg: 'var(--status-reservado-bg)', fg: 'var(--status-reservado-text)' },
  'En tránsito': { bg: 'var(--status-en-transito-bg)', fg: 'var(--status-en-transito-text)' },
  Cerrada: { bg: 'var(--status-en-bodega-bg)', fg: 'var(--status-en-bodega-text)' },
}

export function EstadoMudanzaBadge({ estado, size }: { estado: EstadoMudanza; size?: 'sm' | 'lg' }) {
  const { bg, fg } = ESTADO_MUDANZA_TOKENS[estado]
  return (
    <Badge bg={bg} fg={fg} size={size}>
      {estado}
    </Badge>
  )
}
