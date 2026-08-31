/** Segmentado iOS — README, sección "Interacciones y comportamiento". */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 4,
        padding: 3,
        borderRadius: 13,
        background: 'var(--color-control-fill)',
        width: 'fit-content',
      }}
    >
      {options.map((opt) => {
        const activo = opt === value
        return (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            style={{
              appearance: 'none',
              border: 0,
              cursor: 'pointer',
              padding: '8px 15px',
              minHeight: 36,
              borderRadius: 10,
              fontFamily: 'inherit',
              fontSize: 14,
              fontWeight: activo ? 600 : 500,
              letterSpacing: '-0.015em',
              whiteSpace: 'nowrap',
              transition: 'background .15s',
              background: activo ? '#fff' : 'transparent',
              color: activo ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              boxShadow: activo ? '0 1px 3px rgba(0,0,0,.16)' : 'none',
            }}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}
