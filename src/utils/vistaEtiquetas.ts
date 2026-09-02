export type TamanoTarjeta = 'Grande' | 'Mediano' | 'Pequeño' | 'Lista'

const CLAVE = 'storage-control-tamano-etiquetas'

/** Preferencia de tamaño de las tarjetas en Etiquetas — por dispositivo, como el tema. */
export function leerTamanoTarjeta(): TamanoTarjeta {
  try {
    const v = localStorage.getItem(CLAVE)
    if (v === 'Grande' || v === 'Mediano' || v === 'Pequeño' || v === 'Lista') return v
  } catch {
    // localStorage no disponible: se queda en el default.
  }
  return 'Mediano'
}

export function guardarTamanoTarjeta(v: TamanoTarjeta): void {
  try {
    localStorage.setItem(CLAVE, v)
  } catch {
    // Sin localStorage no se puede recordar entre sesiones; igual queda aplicado ahora.
  }
}
