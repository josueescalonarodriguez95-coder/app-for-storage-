export type PreferenciaTema = 'Sistema' | 'Claro' | 'Oscuro'

const CLAVE = 'storage-control-tema'

export function leerPreferenciaTema(): PreferenciaTema {
  try {
    const v = localStorage.getItem(CLAVE)
    if (v === 'Claro' || v === 'Oscuro') return v
  } catch {
    // localStorage no disponible: se queda en Sistema.
  }
  return 'Sistema'
}

/** Aplica la preferencia al documento (data-theme) y la guarda para la próxima carga. */
export function aplicarPreferenciaTema(pref: PreferenciaTema): void {
  const root = document.documentElement
  if (pref === 'Sistema') {
    root.removeAttribute('data-theme')
  } else {
    root.setAttribute('data-theme', pref === 'Oscuro' ? 'dark' : 'light')
  }
  try {
    localStorage.setItem(CLAVE, pref)
  } catch {
    // Sin localStorage no se puede recordar entre sesiones; igual queda aplicado ahora.
  }
}
