# Mis Gastos

App sencilla para anotar tus gastos y ahorrar. Es un solo archivo (`index.html`), no necesita instalar nada.

## Cómo usarla

1. Abre `index.html` en el navegador (o súbelo a Vercel / GitHub Pages).
2. En **Ingreso, meta de ahorro y límites** pon cuánto ganas al mes y cuánto quieres ahorrar.
   La app calcula cuánto puedes gastar (ingreso − ahorro) y cuánto te toca por día.
3. Cada vez que pagues algo, anótalo: monto, categoría, si era **necesario** o un **gusto**, y una nota.
4. Toca un gasto de la lista para corregirlo o borrarlo.

## Qué te muestra

- Cuánto llevas gastado del mes y cuánto te queda.
- Cuánto puedes gastar al día por lo que resta del mes.
- Cómo terminarías el mes si sigues al mismo ritmo.
- Cuánto se va en gustos (lo más fácil de recortar).
- Gasto por categoría, con límites opcionales que se ponen en rojo cuando te pasas.
- Comparación con el mes anterior.

## Tus datos

Abierta como archivo o página normal, los gastos se guardan en el navegador (`localStorage`).
Si borras los datos del navegador se pierden, así que usa **Descargar respaldo** de vez en cuando;
con **Restaurar respaldo** los recuperas. **Exportar CSV** abre en Excel o Google Sheets.
