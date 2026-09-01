import { createPortal } from 'react-dom'
import { QrCode } from '../components/ui/QrCode'
import { SegmentedControl } from '../components/ui/SegmentedControl'
import { useAppState } from '../state/AppStateContext'
import { nombreCliente } from '../state/selectors'
import type { FormatoEtiqueta } from '../state/types'
import { formatFecha } from '../utils/fecha'
import { formatUbicacion } from '../utils/formato'

const FORMATOS: FormatoEtiqueta[] = ['60 × 40 mm', '100 × 70 mm', 'A4 · 12 por hoja']

/** mm de cada etiqueta impresa, según el formato elegido — README, "Etiquetas QR". */
const TAMANO_MM: Record<FormatoEtiqueta, { w: number; h: number }> = {
  '60 × 40 mm': { w: 60, h: 40 },
  '100 × 70 mm': { w: 100, h: 70 },
  'A4 · 12 por hoja': { w: 70, h: 74 }, // A4 (210×297mm) en grilla de 3×4 = 12 por hoja
}

export function LabelsScreen() {
  const { state, dispatch, flash } = useAppState()
  const seleccionadas = state.items.filter((i) => state.etqSel.includes(i.id))
  const tamano = TAMANO_MM[state.formato]

  const imprimir = () => {
    flash(`${state.etqSel.length} etiquetas enviadas a la impresora de muelle`)
    if (state.etqSel.length > 0) window.print()
  }

  return (
    <div style={{ padding: '18px 26px 30px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
        <SegmentedControl options={FORMATOS} value={state.formato} onChange={(formato) => dispatch({ type: 'SET_FORMATO', formato })} />
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--color-text-dim)' }}>
            {state.etqSel.length} seleccionadas · {state.formato}
          </span>
          <button
            className="primary-button"
            onClick={imprimir}
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
            Imprimir selección
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {state.items.map((item) => {
          const activo = state.etqSel.includes(item.id)
          return (
            <button
              key={item.id}
              onClick={() => dispatch({ type: 'TOGGLE_ETQ_SEL', id: item.id })}
              style={{
                appearance: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'inherit',
                padding: 14,
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start',
                borderRadius: 'var(--radius-label-card)',
                border: `1.5px solid ${activo ? 'var(--color-accent-light)' : 'var(--color-hairline-strong)'}`,
                background: activo ? 'rgba(224,71,47,.08)' : 'rgba(255,255,255,.82)',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <QrCode value={item.id} size={52} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 680, letterSpacing: '-0.025em' }}>{item.id}</div>
                <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {nombreCliente(state.clientes, item.clienteId)}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>{formatUbicacion(item.ubicacion)}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-dim)', marginTop: 4 }}>Ramos · {formatFecha(item.fechaEntrada)}</div>
              </div>
            </button>
          )
        })}
      </div>

      {createPortal(
        <div className="print-only">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2mm' }}>
            {seleccionadas.map((item) => (
              <div
                key={item.id}
                style={{
                  width: `${tamano.w}mm`,
                  height: `${tamano.h}mm`,
                  padding: '3mm',
                  boxSizing: 'border-box',
                  display: 'flex',
                  gap: '3mm',
                  alignItems: 'center',
                  border: '.2mm solid #000',
                  pageBreakInside: 'avoid',
                }}
              >
                <QrCode value={item.id} size={Math.round(tamano.h * 2.2)} />
                <div style={{ minWidth: 0, fontFamily: 'sans-serif' }}>
                  <div style={{ fontSize: '4mm', fontWeight: 700 }}>{item.id}</div>
                  <div style={{ fontSize: '2.6mm', marginTop: '1mm' }}>{nombreCliente(state.clientes, item.clienteId)}</div>
                  <div style={{ fontSize: '2.6mm', marginTop: '1mm' }}>Ramos · {formatFecha(item.fechaEntrada)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
