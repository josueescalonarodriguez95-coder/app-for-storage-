/** Buscador de 44px — README, secciones "Inventario" y "Registrar salida". */
export function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        borderRadius: 'var(--radius-field)',
        background: 'var(--color-control-fill-strong)',
        padding: '0 14px',
        minHeight: 'var(--height-row-min)',
      }}
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth={2.4} strokeLinecap="round">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-4-4" />
      </svg>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          flex: 1,
          appearance: 'none',
          border: 0,
          outline: 0,
          background: 'transparent',
          fontFamily: 'inherit',
          fontSize: 16,
          letterSpacing: '-0.015em',
          color: 'var(--color-text-primary)',
        }}
      />
    </div>
  )
}
