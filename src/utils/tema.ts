export type PreferenciaTema = 'Claro' | 'Oscuro'

const CLAVE = 'storage-control-tema'

/** Si nunca se eligió a mano, usa la preferencia del sistema sólo como default inicial. */
function prefiereOscuroPorSistema(): boolean {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  } catch {
    return false
  }
}

export function leerPreferenciaTema(): PreferenciaTema {
  try {
    const v = localStorage.getItem(CLAVE)
    if (v === 'Claro' || v === 'Oscuro') return v
  } catch {
    // localStorage no disponible: se decide por prefers-color-scheme.
  }
  return prefiereOscuroPorSistema() ? 'Oscuro' : 'Claro'
}

/** Aplica la preferencia al documento (data-theme) y la guarda para la próxima carga. */
export function aplicarPreferenciaTema(pref: PreferenciaTema): void {
  const root = document.documentElement
  root.setAttribute('data-theme', pref === 'Oscuro' ? 'dark' : 'light')
  try {
    localStorage.setItem(CLAVE, pref)
  } catch {
    // Sin localStorage no se puede recordar entre sesiones; igual queda aplicado ahora.
  }
}
