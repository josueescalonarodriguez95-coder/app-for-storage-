import * as THREE from 'three'
import {
  DOUBLE_JUMP_VELOCITY,
  GRAVITY,
  JUMP_VELOCITY,
  LANE_CHANGE_SPEED,
  POUND_VELOCITY,
  SLIDE_DURATION,
  SLIDE_HEIGHT,
  SPIN_COOLDOWN,
  SPIN_DURATION,
  STAND_HEIGHT,
} from './config.ts'
import type { CameraMode } from './level/types.ts'
import { buildChispa, buildCharacter, poseRig, tintRig } from './models/characters.ts'
import type { ChispaModel, Pose, Rig } from './models/characters.ts'
import { blobShadow, glow, paint } from './models/materials.ts'
import type { CharacterId } from './save.ts'
import type { Entity, PlatformRT, World } from './world.ts'
import { laneX } from './world.ts'

export type DeathKind = 'burn' | 'squash' | 'fall' | 'spikes' | 'bonk' | 'pinch'

export interface LandInfo {
  pound: boolean
  iron?: Entity
  platform?: PlatformRT
  impact: number
}

export class Player {
  readonly root = new THREE.Group()
  rig!: Rig
  private shadow: THREE.Mesh
  readonly chispa: ChispaModel
  private spinFx: THREE.Mesh
  private skate: THREE.Group
  private rocketPack: THREE.Group
  character: CharacterId = 'kiko'

  x = 0
  y = 0
  z = 0
  vy = 0
  lane = 0
  grounded = true
  jumps = 0
  private coyote = 0
  private jumpBuffer = 0
  slide = 0
  spin = 0
  spinCd = 0
  pounding = false
  invuln = 0
  wet = false
  flying = false // mochila cohete
  skating = false
  private phase = 0
  private squashT = 0
  time = 0
  dead: { kind: DeathKind; t: number } | null = null
  chispaLevel = 0
  private chispaPos = new THREE.Vector3()

  constructor(scene: THREE.Scene) {
    scene.add(this.root)
    this.shadow = blobShadow(1.2)
    scene.add(this.shadow)
    this.chispa = buildChispa()
    scene.add(this.chispa.root)
    // Remolino del giro
    this.spinFx = new THREE.Mesh(
      new THREE.TorusGeometry(0.75, 0.12, 6, 24),
      new THREE.MeshBasicMaterial({ color: 0xfff1c1, transparent: true, opacity: 0.55, depthWrite: false }),
    )
    this.spinFx.rotation.x = Math.PI / 2
    this.spinFx.position.y = 0.8
    this.spinFx.visible = false
    this.root.add(this.spinFx)
    // Patineta
    this.skate = new THREE.Group()
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.07, 1.2), paint(0xa8c650, { roughness: 0.4 }))
    board.position.y = 0.06
    this.skate.add(board)
    for (const z of [-0.4, 0.4]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.5, 12), paint(0x333333, { roughness: 0.6 }))
      w.rotation.z = Math.PI / 2
      w.position.set(0, -0.02, z)
      this.skate.add(w)
    }
    this.skate.visible = false
    this.root.add(this.skate)
    // Mochila cohete (llamas)
    this.rocketPack = new THREE.Group()
    for (const sx of [-0.15, 0.15]) {
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.7, 8), glow(0xffa21f))
      f.rotation.x = Math.PI
      f.position.set(sx, 0.4, -0.45)
      this.rocketPack.add(f)
    }
    this.rocketPack.visible = false
    this.root.add(this.rocketPack)
    this.setCharacter('kiko')
  }

  setCharacter(id: CharacterId): void {
    if (this.rig) this.root.remove(this.rig.root)
    this.character = id
    this.rig = buildCharacter(id)
    this.root.add(this.rig.root)
  }

  reset(): void {
    this.x = this.y = this.z = this.vy = 0
    this.lane = 0
    this.grounded = true
    this.jumps = 0
    this.slide = this.spin = this.spinCd = this.invuln = 0
    this.pounding = this.wet = this.flying = this.skating = false
    this.dead = null
    this.chispaLevel = 0
    this.rig.root.visible = true
    this.rig.root.rotation.set(0, 0, 0)
    this.rig.squash.scale.set(1, 1, 1)
    this.rig.root.position.set(0, 0, 0)
    tintRig(this.rig, null)
    this.root.position.set(0, 0, 0)
    this.chispaPos.set(0.8, 1.8, -0.5)
  }

  get height(): number {
    return this.slide > 0 ? SLIDE_HEIGHT : this.pounding ? 1.0 : STAND_HEIGHT
  }

  get spinning(): boolean {
    return this.spin > 0
  }

  // ---------- Acciones ----------

  moveLane(dir: number, mode: CameraMode): void {
    if (mode === 'side' || this.dead) return
    this.lane = THREE.MathUtils.clamp(this.lane + dir, -1, 1)
  }

  /** Devuelve 'jump', 'djump' o null. */
  jump(): 'jump' | 'djump' | null {
    if (this.dead || this.flying) return null
    if (this.grounded || this.coyote > 0) {
      this.vy = JUMP_VELOCITY
      this.grounded = false
      this.coyote = 0
      this.jumps = 1
      this.slide = 0
      this.squashT = -0.15
      return 'jump'
    }
    if (this.jumps < 2) {
      this.vy = DOUBLE_JUMP_VELOCITY
      this.jumps = 2
      this.pounding = false
      return 'djump'
    }
    this.jumpBuffer = 0.14
    return null
  }

  /** Abajo: deslizarse en el piso, golpe en picada en el aire. */
  down(): 'slide' | 'pound' | null {
    if (this.dead || this.flying) return null
    if (this.grounded) {
      this.slide = SLIDE_DURATION
      return 'slide'
    }
    if (!this.pounding) {
      this.pounding = true
      this.vy = POUND_VELOCITY
      return 'pound'
    }
    return null
  }

  trySpin(): boolean {
    if (this.dead || this.spin > 0 || this.spinCd > 0) return false
    this.spin = SPIN_DURATION
    this.spinCd = SPIN_DURATION + SPIN_COOLDOWN
    return true
  }

  bounce(v: number): void {
    this.vy = v
    this.grounded = false
    this.pounding = false
    this.jumps = 1 // queda el doble salto disponible
    this.squashT = -0.15
  }

  // ---------- Física ----------

  update(dt: number, speed: number, mode: CameraMode, world: World, onLand: (info: LandInfo) => void): void {
    this.time += dt
    if (this.dead) return
    this.z += speed * dt
    this.phase += dt * speed * 1.1

    const targetX = mode === 'side' ? 0 : laneX(this.lane)
    if (mode === 'side') this.lane = 0
    const lateral = LANE_CHANGE_SPEED * Math.max(1, speed / 12) * (this.wet ? 0.45 : 1) * dt
    this.x += THREE.MathUtils.clamp(targetX - this.x, -lateral, lateral)

    this.slide = Math.max(0, this.slide - dt)
    this.spin = Math.max(0, this.spin - dt)
    this.spinCd = Math.max(0, this.spinCd - dt)
    this.invuln = Math.max(0, this.invuln - dt)
    this.coyote = Math.max(0, this.coyote - dt)
    this.jumpBuffer = Math.max(0, this.jumpBuffer - dt)

    if (this.flying) {
      this.y += (6 - this.y) * Math.min(1, dt * 3)
      this.vy = 0
      this.grounded = false
      return
    }

    const prevY = this.y
    const ground = world.groundAt(this.x, this.z, prevY)
    if (this.grounded) {
      if (ground.y >= this.y - 0.35 && ground.y > -Infinity) {
        this.y = ground.y // pisando (sigue plataformas que suben y bajan)
      } else {
        this.grounded = false
        this.coyote = 0.1
        if (this.jumps === 0) this.jumps = 1
      }
    }
    if (!this.grounded) {
      this.vy += GRAVITY * dt
      this.y += this.vy * dt
      if (this.vy <= 0 && this.y <= ground.y && prevY >= ground.y - 0.35) {
        const impact = -this.vy
        this.y = ground.y
        this.vy = 0
        this.grounded = true
        this.jumps = 0
        const pound = this.pounding
        this.pounding = false
        this.squashT = 0.18
        onLand({ pound, iron: ground.iron, platform: ground.platform, impact })
        if (this.jumpBuffer > 0) {
          this.jumpBuffer = 0
          this.jump()
        }
      }
    }
  }

  // ---------- Dibujo ----------

  render(dt: number, mode: CameraMode, chispaLevel: number, invincible: boolean): void {
    this.root.position.set(this.x, this.y, this.z)
    const rig = this.rig

    if (this.dead) {
      this.renderDeath(dt)
    } else {
      let pose: Pose = 'run'
      if (this.flying) pose = 'fly'
      else if (this.spin > 0) pose = 'spin'
      else if (this.pounding) pose = 'pound'
      else if (this.slide > 0) pose = 'slide'
      else if (!this.grounded) pose = this.vy > 0 ? 'jump' : 'fall'
      if (this.skating && this.grounded && pose === 'run') pose = 'idle'
      poseRig(rig, pose, this.time, this.phase)

      // Estirar y aplastar: se aplasta al caer, se estira al saltar.
      if (this.squashT > 0) {
        const k = this.squashT / 0.18
        rig.squash.scale.set(1 + 0.3 * k, 1 - 0.3 * k, 1 + 0.3 * k)
        this.squashT = Math.max(0, this.squashT - dt)
      } else if (this.squashT < 0) {
        const k = -this.squashT / 0.15
        rig.squash.scale.set(1 - 0.15 * k, 1 + 0.25 * k, 1 - 0.15 * k)
        this.squashT = Math.min(0, this.squashT + dt)
      } else rig.squash.scale.set(1, 1, 1)
      // Inclinación al cambiar de carril
      const lean = THREE.MathUtils.clamp((laneX(this.lane) - this.x) * 0.25, -0.35, 0.35)
      rig.root.rotation.z = mode === 'side' ? 0 : lean * (mode === 'chase' ? 1 : 1)
      rig.root.position.y = this.skating ? 0.14 : 0
      // Parpadeo mientras es invulnerable
      rig.root.visible = this.invuln > 0 && !invincible ? Math.floor(this.time * 16) % 2 === 0 : true
    }

    this.spinFx.visible = this.spin > 0 && !this.dead
    if (this.spinFx.visible) {
      this.spinFx.rotation.z = this.time * 25
      this.spinFx.scale.setScalar(0.8 + Math.sin(this.time * 40) * 0.1)
    }
    this.skate.visible = this.skating && !this.dead && !this.flying
    this.rocketPack.visible = this.flying && !this.dead
    if (this.rocketPack.visible) this.rocketPack.children.forEach((c) => c.scale.set(1, 0.8 + Math.random() * 0.5, 1))

    // Sombra en el piso de verdad (ayuda a medir los saltos)
    this.shadow.visible = !this.dead || this.dead.kind !== 'fall'
    this.shadow.position.set(this.x, 0.02, this.z)
    this.shadow.scale.setScalar(Math.max(0.4, 1.2 - this.y * 0.1))

    // Chispa
    const c = this.chispa
    c.root.visible = chispaLevel > 0
    if (chispaLevel > 0) {
      const target = invincible ? new THREE.Vector3(this.x, this.y + 1.2, this.z + 1.3) : new THREE.Vector3(this.x + 0.65, this.y + 2.05 + Math.sin(this.time * 3) * 0.15, this.z - 0.2)
      if (this.chispaPos.lengthSq() === 0 || this.chispaPos.distanceTo(target) > 20) this.chispaPos.copy(target)
      this.chispaPos.lerp(target, Math.min(1, dt * 8))
      c.root.position.copy(this.chispaPos)
      const size = invincible ? 1.8 : 0.8 + (chispaLevel - 1) * 0.25
      c.core.scale.set(0.16 * size, 0.16 * size, 0.2 * size)
      c.halo.scale.setScalar((invincible ? 2.6 : 0.55 + chispaLevel * 0.2) * (1 + Math.sin(this.time * 10) * 0.1))
      c.wings.forEach((w, i) => (w.rotation.z = Math.sin(this.time * 30) * 0.6 * (i ? -1 : 1)))
    }
  }

  private renderDeath(dt: number): void {
    const d = this.dead!
    d.t += dt
    const rig = this.rig
    const t = d.t
    poseRig(rig, 'dead', this.time, 0)
    switch (d.kind) {
      case 'burn':
        // Quemado: negro, humeante, parpadea y se desarma
        tintRig(rig, new THREE.Color(0x201510))
        rig.squash.scale.set(1, 1, 1)
        rig.head.rotation.z = Math.sin(t * 10) * 0.1
        if (t > 1.0) rig.squash.scale.set(1 + (t - 1) * 2, Math.max(0.05, 1 - (t - 1) * 3), 1 + (t - 1) * 2)
        break
      case 'squash':
        rig.squash.scale.set(1.7, Math.max(0.08, 1 - t * 10), 1.7)
        break
      case 'fall':
        rig.root.position.y = -t * t * 6
        rig.root.rotation.x = t * 6
        rig.squash.scale.setScalar(Math.max(0.1, 1 - t * 0.5))
        break
      case 'spikes':
        // Salta agarrándose la cola
        rig.root.position.y = Math.max(0, 6 * t - 9 * t * t) * 1.5
        rig.armL.rotation.set(2.6, 0, 0)
        rig.armR.rotation.set(2.6, 0, 0)
        rig.pivot.rotation.x = -0.5
        break
      case 'pinch':
      case 'bonk':
        // Tumbado con estrellitas
        rig.pivot.rotation.x = -Math.min(1.5, t * 6)
        rig.pivot.position.y = 0.75 - Math.min(0.4, t * 2)
        rig.head.rotation.y = Math.sin(t * 8) * 0.4
        rig.legL.rotation.x = -1.2
        rig.legR.rotation.x = -1.4
        if (d.kind === 'pinch') rig.tail.forEach((g, i) => (g.rotation.z = Math.sin(t * 30) * (i ? 0.3 : 0.6)))
        break
    }
  }
}
