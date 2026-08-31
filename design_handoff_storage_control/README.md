# Entrega de diseño: Storage Control — Bodega de obras de arte (Ramos Delivery)

## Resumen

App para iPad que controla el inventario de una bodega de obras de arte y material de montaje
(guacales, obras sueltas, pedestales, vitrinas) y vincula objetos a mudanzas.

Todo movimiento entra o sale por lectura de un código QR. Cada objeto tiene un número de
inventario, ubicación física, medidas, peso, cliente propietario, foto e historial completo de
movimientos firmado por el operario. Un guacal es un registro que contiene piezas; también
existen objetos sueltos como registro independiente.

Usuarios: personal de bodega (escanea, mueve, registra) y administrador (inventario total).

## Sobre los archivos de este paquete

Los archivos `.dc.html` y `StorageControl-iPad.html` son **referencias de diseño hechas en HTML**:
prototipos que muestran el aspecto y el comportamiento deseados. **No son código de producción y no
deben copiarse tal cual.** Los datos viven en memoria, la cámara no lee QR de verdad y no hay
impresora ni base de datos conectada.

La tarea es **volver a construir estas pantallas en un entorno real**. Como el repositorio
`josueescalonarodriguez95-coder/app-for-storage-` está vacío, quien implemente elige el stack. La
recomendación, dado que se usará en iPad en una bodega:

- **Opción A — app nativa iPadOS**: SwiftUI + SwiftData/Core Data, `AVFoundation`
  (`AVCaptureMetadataOutput`) para leer QR, sincronización con un backend. La mejor opción: cámara
  fiable, funciona sin señal dentro de la nave, impresión por AirPrint.
- **Opción B — web app instalable (PWA)**: React + TypeScript, IndexedDB para trabajo sin conexión,
  `BarcodeDetector` o la librería `zxing-wasm` para el QR, backend con Postgres. Más rápida de hacer
  y sirve también en Android y escritorio; la cámara en Safari es algo menos fiable.

## Fidelidad

**Alta fidelidad.** Colores, tipografía, espaciado, radios y estados están definidos. Reprodúcelos
con exactitud. Hay dos estéticas en el paquete y sólo una es la aprobada:

- ✅ **APROBADA — `Bodega Ramos iPad.dc.html`** y su versión a pantalla completa
  `Bodega Ramos iPad Fullscreen.dc.html`: estética iPadOS 26, materiales translúcidos, esquinas
  redondeadas, SF Pro. **Implementa esta.**
- ⛔️ `Bodega Ramos.dc.html`: primera versión, estética plana tipo Swiss/Modernist con 2 px de
  regla y esquina cero. Se conserva sólo como referencia histórica. No implementar.

## Pantallas

Navegación lateral fija de 250 px con seis destinos: Escáner, Inventario, Entrada, Salida,
Mudanzas, Etiquetas. La ficha de detalle no es un destino del menú: se abre desde el inventario y
mantiene «Inventario» resaltado.

Cabecera común a todas las pantallas (56 px de alto útil, `padding: 16px 26px 14px`):
kicker de 12 px en `#8E8E93` + título de 30 px `font-weight: 700`, `letter-spacing: -0.035em`, y a la
derecha dos tarjetas de conteo («En bodega», «Fuera») de 14 px de radio.

### 1. Escáner QR

Propósito: identificar un guacal o pieza y actuar sin cambiar de pantalla.

Layout: dos columnas. Izquierda flexible, el visor de cámara: rectángulo negro `#0F0F10`,
`margin: 16px 0 16px 16px`, radio 24 px. Dentro, centrado, un marco de 326 × 326 px con borde
`1px rgba(255,255,255,.22)` y radio 26 px; en cada esquina una escuadra de 52 × 52 px con
`4px solid #E0472F` y el radio exterior de 26 px. Una línea de barrido de 2 px en `#E0472F` con
`box-shadow: 0 0 18px 3px rgba(224,71,47,.6)` recorre el marco arriba y abajo: animación 1,7 s
`ease-in-out infinite alternate`, de `top: 6%` a `top: 90%`. Arriba a la izquierda del visor, una
píldora de cristal (`rgba(255,255,255,.14)` + `backdrop-filter: blur(20px)`) con el texto
«Cámara trasera · lector QR».

Botones al pie del visor, centrados: «Simular escaneo» (primario, en producción es el botón de
torch/enfoque o se elimina) y «Buscar a mano» (cristal claro, va al inventario). Alto 48 px,
radio 16 px.

Derecha: panel de 384 px. Sin lectura muestra una tarjeta con instrucción. Con lectura muestra el
número a 28 px `font-weight: 700`, la etiqueta de estado, la descripción, una lista agrupada de
cuatro filas (Cliente, Ubicación, Medidas, Peso) sobre `rgba(120,120,128,.1)` y radio 14 px con
hairlines de `.5px rgba(0,0,0,.07)`, y dos botones: «Registrar salida» (primario) y «Ver ficha
completa» (secundario). Al fondo del panel, fijada abajo, la tarjeta «ESCANEOS DE HOY» con las
últimas tres lecturas (número, acción, hora).

Comportamiento real: al detectar un QR válido, resolver el número de inventario y cargar la ficha en
el panel derecho. Feedback háptico y sonido corto al leer. Si el código no existe en la base,
ofrecer «Registrar como nueva entrada» con ese código ya asignado.

### 2. Inventario

Propósito: buscar cualquier registro y abrir su ficha. Es la pantalla de inicio.

Layout: campo de búsqueda de 44 px de alto (radio 14 px, fondo `rgba(120,120,128,.14)`, lupa de
17 px en `#8E8E93`) que ocupa el ancho disponible, más el botón «Nueva entrada» a la derecha.
Debajo, un control segmentado iOS con seis opciones: Todos, En bodega, Fuera, Guacal, Obra,
Pedestal. Debajo, la tabla dentro de una tarjeta de radio 20 px sobre `rgba(255,255,255,.78)`.

Columnas (grid fijo): `96px 1fr 168px 126px 106px 104px` → N.º, Descripción, Cliente, Ubicación,
Entrada, Estado. Cabecera de 12 px `font-weight: 600` en `#8E8E93`. Filas de 14 px de padding
vertical, texto de 15 px, `border-bottom: .5px rgba(0,0,0,.06)`, hover
`rgba(120,120,128,.09)`, toda la fila es pulsable y abre la ficha. Número en `font-weight: 640` y
`font-variant-numeric: tabular-nums`. Descripción y cliente truncan con elipsis.

Al pie, una línea de 13 px en `#8E8E93`: «N de M registros · sincronizado <fecha>».

La búsqueda filtra sobre número, descripción, cliente, ubicación y tipo, sin distinguir mayúsculas.
Los filtros de estado y de tipo se combinan con la búsqueda.

### 3. Registrar entrada

Propósito: dar de alta un objeto que llega a la bodega e imprimir su etiqueta QR.

Layout: columna principal flexible con cuatro tarjetas apiladas (radio 20 px,
`rgba(255,255,255,.8)`, `box-shadow: 0 1px 3px rgba(0,0,0,.08)`, separadas 14 px) y una barra
lateral derecha de 322 px.

Tarjeta 1 — cabecera del registro: «Número asignado» con el consecutivo generado a 26 px
`font-weight: 700`, y el segmentado de tipo: Guacal, Obra, Pedestal, Vitrina.

Tarjeta 2 — lista de campos estilo iOS, cada fila 13 px de padding y hairline inferior; etiqueta a
la izquierda en columna fija de 132 px, `#48484A`, 15 px; el campo ocupa el resto sin borde ni
fondo, 16 px:
- Descripción · texto libre · placeholder «Guacal reforzado — óleo sobre tela, 2 piezas»
- Cliente · texto libre · placeholder «Galería, museo o particular»
- Medidas (cm) · tres campos Largo / Ancho / Alto, éstos sí con fondo `rgba(120,120,128,.12)` y
  radio 11 px
- Peso (kg) · numérico

Tarjeta 3 — «UBICACIÓN ASIGNADA»: segmentado de nave (N1, N2, N3), campo Rack de 104 px, campo
Nivel de 104 px, y a la derecha el texto «Sugerido: **N2 · R09 · B1**». En producción la sugerencia
la calcula el backend según espacio libre y dimensiones del objeto.

Tarjeta 4 — «CONTENIDO DEL GUACAL», **visible sólo si el tipo es Guacal**: cabecera con el botón
«+ Añadir pieza» y una lista de filas `ref / descripción / medidas`. Cada pieza es un subregistro
con su propia referencia `P-01`, `P-02`… En producción cada fila debe ser editable y poder llevar su
propio QR interno.

Barra lateral: tarjeta «FOTO DEL OBJETO» con área de 172 px que abre la cámara; tarjeta con la
previsualización del QR (58–62 px, radio 8 px sobre blanco), el número y «Se imprime al guardar ·
Formato 60 × 40 mm»; y abajo, fijados, «Guardar e imprimir» (primario, 50 px) y «Cancelar».

Al guardar: se crea el registro con estado «En bodega», fecha de entrada de hoy, ubicación
compuesta `nave · rack · nivel`, medidas concatenadas `L × A × H`, la primera entrada del historial
firmada con el usuario en turno, y el contenido si es guacal. Se navega a la ficha del objeto nuevo
y aparece un toast. La etiqueta se manda a la impresora.

### 4. Registrar salida

Propósito: dar salida a un objeto dejando constancia de quién lo entrega y quién lo recibe.

Layout: columna izquierda de 342 px con buscador (44 px) y lista scrollable de objetos que están en
bodega — cada fila muestra número, ubicación a la derecha y descripción truncada; la seleccionada se
tiñe con `rgba(224,71,47,.1)`. Columna derecha con el detalle y el formulario.

Estado vacío: texto centrado en `#8E8E93` — «Escanea el QR del guacal o elige un objeto de la lista
para registrar su salida.»

Con objeto elegido: número a 32 px `font-weight: 700`, etiqueta de estado, línea
«descripción · cliente», y una rejilla de cuatro tarjetas (Ubicación, Entrada, Medidas, Peso) de
radio 16 px. Debajo:

Tarjeta «MOTIVO DE SALIDA» con segmentado de tres opciones: Mudanza, Devolución, Exhibición. Y
«VINCULAR A MUDANZA»: lista de radios personalizados (círculo de 20 px, relleno
`#C8321C` con punto blanco al estar activo) mostrando código, cliente · destino y fecha.

Tarjeta «QUIÉN RECIBE» — el requisito clave:
- Campo «Nombre completo de quien recibe», ancho flexible, obligatorio
- Campo «ID / cargo» de 150 px, opcional
- Área de firma de 66 px con el texto «Firmar con el dedo o Apple Pencil» — en producción es un
  lienzo de firma que guarda un PNG
- Recuadro «Entrega» de 206 px, no editable, con el nombre del usuario en turno

Botones: «Confirmar salida» (primario, 50 px) y «Ver ficha».

Validación: sin nombre de quien recibe no se confirma; se muestra el toast «Falta el nombre de quien
recibe». Al confirmar, el objeto pasa a estado «Fuera», se le pone fecha de salida, se le borra la
ubicación (`—`) y se le añade al historial una entrada «Salida» cuya nota es
`motivo · código de mudanza · recibe <nombre> (<id>)`, firmada por el usuario en turno. Se navega a
la ficha. En producción debe generarse además un acta de entrega en PDF con la firma.

### 5. Ficha del objeto

Propósito: ver todo lo que se sabe de un registro y su trazabilidad.

Layout: columna principal más barra lateral de 322 px.

Principal: botón «‹ Inventario»; rejilla de ocho tarjetas de 16 px de radio en cuatro columnas —
Tipo, Cliente, Ubicación, Estado, Entrada, Salida, Medidas, Peso; tarjeta «CONTENIDO» con las piezas
del guacal (`ref` en columna de 56 px, descripción flexible, medidas a la derecha); y tarjeta
«HISTORIAL DE MOVIMIENTOS» con filas de fecha (150 px, tabulares), evento (104 px, en negrita —
las salidas en `#B52A16`), nota truncada y autor.

Barra lateral: número a 26 px y foto de 198 px; tarjeta con el QR de 58 px y la nota «Código pegado
en la cara frontal del guacal»; abajo «Registrar salida» y «Reimprimir etiqueta».

El historial es **sólo lectura y append-only**. Nunca se edita ni se borra un movimiento.

### 6. Mudanzas

Propósito: ver qué objetos van en cada mudanza y cuántos están cargados.

Layout: lista izquierda de 320 px con las mudanzas (código a 17 px `font-weight: 680`, fecha,
cliente, y resumen «6 objetos · 2 cargados»); la activa se tiñe con `rgba(224,71,47,.1)`.

Derecha: código a 32 px, etiqueta de estado, cliente, tres tarjetas (Fecha, Destino, Cuadrilla), y
la tarjeta «OBJETOS VINCULADOS» con grid `104px 1fr 128px 118px` → N.º, Descripción, Ubicación,
Cargado. La columna Cargado usa etiquetas de color: Cargado en verde
(`rgba(52,199,89,.18)` / `#1C7A37`), Pendiente en ámbar (`rgba(255,159,10,.2)` / `#8A5300`),
Devuelto en gris. Cabecera con el botón «+ Vincular escaneando», que lleva al escáner. Al pie, la
línea de progreso: «2 de 4 objetos cargados · último escaneo 06:15».

En este alcance las mudanzas sólo vinculan objetos existentes; no se crean ni se planifican rutas.

### 7. Etiquetas QR

Propósito: seleccionar registros e imprimir sus etiquetas.

Layout: segmentado de formato (60 × 40 mm, 100 × 70 mm, A4 · 12 por hoja), conteo de selección y
botón «Imprimir selección». Debajo, rejilla de cuatro columnas con una tarjeta por registro: QR de
52 px, número a 16 px `font-weight: 680`, cliente truncado, ubicación en negrita y la línea
«Ramos · <fecha de entrada>». Selección múltiple con toque: la tarjeta seleccionada lleva borde
`1.5px #E0472F` y fondo `rgba(224,71,47,.08)`; sin seleccionar, borde `rgba(0,0,0,.06)` sobre
`rgba(255,255,255,.82)`.

En producción el QR codifica el número de inventario (o una URL corta que lo resuelve) y la etiqueta
se manda por AirPrint a la impresora del muelle.

## Interacciones y comportamiento

- **Navegación**: cambio inmediato de pantalla, sin transición. El destino activo lleva fondo
  `rgba(255,255,255,.92)`, sombra `0 1px 3px rgba(0,0,0,.1)`, texto `#1C1C1E` e icono `#C8321C`.
  Inactivo: fondo transparente, texto `#3A3A3C`, icono `#6C6C70`, hover `rgba(120,120,128,.12)`
  con transición de 150 ms.
- **Toast**: centrado abajo, `rgba(28,28,30,.82)` con `backdrop-filter: blur(24px) saturate(180%)`,
  radio 20 px, punto rojo de 9 px, texto blanco de 15 px. Animación de 2,6 s: entra desde
  `translateY(14px) scale(.97)` en el 14 % inicial, se mantiene, y sale hacia `translateY(8px)`.
  Se dispara al guardar una entrada, al confirmar una salida, al leer un QR, al imprimir etiquetas y
  en el error de validación.
- **Botones primarios**: hover `filter: brightness(1.08)`. En nativo, usar el resaltado estándar.
- **Segmentados**: la opción activa es una píldora blanca con sombra `0 1px 3px rgba(0,0,0,.16)` y
  `font-weight: 600` sobre una pista `rgba(120,120,128,.12)` con 3 px de padding.
- **Toques**: ningún objetivo por debajo de 44 pt.
- **Sin conexión**: dentro de la nave puede no haber señal. Todo movimiento debe registrarse en local
  y sincronizarse después; la interfaz nunca debe bloquearse esperando red.

## Estado

| Estado | Tipo | Notas |
| --- | --- | --- |
| `screen` | enum | `scan · inv · entrada · salida · detalle · mud · etq` |
| `user` | objeto | usuario en turno: nombre, iniciales, rol, turno |
| `items` | lista | los registros de inventario |
| `query` | texto | búsqueda, compartida entre inventario y salida |
| `filtro` | enum | Todos · En bodega · Fuera · Guacal · Obra · Pedestal |
| `selId` | id | registro abierto en la ficha |
| `scanned` | id o nulo | resultado de la última lectura |
| `outId` | id o nulo | objeto elegido para salida |
| `motivo` | enum | Mudanza · Devolución · Exhibición |
| `mudLink` | código | mudanza a la que se vincula la salida |
| `recibe` / `doc` | texto | quién recibe y su ID o cargo |
| `mudSel` | código | mudanza abierta |
| campos de entrada | textos | tipo, descripción, cliente, L, A, H, peso, nave, rack, nivel, piezas |
| `etqSel` | lista de ids | etiquetas marcadas para imprimir |
| `formato` | enum | formato de etiqueta |
| `toast` | texto | mensaje efímero, se limpia a los 2,6 s |

## Modelo de datos sugerido

```
Objeto
  id                  · número de inventario, p. ej. RD-1042. Es lo que codifica el QR.
  tipo                · Guacal | Obra | Pedestal | Vitrina
  descripcion
  clienteId           → Cliente
  ubicacion           · nave, rack, nivel — nulo cuando el objeto está fuera
  medidas             · largo, ancho, alto en cm
  pesoKg
  fotoUrl
  estado              · En bodega | Fuera | Reservado | En tránsito
  fechaEntrada, fechaSalida
  contenedorId        → Objeto  · nulo si es un objeto suelto; apunta al guacal si es una pieza

Movimiento             (append-only, nunca se edita)
  objetoId → Objeto
  evento              · Entrada | Ubicado | Inspección | Reservado | Salida | Devolución
  fechaHora
  nota
  usuarioId → Usuario · quién lo registró
  recibeNombre, recibeDoc, firmaUrl   · sólo en salidas
  mudanzaId → Mudanza · opcional

Mudanza
  codigo              · MD-201
  clienteId → Cliente
  fecha, destino, cuadrilla
  estado              · Reservado | En tránsito | Cerrada

MudanzaObjeto          objetoId, mudanzaId, estadoCarga (Pendiente | Cargado | Devuelto)

Cliente                nombre, tipo (galería, museo, particular), contacto
Usuario                nombre, iniciales, rol (bodega | admin), turno
```

Reglas: un guacal con contenido no puede salir sin sus piezas; una pieza no se ubica por separado
mientras esté dentro de un guacal; el estado del objeto lo determina siempre su último movimiento.

## Tokens de diseño

Tipografía: SF Pro (`-apple-system, 'SF Pro Text', 'SF Pro Display', system-ui`).

| Uso | Tamaño | Peso | Tracking |
| --- | --- | --- | --- |
| Título de pantalla | 30 px | 700 | −0.035em |
| Número grande | 32 px | 700 | −0.035em |
| Número en panel | 26–28 px | 700 | −0.03em |
| Botón primario grande | 17 px | 600 | −0.02em |
| Cuerpo y campos | 15–16 px | 400–560 | −0.015em |
| Valor en tarjeta | 16 px | 600 | −0.02em |
| Etiqueta de sección | 12 px | 600 | 0 (mayúsculas) |
| Secundario y metadatos | 12–14 px | 400 | −0.01em |

Los campos de texto deben ser de **16 px como mínimo**: por debajo, Safari en iOS hace zoom al
enfocar.

Color:

| Rol | Valor |
| --- | --- |
| Acento (base) | `#C8321C` |
| Acento (claro, degradado) | `#E0472F` |
| Acento oscuro, texto sobre tinte | `#B52A16` |
| Degradado de botón primario | `linear-gradient(180deg, #E0472F, #C8321C)` |
| Sombra de botón primario | `0 2px 8px rgba(200,50,28,.32)` |
| Texto principal | `#1C1C1E` |
| Texto secundario | `#48484A` |
| Texto terciario | `#6C6C70` |
| Texto atenuado | `#8E8E93` |
| Fondo de la app | `radial-gradient(120% 110% at 12% 0%, #F4EFE9 0%, #E7E3DE 42%, #DCDCD8 100%)` |
| Superficie de tarjeta | `rgba(255,255,255,.78)` – `rgba(255,255,255,.82)` |
| Cristal de navegación | `rgba(255,255,255,.5)` + `blur(30px) saturate(180%)` |
| Cristal de cabecera | `rgba(255,255,255,.42)` + `blur(30px) saturate(180%)` |
| Relleno de control | `rgba(120,120,128,.12)` – `rgba(120,120,128,.14)` |
| Hairline | `.5px solid rgba(0,0,0,.06)` – `rgba(0,0,0,.09)` |
| Sombra de tarjeta | `0 1px 3px rgba(0,0,0,.07)` – `rgba(0,0,0,.08)` |
| Negro de cámara | `#0F0F10` |

Etiquetas de estado (radio 9 px, 12 px, peso 600):

| Estado | Fondo | Texto |
| --- | --- | --- |
| En bodega | `rgba(120,120,128,.16)` | `#48484A` |
| Fuera | `rgba(224,71,47,.14)` | `#B52A16` |
| En tránsito | `rgba(224,71,47,.9)` | `#FFFFFF` |
| Reservado | `rgba(28,28,30,.86)` | `#FFFFFF` |
| Cargado | `rgba(52,199,89,.18)` | `#1C7A37` |
| Pendiente | `rgba(255,159,10,.2)` | `#8A5300` |
| Devuelto | `rgba(120,120,128,.16)` | `#48484A` |

Radios: 9–11 px etiquetas y controles pequeños · 12–14 px campos y botones medianos · 15–16 px
botones grandes y tarjetas pequeñas · 18 px tarjeta de etiqueta · 20 px tarjetas de contenido ·
24 px visor de cámara · 50 % avatar.

Espaciado: 4 · 8 · 10 · 12 · 14 · 16 · 18 · 22 · 26 px. Padding de tarjeta 16–20 px; padding de
pantalla 18 px arriba y 26 px a los lados; separación entre tarjetas 10–14 px.

Medidas fijas: navegación 250 px · panel del escáner 384 px · barra lateral derecha 322 px · lista
de salida 342 px · lista de mudanzas 320 px · fila de navegación y campos 44 px mínimo · botón
primario grande 50 px.

## Recursos

- `assets/ramos-logo.jpeg` — logotipo de Ramos Delivery, lo entregó el cliente. Se usa en la
  navegación (34 px, radio 9 px sobre blanco) y como icono de la app.
- Iconos: seis pictogramas dibujados a mano en SVG con trazo de 1,9 px sobre rejilla de 24 px
  (escáner, rejilla de inventario, flecha de entrada, flecha de salida, camión, código QR). En
  nativo, sustituir por SF Symbols equivalentes: `qrcode.viewfinder`, `square.grid.2x2`,
  `arrow.down.to.line`, `arrow.up.to.line`, `truck.box`, `qrcode`.
- Las fotos de objeto son marcadores de posición; no hay imágenes reales todavía.
- Los QR de los prototipos son un patrón SVG decorativo, no codifican nada. Generar los de verdad
  al implementar.

## Datos de ejemplo

Los prototipos traen ocho objetos (`RD-1042` … `RD-1066`), tres mudanzas (`MD-201`, `MD-204`,
`MD-198`), cuatro clientes (Galería Mendoza, Museo Bellas Artes, Col. privada Arreola, Fundación
Serra) y tres usuarios (Leonardo Escalona y Marisol Ríos como personal de bodega, Andrés Ramos como
administrador). Son ficticios y sirven para probar la interfaz; sustitúyelos por los reales.

## Fuera del alcance de esta entrega

Decidido con el cliente, para fases posteriores: pantalla de acceso con PIN (se probó y se descartó
por ahora — la app abre directa en el inventario), plano visual de la bodega, creación y
planificación de mudanzas, firma de condición de la obra al recibir, portal de consulta para
clientes, reportes y valor asegurado.

## Archivos de este paquete

| Archivo | Qué es |
| --- | --- |
| `Bodega Ramos iPad.dc.html` | **Diseño aprobado.** Las siete pantallas dentro de un marco de iPad. |
| `Bodega Ramos iPad Fullscreen.dc.html` | El mismo diseño sin marco, a pantalla completa, con áreas seguras. |
| `StorageControl-iPad.html` | Un único archivo autocontenido, instalable en el iPad para probar. |
| `Bodega Ramos.dc.html` | Primera versión, estética plana. Referencia histórica, no implementar. |
| `assets/ramos-logo.jpeg` | El logotipo. |
| `support.js` | Runtime de los prototipos. No forma parte del diseño. |

Para ver los prototipos: abre cualquier `.dc.html` en un navegador moderno; son navegables.
