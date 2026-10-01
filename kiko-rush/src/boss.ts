import * as THREE from 'three'
import type { Audio } from './audio.ts'
import type { CameraRig } from './camera.ts'
import type { Effects } from './effects.ts'
import { buildBoss } from './models/boss.ts'
import type { BossModel } from './models/boss.ts'
import { buildAnchor, buildLumi, buildMarker } from './models/props.ts'
import type { Player } from './player.ts'
import type { Entity, World } from './world.ts'
import { laneX } from './world.ts'

// Capitán Almeja pelea mientras corres: va adelante, lanza anclas que bloquean carriles y
// barriles que hay que devolverle con el giro. Tres golpes y se libera el Lumi de la playa.

type Attack = 'anchor1' | 'anchor2' | 'barrel'
const PATTERN: Attack[] = ['anchor1', 'anchor2', 'anchor1', 'barrel', 'anchor2', 'anchor1', 'anchor2', 'barrel']

const AHEAD = 34 // metros delante de Kiko
const ANCHOR_FLIGHT = 1.0

interface Anchor {
  obj: THREE.Group
  marker: THREE.Mesh
  from: THREE.Vector3
  to: THREE.Vector3
  t: number
  lane: number
}

interface Returning {
  e: Entity
  from: THREE.Vector3
  t: number
}

export interface BossEvents {
  onHit(hitsLeft: number): void
  onDefeated(): void
  say(text: string): void
}

export class BossFight {
  readonly maxHits = 3
  private model: BossModel
  private lumi: THREE.Group
  active = false
  state: 'intro' | 'fight' | 'defeat' | 'done' = 'done'
  hits = 0
  private t = 0
  private next = 0
  private step = 0
  private x = 0
  private targetX = 0
  private flash = 0
  private anchors: Anchor[] = []
  private returning: Returning[] = []
  private anchorModels: THREE.Group[] = []
  private scene: THREE.Scene
  readonly pos = new THREE.Vector3()

  constructor(scene: THREE.Scene) {
    this.scene = scene
    this.model = buildBoss()
    this.model.root.visible = false
    scene.add(this.model.root)
    this.lumi = buildLumi()
    this.lumi.visible = false
    scene.add(this.lumi)
  }

  start(): void {
    this.active = true
    this.state = 'intro'
    this.hits = 0
    this.t = 0
    this.step = 0
    this.next = 3
    this.x = 0
    this.model.root.visible = true
  }

  stop(): void {
    this.active = false
    this.state = 'done'
    this.model.root.visible = false
    this.lumi.visible = false
    for (const a of this.anchors) {
      this.scene.remove(a.obj, a.marker)
    }
    this.anchors = []
    this.returning = []
  }

  /** Un barril pateado con el giro vuela de regreso al jefe. */
  deflect(e: Entity): void {
    e.state = 'returning'
    this.returning.push({ e, from: e.obj.position.clone(), t: 0 })
  }

  update(dt: number, player: Player, world: World, fx: Effects, audio: Audio, cam: CameraRig, ev: BossEvents): void {
    if (!this.active) return
    this.t += dt
    const pz = player.z
    const bob = Math.sin(this.t * 2.2) * 0.3
    const m = this.model

    // Posición: entra volando desde arriba, luego se mantiene adelante
    let y = 2.2 + bob
    if (this.state === 'intro') {
      const k = Math.min(1, this.t / 2.5)
      y = 2.2 + (1 - k) * 18
      if (this.t > 2.5) {
        this.state = 'fight'
        this.t = 0
      }
    }
    this.x += (this.targetX - this.x) * Math.min(1, dt * 2.5)
    this.pos.set(this.x, y, pz + AHEAD)
    m.root.position.copy(this.pos)
    m.root.rotation.z = Math.sin(this.t * 1.7) * 0.08
    m.root.getObjectsByProperty('name', 'flame').forEach((f) => (f.scale.y = 0.7 + Math.random() * 0.5))
    m.eye.lookAt(player.x, player.y + 1, player.z)
    m.eye.rotateY(Math.PI) // el ojo mira por -z
    m.lid.rotation.x = 0.25 + Math.max(0, Math.sin(this.t * 3)) * 0.3
    m.arm.rotation.z = Math.sin(this.t * 4) * 0.3

    this.flash = Math.max(0, this.flash - dt)
    m.shellMat.color.copy(this.flash > 0 && Math.floor(this.flash * 20) % 2 === 0 ? new THREE.Color(0xffffff) : m.baseColor)

    if (this.state === 'fight') {
      this.next -= dt
      if (this.next <= 0) this.attack(player, audio)
      this.releaseBarrel(world, audio)
    }

    // Anclas en el aire
    for (let i = this.anchors.length - 1; i >= 0; i--) {
      const a = this.anchors[i]
      a.t += dt / ANCHOR_FLIGHT
      const k = Math.min(1, a.t)
      a.obj.position.lerpVectors(a.from, a.to, k)
      a.obj.position.y += Math.sin(Math.PI * k) * 6
      a.obj.rotation.x = (1 - k) * 4
      const ring = a.marker.material as THREE.MeshBasicMaterial
      ring.opacity = 0.4 + Math.sin(this.t * 20) * 0.3
      a.marker.scale.setScalar(0.6 + k * 0.6)
      if (k >= 1) {
        this.scene.remove(a.obj, a.marker)
        this.anchorModels.push(a.obj)
        this.anchors.splice(i, 1)
        world.addLoose('anchor', a.lane, a.to.z, 0)
        fx.dust(a.to, 10)
        audio.play('anchor')
        cam.addShake(0.35)
      }
    }

    // Barriles devueltos con el giro
    for (let i = this.returning.length - 1; i >= 0; i--) {
      const r = this.returning[i]
      r.t += dt / 0.6
      const k = Math.min(1, r.t)
      r.e.obj.position.lerpVectors(r.from, this.pos, k)
      r.e.obj.position.y += Math.sin(Math.PI * k) * 3
      r.e.obj.rotation.x += dt * 15
      if (k >= 1) {
        this.returning.splice(i, 1)
        world.removeEntity(r.e)
        fx.explosion(this.pos.clone())
        audio.play('bossHit')
        audio.play('explosion')
        cam.addShake(0.5)
        if (this.state !== 'fight') continue
        this.hits++
        this.flash = 1.2
        this.next = 2.2
        if (this.hits >= this.maxHits) {
          this.state = 'defeat'
          this.t = 0
          ev.onDefeated()
        } else {
          ev.say(['¡Ay, mi concha!', '¡Esto no se queda así, coatí!'][this.hits - 1] ?? '¡Ay!')
          ev.onHit(this.maxHits - this.hits)
        }
      }
    }

    if (this.state === 'defeat') {
      // Gira, echa humo y se hunde; el Lumi sale volando
      m.root.rotation.y += dt * 8
      m.root.position.y = 2.2 - this.t * 2
      if (Math.random() < dt * 8) fx.explosion(this.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 3, Math.random() * 2, 0)))
      this.lumi.visible = true
      this.lumi.position.set(this.pos.x, 2 + this.t * 3, this.pos.z - this.t * 6)
      this.lumi.scale.setScalar(1 + Math.sin(this.t * 10) * 0.1)
      if (this.t > 3) {
        this.stop()
      }
    }
  }

  private attack(player: Player, audio: Audio): void {
    const kind = PATTERN[this.step % PATTERN.length]
    this.step++
    const speedUp = 1 - this.hits * 0.15
    const lanes = [-1, 0, 1]
    if (kind === 'barrel') {
      this.targetX = laneX(player.lane)
      this.pendingBarrel = player.lane
      this.next = 3.0 * speedUp
      return
    }
    const count = kind === 'anchor1' ? 1 : 2
    const picked: number[] = []
    if (count === 1) picked.push(player.lane)
    else {
      const free = lanes[Math.floor(Math.random() * 3)]
      picked.push(...lanes.filter((l) => l !== free))
    }
    for (const lane of picked) {
      const obj = this.anchorModels.pop() ?? this.newAnchor()
      const to = new THREE.Vector3(laneX(lane), 0, player.z + 26)
      const marker = buildMarker()
      marker.position.set(to.x, 0.05, to.z)
      this.scene.add(obj, marker)
      this.anchors.push({ obj, marker, from: this.pos.clone(), to, t: 0, lane })
    }
    this.targetX = laneX(picked[0])
    audio.play('throw')
    this.next = 1.8 * speedUp
  }

  /** El barril se suelta en el siguiente cuadro para que el jefe llegue a ese carril. */
  pendingBarrel: number | null = null

  releaseBarrel(world: World, audio: Audio): void {
    if (this.pendingBarrel === null || Math.abs(this.x - this.targetX) > 0.4) return
    const lane = this.pendingBarrel
    this.pendingBarrel = null
    const e = world.addLoose('barrel', lane, this.pos.z - 3, 0)
    e.state = 'rolling'
    e.vz = -6
    audio.play('throw')
  }

  private newAnchor(): THREE.Group {
    return buildAnchor()
  }
}
