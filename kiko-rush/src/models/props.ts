import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { ItemType } from '../level/types.ts'
import { blobShadow, glow, glowSprite, paint, shadows } from './materials.ts'
import { barkTex, barrelTex, coconutTex, crateTex, frondTex, guavaTex, metalTex, palmTrunkTex, shellTex } from './textures.ts'

// Obstáculos, enemigos, cajas y recogibles. Cada modelo tiene su origen en el piso (y = 0)
// y mira hacia -z (hacia Kiko cuando corre en +z).

const sphere = new THREE.SphereGeometry(1, 28, 20)
const lowSphere = new THREE.SphereGeometry(1, 14, 10)
const cyl = new THREE.CylinderGeometry(1, 1, 1, 24)
const cone = new THREE.ConeGeometry(1, 1, 16)

function m(geo: THREE.BufferGeometry, mat: THREE.Material | THREE.Material[], s: [number, number, number], p: [number, number, number] = [0, 0, 0]): THREE.Mesh {
  const mesh = new THREE.Mesh(geo, mat)
  mesh.scale.set(...s)
  mesh.position.set(...p)
  return mesh
}

export const CRATE_SIZE = 0.9
const crateGeo = new RoundedBoxGeometry(1, 1, 1, 3, 0.06)

function crate(kind: 'box' | 'question' | 'arrow' | 'iron' | 'chispa'): THREE.Group {
  const g = new THREE.Group()
  const t = crateTex(kind)
  const mat = paint(0xffffff, {
    map: t.map,
    normalMap: t.normalMap,
    roughness: kind === 'iron' ? 0.4 : 0.75,
    metalness: kind === 'iron' ? 0.45 : 0,
    emissive: kind === 'chispa' ? 0x0d5e58 : undefined,
    emissiveIntensity: 0.35,
    key: `crate-${kind}`,
  })
  const c = m(crateGeo, mat, [CRATE_SIZE, CRATE_SIZE, CRATE_SIZE], [0, CRATE_SIZE / 2, 0])
  c.name = 'body'
  g.add(c)
  if (kind === 'chispa') {
    const s = glowSprite(0x6ff7e8, 1.6)
    s.position.y = 0.45
    g.add(s)
  }
  shadows(g)
  g.add(blobShadow(1.3))
  return g
}

/** Ramita con hojas pequeñas. */
function twig(len: number): THREE.Group {
  const g = new THREE.Group()
  const bark = barkTex()
  g.add(m(cyl, paint(0x8a6a48, { map: bark.map, normalMap: bark.normalMap }), [0.05, len, 0.05], [0, len / 2, 0]))
  const leaf = paint(0x5aa83a, { roughness: 0.6, side: THREE.DoubleSide })
  for (let i = 0; i < 3; i++) {
    const l = m(lowSphere, leaf, [0.14, 0.02, 0.07], [0.05 * (i - 1), len * (0.6 + i * 0.15), 0.06])
    l.rotation.set(0.3, i, 0.5)
    g.add(l)
  }
  return g
}

function log(): THREE.Group {
  const g = new THREE.Group()
  const bark = barkTex()
  const barkMat = paint(0xffffff, { map: bark.map, normalMap: bark.normalMap, roughness: 0.95, repeat: [2, 1] })
  // Tronco ligeramente irregular
  const geo = new THREE.CylinderGeometry(0.36, 0.38, 2.0, 28, 6, true)
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const z = pos.getZ(i)
    const y = pos.getY(i)
    const k = 1 + Math.sin(y * 5 + Math.atan2(z, x) * 3) * 0.04
    pos.setX(i, x * k)
    pos.setZ(i, z * k)
  }
  geo.computeVertexNormals()
  const t = m(geo, barkMat, [1, 1, 1], [0, 0.37, 0])
  t.rotation.z = Math.PI / 2
  g.add(t)
  // Cortes con anillos
  const ringTex = (() => {
    const c = document.createElement('canvas')
    c.width = c.height = 128
    const cg = c.getContext('2d')!
    cg.fillStyle = '#d9b07a'
    cg.fillRect(0, 0, 128, 128)
    for (let r = 6; r < 64; r += 6 + Math.random() * 3) {
      cg.strokeStyle = `rgba(140,90,45,${0.3 + Math.random() * 0.3})`
      cg.lineWidth = 1.5
      cg.beginPath()
      cg.arc(64 + Math.random() * 2, 64, r, 0, Math.PI * 2)
      cg.stroke()
    }
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  })()
  for (const sx of [-1, 1]) {
    const cap = m(new THREE.CircleGeometry(0.37, 28), paint(0xffffff, { map: ringTex, roughness: 0.85, key: 'logcap' }), [1, 1, 1], [sx * 1.0, 0.37, 0])
    cap.rotation.y = (sx * Math.PI) / 2
    g.add(cap)
  }
  // Musgo y ramita
  g.add(m(lowSphere, paint(0x5e8f3a, { roughness: 1 }), [0.45, 0.1, 0.3], [-0.3, 0.68, 0.05]))
  const tw = twig(0.45)
  tw.position.set(0.45, 0.65, 0)
  tw.rotation.z = -0.5
  g.add(tw)
  shadows(g)
  g.add(blobShadow(2.4))
  return g
}

/** Fronda de palmera: tira curva con la textura de hoja. */
export function frond(len = 2.2, width = 0.9, droop = 0.9): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(len, width, 12, 2)
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + len / 2 // 0..len
    const t = x / len
    pos.setX(i, x)
    pos.setZ(i, -t * t * droop * len * 0.6) // se cae hacia la punta
    pos.setY(i, pos.getY(i) * (1 - t * 0.3))
  }
  geo.rotateX(-Math.PI / 2)
  geo.computeVertexNormals()
  const mat = paint(0xffffff, { map: frondTex(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.6, key: 'frond' })
  return new THREE.Mesh(geo, mat)
}

function palm(): THREE.Group {
  // Palmera caída de lado: el tronco cruza el carril a la altura del pecho.
  const g = new THREE.Group()
  const tex = palmTrunkTex()
  const trunkMat = paint(0xffffff, { map: tex.map, normalMap: tex.normalMap, roughness: 0.9, repeat: [1, 3] })
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(-1.5, 0.5, 0), new THREE.Vector3(-1.0, 1.2, 0), new THREE.Vector3(0.2, 1.32, 0), new THREE.Vector3(1.3, 1.28, 0)])
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.24, 14, false), trunkMat))
  g.add(m(lowSphere, paint(0x6b4a2a, { roughness: 1 }), [0.45, 0.3, 0.45], [-1.5, 0.35, 0]))
  for (let i = 0; i < 8; i++) {
    const f = frond(1.8, 0.75, 0.7)
    const a = (i / 8) * Math.PI * 2
    f.position.set(1.32, 1.3, 0)
    f.rotation.set(0, a, 0.25)
    g.add(f)
  }
  for (const [x, z] of [
    [1.25, 0.15],
    [1.35, -0.15],
    [1.2, 0],
  ])
    g.add(m(sphere, paint(0x5a3d1e, { roughness: 0.8 }), [0.14, 0.15, 0.14], [x, 1.06, z]))
  shadows(g)
  g.add(blobShadow(2.6))
  return g
}

function turtle(): THREE.Group {
  const g = new THREE.Group()
  const inner = new THREE.Group()
  inner.name = 'anim'
  g.add(inner)
  const st = shellTex()
  inner.add(m(new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), paint(0xffffff, { map: st.map, normalMap: st.normalMap, roughness: 0.45, clearcoat: 0.6, key: 'turtle-shell' }), [0.66, 0.62, 0.6], [0, 0.22, 0]))
  inner.add(m(cyl, paint(0xd9c27a, { roughness: 0.6 }), [0.67, 0.1, 0.61], [0, 0.22, 0]))
  const spike = paint(0xeee8d5, { roughness: 0.3 })
  for (let i = 0; i < 7; i++) {
    const a = (i / 6) * Math.PI * 2
    const r = i === 6 ? 0 : 0.36
    const s = m(cone, spike, [0.09, 0.36, 0.09], [Math.cos(a) * r, i === 6 ? 0.98 : 0.7, Math.sin(a) * r])
    s.rotation.set(Math.sin(a) * 0.45 * (r ? 1 : 0), 0, -Math.cos(a) * 0.45 * (r ? 1 : 0))
    inner.add(s)
  }
  const skin = paint(0x8fbf6a, { roughness: 0.7 })
  inner.add(m(sphere, skin, [0.2, 0.18, 0.25], [0, 0.28, -0.72]))
  for (const sx of [-1, 1]) {
    inner.add(m(sphere, paint(0x111111, { roughness: 0.1 }), [0.045, 0.055, 0.03], [sx * 0.1, 0.34, -0.9]))
    inner.add(m(sphere, skin, [0.15, 0.1, 0.15], [sx * 0.46, 0.1, -0.35]))
    inner.add(m(sphere, skin, [0.15, 0.1, 0.15], [sx * 0.46, 0.1, 0.35]))
  }
  shadows(g)
  g.add(blobShadow(1.8))
  return g
}

function magmo(): THREE.Group {
  // Mini-Magmo: robot hecho con una olla y tuercas (metal de verdad, refleja el cielo).
  const g = new THREE.Group()
  const inner = new THREE.Group()
  inner.name = 'anim'
  g.add(inner)
  const mt = metalTex()
  const pot = paint(0x9aa4ae, { roughness: 0.35, metalness: 0.55, normalMap: mt.normalMap, normalScale: 0.3 })
  const dark = paint(0x4c545e, { roughness: 0.45, metalness: 0.5 })
  inner.add(m(cyl, pot, [0.42, 0.6, 0.42], [0, 0.62, 0]))
  inner.add(m(new THREE.TorusGeometry(1, 0.08, 10, 32), dark, [0.43, 0.43, 0.43], [0, 0.92, 0]).rotateX(Math.PI / 2))
  inner.add(m(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), pot, [0.44, 0.16, 0.44], [0, 0.93, 0]))
  inner.add(m(sphere, paint(0xe07b2a, { roughness: 0.3 }), [0.08, 0.08, 0.08], [0, 1.12, 0]))
  // vapor que sale de la tapa
  const steam = glowSprite(0xffffff, 0.5)
  steam.position.y = 1.35
  steam.name = 'steam'
  ;(steam.material as THREE.SpriteMaterial).opacity = 0.35
  inner.add(steam)
  for (const sx of [-1, 1]) {
    const handle = m(new THREE.TorusGeometry(0.12, 0.03, 8, 16), dark, [1, 1, 1], [sx * 0.46, 0.75, 0])
    handle.rotation.y = Math.PI / 2
    inner.add(handle)
    inner.add(m(sphere, glow(0xffd23f), [0.085, 0.085, 0.05], [sx * 0.15, 0.7, -0.4]))
    const eg = glowSprite(0xffb020, 0.35)
    eg.position.set(sx * 0.15, 0.7, -0.45)
    inner.add(eg)
    inner.add(m(cyl, dark, [0.06, 0.35, 0.06], [sx * 0.18, 0.18, 0]))
    inner.add(m(new RoundedBoxGeometry(1, 1, 1, 2, 0.2), dark, [0.17, 0.08, 0.26], [sx * 0.18, 0.04, -0.05]))
    // remaches
    for (const y of [0.45, 0.8]) inner.add(m(lowSphere, dark, [0.025, 0.025, 0.025], [sx * 0.3, y, -0.3]))
  }
  // boca de tuerca hexagonal
  inner.add(m(new THREE.CylinderGeometry(1, 1, 1, 6), paint(0xc4ccd4, { roughness: 0.25, metalness: 0.9 }), [0.11, 0.05, 0.11], [0, 0.46, -0.42]).rotateX(Math.PI / 2))
  shadows(g)
  g.add(blobShadow(1.2))
  return g
}

function crab(): THREE.Group {
  const g = new THREE.Group()
  const inner = new THREE.Group()
  inner.name = 'anim'
  g.add(inner)
  const shell = paint(0xd8432c, { roughness: 0.35, clearcoat: 0.8 })
  const leg = paint(0xc23a26, { roughness: 0.5 })
  inner.add(m(sphere, shell, [0.55, 0.3, 0.42], [0, 0.35, 0]))
  // casco militar
  const helmet = paint(0x7d8a6a, { roughness: 0.45, metalness: 0.6 })
  inner.add(m(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), helmet, [0.46, 0.32, 0.41], [0, 0.5, 0]))
  inner.add(m(cyl, helmet, [0.5, 0.03, 0.45], [0, 0.5, 0]))
  inner.add(m(lowSphere, paint(0xd8e0e6, { metalness: 0.9, roughness: 0.2 }), [0.045, 0.045, 0.045], [0, 0.82, -0.12]))
  for (const sx of [-1, 1]) {
    inner.add(m(cyl, leg, [0.03, 0.2, 0.03], [sx * 0.15, 0.62, -0.32]))
    inner.add(m(sphere, paint(0xffffff, { roughness: 0.15 }), [0.07, 0.07, 0.07], [sx * 0.15, 0.74, -0.34]))
    inner.add(m(sphere, paint(0x111111, { roughness: 0.05 }), [0.035, 0.035, 0.035], [sx * 0.15, 0.75, -0.4]))
    const claw = new THREE.Group()
    claw.position.set(sx * 0.62, 0.45, -0.25)
    claw.name = sx < 0 ? 'clawL' : 'clawR'
    claw.add(m(sphere, shell, [0.21, 0.16, 0.15]))
    claw.add(m(sphere, shell, [0.1, 0.06, 0.13], [sx * 0.05, 0.12, -0.13]))
    claw.add(m(sphere, shell, [0.09, 0.05, 0.12], [sx * 0.05, -0.02, -0.14]))
    inner.add(claw)
    for (let i = 0; i < 3; i++) {
      const l = m(cyl, leg, [0.035, 0.38, 0.035], [sx * 0.46, 0.18, -0.12 + i * 0.16])
      l.rotation.z = sx * 0.9
      inner.add(l)
    }
  }
  shadows(g)
  g.add(blobShadow(1.5))
  return g
}

function barrel(): THREE.Group {
  const g = new THREE.Group()
  const inner = new THREE.Group()
  inner.name = 'anim'
  inner.position.y = 0.5
  g.add(inner)
  const t = barrelTex()
  const side = paint(0xffffff, { map: t.map, normalMap: t.normalMap, roughness: 0.6, key: 'barrel-side' })
  const lid = paint(0x6b4423, { roughness: 0.8 })
  // barril con panza
  const pts: THREE.Vector2[] = []
  for (let i = 0; i <= 10; i++) {
    const y = i / 10 - 0.5
    pts.push(new THREE.Vector2(0.38 + Math.cos(y * Math.PI) * 0.06, y * 0.95))
  }
  inner.add(new THREE.Mesh(new THREE.LatheGeometry(pts, 28), side))
  for (const y of [-0.475, 0.475]) inner.add(m(new THREE.CircleGeometry(0.39, 28), lid, [1, 1, 1], [0, y, 0]).rotateX(y > 0 ? -Math.PI / 2 : Math.PI / 2))
  const band = paint(0x3a3a3a, { roughness: 0.35, metalness: 0.9 })
  for (const y of [-0.36, 0.36]) inner.add(m(new THREE.TorusGeometry(0.42, 0.025, 8, 36), band, [1, 1, 1], [0, y, 0]).rotateX(Math.PI / 2))
  inner.add(m(cyl, paint(0x2a2a2a, { roughness: 0.9 }), [0.025, 0.22, 0.025], [0, 0.58, 0]))
  const spark = glowSprite(0xffb020, 0.5)
  spark.position.y = 0.7
  spark.name = 'spark'
  inner.add(spark)
  shadows(g)
  g.add(blobShadow(1.1))
  return g
}

function wave(): THREE.Group {
  // Carril mojado: arena brillante de 8 m y una ola de espuma que entra de lado.
  const g = new THREE.Group()
  const wet = new THREE.Mesh(
    new THREE.PlaneGeometry(2.1, 8).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x4aa6b8, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.55, depthWrite: false }),
  )
  wet.position.set(0, 0.03, 4)
  wet.name = 'wet'
  wet.receiveShadow = true
  g.add(wet)
  const foam = new THREE.Group()
  foam.name = 'foam'
  const foamMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, transparent: true, opacity: 0.9 })
  for (let i = 0; i < 9; i++) foam.add(m(lowSphere, foamMat, [0.3, 0.16, 0.6], [Math.sin(i) * 0.1, 0.1, 0.4 + i * 0.9]))
  g.add(foam)
  return g
}

function fruit(): THREE.Group {
  // Guayaba: verde amarillenta con mejillas rosadas y coronita.
  const g = new THREE.Group()
  const inner = new THREE.Group()
  inner.name = 'anim'
  g.add(inner)
  const t = guavaTex()
  const geo = new THREE.SphereGeometry(1, 20, 16)
  // forma de pera
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i)
    const k = 1 - Math.max(0, y) * 0.25
    pos.setX(i, pos.getX(i) * k)
    pos.setZ(i, pos.getZ(i) * k)
  }
  geo.computeVertexNormals()
  inner.add(m(geo, paint(0xffffff, { map: t.map, normalMap: t.normalMap, roughness: 0.3, clearcoat: 0.5, emissive: 0x1a2200, emissiveIntensity: 0.6, key: 'guava' }), [0.26, 0.3, 0.26]))
  inner.add(m(cone, paint(0x5a3d1e), [0.06, 0.1, 0.06], [0, 0.32, 0]))
  const leaf = m(lowSphere, paint(0x3f9e3a, { roughness: 0.4 }), [0.15, 0.025, 0.07], [0.1, 0.33, 0])
  leaf.rotation.z = 0.4
  inner.add(leaf)
  return g
}

function gem(): THREE.Group {
  const g = new THREE.Group()
  const inner = new THREE.Group()
  inner.name = 'anim'
  g.add(inner)
  inner.add(m(new THREE.OctahedronGeometry(1, 0), paint(0xc23cff, { roughness: 0.05, metalness: 0.4, emissive: 0x5a1080, emissiveIntensity: 0.8, clearcoat: 1 }), [0.3, 0.42, 0.3]))
  g.add(glowSprite(0xe28bff, 1.4))
  return g
}

function powerUp(kind: string): THREE.Group {
  const g = new THREE.Group()
  const inner = new THREE.Group()
  inner.name = 'anim'
  g.add(inner)
  const bubble = new THREE.Mesh(sphere, new THREE.MeshPhysicalMaterial({ color: 0xdff8ff, roughness: 0, metalness: 0, transparent: true, opacity: 0.22, clearcoat: 1, depthWrite: false }))
  bubble.scale.setScalar(0.62)
  g.add(bubble)
  g.add(glowSprite(0x9ff0ff, 1.6))
  const metal = paint(0xdfe6ea, { roughness: 0.2, metalness: 0.9 })
  if (kind === 'pu_magnet') {
    const u = m(new THREE.TorusGeometry(0.22, 0.08, 12, 24, Math.PI), paint(0xe0342f, { roughness: 0.3, clearcoat: 1 }), [1, 1, 1])
    u.rotation.z = Math.PI
    inner.add(u)
    for (const sx of [-1, 1]) inner.add(m(new THREE.BoxGeometry(1, 1, 1), metal, [0.16, 0.12, 0.16], [sx * 0.22, 0.04, 0]))
  } else if (kind === 'pu_skate') {
    inner.add(m(new RoundedBoxGeometry(1, 1, 1, 2, 0.3), paint(0xa8c650, { roughness: 0.4 }), [0.7, 0.07, 0.25]))
    for (const sx of [-1, 1]) inner.add(m(cyl, paint(0x333333, { roughness: 0.6 }), [0.06, 0.26, 0.06], [sx * 0.24, -0.08, 0]).rotateX(Math.PI / 2))
  } else if (kind === 'pu_rocket') {
    inner.add(m(cyl, metal, [0.15, 0.45, 0.15]))
    inner.add(m(cone, paint(0xe0342f, { roughness: 0.3, clearcoat: 1 }), [0.15, 0.2, 0.15], [0, 0.32, 0]))
    inner.add(m(cone, glow(0xffa21f), [0.1, 0.2, 0.1], [0, -0.32, 0]).rotateX(Math.PI))
  } else {
    inner.add(m(sphere, paint(0xb5d94a, { roughness: 0.3 }), [0.2, 0.23, 0.2], [-0.14, 0, 0]))
    inner.add(m(sphere, paint(0xffd23f, { roughness: 0.3 }), [0.2, 0.23, 0.2], [0.14, 0, 0]))
  }
  return g
}

export function buildItem(type: ItemType): THREE.Group {
  switch (type) {
    case 'log':
      return log()
    case 'palm':
      return palm()
    case 'turtle':
      return turtle()
    case 'magmo':
      return magmo()
    case 'crab':
      return crab()
    case 'barrel':
      return barrel()
    case 'wave':
      return wave()
    case 'box':
    case 'question':
    case 'arrow':
    case 'iron':
    case 'chispa':
      return crate(type)
    case 'fruit':
      return fruit()
    case 'gem':
      return gem()
    default:
      return powerUp(type)
  }
}

// ---------- Cosas de la persecución y del jefe ----------

export function buildCoconut(): THREE.Group {
  const g = new THREE.Group()
  const ball = new THREE.Group()
  ball.name = 'ball'
  g.add(ball)
  const t = coconutTex()
  const geo = new THREE.IcosahedronGeometry(1, 5)
  const pos = geo.attributes.position
  const v = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    const k = 1 + Math.sin(v.x * 9) * Math.sin(v.y * 7) * 0.02 + (v.y > 0.6 ? (v.y - 0.6) * 0.15 : 0)
    pos.setXYZ(i, v.x * k, v.y * k, v.z * k)
  }
  geo.computeVertexNormals()
  ball.add(m(geo, paint(0xffffff, { map: t.map, normalMap: t.normalMap, roughness: 1, repeat: [3, 2], key: 'coconut' }), [1.5, 1.5, 1.5]))
  // tres "ojos" del coco
  for (const [x, y] of [
    [-0.5, 0.45],
    [0.5, 0.45],
    [0, -0.35],
  ])
    ball.add(m(sphere, paint(0x241509, { roughness: 0.9 }), [0.24, 0.24, 0.12], [x * 0.75, y * 0.75, 1.44]))
  shadows(ball)
  g.add(blobShadow(3.2))
  return g
}

export function buildAnchor(): THREE.Group {
  const g = new THREE.Group()
  const iron = paint(0x4a5561, { roughness: 0.55, metalness: 0.85 })
  g.add(m(cyl, iron, [0.14, 2.4, 0.14], [0, 1.4, 0]))
  g.add(m(cyl, iron, [0.1, 1.2, 0.1], [0, 2.3, 0]).rotateZ(Math.PI / 2))
  g.add(m(new THREE.TorusGeometry(0.22, 0.06, 10, 20), iron, [1, 1, 1], [0, 2.75, 0]))
  const hook = m(new THREE.TorusGeometry(0.75, 0.13, 10, 24, Math.PI), iron, [1, 1, 1], [0, 0.95, 0])
  hook.rotation.z = Math.PI
  g.add(hook)
  for (const sx of [-1, 1]) g.add(m(cone, iron, [0.2, 0.4, 0.2], [sx * 0.75, 1.05, 0]))
  shadows(g)
  return g
}

export function buildMarker(): THREE.Mesh {
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.7, 1.0, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff3b30, transparent: true, opacity: 0.8, depthWrite: false }))
  ring.position.y = 0.05
  return ring
}

export function buildLumi(): THREE.Group {
  const g = new THREE.Group()
  g.add(m(sphere, glow(0xfff4b0), [0.45, 0.45, 0.45]))
  g.add(glowSprite(0xffe066, 3.5))
  return g
}
