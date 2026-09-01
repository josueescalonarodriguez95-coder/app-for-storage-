import { createContext, useContext, useEffect, useReducer, useRef, type ReactNode } from 'react'
import { listClientes, listMudanzas, listObjetosPrincipales, listUsuarios, seedIfEmpty, syncUsuarios } from '../db/repo'
import { reducer, type Action } from './reducer'
import { ESTADO_INICIAL, type AppState } from './types'

const TOAST_MS = 2600

interface AppStateContextValue {
  state: AppState
  dispatch: React.Dispatch<Action>
  /** Vuelve a leer los registros de primer nivel desde IndexedDB tras un guardado. */
  refrescarItems: () => Promise<void>
  /** Dispara el toast al pie de pantalla y lo limpia solo a los 2.6 s, como en el diseño. */
  flash: (mensaje: string) => void
}

const AppStateContext = createContext<AppStateContextValue | null>(null)

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, ESTADO_INICIAL)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const refrescandoRef = useRef(false)

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
    return () => {
      cancelado = true
    }
  }, [])

  // iOS mantiene la app agregada a inicio "viva" en segundo plano: IndexedDB es la misma base
  // que la de Safari (mismo origen), pero el estado ya cargado en memoria no se entera solo de lo
  // que se guardó desde la otra pestaña/instancia. Al volver a primer plano, se vuelve a leer.
  useEffect(() => {
    async function refrescarAlVolver() {
      if (document.visibilityState !== 'visible' || refrescandoRef.current) return
      refrescandoRef.current = true
      try {
        await syncUsuarios()
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
    document.addEventListener('visibilitychange', refrescarAlVolver)
    window.addEventListener('focus', refrescarAlVolver)
    return () => {
      document.removeEventListener('visibilitychange', refrescarAlVolver)
      window.removeEventListener('focus', refrescarAlVolver)
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
