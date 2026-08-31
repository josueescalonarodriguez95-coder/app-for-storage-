/** Contenido temporal de una pantalla todavía no construida. Cada una se reemplaza en su propio paso. */
export function Placeholder({ nombre }: { nombre: string }) {
  return (
    <div style={{ padding: '18px 26px 30px' }}>
      <p style={{ font: 'var(--text-body)', color: 'var(--color-text-dim)' }}>
        Pantalla «{nombre}» — todavía no construida en este paso.
      </p>
    </div>
  )
}
