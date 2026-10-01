import * as THREE from 'three'
import { CAMERA_TRANSITION } from './config.ts'
import type { CameraMode } from './level/types.ts'

// Las tres cámaras del documento y la transición de 1 segundo entre ellas.

interface Shot {
  pos: THREE.Vector3
  look: THREE.Vector3
  fov: number
}

export class CameraRig {
  readonly camera: THREE.PerspectiveCamera
  mode: CameraMode = 'run'
  private from: CameraMode = 'run'
  private blend = 1
  private shake = 0
  private yFollow = 0
  private tmpA: Shot = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 60 }
  private tmpB: Shot = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 60 }
  private look = new THREE.Vector3()

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 900)
  }

  get transitioning(): boolean {
    return this.blend < 1
  }

  switchTo(mode: CameraMode, instant = false): void {
    if (mode === this.mode) return
    this.from = this.mode
    this.mode = mode
    this.blend = instant ? 1 : 0
  }

  addShake(amount: number): void {
    this.shake = Math.max(this.shake, amount)
  }

  private shot(mode: CameraMode, p: THREE.Vector3, speed: number, out: Shot): Shot {
    const narrow = this.camera.aspect < 0.8 // celular en vertical: la cámara se aleja para ver los 3 carriles
    const back = (speed - 10) * 0.12
    const y = this.yFollow
    switch (mode) {
      case 'run':
        out.pos.set(p.x * 0.5, 3.4 + y + back * 0.4 + (narrow ? 1.2 : 0), p.z - 6.2 - back - (narrow ? 2 : 0))
        out.look.set(p.x * 0.6, 1.1 + y * 0.8, p.z + 9)
        out.fov = narrow ? 68 : 60
        break
      case 'chase':
        // De frente y bajita, con la amenaza al fondo
        out.pos.set(p.x * 0.35, 5.2 + y + (narrow ? 1.5 : 0), p.z + 9 + (narrow ? 2.5 : 0))
        out.look.set(p.x * 0.35, 0.6 + y * 0.8, p.z - 4)
        out.fov = narrow ? 70 : 62
        break
      case 'side':
        out.pos.set(-13 - (narrow ? 4 : 0), 3.0 + y, p.z + 4.5)
        out.look.set(0, 1.6 + y * 0.9, p.z + 4.5)
        out.fov = narrow ? 62 : 50
        break
    }
    return out
  }

  update(dt: number, player: THREE.Vector3, groundish: number, speed: number): void {
    // Sigue la altura de plataformas con suavidad (no los saltos, para que se note el salto).
    this.yFollow += (Math.max(0, groundish) * 0.7 - this.yFollow) * Math.min(1, dt * 2)
    this.blend = Math.min(1, this.blend + dt / CAMERA_TRANSITION)
    const b = this.shot(this.mode, player, speed, this.tmpB)
    let pos = b.pos
    let fov = b.fov
    this.look.copy(b.look)
    if (this.blend < 1) {
      const a = this.shot(this.from, player, speed, this.tmpA)
      const k = this.blend * this.blend * (3 - 2 * this.blend)
      pos = a.pos.lerp(b.pos, k)
      pos.y += Math.sin(Math.PI * k) * 3 // arco: la cámara pasa por arriba, no a través de Kiko
      this.look.copy(a.look.lerp(b.look, k))
      fov = THREE.MathUtils.lerp(a.fov, b.fov, k)
    }
    if (this.mode === 'chase') this.shake = Math.max(this.shake, 0.06) // temblor suave
    if (this.shake > 0) {
      pos.x += (Math.random() - 0.5) * this.shake
      pos.y += (Math.random() - 0.5) * this.shake
      this.shake = Math.max(0, this.shake - dt * 1.5)
    }
    this.camera.position.copy(pos)
    this.camera.lookAt(this.look)
    if (Math.abs(this.camera.fov - fov) > 0.01) {
      this.camera.fov = fov
      this.camera.updateProjectionMatrix()
    }
  }

  /** Cámara del menú: gira despacio alrededor de Kiko. */
  menu(t: number, target: THREE.Vector3): void {
    const wide = this.camera.aspect >= 1.25 && window.innerWidth >= 820
    const narrow = this.camera.aspect < 0.8
    const r = narrow ? 8.5 : 5.5
    const a = Math.sin(t * 0.12) * 0.9 // se mece de lado a lado, siempre viendo la cara de Kiko
    this.camera.position.set(target.x + Math.sin(a) * r, narrow ? 1.2 : 1.6, target.z + Math.cos(a) * r)
    // Ancho: Kiko a la derecha del menú. Angosto: Kiko en el centro, entre el logo y los botones.
    const right = new THREE.Vector3(Math.cos(a), 0, -Math.sin(a))
    const look = new THREE.Vector3(target.x, narrow ? -0.45 : 0.8, target.z)
    if (wide) look.addScaledVector(right, -2.2)
    this.camera.lookAt(look)
    if (this.camera.fov !== 50) {
      this.camera.fov = 50
      this.camera.updateProjectionMatrix()
    }
  }

  resize(aspect: number): void {
    this.camera.aspect = aspect
    this.camera.updateProjectionMatrix()
  }
}
