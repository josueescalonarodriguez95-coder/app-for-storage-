import jsQR from 'jsqr'
import { useEffect, useRef, useState } from 'react'
import { getObjeto } from '../db/repo'
import type { Objeto } from '../db/schema'
import { useAppState } from '../state/AppStateContext'
import { nombreCliente } from '../state/selectors'
import { EstadoObjetoBadge } from '../components/ui/Badge'
import { formatMedidas, formatPeso, formatUbicacion } from '../utils/formato'

interface Lectura {
  id: string
  accion: string
  hora: string
}

/** Bip corto al leer un QR — Web Audio, sin archivo de sonido. */
function bip() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12)
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.12)
  } catch {
    // Web Audio no disponible: sin sonido, sin romper el flujo.
  }
}

export function ScannerScreen() {
  const { state, dispatch, flash } = useAppState()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'))
  const ultimoLeidoRef = useRef<string | null>(null)
  const [errorCamara, setErrorCamara] = useState<string | null>(null)
  const [hit, setHit] = useState<Objeto | null>(null)
  const [recientes, setRecientes] = useState<Lectura[]>([])
  const [activo, setActivo] = useState(true)

  useEffect(() => {
    if (!activo) return

    let stream: MediaStream | null = null
    let raf = 0
    let cancelado = false

    async function manejarLectura(codigo: string) {
      if (codigo === ultimoLeidoRef.current) return
      ultimoLeidoRef.current = codigo

      dispatch({ type: 'SET_SCANNED', scanned: codigo })
      bip()
      if (navigator.vibrate) navigator.vibrate(50)

      const objeto = await getObjeto(codigo)
      setHit(objeto ?? null)
      flash(objeto ? `${codigo} leído` : `${codigo} no está en la base`)
      setRecientes((prev) =>
        [{ id: codigo, accion: objeto ? 'Consulta' : 'Desconocido', hora: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) }, ...prev].slice(0, 3),
      )
      // Se apaga la cámara sola después de leer un código; "Escanear de nuevo" la reactiva.
      setActivo(false)
    }

    function loop() {
      const video = videoRef.current
      if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
        const canvas = canvasRef.current
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          const imagen = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const codigo = jsQR(imagen.data, imagen.width, imagen.height)
          if (codigo?.data) void manejarLectura(codigo.data)
        }
      }
      raf = requestAnimationFrame(loop)
    }

    async function iniciar() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        if (cancelado) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
          raf = requestAnimationFrame(loop)
        }
      } catch {
        if (!cancelado) setErrorCamara('No se pudo acceder a la cámara. Usa «Buscar a mano».')
      }
    }
    iniciar()

    return () => {
      cancelado = true
      cancelAnimationFrame(raf)
      stream?.getTracks().forEach((t) => t.stop())
      if (videoRef.current) videoRef.current.srcObject = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo])

  const cancelarEscaneo = () => setActivo(false)

  const escanearDeNuevo = () => {
    ultimoLeidoRef.current = null
    setHit(null)
    dispatch({ type: 'SET_SCANNED', scanned: null })
    setActivo(true)
  }

  const irAFicha = (id: string) => {
    dispatch({ type: 'SET_SEL_ID', selId: id })
    dispatch({ type: 'IR_A', screen: 'detalle' })
  }

  const registrarSalida = (id: string) => {
    dispatch({ type: 'SET_OUT_ID', outId: id })
    dispatch({ type: 'IR_A', screen: 'salida' })
  }

  const registrarComoNueva = () => {
    dispatch({ type: 'IR_A', screen: 'entrada' })
  }

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>
      <div
        style={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--color-camera-black)',
          margin: '16px 0 16px 16px',
          borderRadius: 'var(--radius-camera)',
          overflow: 'hidden',
        }}
      >
        <video ref={videoRef} playsInline muted style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />

        <div
          style={{
            position: 'absolute',
            top: 16,
            left: 18,
            padding: '5px 12px',
            borderRadius: 11,
            background: 'rgba(255,255,255,.14)',
            backdropFilter: 'blur(20px)',
            fontSize: 12,
            fontWeight: 500,
            color: 'rgba(255,255,255,.85)',
          }}
        >
          Cámara trasera · lector QR
        </div>

        {activo && !errorCamara && (
          <button
            className="boton-cristal-oscuro"
            onClick={cancelarEscaneo}
            aria-label="Cancelar escaneo"
            title="Cancelar escaneo"
            style={{
              position: 'absolute',
              top: 14,
              right: 16,
              appearance: 'none',
              border: 0,
              cursor: 'pointer',
              width: 32,
              height: 32,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              backdropFilter: 'blur(20px)',
              fontSize: 16,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        )}

        {errorCamara && (
          <div style={{ position: 'relative', maxWidth: 280, textAlign: 'center', color: 'rgba(255,255,255,.7)', fontSize: 14, lineHeight: 1.5 }}>{errorCamara}</div>
        )}

        {!errorCamara && activo && (
          <div style={{ position: 'relative', width: 326, height: 326, borderRadius: 26, border: '1px solid rgba(255,255,255,.22)' }}>
            <div style={{ position: 'absolute', top: -1, left: -1, width: 52, height: 52, borderTop: '4px solid var(--color-accent-light)', borderLeft: '4px solid var(--color-accent-light)', borderRadius: '26px 0 0 0' }} />
            <div style={{ position: 'absolute', top: -1, right: -1, width: 52, height: 52, borderTop: '4px solid var(--color-accent-light)', borderRight: '4px solid var(--color-accent-light)', borderRadius: '0 26px 0 0' }} />
            <div style={{ position: 'absolute', bottom: -1, left: -1, width: 52, height: 52, borderBottom: '4px solid var(--color-accent-light)', borderLeft: '4px solid var(--color-accent-light)', borderRadius: '0 0 0 26px' }} />
            <div style={{ position: 'absolute', bottom: -1, right: -1, width: 52, height: 52, borderBottom: '4px solid var(--color-accent-light)', borderRight: '4px solid var(--color-accent-light)', borderRadius: '0 0 26px 0' }} />
            <div
              style={{
                position: 'absolute',
                left: 14,
                right: 14,
                height: 2,
                borderRadius: 2,
                background: 'var(--color-accent-light)',
                boxShadow: '0 0 18px 3px rgba(224,71,47,.6)',
                animation: 'scan-sweep 1.7s ease-in-out infinite alternate',
              }}
            />
          </div>
        )}

        {!errorCamara && !activo && (
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' }}>
            <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 14, lineHeight: 1.5 }}>
              Escaneo en pausa.
              <br />
              Cámara apagada para ahorrar batería.
            </div>
            <button
              className="primary-button"
              onClick={escanearDeNuevo}
              style={{
                appearance: 'none',
                border: 0,
                cursor: 'pointer',
                minHeight: 46,
                padding: '0 22px',
                borderRadius: 14,
                fontFamily: 'inherit',
                fontSize: 16,
                fontWeight: 600,
                letterSpacing: '-0.015em',
                color: '#fff',
                background: 'var(--gradient-primary-button)',
                boxShadow: '0 2px 8px rgba(200,50,28,.3)',
              }}
            >
              Escanear de nuevo
            </button>
          </div>
        )}

        <div style={{ position: 'absolute', bottom: 22, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 10 }}>
          <button
            className="boton-cristal-oscuro"
            onClick={() => dispatch({ type: 'IR_A', screen: 'inv' })}
            style={{
              appearance: 'none',
              border: 0,
              cursor: 'pointer',
              minHeight: 48,
              padding: '0 22px',
              borderRadius: 16,
              fontFamily: 'inherit',
              fontSize: 16,
              fontWeight: 500,
              letterSpacing: '-0.015em',
              color: '#fff',
              backdropFilter: 'blur(20px)',
            }}
          >
            Buscar a mano
          </button>
        </div>
      </div>

      <aside style={{ width: 'var(--width-scanner-panel)', flex: 'none', padding: 16, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto' }}>
        {!state.scanned && (
          <div style={{ borderRadius: 'var(--radius-card)', background: 'var(--color-card-surface)', boxShadow: 'var(--shadow-card-strong)', padding: 22, fontSize: 15, lineHeight: 1.55, letterSpacing: '-0.015em', color: 'var(--color-text-secondary)' }}>
            Apunta la cámara al código del guacal o de la pieza. La ficha se abre aquí y puedes marcar entrada o salida sin salir de esta pantalla.
          </div>
        )}

        {state.scanned && hit && (
          <div style={{ borderRadius: 'var(--radius-card)', background: 'var(--color-card-surface-strong)', boxShadow: 'var(--shadow-card-strong)', padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
              <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em' }}>{hit.id}</div>
              <EstadoObjetoBadge estado={hit.estado} />
            </div>
            <div style={{ fontSize: 15, letterSpacing: '-0.015em', marginBottom: 16 }}>{hit.descripcion}</div>
            <div style={{ borderRadius: 14, background: 'var(--color-control-fill)', overflow: 'hidden' }}>
              {[
                ['Cliente', nombreCliente(state.clientes, hit.clienteId)],
                ['Ubicación', formatUbicacion(hit.ubicacion)],
                ['Medidas', formatMedidas(hit.medidas)],
                ['Peso', formatPeso(hit.pesoKg)],
              ].map(([etiqueta, valor], i) => (
                <div key={etiqueta} style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 14px', fontSize: 14, borderBottom: i < 3 ? '.5px solid var(--color-hairline-strong)' : undefined }}>
                  <span style={{ color: 'var(--color-text-tertiary)' }}>{etiqueta}</span>
                  <span style={{ fontWeight: 560 }}>{valor}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
              {hit.contenedorId === null && (
                <button
                  className="primary-button"
                  onClick={() => registrarSalida(hit.id)}
                  style={{ appearance: 'none', border: 0, cursor: 'pointer', minHeight: 46, borderRadius: 14, fontFamily: 'inherit', fontSize: 16, fontWeight: 600, letterSpacing: '-0.015em', color: '#fff', background: 'var(--gradient-primary-button)', boxShadow: '0 2px 8px rgba(200,50,28,.3)' }}
                >
                  Registrar salida
                </button>
              )}
              <button
                className="boton-cristal"
                onClick={() => irAFicha(hit.contenedorId ?? hit.id)}
                style={{ appearance: 'none', border: 0, cursor: 'pointer', minHeight: 46, borderRadius: 14, fontFamily: 'inherit', fontSize: 16, fontWeight: 560, letterSpacing: '-0.015em', color: 'var(--color-accent)' }}
              >
                Ver ficha completa
              </button>
            </div>
          </div>
        )}

        {state.scanned && !hit && (
          <div style={{ borderRadius: 'var(--radius-card)', background: 'var(--color-card-surface-strong)', boxShadow: 'var(--shadow-card-strong)', padding: 20 }}>
            <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 6 }}>{state.scanned}</div>
            <div style={{ fontSize: 15, letterSpacing: '-0.015em', color: 'var(--color-text-secondary)', marginBottom: 16 }}>
              Este código no está en la base de datos.
            </div>
            <button
              className="primary-button"
              onClick={registrarComoNueva}
              style={{ appearance: 'none', border: 0, cursor: 'pointer', width: '100%', minHeight: 46, borderRadius: 14, fontFamily: 'inherit', fontSize: 16, fontWeight: 600, letterSpacing: '-0.015em', color: '#fff', background: 'var(--gradient-primary-button)', boxShadow: '0 2px 8px rgba(200,50,28,.3)' }}
            >
              Registrar como nueva entrada
            </button>
          </div>
        )}

        <div style={{ borderRadius: 'var(--radius-card)', background: 'var(--color-card-surface)', boxShadow: 'var(--shadow-card-strong)', padding: '16px 18px', marginTop: 'auto' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-dim)', letterSpacing: '0.02em', marginBottom: 8 }}>ESCANEOS DE HOY</div>
          {recientes.length === 0 && <div style={{ fontSize: 13, color: 'var(--color-text-dim)' }}>Todavía no hay lecturas.</div>}
          {recientes.map((r, i) => (
            <div key={`${r.id}-${i}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '8px 0', borderBottom: i < recientes.length - 1 ? '.5px solid var(--color-hairline-strong)' : undefined, fontSize: 14, letterSpacing: '-0.015em' }}>
              <span style={{ fontWeight: 600 }}>{r.id}</span>
              <span style={{ color: 'var(--color-text-secondary)' }}>{r.accion}</span>
              <span style={{ color: 'var(--color-text-dim)', fontVariantNumeric: 'tabular-nums' }}>{r.hora}</span>
            </div>
          ))}
        </div>
      </aside>
    </div>
  )
}
