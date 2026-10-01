import * as THREE from 'three'
import type { ItemType } from '../level/types.ts'
import { barrelTexture, blobShadow, crateTexture, glow, glowSprite, toon } from './materials.ts'

// Obstáculos, enemigos, cajas y recogibles. Cada modelo tiene su origen en el piso (y = 0)
// y mira hacia -z (hacia Kiko cuando corre en +z).

const sphere = new THREE.SphereGeometry(1, 14, 10)
const lowSphere = new THREE.SphereGeometry(1, 8, 6)
const cyl = new THREE.CylinderGeometry(1, 1, 1, 12)
const cone = new THREE.ConeGeometry(1, 1, 8)
const box = new THREE.BoxGeometry(1, 1, 1)

function m(geo: THREE.BufferGeometry, mat: THREE.Material | THREE.Material[], s: [number, number, number], p: [number, number, number] = [0, 0, 0]): THREE.Mesh {
  const mesh = new THREE.Mesh(geo, mat)
  mesh.scale.set(...s)
  mesh.position.set(...p)
  return mesh
}

export const CRATE_SIZE = 0.9

function crate(kind: 'box' | 'question' | 'arrow' | 'iron' | 'chispa'): THREE.Group {
  const g = new THREE.Group()
  const mat = toon(0xffffff, { map: crateTexture(kind), key: `crate-${kind}` })
  const c = m(box, mat, [CRATE_SIZE, CRATE_SIZE, CRATE_SIZE], [0, CRATE_SIZE / 2, 0])
  c.name = 'body'
  g.add(c)
  g.add(blobShadow(1.3))
  return g
}

function log(): THREE.Group {
  const g = new THREE.Group()
  const bark = toon(0x7a4a22)
  const t = m(cyl, bark, [0.36, 2.0, 0.36], [0, 0.36, 0])
  t.rotation.z = Math.PI / 2
  g.add(t)
  for (const sx of [-1, 1]) {
    const cap = m(cyl, toon(0xe0b27a), [0.3, 0.03, 0.3], [sx * 1.0, 0.36, 0])
    cap.rotation.z = Math.PI / 2
    g.add(cap)
  }
  // una ramita con hojas, para que se lea como tronco de playa
  g.add(m(lowSphere, toon(0x4fae3b), [0.25, 0.1, 0.18], [0.5, 0.75, 0]))
  g.add(blobShadow(2.4))
  return g
}

function palm(): THREE.Group {
  // Palmera caída de lado: el tronco cruza el carril a la altura del pecho.
  const g = new THREE.Group()
  const trunk = toon(0x9b6b3a)
  const t = m(cyl, trunk, [0.26, 2.6, 0.26], [0.2, 1.3, 0])
  t.rotation.z = Math.PI / 2 - 0.08
  g.add(t)
  for (let i = 0; i < 6; i++) {
    const ring = m(cyl, toon(0x7c5129), [0.28, 0.06, 0.28], [-0.9 + i * 0.4, 1.3 + (i - 3) * 0.02, 0])
    ring.rotation.z = Math.PI / 2
    g.add(ring)
  }
  const leaf = toon(0x2f9e44)
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    const l = m(sphere, leaf, [0.9, 0.06, 0.25], [1.5 + Math.cos(a) * 0.5, 1.45 + Math.sin(a) * 0.35, Math.sin(a) * 0.4])
    l.rotation.set(Math.sin(a) * 0.6, a, Math.cos(a) * 0.5 - 0.3)
    g.add(l)
  }
  for (const [x, z] of [
    [1.2, 0.15],
    [1.3, -0.15],
  ])
    g.add(m(sphere, toon(0x6b4423), [0.15, 0.15, 0.15], [x, 1.05, z]))
  // raíz del otro lado
  g.add(m(sphere, toon(0x7c5129), [0.4, 0.3, 0.4], [-1.25, 1.1, 0]))
  g.add(blobShadow(2.6))
  return g
}

function turtle(): THREE.Group {
  const g = new THREE.Group()
  const inner = new THREE.Group()
  inner.name = 'anim'
  g.add(inner)
  inner.add(m(sphere, toon(0x3f8f3a), [0.65, 0.45, 0.6], [0, 0.3, 0]))
  inner.add(m(cyl, toon(0xd9c27a), [0.66, 0.08, 0.61], [0, 0.3, 0]))
  const spike = toon(0xf1f1e6)
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2
    const r = i === 6 ? 0 : 0.35
    const s = m(cone, spike, [0.1, 0.35, 0.1], [Math.cos(a) * r, i === 6 ? 0.9 : 0.7, Math.sin(a) * r])
    s.rotation.set(Math.sin(a) * 0.4 * (r ? 1 : 0), 0, -Math.cos(a) * 0.4 * (r ? 1 : 0))
    inner.add(s)
  }
  const skin = toon(0x8fc46a)
  inner.add(m(sphere, skin, [0.2, 0.18, 0.24], [0, 0.3, -0.7]))
  for (const sx of [-1, 1]) {
    inner.add(m(sphere, toon(0x111111), [0.04, 0.05, 0.03], [sx * 0.09, 0.36, -0.9]))
    inner.add(m(sphere, skin, [0.14, 0.1, 0.14], [sx * 0.45, 0.1, -0.35]))
    inner.add(m(sphere, skin, [0.14, 0.1, 0.14], [sx * 0.45, 0.1, 0.35]))
  }
  g.add(blobShadow(1.8))
  return g
}

function magmo(): THREE.Group {
  // Mini-Magmo: robot hecho con una olla y tuercas.
  const g = new THREE.Group()
  const inner = new THREE.Group()
  inner.name = 'anim'
  g.add(inner)
  const pot = toon(0x5b6470)
  inner.add(m(cyl, pot, [0.42, 0.6, 0.42], [0, 0.6, 0]))
  inner.add(m(cyl, toon(0x3c434c), [0.47, 0.07, 0.47], [0, 0.9, 0]))
  inner.add(m(sphere, pot, [0.44, 0.16, 0.44], [0, 0.95, 0]))
  inner.add(m(sphere, toon(0xe07b2a), [0.08, 0.08, 0.08], [0, 1.12, 0]))
  // asas de la olla = orejas
  for (const sx of [-1, 1]) {
    const handle = m(new THREE.TorusGeometry(0.12, 0.03, 6, 12), toon(0x3c434c), [1, 1, 1], [sx * 0.46, 0.75, 0])
    handle.rotation.y = Math.PI / 2
    inner.add(handle)
    inner.add(m(sphere, glow(0xffd23f), [0.09, 0.09, 0.05], [sx * 0.15, 0.68, -0.4]))
    inner.add(m(cyl, toon(0x2a2f36), [0.06, 0.35, 0.06], [sx * 0.18, 0.18, 0]))
    inner.add(m(box, toon(0x2a2f36), [0.16, 0.08, 0.24], [sx * 0.18, 0.04, -0.05]))
  }
  // boca de tuerca
  inner.add(m(cyl, toon(0xb7c0c8), [0.1, 0.05, 0.1], [0, 0.45, -0.42]).rotateX(Math.PI / 2))
  g.add(blobShadow(1.2))
  return g
}

function crab(): THREE.Group {
  const g = new THREE.Group()
  const inner = new THREE.Group()
  inner.name = 'anim'
  g.add(inner)
  const shell = toon(0xe0452f)
  inner.add(m(sphere, shell, [0.55, 0.3, 0.42], [0, 0.35, 0]))
  // casco
  inner.add(m(new THREE.SphereGeometry(1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon(0x9aa5b1), [0.45, 0.3, 0.4], [0, 0.5, 0]))
  inner.add(m(sphere, toon(0xd8e0e6), [0.05, 0.05, 0.05], [0, 0.82, -0.1]))
  for (const sx of [-1, 1]) {
    inner.add(m(cyl, shell, [0.03, 0.2, 0.03], [sx * 0.15, 0.62, -0.32]))
    inner.add(m(sphere, toon(0xffffff), [0.07, 0.07, 0.07], [sx * 0.15, 0.74, -0.34]))
    inner.add(m(sphere, toon(0x111111), [0.035, 0.035, 0.035], [sx * 0.15, 0.75, -0.4]))
    const claw = new THREE.Group()
    claw.position.set(sx * 0.62, 0.45, -0.25)
    claw.name = sx < 0 ? 'clawL' : 'clawR'
    claw.add(m(sphere, shell, [0.2, 0.16, 0.14]))
    claw.add(m(sphere, shell, [0.1, 0.06, 0.12], [sx * 0.05, 0.12, -0.12]))
    inner.add(claw)
    for (let i = 0; i < 3; i++) {
      const leg = m(cyl, shell, [0.035, 0.35, 0.035], [sx * 0.45, 0.18, -0.1 + i * 0.15])
      leg.rotation.z = sx * 0.9
      inner.add(leg)
    }
  }
  g.add(blobShadow(1.5))
  return g
}

function barrel(): THREE.Group {
  const g = new THREE.Group()
  const inner = new THREE.Group()
  inner.name = 'anim'
  inner.position.y = 0.5
  g.add(inner)
  const side = toon(0xffffff, { map: barrelTexture(), key: 'barrel-side' })
  const lid = toon(0x3b2a22)
  inner.add(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.95, 14), [side, lid, lid]))
  inner.add(m(cyl, lid, [0.03, 0.2, 0.03], [0, 0.55, 0]))
  const spark = glowSprite(0xffb020, 0.5)
  spark.position.y = 0.68
  spark.name = 'spark'
  inner.add(spark)
  g.add(blobShadow(1.1))
  return g
}

function wave(): THREE.Group {
  // Carril mojado: arena oscura de 8 m y una ola de espuma que entra de lado.
  const g = new THREE.Group()
  const wet = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 8).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x5bb8c9, transparent: true, opacity: 0.55, depthWrite: false }))
  wet.position.set(0, 0.03, 4)
  wet.name = 'wet'
  g.add(wet)
  const foam = new THREE.Group()
  foam.name = 'foam'
  for (let i = 0; i < 6; i++) foam.add(m(sphere, glow(0xffffff), [0.35, 0.18, 0.7], [0, 0.1, 0.7 + i * 1.3]))
  g.add(foam)
  return g
}

function fruit(): THREE.Group {
  // Guayaba: verde amarillenta con coronita.
  const g = new THREE.Group()
  const inner = new THREE.Group()
  inner.name = 'anim'
  g.add(inner)
  inner.add(m(sphere, toon(0xb5d94a, { emissive: 0x2a3300 }), [0.26, 0.3, 0.26]))
  inner.add(m(sphere, toon(0xff7a93), [0.12, 0.12, 0.05], [0.1, 0.02, 0.22]))
  inner.add(m(cone, toon(0x6b4423), [0.07, 0.1, 0.07], [0, 0.32, 0]))
  inner.add(m(sphere, toon(0x3f9e3a), [0.14, 0.03, 0.07], [0.1, 0.33, 0]).rotateZ(0.4))
  return g
}

function gem(): THREE.Group {
  const g = new THREE.Group()
  const inner = new THREE.Group()
  inner.name = 'anim'
  g.add(inner)
  inner.add(m(new THREE.OctahedronGeometry(1, 0), toon(0xd14bff, { emissive: 0x4a0f66 }), [0.3, 0.42, 0.3]))
  const s = glowSprite(0xe28bff, 1.4)
  g.add(s)
  return g
}

function powerUp(kind: string): THREE.Group {
  const g = new THREE.Group()
  const inner = new THREE.Group()
  inner.name = 'anim'
  g.add(inner)
  const bubble = new THREE.Mesh(sphere, new THREE.MeshBasicMaterial({ color: 0xbff4ff, transparent: true, opacity: 0.25, depthWrite: false }))
  bubble.scale.setScalar(0.62)
  g.add(bubble)
  g.add(glowSprite(0x9ff0ff, 1.8))
  if (kind === 'pu_magnet') {
    const u = m(new THREE.TorusGeometry(0.22, 0.08, 8, 16, Math.PI), toon(0xe0342f), [1, 1, 1])
    u.rotation.z = Math.PI
    inner.add(u)
    for (const sx of [-1, 1]) inner.add(m(box, toon(0xdfe6ea), [0.16, 0.12, 0.16], [sx * 0.22, 0.04, 0]))
  } else if (kind === 'pu_skate') {
    inner.add(m(box, toon(0x9fc24b), [0.7, 0.06, 0.24]))
    for (const sx of [-1, 1]) inner.add(m(cyl, toon(0x333333), [0.06, 0.26, 0.06], [sx * 0.24, -0.08, 0]).rotateX(Math.PI / 2))
  } else if (kind === 'pu_rocket') {
    inner.add(m(cyl, toon(0xdfe6ea), [0.15, 0.45, 0.15]))
    inner.add(m(cone, toon(0xe0342f), [0.15, 0.2, 0.15], [0, 0.32, 0]))
    inner.add(m(cone, glow(0xffa21f), [0.1, 0.2, 0.1], [0, -0.32, 0]).rotateX(Math.PI))
  } else {
    // x2: dos guayabas
    inner.add(m(sphere, toon(0xb5d94a), [0.2, 0.23, 0.2], [-0.14, 0, 0]))
    inner.add(m(sphere, toon(0xffd23f), [0.2, 0.23, 0.2], [0.14, 0, 0]))
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
  ball.add(m(new THREE.IcosahedronGeometry(1, 2), toon(0x6b4423), [3, 3, 3]))
  for (let i = 0; i < 40; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(3)
    const f = m(box, toon(0x8a5a2e), [0.1, 0.1, 0.9], [v.x, v.y, v.z])
    f.lookAt(0, 0, 0)
    ball.add(f)
  }
  for (const [x, y] of [
    [-0.8, 0.6],
    [0.8, 0.6],
    [0, -0.5],
  ])
    ball.add(m(sphere, toon(0x2a1a0c), [0.45, 0.45, 0.2], [x, y, 2.9]))
  g.add(blobShadow(6))
  return g
}

export function buildAnchor(): THREE.Group {
  const g = new THREE.Group()
  const iron = toon(0x4a5561)
  g.add(m(cyl, iron, [0.14, 2.4, 0.14], [0, 1.4, 0]))
  g.add(m(cyl, iron, [0.1, 1.2, 0.1], [0, 2.3, 0]).rotateZ(Math.PI / 2))
  g.add(m(new THREE.TorusGeometry(0.22, 0.06, 6, 12), iron, [1, 1, 1], [0, 2.75, 0]))
  const hook = m(new THREE.TorusGeometry(0.75, 0.13, 6, 16, Math.PI), iron, [1, 1, 1], [0, 0.95, 0])
  hook.rotation.z = Math.PI
  g.add(hook)
  for (const sx of [-1, 1]) g.add(m(cone, iron, [0.2, 0.4, 0.2], [sx * 0.75, 1.05, 0]))
  return g
}

export function buildMarker(): THREE.Mesh {
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.7, 1.0, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff3b30, transparent: true, opacity: 0.8, depthWrite: false }))
  ring.position.y = 0.05
  return ring
}

export function buildLumi(): THREE.Group {
  const g = new THREE.Group()
  g.add(m(sphere, glow(0xfff4b0), [0.45, 0.45, 0.45]))
  g.add(glowSprite(0xffe066, 3.5))
  return g
}
