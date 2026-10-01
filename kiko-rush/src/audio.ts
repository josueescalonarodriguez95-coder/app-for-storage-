// Música y efectos sintetizados con Web Audio: marimba, steel drum, bongos y shaker.
// Es provisional hasta tener al compositor, pero ya da el tono tropical del documento.

export type Theme = 'menu' | 'run' | 'chase' | 'boss'

export type SfxName =
  | 'jump'
  | 'djump'
  | 'spin'
  | 'slide'
  | 'pound'
  | 'box'
  | 'arrow'
  | 'iron'
  | 'fruit'
  | 'gem'
  | 'hit'
  | 'death'
  | 'life'
  | 'chispaUp'
  | 'chispaDown'
  | 'warning'
  | 'explosion'
  | 'stomp'
  | 'powerup'
  | 'bossHit'
  | 'throw'
  | 'clank'
  | 'splash'
  | 'click'
  | 'win'
  | 'anchor'

const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21] // pentatónica mayor
const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12)

interface ThemeDef {
  bpm: number
  root: number
  chords: number[] // grado de la raíz por compás
  melody: (number | null)[] // 16 pasos; índice en SCALE
  bongo: string // 16 pasos: h = agudo, l = grave, . = nada
  shaker: boolean
  minor?: boolean
}

const THEMES: Record<Theme, ThemeDef> = {
  menu: {
    bpm: 96,
    root: 60,
    chords: [0, 5, 7, 5],
    melody: [4, null, 3, null, 2, null, null, 1, 2, null, 4, null, 3, null, null, null],
    bongo: 'h..l..h.h..l.h..',
    shaker: false,
  },
  run: {
    bpm: 122,
    root: 62,
    chords: [0, 5, 7, 5],
    melody: [2, null, 4, 5, null, 4, 2, null, 3, null, 2, 0, null, 2, 4, null],
    bongo: 'h.lhh.l.h.lhh.ll',
    shaker: true,
  },
  chase: {
    bpm: 150,
    root: 64,
    chords: [0, 0, 5, 7],
    melody: [5, 4, 5, null, 7, null, 5, 4, 2, null, 4, null, 5, 7, 8, null],
    bongo: 'hlhlh.lhhlhlhhll',
    shaker: true,
  },
  boss: {
    bpm: 138,
    root: 57,
    chords: [0, 0, 3, 5],
    melody: [0, null, 3, null, 5, 4, 3, null, 0, null, 3, 5, 7, null, 5, null],
    bongo: 'l.h.lhh.l.h.lhlh',
    shaker: true,
    minor: true,
  },
}

export class Audio {
  private ctx: AudioContext | null = null
  private master!: GainNode
  private music!: GainNode
  private sfx!: GainNode
  private noise!: AudioBuffer
  private theme: Theme | null = null
  private step = 0
  private nextTime = 0
  private timer = 0
  private fruitChain = 0
  private lastFruit = 0
  muted = false

  /** Tiene que llamarse desde un toque o clic: los navegadores no dejan sonar antes. */
  unlock(): void {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return
      this.ctx = new Ctor()
      this.master = this.ctx.createGain()
      this.master.gain.value = this.muted ? 0 : 0.8
      this.master.connect(this.ctx.destination)
      this.music = this.ctx.createGain()
      this.music.gain.value = 0.32
      this.music.connect(this.master)
      this.sfx = this.ctx.createGain()
      this.sfx.gain.value = 0.7
      this.sfx.connect(this.master)
      const len = this.ctx.sampleRate
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
      const d = this.noise.getChannelData(0)
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
  }

  setMuted(m: boolean): void {
    this.muted = m
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ctx.currentTime, 0.05)
  }

  playMusic(theme: Theme): void {
    if (this.theme === theme) return
    this.theme = theme
    if (!this.ctx) return
    this.step = 0
    this.nextTime = this.ctx.currentTime + 0.08
    if (!this.timer) this.timer = window.setInterval(() => this.schedule(), 25)
  }

  stopMusic(): void {
    this.theme = null
  }

  private schedule(): void {
    const ctx = this.ctx
    if (!ctx || !this.theme) return
    const t = THEMES[this.theme]
    const stepDur = 60 / t.bpm / 4
    while (this.nextTime < ctx.currentTime + 0.12) {
      const s = this.step % 16
      const bar = Math.floor(this.step / 16) % t.chords.length
      const root = t.root + t.chords[bar] - (t.minor ? 0 : 0)
      const time = this.nextTime
      // Bajo
      if (s % 4 === 0 || (s === 10 && this.theme !== 'menu')) this.bass(midi(root - 24 + (s === 10 ? 7 : 0)), time, stepDur * 2.5)
      // Melodía: steel drum en los compases pares, marimba en los impares
      const note = t.melody[s]
      if (note !== null) {
        const deg = t.minor ? [0, 3, 5, 7, 10, 12, 15, 17, 19, 22][note] : SCALE[note]
        if (bar % 2 === 0) this.steel(midi(root + deg), time)
        else this.marimba(midi(root + deg + 12), time)
      }
      // Arpegio suave de marimba
      if (s % 2 === 1 && this.theme !== 'menu') this.marimba(midi(root + (t.minor ? [0, 3, 7, 10] : [0, 4, 7, 9])[(s >> 1) % 4]), time, 0.12)
      // Percusión
      const b = t.bongo[s]
      if (b === 'h') this.bongo(time, 380)
      if (b === 'l') this.bongo(time, 220)
      if (t.shaker && s % 2 === 0) this.shaker(time, s % 4 === 2 ? 0.14 : 0.07)
      this.nextTime += stepDur
      this.step++
    }
  }

  private env(time: number, peak: number, attack: number, decay: number, dest: AudioNode): GainNode {
    const g = this.ctx!.createGain()
    g.gain.setValueAtTime(0.0001, time)
    g.gain.exponentialRampToValueAtTime(peak, time + attack)
    g.gain.exponentialRampToValueAtTime(0.0001, time + attack + decay)
    g.connect(dest)
    return g
  }

  private osc(type: OscillatorType, freq: number, time: number, dur: number, dest: AudioNode): OscillatorNode {
    const o = this.ctx!.createOscillator()
    o.type = type
    o.frequency.setValueAtTime(freq, time)
    o.connect(dest)
    o.start(time)
    o.stop(time + dur + 0.05)
    return o
  }

  private marimba(f: number, time: number, vol = 0.22): void {
    const g = this.env(time, vol, 0.004, 0.35, this.music)
    this.osc('sine', f, time, 0.4, g)
    const g2 = this.env(time, vol * 0.25, 0.002, 0.08, this.music)
    this.osc('sine', f * 4, time, 0.1, g2)
  }

  private steel(f: number, time: number): void {
    const g = this.env(time, 0.2, 0.005, 0.5, this.music)
    const o = this.osc('triangle', f * 1.02, time, 0.55, g)
    o.frequency.exponentialRampToValueAtTime(f, time + 0.05)
    const g2 = this.env(time, 0.07, 0.005, 0.3, this.music)
    this.osc('sine', f * 2.01, time, 0.35, g2)
    const g3 = this.env(time, 0.04, 0.005, 0.2, this.music)
    this.osc('sine', f * 3.02, time, 0.25, g3)
  }

  private bass(f: number, time: number, dur: number): void {
    const g = this.env(time, 0.35, 0.01, dur, this.music)
    const lp = this.ctx!.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 500
    lp.connect(g)
    this.osc('triangle', f, time, dur, lp)
  }

  private bongo(time: number, f: number): void {
    const g = this.env(time, 0.35, 0.002, 0.14, this.music)
    const o = this.osc('sine', f * 1.5, time, 0.16, g)
    o.frequency.exponentialRampToValueAtTime(f, time + 0.04)
  }

  private shaker(time: number, vol: number): void {
    this.noiseBurst(time, vol, 0.05, 'highpass', 6000, this.music)
  }

  private noiseBurst(time: number, vol: number, dur: number, type: BiquadFilterType, freq: number, dest: AudioNode): AudioBufferSourceNode {
    const src = this.ctx!.createBufferSource()
    src.buffer = this.noise
    const f = this.ctx!.createBiquadFilter()
    f.type = type
    f.frequency.value = freq
    const g = this.env(time, vol, 0.003, dur, dest)
    src.connect(f)
    f.connect(g)
    src.start(time, Math.random() * 0.5)
    src.stop(time + dur + 0.05)
    return src
  }

  private sweep(type: OscillatorType, from: number, to: number, dur: number, vol: number, delay = 0): void {
    const time = this.ctx!.currentTime + delay
    const g = this.env(time, vol, 0.005, dur, this.sfx)
    const o = this.osc(type, from, time, dur, g)
    o.frequency.exponentialRampToValueAtTime(Math.max(20, to), time + dur)
  }

  play(name: SfxName): void {
    const ctx = this.ctx
    if (!ctx) return
    const now = ctx.currentTime
    switch (name) {
      case 'jump':
        this.sweep('square', 280, 620, 0.14, 0.12)
        break
      case 'djump':
        this.sweep('square', 420, 900, 0.14, 0.12)
        break
      case 'spin':
        this.noiseBurst(now, 0.3, 0.35, 'bandpass', 1400, this.sfx)
        this.sweep('sawtooth', 200, 520, 0.3, 0.05)
        break
      case 'slide':
        this.noiseBurst(now, 0.25, 0.3, 'lowpass', 1500, this.sfx)
        break
      case 'pound':
        this.sweep('square', 700, 120, 0.2, 0.12)
        break
      case 'box':
        this.noiseBurst(now, 0.5, 0.12, 'bandpass', 900, this.sfx)
        this.sweep('square', 300, 90, 0.1, 0.1)
        break
      case 'iron':
        this.sweep('square', 180, 60, 0.3, 0.2)
        this.noiseBurst(now, 0.4, 0.25, 'lowpass', 600, this.sfx)
        break
      case 'arrow':
        this.sweep('sine', 180, 900, 0.3, 0.3)
        break
      case 'fruit': {
        // Sube de tono al encadenar frutas.
        this.fruitChain = now - this.lastFruit < 0.6 ? Math.min(this.fruitChain + 1, 14) : 0
        this.lastFruit = now
        const f = midi(76 + SCALE[this.fruitChain % 10] + (this.fruitChain >= 10 ? 12 : 0))
        const g = this.env(now, 0.14, 0.003, 0.12, this.sfx)
        this.osc('sine', f, now, 0.14, g)
        break
      }
      case 'gem':
        ;[0, 4, 7, 12].forEach((n, i) => {
          const g = this.env(now + i * 0.06, 0.12, 0.003, 0.25, this.sfx)
          this.osc('triangle', midi(84 + n), now + i * 0.06, 0.3, g)
        })
        break
      case 'hit':
        this.sweep('sawtooth', 400, 80, 0.35, 0.2)
        break
      case 'death':
        this.sweep('square', 500, 60, 0.9, 0.18)
        this.sweep('square', 480, 50, 0.9, 0.1, 0.05)
        break
      case 'life':
        ;[0, 4, 7, 12, 16].forEach((n, i) => {
          const g = this.env(now + i * 0.07, 0.14, 0.003, 0.2, this.sfx)
          this.osc('square', midi(72 + n), now + i * 0.07, 0.22, g)
        })
        break
      case 'chispaUp':
        this.sweep('sine', 500, 1600, 0.35, 0.18)
        this.sweep('triangle', 750, 2400, 0.35, 0.08, 0.05)
        break
      case 'chispaDown':
        this.sweep('sine', 1400, 300, 0.4, 0.18)
        break
      case 'warning':
        ;[0, 0.22].forEach((d) => {
          const g = this.env(now + d, 0.2, 0.005, 0.16, this.sfx)
          this.osc('square', 880, now + d, 0.18, g)
          const g2 = this.env(now + d + 0.1, 0.2, 0.005, 0.1, this.sfx)
          this.osc('square', 660, now + d + 0.1, 0.12, g2)
        })
        break
      case 'explosion':
        this.noiseBurst(now, 0.9, 0.7, 'lowpass', 900, this.sfx)
        this.sweep('sine', 120, 30, 0.6, 0.5)
        break
      case 'stomp':
        this.sweep('square', 150, 600, 0.12, 0.15)
        break
      case 'powerup':
        ;[0, 7, 12, 19].forEach((n, i) => {
          const g = this.env(now + i * 0.05, 0.13, 0.003, 0.2, this.sfx)
          this.osc('triangle', midi(67 + n), now + i * 0.05, 0.22, g)
        })
        break
      case 'bossHit':
        this.sweep('sawtooth', 300, 60, 0.5, 0.3)
        this.noiseBurst(now, 0.6, 0.4, 'lowpass', 1200, this.sfx)
        break
      case 'throw':
        this.noiseBurst(now, 0.2, 0.25, 'bandpass', 700, this.sfx)
        break
      case 'anchor':
        this.sweep('sine', 90, 40, 0.4, 0.5)
        this.noiseBurst(now, 0.4, 0.3, 'lowpass', 500, this.sfx)
        break
      case 'clank':
        this.sweep('square', 1200, 900, 0.1, 0.12)
        this.sweep('square', 1800, 1500, 0.15, 0.06)
        break
      case 'splash':
        this.noiseBurst(now, 0.4, 0.5, 'bandpass', 1800, this.sfx)
        break
      case 'click':
        this.sweep('sine', 900, 700, 0.05, 0.12)
        break
      case 'win':
        ;[0, 4, 7, 12, 7, 12, 16, 19].forEach((n, i) => {
          const g = this.env(now + i * 0.11, 0.16, 0.004, 0.3, this.sfx)
          this.osc('triangle', midi(67 + n), now + i * 0.11, 0.32, g)
        })
        break
    }
  }
}
