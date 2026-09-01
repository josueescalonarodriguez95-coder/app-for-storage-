import { useEffect, useRef, useState } from 'react'

/**
 * Lienzo de firma real — README: "en producción es un lienzo de firma que guarda un PNG".
 * Área de 66px de alto sobre rgba(120,120,128,.1), con el texto de instrucción hasta que se dibuja algo.
 */
export function SignaturePad({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const contenedorRef = useRef<HTMLDivElement>(null)
  const dibujando = useRef(false)
  const [vacio, setVacio] = useState(true)

  useEffect(() => {
    const canvas = canvasRef.current
    const contenedor = contenedorRef.current
    if (!canvas || !contenedor) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = contenedor.clientWidth * dpr
    canvas.height = contenedor.clientHeight * dpr
    const ctx = canvas.getContext('2d')
    ctx?.scale(dpr, dpr)
  }, [])

  const posicion = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const empezar = (e: React.PointerEvent<HTMLCanvasElement>) => {
    dibujando.current = true
    const ctx = canvasRef.current!.getContext('2d')!
    const { x, y } = posicion(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const dibujar = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dibujando.current) return
    const ctx = canvasRef.current!.getContext('2d')!
    const { x, y } = posicion(e)
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#1C1C1E'
    ctx.lineTo(x, y)
    ctx.stroke()
    if (vacio) setVacio(false)
  }

  const terminar = () => {
    if (!dibujando.current) return
    dibujando.current = false
    onChange(vacio ? null : (canvasRef.current?.toDataURL('image/png') ?? null))
  }

  const limpiar = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
    setVacio(true)
    onChange(null)
  }

  return (
    <div
      ref={contenedorRef}
      style={{
        flex: 1,
        height: 66,
        borderRadius: 14,
        background: 'var(--color-control-fill)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {vacio && (
        <span
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            padding: '0 14px',
            fontSize: 14,
            color: 'var(--color-text-dim)',
            pointerEvents: 'none',
          }}
        >
          Firmar con el dedo o Apple Pencil
        </span>
      )}
      <canvas
        ref={canvasRef}
        onPointerDown={empezar}
        onPointerMove={dibujar}
        onPointerUp={terminar}
        onPointerLeave={terminar}
        style={{ width: '100%', height: '100%', touchAction: 'none', cursor: 'crosshair' }}
      />
      {!vacio && (
        <button
          onClick={limpiar}
          style={{
            position: 'absolute',
            top: 4,
            right: 6,
            appearance: 'none',
            border: 0,
            background: 'transparent',
            fontSize: 12,
            color: 'var(--color-accent)',
            cursor: 'pointer',
          }}
        >
          Borrar
        </button>
      )}
    </div>
  )
}
