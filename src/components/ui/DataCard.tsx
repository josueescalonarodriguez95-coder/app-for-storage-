/** Tarjeta etiqueta+valor de 16px de radio — reutilizada en ficha, salida y mudanzas. */
export function DataCard({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div style={{ borderRadius: 16, background: 'var(--color-card-surface)', boxShadow: 'var(--shadow-card)', padding: '12px 14px' }}>
      <div style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>{etiqueta}</div>
      <div
        style={{
          fontSize: 16,
          fontWeight: 600,
          letterSpacing: '-0.02em',
          marginTop: 2,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {valor}
      </div>
    </div>
  )
}
