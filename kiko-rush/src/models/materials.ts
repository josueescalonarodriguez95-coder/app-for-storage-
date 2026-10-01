import * as THREE from 'three'

// Materiales físicos (PBR): reaccionan al sol, a las sombras y al reflejo del cielo.

export interface PaintOptions {
  roughness?: number
  metalness?: number
  emissive?: THREE.ColorRepresentation
  emissiveIntensity?: number
  map?: THREE.Texture
  normalMap?: THREE.Texture
  normalScale?: number
  repeat?: [number, number]
  side?: THREE.Side
  alphaTest?: number
  clearcoat?: number
  key?: string
}

const cache = new Map<string, THREE.Material>()

function applyRepeat(t: THREE.Texture | undefined, repeat: [number, number] | undefined): THREE.Texture | null {
  if (!t) return null
  if (!repeat) return t
  const c = t.clone()
  c.repeat.set(repeat[0], repeat[1])
  c.needsUpdate = true
  return c
}

/** Material estándar compartido (se reutiliza por color + opciones). */
export function paint(color: THREE.ColorRepresentation, o: PaintOptions = {}): THREE.MeshStandardMaterial {
  const key =
    o.key ??
    [new THREE.Color(color).getHexString(), o.roughness, o.metalness, o.emissive, o.emissiveIntensity, o.map?.uuid, o.normalMap?.uuid, o.normalScale, o.repeat?.join('x'), o.side, o.alphaTest, o.clearcoat].join('|')
  let m = cache.get(key) as THREE.MeshStandardMaterial | undefined
  if (!m) {
    m = make(color, o)
    cache.set(key, m)
  }
  return m
}

function make(color: THREE.ColorRepresentation, o: PaintOptions): THREE.MeshStandardMaterial {
  const params: THREE.MeshPhysicalMaterialParameters = {
    color,
    roughness: o.roughness ?? 0.7,
    metalness: o.metalness ?? 0,
    map: applyRepeat(o.map, o.repeat),
    normalMap: applyRepeat(o.normalMap, o.repeat),
    side: o.side ?? THREE.FrontSide,
    alphaTest: o.alphaTest ?? 0,
  }
  if (o.normalScale !== undefined) params.normalScale = new THREE.Vector2(o.normalScale, o.normalScale)
  const m = o.clearcoat ? new THREE.MeshPhysicalMaterial({ ...params, clearcoat: o.clearcoat, clearcoatRoughness: 0.15 }) : new THREE.MeshStandardMaterial(params)
  if (o.emissive !== undefined) {
    m.emissive = new THREE.Color(o.emissive)
    m.emissiveIntensity = o.emissiveIntensity ?? 1
  }
  return m
}

/** Material propio (no compartido) para lo que cambia de color, como Kiko al quemarse. */
export function paintUnique(color: THREE.ColorRepresentation, o: PaintOptions = {}): THREE.MeshStandardMaterial {
  return make(color, o)
}

/** Sin iluminación: luces, fuego, ojos que brillan. */
export function glow(color: THREE.ColorRepresentation, opacity = 1): THREE.MeshBasicMaterial {
  const key = `glow|${new THREE.Color(color).getHexString()}|${opacity}`
  let m = cache.get(key) as THREE.MeshBasicMaterial | undefined
  if (!m) {
    m = new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1, toneMapped: false })
    cache.set(key, m)
  }
  return m
}

// ---------- Brillos y sombras de contacto ----------

const texCache = new Map<string, THREE.Texture>()
function radial(key: string, stops: [number, string][]): THREE.Texture {
  let t = texCache.get(key)
  if (t) return t
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  for (const [o, col] of stops) grd.addColorStop(o, col)
  g.fillStyle = grd
  g.fillRect(0, 0, 128, 128)
  t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  texCache.set(key, t)
  return t
}

export function glowTexture(): THREE.Texture {
  return radial('glow', [
    [0, 'rgba(255,255,255,1)'],
    [0.25, 'rgba(255,255,255,0.55)'],
    [1, 'rgba(255,255,255,0)'],
  ])
}

export function glowSprite(color: THREE.ColorRepresentation, size: number): THREE.Sprite {
  const m = new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })
  const s = new THREE.Sprite(m)
  s.scale.setScalar(size)
  return s
}

let blobGeo: THREE.PlaneGeometry | null = null
let blobMat: THREE.MeshBasicMaterial | null = null
/** Sombra de contacto suave bajo cada objeto (complementa las sombras reales). */
export function blobShadow(size: number): THREE.Mesh {
  blobGeo ??= new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)
  blobMat ??= new THREE.MeshBasicMaterial({
    map: radial('blob', [
      [0, 'rgba(40,25,10,0.5)'],
      [0.5, 'rgba(40,25,10,0.25)'],
      [1, 'rgba(40,25,10,0)'],
    ]),
    transparent: true,
    depthWrite: false,
  })
  const m = new THREE.Mesh(blobGeo, blobMat)
  m.scale.set(size, 1, size)
  m.position.y = 0.02
  m.renderOrder = 1
  m.name = 'blob'
  return m
}

/** Marca un objeto y sus hijos para proyectar (y recibir) sombras reales. */
export function shadows(obj: THREE.Object3D, cast = true, receive = false): THREE.Object3D {
  obj.traverse((o) => {
    if ((o as THREE.Mesh).isMesh && o.name !== 'blob') {
      o.castShadow = cast
      o.receiveShadow = receive
    }
  })
  return obj
}
