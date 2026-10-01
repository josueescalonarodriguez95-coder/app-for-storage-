import * as THREE from 'three'

// Materiales "toon" de 3 tonos: da el look de caricatura y es barato en celulares.

let gradient: THREE.DataTexture | null = null
function gradientMap(): THREE.DataTexture {
  if (gradient) return gradient
  const data = new Uint8Array([90, 90, 90, 255, 175, 175, 175, 255, 255, 255, 255, 255])
  gradient = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat)
  gradient.minFilter = THREE.NearestFilter
  gradient.magFilter = THREE.NearestFilter
  gradient.needsUpdate = true
  return gradient
}

const cache = new Map<string, THREE.Material>()

export function toon(color: THREE.ColorRepresentation, opts: { emissive?: THREE.ColorRepresentation; map?: THREE.Texture; key?: string } = {}): THREE.MeshToonMaterial {
  const key = opts.key ?? `${new THREE.Color(color).getHexString()}|${opts.emissive ?? ''}|${opts.map?.uuid ?? ''}`
  let m = cache.get(key) as THREE.MeshToonMaterial | undefined
  if (!m) {
    m = new THREE.MeshToonMaterial({ color, gradientMap: gradientMap(), map: opts.map ?? null })
    if (opts.emissive !== undefined) m.emissive = new THREE.Color(opts.emissive)
    cache.set(key, m)
  }
  return m
}

/** Material propio (no compartido) para lo que cambia de color, como Kiko al quemarse. */
export function toonUnique(color: THREE.ColorRepresentation): THREE.MeshToonMaterial {
  return new THREE.MeshToonMaterial({ color, gradientMap: gradientMap() })
}

export function glow(color: THREE.ColorRepresentation, opacity = 1): THREE.MeshBasicMaterial {
  const key = `glow|${new THREE.Color(color).getHexString()}|${opacity}`
  let m = cache.get(key) as THREE.MeshBasicMaterial | undefined
  if (!m) {
    m = new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 })
    cache.set(key, m)
  }
  return m
}

// ---------- Texturas dibujadas en canvas ----------

function canvasTexture(size: number, draw: (g: CanvasRenderingContext2D, s: number) => void): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')!
  draw(g, size)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

const texCache = new Map<string, THREE.Texture>()
function cachedTex(key: string, make: () => THREE.Texture): THREE.Texture {
  let t = texCache.get(key)
  if (!t) {
    t = make()
    texCache.set(key, t)
  }
  return t
}

function crateBase(g: CanvasRenderingContext2D, s: number, face: string, frame: string, plank: string): void {
  g.fillStyle = face
  g.fillRect(0, 0, s, s)
  g.strokeStyle = plank
  g.lineWidth = 3
  for (let y = s / 4; y < s; y += s / 4) {
    g.beginPath()
    g.moveTo(0, y)
    g.lineTo(s, y)
    g.stroke()
  }
  g.fillStyle = frame
  const b = s * 0.12
  g.fillRect(0, 0, s, b)
  g.fillRect(0, s - b, s, b)
  g.fillRect(0, 0, b, s)
  g.fillRect(s - b, 0, b, s)
}

export function crateTexture(kind: 'box' | 'question' | 'arrow' | 'iron' | 'chispa'): THREE.Texture {
  return cachedTex(`crate-${kind}`, () =>
    canvasTexture(128, (g, s) => {
      if (kind === 'iron') {
        g.fillStyle = '#8a97a3'
        g.fillRect(0, 0, s, s)
        g.fillStyle = '#5d6975'
        const b = s * 0.12
        g.fillRect(0, 0, s, b)
        g.fillRect(0, s - b, s, b)
        g.fillRect(0, 0, b, s)
        g.fillRect(s - b, 0, b, s)
        g.fillStyle = '#c9d2da'
        for (const [x, y] of [
          [0.2, 0.2],
          [0.8, 0.2],
          [0.2, 0.8],
          [0.8, 0.8],
        ]) {
          g.beginPath()
          g.arc(x * s, y * s, s * 0.05, 0, Math.PI * 2)
          g.fill()
        }
        return
      }
      if (kind === 'chispa') crateBase(g, s, '#1fb5a6', '#0b6f68', '#159a8e')
      else crateBase(g, s, '#c98a3f', '#7a4a1c', '#a86d2c')
      g.lineWidth = s * 0.07
      g.strokeStyle = kind === 'chispa' ? '#0b6f68' : '#7a4a1c'
      if (kind === 'box') {
        g.beginPath()
        g.moveTo(s * 0.12, s * 0.12)
        g.lineTo(s * 0.88, s * 0.88)
        g.moveTo(s * 0.88, s * 0.12)
        g.lineTo(s * 0.12, s * 0.88)
        g.stroke()
      }
      g.fillStyle = kind === 'chispa' ? '#e8fff9' : '#ffe9a8'
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      if (kind === 'question') {
        g.font = `bold ${s * 0.62}px sans-serif`
        g.fillText('?', s / 2, s * 0.54)
      }
      if (kind === 'arrow') {
        g.beginPath()
        g.moveTo(s * 0.5, s * 0.2)
        g.lineTo(s * 0.78, s * 0.52)
        g.lineTo(s * 0.6, s * 0.52)
        g.lineTo(s * 0.6, s * 0.8)
        g.lineTo(s * 0.4, s * 0.8)
        g.lineTo(s * 0.4, s * 0.52)
        g.lineTo(s * 0.22, s * 0.52)
        g.closePath()
        g.fill()
      }
      if (kind === 'chispa') {
        // luciérnaga estilizada
        g.beginPath()
        g.arc(s * 0.5, s * 0.55, s * 0.14, 0, Math.PI * 2)
        g.fill()
        g.fillStyle = '#8be08b'
        g.beginPath()
        g.ellipse(s * 0.33, s * 0.38, s * 0.14, s * 0.07, -0.6, 0, Math.PI * 2)
        g.ellipse(s * 0.67, s * 0.38, s * 0.14, s * 0.07, 0.6, 0, Math.PI * 2)
        g.fill()
      }
    }),
  )
}

export function barrelTexture(): THREE.Texture {
  return cachedTex('barrel', () =>
    canvasTexture(128, (g, s) => {
      g.fillStyle = '#d6402c'
      g.fillRect(0, 0, s, s)
      g.fillStyle = '#3b2a22'
      g.fillRect(0, s * 0.1, s, s * 0.1)
      g.fillRect(0, s * 0.8, s, s * 0.1)
      g.fillStyle = '#ffd23f'
      g.font = `bold ${s * 0.4}px sans-serif`
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      g.fillText('!!', s * 0.5, s * 0.5)
    }),
  )
}

export function sandTexture(): THREE.Texture {
  return cachedTex('sand', () => {
    const t = canvasTexture(256, (g, s) => {
      g.fillStyle = '#f3d49b'
      g.fillRect(0, 0, s, s)
      for (let i = 0; i < 900; i++) {
        g.fillStyle = Math.random() < 0.5 ? 'rgba(214,170,105,0.35)' : 'rgba(255,240,205,0.4)'
        g.fillRect(Math.random() * s, Math.random() * s, 2 + Math.random() * 3, 2 + Math.random() * 2)
      }
      // franjas suaves: dan sensación de velocidad
      g.fillStyle = 'rgba(214,170,105,0.22)'
      g.fillRect(0, 0, s, s * 0.08)
    })
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    return t
  })
}

export function blobTexture(): THREE.Texture {
  return cachedTex('blob', () =>
    canvasTexture(64, (g, s) => {
      const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
      grd.addColorStop(0, 'rgba(60,30,10,0.55)')
      grd.addColorStop(1, 'rgba(60,30,10,0)')
      g.fillStyle = grd
      g.fillRect(0, 0, s, s)
    }),
  )
}

export function glowTexture(): THREE.Texture {
  return cachedTex('glow', () =>
    canvasTexture(64, (g, s) => {
      const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
      grd.addColorStop(0, 'rgba(255,255,255,1)')
      grd.addColorStop(0.3, 'rgba(255,255,255,0.5)')
      grd.addColorStop(1, 'rgba(255,255,255,0)')
      g.fillStyle = grd
      g.fillRect(0, 0, s, s)
    }),
  )
}

export function glowSprite(color: THREE.ColorRepresentation, size: number): THREE.Sprite {
  const m = new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
  const s = new THREE.Sprite(m)
  s.scale.setScalar(size)
  return s
}

let blobGeo: THREE.PlaneGeometry | null = null
let blobMat: THREE.MeshBasicMaterial | null = null
/** Sombra redonda falsa: más barata que sombras reales y ayuda a leer los saltos. */
export function blobShadow(size: number): THREE.Mesh {
  blobGeo ??= new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)
  blobMat ??= new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false })
  const m = new THREE.Mesh(blobGeo, blobMat)
  m.scale.set(size, 1, size)
  m.position.y = 0.02
  m.renderOrder = 1
  return m
}
