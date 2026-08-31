import type { Medidas, Usuario } from '../db/schema'

/** "180 × 120 × 60" para un objeto 3D, "110 × 80" para una pieza plana (sin alto). */
export function formatMedidas(m: Medidas): string {
  if (m.largo === null || m.ancho === null) return '—'
  return m.alto === null ? `${m.largo} × ${m.ancho}` : `${m.largo} × ${m.ancho} × ${m.alto}`
}

export function formatPeso(pesoKg: number | null): string {
  return pesoKg === null ? '—' : `${pesoKg} kg`
}

export function formatUbicacion(u: { nave: string; rack: string; nivel: string } | null): string {
  return u ? `${u.nave} · ${u.rack} · ${u.nivel}` : '—'
}

/** "L. Escalona", o "Admin" para el administrador — igual que el prototipo aprobado. */
export function autorTexto(usuario: Usuario | undefined): string {
  if (!usuario) return '—'
  if (usuario.rol === 'admin') return 'Admin'
  const [nombre, ...apellidos] = usuario.nombre.split(' ')
  return `${nombre[0]}. ${apellidos.join(' ')}`
}
