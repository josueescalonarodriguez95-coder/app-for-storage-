export type CameraMode = 'run' | 'chase' | 'side'

/** Todo lo que puede ir en un bloque. `lane` es -1, 0 o 1 (en vista lateral siempre 0). */
export type ItemType =
  // obstáculos
  | 'log' // tronco caído: saltar
  | 'palm' // palmera inclinada: deslizarse
  | 'turtle' // tortuga con pinchos: esquivar (o saltarla limpio)
  | 'magmo' // Mini-Magmo: giro o saltarle encima
  | 'crab' // cangrejo con casco: sólo saltarle encima
  | 'barrel' // barril de pólvora: esquivar, saltar o lanzarlo con el giro
  | 'wave' // ola que moja un carril: se resbala
  // cajas
  | 'box' // madera
  | 'arrow' // flecha (rebota)
  | 'iron' // hierro (golpe en picada)
  | 'question'
  | 'chispa'
  // recogibles
  | 'fruit'
  | 'gem'
  | 'pu_magnet'
  | 'pu_skate'
  | 'pu_rocket'
  | 'pu_double'

export interface ChunkItem {
  type: ItemType
  z: number // 0..50 dentro del bloque
  lane: number
  y?: number // altura (para frutas y cajas elevadas)
}

/** Hueco en el piso: de z a z+len, en los carriles indicados. */
export interface Gap {
  z: number
  len: number
  lanes: number[]
}

/** Plataforma de una sola vía (se aterriza desde arriba). */
export interface Platform {
  z: number
  len: number
  lane: number
  y: number
  width?: number // en carriles; 1 por defecto
  move?: 'up' | 'fwd'
  amp?: number
  period?: number
}

export interface Chunk {
  id: string
  island: string
  mode: CameraMode | 'any'
  difficulty: number // 1..5
  rest?: boolean
  items: ChunkItem[]
  gaps: Gap[]
  platforms: Platform[]
}
