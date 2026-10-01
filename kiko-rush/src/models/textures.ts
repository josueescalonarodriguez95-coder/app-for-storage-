import * as THREE from 'three'

// Texturas procedurales con relieve (mapa de normales), generadas al arrancar.
// Todo es "tileable" para repetir sin costuras, y nada se descarga de internet.

/** Ruido de valor periódico (se repite cada `period` celdas). */
function makeNoise(seed: number) {
  const perm = new Uint8Array(512)
  let s = seed
  for (let i = 0; i < 256; i++) perm[i] = i
  for (let i = 255; i > 0; i--) {
    s = (s * 16807) % 2147483647
    const j = s % (i + 1)
    ;[perm[i], perm[j]] = [perm[j], perm[i]]
  }
  for (let i = 0; i < 256; i++) perm[i + 256] = perm[i]
  const hash = (x: number, y: number) => perm[(perm[x & 255] + y) & 255] / 255
  const fade = (t: number) => t * t * (3 - 2 * t)
  return (x: number, y: number, period: number, periodY = period): number => {
    const xi = Math.floor(x)
    const yi = Math.floor(y)
    const xf = fade(x - xi)
    const yf = fade(y - yi)
    const x0 = ((xi % period) + period) % period
    const y0 = ((yi % periodY) + periodY) % periodY
    const x1 = (x0 + 1) % period
    const y1 = (y0 + 1) % periodY
    const a = hash(x0, y0)
    const b = hash(x1, y0)
    const c = hash(x0, y1)
    const d = hash(x1, y1)
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf
  }
}

const noise = makeNoise(1337)

/** fbm periódico en [0,1]. u, v en [0,1). `baseV` distinto de `base` = vetas alargadas. */
export function fbm(u: number, v: number, base = 4, octaves = 5, baseV = base): number {
  let sum = 0
  let amp = 0.5
  let fu = base
  let fv = baseV
  let norm = 0
  for (let o = 0; o < octaves; o++) {
    sum += noise(u * fu, v * fv, fu, fv) * amp
    norm += amp
    amp *= 0.5
    fu *= 2
    fv *= 2
  }
  return sum / norm
}

interface Built {
  map: THREE.CanvasTexture
  normalMap: THREE.CanvasTexture
  roughnessMap?: THREE.CanvasTexture
}

/**
 * Arma color + normales a partir de una función que, por pixel, devuelve [r, g, b, altura].
 */
function build(size: number, fn: (u: number, v: number) => [number, number, number, number], strength = 2, wrap = true): Built {
  const color = document.createElement('canvas')
  color.width = color.height = size
  const cg = color.getContext('2d')!
  const img = cg.createImageData(size, size)
  const heights = new Float32Array(size * size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [r, g, b, h] = fn(x / size, y / size)
      const i = (y * size + x) * 4
      img.data[i] = r
      img.data[i + 1] = g
      img.data[i + 2] = b
      img.data[i + 3] = 255
      heights[y * size + x] = h
    }
  }
  cg.putImageData(img, 0, 0)

  const normal = document.createElement('canvas')
  normal.width = normal.height = size
  const ng = normal.getContext('2d')!
  const nimg = ng.createImageData(size, size)
  const H = (x: number, y: number) => heights[((y + size) % size) * size + ((x + size) % size)]
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (H(x + 1, y) - H(x - 1, y)) * strength
      const dy = (H(x, y + 1) - H(x, y - 1)) * strength
      const len = Math.hypot(dx, dy, 1)
      const i = (y * size + x) * 4
      nimg.data[i] = ((-dx / len) * 0.5 + 0.5) * 255
      nimg.data[i + 1] = ((dy / len) * 0.5 + 0.5) * 255
      nimg.data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255
      nimg.data[i + 3] = 255
    }
  }
  ng.putImageData(nimg, 0, 0)

  const map = new THREE.CanvasTexture(color)
  map.colorSpace = THREE.SRGBColorSpace
  const normalMap = new THREE.CanvasTexture(normal)
  for (const t of [map, normalMap]) {
    t.anisotropy = 8
    if (wrap) t.wrapS = t.wrapT = THREE.RepeatWrapping
  }
  return { map, normalMap }
}

const cache = new Map<string, Built>()
function cached(key: string, make: () => Built): Built {
  let b = cache.get(key)
  if (!b) {
    b = make()
    cache.set(key, b)
  }
  return b
}

const mix = (a: number, b: number, t: number) => a + (b - a) * t
const clamp01 = (x: number) => Math.min(1, Math.max(0, x))

/** Arena fina con ondulaciones del viento. */
export function sandTex(): Built {
  return cached('sand', () =>
    build(
      512,
      (u, v) => {
        const n = fbm(u, v, 8, 5)
        const grain = noise(u * 256, v * 256, 256)
        const warp = fbm(u + 0.3, v, 3, 3)
        const ripple = Math.sin((v * 22 + warp * 3) * Math.PI * 2) * 0.5 + 0.5
        const h = ripple * 0.35 + n * 0.5 + grain * 0.15
        const shade = 0.88 + n * 0.16 + grain * 0.06 - ripple * 0.04
        return [236 * shade, 205 * shade, 152 * shade, h]
      },
      3,
    ),
  )
}

/** Arena mojada / compactada para el sendero. */
export function pathTex(): Built {
  return cached('path', () =>
    build(
      512,
      (u, v) => {
        const n = fbm(u, v, 6, 5)
        const grain = noise(u * 300, v * 300, 300)
        const prints = fbm(u, v, 16, 2)
        // Cada carril ocupa una repetición en u: los bordes quedan un poco más gastados y se notan los carriles
        const edge = Math.min(u, 1 - u)
        const rut = 1 - THREE.MathUtils.smoothstep(edge, 0, 0.09)
        const h = n * 0.6 + grain * 0.2 + (prints > 0.62 ? -0.2 : 0) - rut * 0.4
        const shade = 0.86 + n * 0.14 + grain * 0.05 - (prints > 0.62 ? 0.04 : 0) - rut * 0.1
        return [228 * shade, 192 * shade, 138 * shade, h]
      },
      2.5,
    ),
  )
}

/** Corteza de tronco: vetas a lo largo (eje u). */
export function barkTex(): Built {
  return cached('bark', () =>
    build(
      256,
      (u, v) => {
        const n = fbm(u, v, 4, 4)
        const streak = fbm(u, v, 2, 3, 24)
        const crack = Math.abs(Math.sin((v * 18 + n * 2) * Math.PI))
        const h = streak * 0.6 + (crack < 0.15 ? -0.5 : 0) + n * 0.3
        const s = 0.6 + streak * 0.5 - (crack < 0.15 ? 0.25 : 0)
        return [120 * s, 78 * s, 45 * s, h]
      },
      4,
    ),
  )
}

/** Tronco de palmera: anillos horizontales. */
export function palmTrunkTex(): Built {
  return cached('palmtrunk', () =>
    build(
      256,
      (u, v) => {
        const n = fbm(u, v, 6, 4)
        const ring = (v * 10 + n * 0.4) % 1
        const edge = ring < 0.18 ? ring / 0.18 : 1
        const h = edge * 0.8 + n * 0.3
        const s = 0.55 + edge * 0.35 + n * 0.25
        return [150 * s, 112 * s, 72 * s, h]
      },
      5,
    ),
  )
}

/** Tablones de madera (cajas, muelles). */
export function plankTex(tint: [number, number, number] = [196, 140, 78]): Built {
  return cached(`plank-${tint.join(',')}`, () =>
    build(
      256,
      (u, v) => {
        const board = Math.floor(v * 4)
        const vv = v * 4 - board
        const grain = fbm((u + board * 0.37) % 1, v, 2, 4, 32)
        const lines = Math.sin((vv * 6 + grain * 4) * Math.PI) * 0.5 + 0.5
        const gap = vv < 0.04 || vv > 0.96
        const h = gap ? 0 : 0.6 + lines * 0.2 + grain * 0.2
        const s = gap ? 0.35 : 0.72 + lines * 0.15 + grain * 0.25 + (board % 2) * 0.05
        return [tint[0] * s, tint[1] * s, tint[2] * s, h]
      },
      3,
    ),
  )
}

/** Metal cepillado con remaches (cajas de hierro, ollas). */
export function metalTex(): Built {
  return cached('metal', () =>
    build(
      256,
      (u, v) => {
        const brush = noise(u * 4, v * 200, 4, 200) * 0.5 + fbm(u, v, 4, 3) * 0.5
        let h = brush * 0.15
        for (const [cx, cy] of [
          [0.12, 0.12],
          [0.88, 0.12],
          [0.12, 0.88],
          [0.88, 0.88],
        ]) {
          const d = Math.hypot(u - cx, v - cy)
          if (d < 0.05) h += Math.cos((d / 0.05) * Math.PI * 0.5) * 0.9
        }
        const frame = u < 0.06 || u > 0.94 || v < 0.06 || v > 0.94 ? 0.3 : 0
        h += frame
        const s = 0.55 + brush * 0.3 + frame * 0.3
        return [140 * s, 150 * s, 160 * s, h]
      },
      3,
    ),
  )
}

/** Roca con vetas. */
export function rockTex(): Built {
  return cached('rock', () =>
    build(
      256,
      (u, v) => {
        const n = fbm(u, v, 4, 6)
        const vein = Math.abs(fbm(u + 3, v, 3, 3) - 0.5) < 0.03 ? 1 : 0
        const s = 0.5 + n * 0.5 - vein * 0.2
        return [128 * s, 122 * s, 112 * s, n - vein * 0.3]
      },
      4,
    ),
  )
}

/** Fibra de coco. */
export function coconutTex(): Built {
  return cached('coconut', () =>
    build(
      256,
      (u, v) => {
        const fiber = fbm(u, v, 4, 3, 32)
        const n = fbm(u, v, 6, 4)
        const s = 0.45 + fiber * 0.5 + n * 0.2
        return [120 * s, 80 * s, 45 * s, fiber * 0.8 + n * 0.3]
      },
      5,
    ),
  )
}

/** Pelaje suave: casi sin color, sólo relieve (se tiñe con el color del material). */
export function furTex(): Built {
  return cached('fur', () =>
    build(
      256,
      (u, v) => {
        const strands = noise(u * 160, v * 40, 160, 40) * 0.6 + fbm(u, v, 8, 3) * 0.4
        const s = 0.88 + strands * 0.12
        return [255 * s, 255 * s, 255 * s, strands]
      },
      2,
    ),
  )
}

/** Caparazón de tortuga: placas hexagonales. */
export function shellTex(): Built {
  return cached('shell', () =>
    build(
      256,
      (u, v) => {
        const sx = u * 6
        const sy = v * 6 * 1.15
        const row = Math.floor(sy)
        const ox = row % 2 ? 0.5 : 0
        const cx = (sx + ox) % 1
        const cy = sy % 1
        const d = Math.max(Math.abs(cx - 0.5) * 1.2, Math.abs(cy - 0.5))
        const n = fbm(u, v, 6, 3)
        const border = d > 0.42
        const s = border ? 0.55 : 0.85 + n * 0.25 - d * 0.3
        return [mix(70, 120, n) * s, 128 * s, 52 * s, border ? 0 : 1 - d]
      },
      4,
    ),
  )
}

/** Piel de guayaba con puntitos. */
export function guavaTex(): Built {
  return cached('guava', () =>
    build(
      128,
      (u, v) => {
        const n = fbm(u, v, 4, 3)
        const dots = noise(u * 64, v * 64, 64) > 0.82 ? 1 : 0
        const blush = clamp01(fbm(u + 2, v, 2, 2) * 1.6 - 0.6)
        const r = mix(180, 230, blush) - dots * 30
        const g = mix(210, 150, blush) - dots * 30
        const b = mix(80, 110, blush) - dots * 20
        return [r * (0.9 + n * 0.15), g * (0.9 + n * 0.15), b, n * 0.4 + dots * 0.3]
      },
      2,
    ),
  )
}

// ---------- Texturas con transparencia ----------

function alphaCanvas(size: number, draw: (g: CanvasRenderingContext2D, s: number) => void): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = size
  draw(c.getContext('2d')!, size)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

const alphaCache = new Map<string, THREE.Texture>()
function cachedAlpha(key: string, make: () => THREE.Texture): THREE.Texture {
  let t = alphaCache.get(key)
  if (!t) {
    t = make()
    alphaCache.set(key, t)
  }
  return t
}

/** Hoja de palmera: nervio central y foliolos, a lo largo del eje x de la textura. */
export function frondTex(): THREE.Texture {
  return cachedAlpha('frond', () =>
    alphaCanvas(512, (g, s) => {
      g.clearRect(0, 0, s, s)
      const mid = s / 2
      for (let i = 0; i < 46; i++) {
        const t = i / 46
        const x = s * 0.04 + t * s * 0.92
        const len = Math.sin(t * Math.PI) * s * 0.42 + s * 0.04
        for (const dir of [-1, 1]) {
          const grd = g.createLinearGradient(x, mid, x + s * 0.08, mid + dir * len)
          grd.addColorStop(0, '#3f8f2c')
          grd.addColorStop(1, i % 3 ? '#6dbb3c' : '#58a834')
          g.strokeStyle = grd
          g.lineWidth = s * 0.018
          g.lineCap = 'round'
          g.beginPath()
          g.moveTo(x, mid)
          g.quadraticCurveTo(x + s * 0.04, mid + dir * len * 0.5, x + s * 0.09, mid + dir * len)
          g.stroke()
        }
      }
      g.strokeStyle = '#8a7a3a'
      g.lineWidth = s * 0.014
      g.beginPath()
      g.moveTo(0, mid)
      g.lineTo(s, mid)
      g.stroke()
    }),
  )
}

/** Hoja ancha tropical (arbustos). */
export function leafTex(): THREE.Texture {
  return cachedAlpha('leaf', () =>
    alphaCanvas(256, (g, s) => {
      g.clearRect(0, 0, s, s)
      const grd = g.createLinearGradient(0, 0, s, s)
      grd.addColorStop(0, '#2f7d2a')
      grd.addColorStop(1, '#5fb340')
      g.fillStyle = grd
      g.beginPath()
      g.moveTo(s * 0.5, s * 0.02)
      g.bezierCurveTo(s * 0.98, s * 0.25, s * 0.85, s * 0.8, s * 0.5, s * 0.98)
      g.bezierCurveTo(s * 0.15, s * 0.8, s * 0.02, s * 0.25, s * 0.5, s * 0.02)
      g.fill()
      g.strokeStyle = 'rgba(220,240,160,0.6)'
      g.lineWidth = 3
      g.beginPath()
      g.moveTo(s * 0.5, s * 0.05)
      g.lineTo(s * 0.5, s * 0.95)
      g.stroke()
      g.lineWidth = 1.5
      for (let i = 1; i < 8; i++) {
        const y = s * (0.1 + i * 0.1)
        g.beginPath()
        g.moveTo(s * 0.5, y)
        g.lineTo(s * 0.22, y - s * 0.08)
        g.moveTo(s * 0.5, y)
        g.lineTo(s * 0.78, y - s * 0.08)
        g.stroke()
      }
    }),
  )
}

/** Nube suave para sprites. */
export function cloudTex(): THREE.Texture {
  return cachedAlpha('cloud', () =>
    alphaCanvas(256, (g, s) => {
      g.clearRect(0, 0, s, s)
      for (let i = 0; i < 26; i++) {
        const x = s * (0.18 + Math.random() * 0.64)
        const y = s * (0.38 + Math.random() * 0.22) - Math.sin(((x / s - 0.18) / 0.64) * Math.PI) * s * 0.12
        const r = s * (0.08 + Math.random() * 0.12)
        const grd = g.createRadialGradient(x, y - r * 0.3, 0, x, y, r)
        grd.addColorStop(0, 'rgba(255,255,255,0.95)')
        grd.addColorStop(0.6, 'rgba(250,250,255,0.6)')
        grd.addColorStop(1, 'rgba(235,240,250,0)')
        g.fillStyle = grd
        g.beginPath()
        g.arc(x, y, r, 0, Math.PI * 2)
        g.fill()
      }
    }),
  )
}

/** Paja para techos de chozas. */
export function thatchTex(): Built {
  return cached('thatch', () =>
    build(
      256,
      (u, v) => {
        const straw = noise(u * 120, v * 6, 120, 6) * 0.7 + fbm(u, v, 8, 3) * 0.3
        const band = (v * 6) % 1 < 0.12 ? 0.75 : 1
        const s = (0.7 + straw * 0.4) * band
        return [214 * s, 178 * s, 104 * s, straw * band]
      },
      4,
    ),
  )
}

/** Pintura sobre madera para los símbolos de las cajas. */
export function crateTex(kind: 'box' | 'question' | 'arrow' | 'iron' | 'chispa'): Built {
  return cached(`crate-${kind}`, () => {
    const base = kind === 'iron' ? metalTex() : kind === 'chispa' ? plankTex([60, 170, 160]) : plankTex([200, 142, 78])
    const size = 256
    const c = document.createElement('canvas')
    c.width = c.height = size
    const g = c.getContext('2d')!
    g.drawImage(base.map.image as HTMLCanvasElement, 0, 0, size, size)
    if (kind !== 'iron') {
      // Marco de la caja
      g.strokeStyle = kind === 'chispa' ? '#0d5e58' : '#6b3e17'
      g.lineWidth = size * 0.1
      g.strokeRect(size * 0.05, size * 0.05, size * 0.9, size * 0.9)
    }
    g.fillStyle = kind === 'chispa' ? '#e8fff9' : '#ffe2a0'
    g.strokeStyle = 'rgba(60,30,10,0.6)'
    g.lineWidth = 6
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    if (kind === 'box') {
      g.strokeStyle = '#6b3e17'
      g.lineWidth = size * 0.07
      g.beginPath()
      g.moveTo(size * 0.12, size * 0.12)
      g.lineTo(size * 0.88, size * 0.88)
      g.moveTo(size * 0.88, size * 0.12)
      g.lineTo(size * 0.12, size * 0.88)
      g.stroke()
    } else if (kind === 'question') {
      g.font = `bold ${size * 0.6}px sans-serif`
      g.strokeText('?', size / 2, size * 0.54)
      g.fillText('?', size / 2, size * 0.54)
    } else if (kind === 'arrow') {
      g.beginPath()
      g.moveTo(size * 0.5, size * 0.18)
      g.lineTo(size * 0.8, size * 0.52)
      g.lineTo(size * 0.6, size * 0.52)
      g.lineTo(size * 0.6, size * 0.82)
      g.lineTo(size * 0.4, size * 0.82)
      g.lineTo(size * 0.4, size * 0.52)
      g.lineTo(size * 0.2, size * 0.52)
      g.closePath()
      g.stroke()
      g.fill()
    } else if (kind === 'chispa') {
      g.shadowColor = '#7ffff0'
      g.shadowBlur = 20
      g.beginPath()
      g.arc(size * 0.5, size * 0.56, size * 0.13, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = '#9fe89a'
      g.beginPath()
      g.ellipse(size * 0.34, size * 0.4, size * 0.14, size * 0.07, -0.6, 0, Math.PI * 2)
      g.ellipse(size * 0.66, size * 0.4, size * 0.14, size * 0.07, 0.6, 0, Math.PI * 2)
      g.fill()
    }
    const map = new THREE.CanvasTexture(c)
    map.colorSpace = THREE.SRGBColorSpace
    map.anisotropy = 8
    const normalMap = base.normalMap.clone()
    normalMap.wrapS = normalMap.wrapT = THREE.ClampToEdgeWrapping
    normalMap.needsUpdate = true
    return { map, normalMap }
  })
}

/** Barril de pólvora: duelas de madera pintadas de rojo. */
export function barrelTex(): Built {
  return cached('barrel', () => {
    const wood = build(
      256,
      (u, v) => {
        const stave = (u * 12) % 1
        const grain = fbm(u, v, 12, 3, 3)
        const gap = stave < 0.05
        const s = gap ? 0.4 : 0.8 + grain * 0.3
        return [200 * s, 52 * s, 38 * s, gap ? 0 : 0.7 + grain * 0.3]
      },
      3,
    )
    const c = wood.map.image as HTMLCanvasElement
    const g = c.getContext('2d')!
    g.fillStyle = '#ffd23f'
    g.strokeStyle = '#3b2a22'
    g.lineWidth = 5
    g.font = 'bold 80px sans-serif'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    for (const x of [64, 192]) {
      g.strokeText('!!', x, 128)
      g.fillText('!!', x, 128)
    }
    wood.map.needsUpdate = true
    return wood
  })
}
