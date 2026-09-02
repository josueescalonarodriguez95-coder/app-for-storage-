import { useEffect, useRef, useState } from 'react'
import { QrCode } from '../components/ui/QrCode'
import { SegmentedControl } from '../components/ui/SegmentedControl'
import { crearObjetoConEntrada, nextObjetoId, resolverCliente } from '../db/mutations'
import type { TipoObjeto } from '../db/schema'
import { useAppState } from '../state/AppStateContext'
import { subirFoto } from '../utils/imagen'

const TIPOS: TipoObjeto[] = ['Guacal', 'Obra', 'Pedestal', 'Escultura']
const NAVES = ['N1', 'N2', 'N3']

function CampoTexto({
  etiqueta,
  value,
  onChange,
  placeholder,
  ultimo = false,
}: {
  etiqueta: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  ultimo?: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '13px 18px',
        borderBottom: ultimo ? undefined : '.5px solid var(--color-hairline-strong)',
      }}
    >
      <span style={{ width: 132, flex: 'none', fontSize: 15, color: 'var(--color-text-secondary)', letterSpacing: '-0.015em' }}>
        {etiqueta}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          flex: 1,
          appearance: 'none',
          border: 0,
          outline: 0,
          background: 'transparent',
          fontFamily: 'inherit',
          fontSize: 16,
          letterSpacing: '-0.015em',
          padding: '4px 0',
          color: 'var(--color-text-primary)',
        }}
      />
    </div>
  )
}

function CampoCaja({
  value,
  onChange,
  placeholder,
  width,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  width?: number
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      inputMode="decimal"
      style={{
        flex: width ? 'none' : 1,
        width,
        minWidth: 0,
        appearance: 'none',
        border: 0,
        outline: 0,
        borderRadius: 'var(--radius-control-sm)',
        background: 'var(--color-control-fill-strong)',
        fontFamily: 'inherit',
        fontSize: 16,
        padding: width ? '10px 12px' : '9px 12px',
        color: 'var(--color-text-primary)',
      }}
    />
  )
}

export function CheckInScreen() {
  const { state, dispatch, flash, refrescarItems } = useAppState()
  const { entrada } = state
  const [nextId, setNextId] = useState<string>('…')
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const fotoInputRef = useRef<HTMLInputElement>(null)

  // Si se llega desde un QR desconocido (README: "ofrecer «Registrar como nueva entrada» con
  // ese código ya asignado"), se usa el código escaneado en vez del siguiente correlativo.
  const idForzado = state.scanned && !state.items.some((i) => i.id === state.scanned) ? state.scanned : null

  useEffect(() => {
    if (idForzado) {
      setNextId(idForzado)
      return
    }
    let cancelado = false
    nextObjetoId().then((id) => {
      if (!cancelado) setNextId(id)
    })
    return () => {
      cancelado = true
    }
  }, [state.items.length, idForzado])

  const set = (campos: Partial<typeof entrada>) => dispatch({ type: 'SET_CAMPO_ENTRADA', campos })

  const addPieza = () => {
    const ref = `P-${String(entrada.piezas.length + 1).padStart(2, '0')}`
    set({ piezas: [...entrada.piezas, { ref, descripcion: '', largo: '', ancho: '' }] })
  }

  const editarPieza = (i: number, cambios: Partial<(typeof entrada.piezas)[number]>) => {
    set({ piezas: entrada.piezas.map((p, idx) => (idx === i ? { ...p, ...cambios } : p)) })
  }

  const cancelar = () => {
    dispatch({ type: 'RESET_ENTRADA' })
    dispatch({ type: 'SET_SCANNED', scanned: null })
    dispatch({ type: 'IR_A', screen: 'inv' })
  }

  const guardar = async () => {
    try {
      const clienteId = await resolverCliente(entrada.cliente)
      const id = idForzado ?? (await nextObjetoId())
      await crearObjetoConEntrada({
        id,
        tipo: entrada.tipo,
        descripcion: entrada.descripcion,
        clienteId,
        nave: entrada.nave,
        rack: entrada.rack,
        nivel: entrada.nivel,
        largo: entrada.largo ? Number(entrada.largo) : null,
        ancho: entrada.ancho ? Number(entrada.ancho) : null,
        alto: entrada.alto ? Number(entrada.alto) : null,
        pesoKg: entrada.peso ? Number(entrada.peso) : null,
        piezas: entrada.piezas.map((p) => ({
          ref: p.ref,
          descripcion: p.descripcion,
          largo: p.largo ? Number(p.largo) : null,
          ancho: p.ancho ? Number(p.ancho) : null,
        })),
        usuarioId: state.user?.id ?? '',
        fotoUrl: entrada.fotoUrl,
      })

      await refrescarItems()
      dispatch({ type: 'RESET_ENTRADA' })
      dispatch({ type: 'SET_SCANNED', scanned: null })
      dispatch({ type: 'SET_SEL_ID', selId: id })
      dispatch({ type: 'IR_A', screen: 'detalle' })
      flash(`${id} registrado · etiqueta enviada a la impresora`)
    } catch {
      // Si el número de inventario chocó con uno creado en otro iPad al mismo tiempo, o se
      // cayó la conexión, se avisa y se deja el formulario intacto para reintentar.
      flash('No se pudo guardar — revisá la conexión e intentá de nuevo')
    }
  }

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>
      <div style={{ flex: 1, padding: '18px 26px 30px', minWidth: 0, overflow: 'auto' }}>
        <div
          style={{
            borderRadius: 'var(--radius-card)',
            background: 'var(--color-card-surface)',
            boxShadow: 'var(--shadow-card-strong)',
            padding: 20,
            marginBottom: 14,
          }}
        >
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-dim)', marginBottom: 6 }}>Número asignado</div>
              <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', whiteSpace: 'nowrap' }}>{nextId}</div>
            </div>
            <div style={{ flex: 1, minWidth: 280 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-dim)', marginBottom: 6 }}>Tipo de objeto</div>
              <SegmentedControl options={TIPOS} value={entrada.tipo} onChange={(tipo) => set({ tipo })} />
            </div>
          </div>
        </div>

        <div
          style={{
            borderRadius: 'var(--radius-card)',
            background: 'var(--color-card-surface)',
            boxShadow: 'var(--shadow-card-strong)',
            overflow: 'hidden',
            marginBottom: 14,
          }}
        >
          <CampoTexto etiqueta="Descripción" value={entrada.descripcion} onChange={(descripcion) => set({ descripcion })} placeholder="Guacal reforzado — óleo sobre tela, 2 piezas" />
          <CampoTexto etiqueta="Cliente" value={entrada.cliente} onChange={(cliente) => set({ cliente })} placeholder="Galería, museo o particular" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px', borderBottom: '.5px solid var(--color-hairline-strong)' }}>
            <span style={{ width: 132, flex: 'none', fontSize: 15, color: 'var(--color-text-secondary)', letterSpacing: '-0.015em' }}>Medidas (cm)</span>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', gap: 8 }}>
              <CampoCaja value={entrada.largo} onChange={(largo) => set({ largo })} placeholder="Largo" />
              <CampoCaja value={entrada.ancho} onChange={(ancho) => set({ ancho })} placeholder="Ancho" />
              <CampoCaja value={entrada.alto} onChange={(alto) => set({ alto })} placeholder="Alto" />
            </div>
          </div>
          <CampoTexto etiqueta="Peso (kg)" value={entrada.peso} onChange={(peso) => set({ peso })} placeholder="0" ultimo />
        </div>

        <div
          style={{
            borderRadius: 'var(--radius-card)',
            background: 'var(--color-card-surface)',
            boxShadow: 'var(--shadow-card-strong)',
            padding: 18,
            marginBottom: 14,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-dim)', marginBottom: 10 }}>UBICACIÓN ASIGNADA</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <SegmentedControl options={NAVES} value={entrada.nave} onChange={(nave) => set({ nave })} />
            <CampoCaja value={entrada.rack} onChange={(rack) => set({ rack })} placeholder="Rack" width={104} />
            <CampoCaja value={entrada.nivel} onChange={(nivel) => set({ nivel })} placeholder="Nivel" width={104} />
            <span style={{ fontSize: 13, color: 'var(--color-text-dim)', letterSpacing: '-0.01em' }}>
              Sugerido: <strong style={{ color: 'var(--color-text-secondary)' }}>N2 · R09 · B1</strong>
            </span>
          </div>
        </div>

        {entrada.tipo === 'Guacal' && (
          <div style={{ borderRadius: 'var(--radius-card)', background: 'var(--color-card-surface)', boxShadow: 'var(--shadow-card-strong)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '.5px solid var(--color-hairline-strong)' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-dim)' }}>CONTENIDO DEL GUACAL</span>
              <button onClick={addPieza} className="boton-cristal" style={{ appearance: 'none', border: 0, cursor: 'pointer', minHeight: 34, padding: '0 14px', borderRadius: 11, fontFamily: 'inherit', fontSize: 14, fontWeight: 560, color: 'var(--color-accent)' }}>
                + Añadir pieza
              </button>
            </div>
            {entrada.piezas.map((p, i) => (
              <div key={p.ref} style={{ display: 'flex', gap: 14, padding: '13px 18px', borderBottom: '.5px solid var(--color-hairline)', fontSize: 15, letterSpacing: '-0.015em', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, width: 56, flex: 'none', fontVariantNumeric: 'tabular-nums' }}>{p.ref}</span>
                <input
                  value={p.descripcion}
                  onChange={(e) => editarPieza(i, { descripcion: e.target.value })}
                  placeholder="Descripción de la pieza"
                  style={{ flex: 1, appearance: 'none', border: 0, outline: 0, background: 'transparent', fontFamily: 'inherit', fontSize: 15, color: 'var(--color-text-primary)' }}
                />
                <input
                  value={p.largo}
                  onChange={(e) => editarPieza(i, { largo: e.target.value })}
                  placeholder="L"
                  inputMode="decimal"
                  style={{ width: 48, appearance: 'none', border: 0, outline: 0, borderRadius: 'var(--radius-control-sm)', background: 'var(--color-control-fill-strong)', fontFamily: 'inherit', fontSize: 15, padding: '6px 8px', color: 'var(--color-text-primary)', textAlign: 'center' }}
                />
                <span style={{ color: 'var(--color-text-dim)' }}>×</span>
                <input
                  value={p.ancho}
                  onChange={(e) => editarPieza(i, { ancho: e.target.value })}
                  placeholder="A"
                  inputMode="decimal"
                  style={{ width: 48, appearance: 'none', border: 0, outline: 0, borderRadius: 'var(--radius-control-sm)', background: 'var(--color-control-fill-strong)', fontFamily: 'inherit', fontSize: 15, padding: '6px 8px', color: 'var(--color-text-primary)', textAlign: 'center' }}
                />
                <span style={{ color: 'var(--color-text-dim)' }}>cm</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <aside style={{ width: 'var(--width-sidebar-right)', flex: 'none', padding: '18px 22px 18px 0', display: 'flex', flexDirection: 'column', gap: 14, overflow: 'auto' }}>
        <div style={{ borderRadius: 'var(--radius-card)', background: 'var(--color-card-surface)', boxShadow: 'var(--shadow-card-strong)', padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-dim)', marginBottom: 10 }}>FOTO DEL OBJETO</div>
          <button
            onClick={() => fotoInputRef.current?.click()}
            disabled={subiendoFoto}
            style={{
              appearance: 'none',
              border: 0,
              cursor: subiendoFoto ? 'default' : 'pointer',
              width: '100%',
              height: 172,
              borderRadius: 15,
              background: entrada.fotoUrl ? 'transparent' : 'var(--color-control-fill-strong)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              color: 'var(--color-text-dim)',
              overflow: 'hidden',
              padding: 0,
            }}
          >
            {subiendoFoto ? (
              <span style={{ fontSize: 14 }}>Subiendo foto…</span>
            ) : entrada.fotoUrl ? (
              <img src={entrada.fotoUrl} alt="Foto del objeto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
                  <rect x="3" y="6" width="18" height="14" rx="3" />
                  <path d="M8 6l2-2h4l2 2" />
                  <circle cx="12" cy="13" r="3.6" />
                </svg>
                <span style={{ fontSize: 14 }}>Tomar foto</span>
              </>
            )}
          </button>
          <input
            ref={fotoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (!file) return
              setSubiendoFoto(true)
              subirFoto(file)
                .then((fotoUrl) => set({ fotoUrl }))
                .catch(() => flash('No se pudo subir la foto — revisá la conexión'))
                .finally(() => setSubiendoFoto(false))
            }}
          />
        </div>

        <div style={{ borderRadius: 'var(--radius-card)', background: 'var(--color-card-surface)', boxShadow: 'var(--shadow-card-strong)', padding: 16, display: 'flex', gap: 14, alignItems: 'center' }}>
          <QrCode value={nextId} size={62} />
          <div>
            <div style={{ fontSize: 17, fontWeight: 640, letterSpacing: '-0.02em' }}>{nextId}</div>
            <div style={{ fontSize: 13, color: 'var(--color-text-dim)', lineHeight: 1.45 }}>
              Se imprime al guardar
              <br />
              Formato 60 × 40 mm
            </div>
          </div>
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            className="primary-button"
            onClick={guardar}
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
            Guardar e imprimir
          </button>
          <button
            className="boton-cristal"
            onClick={cancelar}
            style={{
              appearance: 'none',
              border: 0,
              cursor: 'pointer',
              minHeight: 46,
              borderRadius: 14,
              fontFamily: 'inherit',
              fontSize: 16,
              fontWeight: 520,
              color: 'var(--color-text-secondary)',
            }}
          >
            Cancelar
          </button>
        </div>
      </aside>
    </div>
  )
}
