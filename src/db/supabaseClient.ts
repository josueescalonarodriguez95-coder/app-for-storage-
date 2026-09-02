import { createClient } from '@supabase/supabase-js'

// .trim() por si al pegar el valor en Vercel quedó un espacio o salto de línea de más al
// principio o al final — eso rompe silenciosamente el header Authorization más adelante.
const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

if (!url || !anonKey) {
  throw new Error(
    'Faltan las variables VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copiá .env.example a .env.local (desarrollo) o configuralas en Vercel (producción).',
  )
}

export const supabase = createClient(url, anonKey)
