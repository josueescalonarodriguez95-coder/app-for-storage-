import { useAppState } from '../../state/AppStateContext'
import { contadorMudanzasActivas } from '../../state/selectors'
import type { Screen } from '../../state/types'
import { NavIcon, type IconName } from './Icons'

interface Destino {
  screen: Screen
  label: string
  icon: IconName
  badge?: string
}

export function Sidebar() {
  const { state, dispatch } = useAppState()

  const destinos: Destino[] = [
    { screen: 'scan', label: 'Escáner', icon: 'scan' },
    { screen: 'inv', label: 'Inventario', icon: 'inv', badge: String(state.items.length) },
    { screen: 'entrada', label: 'Entrada', icon: 'entrada' },
    { screen: 'salida', label: 'Salida', icon: 'salida' },
    { screen: 'mud', label: 'Mudanzas', icon: 'mud', badge: String(contadorMudanzasActivas(state)) },
    { screen: 'etq', label: 'Etiquetas', icon: 'etq' },
  ]

  return (
    <nav
      style={{
        width: 'var(--width-nav)',
        flex: 'none',
        padding: '14px 12px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        background: 'var(--color-nav-glass)',
        backdropFilter: 'var(--blur-glass)',
        WebkitBackdropFilter: 'var(--blur-glass)',
        borderRight: '.5px solid rgba(0,0,0,.1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '8px 10px 14px' }}>
        <img
          src="/icons/ramos-logo.jpeg"
          alt="Ramos Delivery"
          style={{ display: 'block', width: 34, height: 34, objectFit: 'contain', background: '#fff', borderRadius: 9 }}
        />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 640, letterSpacing: '-0.02em' }}>Storage Control</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>Bodega Ramos</div>
        </div>
      </div>

      <div
        style={{
          font: 'var(--text-section-label)',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: 'var(--color-text-dim)',
          padding: '6px 10px 6px',
        }}
      >
        Operación
      </div>

      {destinos.map((d) => {
        const activo = state.screen === d.screen || (d.screen === 'inv' && state.screen === 'detalle')
        return (
          <button
            key={d.screen}
            onClick={() => dispatch({ type: 'IR_A', screen: d.screen })}
            className="nav-item"
            style={{
              appearance: 'none',
              border: 0,
              cursor: 'pointer',
              width: '100%',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 11px',
              minHeight: 'var(--height-row-min)',
              borderRadius: 13,
              fontFamily: 'inherit',
              fontSize: 15,
              fontWeight: activo ? 600 : 500,
              letterSpacing: '-0.015em',
              transition: 'background .15s, color .15s',
              ...(activo ? { background: 'rgba(255,255,255,.92)' } : {}),
              color: activo ? 'var(--color-text-primary)' : '#3A3A3C',
              boxShadow: activo ? '0 1px 3px rgba(0,0,0,.1)' : 'none',
            }}
          >
            <span style={{ width: 22, height: 22, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <NavIcon name={d.icon} color={activo ? 'var(--color-accent)' : 'var(--color-text-tertiary)'} />
            </span>
            <span style={{ flex: 1 }}>{d.label}</span>
            {d.badge && d.badge !== '0' && (
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '1px 8px',
                  borderRadius: 'var(--radius-badge)',
                  background: activo ? 'var(--status-fuera-bg)' : 'var(--status-en-bodega-bg)',
                  color: activo ? 'var(--color-accent-dark)' : 'var(--color-text-tertiary)',
                }}
              >
                {d.badge}
              </span>
            )}
          </button>
        )
      })}

      <div
        style={{
          position: 'relative',
          marginTop: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 11,
          padding: 10,
          borderRadius: 16,
          background: 'rgba(255,255,255,.6)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <span
          style={{
            width: 38,
            height: 38,
            flex: 'none',
            borderRadius: 'var(--radius-avatar)',
            background: 'linear-gradient(150deg, #E0472F, #B52A16)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            fontWeight: 640,
            letterSpacing: '.01em',
          }}
        >
          {state.user?.iniciales ?? '—'}
        </span>
        <span style={{ minWidth: 0, flex: 1 }}>
          <span
            style={{
              display: 'block',
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: '-0.015em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {state.user?.nombre ?? 'Sin operario'}
          </span>
          <span style={{ display: 'block', fontSize: 11, color: 'var(--color-text-tertiary)' }}>
            {state.user?.rol === 'admin' ? 'Administrador' : 'Personal de bodega'}
          </span>
        </span>
        {/* Sin pantalla de PIN (fuera de alcance): este select transparente simula cambiar de operario en turno. */}
        <select
          aria-label="Cambiar de usuario en turno"
          value={state.user?.id ?? ''}
          onChange={(e) => {
            const u = state.usuarios.find((u) => u.id === e.target.value)
            if (u) dispatch({ type: 'CAMBIAR_USUARIO', user: u })
          }}
          style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', border: 0 }}
        >
          {state.usuarios.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nombre}
            </option>
          ))}
        </select>
      </div>
    </nav>
  )
}
