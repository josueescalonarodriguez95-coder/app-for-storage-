import { useAppState } from '../../state/AppStateContext'

/** Toast centrado abajo — README, sección "Interacciones y comportamiento". */
export function Toast() {
  const { state } = useAppState()
  if (!state.toast) return null

  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        bottom: 26,
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 22px',
        borderRadius: 20,
        background: 'rgba(28,28,30,.82)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        boxShadow: '0 10px 30px rgba(0,0,0,.3)',
        animation: 'toast-in-out 2.6s ease forwards',
        zIndex: 50,
      }}
    >
      <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--color-accent-light)', flex: 'none' }} />
      <span style={{ fontSize: 15, fontWeight: 520, letterSpacing: '-0.015em', color: '#fff', whiteSpace: 'nowrap' }}>
        {state.toast}
      </span>
    </div>
  )
}
