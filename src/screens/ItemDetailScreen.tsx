import { useEffect, useState, type ReactNode } from 'react'
import { DataCard } from '../components/ui/DataCard'
import { QrCode } from '../components/ui/QrCode'
import { eliminarObjeto } from '../db/mutations'
import { listMovimientosByObjeto, listPiezas } from '../db/repo'
import type { EventoMovimiento, Movimiento, Objeto } from '../db/schema'
import { useAppState } from '../state/AppStateContext'
import { nombreCliente } from '../state/selectors'
import { formatFecha, formatFechaHora } from '../utils/fecha'
import { autorTexto, formatMedidas, formatPeso, formatUbicacion } from '../utils/formato'

const COLOR_EVENTO: Record<EventoMovimiento, string> = {
  Entrada: 'var(--color-text-primary)',
  Ubicado: 'var(--color-text-tertiary)',
  Inspección: 'var(--color-text-tertiary)',
  Reservado: 'var(--color-accent-dark)',
  Salida: 'var(--color-accent-dark)',
  Devolución: 'var(--color-accent-dark)',
}

function BotonSecundario({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="boton-cristal"
      style={{
        appearance: 'none',
        border: 0,
        cursor: 'pointer',
        minHeight: 36,
        padding: '0 14px',
        borderRadius: 12,
        fontFamily: 'inherit',
        fontSize: 15,
        fontWeight: 560,
        letterSpacing: '-0.015em',
        color: 'var(--color-accent)',
      }}
    >
      {children}
    </button>
  )
}

export function ItemDetailScreen() {
  const { state, dispatch, flash, refrescarItems } = useAppState()
  const [piezas, setPiezas] = useState<Objeto[]>([])
  const [historial, setHistorial] = useState<Movimiento[]>([])

  const item = state.items.find((i) => i.id === state.selId) ?? null

  useEffect(() => {
    if (!item) return
    let cancelado = false
    Promise.all([listPiezas(item.id), listMovimientosByObjeto(item.id)]).then(([p, h]) => {
      if (!cancelado) {
        setPiezas(p)
        setHistorial(h)
      }
    })
    return () => {
      cancelado = true
    }
  }, [item])

  if (!item) {
    return (
      <div style={{ padding: '18px 26px 30px' }}>
        <p style={{ font: 'var(--text-body)', color: 'var(--color-text-dim)' }}>Registro no encontrado.</p>
      </div>
    )
  }

  const cliente = nombreCliente(state.clientes, item.clienteId)

  const eliminar = async () => {
    const confirmado = window.confirm(`¿Eliminar ${item.id} y todo su contenido e historial? Esta acción no se puede deshacer.`)
    if (!confirmado) return
    try {
      await eliminarObjeto(item.id)
      await refrescarItems()
      dispatch({ type: 'IR_A', screen: 'inv' })
      flash(`${item.id} eliminado`)
    } catch {
      flash('No se pudo eliminar — revisá la conexión e intentá de nuevo')
    }
  }

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>
      <div style={{ flex: 1, padding: '18px 26px 30px', minWidth: 0, overflow: 'auto' }}>
        <div style={{ marginBottom: 14 }}>
          <BotonSecundario onClick={() => dispatch({ type: 'IR_A', screen: 'inv' })}>‹ Inventario</BotonSecundario>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
          <DataCard etiqueta="Tipo" valor={item.tipo} />
          <DataCard etiqueta="Cliente" valor={cliente} />
          <DataCard etiqueta="Ubicación" valor={formatUbicacion(item.ubicacion)} />
          <DataCard etiqueta="Estado" valor={item.estado} />
          <DataCard etiqueta="Entrada" valor={formatFecha(item.fechaEntrada)} />
          <DataCard etiqueta="Salida" valor={item.fechaSalida ? formatFecha(item.fechaSalida) : '—'} />
          <DataCard etiqueta="Medidas" valor={formatMedidas(item.medidas)} />
          <DataCard etiqueta="Peso" valor={formatPeso(item.pesoKg)} />
        </div>

        {piezas.length > 0 && (
          <div
            style={{
              borderRadius: 'var(--radius-card)',
              background: 'var(--color-card-surface)',
              boxShadow: 'var(--shadow-card-strong)',
              overflow: 'hidden',
              marginBottom: 14,
            }}
          >
            <div style={{ padding: '13px 18px', fontSize: 12, fontWeight: 600, color: 'var(--color-text-dim)', borderBottom: '.5px solid var(--color-hairline-strong)' }}>
              CONTENIDO
            </div>
            {piezas.map((p) => (
              <div
                key={p.id}
                style={{ display: 'flex', gap: 14, padding: '13px 18px', borderBottom: '.5px solid var(--color-hairline)', fontSize: 15, letterSpacing: '-0.015em', alignItems: 'center' }}
              >
                <span style={{ fontWeight: 600, width: 56, flex: 'none', fontVariantNumeric: 'tabular-nums' }}>{p.ref}</span>
                <span style={{ flex: 1 }}>{p.descripcion}</span>
                <span style={{ color: 'var(--color-text-dim)' }}>{formatMedidas(p.medidas)} cm</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ borderRadius: 'var(--radius-card)', background: 'var(--color-card-surface)', boxShadow: 'var(--shadow-card-strong)', overflow: 'hidden' }}>
          <div style={{ padding: '13px 18px', fontSize: 12, fontWeight: 600, color: 'var(--color-text-dim)', borderBottom: '.5px solid var(--color-hairline-strong)' }}>
            HISTORIAL DE MOVIMIENTOS
          </div>
          {historial.map((h) => {
            const usuario = state.usuarios.find((u) => u.id === h.usuarioId)
            return (
              <div
                key={h.id}
                style={{ display: 'flex', gap: 14, padding: '13px 18px', borderBottom: '.5px solid var(--color-hairline)', fontSize: 15, letterSpacing: '-0.015em', alignItems: 'center' }}
              >
                <span style={{ width: 150, flex: 'none', color: 'var(--color-text-dim)', fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>
                  {formatFechaHora(h.fechaHora)}
                </span>
                <span style={{ width: 104, flex: 'none', fontWeight: 600, color: COLOR_EVENTO[h.evento] }}>{h.evento}</span>
                <span style={{ flex: 1, color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {h.nota}
                </span>
                <span style={{ color: 'var(--color-text-dim)', fontSize: 14 }}>{autorTexto(usuario)}</span>
              </div>
            )
          })}
        </div>
      </div>

      <aside style={{ width: 'var(--width-sidebar-right)', flex: 'none', padding: '18px 22px 18px 0', display: 'flex', flexDirection: 'column', gap: 14, overflow: 'auto' }}>
        <div style={{ borderRadius: 'var(--radius-card)', background: 'var(--color-card-surface)', boxShadow: 'var(--shadow-card-strong)', padding: 16 }}>
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 12 }}>{item.id}</div>
          <div
            style={{
              height: 198,
              borderRadius: 15,
              background: 'var(--color-control-fill-strong)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-text-dim)',
              fontSize: 14,
              overflow: 'hidden',
            }}
          >
            {item.fotoUrl ? (
              <img src={item.fotoUrl} alt={`Foto de ${item.id}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              'Foto del objeto'
            )}
          </div>
        </div>

        <div style={{ borderRadius: 'var(--radius-card)', background: 'var(--color-card-surface)', boxShadow: 'var(--shadow-card-strong)', padding: 16, display: 'flex', gap: 14, alignItems: 'center' }}>
          <QrCode value={item.id} size={58} />
          <div style={{ fontSize: 13, color: 'var(--color-text-dim)', lineHeight: 1.45 }}>
            Código pegado en
            <br />
            la cara frontal del guacal
          </div>
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            className="primary-button"
            onClick={() => {
              dispatch({ type: 'SET_OUT_ID', outId: item.id })
              dispatch({ type: 'IR_A', screen: 'salida' })
            }}
            style={{
              appearance: 'none',
              border: 0,
              cursor: 'pointer',
              minHeight: 'var(--height-button-primary-lg)',
              borderRadius: 'var(--radius-button-lg)',
              fontFamily: 'inherit',
              fontSize: 17,
              fontWeight: 600,
              letterSpacing: '-0.02em',
              color: '#fff',
              background: 'var(--gradient-primary-button)',
              boxShadow: '0 3px 10px rgba(200,50,28,.3)',
            }}
          >
            Registrar salida
          </button>
          <button
            className="boton-cristal"
            onClick={() => dispatch({ type: 'IR_A', screen: 'etq' })}
            style={{
              appearance: 'none',
              border: 0,
              cursor: 'pointer',
              minHeight: 46,
              borderRadius: 14,
              fontFamily: 'inherit',
              fontSize: 16,
              fontWeight: 560,
              color: 'var(--color-accent)',
            }}
          >
            Reimprimir etiqueta
          </button>
          <button
            onClick={eliminar}
            style={{
              appearance: 'none',
              border: 0,
              background: 'transparent',
              cursor: 'pointer',
              marginTop: 4,
              padding: '6px 0',
              fontFamily: 'inherit',
              fontSize: 13,
              color: 'var(--color-text-dim)',
              textAlign: 'center',
            }}
          >
            Eliminar registro
          </button>
        </div>
      </aside>
    </div>
  )
}
