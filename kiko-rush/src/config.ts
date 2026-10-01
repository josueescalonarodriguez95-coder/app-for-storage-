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

/**
 * Velocidad que sube poco a poco mientras corres (sin saltos bruscos).
 * Sigue la tabla del documento pero interpolada, y un poco más viva: arranca en 11 m/s y llega a 24.
 */
const SPEED_CURVE: [number, number][] = [
  [0, 11],
  [400, 12.5],
  [1000, 14.5],
  [2000, 16.5],
  [3500, 18.5],
  [6000, 21],
  [10000, 24],
]
export const MAX_SPEED = 24
export const MIN_SPEED = SPEED_CURVE[0][1]

export function speedAt(distance: number): number {
  for (let i = 1; i < SPEED_CURVE.length; i++) {
    const [d1, v1] = SPEED_CURVE[i]
    if (distance <= d1) {
      const [d0, v0] = SPEED_CURVE[i - 1]
      return v0 + ((v1 - v0) * (distance - d0)) / (d1 - d0)
    }
  }
  return MAX_SPEED
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
