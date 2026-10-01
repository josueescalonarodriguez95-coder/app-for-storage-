// Prueba automática de bloques: `npm run validate`. El build no sigue si un bloque no tiene ruta segura.
import { PLAYA_CHUNKS } from '../src/level/chunks.ts'
import { validateChunks } from '../src/level/validate.ts'

const problems = validateChunks(PLAYA_CHUNKS)
const playable = PLAYA_CHUNKS.filter((c) => !c.rest).length
const rest = PLAYA_CHUNKS.length - playable

if (problems.length) {
  console.error(`✗ ${problems.length} problema(s) en los bloques:`)
  for (const p of problems) console.error(`  - [${p.chunk}] ${p.message}`)
  process.exit(1)
}
console.log(`✓ Playa Guayaba: ${playable} bloques jugables + ${rest} de descanso, todos con ruta segura.`)
