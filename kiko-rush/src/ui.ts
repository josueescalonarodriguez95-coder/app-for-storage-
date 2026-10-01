import { ISLAND, POWERUPS, UPGRADE_COSTS, powerUpDuration } from './config.ts'
import type { PowerUpKind } from './config.ts'
import { CHARACTERS, missionDef } from './save.ts'
import type { CharacterId, CompletedMission, SaveData } from './save.ts'

// Todo lo que es HTML encima del canvas: menús, HUD y avisos de Chispa.

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T
const fmt = (n: number) => Math.floor(n).toLocaleString('en-US')

export type ScreenId = 'title' | 'story' | 'pause' | 'over' | 'upgrades' | 'missions' | 'chars'

export interface HudState {
  fruits: number
  gems: number
  lives: number
  chispa: number
  distance: number
  score: number
  mult: boolean
  spinReady: number // 0..1
  powerups: { kind: PowerUpKind; left: number; total: number }[]
  speed: number
}

export interface OverData {
  distance: number
  score: number
  fruits: number
  gems: number
  best: number
  newRecord: boolean
  missions: CompletedMission[]
  canRevive: boolean
  reviveCost: number
  title: string
}

const STORY = [
  'En el Archipiélago Guayaba cada isla está protegida por un espíritu de luz: los Lumis.',
  'El Dr. Magmo, un científico con más ego que talento, los está capturando para alimentar su máquina volcánica: el Magmatrón.',
  'Kiko, un coatí curioso de la isla más pequeña, sale corriendo a rescatarlos con Chispa, el último Lumi libre. ¡A correr!',
]

export class UI {
  private hudCache: Record<string, string> = {}
  private bannerTimer = 0
  private sayTimer = 0
  private toastTimer = 0

  show(id: ScreenId): void {
    $(`screen-${id}`).hidden = false
  }
  hide(id: ScreenId): void {
    $(`screen-${id}`).hidden = true
  }
  hideAllModals(): void {
    for (const id of ['story', 'pause', 'over', 'upgrades', 'missions', 'chars'] as ScreenId[]) this.hide(id)
  }
  setHud(visible: boolean): void {
    $('hud').hidden = !visible
  }
  doneLoading(): void {
    $('loading').remove()
  }

  on(id: string, fn: () => void): void {
    $(id).addEventListener('click', (e) => {
      e.stopPropagation()
      fn()
    })
  }

  onClose(fn: () => void): void {
    document.querySelectorAll('[data-close]').forEach((b) =>
      b.addEventListener('click', () => {
        this.hide('upgrades')
        this.hide('missions')
        this.hide('chars')
        fn()
      }),
    )
  }

  private set(id: string, value: string, html = false): void {
    if (this.hudCache[id] === value) return
    this.hudCache[id] = value
    if (html) $(id).innerHTML = value
    else $(id).textContent = value
  }

  hud(s: HudState): void {
    this.set('h-fruits', fmt(s.fruits))
    this.set('h-gems', fmt(s.gems))
    this.set('h-dist', fmt(s.distance))
    this.set('h-score', fmt(s.score))
    this.set('h-speed', `${Math.round(s.speed * 3.6)} km/h`)
    const k = (s.speed - 11) / 13
    const bar = $('h-speedbar')
    const w = `${Math.round(Math.min(1, Math.max(0.04, k)) * 100)}%`
    if (bar.style.width !== w) bar.style.width = w
    this.set('h-lives', s.lives > 4 ? '<i></i><span class="more">×' + s.lives + '</span>' : '<i></i>'.repeat(Math.max(0, s.lives)), true)
    this.set('h-chispa', [1, 2, 3].map((n) => `<i class="${n <= s.chispa ? 'on' : ''}"></i>`).join(''), true)
    $('h-mult').hidden = !s.mult
    this.set(
      'h-powerups',
      s.powerups.map((p) => `<div class="pu">${POWERUPS[p.kind].name}<span class="bar"><i style="width:${Math.round((p.left / p.total) * 100)}%"></i></span></div>`).join(''),
      true,
    )
    const cd = $('h-spin').firstElementChild as HTMLElement
    const h = `${Math.round((1 - s.spinReady) * 100)}%`
    if (cd.style.height !== h) cd.style.height = h
  }

  banner(text: string, sub = '', ms = 1600): void {
    const b = $('banner')
    b.innerHTML = sub ? `${text}<small>${sub}</small>` : text
    b.hidden = false
    b.style.animation = 'none'
    void b.offsetWidth
    b.style.animation = ''
    clearTimeout(this.bannerTimer)
    this.bannerTimer = window.setTimeout(() => (b.hidden = true), ms)
  }

  chispaSay(text: string, ms = 3200): void {
    $('chispa-text').textContent = text
    const el = $('chispa-says')
    el.hidden = false
    el.style.animation = 'none'
    void el.offsetWidth
    el.style.animation = ''
    clearTimeout(this.sayTimer)
    this.sayTimer = window.setTimeout(() => (el.hidden = true), ms)
  }

  toast(text: string): void {
    const el = $('toast')
    el.textContent = text
    el.hidden = false
    el.style.animation = 'none'
    void el.offsetWidth
    el.style.animation = ''
    clearTimeout(this.toastTimer)
    this.toastTimer = window.setTimeout(() => (el.hidden = true), 1400)
  }

  clearMessages(): void {
    $('banner').hidden = true
    $('chispa-says').hidden = true
    $('toast').hidden = true
  }

  bossBar(visible: boolean, left = 0, total = 3): void {
    $('boss-bar').hidden = !visible
    if (visible) this.set('boss-hearts', Array.from({ length: total }, (_, i) => `<i class="${i < left ? '' : 'off'}"></i>`).join(''), true)
  }

  // ---------- Menús ----------

  renderTitle(save: SaveData): void {
    $('bank-fruits').textContent = fmt(save.guayabas)
    $('bank-gems').textContent = fmt(save.gems)
    $('bank-best').textContent = fmt(save.best)
    const pct = save.bossDefeated ? 100 : Math.min(100, (save.best / ISLAND.bossRecord) * 100)
    $('island-bar').style.width = `${pct}%`
    $('island-status').textContent = save.bossDefeated
      ? '¡Lumi de la playa liberado! Próxima isla: Jungla Esmeralda (en desarrollo).'
      : save.bossUnlocked
        ? `El ${ISLAND.bossName} te espera a los ${fmt(ISLAND.bossDistance)} m de tu próxima carrera.`
        : `Récord ${fmt(save.best)} / ${fmt(ISLAND.bossRecord)} m: supéralo para que aparezca el jefe.`
    for (const id of ['btn-endless', 'btn-daily']) {
      const b = $(id)
      const label = id === 'btn-endless' ? 'Infinito' : 'Reto diario'
      b.classList.toggle('locked', !save.bossDefeated)
      b.innerHTML = save.bossDefeated ? label : `${label}<span class="lock">Vence al primer jefe</span>`
    }
    $('btn-sound').classList.toggle('off', save.muted)
    $('btn-quality').textContent = `Gráficos: ${save.quality[0].toUpperCase()}${save.quality.slice(1)}`
  }

  story(step: number): void {
    $('story-step').textContent = `${step + 1} / ${STORY.length}`
    $('story-text').textContent = STORY[step]
    $('btn-story-next').textContent = step === STORY.length - 1 ? '¡A correr!' : 'Siguiente'
  }
  get storyLength(): number {
    return STORY.length
  }

  renderUpgrades(save: SaveData, onBuy: (k: PowerUpKind) => void): void {
    const list = $('upgrade-list')
    list.innerHTML = ''
    for (const kind of Object.keys(POWERUPS) as PowerUpKind[]) {
      const lvl = save.upgrades[kind]
      const cost = UPGRADE_COSTS[lvl - 1]
      const li = document.createElement('li')
      li.innerHTML = `<span class="name">${POWERUPS[kind].name}</span>
        <span class="pips">${[1, 2, 3, 4, 5].map((n) => `<i class="${n <= lvl ? 'on' : ''}"></i>`).join('')}</span>
        <span class="meta">${powerUpDuration(kind, lvl).toFixed(0)} s${lvl < 5 ? ` → ${powerUpDuration(kind, lvl + 1).toFixed(0)} s` : ' · nivel máximo'}</span>`
      const b = document.createElement('button')
      b.className = 'btn'
      if (lvl >= 5) {
        b.textContent = 'Máx.'
        b.disabled = true
      } else {
        b.innerHTML = `<span class="ico guava"></span>${fmt(cost)}`
        b.disabled = save.guayabas < cost
        b.addEventListener('click', () => onBuy(kind))
      }
      li.appendChild(b)
      list.appendChild(li)
    }
  }

  renderMissions(save: SaveData): void {
    const list = $('mission-list')
    list.innerHTML = ''
    const all = [...save.daily.missions.map((m) => ({ m, weekly: false })), ...save.weekly.missions.map((m) => ({ m, weekly: true }))]
    for (const { m, weekly } of all) {
      const def = missionDef(m.id)
      if (!def) continue
      const li = document.createElement('li')
      if (m.done) li.classList.add('done')
      const reward = [def.reward.guayabas ? `${def.reward.guayabas} guayabas` : '', def.reward.gems ? `${def.reward.gems} gema${def.reward.gems > 1 ? 's' : ''}` : '']
        .filter(Boolean)
        .join(' + ')
      li.innerHTML = `<span class="name">${def.text}${weekly ? '<span class="tag">Semanal</span>' : ''}</span>
        <span class="meta">${m.done ? '¡Completada!' : `${fmt(m.progress)} / ${fmt(def.target)}`} · Premio: ${reward}</span>
        <span class="mission-bar"><i style="width:${Math.min(100, (m.progress / def.target) * 100)}%"></i></span>`
      list.appendChild(li)
    }
  }

  renderChars(save: SaveData, onPick: (id: CharacterId) => void): void {
    const list = $('char-list')
    list.innerHTML = ''
    for (const c of CHARACTERS) {
      const owned = save.owned.includes(c.id)
      const li = document.createElement('li')
      li.innerHTML = `<span class="name">${c.name}</span><span class="meta">${c.species}${owned ? '' : ` · ${c.price} gemas`}</span>`
      const b = document.createElement('button')
      b.className = 'btn' + (save.character === c.id ? ' primary' : '')
      if (save.character === c.id) {
        b.textContent = 'Elegido'
        b.disabled = true
      } else if (owned) {
        b.textContent = 'Elegir'
      } else {
        b.innerHTML = `<span class="ico gem"></span>${c.price}`
        b.disabled = save.gems < c.price
      }
      b.addEventListener('click', () => onPick(c.id))
      li.appendChild(b)
      list.appendChild(li)
    }
  }

  controlsHelp(touch: boolean): void {
    const rows = touch
      ? [
          ['Deslizar ← →', 'cambiar de carril'],
          ['Deslizar ↑', 'saltar (otra vez en el aire: doble salto)'],
          ['Deslizar ↓', 'deslizarse · en el aire: golpe en picada'],
          ['Tocar', 'giro: rompe cajas y tumba enemigos'],
        ]
      : [
          ['A / D o ← →', 'cambiar de carril'],
          ['Espacio / W', 'saltar (otra vez: doble salto)'],
          ['S', 'deslizarse · en el aire: golpe en picada'],
          ['Shift / J', 'giro'],
          ['Esc / P', 'pausa'],
        ]
    $('controls-help').innerHTML = rows.map(([k, v]) => `<b>${k}</b><span>${v}</span>`).join('')
  }

  showOver(d: OverData): void {
    $('over-eyebrow').textContent = d.title
    $('over-dist').textContent = fmt(d.distance)
    $('over-record').hidden = !d.newRecord
    $('over-score').textContent = fmt(d.score)
    $('over-fruits').textContent = fmt(d.fruits)
    $('over-gems').textContent = fmt(d.gems)
    $('over-best').textContent = `${fmt(d.best)} m`
    $('over-missions').innerHTML = d.missions.map((m) => `<li>✔ ${m.text}</li>`).join('')
    const r = $('btn-revive')
    r.hidden = !d.canRevive
    r.innerHTML = `Revivir <span class="ico guava"></span>${d.reviveCost}`
    this.show('over')
  }
}
