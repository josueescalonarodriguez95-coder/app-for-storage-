import * as THREE from 'three'

// Partículas simples (astillas, chispas, polvo, humo) con un pool fijo: nada se crea en medio de la partida.

interface Particle {
  mesh: THREE.Mesh
  vel: THREE.Vector3
  life: number
  maxLife: number
  gravity: number
  grow: number
  spin: number
}

const MAX = 220

export class Effects {
  private pool: Particle[] = []
  private active: Particle[] = []
  private geo = new THREE.BoxGeometry(1, 1, 1)
  private sphere = new THREE.IcosahedronGeometry(1, 0)
  private mats = new Map<number, THREE.MeshBasicMaterial>()
  private group = new THREE.Group()
  private rings: { mesh: THREE.Mesh; life: number; max: number; size: number }[] = []

  constructor(scene: THREE.Scene) {
    scene.add(this.group)
    for (let i = 0; i < MAX; i++) {
      const mesh = new THREE.Mesh(this.geo, this.mat(0xffffff))
      mesh.visible = false
      this.group.add(mesh)
      this.pool.push({ mesh, vel: new THREE.Vector3(), life: 0, maxLife: 1, gravity: 0, grow: 0, spin: 0 })
    }
  }

  private mat(color: number): THREE.MeshBasicMaterial {
    let m = this.mats.get(color)
    if (!m) {
      m = new THREE.MeshBasicMaterial({ color, transparent: true })
      this.mats.set(color, m)
    }
    return m
  }

  private emit(pos: THREE.Vector3, color: number, opts: { speed: number; up: number; size: number; life: number; gravity: number; round?: boolean; grow?: number }): void {
    const p = this.pool.pop()
    if (!p) return
    p.mesh.geometry = opts.round ? this.sphere : this.geo
    p.mesh.material = this.mat(color)
    p.mesh.position.copy(pos)
    p.mesh.scale.setScalar(opts.size)
    p.mesh.visible = true
    p.vel.set((Math.random() - 0.5) * opts.speed, opts.up * (0.5 + Math.random()), (Math.random() - 0.5) * opts.speed)
    p.life = p.maxLife = opts.life * (0.7 + Math.random() * 0.6)
    p.gravity = opts.gravity
    p.grow = opts.grow ?? 0
    p.spin = (Math.random() - 0.5) * 12
    this.active.push(p)
  }

  splinters(pos: THREE.Vector3, color = 0xc98a3f, n = 10): void {
    for (let i = 0; i < n; i++) this.emit(pos, i % 3 ? color : 0x7a4a1c, { speed: 8, up: 7, size: 0.16, life: 0.7, gravity: -25 })
  }

  sparkle(pos: THREE.Vector3, color = 0xfff27a, n = 6): void {
    for (let i = 0; i < n; i++) this.emit(pos, color, { speed: 4, up: 3, size: 0.09, life: 0.4, gravity: 0, round: true })
  }

  dust(pos: THREE.Vector3, n = 6): void {
    for (let i = 0; i < n; i++) this.emit(pos, 0xf6e3bd, { speed: 4, up: 1.5, size: 0.22, life: 0.45, gravity: -2, round: true, grow: 1.5 })
  }

  splash(pos: THREE.Vector3, n = 14): void {
    for (let i = 0; i < n; i++) this.emit(pos, i % 2 ? 0xffffff : 0x7fe6ff, { speed: 5, up: 8, size: 0.18, life: 0.8, gravity: -22, round: true })
  }

  smoke(pos: THREE.Vector3, n = 4): void {
    for (let i = 0; i < n; i++) this.emit(pos, 0x555555, { speed: 1.2, up: 2, size: 0.3, life: 1.0, gravity: 1, round: true, grow: 1.2 })
  }

  stars(pos: THREE.Vector3): void {
    for (let i = 0; i < 5; i++) this.emit(pos, 0xffe066, { speed: 3, up: 3, size: 0.14, life: 0.8, gravity: -3, round: true })
  }

  explosion(pos: THREE.Vector3): void {
    for (let i = 0; i < 26; i++) this.emit(pos, [0xffd23f, 0xff7a1a, 0xe0342f][i % 3], { speed: 14, up: 9, size: 0.3, life: 0.6, gravity: -10, round: true, grow: 0.8 })
    this.smoke(pos, 6)
    this.ring(pos, 0xffa21f, 4)
  }

  ring(pos: THREE.Vector3, color: number, size: number): void {
    const mesh = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false, side: THREE.DoubleSide }))
    mesh.position.copy(pos)
    mesh.position.y += 0.1
    this.group.add(mesh)
    this.rings.push({ mesh, life: 0.4, max: 0.4, size })
  }

  update(dt: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i]
      p.life -= dt
      if (p.life <= 0) {
        p.mesh.visible = false
        this.active.splice(i, 1)
        this.pool.push(p)
        continue
      }
      p.vel.y += p.gravity * dt
      p.mesh.position.addScaledVector(p.vel, dt)
      p.mesh.rotation.x += p.spin * dt
      p.mesh.rotation.y += p.spin * dt
      if (p.grow) p.mesh.scale.multiplyScalar(1 + p.grow * dt)
      if (p.mesh.position.y < 0 && p.gravity < 0) {
        p.mesh.position.y = 0
        p.vel.set(p.vel.x * 0.5, -p.vel.y * 0.3, p.vel.z * 0.5)
      }
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i]
      r.life -= dt
      const k = 1 - r.life / r.max
      r.mesh.scale.setScalar(0.3 + k * r.size)
      ;(r.mesh.material as THREE.MeshBasicMaterial).opacity = 1 - k
      if (r.life <= 0) {
        this.group.remove(r.mesh)
        r.mesh.geometry.dispose()
        ;(r.mesh.material as THREE.Material).dispose()
        this.rings.splice(i, 1)
      }
    }
  }

  clear(): void {
    for (const p of this.active) {
      p.mesh.visible = false
      this.pool.push(p)
    }
    this.active = []
  }
}
