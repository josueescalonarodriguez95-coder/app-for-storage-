import * as THREE from 'three'
import { Audio } from './audio.ts'
import type { Theme } from './audio.ts'
import { BossFight } from './boss.ts'
import { CameraRig } from './camera.ts'
import {
  ARROW_BOUNCE_VELOCITY,
  BOUNCE_VELOCITY,
  CHISPA_INVINCIBLE_TIME,
  CHISPA_MAGNET_RADIUS,
  GUAYABAS_PER_LIFE,
  INVULNERABLE_AFTER_HIT,
  ISLAND,
  MAGNET_RADIUS,
  MAX_SPEED,
  MIN_SPEED,
  PLAYER_HALF_DEPTH,
  PLAYER_HALF_WIDTH,
  REVIVE_COST,
  STARTING_LIVES,
  UPGRADE_COSTS,
  powerUpDuration,
  speedAt,
} from './config.ts'
import type { PowerUpKind } from './config.ts'
import { Effects } from './effects.ts'
import { Input } from './input.ts'
import type { Action } from './input.ts'
import { LevelGenerator } from './level/generator.ts'
import type { CameraMode } from './level/types.ts'
import { poseRig } from './models/characters.ts'
import { buildCoconut } from './models/props.ts'
import { SUN_DIR, WATER_Y, animateSea, buildEnvSky, buildGull, buildIsland, buildSea, buildSky, buildVolcano } from './models/scenery.ts'
import type { Sky } from 'three/examples/jsm/objects/Sky.js'
import { Player } from './player.ts'
import type { DeathKind, LandInfo } from './player.ts'
import { Rng, hashString, todayKey } from './rng.ts'
import { CHARACTERS, applyRunToMissions, emptyStats, loadSave, persist } from './save.ts'
import type { CharacterId, RunStats, SaveData } from './save.ts'
import { UI } from './ui.ts'
import { HITBOX, World } from './world.ts'
import type { Entity } from './world.ts'

type RunKind = 'adventure' | 'endless' | 'daily'
type State = 'menu' | 'playing' | 'paused' | 'over'

const DAILY_RULES = [
  { id: 'sin-giro', name: 'Sin giro' },
  { id: 'solo-persecuciones', name: 'Sólo persecuciones' },
  { id: 'turbo', name: 'Turbo: todo 20% más rápido' },
] as const
type DailyRule = (typeof DAILY_RULES)[number]['id']

const MODE_NAMES: Record<CameraMode, string> = { run: '¡A correr!', chase: '¡Persecución!', side: '¡Vista lateral!' }

const HAZARDS = new Set(['log', 'palm', 'turtle', 'magmo', 'crab', 'barrel', 'anchor'])
const LOW_OBSTACLES = new Set(['log', 'turtle', 'crab', 'barrel', 'magmo', 'iron'])

export class Game {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private cam: CameraRig
  private world: World
  private player: Player
  private fx: Effects
  private boss: BossFight
  private audio = new Audio()
  private input: Input
  private ui = new UI()
  private save: SaveData
  private sea: THREE.Mesh
  private sky: Sky
  private volcano: THREE.Group
  private islands: { obj: THREE.Group; offset: THREE.Vector3 }[] = []
  private gulls: { obj: THREE.Group; phase: number; r: number; h: number }[] = []
  private coconut: THREE.Group
  private sun: THREE.DirectionalLight

  private state: State = 'menu'
  private runKind: RunKind = 'adventure'
  private dailyRule: DailyRule | null = null
  private last = 0
  private time = 0

  // Estado de la partida
  private score = 0
  private fruits = 0
  private gems = 0
  private lives = STARTING_LIVES
  private lifeCounter = 0
  private stats: RunStats = emptyStats()
  private timers: Record<PowerUpKind, number> = { magnet: 0, skate: 0, rocket: 0, double: 0 }
  private totals: Record<PowerUpKind, number> = { magnet: 1, skate: 1, rocket: 1, double: 1 }
  private chispaInv = 0
  private deathTimer = 0
  private reviveUsed = false
  private prevFeet = 0
  private movers: Entity[] = []
  private warnedAt = -1
  private chaseHit = false
  private coconutState: 'off' | 'in' | 'on' | 'out' = 'off'
  private coconutT = 0
  private bossDone = false
  private calmBoss = false
  private storyStep = 0
  private arrowCooldown = 0
  private hintsThisRun = new Set<string>()
  private hintCooldown = 0
  private startedRun = false
  private lastMilestone = 0
  private perf = { frames: 0, time: 0, checked: false }
  /** Sólo con ?debug en la URL: invencible y saltos de distancia para probar. */
  god = false

  constructor(canvas: HTMLCanvasElement) {
    this.save = loadSave()
    this.audio.muted = this.save.muted
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.0
    this.renderer.shadowMap.type = THREE.PCFShadowMap

    // Cielo físico y luz de sol con sombras suaves
    this.sky = buildSky()
    this.scene.add(this.sky)
    this.scene.fog = new THREE.Fog(0xcfe6ef, 70, 300)
    this.scene.add(new THREE.HemisphereLight(0xcfeaff, 0xd9b98a, 0.5))
    this.sun = new THREE.DirectionalLight(0xfff0d8, 2.6)
    this.sun.shadow.radius = 3
    this.sun.shadow.camera.left = -14
    this.sun.shadow.camera.right = 14
    this.sun.shadow.camera.top = 22
    this.sun.shadow.camera.bottom = -10
    this.sun.shadow.camera.near = 1
    this.sun.shadow.camera.far = 70
    this.sun.shadow.bias = -0.0006
    this.sun.shadow.normalBias = 0.03
    this.scene.add(this.sun, this.sun.target)
    // Reflejo del cielo para todos los materiales (metal, ojos, caparazones)
    const pmrem = new THREE.PMREMGenerator(this.renderer)
    const envScene = new THREE.Scene()
    envScene.add(buildEnvSky())
    this.scene.environment = pmrem.fromScene(envScene, 0, 1, 1000).texture
    this.scene.environmentIntensity = 0.6
    pmrem.dispose()

    this.sea = buildSea()
    this.volcano = buildVolcano()
    this.scene.add(this.sea, this.volcano)
    for (const [x, z, sc] of [
      [-150, 260, 1],
      [170, 300, 1.3],
      [-260, 380, 1.6],
      [120, 520, 2],
    ]) {
      const obj = buildIsland()
      obj.scale.setScalar(sc)
      this.islands.push({ obj, offset: new THREE.Vector3(x, WATER_Y, z) })
      this.scene.add(obj)
    }
    for (let i = 0; i < 4; i++) {
      const obj = buildGull()
      this.gulls.push({ obj, phase: Math.random() * 6, r: 8 + Math.random() * 10, h: 10 + Math.random() * 6 })
      this.scene.add(obj)
    }
    this.applyQuality()

    this.cam = new CameraRig(window.innerWidth / window.innerHeight)
    this.world = new World(this.scene)
    this.world.calm = () => this.calmBoss
    this.player = new Player(this.scene)
    this.player.setCharacter(this.save.character)
    this.fx = new Effects(this.scene)
    this.boss = new BossFight(this.scene)
    this.coconut = buildCoconut()
    this.coconut.visible = false
    this.scene.add(this.coconut)

    this.input = new Input(canvas)
    this.bindUI()
    this.resize()
    window.addEventListener('resize', () => this.resize())
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === 'playing') this.pause()
    })

    // Pista de adorno para el menú
    this.world.reset(new LevelGenerator(new Rng(7)), new Rng(7))
    this.world.update(0, 0)
    this.world.clearItems()
    this.ui.renderTitle(this.save)
    this.ui.doneLoading()
    requestAnimationFrame((t) => this.frame(t))
  }

  /** Calidad gráfica: alta (PC), media (celular), baja (celulares viejos). */
  private applyQuality(): void {
    const q = this.save.quality
    const dpr = window.devicePixelRatio || 1
    this.renderer.setPixelRatio(q === 'alta' ? Math.min(dpr, 2) : q === 'media' ? Math.min(dpr, 1.5) : 1)
    const shadows = q !== 'baja'
    this.renderer.shadowMap.enabled = shadows
    this.sun.castShadow = shadows
    const size = q === 'alta' ? 2048 : 1024
    if (this.sun.shadow.mapSize.x !== size) {
      this.sun.shadow.mapSize.set(size, size)
      this.sun.shadow.map?.dispose()
      this.sun.shadow.map = null
    }
    this.scene.traverse((o) => {
      const mat = (o as THREE.Mesh).material
      if (mat) for (const mm of Array.isArray(mat) ? mat : [mat]) mm.needsUpdate = true
    })
    if (this.cam) this.resize()
  }

  // ---------- Menús ----------

  private bindUI(): void {
    const unlock = () => {
      this.audio.unlock()
      if (this.state === 'menu') this.audio.playMusic('menu')
    }
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)

    this.ui.on('btn-play', () => this.beginRun('adventure'))
    this.ui.on('btn-endless', () => (this.save.bossDefeated ? this.beginRun('endless') : this.ui.toast('Vence al Capitán Almeja')))
    this.ui.on('btn-daily', () => (this.save.bossDefeated ? this.beginRun('daily') : this.ui.toast('Vence al Capitán Almeja')))
    this.ui.on('btn-upgrades', () => {
      this.click()
      this.renderUpgrades()
      this.ui.show('upgrades')
    })
    this.ui.on('btn-missions', () => {
      this.click()
      this.ui.renderMissions(this.save)
      this.ui.show('missions')
    })
    this.ui.on('btn-chars', () => {
      this.click()
      this.renderChars()
      this.ui.show('chars')
    })
    this.ui.onClose(() => {
      this.click()
      this.ui.renderTitle(this.save)
    })
    this.ui.on('btn-sound', () => {
      this.save.muted = !this.save.muted
      this.audio.setMuted(this.save.muted)
      persist(this.save)
      this.ui.renderTitle(this.save)
    })
    this.ui.on('btn-quality', () => {
      const order = ['alta', 'media', 'baja'] as const
      this.save.quality = order[(order.indexOf(this.save.quality) + 1) % 3]
      persist(this.save)
      this.applyQuality()
      this.ui.renderTitle(this.save)
      this.click()
    })
    this.ui.on('btn-story-next', () => {
      this.click()
      this.storyStep++
      if (this.storyStep >= this.ui.storyLength) this.finishStory()
      else this.ui.story(this.storyStep)
    })
    this.ui.on('btn-story-skip', () => this.finishStory())
    this.ui.on('btn-pause', () => this.pause())
    this.ui.on('btn-resume', () => this.resume())
    this.ui.on('btn-quit', () => this.toMenu())
    this.ui.on('btn-menu', () => this.toMenu())
    this.ui.on('btn-again', () => this.beginRun(this.runKind))
    this.ui.on('btn-revive', () => this.revive())
  }

  private click(): void {
    this.audio.unlock()
    this.audio.play('click')
  }

  private renderUpgrades(): void {
    this.ui.renderUpgrades(this.save, (kind) => {
      const lvl = this.save.upgrades[kind]
      const cost = UPGRADE_COSTS[lvl - 1]
      if (lvl >= 5 || this.save.guayabas < cost) return
      this.save.guayabas -= cost
      this.save.upgrades[kind] = lvl + 1
      persist(this.save)
      this.audio.play('powerup')
      this.renderUpgrades()
      this.ui.renderTitle(this.save)
    })
  }

  private renderChars(): void {
    this.ui.renderChars(this.save, (id: CharacterId) => {
      const c = CHARACTERS.find((x) => x.id === id)!
      if (!this.save.owned.includes(id)) {
        if (this.save.gems < c.price) return
        this.save.gems -= c.price
        this.save.owned.push(id)
        this.audio.play('gem')
      } else this.click()
      this.save.character = id
      persist(this.save)
      this.player.setCharacter(id)
      this.renderChars()
      this.ui.renderTitle(this.save)
    })
  }

  private finishStory(): void {
    this.click()
    this.save.seenIntro = true
    persist(this.save)
    this.ui.hide('story')
    this.beginRun('adventure')
  }

  private toMenu(): void {
    this.click()
    this.state = 'menu'
    this.input.enabled = false
    this.boss.stop()
    this.ui.hideAllModals()
    this.ui.setHud(false)
    this.ui.clearMessages()
    this.ui.renderTitle(this.save)
    this.ui.show('title')
    this.player.reset()
    this.coconut.visible = false
    this.coconutState = 'off'
    document.getElementById('app')!.classList.remove('chase')
    this.audio.tempo = 1
    this.world.reset(new LevelGenerator(new Rng(7)), new Rng(7))
    this.world.update(0, 0)
    this.world.clearItems()
    this.cam.switchTo('run', true)
    this.audio.playMusic('menu')
  }

  private pause(): void {
    if (this.state !== 'playing') return
    this.state = 'paused'
    this.ui.controlsHelp(this.input.usedTouch)
    this.ui.show('pause')
  }

  private resume(): void {
    this.click()
    this.ui.hide('pause')
    this.state = 'playing'
    this.last = performance.now()
  }

  // ---------- Partida ----------

  private beginRun(kind: RunKind): void {
    this.audio.unlock()
    if (!this.save.seenIntro && kind === 'adventure') {
      this.storyStep = 0
      this.ui.story(0)
      this.ui.show('story')
      return
    }
    this.click()
    this.runKind = kind
    let seed = Math.floor(Math.random() * 2 ** 31)
    this.dailyRule = null
    if (kind === 'daily') {
      seed = hashString(`kiko-${todayKey()}`)
      this.dailyRule = new Rng(seed).pick(DAILY_RULES).id
    }
    const rng = new Rng(seed)
    const gen = new LevelGenerator(rng, { onlyMode: this.dailyRule === 'solo-persecuciones' ? 'chase' : undefined })
    this.world.reset(gen, rng)
    this.player.reset()
    this.player.setCharacter(this.save.character)
    this.fx.clear()
    this.boss.stop()
    this.movers = []
    this.score = this.fruits = this.gems = this.lifeCounter = 0
    this.lives = STARTING_LIVES
    this.stats = emptyStats()
    this.timers = { magnet: 0, skate: 0, rocket: 0, double: 0 }
    this.chispaInv = 0
    this.deathTimer = 0
    this.reviveUsed = false
    this.banked = { fruits: 0, gems: 0 }
    this.warnedAt = -1
    this.chaseHit = false
    this.coconutState = 'off'
    this.coconut.visible = false
    this.bossDone = !(kind === 'adventure' && this.save.bossUnlocked && !this.save.bossDefeated)
    this.calmBoss = false
    this.hintsThisRun.clear()
    this.hintCooldown = 1.5
    this.startedRun = false
    this.lastMilestone = 0
    this.audio.tempo = 1
    this.cam.switchTo('run', true)
    this.ui.hideAllModals()
    this.ui.hide('title')
    this.ui.clearMessages()
    this.ui.setHud(true)
    this.ui.bossBar(false)
    this.state = 'playing'
    this.input.enabled = true
    this.input.clear()
    this.last = performance.now()
    this.playMusic('run')
    if (kind === 'daily') this.ui.banner('Reto diario', DAILY_RULES.find((r) => r.id === this.dailyRule)!.name, 2200)
    else if (!this.bossDone) this.ui.chispaSay(`¡El ${ISLAND.bossName} nos espera más adelante!`)
    this.save.runs++
  }

  private playMusic(theme: Theme): void {
    this.audio.playMusic(theme)
  }

  private get speed(): number {
    let s = speedAt(this.player.z)
    if (this.timers.skate > 0) s *= 1.2
    if (this.dailyRule === 'turbo') s *= 1.2
    return s
  }

  private get invincible(): boolean {
    return this.chispaInv > 0
  }

  private handle(a: Action): void {
    const p = this.player
    if (a === 'pause') {
      if (this.state === 'playing') this.pause()
      else if (this.state === 'paused') this.resume()
      return
    }
    if (this.state !== 'playing' || p.dead) return
    const mode = this.cam.mode
    switch (a) {
      case 'left':
      case 'right': {
        // Con la cámara detrás de Kiko, la derecha de la pantalla es -x.
        p.moveLane(a === 'right' ? -1 : 1, mode)
        break
      }
      case 'up': {
        const r = p.jump()
        if (r) this.audio.play(r)
        break
      }
      case 'down': {
        const r = p.down()
        if (r) this.audio.play(r)
        break
      }
      case 'spin':
        if (this.dailyRule === 'sin-giro') break
        if (p.trySpin()) {
          this.audio.play('spin')
          this.stats.spins++
        }
        break
    }
  }

  private step(dt: number): void {
    const p = this.player
    for (const a of this.input.drain()) this.handle(a)
    if (this.state !== 'playing') return

    this.arrowCooldown = Math.max(0, this.arrowCooldown - dt)
    this.hintCooldown = Math.max(0, this.hintCooldown - dt)

    if (p.dead) {
      this.deathTimer -= dt
      if (this.deathTimer <= 0) {
        if (this.lives > 0) this.respawn()
        else this.gameOver()
      }
      return
    }

    // Cambios de cámara: aviso 45 m antes, transición 12 m antes.
    const ahead = this.world.modeAt(p.z + 12)
    if (ahead && ahead !== this.cam.mode) this.enterMode(ahead)
    const far = this.world.chunkAt(p.z + 45)
    if (far && far.mode !== this.cam.mode && this.warnedAt !== far.start) {
      this.warnedAt = far.start
      this.audio.play('warning')
      this.ui.banner(MODE_NAMES[far.mode], far.mode === 'chase' ? '¡Algo gigante viene detrás!' : '', 1400)
    }

    this.prevFeet = p.y
    p.wet = false
    const speed = this.speed
    p.update(dt, speed, this.cam.mode, this.world, (info) => this.onLand(info))

    this.collide(dt)
    this.updateMovers(dt)
    this.updateMagnet(dt)
    this.updateSkate()
    this.updateTimers(dt)
    this.updateHints()

    if (p.y < -2.5 && !p.dead) {
      if (this.god) {
        p.y = 0
        p.vy = 0
        p.grounded = true
      } else this.die('fall')
    }

    this.score += speed * dt * (this.timers.double > 0 ? 2 : 1)
    // El ritmo sube: la música se acelera con la velocidad y se avisa cada 500 m
    this.audio.tempo = 1 + ((speed - MIN_SPEED) / (MAX_SPEED - MIN_SPEED)) * 0.35
    const milestone = Math.floor(p.z / 500)
    if (milestone > this.lastMilestone) {
      this.lastMilestone = milestone
      this.ui.toast(`¡Más rápido! · ${(milestone * 500).toLocaleString('en-US')} m`)
    }
    this.stats.distance = Math.floor(p.z)

    // Historia: superar el récord de la isla abre al jefe para la próxima partida.
    if (this.runKind === 'adventure' && !this.save.bossUnlocked && p.z >= ISLAND.bossRecord) {
      this.save.bossUnlocked = true
      persist(this.save)
      this.audio.play('warning')
      this.ui.chispaSay(`¡El ${ISLAND.bossName} nos vio! Te esperará en tu próxima carrera.`, 4200)
    }
    // Jefe: se calma la pista antes, y aparece cuando la cámara ya está en carrera normal.
    if (!this.bossDone && !this.boss.active) {
      if (p.z >= ISLAND.bossDistance - 230) this.calmBoss = true
      if (p.z >= ISLAND.bossDistance && this.cam.mode === 'run' && !this.cam.transitioning) this.startBoss()
    }
    this.boss.update(dt, p, this.world, this.fx, this.audio, this.cam, {
      onHit: (left) => this.ui.bossBar(true, left),
      onDefeated: () => this.bossDefeated(),
      say: (t) => this.ui.chispaSay(`Capitán Almeja: "${t}"`, 2000),
    })
  }

  private enterMode(mode: CameraMode): void {
    const prev = this.cam.mode
    this.cam.switchTo(mode)
    if (mode === 'side') this.player.lane = 0
    if (mode === 'chase') {
      this.chaseHit = false
      this.coconutState = 'in'
      this.coconutT = 0
      this.coconut.visible = true
      this.playMusic('chase')
    } else if (prev === 'chase') {
      if (!this.chaseHit) {
        this.stats.chasesClean++
        this.ui.toast('¡Persecución sin golpes!')
      }
      this.coconutState = 'out'
      this.coconutT = 0
      if (!this.boss.active) this.playMusic('run')
    }
    this.showHint(mode === 'chase' ? 'chase' : mode === 'side' ? 'side' : '')
  }

  private startBoss(): void {
    this.boss.start()
    this.ui.banner(ISLAND.bossName, 'Devuélvele sus barriles con el giro', 2600)
    this.ui.bossBar(true, 3)
    this.playMusic('boss')
    this.audio.play('warning')
  }

  private bossDefeated(): void {
    this.bossDone = true
    this.calmBoss = false
    this.ui.bossBar(false)
    this.gems += 1
    this.stats.gems += 1
    this.score += 5000
    this.audio.play('win')
    this.ui.banner('¡Lumi liberado!', '+1 gema · +5,000 puntos', 3000)
    window.setTimeout(() => this.ui.chispaSay('¡Gracias, Kiko! Sigue corriendo: el modo Infinito y el Reto diario ya están abiertos.', 4500), 2600)
    this.save.bossDefeated = true
    persist(this.save)
    this.playMusic(this.cam.mode === 'chase' ? 'chase' : 'run')
  }

  // ---------- Colisiones ----------

  private collide(dt: number): void {
    const p = this.player
    const h = p.height
    const pz = p.z
    for (const e of this.world.nearby(pz, 4)) {
      if (e.state === 'flying' || e.state === 'returning') continue
      const ex = e.obj.position.x
      const ey = e.obj.position.y

      if (e.type === 'fruit' || e.type === 'gem' || e.type.startsWith('pu_')) {
        const dx = ex - p.x
        const dy = ey - (p.y + h * 0.55)
        const dz = e.z - pz
        const r = e.type === 'fruit' ? 1.0 : 1.2
        if (dx * dx + dy * dy + dz * dz < r * r) this.collect(e)
        continue
      }
      if (e.type === 'wave') {
        if (p.grounded && this.world.laneAt(p.x) === e.lane && pz >= e.z && pz <= e.z + 8) {
          if (!p.wet && Math.random() < dt * 20) this.fx.splash(new THREE.Vector3(p.x, 0.1, pz), 2)
          p.wet = true
          this.showHint('wave')
        }
        continue
      }
      const hb = HITBOX[e.type]
      if (!hb) continue
      const bottom = ey + (hb.yMin ?? 0)
      const top = ey + hb.h
      const overlap =
        Math.abs(ex - p.x) < hb.w / 2 + PLAYER_HALF_WIDTH &&
        Math.abs(e.z - pz) < hb.d / 2 + PLAYER_HALF_DEPTH &&
        p.y < top - 0.05 &&
        p.y + h > bottom
      if (overlap) this.touch(e, top)
    }
    // Área del giro: un poco más grande que Kiko y hacia adelante.
    if (p.spinning) {
      for (const e of this.world.nearby(pz + 0.8, 2)) {
        if (e.state === 'flying' || e.state === 'returning') continue
        if (Math.abs(e.obj.position.x - p.x) > 1.3 || e.z < pz - 0.9 || e.z > pz + 2.4) continue
        if (Math.abs(e.obj.position.y - p.y) > 1.8) continue
        this.spinHit(e)
      }
    }
  }

  private isStomp(top: number): boolean {
    return this.player.vy < 0 && this.prevFeet >= top - 0.5
  }

  private touch(e: Entity, top: number): void {
    const p = this.player
    if (this.invincible) {
      // Chispa nivel 3: rompe todo lo que toca
      if (HAZARDS.has(e.type)) {
        if (e.type === 'barrel') this.explode(e, false)
        else this.smash(e)
        return
      }
    }
    switch (e.type) {
      case 'box':
      case 'question':
      case 'chispa':
        this.breakBox(e)
        if (this.isStomp(top) && !p.pounding) p.bounce(10)
        return
      case 'arrow':
        if (this.arrowCooldown > 0) return
        this.arrowCooldown = 0.4
        p.bounce(ARROW_BOUNCE_VELOCITY)
        this.audio.play('arrow')
        this.stats.arrows++
        e.obj.scale.set(1.2, 0.6, 1.2)
        window.setTimeout(() => e.obj.scale.set(1, 1, 1), 120)
        this.showHint('arrow')
        return
      case 'iron':
        // Encima se puede pisar (lo maneja el piso); de lado es un golpe
        if (p.y < top - 0.3) this.hurt('bonk', e)
        return
      case 'magmo':
        if (this.isStomp(top)) return this.stomp(e)
        return this.hurt('bonk', e)
      case 'crab':
        if (this.isStomp(top)) return this.stomp(e)
        if (p.spinning) this.audio.play('clank')
        return this.hurt('pinch', e)
      case 'turtle':
        return this.hurt('spikes', e)
      case 'log':
      case 'palm':
        return this.hurt('bonk', e)
      case 'anchor':
        return this.hurt('squash', e)
      case 'barrel':
        if (p.spinning && e.state === 'rolling' && e.vz < 0) return // lo toma spinHit
        this.explode(e, true)
        return
    }
  }

  private spinHit(e: Entity): void {
    switch (e.type) {
      case 'magmo':
        this.stats.magmos++
        this.score += 100
        this.smash(e)
        break
      case 'box':
      case 'question':
      case 'chispa':
        this.breakBox(e)
        break
      case 'barrel':
        if (this.boss.active) {
          this.boss.deflect(e)
          this.audio.play('stomp')
          break
        }
        if (e.state === 'idle') {
          // Lanzarlo rodando hacia adelante
          e.state = 'rolling'
          e.vz = this.speed + 14
          this.movers.push(e)
          this.audio.play('stomp')
          this.showHint('barrelKick')
        }
        break
      case 'crab':
      case 'turtle':
        if (e.cooldown <= 0) {
          this.audio.play('clank')
          this.fx.sparkle(e.obj.position.clone().setY(0.7), 0xffffff, 5)
          e.cooldown = 0.5
        }
        break
    }
  }

  private stomp(e: Entity): void {
    this.player.bounce(BOUNCE_VELOCITY)
    this.audio.play('stomp')
    this.stats.stomps++
    if (e.type === 'magmo') this.stats.magmos++
    this.score += 100
    this.fx.stars(e.obj.position.clone().setY(0.8))
    // Aplastado: se queda plano y desaparece
    e.state = 'flying'
    e.t = 0
    e.vx = 0
    e.vy = 0
    e.vz = 0
    e.obj.scale.set(1.3, 0.2, 1.3)
    this.movers.push(e)
  }

  private smash(e: Entity): void {
    this.audio.play('stomp')
    this.fx.stars(e.obj.position.clone().setY(1))
    e.state = 'flying'
    e.t = 0
    e.vx = (Math.random() - 0.5) * 10
    e.vy = 11
    e.vz = this.speed + 8
    this.movers.push(e)
  }

  private breakBox(e: Entity): void {
    if (!e.alive) return
    this.world.removeEntity(e)
    const pos = e.obj.position.clone().add(new THREE.Vector3(0, 0.45, 0))
    this.fx.splinters(pos, e.type === 'chispa' ? 0x1fb5a6 : e.type === 'iron' ? 0x8a97a3 : 0xc98a3f, 12)
    this.audio.play(e.type === 'iron' ? 'iron' : 'box')
    this.stats.boxes++
    this.score += 25
    this.showHint('box')
    switch (e.type) {
      case 'box':
        this.addFruits(1 + Math.floor(Math.random() * 5), pos)
        break
      case 'iron':
        this.addFruits(15, pos)
        if (Math.random() < 0.4) this.addGem()
        break
      case 'chispa':
        this.chispaUp()
        break
      case 'question': {
        const r = Math.random()
        if (r < 0.4) {
          this.addFruits(10, pos)
          this.ui.toast('+10 guayabas')
        } else if (r < 0.6) this.chispaUp()
        else if (r < 0.75) this.activate('magnet')
        else if (r < 0.85) this.activate('skate')
        else if (r < 0.95) this.addGem()
        else this.extraLife()
        break
      }
    }
  }

  private collect(e: Entity): void {
    this.world.removeEntity(e)
    const pos = e.obj.position.clone()
    if (e.type === 'fruit') {
      this.addFruits(1, pos)
      this.audio.play('fruit')
    } else if (e.type === 'gem') {
      this.addGem()
    } else {
      this.activate(e.type.slice(3) as PowerUpKind)
    }
  }

  private addFruits(n: number, pos?: THREE.Vector3): void {
    this.fruits += n
    this.stats.fruits += n
    this.score += 10 * n * (this.timers.double > 0 ? 2 : 1)
    this.lifeCounter += n
    if (pos) this.fx.sparkle(pos, 0xd6f06a, Math.min(10, 3 + n))
    while (this.lifeCounter >= GUAYABAS_PER_LIFE) {
      this.lifeCounter -= GUAYABAS_PER_LIFE
      this.extraLife()
    }
  }

  private addGem(): void {
    this.gems++
    this.stats.gems++
    this.audio.play('gem')
    this.ui.toast('¡Gema!')
  }

  private extraLife(): void {
    this.lives++
    this.audio.play('life')
    this.ui.toast('¡Vida extra!')
  }

  private chispaUp(): void {
    const p = this.player
    this.audio.play('chispaUp')
    this.showHint('chispa')
    if (p.chispaLevel < 3) p.chispaLevel++
    if (p.chispaLevel === 3) {
      this.chispaInv = CHISPA_INVINCIBLE_TIME
      this.ui.banner('¡Chispa al máximo!', '8 segundos invencible', 1500)
    } else this.ui.toast(p.chispaLevel === 1 ? 'Chispa: aguanta un golpe' : 'Chispa: dos golpes y atrae frutas')
  }

  private activate(kind: PowerUpKind): void {
    const total = powerUpDuration(kind, this.save.upgrades[kind])
    this.timers[kind] = total
    this.totals[kind] = total
    this.audio.play('powerup')
    const p = this.player
    if (kind === 'rocket') {
      p.flying = true
      p.slide = 0
      p.pounding = false
      // Frutas en el aire a lo largo del vuelo
      const end = p.z + this.speed * total
      let lane = p.lane
      for (let z = p.z + 12; z < end - 10; z += 3) {
        if (Math.random() < 0.15) lane = Math.max(-1, Math.min(1, lane + (Math.random() < 0.5 ? -1 : 1)))
        this.world.addLoose('fruit', this.cam.mode === 'side' ? 0 : lane, z, 6.4)
      }
    }
    if (kind === 'skate') p.skating = true
    const names: Record<PowerUpKind, string> = { magnet: '¡Imán!', skate: '¡Patineta!', rocket: '¡Mochila cohete!', double: '¡Puntos x2!' }
    this.ui.toast(names[kind])
  }

  private hurt(kind: DeathKind, e?: Entity): void {
    const p = this.player
    if (p.invuln > 0 || p.flying || p.dead || this.invincible || this.god) return
    if (this.cam.mode === 'chase') this.chaseHit = true
    this.cam.addShake(0.4)
    if (p.chispaLevel > 0) {
      p.chispaLevel--
      p.invuln = INVULNERABLE_AFTER_HIT
      this.audio.play('chispaDown')
      this.audio.play('hit')
      if (e && (e.type === 'magmo' || e.type === 'crab')) this.smash(e)
      return
    }
    this.lives--
    this.die(kind)
  }

  private die(kind: DeathKind): void {
    const p = this.player
    if (p.dead) return
    p.dead = { kind, t: 0 }
    p.flying = false
    p.skating = false
    p.slide = 0
    p.spin = 0
    this.timers.rocket = this.timers.skate = 0
    this.chispaInv = 0
    p.chispaLevel = 0
    if (kind === 'fall') {
      this.audio.play('splash')
      this.fx.splash(new THREE.Vector3(p.x, -0.8, p.z), 16)
      this.lives = Math.max(0, this.lives - 1)
    }
    this.audio.play('death')
    if (kind === 'bonk' || kind === 'pinch') this.fx.stars(new THREE.Vector3(p.x, p.y + 1.6, p.z))
    if (kind === 'burn') this.fx.smoke(new THREE.Vector3(p.x, p.y + 1, p.z), 8)
    this.deathTimer = kind === 'fall' ? 1.3 : 1.6
    if (this.cam.mode === 'chase') this.chaseHit = true
  }

  private respawn(): void {
    const p = this.player
    const lane = this.world.laneAt(p.x)
    // Si se cayó a un hueco, reaparece donde vuelve a haber piso.
    let z = p.z
    while (this.world.inGap(lane, z) || this.world.inGap(lane, z + 2)) z += 1
    this.world.clearHazards(z - 3, z + 22)
    p.z = z
    p.x = this.cam.mode === 'side' ? 0 : p.x
    p.y = 0
    p.vy = 0
    p.grounded = true
    p.jumps = 0
    p.pounding = false
    p.dead = null
    p.invuln = 2
    const rig = p.rig
    rig.root.position.set(0, 0, 0)
    rig.root.rotation.set(0, 0, 0)
    rig.squash.scale.set(1, 1, 1)
    rig.tinted.forEach((m, i) => m.color.copy(rig.baseColors[i]))
    this.ui.toast(this.lives === 1 ? '¡Última vida!' : `Vidas: ${this.lives}`)
  }

  private explode(e: Entity, touchedByPlayer: boolean): void {
    if (!e.alive) return
    this.world.removeEntity(e)
    const pos = e.obj.position.clone()
    this.fx.explosion(pos)
    this.audio.play('explosion')
    this.cam.addShake(0.5)
    for (const o of this.world.nearby(pos.z, 3.2)) {
      if (o === e || o.state === 'flying' || o.state === 'returning') continue
      const d = Math.hypot(o.obj.position.x - pos.x, o.z - pos.z)
      if (d > 3) continue
      if (o.type === 'barrel') this.explode(o, false)
      else if (o.type === 'magmo' || o.type === 'crab' || o.type === 'turtle') {
        if (o.type === 'magmo') this.stats.magmos++
        this.smash(o)
      } else if (o.type === 'box' || o.type === 'question' || o.type === 'chispa') this.breakBox(o)
    }
    const p = this.player
    const near = Math.hypot(p.x - pos.x, p.z - pos.z) < 2.2 && p.y < 2
    if (touchedByPlayer || near) this.hurt('burn')
  }

  private onLand(info: LandInfo): void {
    const p = this.player
    if (info.pound) {
      this.stats.pounds++
      this.cam.addShake(0.35)
      this.fx.dust(new THREE.Vector3(p.x, p.y, p.z), 10)
      this.fx.ring(new THREE.Vector3(p.x, p.y, p.z), 0xfff1c1, 2.5)
      this.audio.play('iron')
      if (info.iron) {
        this.breakBox(info.iron)
        p.bounce(9)
      }
      // La onda del golpe tumba enemigos cercanos
      for (const e of this.world.nearby(p.z, 1.8)) {
        if ((e.type === 'magmo' || e.type === 'crab') && e.state === 'idle' && Math.abs(e.obj.position.x - p.x) < 1.6) {
          if (e.type === 'magmo') this.stats.magmos++
          this.smash(e)
        }
      }
      this.showHint('iron')
    } else if (info.impact > 12) {
      this.fx.dust(new THREE.Vector3(p.x, p.y, p.z), 4)
    }
  }

  private updateMovers(dt: number): void {
    const p = this.player
    for (let i = this.movers.length - 1; i >= 0; i--) {
      const e = this.movers[i]
      if (!e.alive || e.state === 'returning') {
        if (!e.alive) this.movers.splice(i, 1)
        continue
      }
      e.t += dt
      if (e.state === 'flying') {
        e.vy -= 30 * dt
        e.obj.position.x += e.vx * dt
        e.obj.position.y += e.vy * dt
        e.obj.position.z += e.vz * dt
        e.obj.rotation.x += dt * 10
        e.obj.rotation.z += dt * 6
        if (e.t > 1.2) {
          this.world.removeEntity(e)
          this.movers.splice(i, 1)
        }
      } else if (e.state === 'rolling' && e.vz > 0) {
        // Barril pateado: rueda y explota con lo primero que toca
        e.z += e.vz * dt
        e.obj.position.z = e.z
        const anim = e.obj.getObjectByName('anim')
        if (anim) anim.rotation.x += dt * 14
        let boom = e.t > 3
        for (const o of this.world.nearby(e.z, 1.2)) {
          if (o !== e && o.lane === e.lane && HITBOX[o.type] && o.state === 'idle' && o.type !== 'arrow') boom = true
        }
        if (boom) {
          this.explode(e, false)
          this.movers.splice(i, 1)
        }
      }
    }
    // Barriles del jefe ruedan hacia Kiko
    for (const e of this.world.loose) {
      if (e.alive && e.type === 'barrel' && e.state === 'rolling' && e.vz < 0) {
        e.z += e.vz * dt
        e.obj.position.z = e.z
        const anim = e.obj.getObjectByName('anim')
        if (anim) anim.rotation.x -= dt * 10
        if (e.z < p.z - 6) this.explode(e, false)
      }
    }
    for (const e of this.world.nearby(p.z, 6)) if (e.cooldown > 0) e.cooldown -= dt
  }

  private updateMagnet(dt: number): void {
    const p = this.player
    const radius = this.timers.magnet > 0 ? MAGNET_RADIUS : p.chispaLevel >= 2 ? CHISPA_MAGNET_RADIUS : 0
    if (!radius) return
    const target = new THREE.Vector3(p.x, p.y + 0.8, p.z)
    for (const e of this.world.nearby(p.z + radius / 2, radius)) {
      if (e.type !== 'fruit') continue
      const pos = e.obj.position
      if (!e.magnet && pos.distanceTo(target) > radius) continue
      e.magnet = true
      const dir = target.clone().sub(pos)
      const d = dir.length()
      pos.addScaledVector(dir.normalize(), Math.min(d, (25 + this.speed) * dt))
      e.z = pos.z
    }
  }

  private updateSkate(): void {
    const p = this.player
    if (!p.skating || !p.grounded || p.dead) return
    // La patineta salta sola los obstáculos bajos
    for (const e of this.world.nearby(p.z + 2, 2)) {
      if (!LOW_OBSTACLES.has(e.type) || e.state !== 'idle') continue
      if (Math.abs(e.obj.position.x - p.x) > 1.2 || e.z < p.z + 0.6 || e.z > p.z + 3.2) continue
      p.vy = 11.5
      p.grounded = false
      p.jumps = 1
      this.audio.play('jump')
      return
    }
  }

  private updateTimers(dt: number): void {
    const p = this.player
    for (const k of Object.keys(this.timers) as PowerUpKind[]) {
      if (this.timers[k] <= 0) continue
      this.timers[k] -= dt
      // La mochila cohete no te suelta encima de un hueco.
      if (k === 'rocket' && this.timers[k] <= 0 && (this.world.inGap(this.world.laneAt(p.x), p.z + 4) || this.world.inGap(this.world.laneAt(p.x), p.z + 9))) this.timers[k] = 0.05
      if (this.timers[k] <= 0) {
        this.timers[k] = 0
        if (k === 'rocket') {
          p.flying = false
          p.vy = 0
          p.invuln = 1.5
          this.world.clearHazards(p.z, p.z + 20)
        }
        if (k === 'skate') p.skating = false
      }
    }
    if (this.chispaInv > 0) {
      this.chispaInv -= dt
      if (this.chispaInv <= 0) {
        this.chispaInv = 0
        p.chispaLevel = 2
        p.invuln = 1
      }
    }
  }

  // ---------- Ayudas de Chispa (tutorial) ----------

  private readonly hints: Record<string, [string, string]> = {
    lanes: ['Desliza a los lados para cambiar de carril.', 'A / D o flechas para cambiar de carril.'],
    log: ['¡Un tronco! Desliza hacia arriba para saltar.', '¡Un tronco! Espacio para saltar.'],
    palm: ['¡Palmera baja! Desliza hacia abajo para pasar por debajo.', '¡Palmera baja! S para deslizarte.'],
    magmo: ['Mini-Magmo: tócalo para girar o sáltale encima.', 'Mini-Magmo: Shift para girar o sáltale encima.'],
    crab: ['Ese cangrejo tiene casco: sólo sirve saltarle encima.', 'Ese cangrejo tiene casco: sólo sirve saltarle encima.'],
    turtle: ['¡Tortuga con pinchos! No se puede golpear: esquívala.', '¡Tortuga con pinchos! No se puede golpear: esquívala.'],
    barrel: ['¡Pólvora! Esquívala o gira cerca para lanzarla rodando.', '¡Pólvora! Esquívala o gira cerca para lanzarla rodando.'],
    box: ['Las cajas tienen guayabas: gira o sáltales encima.', 'Las cajas tienen guayabas: gira o sáltales encima.'],
    arrow: ['¡Caja de flecha! Rebota muy alto a rutas elevadas.', '¡Caja de flecha! Rebota muy alto a rutas elevadas.'],
    iron: ['Caja de hierro: salta y desliza abajo en el aire para el golpe en picada.', 'Caja de hierro: salta y pulsa S en el aire para el golpe en picada.'],
    gap: ['¡Un hueco! Salta, o desliza arriba otra vez para el doble salto.', '¡Un hueco! Salta; en el aire, salta otra vez para el doble salto.'],
    wave: ['La arena mojada resbala: cuesta más cambiar de carril.', 'La arena mojada resbala: cuesta más cambiar de carril.'],
    chispa: ['¡Soy yo! Cada caja de Chispa me hace más fuerte. Aguanto golpes por ti.', '¡Soy yo! Cada caja de Chispa me hace más fuerte. Aguanto golpes por ti.'],
    chase: ['¡Un coco gigante viene rodando detrás! No te detengas y esquiva todo.', '¡Un coco gigante viene rodando detrás! No te detengas y esquiva todo.'],
    side: ['Vista lateral: aquí sólo se salta, se desliza y se gira.', 'Vista lateral: aquí sólo se salta, se desliza y se gira.'],
    barrelKick: ['¡Así se hace! Los barriles pateados explotan contra lo que encuentren.', '¡Así se hace! Los barriles pateados explotan contra lo que encuentren.'],
  }

  private showHint(id: string): void {
    if (!id || this.hintsThisRun.has(id) || this.save.seenHints.includes(id)) return
    const h = this.hints[id]
    if (!h) return
    this.hintsThisRun.add(id)
    this.save.seenHints.push(id)
    this.ui.chispaSay(h[this.input.usedTouch ? 0 : 1], 3400)
    this.hintCooldown = 3
  }

  private updateHints(): void {
    const p = this.player
    if (!this.startedRun && p.z > 12) {
      this.startedRun = true
      this.showHint('lanes')
    }
    if (this.hintCooldown > 0) return
    for (const e of this.world.nearby(p.z + 18, 8)) {
      if (e.z < p.z + 10) continue
      if (e.type === 'fruit' || e.type.startsWith('pu_') || e.type === 'gem') continue
      if (!this.save.seenHints.includes(e.type)) {
        this.showHint(e.type)
        return
      }
    }
    if (!this.save.seenHints.includes('gap') && this.world.inGap(p.lane, p.z + 16)) this.showHint('gap')
  }

  // ---------- Fin de partida ----------

  private gameOver(): void {
    this.state = 'over'
    this.input.enabled = false
    this.boss.stop()
    this.ui.bossBar(false)
    this.ui.clearMessages()
    const dist = Math.floor(this.player.z)
    const newRecord = dist > this.save.best && this.runKind !== 'daily'
    this.finishRunSave(dist)
    const completed = applyRunToMissions(this.save, this.stats)
    persist(this.save)
    this.stats = emptyStats() // lo ya contado no se vuelve a sumar si revive
    this.ui.showOver({
      distance: dist,
      score: this.score,
      fruits: this.fruits,
      gems: this.gems,
      best: this.runKind === 'daily' ? this.save.dailyChallenge.best : this.save.best,
      newRecord,
      missions: completed,
      canRevive: !this.reviveUsed && this.save.guayabas >= REVIVE_COST,
      reviveCost: REVIVE_COST,
      title: this.runKind === 'daily' ? `Reto diario · ${DAILY_RULES.find((r) => r.id === this.dailyRule)?.name ?? ''}` : 'Fin de la carrera',
    })
    this.audio.playMusic('menu')
  }

  private banked = { fruits: 0, gems: 0 }

  /** Guarda lo ganado; si luego revive, sólo se suma la diferencia. */
  private finishRunSave(dist: number): void {
    this.save.guayabas += this.fruits - this.banked.fruits
    this.save.gems += this.gems - this.banked.gems
    this.banked = { fruits: this.fruits, gems: this.gems }
    if (this.runKind === 'daily') {
      const key = todayKey()
      if (this.save.dailyChallenge.key !== key) this.save.dailyChallenge = { key, best: 0 }
      this.save.dailyChallenge.best = Math.max(this.save.dailyChallenge.best, dist)
    } else this.save.best = Math.max(this.save.best, dist)
    this.save.bestScore = Math.max(this.save.bestScore, Math.floor(this.score))
  }

  private revive(): void {
    if (this.reviveUsed || this.save.guayabas < REVIVE_COST) return
    this.save.guayabas -= REVIVE_COST
    persist(this.save)
    this.reviveUsed = true
    this.lives = 1
    this.ui.hide('over')
    this.state = 'playing'
    this.input.enabled = true
    this.input.clear()
    this.last = performance.now()
    this.respawn()
    this.playMusic(this.cam.mode === 'chase' ? 'chase' : 'run')
    this.audio.play('life')
  }

  /** Herramientas de prueba (ver main.ts). */
  debugWarp(z: number): void {
    this.player.z = z
    this.world.update(0, z)
  }
  debugState(): Record<string, unknown> {
    const p = this.player
    return { z: p.z, y: p.y, lane: p.lane, mode: this.cam.mode, lives: this.lives, fruits: this.fruits, boss: this.boss.active, bossHits: this.boss.hits, state: this.state, dead: !!p.dead, chispa: p.chispaLevel }
  }
  debugSave(patch: Partial<SaveData>): void {
    Object.assign(this.save, patch)
    persist(this.save)
    this.ui.renderTitle(this.save)
  }

  // ---------- Bucle ----------

  private resize(): void {
    const w = window.innerWidth
    const h = window.innerHeight
    this.renderer.setSize(w, h, false)
    this.cam.resize(w / h)
  }

  private frame(now: number): void {
    requestAnimationFrame((t) => this.frame(t))
    const dt = Math.min(0.05, Math.max(0, (now - (this.last || now)) / 1000))
    this.last = now
    this.time += dt

    if (this.state === 'playing') this.watchPerformance(dt)
    if (this.state === 'playing') {
      // Pasos de física de máximo 1/60 s para que nada atraviese nada a 22 m/s
      let left = dt
      while (left > 1e-4) {
        const h = Math.min(left, 1 / 60)
        this.step(h)
        left -= h
        if (this.state !== 'playing') break
      }
    } else if (this.state === 'menu') {
      for (const a of this.input.drain()) void a
    } else {
      for (const a of this.input.drain()) if (a === 'pause') this.handle(a)
    }

    const p = this.player
    const playing = this.state !== 'menu'
    this.world.update(playing && this.state === 'playing' ? dt : 0, p.z)
    this.fx.update(this.state === 'paused' ? 0 : dt)
    const pos = new THREE.Vector3(p.x, p.y, p.z)
    if (this.state === 'menu') {
      p.render(dt, 'run', 0, false)
      poseRig(p.rig, 'idle', this.time, 0)
      this.cam.menu(this.time, pos)
    } else {
      p.render(this.state === 'paused' ? 0 : dt, this.cam.mode, p.chispaLevel, this.invincible)
      if (this.invincible) p.rig.tinted.forEach((m, i) => m.color.copy(p.rig.baseColors[i]).lerp(new THREE.Color(0xfff4b0), 0.35 + Math.sin(this.time * 20) * 0.2))
      else if (!p.dead) p.rig.tinted.forEach((m, i) => m.color.copy(p.rig.baseColors[i]))
      const groundish = p.grounded ? p.y : Math.min(p.y, this.world.groundAt(p.x, p.z, p.y).y)
      this.cam.update(this.state === 'paused' ? 0 : dt, pos, Number.isFinite(groundish) ? groundish : 0, this.speed)
    }
    if (this.state === 'playing') {
      this.updateCoconut(dt)
      this.updateHud()
    }

    // Ambiente que sigue al jugador
    const camPos = this.cam.camera.position
    this.sky.position.copy(camPos)
    this.sea.position.set(Math.round(p.x / 10) * 10, WATER_Y, Math.round(p.z / 10) * 10)
    animateSea(this.sea, this.time)
    this.volcano.position.set(60, WATER_Y, p.z + 420)
    this.volcano.children.forEach((c) => {
      if (c.name === 'smoke') {
        const k = ((this.time * 0.05 + c.position.x * 0.01) % 1)
        ;(c as THREE.Sprite).material.rotation = Math.sin(this.time * 0.2 + c.position.y) * 0.2
        c.position.x += Math.sin(this.time * 0.3 + k) * 0.01
      }
    })
    for (const i of this.islands) i.obj.position.set(i.offset.x, i.offset.y, p.z + i.offset.z)
    ;(this.sky.material as THREE.ShaderMaterial).uniforms.time.value = this.time
    for (const g of this.gulls) {
      const a = this.time * 0.4 + g.phase
      g.obj.position.set(Math.cos(a) * g.r + 6, g.h + Math.sin(a * 2) * 0.8, p.z + 30 + Math.sin(a) * g.r)
      g.obj.rotation.y = -a
      const flap = Math.sin(this.time * 9 + g.phase) * 0.5
      g.obj.getObjectByName('wl')!.rotation.z = flap
      g.obj.getObjectByName('wr')!.rotation.z = -flap
    }
    // Sol: la sombra sigue a Kiko
    this.sun.target.position.set(p.x, 0, p.z + 6)
    this.sun.position.copy(this.sun.target.position).addScaledVector(SUN_DIR, 40)
    this.renderer.render(this.scene, this.cam.camera)
  }

  /** Si el celular no aguanta (menos de ~40 cuadros por segundo), baja la calidad una vez. */
  private watchPerformance(dt: number): void {
    if (this.perf.checked) return
    this.perf.frames++
    this.perf.time += dt
    if (this.perf.time < 4) return
    this.perf.checked = true
    const fps = this.perf.frames / this.perf.time
    if (fps < 40 && this.save.quality !== 'baja') {
      this.save.quality = this.save.quality === 'alta' ? 'media' : 'baja'
      persist(this.save)
      this.applyQuality()
      this.ui.toast(`Gráficos: ${this.save.quality} (para ir más fluido)`)
    }
  }

  private updateCoconut(dt: number): void {
    const app = document.getElementById('app')!
    app.classList.toggle('chase', this.coconutState === 'in' || this.coconutState === 'on')
    if (this.coconutState === 'off') return
    const p = this.player
    this.coconutT += dt
    const c = this.coconut
    const ball = c.getObjectByName('ball')!
    const shadow = c.children.find((o) => o !== ball)!
    // Rueda detrás de Kiko, rebotando; la cámara (detrás) lo ve en la parte de abajo de la pantalla
    const bounce = Math.abs(Math.sin(this.time * 5)) * 0.2
    let x = p.x * 0.7
    let y = 1.5 + bounce
    let z = p.z - 6.5 + Math.sin(this.time * 1.3) * 0.3
    if (this.coconutState === 'in') {
      // Llega rodando desde atrás
      const k = Math.min(1, this.coconutT / 1.4)
      z = p.z - 6.5 - (1 - k) * (1 - k) * 30
      if (k >= 1) {
        this.coconutState = 'on'
        this.cam.addShake(0.5)
        this.audio.play('anchor')
      }
    } else if (this.coconutState === 'out') {
      // Se desvía hacia el mar y se queda atrás
      const k = this.coconutT / 2
      x = p.x * 0.7 + k * k * 22
      y = 1.5 + bounce - k * k * 3
      z = p.z - 6.5 - k * 18
      if (k >= 1) {
        this.coconutState = 'off'
        c.visible = false
        this.fx.splash(new THREE.Vector3(x, WATER_Y + 0.3, z), 20)
        return
      }
    }
    if (p.dead) z = c.position.z // se detiene junto a Kiko caído
    c.position.set(x, 0, z)
    ball.position.y = y
    ball.rotation.x += (this.speed * dt) / 2
    shadow.visible = y < 6
    if (Math.random() < dt * 12) this.fx.dust(new THREE.Vector3(x + (Math.random() - 0.5) * 2, 0.1, z + 1.5), 2)
  }

  private updateHud(): void {
    const p = this.player
    const pus = (Object.keys(this.timers) as PowerUpKind[]).filter((k) => this.timers[k] > 0).map((k) => ({ kind: k, left: this.timers[k], total: this.totals[k] }))
    this.ui.hud({
      fruits: this.fruits,
      gems: this.gems,
      lives: this.lives,
      chispa: p.chispaLevel,
      distance: p.z,
      score: this.score,
      mult: this.timers.double > 0,
      spinReady: this.dailyRule === 'sin-giro' ? 0 : p.spinCd > 0 ? 1 - p.spinCd / 1.5 : 1,
      powerups: pus,
      speed: this.speed,
    })
  }
}
