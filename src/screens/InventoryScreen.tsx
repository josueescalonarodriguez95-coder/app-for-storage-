import { useAppState } from '../state/AppStateContext'
import type { Filtro } from '../state/types'
import { EstadoObjetoBadge } from '../components/ui/Badge'
import { SearchField } from '../components/ui/SearchField'
import { SegmentedControl } from '../components/ui/SegmentedControl'
import type { Cliente, Objeto } from '../db/schema'
import { formatFecha } from '../utils/fecha'

const FILTROS: Filtro[] = ['Todos', 'En bodega', 'Fuera', 'Guacal', 'Obra', 'Pedestal']

const COLUMNAS = '96px 1fr 168px 126px 106px 104px'

function ubicacionTexto(item: Objeto): string {
  if (!item.ubicacion) return '—'
  const { nave, rack, nivel } = item.ubicacion
  return `${nave} · ${rack} · ${nivel}`
}

function clienteNombre(clientes: Cliente[], clienteId: string): string {
  return clientes.find((c) => c.id === clienteId)?.nombre ?? 'Sin cliente'
}

function coincide(item: Objeto, cliente: string, ubic: string, query: string, filtro: Filtro): boolean {
  const q = query.trim().toLowerCase()
  const enTexto = q === '' || `${item.id} ${item.descripcion} ${cliente} ${ubic} ${item.tipo}`.toLowerCase().includes(q)
  const enFiltro =
    filtro === 'Todos' ||
    (filtro === 'En bodega'
      ? item.estado !== 'Fuera'
      : filtro === 'Fuera'
        ? item.estado === 'Fuera'
        : item.tipo === filtro)
  return enTexto && enFiltro
}

export function InventoryScreen() {
  const { state, dispatch } = useAppState()

  const filas = state.items
    .map((item) => ({ item, cliente: clienteNombre(state.clientes, item.clienteId), ubic: ubicacionTexto(item) }))
    .filter(({ item, cliente, ubic }) => coincide(item, cliente, ubic, state.query, state.filtro))

  const abrir = (id: string) => {
    dispatch({ type: 'SET_SEL_ID', selId: id })
    dispatch({ type: 'IR_A', screen: 'detalle' })
  }

  return (
    <div style={{ padding: '18px 26px 30px' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
        <SearchField
          value={state.query}
          onChange={(query) => dispatch({ type: 'SET_QUERY', query })}
          placeholder="Buscar número, cliente, ubicación…"
        />
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
      </div>

      <div style={{ marginBottom: 16 }}>
        <SegmentedControl options={FILTROS} value={state.filtro} onChange={(filtro) => dispatch({ type: 'SET_FILTRO', filtro })} />
      </div>

      <div style={{ borderRadius: 'var(--radius-card)', background: 'var(--color-card-surface-strong)', boxShadow: 'var(--shadow-card-strong)', overflow: 'hidden' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: COLUMNAS,
            padding: '11px 18px',
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--color-text-dim)',
            letterSpacing: '0.01em',
            borderBottom: '.5px solid var(--color-hairline-strong)',
          }}
        >
          <span>N.º</span>
          <span>Descripción</span>
          <span>Cliente</span>
          <span>Ubicación</span>
          <span>Entrada</span>
          <span>Estado</span>
        </div>

        {filas.map(({ item, cliente, ubic }) => (
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
              gridTemplateColumns: COLUMNAS,
              alignItems: 'center',
              padding: '14px 18px',
              fontFamily: 'inherit',
              fontSize: 15,
              letterSpacing: '-0.015em',
              borderBottom: '.5px solid var(--color-hairline)',
              transition: 'background .12s',
            }}
          >
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
        ))}
      </div>

      <p style={{ margin: '12px 0 0', fontSize: 13, color: 'var(--color-text-dim)', letterSpacing: '-0.01em' }}>
        {filas.length} de {state.items.length} registros · sincronizado {formatFecha(new Date().toISOString())}
      </p>
    </div>
  )
}
