import { useAppState } from '../../state/AppStateContext'
import { Toast } from '../ui/Toast'
import { Header } from './Header'
import { ScreenRouter } from './ScreenRouter'
import { Sidebar } from './Sidebar'

export function AppShell() {
  const { state } = useAppState()

  if (state.errorCarga) {
    return (
      <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
        <p style={{ font: 'var(--text-body)', color: 'var(--color-text-secondary)', maxWidth: 320 }}>{state.errorCarga}</p>
        <button
          className="primary-button"
          onClick={() => window.location.reload()}
          style={{
            appearance: 'none',
            border: 0,
            cursor: 'pointer',
            minHeight: 44,
            padding: '0 22px',
            borderRadius: 14,
            fontFamily: 'inherit',
            fontSize: 15,
            fontWeight: 600,
            color: '#fff',
            background: 'var(--gradient-primary-button)',
          }}
        >
          Reintentar
        </button>
      </div>
    )
  }

  if (state.cargando) {
    return (
      <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ font: 'var(--text-body)', color: 'var(--color-text-dim)' }}>Cargando…</p>
      </div>
    )
  }

  return (
    <div
      className="app-shell"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--gradient-app-background)',
        // status-bar-style "default" (no "black-translucent") hace que iOS reserve el alto de la
        // barra de estado en vez de dibujarla encima del contenido — así no hace falta adivinar su
        // alto acá; env(safe-area-inset-top) alcanza para las demás muescas/bordes redondeados.
        paddingTop: 'env(safe-area-inset-top)',
        paddingRight: 'env(safe-area-inset-right)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
        <Sidebar />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <Header />
          <div style={{ flex: 1, minHeight: 0, overflow: 'auto', position: 'relative' }}>
            <ScreenRouter />
          </div>
        </div>
      </div>
      <Toast />
    </div>
  )
}
