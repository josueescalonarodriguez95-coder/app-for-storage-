import { useEffect, useState } from 'react'
import { useAppState } from '../state/AppStateContext'
import { nombreCliente } from '../state/selectors'
import type { Filtro } from '../state/types'
import { EstadoObjetoBadge } from '../components/ui/Badge'
import { SearchField } from '../components/ui/SearchField'
import { SegmentedControl } from '../components/ui/SegmentedControl'
import { eliminarObjeto } from '../db/mutations'
import { listObjetosDeMudanza } from '../db/repo'
import type { Objeto } from '../db/schema'
import { formatFecha } from '../utils/fecha'
import { formatUbicacion } from '../utils/formato'

const FILTROS: Filtro[] = ['Todos', 'En bodega', 'Fuera', 'Guacal', 'Obra', 'Pedestal', 'Escultura', 'Mudanzas']

const COLUMNAS = '96px 1fr 168px 126px 106px 104px'
const COLUMNAS_SEL = '30px 96px 1fr 168px 126px 106px 104px'

function Casilla({ marcada }: { marcada: boolean }) {
  return (
    <span
      style={{
        width: 20,
        height: 20,
        flex: 'none',
        borderRadius: 6,
        border: marcada ? 'none' : '1.5px solid var(--color-hairline-strong)',
        background: marcada ? 'var(--color-accent)' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {marcada && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      )}
    </span>
  )
}

function coincideTexto(item: Objeto, cliente: string, ubic: string, query: string): boolean {
  const q = query.trim().toLowerCase()
  return q === '' || `${item.id} ${item.descripcion} ${cliente} ${ubic} ${item.tipo}`.toLowerCase().includes(q)
}

function coincide(item: Objeto, cliente: string, ubic: string, query: string, filtro: Filtro): boolean {
  if (!coincideTexto(item, cliente, ubic, query)) return false
  if (filtro === 'Todos') return true
  if (filtro === 'En bodega') return item.estado !== 'Fuera'
  if (filtro === 'Fuera') return item.estado === 'Fuera'
  if (filtro === 'Mudanzas') return false
  return item.tipo === filtro
}

export function InventoryScreen() {
  const { state, dispatch, flash, refrescarItems } = useAppState()
  const [seleccionando, setSeleccionando] = useState(false)
  const [seleccionados, setSeleccionados] = useState<string[]>([])
  const [eliminando, setEliminando] = useState(false)
  const [porMudanza, setPorMudanza] = useState<Record<string, Objeto[]>>({})
  const [mudInvSel, setMudInvSel] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false
    Promise.all(
      state.mudanzas.map(async (m) => {
        const filas = await listObjetosDeMudanza(m.codigo)
        return [m.codigo, filas.map((f) => f.objeto)] as const
      }),
    )
      .then((entradas) => {
        if (!cancelado) setPorMudanza(Object.fromEntries(entradas))
      })
      .catch(() => {
        if (!cancelado) setPorMudanza({})
      })
    return () => {
      cancelado = true
    }
  }, [state.mudanzas])

  const cambiarFiltro = (filtro: Filtro) => {
    dispatch({ type: 'SET_FILTRO', filtro })
    setMudInvSel(null)
    cancelarSeleccion()
  }

  const enMudanzas = state.filtro === 'Mudanzas'
  const itemsMudanzaSel = mudInvSel ? (porMudanza[mudInvSel] ?? []) : []

  const filas = (enMudanzas ? itemsMudanzaSel : state.items)
    .map((item) => ({ item, cliente: nombreCliente(state.clientes, item.clienteId), ubic: formatUbicacion(item.ubicacion) }))
    .filter(({ item, cliente, ubic }) =>
      enMudanzas ? coincideTexto(item, cliente, ubic, state.query) : coincide(item, cliente, ubic, state.query, state.filtro),
    )

  const abrir = (id: string) => {
    if (seleccionando) {
      setSeleccionados((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
      return
    }
    dispatch({ type: 'SET_SEL_ID', selId: id })
    dispatch({ type: 'IR_A', screen: 'detalle' })
  }

  const cancelarSeleccion = () => {
    setSeleccionando(false)
    setSeleccionados([])
  }

  const eliminarSeleccionados = async () => {
    if (seleccionados.length === 0) return
    const confirmado = window.confirm(
      `¿Eliminar ${seleccionados.length} registro(s) y todo su contenido e historial? Esta acción no se puede deshacer.`,
    )
    if (!confirmado) return
    setEliminando(true)
    try {
      await Promise.all(seleccionados.map((id) => eliminarObjeto(id)))
      await refrescarItems()
      flash(`${seleccionados.length} registro(s) eliminado(s)`)
      cancelarSeleccion()
    } catch {
      flash('No se pudo eliminar todo — revisá la conexión e intentá de nuevo')
    } finally {
      setEliminando(false)
    }
  }

  return (
    <div style={{ padding: '18px 26px 30px' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
        <SearchField
          value={state.query}
          onChange={(query) => dispatch({ type: 'SET_QUERY', query })}
          placeholder="Buscar número, cliente, ubicación…"
        />
        {seleccionando ? (
          <>
            <span style={{ fontSize: 13, color: 'var(--color-text-dim)', whiteSpace: 'nowrap' }}>
              {seleccionados.length} seleccionados
            </span>
            <button
              className="boton-cristal"
              onClick={cancelarSeleccion}
              style={{
                appearance: 'none',
                border: 0,
                cursor: 'pointer',
                minHeight: 'var(--height-row-min)',
                padding: '0 16px',
                borderRadius: 'var(--radius-field)',
                fontFamily: 'inherit',
                fontSize: 15,
                fontWeight: 560,
                letterSpacing: '-0.015em',
                color: 'var(--color-text-secondary)',
                whiteSpace: 'nowrap',
              }}
            >
              Cancelar
            </button>
            <button
              onClick={eliminarSeleccionados}
              disabled={seleccionados.length === 0 || eliminando}
              style={{
                appearance: 'none',
                border: 0,
                cursor: seleccionados.length === 0 || eliminando ? 'default' : 'pointer',
                minHeight: 'var(--height-row-min)',
                padding: '0 20px',
                borderRadius: 'var(--radius-field)',
                fontFamily: 'inherit',
                fontSize: 15,
                fontWeight: 600,
                letterSpacing: '-0.015em',
                color: '#fff',
                background: seleccionados.length === 0 || eliminando ? 'var(--color-text-dim)' : '#D9342A',
                whiteSpace: 'nowrap',
              }}
            >
              {eliminando ? 'Eliminando…' : `Eliminar (${seleccionados.length})`}
            </button>
          </>
        ) : (
          <>
            <button
              className="boton-cristal"
              onClick={() => setSeleccionando(true)}
              style={{
                appearance: 'none',
                border: 0,
                cursor: 'pointer',
                minHeight: 'var(--height-row-min)',
                padding: '0 16px',
                borderRadius: 'var(--radius-field)',
                fontFamily: 'inherit',
                fontSize: 15,
                fontWeight: 560,
                letterSpacing: '-0.015em',
                color: 'var(--color-accent)',
                whiteSpace: 'nowrap',
              }}
            >
              Seleccionar
            </button>
            <button
              className="primary-button"
              onClick={() => dispatch({ type: 'IR_A', screen: 'entrada' })}
              style={{
                appearance: 'none',
                border: 0,
                cursor: 'pointer',
                minHeight: 'var(--height-row-min)',
                padding: '0 20px',
                borderRadius: 'var(--radius-field)',
                fontFamily: 'inherit',
                fontSize: 15,
                fontWeight: 600,
                letterSpacing: '-0.015em',
                color: '#fff',
                background: 'var(--gradient-primary-button)',
                boxShadow: 'var(--shadow-primary-button)',
                whiteSpace: 'nowrap',
              }}
            >
              Nueva entrada
            </button>
          </>
        )}
      </div>

      <div style={{ marginBottom: 16 }}>
        <SegmentedControl options={FILTROS} value={state.filtro} onChange={cambiarFiltro} />
      </div>

      {enMudanzas && !mudInvSel ? (
        <div style={{ borderRadius: 'var(--radius-card)', background: 'var(--color-card-surface-strong)', boxShadow: 'var(--shadow-card-strong)', overflow: 'hidden' }}>
          {state.mudanzas.length === 0 && (
            <p style={{ margin: 0, padding: 18, fontSize: 14, color: 'var(--color-text-dim)' }}>Todavía no hay mudanzas registradas.</p>
          )}
          {state.mudanzas.map((m, i) => (
            <button
              key={m.codigo}
              className="fila-inventario"
              onClick={() => setMudInvSel(m.codigo)}
              style={{
                appearance: 'none',
                border: 0,
                cursor: 'pointer',
                width: '100%',
                textAlign: 'left',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '15px 18px',
                borderBottom: i < state.mudanzas.length - 1 ? '.5px solid var(--color-hairline)' : undefined,
              }}
            >
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <span style={{ fontSize: 16, fontWeight: 640, letterSpacing: '-0.02em' }}>
                  {m.codigo} · {nombreCliente(state.clientes, m.clienteId)}
                </span>
                <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {m.destino}
                </span>
              </span>
              <span style={{ fontSize: 13, color: 'var(--color-text-dim)', flex: 'none', textAlign: 'right' }}>
                {(porMudanza[m.codigo] ?? []).length} artículo(s) · {formatFecha(m.fecha)}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <>
          {enMudanzas && mudInvSel && (
            <button
              className="boton-cristal"
              onClick={() => setMudInvSel(null)}
              style={{
                appearance: 'none',
                border: 0,
                cursor: 'pointer',
                marginBottom: 14,
                minHeight: 34,
                padding: '0 14px',
                borderRadius: 11,
                fontFamily: 'inherit',
                fontSize: 14,
                fontWeight: 560,
                color: 'var(--color-accent)',
              }}
            >
              ‹ {mudInvSel} · {nombreCliente(state.clientes, state.mudanzas.find((m) => m.codigo === mudInvSel)?.clienteId ?? '')}
            </button>
          )}

          <div style={{ borderRadius: 'var(--radius-card)', background: 'var(--color-card-surface-strong)', boxShadow: 'var(--shadow-card-strong)', overflow: 'hidden' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: seleccionando ? COLUMNAS_SEL : COLUMNAS,
                padding: '11px 18px',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--color-text-dim)',
                letterSpacing: '0.01em',
                borderBottom: '.5px solid var(--color-hairline-strong)',
              }}
            >
              {seleccionando && <span />}
              <span>N.º</span>
              <span>Descripción</span>
              <span>Cliente</span>
              <span>Ubicación</span>
              <span>Entrada</span>
              <span>Estado</span>
            </div>

            {filas.length === 0 && (
              <p style={{ margin: 0, padding: 18, fontSize: 14, color: 'var(--color-text-dim)' }}>No hay registros acá.</p>
            )}

            {filas.map(({ item, cliente, ubic }) => {
              const marcada = seleccionados.includes(item.id)
              return (
              <button
                key={item.id}
                onClick={() => abrir(item.id)}
                className="fila-inventario"
                style={{
                  appearance: 'none',
                  border: 0,
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                  display: 'grid',
                  gridTemplateColumns: seleccionando ? COLUMNAS_SEL : COLUMNAS,
                  alignItems: 'center',
                  padding: '14px 18px',
                  fontFamily: 'inherit',
                  fontSize: 15,
                  letterSpacing: '-0.015em',
                  borderBottom: '.5px solid var(--color-hairline)',
                  background: marcada ? 'rgba(224,71,47,.06)' : undefined,
                  transition: 'background .12s',
                }}
              >
                {seleccionando && <Casilla marcada={marcada} />}
                <span style={{ fontWeight: 640, fontVariantNumeric: 'tabular-nums' }}>{item.id}</span>
                <span style={{ paddingRight: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.descripcion}
                </span>
                <span
                  style={{
                    color: 'var(--color-text-tertiary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    paddingRight: 12,
                  }}
                >
                  {cliente}
                </span>
                <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 14 }}>{ubic}</span>
                <span style={{ color: 'var(--color-text-tertiary)', fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>
                  {formatFecha(item.fechaEntrada)}
                </span>
                <span>
                  <EstadoObjetoBadge estado={item.estado} />
                </span>
              </button>
              )
            })}
          </div>

          <p style={{ margin: '12px 0 0', fontSize: 13, color: 'var(--color-text-dim)', letterSpacing: '-0.01em' }}>
            {filas.length} de {enMudanzas ? itemsMudanzaSel.length : state.items.length} registros · sincronizado {formatFecha(new Date().toISOString())}
          </p>
        </>
      )}
    </div>
  )
}
