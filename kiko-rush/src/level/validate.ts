import type { Chunk, ItemType } from './types.ts'
import { CHUNK_LENGTH } from '../config.ts'

// Prueba automática del documento: "todo bloque tiene al menos una ruta segura".
// Se revisa desde cada carril de entrada, en celdas de 1 m, con reglas conservadoras.

/** Cómo se pasa cada cosa. 'block' = sólo esquivándola de carril. */
const PASS: Partial<Record<ItemType, 'free' | 'action' | 'block'>> = {
  log: 'action',
  palm: 'action',
  magmo: 'action',
  crab: 'action',
  barrel: 'action',
  iron: 'action',
  turtle: 'block', // "Esquivar; no se puede golpear"
}

const MAX_JUMPABLE_GAP = 9 // con doble salto a velocidad mínima de vista lateral
const LANE_CHANGE_CELLS = 4 // metros de pista libre que pedimos para cambiar un carril
const MIN_ACTION_SPACING = 8 // dos obstáculos que piden acción en el mismo carril

export interface ChunkProblem {
  chunk: string
  message: string
}

export function validateChunk(c: Chunk): ChunkProblem[] {
  const problems: ChunkProblem[] = []
  const bad = (message: string) => problems.push({ chunk: c.id, message })
  const lanes = c.mode === 'side' ? [0] : [-1, 0, 1]

  for (const item of c.items) {
    if (item.z < 0 || item.z > CHUNK_LENGTH) bad(`${item.type} fuera del bloque (z=${item.z})`)
    if (![-1, 0, 1].includes(item.lane)) bad(`${item.type} en carril inválido ${item.lane}`)
    if (c.mode === 'side' && item.lane !== 0) bad(`${item.type} en carril ${item.lane} en vista lateral`)
  }
  if (c.rest && c.items.some((i) => PASS[i.type] && PASS[i.type] !== 'free')) bad('un bloque de descanso no puede tener peligros')
  if (c.rest && c.gaps.length) bad('un bloque de descanso no puede tener huecos')

  // Celdas libres por carril.
  const ok = new Map<number, boolean[]>()
  for (const lane of [-1, 0, 1]) ok.set(lane, new Array(CHUNK_LENGTH + 1).fill(lanes.includes(lane)))

  const covered = (lane: number, z: number, minY: number) =>
    c.platforms.some((p) => {
      const w = p.width ?? 1
      const inLane = Math.abs(p.lane - lane) <= (w - 1) / 2
      const slack = p.move === 'fwd' ? (p.amp ?? 0) : 0
      return inLane && p.y >= minY && z >= p.z + slack && z <= p.z + p.len - slack
    })

  for (const g of c.gaps) {
    for (const lane of g.lanes) {
      // Tramos del hueco que no cubre ninguna plataforma.
      let run = 0
      for (let z = Math.ceil(g.z); z <= Math.floor(g.z + g.len); z++) {
        if (covered(lane, z, -1)) run = 0
        else if (++run > MAX_JUMPABLE_GAP) {
          for (let k = Math.ceil(g.z); k <= Math.floor(g.z + g.len); k++) ok.get(lane)![k] = false
          break
        }
      }
    }
  }

  const byLane = new Map<number, number[]>()
  for (const item of c.items) {
    const pass = PASS[item.type]
    if (!pass || pass === 'free') continue
    if (covered(item.lane, item.z, 2) && item.type !== 'turtle') continue // pasa por abajo de una plataforma alta
    if (pass === 'block') {
      for (let z = Math.floor(item.z - 1); z <= Math.ceil(item.z + 1); z++) if (z >= 0 && z <= CHUNK_LENGTH) ok.get(item.lane)![z] = false
    } else {
      const list = byLane.get(item.lane) ?? []
      list.push(item.z)
      byLane.set(item.lane, list)
    }
  }
  for (const [lane, zs] of byLane) {
    zs.sort((a, b) => a - b)
    for (let i = 1; i < zs.length; i++) {
      const d = zs[i] - zs[i - 1]
      if (d > 0.01 && d < MIN_ACTION_SPACING) bad(`carril ${lane}: obstáculos a ${d.toFixed(1)} m (mínimo ${MIN_ACTION_SPACING})`)
    }
  }

  // Programación dinámica: ¿se llega al final desde cada carril de entrada?
  for (const start of lanes) {
    const reach = new Map<number, boolean[]>()
    for (const lane of [-1, 0, 1]) reach.set(lane, new Array(CHUNK_LENGTH + 1).fill(false))
    reach.get(start)![0] = ok.get(start)![0]
    // En vista lateral se entra al centro sí o sí; en carrera normal el jugador puede venir de cualquier carril.
    for (let z = 1; z <= CHUNK_LENGTH; z++) {
      for (const lane of lanes) {
        if (!ok.get(lane)![z]) continue
        if (reach.get(lane)![z - 1]) {
          reach.get(lane)![z] = true
          continue
        }
        for (const from of [lane - 1, lane + 1]) {
          if (!lanes.includes(from) || z < LANE_CHANGE_CELLS) continue
          let clear = reach.get(from)![z - LANE_CHANGE_CELLS]
          for (let k = z - LANE_CHANGE_CELLS; clear && k <= z; k++) clear = ok.get(from)![k] && ok.get(lane)![k]
          if (clear) reach.get(lane)![z] = true
        }
      }
    }
    if (!lanes.some((l) => reach.get(l)![CHUNK_LENGTH])) bad(`no hay ruta segura entrando por el carril ${start}`)
  }
  return problems
}

export function validateChunks(chunks: Chunk[]): ChunkProblem[] {
  const problems: ChunkProblem[] = []
  const ids = new Set<string>()
  for (const c of chunks) {
    if (ids.has(c.id)) problems.push({ chunk: c.id, message: 'id repetido' })
    ids.add(c.id)
    problems.push(...validateChunk(c))
  }
  for (const mode of ['run', 'chase', 'side'] as const) {
    if (chunks.filter((c) => c.mode === mode).length < 2) problems.push({ chunk: '-', message: `faltan bloques de modo ${mode}` })
  }
  if (chunks.filter((c) => c.rest).length < 2) problems.push({ chunk: '-', message: 'faltan bloques de descanso' })
  return problems
}
