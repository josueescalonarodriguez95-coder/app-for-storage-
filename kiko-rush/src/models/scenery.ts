import * as THREE from 'three'
import { glow, sandTexture, toon } from './materials.ts'

// Ambiente de Playa Guayaba: cielo, mar, palmeras, chozas, rocas y el volcán al fondo.

const sphere = new THREE.SphereGeometry(1, 12, 8)
const cyl = new THREE.CylinderGeometry(1, 1, 1, 8)
const cone = new THREE.ConeGeometry(1, 1, 8)

function m(geo: THREE.BufferGeometry, mat: THREE.Material, s: [number, number, number], p: [number, number, number] = [0, 0, 0]): THREE.Mesh {
  const mesh = new THREE.Mesh(geo, mat)
  mesh.scale.set(...s)
  mesh.position.set(...p)
  return mesh
}

export function buildSky(): THREE.Mesh {
  const geo = new THREE.SphereGeometry(400, 24, 12)
  const colors: number[] = []
  const top = new THREE.Color(0x3aa8e6)
  const mid = new THREE.Color(0x9fe0f5)
  const low = new THREE.Color(0xffe0b0)
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 400
    const c = y > 0.15 ? mid.clone().lerp(top, Math.min(1, (y - 0.15) / 0.6)) : low.clone().lerp(mid, Math.max(0, (y + 0.1) / 0.25))
    colors.push(c.r, c.g, c.b)
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  const sky = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }))
  sky.renderOrder = -10
  return sky
}

export function buildSea(): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(500, 500, 40, 40).rotateX(-Math.PI / 2)
  const sea = new THREE.Mesh(geo, new THREE.MeshToonMaterial({ color: 0x1fb3c9 }))
  sea.position.y = -0.9
  return sea
}

/** Olas suaves en el mar (se mueve con el jugador). */
export function animateSea(sea: THREE.Mesh, t: number): void {
  const pos = (sea.geometry as THREE.BufferGeometry).attributes.position as THREE.BufferAttribute
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const z = pos.getZ(i)
    pos.setY(i, Math.sin(x * 0.08 + t * 1.3) * 0.25 + Math.cos(z * 0.1 + t) * 0.25)
  }
  pos.needsUpdate = true
}

export function buildVolcano(): THREE.Group {
  const g = new THREE.Group()
  g.add(m(cone, toon(0x6b5a5a), [90, 80, 90], [0, 30, 0]))
  g.add(m(cone, toon(0x3d7a3a), [120, 18, 120], [0, 0, 0]))
  g.add(m(cyl, glow(0xff6a1f), [14, 2, 14], [0, 70, 0]))
  for (let i = 0; i < 5; i++) {
    const s = m(sphere, new THREE.MeshBasicMaterial({ color: 0x9a9090, transparent: true, opacity: 0.6, fog: false }), [14 + i * 4, 10 + i * 3, 14 + i * 4], [i * 6, 82 + i * 14, 0])
    s.name = 'smoke'
    g.add(s)
  }
  return g
}

export function buildCloud(): THREE.Group {
  const g = new THREE.Group()
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false })
  for (let i = 0; i < 4; i++) g.add(m(sphere, mat, [6 + Math.random() * 4, 3 + Math.random() * 2, 5], [i * 6 - 9, Math.random() * 2, 0]))
  return g
}

// ---------- Decoración a los lados de la pista (se recicla) ----------

export type DecorKind = 'palm' | 'hut' | 'rock' | 'torch' | 'post' | 'bush'

export function buildDecor(kind: DecorKind): THREE.Group {
  const g = new THREE.Group()
  switch (kind) {
    case 'palm': {
      const trunk = toon(0x9b6b3a)
      const lean = (Math.random() - 0.5) * 0.4
      let y = 0
      for (let i = 0; i < 6; i++) {
        const seg = m(cyl, trunk, [0.3 - i * 0.02, 1.1, 0.3 - i * 0.02], [lean * y, y + 0.55, 0])
        seg.rotation.z = -lean * 0.8
        g.add(seg)
        y += 1.05
      }
      const leaf = toon(Math.random() < 0.5 ? 0x2f9e44 : 0x3cb04f)
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2
        const l = m(sphere, leaf, [2.2, 0.08, 0.45], [lean * y + Math.cos(a) * 1.3, y - 0.2, Math.sin(a) * 1.3])
        l.rotation.set(0, -a, -0.45)
        g.add(l)
      }
      for (let i = 0; i < 3; i++) g.add(m(sphere, toon(0x6b4423), [0.22, 0.22, 0.22], [lean * y + Math.cos(i * 2) * 0.3, y - 0.4, Math.sin(i * 2) * 0.3]))
      break
    }
    case 'hut': {
      g.add(m(cyl, toon(0xc9955a), [1.6, 2, 1.6], [0, 1, 0]))
      g.add(m(cone, toon(0xe0c070), [2.6, 1.8, 2.6], [0, 2.9, 0]))
      g.add(m(new THREE.BoxGeometry(1, 1, 1), toon(0x5a3a1e), [0.8, 1.2, 0.1], [0, 0.6, 1.6]))
      break
    }
    case 'rock': {
      const mat = toon(0x8c8a80)
      g.add(m(new THREE.DodecahedronGeometry(1, 0), mat, [1.4, 1, 1.2], [0, 0.4, 0]))
      g.add(m(new THREE.DodecahedronGeometry(1, 0), mat, [0.8, 0.6, 0.7], [1.2, 0.2, 0.4]))
      break
    }
    case 'torch': {
      g.add(m(cyl, toon(0x7a4a22), [0.08, 2, 0.08], [0, 1, 0]))
      g.add(m(cyl, toon(0x5a3a1e), [0.18, 0.3, 0.14], [0, 2.1, 0]))
      const fl = m(cone, glow(0xffa21f), [0.2, 0.5, 0.2], [0, 2.5, 0])
      fl.name = 'flame'
      g.add(fl)
      break
    }
    case 'post': {
      g.add(m(cyl, toon(0x7a5a3a), [0.2, 3, 0.2], [0, 0.3, 0]))
      g.add(m(new THREE.TorusGeometry(0.22, 0.05, 6, 10), toon(0xd9c27a), [1, 1, 1], [0, 1.2, 0]).rotateX(Math.PI / 2))
      break
    }
    case 'bush': {
      const mat = toon(0x4fae3b)
      for (let i = 0; i < 3; i++) g.add(m(sphere, mat, [0.8, 0.6, 0.8], [i * 0.6 - 0.6, 0.4, Math.random() * 0.4]))
      g.add(m(sphere, toon(0xff6fa8), [0.12, 0.12, 0.12], [0, 0.95, 0.3]))
      break
    }
  }
  return g
}

// ---------- Pista ----------

let groundMat: THREE.Material | null = null
let edgeMat: THREE.Material | null = null
const unitBox = new THREE.BoxGeometry(1, 1, 1)

/** Pedazo de pista de arena, de `len` metros y `width` de ancho, con el borde superior en y = 0. */
export function buildGroundPiece(): THREE.Mesh {
  if (!groundMat) {
    const t = sandTexture()
    groundMat = new THREE.MeshToonMaterial({ color: 0xffffff, map: t })
    edgeMat = toon(0xd9a864)
  }
  const mesh = new THREE.Mesh(unitBox, [edgeMat!, edgeMat!, groundMat, edgeMat!, edgeMat!, edgeMat!])
  return mesh
}

export function sizeGroundPiece(mesh: THREE.Mesh, x: number, width: number, z0: number, z1: number, top = 0, depth = 2.4): void {
  mesh.scale.set(width, depth, z1 - z0)
  mesh.position.set(x, top - depth / 2, (z0 + z1) / 2)
}

export function buildPlatformPiece(): THREE.Group {
  // Tabla de muelle: tablones sobre un marco, para que se note que se puede pisar.
  const g = new THREE.Group()
  const plank = toon(0xb07a45)
  const frame = toon(0x7a4a22)
  const top = new THREE.Mesh(unitBox, plank)
  top.name = 'top'
  g.add(top)
  const under = new THREE.Mesh(unitBox, frame)
  under.name = 'under'
  g.add(under)
  return g
}

export function sizePlatform(g: THREE.Group, width: number, len: number): void {
  const top = g.getObjectByName('top')!
  top.scale.set(width, 0.25, len)
  top.position.y = -0.125
  const under = g.getObjectByName('under')!
  under.scale.set(width * 0.9, 0.2, len * 0.95)
  under.position.y = -0.35
}
