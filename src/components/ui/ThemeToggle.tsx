import { useEffect, useState } from 'react'
import { aplicarPreferenciaTema, leerPreferenciaTema, type PreferenciaTema } from '../../utils/tema'

/**
 * Interruptor de apariencia — no estaba en el diseño aprobado (el README es sólo el look claro
 * iPadOS 26); se agregó a pedido tras probar la app instalada. Ícono pequeño de sol/luna en vez
 * de un segmentado para no competir visualmente con la nav; sólo Claro/Oscuro, sin "Sistema".
 */
export function ThemeToggle() {
  const [pref, setPref] = useState<PreferenciaTema>('Claro')

  useEffect(() => {
    setPref(leerPreferenciaTema())
  }, [])

  const alternar = () => {
    const nueva: PreferenciaTema = pref === 'Oscuro' ? 'Claro' : 'Oscuro'
    setPref(nueva)
    aplicarPreferenciaTema(nueva)
  }

  const oscuro = pref === 'Oscuro'

  return (
    <button
      onClick={alternar}
      aria-label={oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      title={oscuro ? 'Modo claro' : 'Modo oscuro'}
      style={{
        appearance: 'none',
        border: 0,
        cursor: 'pointer',
        flex: 'none',
        width: 26,
        height: 26,
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-control-fill)',
        color: 'var(--color-text-tertiary)',
      }}
    >
      {oscuro ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path
            d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"
            fill="currentColor"
          />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="4.6" fill="currentColor" />
          <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="1.5" x2="12" y2="4.2" />
            <line x1="12" y1="19.8" x2="12" y2="22.5" />
            <line x1="1.5" y1="12" x2="4.2" y2="12" />
            <line x1="19.8" y1="12" x2="22.5" y2="12" />
            <line x1="4.4" y1="4.4" x2="6.3" y2="6.3" />
            <line x1="17.7" y1="17.7" x2="19.6" y2="19.6" />
            <line x1="4.4" y1="19.6" x2="6.3" y2="17.7" />
            <line x1="17.7" y1="6.3" x2="19.6" y2="4.4" />
          </g>
        </svg>
      )}
    </button>
  )
}
