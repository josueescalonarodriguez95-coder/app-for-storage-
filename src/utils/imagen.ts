import { supabase } from '../db/supabaseClient'

/** Redimensiona una foto a un tamaño razonable y la devuelve como blob JPEG. */
function redimensionar(file: File, maxDim = 1024, calidad = 0.82): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const escala = Math.min(1, maxDim / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * escala)
      canvas.height = Math.round(img.height * escala)
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        URL.revokeObjectURL(url)
        reject(new Error('No se pudo procesar la imagen'))
        return
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo generar la imagen'))),
        'image/jpeg',
        calidad,
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo leer la imagen'))
    }
    img.src = url
  })
}

/**
 * Redimensiona la foto y la sube al bucket "fotos" de Supabase Storage (público, ver
 * supabase/schema.sql). Devuelve la URL pública, la misma que queda guardada en el objeto y se
 * usa en la etiqueta impresa — así la foto se ve desde cualquier iPad, no sólo el que la tomó.
 */
export async function subirFoto(file: File): Promise<string> {
  const blob = await redimensionar(file)
  const ruta = `${crypto.randomUUID()}.jpg`
  const { error } = await supabase.storage.from('fotos').upload(ruta, blob, { contentType: 'image/jpeg' })
  if (error) throw error
  return supabase.storage.from('fotos').getPublicUrl(ruta).data.publicUrl
}
