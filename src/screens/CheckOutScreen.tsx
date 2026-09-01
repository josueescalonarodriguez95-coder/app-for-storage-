import { useState } from 'react'
import { DataCard } from '../components/ui/DataCard'
import { EstadoObjetoBadge } from '../components/ui/Badge'
import { SearchField } from '../components/ui/SearchField'
import { SegmentedControl } from '../components/ui/SegmentedControl'
import { SignaturePad } from '../components/ui/SignaturePad'
import { confirmarSalida } from '../db/mutations'
import type { MotivoSalida } from '../db/schema'
import { useAppState } from '../state/AppStateContext'
import { nombreCliente } from '../state/selectors'
import { formatFecha } from '../utils/fecha'
import { formatMedidas, formatPeso, formatUbicacion } from '../utils/formato'

const MOTIVOS: MotivoSalida[] = ['Mudanza', 'Devolución', 'Exhibición']

export function CheckOutScreen() {
  const { state, dispatch, flash, refrescarItems } = useAppState()
  const [recibe, setRecibe] = useState('')
  const [doc, setDoc] = useState('')
  const [firmaUrl, setFirmaUrl] = useState<string | null>(null)

  const q = state.query.trim().toLowerCase()
  const enBodega = state.items.filter(
    (i) => i.estado !== 'Fuera' && (q === '' || `${i.id} ${i.descripcion} ${i.ubicacion ? formatUbicacion(i.ubicacion) : ''}`.toLowerCase().includes(q)),
  )

  const out = state.items.find((i) => i.id === state.outId) ?? null

  const confirmar = async () => {
    if (!out) return
    if (!recibe.trim()) {
      flash('Falta el nombre de quien recibe')
      return
    }
    await confirmarSalida({
      objetoId: out.id,
      motivo: state.motivo,
      mudLink: state.mudLink ?? '',
      recibeNombre: recibe,
      recibeDoc: doc,
      firmaUrl,
      usuarioId: state.user?.id ?? '',
    })
    const quienRecibe = recibe.trim() + (doc.trim() ? ` (${doc.trim()})` : '')
    await refrescarItems()
    setRecibe('')
    setDoc('')
    setFirmaUrl(null)
    dispatch({ type: 'SET_SEL_ID', selId: out.id })
    dispatch({ type: 'SET_OUT_ID', outId: null })
    dispatch({ type: 'IR_A', screen: 'detalle' })
    flash(`${out.id} entregado a ${quienRecibe}`)
  }

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>
      <div style={{ width: 'var(--width-salida-list)', flex: 'none', padding: 16, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
        <SearchField value={state.query} onChange={(query) => dispatch({ type: 'SET_QUERY', query })} placeholder="Escanea o escribe el número…" />
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', borderRadius: 'var(--radius-card)', background: 'var(--color-card-surface-strong)', boxShadow: 'var(--shadow-card-strong)' }}>
          {enBodega.map((item) => (
            <button
              key={item.id}
              onClick={() => dispatch({ type: 'SET_OUT_ID', outId: item.id })}
              style={{
                appearance: 'none',
                border: 0,
                cursor: 'pointer',
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '13px 16px',
                borderBottom: '.5px solid var(--color-hairline)',
                fontFamily: 'inherit',
                background: state.outId === item.id ? 'rgba(224,71,47,.1)' : 'transparent',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
                <span style={{ fontSize: 16, fontWeight: 640, letterSpacing: '-0.02em' }}>{item.id}</span>
                <span style={{ fontSize: 13, color: 'var(--color-text-dim)', fontVariantNumeric: 'tabular-nums' }}>{formatUbicacion(item.ubicacion)}</span>
              </div>
              <div style={{ fontSize: 14, color: 'var(--color-text-secondary)', letterSpacing: '-0.015em', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.descripcion}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, padding: '18px 26px 26px 6px', minWidth: 0, overflow: 'auto' }}>
        {!out ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--color-text-dim)', fontSize: 16, lineHeight: 1.6, letterSpacing: '-0.015em' }}>
            Escanea el QR del guacal o elige un objeto
            <br />
            de la lista para registrar su salida.
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.035em' }}>{out.id}</div>
              <EstadoObjetoBadge estado={out.estado} size="lg" />
            </div>
            <div style={{ fontSize: 16, letterSpacing: '-0.015em', color: 'var(--color-text-secondary)', margin: '5px 0 16px' }}>
              {out.descripcion} · {nombreCliente(state.clientes, out.clienteId)}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
              <DataCard etiqueta="Ubicación" valor={formatUbicacion(out.ubicacion)} />
              <DataCard etiqueta="Entrada" valor={formatFecha(out.fechaEntrada)} />
              <DataCard etiqueta="Medidas" valor={formatMedidas(out.medidas)} />
              <DataCard etiqueta="Peso" valor={formatPeso(out.pesoKg)} />
            </div>

            <div style={{ borderRadius: 'var(--radius-card)', background: 'var(--color-card-surface)', boxShadow: 'var(--shadow-card-strong)', padding: 18, marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-dim)', marginBottom: 10 }}>MOTIVO DE SALIDA</div>
              <div style={{ marginBottom: 16 }}>
                <SegmentedControl options={MOTIVOS} value={state.motivo} onChange={(motivo) => dispatch({ type: 'SET_MOTIVO', motivo })} />
              </div>

              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-dim)', marginBottom: 8 }}>VINCULAR A MUDANZA</div>
              <div style={{ borderRadius: 15, background: 'var(--color-control-fill)', overflow: 'hidden' }}>
                {state.mudanzas.map((m) => {
                  const activo = state.mudLink === m.codigo
                  return (
                    <button
                      key={m.codigo}
                      onClick={() => dispatch({ type: 'SET_MUD_LINK', mudLink: m.codigo })}
                      style={{
                        appearance: 'none',
                        border: 0,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        width: '100%',
                        textAlign: 'left',
                        padding: '12px 14px',
                        borderBottom: '.5px solid var(--color-hairline)',
                        fontFamily: 'inherit',
                        background: activo ? 'rgba(224,71,47,.1)' : 'transparent',
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      <span
                        style={{
                          width: 20,
                          height: 20,
                          flex: 'none',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: activo ? 'var(--color-accent)' : 'transparent',
                          boxShadow: `inset 0 0 0 1.5px ${activo ? 'var(--color-accent)' : 'rgba(120,120,128,.5)'}`,
                        }}
                      >
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: activo ? '#fff' : 'transparent' }} />
                      </span>
                      <span style={{ fontSize: 15, fontWeight: 640, width: 88, flex: 'none', letterSpacing: '-0.02em' }}>{m.codigo}</span>
                      <span style={{ fontSize: 15, flex: 1, letterSpacing: '-0.015em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {nombreCliente(state.clientes, m.clienteId)} · {m.destino}
                      </span>
                      <span style={{ fontSize: 13, opacity: 0.7 }}>{formatFecha(m.fecha)}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={{ borderRadius: 'var(--radius-card)', background: 'var(--color-card-surface)', boxShadow: 'var(--shadow-card-strong)', padding: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-dim)', marginBottom: 10 }}>QUIÉN RECIBE</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <input
                  value={recibe}
                  onChange={(e) => setRecibe(e.target.value)}
                  placeholder="Nombre completo de quien recibe"
                  style={{ flex: 1, minWidth: 0, appearance: 'none', border: 0, outline: 0, borderRadius: 12, background: 'var(--color-control-fill-strong)', fontFamily: 'inherit', fontSize: 16, letterSpacing: '-0.015em', padding: '11px 14px', color: 'var(--color-text-primary)' }}
                />
                <input
                  value={doc}
                  onChange={(e) => setDoc(e.target.value)}
                  placeholder="ID / cargo"
                  style={{ width: 150, appearance: 'none', border: 0, outline: 0, borderRadius: 12, background: 'var(--color-control-fill-strong)', fontFamily: 'inherit', fontSize: 16, padding: '11px 14px', color: 'var(--color-text-primary)' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
                <SignaturePad onChange={setFirmaUrl} />
                <div style={{ width: 206, flex: 'none', borderRadius: 14, background: 'var(--color-control-fill)', padding: '11px 14px' }}>
                  <div style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>Entrega</div>
                  <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.015em', marginTop: 2 }}>{state.user?.nombre ?? '—'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <button
                  className="primary-button"
                  onClick={confirmar}
                  style={{
                    appearance: 'none',
                    border: 0,
                    cursor: 'pointer',
                    minHeight: 'var(--height-button-primary-lg)',
                    padding: '0 24px',
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
                  Confirmar salida
                </button>
                <button
                  className="boton-cristal"
                  onClick={() => {
                    dispatch({ type: 'SET_SEL_ID', selId: out.id })
                    dispatch({ type: 'IR_A', screen: 'detalle' })
                  }}
                  style={{
                    appearance: 'none',
                    border: 0,
                    cursor: 'pointer',
                    minHeight: 'var(--height-button-primary-lg)',
                    padding: '0 22px',
                    borderRadius: 'var(--radius-button-lg)',
                    fontFamily: 'inherit',
                    fontSize: 17,
                    fontWeight: 560,
                    letterSpacing: '-0.02em',
                    color: 'var(--color-accent)',
                  }}
                >
                  Ver ficha
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
