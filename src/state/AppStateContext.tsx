import { createContext, useContext, useEffect, useReducer, useRef, type ReactNode } from 'react'
import { listClientes, listMudanzas, listObjetosPrincipales, listUsuarios, seedIfEmpty, syncUsuarios } from '../db/repo'
import { supabase } from '../db/supabaseClient'
import { reducer, type Action } from './reducer'
import { ESTADO_INICIAL, type AppState } from './types'

const TOAST_MS = 2600
const DEBOUNCE_REALTIME_MS = 400

interface AppStateContextValue {
  state: AppState
  dispatch: React.Dispatch<Action>
  /** Vuelve a leer los registros de primer nivel desde Supabase tras un guardado. */
  refrescarItems: () => Promise<void>
  /** Dispara el toast al pie de pantalla y lo limpia solo a los 2.6 s, como en el diseño. */
  flash: (mensaje: string) => void
}

const AppStateContext = createContext<AppStateContextValue | null>(null)

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, ESTADO_INICIAL)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const refrescandoRef = useRef(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    let cancelado = false
    seedIfEmpty()
      .then(() => syncUsuarios())
      .then(() =>
        Promise.all([listUsuarios(), listClientes(), listObjetosPrincipales(), listMudanzas()]),
      )
      .then(([usuarios, clientes, items, mudanzas]) => {
        if (cancelado) return
        dispatch({ type: 'CARGADO_INICIAL', usuarios, clientes, items, mudanzas })
      })
      .catch((error) => {
        if (cancelado) return
        // eslint-disable-next-line no-console
        console.error('Carga inicial contra Supabase falló:', error)
        dispatch({ type: 'ERROR_CARGA', mensaje: 'No se pudo conectar con la base de datos. Revisá la conexión a internet.' })
      })
    return () => {
      cancelado = true
    }
  }, [])

  useEffect(() => {
    async function refrescarDatos() {
      if (refrescandoRef.current) return
      refrescandoRef.current = true
      try {
        const [usuarios, clientes, items, mudanzas] = await Promise.all([
          listUsuarios(),
          listClientes(),
          listObjetosPrincipales(),
          listMudanzas(),
        ])
        dispatch({ type: 'DATOS_REFRESCADOS', usuarios, clientes, items, mudanzas })
      } finally {
        refrescandoRef.current = false
      }
    }

    // iOS mantiene la app agregada a inicio "viva" en segundo plano: al volver a primer plano
    // (Safari ↔ ícono instalado, o tras rato sin usarla) se vuelve a leer por si algo cambió
    // mientras tanto y no llegó el aviso de abajo.
    function refrescarAlVolver() {
      if (document.visibilityState === 'visible') void refrescarDatos()
    }
    document.addEventListener('visibilitychange', refrescarAlVolver)
    window.addEventListener('focus', refrescarAlVolver)

    // Supabase Realtime: para que otro iPad se entere al toque de lo que se guardó acá, sin
    // esperar a que alguien cambie de pantalla. Varias filas cambian por guardado (objeto +
    // piezas + movimiento), así que se agrupan con un debounce corto en vez de refrescar una
    // vez por cada fila.
    const canal = supabase
      .channel('storage-control-cambios')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => void refrescarDatos(), DEBOUNCE_REALTIME_MS)
      })
      .subscribe()

    return () => {
      document.removeEventListener('visibilitychange', refrescarAlVolver)
      window.removeEventListener('focus', refrescarAlVolver)
      clearTimeout(debounceRef.current)
      supabase.removeChannel(canal)
    }
  }, [])

  const refrescarItems = async () => {
    const items = await listObjetosPrincipales()
    dispatch({ type: 'ITEMS_ACTUALIZADOS', items })
  }

  const flash = (mensaje: string) => {
    dispatch({ type: 'MOSTRAR_TOAST', toast: mensaje })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => dispatch({ type: 'LIMPIAR_TOAST' }), TOAST_MS)
  }

  return (
    <AppStateContext.Provider value={{ state, dispatch, refrescarItems, flash }}>
      {children}
    </AppStateContext.Provider>
  )
}

export function useAppState() {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error('useAppState debe usarse dentro de <AppStateProvider>')
  return ctx
}
