# Kiko Rush

Endless runner 3D con alma de plataformero de los 90, hecho a partir del documento de diseño
(30 sept 2026, @Leonardo Escalona). Este prototipo jugable cubre el **MVP de la primera isla, Playa Guayaba**,
y corre en el navegador de celular y PC.

## Cómo correrlo

```bash
cd kiko-rush
npm install
npm run dev        # abre http://localhost:5173
npm run build      # valida los bloques de pista, revisa tipos y genera dist/
npm run validate   # sólo la prueba de "ruta segura" de los bloques
```

`dist/` es estático: se puede subir a GitHub Pages, Netlify o itch.io tal cual.

Para probar: `?debug` en la URL deja a Kiko invencible y expone `window.kiko`
(`kiko.debugWarp(900)` salta a ese metro, `kiko.debugSave({ bossUnlocked: true })` abre el jefe).

## Controles

| Acción | Móvil | Teclado | Control |
| --- | --- | --- | --- |
| Cambiar de carril | Deslizar ← → | A / D o flechas | Stick izquierdo / cruceta |
| Saltar / doble salto | Deslizar ↑ (otra vez en el aire) | Espacio / W | A / X |
| Deslizarse | Deslizar ↓ | S | B / Círculo |
| Golpe en picada | Deslizar ↓ en el aire | S en el aire | B / Círculo en el aire |
| Giro | Tocar | Shift / J | X / Cuadrado |
| Pausa | Botón ❚❚ | Esc / P | Start |

## Qué hay del MVP

- [x] Kiko con correr, cambiar de carril, saltar, doble salto, deslizarse, giro (0.5 s + 1 s de enfriamiento) y golpe en picada
- [x] Los tres modos de cámara (carrera normal, persecución de frente con el coco gigante, vista lateral 2.5D) con aviso sonoro y transición de 1 s
- [x] 30 bloques de pista de Playa Guayaba + 3 de descanso, unidos al azar, sin repetir, con dificultad 1–5 y prueba automática de ruta segura
- [x] Cajas de madera, flecha, hierro, pregunta, Chispa y barril de pólvora (se puede lanzar rodando con el giro)
- [x] Guayabas (vida extra cada 100), gemas, Chispa con sus 3 niveles (escudo, imán, 8 s invencible)
- [x] Power-ups: imán, patineta, y además mochila cohete y multiplicador x2
- [x] Jefe: Capitán Almeja (anclas que bloquean carriles; se le devuelven sus barriles con el giro, 3 golpes)
- [x] Pantalla final con récord, misiones completadas, revivir una vez con guayabas y "Otra vez"

Además: historia (el jefe aparece en la siguiente partida al superar 1,500 m), modo Infinito y Reto diario
(misma pista para todos ese día con una regla especial) al vencer al jefe, mejoras de power-ups en 5 niveles,
3 misiones diarias + 1 semanal, personajes cosméticos (Nena, Tico, Rufo) que no dan ventaja,
muertes distintas por obstáculo (quemado, aplastado, al agua, pinchado, mareado), pistas de Chispa
la primera vez que aparece cada cosa, y música tropical sintetizada (marimba, steel drum, bongos)
que cambia en persecución y jefe.

## Cómo está armado

| Archivo | Qué hace |
| --- | --- |
| `src/config.ts` | Todos los números del documento: velocidades por distancia, duraciones, física |
| `src/level/chunks.ts` | Los bloques de 50 m, escritos a mano |
| `src/level/validate.ts` | La prueba automática de ruta segura (corre en cada build) |
| `src/level/generator.ts` | Elige el siguiente bloque, mete descansos y alterna modos de cámara |
| `src/world.ts` | Pista, huecos, plataformas y objetos reciclados (object pooling) |
| `src/player.ts` | Física y animación de Kiko |
| `src/game.ts` | Colisiones, cajas, power-ups, Chispa, persecución, jefe, historia y guardado |
| `src/boss.ts` | La pelea con el Capitán Almeja |
| `src/camera.ts` | Las tres cámaras y la transición |
| `src/audio.ts` | Música y efectos con Web Audio |
| `src/models/` | Todos los modelos, hechos con geometría (sin archivos externos) |

Para agregar un bloque: añádelo a `PLAYA_CHUNKS` y corre `npm run validate`.

## Por qué web y no Unity (todavía)

El documento recomienda Unity y empezar con una sola isla jugable antes de invertir en lo demás.
Este prototipo es ese primer paso: se prueba hoy en cualquier celular con un link, sin tiendas,
para validar si el juego es divertido. Los datos (bloques, tabla de velocidad, balance de power-ups)
pasan casi igual a Unity cuando se decida el equipo.

## Pendiente (fuera del MVP)

- Islas 2 a 5 (Jungla Esmeralda, Ruinas del Sol, Pantano Niebla, Volcán Magmo) y sus jefes
- Contrarreloj de jefes (se abre al vencer al tercer jefe)
- Tablas de récords global / país / amigos (Firebase o Unity Gaming Services)
- Compras, pase de temporada y anuncios opcionales
- Arte y música finales (los modelos y la música actuales son provisionales)
