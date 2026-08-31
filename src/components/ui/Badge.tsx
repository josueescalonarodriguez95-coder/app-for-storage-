import type { ReactNode } from 'react'
import type { EstadoCarga, EstadoObjeto } from '../../db/schema'

/** Etiqueta de estado — README, tabla de "Etiquetas de estado" (radio 9px, 12px, peso 600). */
export function Badge({ bg, fg, children }: { bg: string; fg: string; children: ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: 'var(--radius-badge)',
        fontSize: 12,
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

export function EstadoObjetoBadge({ estado }: { estado: EstadoObjeto }) {
  const { bg, fg } = ESTADO_OBJETO_TOKENS[estado]
  return (
    <Badge bg={bg} fg={fg}>
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
