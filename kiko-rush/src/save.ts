import type { PowerUpKind } from './config.ts'
import { Rng, hashString, todayKey, weekKey } from './rng.ts'

// Progreso guardado en el navegador. Sin cuentas por ahora: las tablas globales llegan con Firebase.

export type CharacterId = 'kiko' | 'nena' | 'tico' | 'rufo'

export const CHARACTERS: { id: CharacterId; name: string; species: string; price: number }[] = [
  { id: 'kiko', name: 'Kiko', species: 'coatí', price: 0 },
  { id: 'nena', name: 'Nena', species: 'capibara', price: 5 },
  { id: 'tico', name: 'Tico', species: 'tucán', price: 8 },
  { id: 'rufo', name: 'Rufo', species: 'perezoso', price: 12 },
]

/** Lo que se cuenta en una partida; las misiones leen de aquí. */
export interface RunStats {
  distance: number
  fruits: number
  boxes: number
  magmos: number
  stomps: number
  spins: number
  arrows: number
  chasesClean: number
  pounds: number
  gems: number
}

export const emptyStats = (): RunStats => ({
  distance: 0,
  fruits: 0,
  boxes: 0,
  magmos: 0,
  stomps: 0,
  spins: 0,
  arrows: 0,
  chasesClean: 0,
  pounds: 0,
  gems: 0,
})

interface MissionDef {
  id: string
  text: string
  stat: keyof RunStats
  target: number
  /** 'run' = en una sola partida; 'total' = sumando partidas del día o la semana */
  scope: 'run' | 'total'
  reward: { guayabas?: number; gems?: number }
}

const DAILY_POOL: MissionDef[] = [
  { id: 'cajas40', text: 'Rompe 40 cajas', stat: 'boxes', target: 40, scope: 'total', reward: { guayabas: 150 } },
  { id: 'persecuciones2', text: 'Sobrevive 2 persecuciones sin golpe', stat: 'chasesClean', target: 2, scope: 'run', reward: { gems: 1 } },
  { id: 'guayabas300', text: 'Recoge 300 guayabas', stat: 'fruits', target: 300, scope: 'total', reward: { guayabas: 120 } },
  { id: 'metros1000', text: 'Corre 1,000 m en una partida', stat: 'distance', target: 1000, scope: 'run', reward: { guayabas: 200 } },
  { id: 'magmos10', text: 'Tumba 10 Mini-Magmos', stat: 'magmos', target: 10, scope: 'total', reward: { guayabas: 150 } },
  { id: 'giros30', text: 'Gira 30 veces', stat: 'spins', target: 30, scope: 'total', reward: { guayabas: 100 } },
  { id: 'flechas3', text: 'Rebota en 3 cajas de flecha', stat: 'arrows', target: 3, scope: 'total', reward: { guayabas: 120 } },
  { id: 'picada5', text: 'Haz 5 golpes en picada', stat: 'pounds', target: 5, scope: 'total', reward: { guayabas: 100 } },
  { id: 'pisotones8', text: 'Salta sobre 8 enemigos', stat: 'stomps', target: 8, scope: 'total', reward: { guayabas: 150 } },
]

const WEEKLY_POOL: MissionDef[] = [
  { id: 'sem-metros', text: 'Corre 3,000 m en una partida', stat: 'distance', target: 3000, scope: 'run', reward: { gems: 3 } },
  { id: 'sem-cajas', text: 'Rompe 400 cajas esta semana', stat: 'boxes', target: 400, scope: 'total', reward: { gems: 3 } },
  { id: 'sem-magmos', text: 'Tumba 80 Mini-Magmos esta semana', stat: 'magmos', target: 80, scope: 'total', reward: { gems: 3 } },
]

export interface MissionState {
  id: string
  progress: number
  done: boolean
}

export interface SaveData {
  version: 1
  guayabas: number
  gems: number
  best: number
  bestScore: number
  bossUnlocked: boolean
  bossDefeated: boolean
  upgrades: Record<PowerUpKind, number>
  owned: CharacterId[]
  character: CharacterId
  daily: { key: string; missions: MissionState[] }
  weekly: { key: string; missions: MissionState[] }
  dailyChallenge: { key: string; best: number }
  seenHints: string[]
  seenIntro: boolean
  muted: boolean
  runs: number
}

const KEY = 'kiko-rush-save-v1'

function fresh(): SaveData {
  return {
    version: 1,
    guayabas: 0,
    gems: 0,
    best: 0,
    bestScore: 0,
    bossUnlocked: false,
    bossDefeated: false,
    upgrades: { magnet: 1, skate: 1, rocket: 1, double: 1 },
    owned: ['kiko'],
    character: 'kiko',
    daily: { key: '', missions: [] },
    weekly: { key: '', missions: [] },
    dailyChallenge: { key: '', best: 0 },
    seenHints: [],
    seenIntro: false,
    muted: false,
    runs: 0,
  }
}

export function loadSave(): SaveData {
  let data = fresh()
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) data = { ...data, ...JSON.parse(raw) }
  } catch {
    // Sin almacenamiento (ventana privada): se juega igual, sólo que no se guarda.
  }
  refreshMissions(data)
  return data
}

export function persist(data: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    // ignorado a propósito
  }
}

function pickMissions(pool: MissionDef[], key: string, count: number): MissionState[] {
  const rng = new Rng(hashString(key))
  const left = [...pool]
  const out: MissionState[] = []
  while (out.length < count && left.length) {
    const i = Math.floor(rng.next() * left.length)
    out.push({ id: left.splice(i, 1)[0].id, progress: 0, done: false })
  }
  return out
}

export function refreshMissions(data: SaveData): void {
  const day = todayKey()
  if (data.daily.key !== day) data.daily = { key: day, missions: pickMissions(DAILY_POOL, day, 3) }
  const week = weekKey()
  if (data.weekly.key !== week) data.weekly = { key: week, missions: pickMissions(WEEKLY_POOL, week, 1) }
}

export function missionDef(id: string): MissionDef | undefined {
  return DAILY_POOL.find((m) => m.id === id) ?? WEEKLY_POOL.find((m) => m.id === id)
}

export interface CompletedMission {
  text: string
  reward: { guayabas?: number; gems?: number }
}

/** Suma lo de la partida a las misiones y entrega los premios de las que se completan. */
export function applyRunToMissions(data: SaveData, stats: RunStats): CompletedMission[] {
  refreshMissions(data)
  const completed: CompletedMission[] = []
  for (const m of [...data.daily.missions, ...data.weekly.missions]) {
    const def = missionDef(m.id)
    if (!def || m.done) continue
    const value = stats[def.stat]
    m.progress = def.scope === 'run' ? Math.max(m.progress, value) : m.progress + value
    if (m.progress >= def.target) {
      m.progress = def.target
      m.done = true
      data.guayabas += def.reward.guayabas ?? 0
      data.gems += def.reward.gems ?? 0
      completed.push({ text: def.text, reward: def.reward })
    }
  }
  return completed
}
