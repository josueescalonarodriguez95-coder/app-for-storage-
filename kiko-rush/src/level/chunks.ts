import type { CameraMode, Chunk, ChunkItem, Gap, ItemType, Platform } from './types.ts'

// Bloques de 50 m de Playa Guayaba, hechos a mano. Coordenadas: z de 0 a 50 dentro del bloque,
// carril -1 / 0 / 1. En vista lateral sólo existe el carril 0.
// scripts/validate-chunks.ts revisa que cada bloque tenga al menos una ruta segura.

const it = (type: ItemType, z: number, lane: number, y?: number): ChunkItem => ({ type, z, lane, y })

/** Fila de guayabas de z0 a z1. */
function F(z0: number, z1: number, lane: number, step = 2.5, y?: number): ChunkItem[] {
  const out: ChunkItem[] = []
  for (let z = z0; z <= z1 + 0.01; z += step) out.push(it('fruit', z, lane, y))
  return out
}

/** Arco de guayabas que marca dónde saltar. */
function arc(zc: number, lane: number, len = 8, h = 2.2, n = 5): ChunkItem[] {
  const out: ChunkItem[] = []
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1)
    out.push(it('fruit', zc - len / 2 + t * len, lane, 0.7 + 4 * h * t * (1 - t)))
  }
  return out
}

/** Varios carriles a la vez. */
const all = (type: ItemType, z: number, lanes: number[] = [-1, 0, 1]): ChunkItem[] => lanes.map((l) => it(type, z, l))

const gap = (z: number, len: number, lanes: number[] = [-1, 0, 1]): Gap => ({ z, len, lanes })

interface Extra {
  gaps?: Gap[]
  platforms?: Platform[]
  rest?: boolean
}

function chunk(id: string, mode: CameraMode | 'any', difficulty: number, items: (ChunkItem | ChunkItem[])[], extra: Extra = {}): Chunk {
  return {
    id,
    island: 'playa',
    mode,
    difficulty,
    rest: extra.rest,
    items: items.flat(),
    gaps: extra.gaps ?? [],
    platforms: extra.platforms ?? [],
  }
}

export const PLAYA_CHUNKS: Chunk[] = [
  // ---------- Descanso: sólo frutas y cajas inofensivas ----------
  chunk('descanso-fila', 'any', 1, [F(4, 46, 0), F(14, 36, -1, 5), F(14, 36, 1, 5)], { rest: true }),
  chunk('descanso-zigzag', 'any', 1, [F(4, 14, -1), F(16, 26, 0), F(28, 38, 1), F(40, 48, 0)], { rest: true }),
  chunk(
    'descanso-cajas',
    'any',
    1,
    [it('box', 12, 0), it('box', 12, -1), it('box', 12, 1), F(18, 30, 0), it('question', 36, 0), F(40, 48, -1), F(40, 48, 1)],
    { rest: true },
  ),

  // ---------- Carrera normal ----------
  chunk('troncos-suaves', 'run', 1, [
    F(2, 8, 0),
    it('log', 14, 0),
    arc(14, 0),
    F(18, 26, 1),
    it('log', 30, 1),
    arc(30, 1),
    it('log', 42, -1),
    arc(42, -1),
    F(34, 46, 0, 3),
  ]),
  chunk('palmeras', 'run', 1, [
    all('palm', 15, [-1, 0]),
    F(12, 18, 0, 1.5, 0.5),
    F(6, 24, 1),
    all('palm', 35, [0, 1]),
    F(32, 38, 1, 1.5, 0.5),
    F(28, 44, -1),
  ]),
  chunk('cajas-en-la-arena', 'run', 1, [
    it('box', 10, -1),
    it('box', 10, 1),
    F(4, 22, 0, 3),
    it('question', 25, 0),
    it('log', 36, 0),
    arc(36, 0),
    it('box', 36, 1),
    F(30, 46, -1, 3),
  ]),
  chunk('primer-mini-magmo', 'run', 1, [F(5, 14, 0), it('magmo', 20, 0), it('fruit', 20, 0, 3), it('magmo', 38, 1), F(28, 46, -1), F(26, 32, 1)]),
  chunk('olas-en-la-orilla', 'run', 2, [
    it('wave', 8, -1),
    it('wave', 8, 1),
    F(8, 16, -1, 2),
    it('log', 22, 0),
    arc(22, 0),
    it('wave', 30, 0),
    F(30, 38, 0, 2),
    it('magmo', 42, -1),
    F(36, 46, 1),
  ]),
  chunk(
    'hueco-en-el-muelle',
    'run',
    2,
    [F(4, 14, 0), arc(20, -1, 7), arc(20, 0, 7), F(10, 30, 1, 2.5), it('log', 38, 1), it('crab', 40, -1), F(34, 46, 0)],
    { gaps: [gap(18, 3.5, [-1, 0])] },
  ),
  chunk('cangrejos', 'run', 2, [
    it('crab', 12, -1),
    arc(12, -1),
    it('crab', 24, 1),
    it('log', 24, 0),
    F(16, 30, -1),
    it('crab', 36, 0),
    arc(36, 0),
    F(38, 48, 1),
  ]),
  chunk('tortugas', 'run', 2, [
    all('turtle', 15, [0, 1]),
    F(6, 18, -1),
    all('turtle', 30, [-1, 0]),
    F(22, 34, 1),
    it('turtle', 45, 1),
    F(38, 48, 0),
  ]),
  chunk('barriles', 'run', 2, [
    it('barrel', 15, 0),
    F(5, 12, 0),
    all('barrel', 26, [-1, 1]),
    F(18, 32, 0),
    it('barrel', 40, 0),
    F(34, 46, -1),
    F(34, 46, 1),
  ]),
  chunk(
    'ruta-elevada',
    'run',
    2,
    [
      F(3, 8, 0),
      it('arrow', 11, 0),
      F(20, 32, 0, 2, 4.2),
      it('gem', 33, 0, 4.2),
      it('log', 24, 0),
      it('log', 35, 0),
      it('crab', 30, 1),
      F(14, 44, -1, 3),
    ],
    { platforms: [{ z: 18, len: 17, lane: 0, y: 3.2 }] },
  ),
  chunk('caja-de-chispa', 'run', 2, [
    F(4, 16, 0),
    it('chispa', 20, 0),
    it('box', 20, -1),
    it('box', 20, 1),
    it('question', 32, 0),
    it('magmo', 40, 1),
    it('log', 40, -1),
    arc(40, -1),
    F(36, 46, 0),
  ]),
  chunk('cajas-de-hierro', 'run', 3, [
    it('iron', 12, 0),
    it('iron', 12, -1),
    it('log', 12, 1),
    arc(12, 1),
    it('question', 12, 0, 1.0),
    all('box', 22),
    it('iron', 32, 1),
    it('magmo', 32, 0),
    it('barrel', 32, -1),
    F(36, 48, 0),
  ]),
  chunk('palmera-y-tronco', 'run', 3, [
    all('palm', 12),
    F(9, 15, 0, 1.5, 0.5),
    all('log', 24),
    arc(24, -1),
    arc(24, 1),
    all('palm', 36, [-1, 1]),
    it('turtle', 36, 0),
    F(33, 39, 1, 1.5, 0.5),
    F(42, 48, 0),
  ]),
  chunk('barriles-en-fila', 'run', 3, [
    it('barrel', 12, 0),
    it('barrel', 22, 0),
    it('barrel', 32, 0),
    all('log', 16, [-1, 1]),
    arc(16, -1),
    arc(16, 1),
    it('crab', 30, 1),
    it('magmo', 30, -1),
    F(38, 48, 0),
  ]),
  chunk(
    'carrera-de-obstaculos',
    'run',
    4,
    [
      it('log', 8, -1),
      it('crab', 8, 0),
      it('turtle', 8, 1),
      it('magmo', 18, 1),
      it('palm', 18, 0),
      it('barrel', 18, -1),
      arc(29, 0, 7),
      all('turtle', 42, [-1, 1]),
      it('log', 42, 0),
      arc(42, 0),
    ],
    { gaps: [gap(27, 4)] },
  ),
  chunk(
    'grietas',
    'run',
    4,
    [arc(12, -1, 8), arc(12, 0, 8), arc(12, 1, 8), arc(28, 0, 7), arc(28, 1, 7), it('magmo', 42, 0), it('barrel', 42, 1), F(38, 48, -1)],
    { gaps: [gap(10, 4.5), gap(26, 3, [0, 1]), gap(26, 5.5, [-1])] },
  ),
  chunk(
    'muelle-roto',
    'run',
    4,
    [F(2, 6, 0), it('log', 15, 0), arc(15, 0), it('palm', 27, 0), F(24, 30, 0, 1.5, 0.5), it('magmo', 39, 0), F(42, 48, 0)],
    { gaps: [gap(8, 34, [-1, 1])] },
  ),
  chunk(
    'tormenta-de-cangrejos',
    'run',
    5,
    [
      all('crab', 6, [-1, 1]),
      it('turtle', 6, 0),
      all('palm', 16, [-1, 0]),
      it('barrel', 16, 1),
      all('log', 26),
      arc(26, 0),
      all('turtle', 36, [-1, 1]),
      it('magmo', 36, 0),
      arc(46, 0, 7),
    ],
    { gaps: [gap(44, 4)] },
  ),

  // ---------- Persecución (Kiko corre hacia la cámara) ----------
  chunk('persecucion-tronco', 'chase', 1, [F(4, 10, 0), it('log', 16, 0), arc(16, 0), F(20, 30, 1), all('palm', 36, [-1, 0]), F(40, 48, 0)]),
  chunk('persecucion-cajas', 'chase', 1, [all('box', 12), F(16, 24, 0), it('log', 30, 1), F(26, 34, -1), it('question', 40, 0)]),
  chunk('persecucion-tortugas', 'chase', 2, [all('turtle', 15, [-1, 1]), F(8, 20, 0), all('log', 32), arc(32, 0), it('box', 44, 0)]),
  chunk('persecucion-grieta', 'chase', 2, [arc(19, -1, 7), arc(19, 0, 7), arc(19, 1, 7), all('barrel', 36, [0, 1]), F(30, 42, -1)], {
    gaps: [gap(17, 3)],
  }),
  chunk('persecucion-enemigos', 'chase', 3, [
    it('magmo', 10, 0),
    it('crab', 10, 1),
    F(4, 14, -1),
    all('palm', 25),
    F(22, 28, 0, 1.5, 0.5),
    all('turtle', 40, [-1, 0]),
    F(34, 46, 1),
  ]),
  chunk('persecucion-final', 'chase', 4, [all('log', 8), arc(8, 0), it('turtle', 22, 1), arc(24, -1, 7), arc(24, 0, 7), all('palm', 38)], {
    gaps: [gap(22, 4, [-1, 0])],
  }),

  // ---------- Vista lateral 2.5D (sólo carril 0) ----------
  chunk('lateral-saltitos', 'side', 1, [arc(13.5, 0, 7), it('log', 26, 0), arc(26, 0), arc(40, 0, 8), F(46, 49, 0)], {
    gaps: [gap(12, 3, [0]), gap(38, 4, [0])],
  }),
  chunk('lateral-plataforma', 'side', 2, [F(3, 8, 0), F(15, 18, 0, 1.5, 2.4), it('magmo', 32, 0), it('fruit', 32, 0, 3), F(38, 48, 0)], {
    gaps: [gap(10, 12, [0])],
    platforms: [{ z: 14.5, len: 3.5, lane: 0, y: 0.8, move: 'up', amp: 0.8, period: 2.6 }],
  }),
  chunk('lateral-trampolin', 'side', 2, [it('arrow', 10, 0), F(17, 27, 0, 2, 4.5), it('magmo', 21, 0), it('crab', 36, 0), arc(36, 0), F(42, 48, 0)], {
    platforms: [{ z: 16, len: 12, lane: 0, y: 3.5 }],
  }),
  chunk(
    'lateral-cangrejos',
    'side',
    3,
    [arc(10.5, 0, 7), it('crab', 20, 0), arc(20, 0), arc(31, 0, 8), it('box', 38, 0, 2.5), it('palm', 45, 0), F(43, 47, 0, 1.5, 0.5)],
    { gaps: [gap(8, 5, [0]), gap(28, 6, [0])] },
  ),
  chunk('lateral-ritmo', 'side', 3, [
    it('palm', 8, 0),
    F(5, 11, 0, 1.5, 0.5),
    it('log', 18, 0),
    arc(18, 0),
    it('palm', 28, 0),
    F(25, 31, 0, 1.5, 0.5),
    it('log', 38, 0),
    arc(38, 0),
    it('gem', 46, 0, 1),
  ]),
  chunk('lateral-balsas', 'side', 4, [F(1, 5, 0), F(12, 17, 0, 1.25, 1.2), F(22, 27, 0, 1.25, 2.2), F(32, 37, 0, 1.25, 1.2), F(45, 49, 0)], {
    gaps: [gap(6, 38, [0])],
    platforms: [
      { z: 12, len: 5, lane: 0, y: 0, move: 'fwd', amp: 1.5, period: 3 },
      { z: 22, len: 5, lane: 0, y: 1, move: 'fwd', amp: 1.5, period: 3.4 },
      { z: 32, len: 5, lane: 0, y: 0, move: 'up', amp: 0.6, period: 2.4 },
    ],
  }),
]
