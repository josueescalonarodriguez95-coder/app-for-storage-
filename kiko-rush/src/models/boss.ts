import * as THREE from 'three'
import { glow, toon, toonUnique } from './materials.ts'

// Capitán Almeja: almeja robot pirata sobre una balsa voladora.

const sphere = new THREE.SphereGeometry(1, 16, 10)
const halfSphere = new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2)
const cyl = new THREE.CylinderGeometry(1, 1, 1, 10)
const cone = new THREE.ConeGeometry(1, 1, 10)

function m(geo: THREE.BufferGeometry, mat: THREE.Material, s: [number, number, number], p: [number, number, number] = [0, 0, 0]): THREE.Mesh {
  const mesh = new THREE.Mesh(geo, mat)
  mesh.scale.set(...s)
  mesh.position.set(...p)
  return mesh
}

export interface BossModel {
  root: THREE.Group
  lid: THREE.Group
  eye: THREE.Group
  arm: THREE.Group
  shellMat: THREE.MeshToonMaterial
  baseColor: THREE.Color
}

export function buildBoss(): BossModel {
  const root = new THREE.Group()
  // Balsa
  const raft = new THREE.Group()
  root.add(raft)
  for (let i = -2; i <= 2; i++) raft.add(m(cyl, toon(0x9b6b3a), [0.3, 5, 0.3], [i * 0.62, 0, 0]).rotateX(Math.PI / 2))
  raft.add(m(cyl, glow(0x6ff7e8), [0.8, 0.2, 0.8], [0, -0.35, 0]))
  // Concha de abajo
  const shellMat = toonUnique(0xf2a6b8)
  const shell = new THREE.Group()
  shell.position.y = 0.4
  root.add(shell)
  const bottom = m(halfSphere, shellMat, [1.8, 1.0, 1.6])
  bottom.rotation.x = Math.PI
  bottom.position.y = 1.0
  shell.add(bottom)
  // Ojo robot dentro
  const eye = new THREE.Group()
  eye.position.set(0, 1.25, -0.3)
  shell.add(eye)
  eye.add(m(sphere, toon(0xffffff), [0.7, 0.7, 0.7]))
  eye.add(m(sphere, glow(0xff3b30), [0.3, 0.3, 0.2], [0, 0, -0.6]))
  eye.add(m(sphere, toon(0x111111), [0.14, 0.14, 0.1], [0, 0, -0.72]))
  // Bigote
  for (const sx of [-1, 1]) {
    const bi = m(sphere, toon(0x2a1a0c), [0.5, 0.12, 0.14], [sx * 0.45, 0.7, -0.9])
    bi.rotation.z = sx * -0.3
    shell.add(bi)
  }
  // Tapa (concha de arriba), con sombrero pirata
  const lid = new THREE.Group()
  lid.position.set(0, 1.0, 1.4)
  shell.add(lid)
  const top = m(halfSphere, shellMat, [1.8, 1.1, 1.6], [0, 0, -1.4])
  lid.add(top)
  for (let i = -3; i <= 3; i++) lid.add(m(cyl, toon(0xd6809a), [0.06, 1.1, 0.06], [i * 0.45, 0.55, -1.4 - Math.cos(i * 0.3) * 0.1]).rotateX(-0.1 * i))
  const hat = new THREE.Group()
  hat.position.set(0, 1.05, -1.4)
  lid.add(hat)
  hat.add(m(cyl, toon(0x1a1a22), [1.4, 0.15, 0.7]))
  hat.add(m(sphere, toon(0x1a1a22), [0.9, 0.55, 0.55], [0, 0.3, 0]))
  hat.add(m(sphere, toon(0xffffff), [0.16, 0.16, 0.08], [0, 0.4, -0.52]))
  hat.add(m(cyl, toon(0xffd23f), [1.42, 0.06, 0.72], [0, 0.08, 0]))
  // Brazo mecánico que lanza cosas
  const arm = new THREE.Group()
  arm.position.set(1.8, 1.2, 0)
  shell.add(arm)
  arm.add(m(cyl, toon(0x8a97a3), [0.15, 1.4, 0.15], [0.5, 0.4, 0]).rotateZ(-0.8))
  arm.add(m(sphere, toon(0x5d6975), [0.3, 0.3, 0.3], [1.0, 0.9, 0]))
  for (const sx of [-1, 1]) arm.add(m(cone, toon(0x5d6975), [0.12, 0.4, 0.12], [1.0 + sx * 0.15, 1.2, 0]))
  // Hélices / propulsores
  for (const sx of [-1, 1]) {
    const flame = m(cone, glow(0xffa21f), [0.3, 0.8, 0.3], [sx * 1.4, -0.7, 0])
    flame.rotation.x = Math.PI
    flame.name = 'flame'
    root.add(flame)
  }
  root.scale.setScalar(1.4)
  return { root, lid, eye, arm, shellMat, baseColor: shellMat.color.clone() }
}
