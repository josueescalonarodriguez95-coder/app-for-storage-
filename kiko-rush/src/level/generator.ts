import { difficultyRangeAt, nextModeSwitchGap } from '../config.ts'
import type { PowerUpKind } from '../config.ts'
import type { Rng } from '../rng.ts'
import { PLAYA_CHUNKS } from './chunks.ts'
import type { CameraMode, Chunk, ChunkItem } from './types.ts'

export interface PlannedChunk {
  chunk: Chunk
  mode: CameraMode
  extra: ChunkItem[] // power-ups que agrega el generador
}

export interface GeneratorOptions {
  onlyMode?: CameraMode // reto diario "solo persecuciones"
}

/**
 * Elige el siguiente bloque según la distancia: nunca repite el anterior, mete descansos después de
 * tramos difíciles y antes de cada cambio de cámara, y alterna los tres modos cada 400 a 800 m.
 */
export class LevelGenerator {
  private lastId = ''
  private mode: CameraMode = 'run'
  private nextSwitchAt: number
  private switchPending = false
  private restNext = false
  private nextPowerUpAt: number
  private rng: Rng
  private options: GeneratorOptions
  private chunks: Chunk[]

  constructor(rng: Rng, options: GeneratorOptions = {}) {
    this.rng = rng
    this.options = options
    this.chunks = PLAYA_CHUNKS
    this.nextSwitchAt = options.onlyMode ? 150 : 520 + rng.range(0, 120)
    this.nextPowerUpAt = 180 + rng.range(0, 120)
  }

  get currentMode(): CameraMode {
    return this.mode
  }

  /** Bloque de arranque: siempre descanso en carrera normal. */
  first(): PlannedChunk {
    const chunk = this.chunks.find((c) => c.id === 'descanso-fila')!
    this.lastId = chunk.id
    return { chunk, mode: 'run', extra: [] }
  }

  /**
   * @param startDistance metro donde empieza el bloque
   * @param calm true mientras pelea un jefe (o está por aparecer): sólo descansos en carrera normal
   */
  next(startDistance: number, calm: boolean): PlannedChunk {
    const extra: ChunkItem[] = []

    if (calm) {
      if (this.mode !== 'run') return this.switchTo('run', startDistance, extra, true)
      return this.plan(this.pickRest(), extra)
    }

    // Antes de cada cambio de cámara va un bloque de descanso del modo actual.
    if (this.switchPending) {
      this.switchPending = false
      const target = this.chooseNextMode(startDistance)
      if (target !== this.mode) return this.switchTo(target, startDistance, extra)
    }
    if (startDistance >= this.nextSwitchAt && this.availableModes(startDistance).length > 1) {
      this.switchPending = true
      return this.plan(this.pickRest(), this.maybePowerUp(startDistance, extra, true))
    }

    if (this.restNext) {
      this.restNext = false
      return this.plan(this.pickRest(), this.maybePowerUp(startDistance, extra, true))
    }

    const chunk = this.pickChunk(this.mode, startDistance)
    const lateGame = startDistance > 6000
    if (chunk.difficulty >= (lateGame ? 5 : 3) || (lateGame && chunk.difficulty >= 4 && this.rng.chance(0.4))) this.restNext = true
    return this.plan(chunk, this.maybePowerUp(startDistance, extra, false))
  }

  private switchTo(target: CameraMode, startDistance: number, extra: ChunkItem[], rest = false): PlannedChunk {
    this.mode = target
    // La persecución dura de 20 a 30 segundos; los otros modos, 400 a 800 m.
    const gap = target === 'chase' ? 280 + this.rng.range(0, 120) : nextModeSwitchGap()
    this.nextSwitchAt = startDistance + gap
    // El primer bloque de un modo nuevo es tranquilo.
    return this.plan(rest ? this.pickRest() : this.pickChunk(target, startDistance, true), extra)
  }

  private availableModes(distance: number): CameraMode[] {
    if (this.options.onlyMode) return [this.options.onlyMode]
    if (distance < 500) return ['run']
    if (distance < 1500) return ['run', 'chase']
    return ['run', 'chase', 'side']
  }

  private chooseNextMode(distance: number): CameraMode {
    const modes = this.availableModes(distance)
    if (this.mode !== 'run' && modes.includes('run')) return 'run'
    const others = modes.filter((m) => m !== this.mode)
    return others.length ? this.rng.pick(others) : this.mode
  }

  private pickRest(): Chunk {
    const rests = this.chunks.filter((c) => c.rest && c.id !== this.lastId)
    return this.rng.pick(rests)
  }

  private pickChunk(mode: CameraMode, distance: number, easy = false): Chunk {
    let [lo, hi] = difficultyRangeAt(distance)
    if (easy) hi = lo
    let candidates: Chunk[] = []
    // Si hay pocos bloques en ese rango (p. ej. persecución difícil), se amplía hacia abajo.
    while (candidates.length < 2 && lo >= 1) {
      candidates = this.chunks.filter((c) => !c.rest && c.mode === mode && c.difficulty >= lo && c.difficulty <= hi && c.id !== this.lastId)
      lo--
    }
    if (!candidates.length) candidates = this.chunks.filter((c) => !c.rest && c.mode === mode && c.id !== this.lastId)
    return this.rng.pick(candidates)
  }

  private maybePowerUp(distance: number, extra: ChunkItem[], restChunk: boolean): ChunkItem[] {
    if (distance < this.nextPowerUpAt || !restChunk) return extra
    this.nextPowerUpAt = distance + 280 + this.rng.range(0, 220)
    const kinds: PowerUpKind[] = ['magnet', 'skate', 'rocket', 'double']
    const kind = this.rng.pick(kinds)
    extra.push({ type: `pu_${kind}`, z: 25, lane: this.mode === 'side' ? 0 : this.rng.pick([-1, 0, 1]), y: 1.1 })
    return extra
  }

  private plan(chunk: Chunk, extra: ChunkItem[]): PlannedChunk {
    this.lastId = chunk.id
    return { chunk, mode: chunk.mode === 'any' ? this.mode : chunk.mode, extra }
  }
}
