import { createPortal } from 'react-dom'
import { QrCode } from '../components/ui/QrCode'
import { SegmentedControl } from '../components/ui/SegmentedControl'
import { useAppState } from '../state/AppStateContext'
import { nombreCliente } from '../state/selectors'
import type { FormatoEtiqueta } from '../state/types'
import type { Cliente, Objeto } from '../db/schema'
import { formatFecha } from '../utils/fecha'
import { formatMedidas, formatPeso, formatUbicacion } from '../utils/formato'

const FORMATOS: FormatoEtiqueta[] = ['60 × 40 mm', '100 × 70 mm', 'A4 · 12 por hoja']

/** Tamaño de página física por formato — cada etiqueta suelta ES la página (para impresoras de
 * rollo tipo Brother QL/Zebra); el formato A4 usa una hoja normal con una cuadrícula de 12. */
const PAGINA_POR_FORMATO: Record<FormatoEtiqueta, { size: string; margin: string; w: number; h: number }> = {
  '60 × 40 mm': { size: '60mm 40mm', margin: '0', w: 60, h: 40 },
  '100 × 70 mm': { size: '100mm 70mm', margin: '0', w: 100, h: 70 },
  'A4 · 12 por hoja': { size: 'A4', margin: '10mm', w: 60, h: 65 },
}

const MM_A_PX = 3.7795
const LINEAS_DE_TEXTO = 4
const ALTO_LINEA_MM = 2.7

function EtiquetaImpresa({ item, clientes, anchoMm, altoMm }: { item: Objeto; clientes: Cliente[]; anchoMm: number; altoMm: number }) {
  const padMm = 2.5
  const gapMm = 1.5
  const anchoDisponible = anchoMm - padMm * 2
  // Logo más grande que antes: escala con el alto de la etiqueta (28%, entre 8 y 16mm).
  const altoLogoMm = Math.min(Math.max(altoMm * 0.28, 8), 16)
  const bloqueTextoMm = LINEAS_DE_TEXTO * ALTO_LINEA_MM
  const altoParaImagenes = altoMm - padMm * 2 - altoLogoMm - bloqueTextoMm - gapMm * 2
  // Tamaño del QR y de la foto (cuadrados, uno junto al otro, del mismo tamaño): lo que quepa en
  // el ancho o en el alto que sobra después del logo y del bloque de texto, lo que sea menor.
  const imgMm = Math.max(8, Math.min(altoParaImagenes, (anchoDisponible - gapMm) / 2))
  const imgPx = Math.round(imgMm * MM_A_PX)
  const textoBase = { fontSize: '2.3mm', color: '#000', lineHeight: `${ALTO_LINEA_MM}mm`, whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' }

  return (
    <div
      style={{
        width: `${anchoMm}mm`,
        height: `${altoMm}mm`,
        padding: `${padMm}mm`,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: `${gapMm}mm`,
        border: '.2mm solid #000',
        overflow: 'hidden',
        color: '#000',
        background: '#fff',
      }}
    >
      <img
        src="/icons/ramos-logo.jpeg"
        alt="Ramos Delivery"
        style={{ width: `${altoLogoMm}mm`, height: `${altoLogoMm}mm`, objectFit: 'contain', alignSelf: 'center', flex: 'none' }}
      />
      <div style={{ display: 'flex', gap: `${gapMm}mm`, justifyContent: 'center', flex: 'none' }}>
        <QrCode value={item.id} size={imgPx} />
        {item.fotoUrl && (
          <img
            src={item.fotoUrl}
            alt=""
            style={{ width: `${imgMm}mm`, height: `${imgMm}mm`, objectFit: 'cover', borderRadius: '.8mm', flex: 'none' }}
          />
        )}
      </div>
      <div style={{ minWidth: 0, fontFamily: 'sans-serif' }}>
        <div style={{ ...textoBase, fontSize: '3.6mm', fontWeight: 700, lineHeight: '3.8mm' }}>{item.id}</div>
        <div style={textoBase}>
          {item.tipo} · {item.descripcion}
        </div>
        <div style={textoBase}>{nombreCliente(clientes, item.clienteId)}</div>
        <div style={textoBase}>
          {formatMedidas(item.medidas)} cm · {formatPeso(item.pesoKg)} · {formatFecha(item.fechaEntrada)}
        </div>
      </div>
    </div>
  )
}

export function LabelsScreen() {
  const { state, dispatch, flash } = useAppState()
  const seleccionadas = state.items.filter((i) => state.etqSel.includes(i.id))
  const pagina = PAGINA_POR_FORMATO[state.formato]
  const esGrid = state.formato === 'A4 · 12 por hoja'

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
          <style>{`@page { size: ${pagina.size}; margin: ${pagina.margin}; }`}</style>
          {esGrid ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4mm' }}>
              {seleccionadas.map((item) => (
                <EtiquetaImpresa key={item.id} item={item} clientes={state.clientes} anchoMm={pagina.w} altoMm={pagina.h} />
              ))}
            </div>
          ) : (
            seleccionadas.map((item, i) => (
              <div
                key={item.id}
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pageBreakAfter: i < seleccionadas.length - 1 ? 'always' : 'auto',
                }}
              >
                <EtiquetaImpresa item={item} clientes={state.clientes} anchoMm={pagina.w} altoMm={pagina.h} />
              </div>
            ))
          )}
        </div>,
        document.body,
      )}
    </div>
  )
}
