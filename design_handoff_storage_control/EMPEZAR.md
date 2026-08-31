# Cómo empezar — de GitHub a la app funcionando

Guía paso a paso para ti mismo, usando Claude Code. Todo lo que va entre comillas invertidas se
escribe en la Terminal del Mac.

---

## Paso 0 · Lo que necesitas instalado

En el Mac:

1. **Terminal** — ya viene con el Mac. Búscala con Cmd+Espacio.
2. **Homebrew** — el instalador de programas. Pega esto y dale Enter:
   ```
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```
3. **Git y Node**:
   ```
   brew install git node
   ```
4. **Claude Code**:
   ```
   npm install -g @anthropic-ai/claude-code
   ```
5. **Xcode** — sólo si vas por la app nativa de iPad. Se instala desde la App Store, tarda un rato.

Comprueba que quedó bien:
```
git --version
node --version
claude --version
```
Si los tres responden con un número, listo.

---

## Paso 1 · Bajar tu repositorio al Mac

Tu repositorio es `josueescalonarodriguez95-coder/app-for-storage-` y está vacío. Bájalo:

```
cd ~/Documents
git clone https://github.com/josueescalonarodriguez95-coder/app-for-storage-.git
cd app-for-storage-
```

Si te pide usuario y contraseña: GitHub ya no acepta contraseña. Ve a
github.com → tu foto → Settings → Developer settings → Personal access tokens → Tokens (classic) →
Generate new token, marca la casilla **repo**, y usa ese token como contraseña.

Ahora estás dentro de la carpeta del proyecto. Todo lo que sigue se hace desde aquí.

---

## Paso 2 · Meter el diseño en el repositorio

1. Descomprime `design_handoff_storage_control.zip` que descargaste.
2. Arrastra la carpeta `design_handoff_storage_control` dentro de `~/Documents/app-for-storage-`.
3. En la Terminal:

```
git add .
git commit -m "Diseño aprobado: Storage Control para iPad"
git push
```

Entra a github.com/josueescalonarodriguez95-coder/app-for-storage- y comprueba que aparece la
carpeta. Desde este momento el diseño está guardado y no se pierde.

---

## Paso 3 · Decidir el camino

Sólo hay una decisión de fondo, y conviene tomarla antes de escribir una línea:

**A · App nativa de iPad (SwiftUI).** La cámara lee QR de forma fiable, funciona sin señal dentro de
la nave, imprime por AirPrint y se siente como una app de Apple porque lo es. Necesitas Xcode y un
Mac. Para instalarla en los iPads de la bodega sin pasar por la App Store, hace falta una cuenta de
Apple Developer (99 USD al año) o reinstalarla cada 7 días con una cuenta gratis.

**B · Web app instalable (React + PWA).** Más rápida de construir, sirve en iPad, Android y
escritorio, se actualiza sola y no cuesta nada publicarla. La cámara en Safari es algo menos fiable
y el trabajo sin señal hay que programarlo con cuidado.

Mi recomendación para bodega: **empieza por B**. Tendrás algo usable en días, no en semanas, y si
más adelante hace falta la versión nativa, el diseño y la base de datos ya estarán resueltos.

---

## Paso 4 · Arrancar Claude Code

Desde dentro de la carpeta del proyecto:

```
claude
```

La primera vez te pedirá entrar con tu cuenta. Luego se queda esperando instrucciones.

Lo primero que le dices es esto (cópialo tal cual, ajustando la opción que elegiste):

> Lee `design_handoff_storage_control/README.md` completo antes de hacer nada. Es el documento de
> entrega de diseño de una app de control de bodega de obras de arte que voy a construir. Los
> archivos `.dc.html` de esa carpeta son prototipos de referencia: ábrelos y míralos, pero no copies
> su código.
>
> Quiero construirla como **web app instalable (PWA)** con React, TypeScript y Vite. Base de datos
> local con IndexedDB para que funcione sin señal dentro de la bodega. Sin backend por ahora.
>
> No escribas código todavía. Primero dime: qué estructura de carpetas propones, en qué orden
> construirías las siete pantallas, y qué dudas tienes sobre el diseño.

Ese último párrafo es importante. Deja que te proponga el plan antes de que empiece a generar
archivos; así corriges el rumbo cuando es barato.

---

## Paso 5 · Construir, pantalla por pantalla

No le pidas la app entera de un golpe. Ve por partes, en este orden — cada una se apoya en la
anterior:

1. **El modelo de datos y el almacenamiento.** Las tablas del README y guardar/leer en IndexedDB.
   Sin interfaz todavía.
2. **La estructura y la navegación lateral.** El marco de la app con las seis secciones vacías.
3. **Inventario.** La tabla, la búsqueda y los filtros, con los datos de ejemplo del README.
4. **Ficha del objeto.** Se abre desde el inventario.
5. **Registrar entrada.** El formulario completo, incluido el contenido del guacal.
6. **Registrar salida.** Con quién recibe, la firma y el vínculo a la mudanza.
7. **Escáner QR de verdad.** Cámara real leyendo códigos.
8. **Mudanzas y etiquetas.**

Después de cada paso, pruébalo en el navegador y guarda el avance:

```
git add .
git commit -m "Pantalla de inventario"
git push
```

Guarda seguido. Si algo se rompe, siempre puedes volver al último commit que funcionaba.

---

## Paso 6 · Probarlo en el iPad mientras lo construyes

Vite te da una dirección local. Arráncalo así para que el iPad la pueda ver:

```
npm run dev -- --host
```

Te mostrará dos direcciones. Usa la que empieza por `http://192.168…` y ábrela en Safari del iPad,
con el iPad en la misma red wifi que el Mac. Cada cambio que hagas se ve al instante.

---

## Paso 7 · Publicarlo para que quede instalado

Cuando esté usable, súbelo a un servidor gratuito. La opción más simple es Vercel:

1. Entra a vercel.com y crea cuenta con tu GitHub.
2. Add New → Project → elige `app-for-storage-`.
3. Deploy.

Te queda una dirección fija tipo `app-for-storage.vercel.app`. Ábrela en Safari del iPad →
Compartir → **Añadir a pantalla de inicio**. Ahí sí queda instalada de verdad, con icono y sin barra
de Safari. Y cada vez que hagas `git push`, se actualiza sola en todos los iPads.

---

## Paso 8 · Lo que falta decidir

Dos cosas que no dependen del código y que vas a necesitar pronto:

**Impresora de etiquetas.** El diseño contempla 60 × 40 mm. Las Brother QL o las Zebra ZD son las
habituales para almacén; si imprime por AirPrint, el iPad la ve directamente sin programar nada.

**Dónde viven los datos.** Empezando con IndexedDB, los datos se quedan en cada iPad por separado.
En cuanto haya dos personas registrando a la vez vas a necesitar un servidor común. Supabase es lo
más rápido de añadir (Postgres alojado, gratis para empezar) y encaja con el modelo de datos del
README sin cambios.

---

## Un par de consejos

- **Sé concreto con Claude Code.** «Arregla el inventario» no funciona. «En el inventario, la columna
  Cliente se desborda en pantallas estrechas; trúncala con elipsis» sí.
- **Remítete al README.** Cuando algo salga distinto al diseño, dile: «revisa la sección Inventario
  del README y ajústalo». Está escrito con los valores exactos justamente para eso.
- **No dejes que reescriba lo que ya funciona.** Si te propone rehacer una pantalla que ya está bien,
  dile que no.
- **Commit antes de cualquier cambio grande.** Es tu red de seguridad.
