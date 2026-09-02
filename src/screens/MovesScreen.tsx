import { useEffect, useState } from 'react'
import { DataCard } from '../components/ui/DataCard'
import { EstadoMudanzaBadge } from '../components/ui/Badge'
import { QrCode } from '../components/ui/QrCode'
import { agregarArticulosAMudanza, crearMudanza, eliminarObjeto } from '../db/mutations'
import { listObjetosDeMudanza } from '../db/repo'
import type { Objeto } from '../db/schema'
import { useAppState } from '../state/AppStateContext'
import { nombreCliente } from '../state/selectors'
import { formatFecha } from '../utils/fecha'

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function CampoTexto({
  etiqueta,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  etiqueta: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px', borderBottom: '.5px solid var(--color-hairline-strong)' }}>
      <span style={{ width: 120, flex: 'none', fontSize: 15, color: 'var(--color-text-secondary)', letterSpacing: '-0.015em' }}>{etiqueta}</span>
      <input
        type={type}
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

export function MovesScreen() {
  const { state, dispatch, flash, refrescarTodo } = useAppState()
  const [porMudanza, setPorMudanza] = useState<Record<string, Objeto[]>>({})

  const [creando, setCreando] = useState(false)
  const [nuevoCliente, setNuevoCliente] = useState('')
  const [nuevoDestino, setNuevoDestino] = useState('')
  const [nuevaFecha, setNuevaFecha] = useState(hoyISO())
  const [nuevaCuadrilla, setNuevaCuadrilla] = useState('')
  const [guardandoMudanza, setGuardandoMudanza] = useState(false)

  const [descArticulo, setDescArticulo] = useState('')
  const [cantArticulo, setCantArticulo] = useState('1')
  const [agregando, setAgregando] = useState(false)

  const mud = state.mudanzas.find((m) => m.codigo === state.mudSel) ?? null
  const articulos = mud ? (porMudanza[mud.codigo] ?? []) : []

  const cargarArticulos = async () => {
    const entradas = await Promise.all(
      state.mudanzas.map(async (m) => {
        const filas = await listObjetosDeMudanza(m.codigo)
        return [m.codigo, filas.map((f) => f.objeto)] as const
      }),
    )
    setPorMudanza(Object.fromEntries(entradas))
  }

  useEffect(() => {
    let cancelado = false
    cargarArticulos().catch(() => {
      if (!cancelado) setPorMudanza({})
    })
    return () => {
      cancelado = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.mudanzas])

  const empezarNueva = () => {
    setCreando(true)
    dispatch({ type: 'SET_MUD_SEL', mudSel: null })
  }

  const cancelarNueva = () => {
    setCreando(false)
    setNuevoCliente('')
    setNuevoDestino('')
    setNuevaCuadrilla('')
    setNuevaFecha(hoyISO())
  }

  const crear = async () => {
    if (!nuevoCliente.trim()) {
      flash('Falta el nombre del cliente')
      return
    }
    setGuardandoMudanza(true)
    try {
      const codigo = await crearMudanza({
        clienteNombre: nuevoCliente,
        destino: nuevoDestino,
        fecha: nuevaFecha,
        cuadrilla: nuevaCuadrilla,
      })
      await refrescarTodo()
      dispatch({ type: 'SET_MUD_SEL', mudSel: codigo })
      cancelarNueva()
      flash(`${codigo} creada`)
    } catch {
      flash('No se pudo crear la mudanza — revisá la conexión e intentá de nuevo')
    } finally {
      setGuardandoMudanza(false)
    }
  }

  const agregarArticulo = async () => {
    if (!mud) return
    if (!descArticulo.trim()) {
      flash('Falta la descripción del artículo')
      return
    }
    setAgregando(true)
    try {
      await agregarArticulosAMudanza({
        mudanzaId: mud.codigo,
        clienteId: mud.clienteId,
        descripcion: descArticulo,
        cantidad: Number(cantArticulo) || 1,
        usuarioId: state.user?.id ?? '',
      })
      await cargarArticulos()
      setDescArticulo('')
      setCantArticulo('1')
      flash(`${descArticulo.trim()} agregado`)
    } catch {
      flash('No se pudo agregar — revisá la conexión e intentá de nuevo')
    } finally {
      setAgregando(false)
    }
  }

  const quitar = async (objetoId: string) => {
    try {
      await eliminarObjeto(objetoId)
      await cargarArticulos()
      flash(`${objetoId} eliminado`)
    } catch {
      flash('No se pudo eliminar — revisá la conexión e intentá de nuevo')
    }
  }

  const imprimirEtiquetas = () => {
    dispatch({ type: 'SET_ETQ_SEL', ids: articulos.map((a) => a.id) })
    dispatch({ type: 'IR_A', screen: 'etq' })
  }

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>
      <div style={{ width: 'var(--width-mudanzas-list)', flex: 'none', padding: 16, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button
          className="primary-button"
          onClick={empezarNueva}
          style={{
            appearance: 'none',
            border: 0,
            cursor: 'pointer',
            minHeight: 'var(--height-row-min)',
            borderRadius: 'var(--radius-field)',
            fontFamily: 'inherit',
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: '-0.015em',
            color: '#fff',
            background: 'var(--gradient-primary-button)',
            boxShadow: 'var(--shadow-primary-button)',
          }}
        >
          + Nueva mudanza
        </button>

        <div style={{ borderRadius: 'var(--radius-card)', background: 'var(--color-card-surface-strong)', boxShadow: 'var(--shadow-card-strong)', overflow: 'hidden' }}>
          {state.mudanzas.length === 0 && (
            <p style={{ margin: 0, padding: 16, fontSize: 14, color: 'var(--color-text-dim)' }}>Todavía no hay mudanzas.</p>
          )}
          {state.mudanzas.map((m) => {
            const activo = !creando && state.mudSel === m.codigo
            const filas = porMudanza[m.codigo] ?? []
            return (
              <button
                key={m.codigo}
                onClick={() => {
                  setCreando(false)
                  dispatch({ type: 'SET_MUD_SEL', mudSel: m.codigo })
                }}
                style={{
                  appearance: 'none',
                  border: 0,
                  cursor: 'pointer',
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '15px 16px',
                  borderBottom: '.5px solid var(--color-hairline)',
                  fontFamily: 'inherit',
                  background: activo ? 'rgba(224,71,47,.1)' : 'transparent',
                  color: 'var(--color-text-primary)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
                  <span style={{ fontSize: 17, fontWeight: 680, letterSpacing: '-0.025em' }}>{m.codigo}</span>
                  <span style={{ fontSize: 13, opacity: 0.65, fontVariantNumeric: 'tabular-nums' }}>{formatFecha(m.fecha)}</span>
                </div>
                <div style={{ fontSize: 15, letterSpacing: '-0.015em', marginTop: 3 }}>{nombreCliente(state.clientes, m.clienteId)}</div>
                <div style={{ fontSize: 13, opacity: 0.62, marginTop: 5 }}>{filas.length} artículo(s)</div>
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ flex: 1, padding: '18px 26px 26px 6px', minWidth: 0, overflow: 'auto' }}>
        {creando ? (
          <>
            <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 16 }}>Nueva mudanza</div>
            <div style={{ maxWidth: 480, borderRadius: 'var(--radius-card)', background: 'var(--color-card-surface)', boxShadow: 'var(--shadow-card-strong)', overflow: 'hidden' }}>
              <CampoTexto etiqueta="Cliente" value={nuevoCliente} onChange={setNuevoCliente} placeholder="Nombre del cliente" />
              <CampoTexto etiqueta="Dirección" value={nuevoDestino} onChange={setNuevoDestino} placeholder="Destino de la mudanza" />
              <CampoTexto etiqueta="Fecha" value={nuevaFecha} onChange={setNuevaFecha} type="date" />
              <CampoTexto etiqueta="Cuadrilla" value={nuevaCuadrilla} onChange={setNuevaCuadrilla} placeholder="Ej. 3 personas · camioneta" />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button
                className="primary-button"
                onClick={crear}
                disabled={guardandoMudanza}
                style={{
                  appearance: 'none',
                  border: 0,
                  cursor: guardandoMudanza ? 'default' : 'pointer',
                  minHeight: 46,
                  padding: '0 22px',
                  borderRadius: 14,
                  fontFamily: 'inherit',
                  fontSize: 16,
                  fontWeight: 600,
                  letterSpacing: '-0.015em',
                  color: '#fff',
                  background: 'var(--gradient-primary-button)',
                  boxShadow: 'var(--shadow-primary-button)',
                }}
              >
                {guardandoMudanza ? 'Creando…' : 'Crear mudanza'}
              </button>
              <button
                className="boton-cristal"
                onClick={cancelarNueva}
                style={{ appearance: 'none', border: 0, cursor: 'pointer', minHeight: 46, padding: '0 18px', borderRadius: 14, fontFamily: 'inherit', fontSize: 15, fontWeight: 560, color: 'var(--color-text-secondary)' }}
              >
                Cancelar
              </button>
            </div>
          </>
        ) : !mud ? (
          <p style={{ font: 'var(--text-body)', color: 'var(--color-text-dim)' }}>Elegí una mudanza de la lista, o creá una nueva.</p>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.035em' }}>{mud.codigo}</div>
              <EstadoMudanzaBadge estado={mud.estado} size="lg" />
            </div>
            <div style={{ fontSize: 16, color: 'var(--color-text-secondary)', letterSpacing: '-0.015em', margin: '5px 0 16px' }}>
              {nombreCliente(state.clientes, mud.clienteId)}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
              <DataCard etiqueta="Fecha" valor={formatFecha(mud.fecha)} />
              <DataCard etiqueta="Destino" valor={mud.destino} />
              <DataCard etiqueta="Cuadrilla" valor={mud.cuadrilla} />
            </div>

            <div style={{ borderRadius: 'var(--radius-card)', background: 'var(--color-card-surface)', boxShadow: 'var(--shadow-card-strong)', padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-dim)', marginBottom: 10 }}>AGREGAR ARTÍCULO</div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input
                  value={descArticulo}
                  onChange={(e) => setDescArticulo(e.target.value)}
                  placeholder="Ej. Silla, Mesa, Caja de libros…"
                  onKeyDown={(e) => e.key === 'Enter' && !agregando && agregarArticulo()}
                  style={{
                    flex: 1,
                    appearance: 'none',
                    border: 0,
                    outline: 0,
                    borderRadius: 'var(--radius-control-sm)',
                    background: 'var(--color-control-fill-strong)',
                    fontFamily: 'inherit',
                    fontSize: 16,
                    letterSpacing: '-0.015em',
                    padding: '11px 14px',
                    color: 'var(--color-text-primary)',
                  }}
                />
                <input
                  value={cantArticulo}
                  onChange={(e) => setCantArticulo(e.target.value.replace(/[^0-9]/g, ''))}
                  onKeyDown={(e) => e.key === 'Enter' && !agregando && agregarArticulo()}
                  inputMode="numeric"
                  style={{
                    width: 64,
                    flex: 'none',
                    appearance: 'none',
                    border: 0,
                    outline: 0,
                    borderRadius: 'var(--radius-control-sm)',
                    background: 'var(--color-control-fill-strong)',
                    fontFamily: 'inherit',
                    fontSize: 16,
                    padding: '11px 8px',
                    color: 'var(--color-text-primary)',
                    textAlign: 'center',
                  }}
                />
                <button
                  className="primary-button"
                  onClick={agregarArticulo}
                  disabled={agregando}
                  style={{
                    appearance: 'none',
                    border: 0,
                    cursor: agregando ? 'default' : 'pointer',
                    minHeight: 44,
                    padding: '0 20px',
                    borderRadius: 'var(--radius-control-sm)',
                    fontFamily: 'inherit',
                    fontSize: 15,
                    fontWeight: 600,
                    letterSpacing: '-0.015em',
                    color: '#fff',
                    background: 'var(--gradient-primary-button)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {agregando ? 'Agregando…' : 'Agregar'}
                </button>
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-dim)', marginTop: 8 }}>
                Cada unidad queda como un artículo propio, con su propio código QR.
              </div>
            </div>

            <div style={{ borderRadius: 'var(--radius-card)', background: 'var(--color-card-surface-strong)', boxShadow: 'var(--shadow-card-strong)', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 18px', borderBottom: '.5px solid var(--color-hairline-strong)' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-dim)' }}>ARTÍCULOS RECIBIDOS</span>
                {articulos.length > 0 && (
                  <button
                    className="boton-cristal"
                    onClick={imprimirEtiquetas}
                    style={{ appearance: 'none', border: 0, cursor: 'pointer', minHeight: 34, padding: '0 14px', borderRadius: 11, fontFamily: 'inherit', fontSize: 14, fontWeight: 560, color: 'var(--color-accent)' }}
                  >
                    Imprimir etiquetas
                  </button>
                )}
              </div>
              {articulos.length === 0 && (
                <p style={{ margin: 0, padding: 18, fontSize: 14, color: 'var(--color-text-dim)' }}>Todavía no se agregó ningún artículo.</p>
              )}
              {articulos.map((a) => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', borderBottom: '.5px solid var(--color-hairline)' }}>
                  <QrCode value={a.id} size={30} />
                  <span style={{ width: 90, flex: 'none', fontSize: 14, fontWeight: 640, fontVariantNumeric: 'tabular-nums' }}>{a.id}</span>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 15, letterSpacing: '-0.015em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.descripcion}
                  </span>
                  <button
                    onClick={() => quitar(a.id)}
                    title="Eliminar este artículo"
                    style={{ appearance: 'none', border: 0, background: 'transparent', cursor: 'pointer', padding: 4, fontSize: 15, lineHeight: 1, color: 'var(--color-text-dim)' }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <p style={{ margin: '12px 0 0', fontSize: 13, color: 'var(--color-text-dim)', letterSpacing: '-0.01em' }}>
              {articulos.length} artículo(s) recibido(s) en total
            </p>
          </>
        )}
      </div>
    </div>
  )
}
