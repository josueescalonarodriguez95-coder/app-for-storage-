import { useEffect, useState } from 'react'
import { aplicarPreferenciaTema, leerPreferenciaTema, type PreferenciaTema } from '../../utils/tema'

const OPCIONES: { valor: PreferenciaTema; etiqueta: string }[] = [
  { valor: 'Sistema', etiqueta: 'Auto' },
  { valor: 'Claro', etiqueta: 'Claro' },
  { valor: 'Oscuro', etiqueta: 'Oscuro' },
]

/**
 * Selector de apariencia — no estaba en el diseño aprobado (el README es sólo el look claro
 * iPadOS 26); se agregó a pedido tras probar la app instalada. Va aparte de SegmentedControl
 * porque ese componente sí sigue el spec exacto del README y no debe tocarse.
 */
export function ThemeToggle() {
  const [pref, setPref] = useState<PreferenciaTema>('Sistema')

  useEffect(() => {
    setPref(leerPreferenciaTema())
  }, [])

  const cambiar = (nueva: PreferenciaTema) => {
    setPref(nueva)
    aplicarPreferenciaTema(nueva)
  }

  return (
    <div style={{ padding: '10px 2px 2px' }}>
      <div style={{ font: 'var(--text-section-label)', color: 'var(--color-text-dim)', marginBottom: 6, paddingLeft: 8 }}>
        Apariencia
      </div>
      <div style={{ display: 'flex', gap: 3, padding: 3, borderRadius: 11, background: 'var(--color-control-fill)' }}>
        {OPCIONES.map((o) => {
          const activo = pref === o.valor
          return (
            <button
              key={o.valor}
              onClick={() => cambiar(o.valor)}
              style={{
                flex: 1,
                minWidth: 0,
                appearance: 'none',
                border: 0,
                cursor: 'pointer',
                padding: '6px 2px',
                borderRadius: 8,
                fontFamily: 'inherit',
                fontSize: 12,
                fontWeight: activo ? 600 : 500,
                letterSpacing: '-0.01em',
                background: activo ? 'var(--color-card-surface-strong)' : 'transparent',
                color: activo ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                boxShadow: activo ? '0 1px 3px rgba(0,0,0,.16)' : 'none',
              }}
            >
              {o.etiqueta}
            </button>
          )
        })}
      </div>
    </div>
  )
}
