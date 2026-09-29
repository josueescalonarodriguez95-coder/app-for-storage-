# Nuestras Cuentas

App para llevar los gastos de la casa entre dos personas (Josué y Roxana). Es un solo archivo (`index.html`), no necesita instalar nada.

## Apartados

- **Los dos**: todo lo que se gastó en el mes, cuánto le queda a la casa (lo que ganan juntos menos la meta de ahorro), cuánto pueden gastar por día y cuánto llevan ahorrado.
- **Josué** y **Roxana**: los gastos personales de cada quien, con un límite mensual opcional.

Cada gasto se marca como de Josué, de Roxana o de **la casa** (renta, súper, luz…), y como **necesario** o **gusto**.
La primera vez, cada aparato pregunta quién lo usa, para que lo que anote quede a su nombre.

## Gastos fijos

Renta, carro, internet, teléfono, seguros… se ponen una vez y **aparecen solos cada mes**, separados de los demás gastos.

- Toca un fijo para cambiarlo: **Solo este mes** (el precio subió una vez) o **Desde este mes** (el precio cambió para siempre; los meses anteriores quedan igual).
- **No va este mes** lo quita solo de ese mes; **Ya no se repite** lo termina.
- El círculo de la derecha marca que ya está pagado.

## Ajustes

En **Ingresos, ahorro y límites**: nombre e ingreso de cada quien, límite personal, meta de ahorro juntos, moneda y límites por categoría.

## Tus datos

Abierta como archivo o página normal, los datos se guardan en ese navegador (`localStorage`), así que **no se comparten entre aparatos**.
Para usarla los dos al mismo tiempo desde celular o computadora, usen la versión publicada en Claude (compártanla con permiso de Editor).
Usen **Descargar respaldo** de vez en cuando; **Restaurar respaldo** los recupera. **Exportar CSV** abre en Excel o Google Sheets.

Si antes usabas la primera versión (Mis Gastos), tus gastos pasan solos al apartado de Josué.
