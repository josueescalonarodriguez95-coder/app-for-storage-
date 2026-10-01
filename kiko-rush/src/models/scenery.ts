import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { Sky } from 'three/examples/jsm/objects/Sky.js'
import { glow, glowSprite, paint, shadows } from './materials.ts'
import { frond } from './props.ts'
import { barkTex, cloudTex, leafTex, palmTrunkTex, pathTex, plankTex, rockTex, sandTex, thatchTex } from './textures.ts'

// Ambiente de Playa Guayaba: cielo físico, mar con olas y espuma, playa con dunas,
// palmeras, chozas, rocas, plantas, islas lejanas y el volcán al fondo.

const sphere = new THREE.SphereGeometry(1, 20, 14)
const cyl = new THREE.CylinderGeometry(1, 1, 1, 16)
const cone = new THREE.ConeGeometry(1, 1, 24)

function m(geo: THREE.BufferGeometry, mat: THREE.Material, s: [number, number, number], p: [number, number, number] = [0, 0, 0]): THREE.Mesh {
  const mesh = new THREE.Mesh(geo, mat)
  mesh.scale.set(...s)
  mesh.position.set(...p)
  return mesh
}

export const SUN_DIR = new THREE.Vector3(-0.45, 0.78, -0.42).normalize()
export const WATER_Y = -0.95

// ---------- Cielo ----------

export function buildSky(): Sky {
  const sky = new Sky()
  sky.scale.setScalar(850)
  const u = sky.material.uniforms
  u.turbidity.value = 3.2
  u.rayleigh.value = 1.4
  u.mieCoefficient.value = 0.004
  u.mieDirectionalG.value = 0.82
  u.sunPosition.value.copy(SUN_DIR)
  u.cloudCoverage.value = 0.38
  u.cloudDensity.value = 0.5
  u.cloudScale.value = 0.00025
  // El cielo físico sale muy brillante; lo bajamos para que el resto de la escena no se vea quemada
  sky.material.fragmentShader = sky.material.fragmentShader.replace('gl_FragColor = vec4( texColor, 1.0 );', 'gl_FragColor = vec4( texColor * 0.42, 1.0 );')
  return sky
}

/** Cielo simple de gradiente: sólo para calcular el reflejo ambiente de los materiales. */
export function buildEnvSky(): THREE.Group {
  const g = new THREE.Group()
  const geo = new THREE.SphereGeometry(100, 32, 16)
  const colors: number[] = []
  const top = new THREE.Color(0x3d8fd6)
  const mid = new THREE.Color(0xa9d8ef)
  const low = new THREE.Color(0xd9c49a)
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 100
    const c = y > 0 ? mid.clone().lerp(top, Math.min(1, y * 1.4)) : mid.clone().lerp(low, Math.min(1, -y * 4))
    colors.push(c.r, c.g, c.b)
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  g.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })))
  const sun = new THREE.Mesh(new THREE.SphereGeometry(6, 16, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 5.6, 5) }))
  sun.position.copy(SUN_DIR).multiplyScalar(80)
  g.add(sun)
  return g
}

// ---------- Mar ----------

const waterVertex = /* glsl */ `
  uniform float uTime;
  varying vec3 vWorld;
  varying vec2 vSlope;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    float t = uTime;
    // Olas suaves (suma de senos en coordenadas del mundo: no se mueven con la cámara)
    float h = sin(w.x * 0.11 + t * 1.1) * 0.18 + sin(w.z * 0.08 - t * 0.9 + w.x * 0.03) * 0.22 + sin((w.x + w.z) * 0.21 + t * 1.7) * 0.07;
    float dx = cos(w.x * 0.11 + t * 1.1) * 0.0198 + cos(w.z * 0.08 - t * 0.9 + w.x * 0.03) * 0.0066 + cos((w.x + w.z) * 0.21 + t * 1.7) * 0.0147;
    float dz = cos(w.z * 0.08 - t * 0.9 + w.x * 0.03) * 0.0176 + cos((w.x + w.z) * 0.21 + t * 1.7) * 0.0147;
    w.y += h;
    vWorld = w.xyz;
    vSlope = vec2(dx, dz);
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`

const waterFragment = /* glsl */ `
  uniform float uTime;
  uniform vec3 uSunDir;
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  uniform vec3 uSkyLow;
  uniform vec3 uSkyHigh;
  uniform vec3 uFogColor;
  uniform float uFogNear;
  uniform float uFogFar;
  varying vec3 vWorld;
  varying vec2 vSlope;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float ripples(vec2 p) {
    return vnoise(p) * 0.5 + vnoise(p * 2.3 + 7.0) * 0.3 + vnoise(p * 5.1 - 3.0) * 0.2;
  }

  void main() {
    vec2 p = vWorld.xz;
    float t = uTime;
    // Ondas finas animadas para el relieve
    float e = 0.15;
    vec2 q1 = p * 0.55 + vec2(t * 0.35, t * 0.22);
    vec2 q2 = p * 0.9 - vec2(t * 0.25, -t * 0.3);
    float r0 = ripples(q1) + ripples(q2);
    float rx = ripples(q1 + vec2(e, 0.0)) + ripples(q2 + vec2(e, 0.0)) - r0;
    float rz = ripples(q1 + vec2(0.0, e)) + ripples(q2 + vec2(0.0, e)) - r0;
    vec3 N = normalize(vec3(-vSlope.x - rx * 0.9, 1.0, -vSlope.y - rz * 0.9));

    vec3 V = normalize(cameraPosition - vWorld);
    float fres = pow(1.0 - max(dot(N, V), 0.0), 4.0);

    // Agua turquesa en la orilla, azul profundo mar adentro
    float ax = abs(vWorld.x);
    float shallow = max(smoothstep(30.0, 17.0, ax), smoothstep(8.0, 3.0, ax));
    vec3 water = mix(uDeep, uShallow, shallow);
    // Cáusticas en lo bajito
    float caustic = pow(ripples(p * 1.4 + t * 0.4), 3.0) * shallow;
    water += caustic * 0.25;

    vec3 R = reflect(-V, N);
    vec3 skyc = mix(uSkyLow, uSkyHigh, clamp(R.y * 1.6, 0.0, 1.0));
    vec3 col = mix(water, skyc, clamp(fres * 0.85 + 0.08, 0.0, 1.0));

    float spec = pow(max(dot(reflect(-uSunDir, N), V), 0.0), 180.0);
    col += vec3(1.0, 0.95, 0.85) * spec * 3.0;

    // Espuma donde rompen las olas en la playa
    float shore = 18.6 + sin(vWorld.z * 0.07) * 1.6 + sin(vWorld.z * 0.19 + 1.3) * 0.7;
    float wave = sin(t * 1.3 - ax * 1.8) * 0.5 + 0.5;
    float band = smoothstep(2.6, 0.0, abs(ax - shore - wave * 1.2));
    float foam = band * smoothstep(0.35, 0.75, ripples(p * 2.0 + t * 0.6));
    col = mix(col, vec3(0.97, 0.99, 1.0), foam * 0.85);

    float dist = length(cameraPosition - vWorld);
    float fog = smoothstep(uFogNear, uFogFar, dist);
    col = mix(col, uFogColor, fog);
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

export function buildSea(): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(700, 700, 120, 120).rotateX(-Math.PI / 2)
  const mat = new THREE.ShaderMaterial({
    vertexShader: waterVertex,
    fragmentShader: waterFragment,
    uniforms: {
      uTime: { value: 0 },
      uSunDir: { value: SUN_DIR.clone() },
      uDeep: { value: new THREE.Color(0x0a5f86) },
      uShallow: { value: new THREE.Color(0x2fd0cf) },
      uSkyLow: { value: new THREE.Color(0xcfeaf5) },
      uSkyHigh: { value: new THREE.Color(0x4a9fd8) },
      uFogColor: { value: new THREE.Color(0xcfe6ef) },
      uFogNear: { value: 90 },
      uFogFar: { value: 340 },
    },
  })
  const sea = new THREE.Mesh(geo, mat)
  sea.position.y = WATER_Y
  return sea
}

export function animateSea(sea: THREE.Mesh, t: number): void {
  ;(sea.material as THREE.ShaderMaterial).uniforms.uTime.value = t
}

// ---------- Playa (terreno con dunas, por bloque) ----------

/** Altura de la arena fuera de la pista. Continua en el mundo para que los bloques no tengan costuras. */
export function beachHeight(x: number, z: number): number {
  const d = Math.abs(x) - 3.6
  if (d <= 0) return -0.04
  const side = x < 0 ? 1.7 : 0
  const dune = (Math.sin(z * 0.05 + side) * 0.5 + Math.sin(z * 0.13 + x * 0.21 + side) * 0.3 + Math.sin(z * 0.31 - x * 0.4) * 0.12) * 0.45
  const shore = 12.5 + Math.sin(z * 0.07 + side) * 1.6 + Math.sin(z * 0.19 + 1.3 + side) * 0.7
  const rise = THREE.MathUtils.smoothstep(d, 0.5, 4) * (0.15 + dune)
  const fall = THREE.MathUtils.smoothstep(d, shore - 4, shore + 3) * 1.9
  return -0.06 + rise - fall
}

let beachMat: THREE.MeshStandardMaterial | null = null
export function buildBeachPiece(): THREE.Mesh {
  if (!beachMat) {
    const t = sandTex()
    beachMat = paint(0xffffff, { map: t.map, normalMap: t.normalMap, normalScale: 0.8, roughness: 0.95, key: 'beach' }) as THREE.MeshStandardMaterial
    beachMat.vertexColors = true
  }
  const geo = new THREE.PlaneGeometry(1, 1, 18, 26).rotateX(-Math.PI / 2)
  geo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 3), 3))
  const mesh = new THREE.Mesh(geo, beachMat)
  mesh.receiveShadow = true
  return mesh
}

/** Acomoda un pedazo de playa entre x0..x1 y z0..z1 (coordenadas del mundo). */
export function shapeBeach(mesh: THREE.Mesh, x0: number, x1: number, z0: number, z1: number): void {
  const geo = mesh.geometry as THREE.BufferGeometry
  const pos = geo.attributes.position as THREE.BufferAttribute
  const uv = geo.attributes.uv as THREE.BufferAttribute
  const col = geo.attributes.color as THREE.BufferAttribute
  // La grilla original se guarda aparte: "uv" se reescribe con coordenadas del mundo.
  if (!geo.getAttribute('uvGrid')) geo.setAttribute('uvGrid', uv.clone())
  const grid = geo.getAttribute('uvGrid') as THREE.BufferAttribute
  const wet = new THREE.Color(0xb59a72)
  const dry = new THREE.Color(0xffffff)
  const c = new THREE.Color()
  for (let i = 0; i < pos.count; i++) {
    const x = x0 + (x1 - x0) * grid.getX(i)
    const z = z0 + (z1 - z0) * (1 - grid.getY(i))
    const h = beachHeight(x, z)
    pos.setXYZ(i, x, h, z)
    uv.setXY(i, x / 7, z / 7) // la arena no "salta" entre bloques
    c.copy(dry).lerp(wet, THREE.MathUtils.smoothstep(-h, 0.35, 0.85)) // mojada cerca del agua
    col.setXYZ(i, c.r, c.g, c.b)
  }
  pos.needsUpdate = true
  uv.needsUpdate = true
  col.needsUpdate = true
  geo.computeVertexNormals()
  geo.computeBoundingSphere()
  mesh.position.set(0, 0, 0)
  mesh.scale.set(1, 1, 1)
}

// ---------- Volcán, islas, nubes y gaviotas ----------

export function buildVolcano(): THREE.Group {
  const g = new THREE.Group()
  const rt = rockTex()
  const geo = new THREE.ConeGeometry(1, 1, 48, 12, true)
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    const a = Math.atan2(z, x)
    const k = 1 + Math.sin(a * 7 + y * 4) * 0.05 + Math.sin(a * 13) * 0.03
    // boca abierta arriba
    const top = y > 0.42 ? 0.18 : 0
    pos.setXYZ(i, x * k + Math.sign(x) * top * 0.1, Math.min(y, 0.45), z * k + Math.sign(z) * top * 0.1)
  }
  geo.computeVertexNormals()
  g.add(m(geo, paint(0x6e625c, { map: rt.map, normalMap: rt.normalMap, roughness: 1, repeat: [6, 3] }), [95, 120, 95], [0, 6, 0]))
  // falda verde
  g.add(m(new THREE.SphereGeometry(1, 40, 12, 0, Math.PI * 2, 0, Math.PI / 2), paint(0x3f7d34, { roughness: 1 }), [130, 22, 130], [0, -8, 0]))
  // lava
  g.add(m(cyl, glow(0xff5a1a), [11, 1, 11], [0, 60, 0]))
  const lavaGlow = glowSprite(0xff6a1f, 70)
  lavaGlow.position.y = 66
  g.add(lavaGlow)
  // ríos de lava
  for (const a of [0.4, 2.2, 4.1]) {
    const r = m(new THREE.BoxGeometry(1, 1, 1), glow(0xff7a2a), [3, 0.5, 46], [Math.cos(a) * 26, 36, Math.sin(a) * 26])
    r.lookAt(0, 70, 0)
    r.rotateX(-0.9)
    g.add(r)
  }
  // humo
  const smokeMat = new THREE.SpriteMaterial({ map: cloudTex(), color: 0x7d7470, transparent: true, opacity: 0.85, depthWrite: false, fog: false })
  for (let i = 0; i < 7; i++) {
    const s = new THREE.Sprite(smokeMat)
    s.scale.set(40 + i * 14, 28 + i * 9, 1)
    s.position.set(i * 9, 78 + i * 16, 0)
    s.name = 'smoke'
    g.add(s)
  }
  return g
}

export function buildIsland(): THREE.Group {
  const g = new THREE.Group()
  const geo = new THREE.SphereGeometry(1, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2)
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const z = pos.getZ(i)
    const y = pos.getY(i)
    pos.setY(i, y * (1 + Math.sin(x * 4) * 0.25 + Math.cos(z * 3) * 0.2))
  }
  geo.computeVertexNormals()
  g.add(m(geo, paint(0x3e8a3a, { roughness: 1 }), [40, 18, 26], [0, -2, 0]))
  g.add(m(new THREE.CylinderGeometry(1, 1.05, 1, 28), paint(0xead19a, { roughness: 1 }), [44, 2, 29], [0, -1.5, 0]))
  return g
}

export function buildGull(): THREE.Group {
  const g = new THREE.Group()
  const mat = paint(0xf4f4f4, { roughness: 0.6, side: THREE.DoubleSide })
  g.add(m(sphere, mat, [0.15, 0.12, 0.45]))
  for (const sx of [-1, 1]) {
    const wing = new THREE.Group()
    wing.name = sx < 0 ? 'wl' : 'wr'
    const w = m(new THREE.PlaneGeometry(1, 0.3), mat, [1, 1, 1], [sx * 0.5, 0, 0])
    w.rotation.x = -Math.PI / 2
    wing.add(w)
    wing.add(m(new THREE.PlaneGeometry(0.3, 0.3), paint(0x333333, { side: THREE.DoubleSide }), [1, 1, 1], [sx * 0.95, 0.001, 0.02]).rotateX(-Math.PI / 2))
    g.add(wing)
  }
  return g
}

// ---------- Decoración a los lados de la pista (se recicla) ----------

export type DecorKind = 'palm' | 'hut' | 'rock' | 'torch' | 'post' | 'bush' | 'umbrella' | 'grass' | 'starfish' | 'sign'

function palmTree(): THREE.Group {
  const g = new THREE.Group()
  const tex = palmTrunkTex()
  const trunkMat = paint(0xffffff, { map: tex.map, normalMap: tex.normalMap, roughness: 0.9, repeat: [1, 6] })
  const h = 5 + Math.random() * 3
  const lean = (Math.random() - 0.5) * 2.2
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.3, 0),
    new THREE.Vector3(lean * 0.15, h * 0.35, 0),
    new THREE.Vector3(lean * 0.55, h * 0.7, 0),
    new THREE.Vector3(lean, h, 0),
  ])
  const tube = new THREE.TubeGeometry(curve, 20, 0.22, 12, false)
  // más grueso abajo
  const p = tube.attributes.position
  const center = new THREE.Vector3()
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i)
    const t = THREE.MathUtils.clamp(y / h, 0, 1)
    curve.getPoint(t, center)
    const k = 1.35 - t * 0.45
    p.setX(i, center.x + (p.getX(i) - center.x) * k)
    p.setZ(i, center.z + (p.getZ(i) - center.z) * k)
  }
  tube.computeVertexNormals()
  g.add(new THREE.Mesh(tube, trunkMat))
  const top = curve.getPoint(1)
  const n = 9
  for (let i = 0; i < n; i++) {
    const f = frond(2.4 + Math.random() * 0.6, 1.0, 0.8 + Math.random() * 0.4)
    f.position.copy(top)
    f.rotation.set(0, (i / n) * Math.PI * 2 + Math.random() * 0.3, 0.35 + Math.random() * 0.3)
    g.add(f)
  }
  const nut = paint(0x5a3d1e, { roughness: 0.8 })
  for (let i = 0; i < 4; i++) g.add(m(sphere, nut, [0.17, 0.19, 0.17], [top.x + Math.cos(i * 1.7) * 0.22, top.y - 0.25, Math.sin(i * 1.7) * 0.22]))
  return g
}

function rock(): THREE.Group {
  const g = new THREE.Group()
  const rt = rockTex()
  const mat = paint(0xffffff, { map: rt.map, normalMap: rt.normalMap, roughness: 0.95, key: 'rock' })
  const count = 1 + Math.floor(Math.random() * 3)
  for (let r = 0; r < count; r++) {
    const geo = new THREE.IcosahedronGeometry(1, 3)
    const pos = geo.attributes.position
    const v = new THREE.Vector3()
    const seed = Math.random() * 10
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i)
      const k = 1 + Math.sin(v.x * 3 + seed) * 0.12 + Math.sin(v.y * 5 + seed * 2) * 0.08 + Math.sin(v.z * 4 - seed) * 0.1
      v.multiplyScalar(k)
      if (v.y < -0.3) v.y = -0.3
      pos.setXYZ(i, v.x, v.y, v.z)
    }
    geo.computeVertexNormals()
    const s = r === 0 ? 1 : 0.5 + Math.random() * 0.3
    g.add(m(geo, mat, [1.3 * s, 0.85 * s, 1.1 * s], [r * 1.2, 0.2 * s, (Math.random() - 0.5) * 0.8]))
  }
  return g
}

function bush(): THREE.Group {
  const g = new THREE.Group()
  const mat = paint(0xffffff, { map: leafTex(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.55, key: 'leaf' })
  const leafGeo = new THREE.PlaneGeometry(0.7, 1.1)
  leafGeo.translate(0, 0.55, 0)
  for (let i = 0; i < 16; i++) {
    const l = new THREE.Mesh(leafGeo, mat)
    const a = (i / 16) * Math.PI * 2 + Math.random() * 0.3
    l.position.set(Math.cos(a) * 0.15, 0, Math.sin(a) * 0.15)
    l.rotation.set(0, -a + Math.PI / 2, 0)
    l.rotateX(0.4 + Math.random() * 0.6)
    l.scale.setScalar(0.8 + Math.random() * 0.6)
    g.add(l)
  }
  // flores de hibisco
  const petal = paint(0xff3d6e, { roughness: 0.4, side: THREE.DoubleSide })
  for (let f = 0; f < 3; f++) {
    const fl = new THREE.Group()
    for (let i = 0; i < 5; i++) {
      const p = m(sphere, petal, [0.11, 0.02, 0.06], [Math.cos((i / 5) * Math.PI * 2) * 0.09, 0, Math.sin((i / 5) * Math.PI * 2) * 0.09])
      p.rotation.y = -(i / 5) * Math.PI * 2
      fl.add(p)
    }
    fl.add(m(sphere, paint(0xffd23f), [0.03, 0.06, 0.03], [0, 0.04, 0]))
    fl.position.set((Math.random() - 0.5) * 0.8, 0.7 + Math.random() * 0.4, (Math.random() - 0.5) * 0.8)
    fl.rotation.set(Math.random() - 0.5, 0, Math.random() - 0.5)
    g.add(fl)
  }
  return g
}

function hut(): THREE.Group {
  const g = new THREE.Group()
  const pt = plankTex([170, 120, 70])
  const th = thatchTex()
  g.add(m(new THREE.CylinderGeometry(1, 1, 1, 24), paint(0xffffff, { map: pt.map, normalMap: pt.normalMap, roughness: 0.85, repeat: [6, 1] }), [1.7, 2.1, 1.7], [0, 1.05, 0]))
  g.add(m(new THREE.ConeGeometry(1, 1, 24, 3), paint(0xffffff, { map: th.map, normalMap: th.normalMap, roughness: 1, repeat: [4, 2] }), [2.8, 2.0, 2.8], [0, 3.05, 0]))
  g.add(m(new THREE.BoxGeometry(1, 1, 1), paint(0x4a2e16, { roughness: 0.9 }), [0.85, 1.3, 0.12], [0, 0.65, 1.66]))
  for (const a of [0.8, 2.4, 4, 5.4]) g.add(m(cyl, paint(0x6b4423), [0.08, 2.6, 0.08], [Math.cos(a) * 1.9, 1.3, Math.sin(a) * 1.9]))
  return g
}

function torch(): THREE.Group {
  const g = new THREE.Group()
  const bark = barkTex()
  g.add(m(cyl, paint(0xffffff, { map: bark.map, normalMap: bark.normalMap, roughness: 0.9 }), [0.08, 2.1, 0.08], [0, 1.05, 0]))
  g.add(m(new THREE.CylinderGeometry(1, 0.6, 1, 16), paint(0x5a3a1e, { roughness: 0.8 }), [0.2, 0.3, 0.2], [0, 2.2, 0]))
  // cuerda enrollada
  for (let i = 0; i < 3; i++) g.add(m(new THREE.TorusGeometry(0.09, 0.02, 6, 16), paint(0xc9b07a), [1, 1, 1], [0, 1.3 + i * 0.08, 0]).rotateX(Math.PI / 2))
  const fl = m(cone, glow(0xffb03a), [0.18, 0.5, 0.18], [0, 2.6, 0])
  fl.name = 'flame'
  g.add(fl)
  const halo = glowSprite(0xff9a2a, 1.4)
  halo.position.y = 2.6
  g.add(halo)
  return g
}

function post(): THREE.Group {
  const g = new THREE.Group()
  const bark = barkTex()
  g.add(m(cyl, paint(0xffffff, { map: bark.map, normalMap: bark.normalMap, roughness: 0.95 }), [0.18, 2.4, 0.18], [0, 0.6, 0]))
  g.add(m(new THREE.TorusGeometry(0.2, 0.045, 8, 20), paint(0xd9c27a, { roughness: 0.9 }), [1, 1, 1], [0, 1.25, 0]).rotateX(Math.PI / 2))
  return g
}

function umbrella(): THREE.Group {
  const g = new THREE.Group()
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 32
  const cg = c.getContext('2d')!
  for (let i = 0; i < 8; i++) {
    cg.fillStyle = i % 2 ? '#fff6e6' : ['#ff5d73', '#1fb3c9', '#ffb020'][Math.floor(Math.random() * 3)]
    cg.fillRect(i * 32, 0, 32, 32)
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  g.add(m(new THREE.ConeGeometry(1, 1, 16, 1, true), paint(0xffffff, { map: tex, roughness: 0.7, side: THREE.DoubleSide }), [1.6, 0.6, 1.6], [0, 2.3, 0]))
  g.add(m(cyl, paint(0xe8e2d5, { roughness: 0.4 }), [0.035, 2.4, 0.035], [0, 1.2, 0]))
  // toalla
  g.add(m(new RoundedBoxGeometry(1, 1, 1, 2, 0.1), paint(0x2f7fd8, { roughness: 0.9 }), [0.8, 0.03, 1.6], [0.9, 0.02, 0.2]))
  return g
}

function grass(): THREE.Group {
  const g = new THREE.Group()
  const mat = paint(0x9cb84a, { roughness: 0.8 })
  for (let i = 0; i < 12; i++) {
    const b = m(cone, mat, [0.03, 0.5 + Math.random() * 0.5, 0.03], [(Math.random() - 0.5) * 0.6, 0.3, (Math.random() - 0.5) * 0.6])
    b.rotation.set((Math.random() - 0.5) * 0.6, 0, (Math.random() - 0.5) * 0.6)
    g.add(b)
  }
  return g
}

function starfish(): THREE.Group {
  const g = new THREE.Group()
  const shape = new THREE.Shape()
  for (let i = 0; i <= 10; i++) {
    const a = (i / 10) * Math.PI * 2
    const r = i % 2 ? 0.07 : 0.2
    if (i === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r)
    else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r)
  }
  const star = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.04, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2 }), paint(0xff8a3d, { roughness: 0.6 }))
  star.rotation.x = -Math.PI / 2
  star.position.y = 0.03
  g.add(star)
  const shell = m(new THREE.SphereGeometry(1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), paint(0xfff0e0, { roughness: 0.35 }), [0.12, 0.06, 0.09], [0.5, 0, 0.3])
  g.add(shell)
  return g
}

function sign(): THREE.Group {
  const g = new THREE.Group()
  const pt = plankTex([190, 140, 85])
  g.add(m(cyl, paint(0x6b4423, { roughness: 0.9 }), [0.07, 1.8, 0.07], [0, 0.9, 0]))
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 96
  const cg = c.getContext('2d')!
  cg.drawImage(pt.map.image as HTMLCanvasElement, 0, 0, 256, 96)
  cg.fillStyle = '#3a2210'
  cg.font = 'bold 34px sans-serif'
  cg.textAlign = 'center'
  cg.textBaseline = 'middle'
  cg.fillText('PLAYA GUAYABA', 128, 50)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  const board = m(new RoundedBoxGeometry(1, 1, 1, 2, 0.05), paint(0xffffff, { map: tex, roughness: 0.85 }), [1.4, 0.5, 0.06], [0, 1.6, 0])
  board.rotation.z = 0.05
  g.add(board)
  return g
}

export function buildDecor(kind: DecorKind): THREE.Group {
  let g: THREE.Group
  switch (kind) {
    case 'palm':
      g = palmTree()
      break
    case 'hut':
      g = hut()
      break
    case 'rock':
      g = rock()
      break
    case 'torch':
      g = torch()
      break
    case 'post':
      g = post()
      break
    case 'bush':
      g = bush()
      break
    case 'umbrella':
      g = umbrella()
      break
    case 'grass':
      g = grass()
      break
    case 'starfish':
      g = starfish()
      break
    case 'sign':
      g = sign()
      break
  }
  return shadows(g, kind !== 'grass' && kind !== 'starfish', false) as THREE.Group
}

// ---------- Pista ----------

let pathMat: THREE.MeshStandardMaterial | null = null
let cliffMat: THREE.MeshStandardMaterial | null = null

/** Pedazo de sendero de arena compacta. Cada uno tiene su geometría para tener UV del mundo. */
export function buildGroundPiece(): THREE.Mesh {
  if (!pathMat) {
    const t = pathTex()
    pathMat = paint(0xffffff, { map: t.map, normalMap: t.normalMap, roughness: 0.9, key: 'path' })
    const s = sandTex()
    cliffMat = paint(0xc9a36e, { map: s.map, normalMap: s.normalMap, roughness: 1, key: 'cliff' })
  }
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), [cliffMat!, cliffMat!, pathMat, cliffMat!, cliffMat!, cliffMat!])
  mesh.receiveShadow = true
  return mesh
}

/** Da tamaño a un pedazo de pista: x centro, ancho, de z0 a z1, con la cara de arriba en `top`. */
export function sizeGroundPiece(mesh: THREE.Mesh, x: number, width: number, z0: number, z1: number, top = 0, depth = 2.4): void {
  mesh.geometry.dispose()
  const len = z1 - z0
  const geo = new THREE.BoxGeometry(width, depth, len)
  const pos = geo.attributes.position
  const uv = geo.attributes.uv
  // Cara de arriba (vértices 8..11): UV del mundo; u = 0.5 en el centro de cada carril
  for (let i = 8; i < 12; i++) {
    const wx = x + pos.getX(i)
    const wz = (z0 + z1) / 2 + pos.getZ(i)
    uv.setXY(i, wx / 2.2 + 0.5, wz / 4)
  }
  // Paredes del hueco: arena más oscura
  for (const range of [
    [0, 8],
    [12, 24],
  ])
    for (let i = range[0]; i < range[1]; i++) uv.setXY(i, uv.getX(i) * (i < 8 ? len / 3 : width / 3), uv.getY(i))
  mesh.geometry = geo
  mesh.position.set(x, top - depth / 2, (z0 + z1) / 2)
  mesh.scale.set(1, 1, 1)
}

export function buildPlatformPiece(): THREE.Group {
  // Muelle de tablones sobre vigas
  const g = new THREE.Group()
  const pt = plankTex([175, 122, 70])
  const top = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), paint(0xffffff, { map: pt.map, normalMap: pt.normalMap, roughness: 0.8, key: 'dock' }))
  top.name = 'top'
  top.castShadow = top.receiveShadow = true
  g.add(top)
  const under = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), paint(0x5a3a1e, { roughness: 0.9 }))
  under.name = 'under'
  under.castShadow = true
  g.add(under)
  return g
}

export function sizePlatform(g: THREE.Group, width: number, len: number): void {
  const top = g.getObjectByName('top') as THREE.Mesh
  top.scale.set(width, 0.25, len)
  top.position.y = -0.125
  const mat = top.material as THREE.MeshStandardMaterial
  // tablones cruzados: se repite según el largo
  if (mat.map) mat.map.repeat.set(1, 1)
  const under = g.getObjectByName('under')!
  under.scale.set(width * 0.9, 0.2, len * 0.95)
  under.position.y = -0.35
}
