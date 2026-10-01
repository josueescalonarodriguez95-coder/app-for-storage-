// Controles del documento: deslizar y tocar en móvil, teclado y control.
// La entrada se traduce a acciones; el juego decide qué significa "derecha" según la cámara.

export type Action = 'left' | 'right' | 'up' | 'down' | 'spin' | 'pause'

const SWIPE_MIN = 28 // px
const TAP_MAX_TIME = 260 // ms

export class Input {
  private queue: Action[] = []
  private touchStart: { x: number; y: number; t: number; fired: boolean } | null = null
  private padPrev: boolean[] = []
  private padStickX = 0
  usedTouch = false
  private lastTouch = 0
  enabled = false

  constructor(target: HTMLElement) {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return
      const a = this.keyToAction(e.code)
      if (!a) return
      if (this.enabled || a === 'pause') {
        e.preventDefault()
        this.push(a)
      }
    })

    target.addEventListener(
      'touchstart',
      (e) => {
        this.usedTouch = true
        this.lastTouch = performance.now()
        const t = e.changedTouches[0]
        this.touchStart = { x: t.clientX, y: t.clientY, t: performance.now(), fired: false }
      },
      { passive: true },
    )
    target.addEventListener(
      'touchmove',
      (e) => {
        const s = this.touchStart
        if (!s || s.fired) return
        const t = e.changedTouches[0]
        const a = this.swipe(t.clientX - s.x, t.clientY - s.y)
        if (a) {
          s.fired = true
          this.push(a)
        }
        e.preventDefault()
      },
      { passive: false },
    )
    target.addEventListener('touchend', (e) => {
      this.lastTouch = performance.now()
      const s = this.touchStart
      this.touchStart = null
      if (!s || s.fired) return
      const t = e.changedTouches[0]
      const a = this.swipe(t.clientX - s.x, t.clientY - s.y)
      if (a) this.push(a)
      else if (performance.now() - s.t < TAP_MAX_TIME) this.push('spin')
    })

    // Con mouse (PC sin teclado a mano): arrastrar = deslizar, clic = girar.
    let mouse: { x: number; y: number; t: number } | null = null
    // Los celulares también disparan clics emulados después de un toque: se ignoran.
    const recentTouch = () => performance.now() - this.lastTouch < 1000
    target.addEventListener('mousedown', (e) => {
      if (recentTouch()) return
      mouse = { x: e.clientX, y: e.clientY, t: performance.now() }
    })
    target.addEventListener('mouseup', (e) => {
      if (!mouse) return
      const a = this.swipe(e.clientX - mouse.x, e.clientY - mouse.y)
      if (a) this.push(a)
      else if (performance.now() - mouse.t < TAP_MAX_TIME) this.push('spin')
      mouse = null
    })
  }

  private swipe(dx: number, dy: number): Action | null {
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_MIN) return null
    if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left'
    return dy < 0 ? 'up' : 'down'
  }

  private keyToAction(code: string): Action | null {
    switch (code) {
      case 'KeyA':
      case 'ArrowLeft':
        return 'left'
      case 'KeyD':
      case 'ArrowRight':
        return 'right'
      case 'Space':
      case 'KeyW':
      case 'ArrowUp':
        return 'up'
      case 'KeyS':
      case 'ArrowDown':
        return 'down'
      case 'ShiftLeft':
      case 'ShiftRight':
      case 'KeyJ':
        return 'spin'
      case 'Escape':
      case 'KeyP':
        return 'pause'
    }
    return null
  }

  private push(a: Action): void {
    if (!this.enabled && a !== 'pause') return
    this.queue.push(a)
  }

  /** Lee el control (Gamepad API): stick izquierdo, A/X saltar, B/Círculo deslizar, X/Cuadrado girar. */
  private pollGamepad(): void {
    const pads = navigator.getGamepads?.() ?? []
    const pad = pads.find((p) => p)
    if (!pad) return
    const pressed = pad.buttons.map((b) => b.pressed)
    const edge = (i: number) => pressed[i] && !this.padPrev[i]
    if (edge(0)) this.push('up')
    if (edge(1)) this.push('down')
    if (edge(2)) this.push('spin')
    if (edge(9)) this.push('pause')
    if (edge(14)) this.push('left')
    if (edge(15)) this.push('right')
    const x = pad.axes[0] ?? 0
    const dir = x > 0.6 ? 1 : x < -0.6 ? -1 : 0
    if (dir !== this.padStickX && dir !== 0) this.push(dir > 0 ? 'right' : 'left')
    this.padStickX = dir
    this.padPrev = pressed
  }

  drain(): Action[] {
    this.pollGamepad()
    const q = this.queue
    this.queue = []
    return q
  }

  clear(): void {
    this.queue = []
  }
}
