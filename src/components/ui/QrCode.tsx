import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

/**
 * QR real que codifica el número de inventario — el README pide sustituir el patrón
 * decorativo del prototipo por un QR de verdad al implementar.
 */
export function QrCode({ value, size = 58 }: { value: string; size?: number }) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false
    QRCode.toDataURL(value, { width: size * 2, margin: 0, color: { dark: '#1C1C1E', light: '#FFFFFF' } }).then(
      (url) => {
        if (!cancelado) setSrc(url)
      },
    )
    return () => {
      cancelado = true
    }
  }, [value, size])

  return (
    <div
      style={{
        width: size,
        height: size,
        flex: 'none',
        borderRadius: 8,
        background: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {src && <img src={src} alt={`QR ${value}`} width={size} height={size} />}
    </div>
  )
}
