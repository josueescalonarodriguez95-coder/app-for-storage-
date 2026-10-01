/** Generador pseudoaleatorio con semilla (mulberry32): el reto diario tiene que ser igual para todos. */
export class Rng {
  private s: number
  constructor(seed: number) {
    this.s = seed >>> 0
  }
  next(): number {
    let t = (this.s += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  range(a: number, b: number): number {
    return a + (b - a) * this.next()
  }
  int(a: number, b: number): number {
    return Math.floor(this.range(a, b + 1))
  }
  pick<T>(list: readonly T[]): T {
    return list[Math.floor(this.next() * list.length)]
  }
  chance(p: number): boolean {
    return this.next() < p
  }
}

export function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

export function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function weekKey(d = new Date()): string {
  const start = new Date(d.getFullYear(), 0, 1)
  const week = Math.floor((d.getTime() - start.getTime()) / (7 * 86400000))
  return `${d.getFullYear()}-S${week}`
}
