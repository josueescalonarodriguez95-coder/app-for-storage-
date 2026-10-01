import * as THREE from 'three'
import type { CharacterId } from '../save.ts'
import { glow, glowSprite, paint, paintUnique, shadows } from './materials.ts'
import { furTex } from './textures.ts'

// Kiko y los personajes cosméticos. Todos miran hacia +z y comparten el mismo esqueleto,
// así que cambiar de personaje no cambia nada del juego: sólo cómo se ve.

export interface Rig {
  root: THREE.Group // posición en el mundo
  squash: THREE.Group // estirar y aplastar
  pivot: THREE.Group // giros, deslizarse, picada
  head: THREE.Group
  armL: THREE.Group
  armR: THREE.Group
  legL: THREE.Group
  legR: THREE.Group
  tail: THREE.Group[]
  tinted: THREE.MeshStandardMaterial[] // se pintan de negro al quemarse
  baseColors: THREE.Color[]
}

interface Look {
  fur: number
  belly: number
  dark: number
  snout: 'long' | 'blunt' | 'beak'
  tail: 'ringed' | 'stub' | 'feathers'
  ears: boolean
  goggles: boolean
  backpack: boolean
  mask?: number
  flower?: boolean
}

const LOOKS: Record<CharacterId, Look> = {
  kiko: { fur: 0xd9ad6c, belly: 0xf6e3bd, dark: 0x6b4526, snout: 'long', tail: 'ringed', ears: true, goggles: true, backpack: true, mask: 0xfff4dc },
  nena: { fur: 0x9a6a3f, belly: 0xc49a6c, dark: 0x4a2e18, snout: 'blunt', tail: 'stub', ears: true, goggles: false, backpack: true, flower: true },
  tico: { fur: 0x1d1d24, belly: 0xfff6e0, dark: 0x0e0e12, snout: 'beak', tail: 'feathers', ears: false, goggles: true, backpack: false },
  rufo: { fur: 0x9c8f7c, belly: 0xc7bca8, dark: 0x4b4136, snout: 'blunt', tail: 'stub', ears: false, goggles: false, backpack: true, mask: 0x3a3029 },
}

const sphere = new THREE.SphereGeometry(1, 32, 24)
const lowSphere = new THREE.SphereGeometry(1, 16, 12)
const cyl = new THREE.CylinderGeometry(1, 1, 1, 20)
const cone = new THREE.ConeGeometry(1, 1, 20)

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, s: [number, number, number], p: [number, number, number] = [0, 0, 0]): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat)
  m.scale.set(...s)
  m.position.set(...p)
  return m
}

export function buildCharacter(id: CharacterId): Rig {
  const look = LOOKS[id]
  const tinted: THREE.MeshStandardMaterial[] = []
  const f = furTex()
  const unique = (c: number) => {
    const m = paintUnique(c, { roughness: 0.92, map: f.map, normalMap: f.normalMap, normalScale: 0.5 })
    tinted.push(m)
    return m
  }
  const fur = unique(look.fur)
  const belly = unique(look.belly)
  const dark = unique(look.dark)
  const black = paint(0x140c08, { roughness: 0.12 })
  const white = paint(0xfbf7f0, { roughness: 0.18 })
  const toon = (c: number) => paint(c, { roughness: 0.55 })

  const root = new THREE.Group()
  const squash = new THREE.Group()
  const pivot = new THREE.Group()
  pivot.position.y = 0.75
  root.add(squash)
  squash.add(pivot)

  // Cuerpo
  pivot.add(mesh(sphere, fur, [0.42, 0.46, 0.4], [0, 0, 0]))
  pivot.add(mesh(sphere, belly, [0.3, 0.34, 0.2], [0, -0.02, 0.24]))

  // Cabeza
  const head = new THREE.Group()
  head.position.set(0, 0.55, 0.05)
  pivot.add(head)
  head.add(mesh(sphere, fur, [0.36, 0.33, 0.34]))
  if (look.snout === 'long') {
    const s = mesh(cone, fur, [0.16, 0.42, 0.16], [0, -0.06, 0.42])
    s.rotation.x = Math.PI / 2
    head.add(s)
    head.add(mesh(sphere, black, [0.075, 0.07, 0.075], [0, -0.06, 0.64]))
  } else if (look.snout === 'blunt') {
    head.add(mesh(sphere, look.mask && id === 'rufo' ? belly : dark, [0.2, 0.15, 0.16], [0, -0.08, 0.28]))
    head.add(mesh(sphere, black, [0.06, 0.045, 0.04], [0, -0.03, 0.43]))
  } else {
    const beak = mesh(cone, toon(0xff8a1f), [0.18, 0.62, 0.2], [0, -0.04, 0.55])
    beak.rotation.x = Math.PI / 2 + 0.25
    head.add(beak)
    head.add(mesh(cone, toon(0xffd23f), [0.12, 0.25, 0.14], [0, 0.04, 0.4]).rotateX(Math.PI / 2))
  }
  // Ojos (con parches claros de coatí o antifaz de perezoso)
  for (const sx of [-1, 1]) {
    if (look.mask) {
      const patch = mesh(lowSphere, id === 'rufo' ? toon(look.mask) : toon(look.mask), [0.1, 0.08, 0.05], [sx * 0.14, 0.05, 0.28])
      patch.rotation.z = sx * (id === 'rufo' ? -0.5 : 0.3)
      head.add(patch)
    }
    head.add(mesh(sphere, white, [0.085, 0.1, 0.06], [sx * 0.13, 0.07, 0.3]))
    head.add(mesh(sphere, black, [0.045, 0.06, 0.04], [sx * 0.13, 0.07, 0.35]))
    head.add(mesh(lowSphere, glow(0xffffff), [0.014, 0.014, 0.01], [sx * 0.13 + 0.015, 0.095, 0.385]))
    if (look.ears) head.add(mesh(sphere, dark, [0.09, 0.09, 0.05], [sx * 0.24, 0.28, -0.04]))
  }
  if (look.goggles) {
    const brass = paint(0xc9963c, { roughness: 0.28, metalness: 0.9 })
    const band = mesh(new THREE.TorusGeometry(0.34, 0.035, 10, 40), paint(0x4a2e16, { roughness: 0.6 }), [1, 1, 1], [0, 0.17, 0])
    band.rotation.x = Math.PI / 2 - 0.25
    head.add(band)
    for (const sx of [-1, 1]) {
      const rim = mesh(new THREE.TorusGeometry(0.1, 0.035, 10, 28), brass, [1, 1, 1], [sx * 0.12, 0.26, 0.24])
      rim.rotation.x = -0.4
      head.add(rim)
      head.add(mesh(sphere, paint(0x6fd8f0, { roughness: 0.04, metalness: 0.3, emissive: 0x0c3a46 }), [0.085, 0.085, 0.03], [sx * 0.12, 0.26, 0.245]).rotateX(-0.4))
    }
  }
  if (look.flower) {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2
      head.add(mesh(lowSphere, toon(0xff6fa8), [0.07, 0.03, 0.07], [0.2 + Math.cos(a) * 0.07, 0.3, Math.sin(a) * 0.07]))
    }
    head.add(mesh(lowSphere, toon(0xffd23f), [0.04, 0.04, 0.04], [0.2, 0.32, 0]))
  }

  // Brazos y piernas (grupos con el pivote arriba)
  const limb = (x: number, y: number, len: number, rad: number, mat: THREE.Material, footMat?: THREE.Material): THREE.Group => {
    const g = new THREE.Group()
    g.position.set(x, y, 0)
    g.add(mesh(cyl, mat, [rad, len, rad], [0, -len / 2, 0]))
    if (footMat) g.add(mesh(sphere, footMat, [rad * 1.3, rad * 0.9, rad * 1.7], [0, -len, rad * 0.5]))
    pivot.add(g)
    return g
  }
  const wing = look.snout === 'beak'
  const armLen = id === 'rufo' ? 0.55 : 0.36
  const armL = limb(-0.38, 0.18, armLen, wing ? 0.05 : 0.07, wing ? fur : dark, wing ? undefined : dark)
  const armR = limb(0.38, 0.18, armLen, wing ? 0.05 : 0.07, wing ? fur : dark, wing ? undefined : dark)
  if (wing) {
    armL.children[0].scale.set(0.22, armLen, 0.08)
    armR.children[0].scale.set(0.22, armLen, 0.08)
  }
  const legL = limb(-0.18, -0.3, 0.38, 0.09, dark, black)
  const legR = limb(0.18, -0.3, 0.38, 0.09, dark, black)

  // Mochila de bambú
  if (look.backpack) {
    const bamboo = paint(0xa8c650, { roughness: 0.35 })
    const knot = paint(0x6f8f2a, { roughness: 0.45 })
    for (const x of [-0.14, 0, 0.14]) {
      pivot.add(mesh(cyl, bamboo, [0.07, 0.55, 0.07], [x, 0.08, -0.42]))
      pivot.add(mesh(cyl, knot, [0.075, 0.03, 0.075], [x, 0.18, -0.42]))
      pivot.add(mesh(cyl, knot, [0.075, 0.03, 0.075], [x, -0.05, -0.42]))
    }
    pivot.add(mesh(cyl, toon(0x7a5230), [0.3, 0.05, 0.03], [0, 0.25, -0.34]).rotateZ(Math.PI / 2))
  }

  // Cola: segmentos encadenados, levantada como la de un coatí
  const tail: THREE.Group[] = []
  let parent: THREE.Object3D = pivot
  const segments = look.tail === 'ringed' ? 9 : look.tail === 'feathers' ? 3 : 1
  for (let i = 0; i < segments; i++) {
    const g = new THREE.Group()
    if (i === 0) g.position.set(0, -0.2, -0.36)
    else g.position.set(0, look.tail === 'feathers' ? 0 : 0.13, 0)
    g.rotation.x = i === 0 ? -0.9 : look.tail === 'ringed' ? -0.16 : 0
    parent.add(g)
    parent = g
    tail.push(g)
    if (look.tail === 'ringed') {
      const r = 0.1 - i * 0.004
      g.add(mesh(cyl, i % 2 ? dark : fur, [r, 0.14, r], [0, 0.07, 0]))
    } else if (look.tail === 'feathers') {
      g.add(mesh(sphere, i === 1 ? toon(0xd6402c) : fur, [0.1, 0.32, 0.05], [(i - 1) * 0.1, 0.25, 0]))
    } else {
      g.add(mesh(sphere, fur, [0.1, 0.1, 0.1], [0, 0.05, 0]))
    }
  }

  shadows(root)

  return { root, squash, pivot, head, armL, armR, legL, legR, tail, tinted, baseColors: tinted.map((m) => m.color.clone()) }
}

export type Pose = 'run' | 'jump' | 'fall' | 'slide' | 'spin' | 'pound' | 'idle' | 'dead' | 'fly'

/** Animación de carrera y poses. `t` = tiempo total, `phase` = ciclo de pasos. */
export function poseRig(rig: Rig, pose: Pose, t: number, phase: number): void {
  const s = Math.sin(phase)
  const reset = () => {
    rig.pivot.rotation.set(0, 0, 0)
    rig.pivot.position.set(0, 0.75, 0)
    rig.head.rotation.set(0, 0, 0)
  }
  reset()
  const tailSway = Math.sin(t * 6) * 0.15
  rig.tail.forEach((g, i) => {
    g.rotation.z = i ? tailSway * 0.6 : tailSway
  })
  switch (pose) {
    case 'run':
      rig.legL.rotation.x = s * 0.9
      rig.legR.rotation.x = -s * 0.9
      rig.armL.rotation.x = -s * 0.8
      rig.armR.rotation.x = s * 0.8
      rig.armL.rotation.z = -0.2
      rig.armR.rotation.z = 0.2
      rig.pivot.position.y = 0.75 + Math.abs(Math.cos(phase)) * 0.1
      rig.pivot.rotation.x = 0.15
      break
    case 'jump':
    case 'fly':
      rig.legL.rotation.x = -0.9
      rig.legR.rotation.x = 0.3
      rig.armL.rotation.set(0, 0, -2.4)
      rig.armR.rotation.set(0, 0, 2.4)
      rig.pivot.rotation.x = pose === 'fly' ? 0.5 : 0
      break
    case 'fall':
      rig.legL.rotation.x = 0.4
      rig.legR.rotation.x = -0.3
      rig.armL.rotation.set(0, 0, -1.3 + Math.sin(t * 20) * 0.3)
      rig.armR.rotation.set(0, 0, 1.3 - Math.sin(t * 20) * 0.3)
      break
    case 'slide':
      rig.pivot.rotation.x = -1.25
      rig.pivot.position.y = 0.42
      rig.legL.rotation.x = -1.4
      rig.legR.rotation.x = -1.3
      rig.armL.rotation.set(-2.6, 0, -0.3)
      rig.armR.rotation.set(-2.6, 0, 0.3)
      break
    case 'spin':
      rig.armL.rotation.set(0, 0, -1.5)
      rig.armR.rotation.set(0, 0, 1.5)
      rig.legL.rotation.x = 0.2
      rig.legR.rotation.x = -0.2
      rig.pivot.rotation.y = t * 30
      break
    case 'pound':
      rig.pivot.rotation.x = t * 22
      rig.legL.rotation.x = -1.6
      rig.legR.rotation.x = -1.6
      rig.armL.rotation.set(-1.5, 0, 0)
      rig.armR.rotation.set(-1.5, 0, 0)
      break
    case 'idle': {
      const look = Math.sin(t * 0.7)
      rig.head.rotation.y = look > 0.6 ? 0.5 : look < -0.6 ? -0.5 : 0
      rig.pivot.position.y = 0.75 + Math.sin(t * 2) * 0.02
      rig.legL.rotation.x = 0
      rig.legR.rotation.x = 0
      // Se rasca la cabeza de vez en cuando
      const scratch = Math.sin(t * 0.35) > 0.85
      rig.armR.rotation.set(scratch ? -2.6 + Math.sin(t * 18) * 0.2 : 0, 0, scratch ? 0.4 : 0.15)
      rig.armL.rotation.set(0, 0, -0.15)
      break
    }
    case 'dead':
      break
  }
}

export function tintRig(rig: Rig, color: THREE.Color | null): void {
  rig.tinted.forEach((m, i) => m.color.copy(color ?? rig.baseColors[i]))
}

// ---------- Chispa, la luciérnaga ----------

export interface ChispaModel {
  root: THREE.Group
  wings: THREE.Mesh[]
  halo: THREE.Sprite
  core: THREE.Mesh
}

export function buildChispa(): ChispaModel {
  const root = new THREE.Group()
  const core = mesh(sphere, glow(0x6ff7e8), [0.16, 0.16, 0.2])
  root.add(core)
  root.add(mesh(sphere, glow(0xe8fffb), [0.08, 0.08, 0.08], [0, 0.03, 0.12]))
  const wings: THREE.Mesh[] = []
  for (const sx of [-1, 1]) {
    const w = mesh(sphere, paint(0x8be08b, { roughness: 0.3, emissive: 0x1f5a2a }), [0.2, 0.03, 0.1], [sx * 0.2, 0.1, 0])
    root.add(w)
    wings.push(w)
  }
  const halo = glowSprite(0x4ff0dd, 0.8)
  halo.material.opacity = 0.6
  root.add(halo)
  return { root, wings, halo, core }
}
