import { createClient } from '@supabase/supabase-js'

/**
 * Una URL de Supabase y un JWT sólo tienen caracteres ASCII imprimibles. Si al pegar el valor
 * en Vercel se coló algo invisible (una marca de orden de bytes, un espacio de ancho cero...),
 * .trim() no lo saca —no es un espacio "de verdad"— pero rompe en silencio el header
 * Authorization de cada pedido a Supabase (y ese pedido ni siquiera llega a la pestaña Red del
 * navegador, porque el error pasa antes de armar la conexión). Se limpia todo lo que no sea
 * ASCII imprimible para no depender de adivinar qué caracter exacto se coló.
 */
function limpiar(v: string | undefined): string {
  return (v ?? '').replace(/[^\x20-\x7E]/g, '').trim()
}

const url = limpiar(import.meta.env.VITE_SUPABASE_URL)
const anonKey = limpiar(import.meta.env.VITE_SUPABASE_ANON_KEY)

if (!url || !anonKey) {
  throw new Error(
    'Faltan las variables VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copiá .env.example a .env.local (desarrollo) o configuralas en Vercel (producción).',
  )
}

export const supabase = createClient(url, anonKey)
