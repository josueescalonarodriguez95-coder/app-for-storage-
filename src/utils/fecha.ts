const MESES = [
  'ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC',
]

/** Formatea a "12 AGO 2026", igual que el prototipo de diseño. */
export function formatFecha(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')} ${MESES[d.getMonth()]} ${d.getFullYear()}`
}

/** Formatea a "12 AGO 2026 · 09:14". */
export function formatFechaHora(iso: string): string {
  const d = new Date(iso)
  const hora = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return `${formatFecha(iso)} · ${hora}`
}
