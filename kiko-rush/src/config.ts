// Números del documento de diseño, en un solo lugar para poder balancear sin buscar por todo el código.

export const LANE_WIDTH = 2.2
export const LANES = [-1, 0, 1] as const
export const CHUNK_LENGTH = 50

export const GRAVITY = -40
export const JUMP_VELOCITY = 13.5
export const DOUBLE_JUMP_VELOCITY = 12
export const POUND_VELOCITY = -34
export const BOUNCE_VELOCITY = 17 // al saltarle encima a un enemigo
export const ARROW_BOUNCE_VELOCITY = 21 // caja de flecha
export const LANE_CHANGE_SPEED = 14 // m/s laterales

export const SPIN_DURATION = 0.5
export const SPIN_COOLDOWN = 1.0
export const SLIDE_DURATION = 0.7

export const STAND_HEIGHT = 1.5
export const SLIDE_HEIGHT = 0.6
export const PLAYER_HALF_WIDTH = 0.45
export const PLAYER_HALF_DEPTH = 0.4

export const CAMERA_TRANSITION = 1.0
export const INVULNERABLE_AFTER_HIT = 1.6

export const GUAYABAS_PER_LIFE = 100
export const STARTING_LIVES = 1

export const CHISPA_INVINCIBLE_TIME = 8
export const CHISPA_MAGNET_RADIUS = 4.5
export const MAGNET_RADIUS = 9

/** Tabla de velocidad y dificultad por distancia (sección "Generación del nivel y dificultad"). */
export function speedAt(distance: number): number {
  if (distance < 500) return 10
  if (distance < 1500) return 12
  if (distance < 3000) return 14
  if (distance < 6000) return 16
  const extra = Math.floor((distance - 6000) / 1000) * 0.5
  return Math.min(22, 16 + 0.5 + extra)
}

export function difficultyRangeAt(distance: number): [number, number] {
  if (distance < 500) return [1, 1]
  if (distance < 1500) return [1, 2]
  if (distance < 3000) return [2, 3]
  if (distance < 6000) return [3, 4]
  return [4, 5]
}

/** Metros entre cambios de cámara: 400 a 800 según el documento. */
export function nextModeSwitchGap(): number {
  return 400 + Math.random() * 400
}

export const POWERUPS = {
  magnet: { name: 'Imán de guayabas', base: 12, max: 20 },
  skate: { name: 'Patineta de bambú', base: 10, max: 18 },
  rocket: { name: 'Mochila cohete', base: 6, max: 10 },
  double: { name: 'Multiplicador x2', base: 15, max: 25 },
} as const
export type PowerUpKind = keyof typeof POWERUPS

export const UPGRADE_COSTS = [250, 600, 1200, 2500] // nivel 1→2, 2→3, 3→4, 4→5

export function powerUpDuration(kind: PowerUpKind, level: number): number {
  const p = POWERUPS[kind]
  return p.base + ((p.max - p.base) * (level - 1)) / 4
}

export const ISLAND = {
  id: 'playa',
  name: 'Playa Guayaba',
  bossRecord: 1500,
  bossDistance: 900, // en qué metro aparece el jefe cuando ya está desbloqueado
  bossName: 'Capitán Almeja',
}

export const REVIVE_COST = 300
