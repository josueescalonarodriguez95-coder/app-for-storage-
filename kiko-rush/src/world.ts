import * as THREE from 'three'
import { CHUNK_LENGTH, LANE_WIDTH } from './config.ts'
import type { LevelGenerator } from './level/generator.ts'
import type { CameraMode, Chunk, ItemType, Platform } from './level/types.ts'
import { CRATE_SIZE, buildAnchor, buildItem } from './models/props.ts'
import { buildDecor, buildGroundPiece, buildPlatformPiece, sizeGroundPiece, sizePlatform } from './models/scenery.ts'
import type { DecorKind } from './models/scenery.ts'
import type { Rng } from './rng.ts'

export type EntityType = ItemType | 'anchor'

export type EntityState = 'idle' | 'rolling' | 'flying' | 'returning' | 'gone'

export interface Entity {
  type: EntityType
  x: number
  y: number
  z: number
  lane: number
  obj: THREE.Group
  alive: boolean
  state: EntityState
  vx: number
  vy: number
  vz: number
  t: number
  cooldown: number
  magnet: boolean
  chunk: ActiveChunk | null
}

export interface PlatformRT {
  def: Platform
  obj: THREE.Group
  x: number
  width: number
  base: number // z del bloque
  z0: number
  z1: number
  y: number
}

export interface ActiveChunk {
  start: number
  end: number
  mode: CameraMode
  chunk: Chunk
  entities: Entity[]
  ground: THREE.Mesh[]
  platforms: PlatformRT[]
  decor: { kind: DecorKind; obj: THREE.Group }[]
  gaps: { z0: number; z1: number; lanes: number[] }[]
}

export const laneX = (lane: number) => lane * LANE_WIDTH

/** Tamaños de choque por tipo: ancho (x), alto (y), fondo (z). `yMin` para lo que está elevado del piso. */
export const HITBOX: Partial<Record<EntityType, { w: number; h: number; d: number; yMin?: number }>> = {
  log: { w: 2.0, h: 0.72, d: 0.7 },
  palm: { w: 2.1, h: 3.0, d: 0.6, yMin: 0.95 },
  turtle: { w: 1.3, h: 0.85, d: 1.2 },
  magmo: { w: 0.95, h: 1.15, d: 0.8 },
  crab: { w: 1.3, h: 0.75, d: 0.9 },
  barrel: { w: 0.85, h: 1.0, d: 0.85 },
  box: { w: CRATE_SIZE, h: CRATE_SIZE, d: CRATE_SIZE },
  question: { w: CRATE_SIZE, h: CRATE_SIZE, d: CRATE_SIZE },
  chispa: { w: CRATE_SIZE, h: CRATE_SIZE, d: CRATE_SIZE },
  arrow: { w: CRATE_SIZE, h: CRATE_SIZE, d: CRATE_SIZE },
  iron: { w: CRATE_SIZE, h: CRATE_SIZE, d: CRATE_SIZE },
  anchor: { w: 1.6, h: 3.0, d: 0.6 },
}

/** Pool de objetos 3D por tipo: lo que queda atrás se reutiliza adelante. */
class Pool {
  private free = new Map<string, THREE.Group[]>()
  private make: (key: string) => THREE.Group
  constructor(make: (key: string) => THREE.Group) {
    this.make = make
  }
  get(key: string): THREE.Group {
    const list = this.free.get(key)
    const obj = list?.pop() ?? this.make(key)
    obj.visible = true
    obj.userData.poolKey = key
    return obj
  }
  release(obj: THREE.Group): void {
    obj.visible = false
    obj.parent?.remove(obj)
    const key = obj.userData.poolKey as string
    let list = this.free.get(key)
    if (!list) this.free.set(key, (list = []))
    list.push(obj)
  }
}

const DECOR_KINDS: DecorKind[] = ['palm', 'palm', 'palm', 'rock', 'bush', 'bush', 'torch', 'hut', 'post']

export class World {
  readonly group = new THREE.Group()
  chunks: ActiveChunk[] = []
  private itemPool = new Pool((key) => (key === 'anchor' ? buildAnchor() : buildItem(key as ItemType)))
  private decorPool = new Pool((key) => buildDecor(key as DecorKind))
  private groundPool: THREE.Mesh[] = []
  private platformPool: THREE.Group[] = []
  private beachL: THREE.Mesh
  private beachR: THREE.Mesh
  private nextStart = 0
  generator!: LevelGenerator
  rng!: Rng
  calm = () => false
  time = 0
  /** Entidades sueltas (anclas y barriles del jefe) que no pertenecen a ningún bloque. */
  loose: Entity[] = []

  constructor(scene: THREE.Scene) {
    scene.add(this.group)
    const beachMat = new THREE.MeshToonMaterial({ color: 0xf0cf92 })
    const beachGeo = new THREE.BoxGeometry(14, 1, 400)
    this.beachL = new THREE.Mesh(beachGeo, beachMat)
    this.beachR = new THREE.Mesh(beachGeo, beachMat)
    this.beachL.position.set(-11.4, -0.85, 0)
    this.beachR.position.set(11.4, -0.85, 0)
    this.group.add(this.beachL, this.beachR)
  }

  reset(generator: LevelGenerator, rng: Rng): void {
    for (const c of this.chunks) this.releaseChunk(c)
    for (const e of this.loose) this.itemPool.release(e.obj)
    this.chunks = []
    this.loose = []
    this.generator = generator
    this.rng = rng
    this.nextStart = 0
    this.spawn(generator.first().chunk, 'run', [])
  }

  private spawn(chunk: Chunk, mode: CameraMode, extra: Chunk['items']): void {
    const start = this.nextStart
    const ac: ActiveChunk = { start, end: start + CHUNK_LENGTH, mode, chunk, entities: [], ground: [], platforms: [], decor: [], gaps: [] }
    const side = mode === 'side'

    // Huecos: en vista lateral cubren todo el ancho para que se vean desde el costado.
    ac.gaps = chunk.gaps.map((g) => ({ z0: start + g.z, z1: start + g.z + g.len, lanes: side ? [-1, 0, 1] : g.lanes }))

    // Piso: tramos sólidos por carril.
    for (const lane of [-1, 0, 1]) {
      const cuts = ac.gaps.filter((g) => g.lanes.includes(lane)).sort((a, b) => a.z0 - b.z0)
      let z = start
      const pieces: [number, number][] = []
      for (const g of cuts) {
        if (g.z0 > z) pieces.push([z, g.z0])
        z = Math.max(z, g.z1)
      }
      if (z < ac.end) pieces.push([z, ac.end])
      const width = lane === 0 ? LANE_WIDTH : LANE_WIDTH + 0.7
      const x = laneX(lane) + (lane === 0 ? 0 : lane * 0.35)
      for (const [z0, z1] of pieces) {
        const mesh = this.groundPool.pop() ?? buildGroundPiece()
        sizeGroundPiece(mesh, x, width + 0.01, z0, z1 + 0.01)
        const tex = ((mesh.material as THREE.Material[])[2] as THREE.MeshToonMaterial).map
        if (tex) tex.repeat.set(1, 1)
        this.group.add(mesh)
        ac.ground.push(mesh)
      }
    }

    for (const p of chunk.platforms) {
      const obj = this.platformPool.pop() ?? buildPlatformPiece()
      const lanesW = side ? 3 : (p.width ?? 1)
      const width = lanesW * LANE_WIDTH - 0.2
      sizePlatform(obj, width, p.len)
      this.group.add(obj)
      ac.platforms.push({ def: p, obj, x: side ? 0 : laneX(p.lane), width, base: start, z0: start + p.z, z1: start + p.z + p.len, y: p.y })
    }

    for (const item of [...chunk.items, ...extra]) {
      if (side && item.lane !== 0) continue
      const e = this.makeEntity(item.type, item.lane, start + item.z, item.y ?? (item.type === 'fruit' ? 0.7 : item.type === 'gem' ? 1.0 : item.type.startsWith('pu_') ? 1.1 : 0))
      e.chunk = ac
      ac.entities.push(e)
    }

    // Decoración a los lados. En vista lateral nada del lado de la cámara (x < 0).
    const count = 7
    for (const sx of [-1, 1]) {
      if (side && sx < 0) continue
      for (let i = 0; i < count; i++) {
        const kind = this.rng.pick(DECOR_KINDS)
        const obj = this.decorPool.get(kind)
        const near = kind === 'torch' || kind === 'post' || kind === 'bush'
        const minX = near ? 5.2 : kind === 'hut' ? 9.5 : 6.5
        obj.position.set(sx * (minX + this.rng.range(0, near ? 1.5 : 7)), -0.35, start + this.rng.range(0, CHUNK_LENGTH))
        obj.rotation.y = this.rng.range(0, Math.PI * 2)
        obj.scale.setScalar(0.85 + this.rng.range(0, 0.4))
        this.group.add(obj)
        ac.decor.push({ kind, obj })
      }
    }

    this.chunks.push(ac)
    this.nextStart = ac.end
  }

  makeEntity(type: EntityType, lane: number, z: number, y: number): Entity {
    const obj = this.itemPool.get(type)
    const x = laneX(lane)
    obj.position.set(x, y, z)
    obj.rotation.set(0, 0, 0)
    obj.scale.setScalar(1)
    const anim = obj.getObjectByName('anim')
    if (anim) anim.rotation.set(0, 0, 0)
    this.group.add(obj)
    return { type, x, y, z, lane, obj, alive: true, state: 'idle', vx: 0, vy: 0, vz: 0, t: Math.random() * 10, cooldown: 0, magnet: false, chunk: null }
  }

  addLoose(type: EntityType, lane: number, z: number, y: number): Entity {
    const e = this.makeEntity(type, lane, z, y)
    this.loose.push(e)
    return e
  }

  removeEntity(e: Entity): void {
    e.alive = false
    e.state = 'gone'
    e.obj.visible = false
  }

  private releaseChunk(c: ActiveChunk): void {
    for (const e of c.entities) this.itemPool.release(e.obj)
    for (const g of c.ground) {
      this.group.remove(g)
      this.groundPool.push(g)
    }
    for (const p of c.platforms) {
      this.group.remove(p.obj)
      this.platformPool.push(p.obj)
    }
    for (const d of c.decor) this.decorPool.release(d.obj)
  }

  /** Pide bloques nuevos hacia adelante y recicla los que quedaron atrás. */
  update(dt: number, playerZ: number): void {
    this.time += dt
    while (this.nextStart < playerZ + 170) {
      const plan = this.generator.next(this.nextStart, this.calm())
      this.spawn(plan.chunk, plan.mode, plan.extra)
    }
    while (this.chunks.length && this.chunks[0].end < playerZ - 75) this.releaseChunk(this.chunks.shift()!)
    for (let i = this.loose.length - 1; i >= 0; i--) {
      const e = this.loose[i]
      if (!e.alive || e.z < playerZ - 40) {
        this.itemPool.release(e.obj)
        this.loose.splice(i, 1)
      }
    }
    this.beachL.position.z = this.beachR.position.z = playerZ

    const t = this.time
    for (const c of this.chunks) {
      for (const p of c.platforms) {
        const d = p.def
        const w = d.period ? Math.sin((t * Math.PI * 2) / d.period) * (d.amp ?? 0) : 0
        p.y = d.y + (d.move === 'up' ? w : 0)
        p.z0 = p.base + d.z + (d.move === 'fwd' ? w : 0)
        p.z1 = p.z0 + d.len
        p.obj.position.set(p.x, p.y, (p.z0 + p.z1) / 2)
      }
      for (const e of c.entities) this.animate(e, t, playerZ)
      for (const d of c.decor) {
        if (d.kind === 'torch') {
          const f = d.obj.getObjectByName('flame')
          if (f) f.scale.set(0.2, 0.5 + Math.sin(t * 20 + d.obj.position.z) * 0.08, 0.2)
        }
      }
    }
    for (const e of this.loose) this.animate(e, t, playerZ)
  }

  private animate(e: Entity, t: number, playerZ: number): void {
    if (!e.alive) return
    const anim = e.obj.getObjectByName('anim')
    switch (e.type) {
      case 'fruit':
      case 'gem':
        if (anim) anim.rotation.y = t * 3 + e.z
        if (!e.magnet) e.obj.position.y = e.y + Math.sin(t * 3 + e.z) * 0.08
        break
      case 'magmo':
        if (anim && e.state === 'idle') {
          anim.rotation.z = Math.sin(t * 8 + e.z) * 0.15
          e.obj.position.x = e.x + Math.sin(t * 1.5 + e.z) * 0.25
        }
        break
      case 'crab':
        if (anim && e.state === 'idle') {
          e.obj.position.x = e.x + Math.sin(t * 3 + e.z) * 0.3
          const cl = anim.getObjectByName('clawL')
          const cr = anim.getObjectByName('clawR')
          if (cl) cl.rotation.z = Math.sin(t * 10) * 0.3
          if (cr) cr.rotation.z = -Math.sin(t * 10) * 0.3
        }
        break
      case 'turtle':
        if (anim) anim.position.y = Math.abs(Math.sin(t * 4 + e.z)) * 0.04
        break
      case 'barrel': {
        const spark = e.obj.getObjectByName('spark')
        if (spark) spark.scale.setScalar(0.4 + Math.random() * 0.3)
        break
      }
      case 'wave': {
        // La ola entra de lado cuando Kiko se acerca; después la arena queda mojada.
        const foam = e.obj.getObjectByName('foam')
        const dz = e.z - playerZ
        const k = THREE.MathUtils.clamp(1 - (dz - 8) / 22, 0, 1)
        if (foam) {
          foam.position.x = (1 - k) * 5 * (e.lane >= 0 ? 1 : -1)
          foam.visible = k < 0.98
          foam.scale.y = 1 + Math.sin(t * 6) * 0.2
        }
        const wet = e.obj.getObjectByName('wet')
        if (wet) wet.visible = k > 0.4
        break
      }
      default:
        if (e.type.startsWith('pu_') && anim) {
          anim.rotation.y = t * 2
          e.obj.position.y = e.y + Math.sin(t * 2.5 + e.z) * 0.12
        }
    }
  }

  laneAt(x: number): number {
    return THREE.MathUtils.clamp(Math.round(x / LANE_WIDTH), -1, 1)
  }

  chunkAt(z: number): ActiveChunk | undefined {
    return this.chunks.find((c) => z >= c.start && z < c.end)
  }

  modeAt(z: number): CameraMode | undefined {
    return this.chunkAt(z)?.mode
  }

  inGap(lane: number, z: number): boolean {
    const c = this.chunkAt(z)
    if (!c) return false
    return c.gaps.some((g) => z >= g.z0 && z <= g.z1 && g.lanes.includes(lane))
  }

  /**
   * Altura del piso debajo de (x, z) para alguien cuyos pies están en `feetY`.
   * Las plataformas y cajas de hierro sólo cuentan si se viene desde arriba.
   * -Infinity = hueco (se cae al agua).
   */
  groundAt(x: number, z: number, feetY: number): { y: number; iron?: Entity; platform?: PlatformRT } {
    const lane = this.laneAt(x)
    let best: { y: number; iron?: Entity; platform?: PlatformRT } = { y: this.inGap(lane, z) ? -Infinity : 0 }
    for (const c of this.chunks) {
      if (z < c.start - 5 || z > c.end + 5) continue
      for (const p of c.platforms) {
        if (Math.abs(x - p.x) > p.width / 2 + 0.2 || z < p.z0 - 0.3 || z > p.z1 + 0.3) continue
        if (feetY >= p.y - 0.3 && p.y > best.y) best = { y: p.y, platform: p }
      }
      for (const e of c.entities) {
        if (e.type !== 'iron' || !e.alive) continue
        if (Math.abs(x - e.x) > 0.8 || Math.abs(z - e.z) > 0.8) continue
        const top = e.y + CRATE_SIZE
        if (feetY >= top - 0.3 && top > best.y) best = { y: top, iron: e }
      }
    }
    return best
  }

  *nearby(z: number, range: number): Generator<Entity> {
    for (const c of this.chunks) {
      if (z + range < c.start || z - range > c.end) continue
      for (const e of c.entities) if (e.alive && Math.abs(e.z - z) <= range) yield e
    }
    for (const e of this.loose) if (e.alive && Math.abs(e.z - z) <= range) yield e
  }

  /** Pista vacía para el fondo del menú. */
  clearItems(): void {
    for (const c of this.chunks) for (const e of c.entities) this.removeEntity(e)
  }

  /** Borra peligros cerca de un punto (al reaparecer después de perder una vida). */
  clearHazards(z0: number, z1: number): void {
    for (const e of this.nearby((z0 + z1) / 2, (z1 - z0) / 2)) {
      if (HITBOX[e.type] && e.type !== 'box' && e.type !== 'question' && e.type !== 'chispa') this.removeEntity(e)
    }
  }
}
