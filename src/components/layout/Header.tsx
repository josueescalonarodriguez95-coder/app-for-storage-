import { useAppState } from '../../state/AppStateContext'
import { contadorEnBodega, contadorFuera, tituloPantalla } from '../../state/selectors'

function TarjetaConteo({ etiqueta, valor }: { etiqueta: string; valor: number }) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '7px 15px',
        borderRadius: 14,
        background: 'rgba(255,255,255,.72)',
        boxShadow: '0 1px 2px rgba(0,0,0,.06)',
      }}
    >
      <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', letterSpacing: '.01em' }}>{etiqueta}</div>
      <div style={{ fontSize: 19, fontWeight: 680, letterSpacing: '-0.02em', lineHeight: 1.2 }}>{valor}</div>
    </div>
  )
}

export function Header() {
  const { state } = useAppState()
  const { kicker, title } = tituloPantalla(state)

  return (
    <header
      style={{
        flex: 'none',
        padding: '16px 26px 14px',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 20,
        background: 'var(--color-header-glass)',
        backdropFilter: 'var(--blur-glass)',
        WebkitBackdropFilter: 'var(--blur-glass)',
        borderBottom: '.5px solid var(--color-hairline-strong)',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ font: 'var(--text-section-label)', letterSpacing: '0.02em', color: 'var(--color-text-dim)' }}>
          {kicker}
        </div>
        <h2
          style={{
            margin: '2px 0 0',
            font: 'var(--text-screen-title)',
            letterSpacing: 'var(--tracking-screen-title)',
            lineHeight: 1.1,
          }}
        >
          {title}
        </h2>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 'none' }}>
        <TarjetaConteo etiqueta="En bodega" valor={contadorEnBodega(state)} />
        <TarjetaConteo etiqueta="Fuera" valor={contadorFuera(state)} />
      </div>
    </header>
  )
}
