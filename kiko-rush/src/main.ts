import './styles.css'
import { Game } from './game.ts'

const canvas = document.getElementById('game') as HTMLCanvasElement
try {
  const game = new Game(canvas)
  if (new URLSearchParams(location.search).has('debug')) {
    game.god = true
    ;(window as unknown as { kiko: Game }).kiko = game
  }
} catch (err) {
  console.error(err)
  const loading = document.getElementById('loading')
  if (loading) loading.textContent = 'Este navegador no pudo iniciar WebGL. Prueba con Chrome, Safari o Firefox actualizados.'
}
