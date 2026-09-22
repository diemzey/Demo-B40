# Evaluación 2 · Visualización, jerarquía y la historia antes/después

Revisor 2 del comité UI/UX · lente: datos, jerarquía visual, narrativa antes → después.
Capturas revisadas: `/dashboard` (prueba 1440 y 390, retail 1440), `#reportes` (retail 1440/390), `#semanas` (retail 1440/390), `/` (hero).
Solo evaluación; ningún archivo de la app fue tocado.

## A. Crítica del Diagnóstico actual (`src/app/dashboard/page.tsx`)

### Qué ve primero un gerente de tienda
1. **"400.0 h" en rojo** (tarjeta Horas al doble): es la cifra más grande y más saturada de la pantalla. Responde "¿cuánto excedo?", no "¿cuánto me cuesta ni cuánto ahorro?".
2. **Un muro de 72 barras rojas** (`HorasPorPersonaChart`): ocupa ~1 200 px de alto (`data.length * 17`), 2/3 del ancho, y en `prueba` todas las barras excedentes miden lo mismo (48 h): 50 rectángulos idénticos no dicen más que "50 de 72", que ya está en la tarjeta 2. Los nombres se cortan por la izquierda ("autista Castillo Carmen", "ngue Zamora Mónica") por `width={128}`.
3. El ahorro en pesos, que es la promesa del producto, aparece **en un `hint` de 12 px gris** ("Con la propuesta: $177,840 · ahorro $27,840") y como badge "−13.5 %". En retail el ahorro es de $108 433 (42 %) y sigue en gris.

La jerarquía está invertida: el problema (rojo, grande) domina; la solución (verde, pequeño) se esconde.

### Qué compite por la atención
- **Cuatro tarjetas de igual peso**: dos con número rojo, una blanca, una ámbar. Ningún "hero" tipográfico; el ojo salta entre ellas.
- **Tres bloques de dinero que no cuadran** entre sí: `$205,680` (costo laboral total, Postgres), `$27,840` (ahorro, Postgres) y `$48,000` (`CostoSemanalChart` y pie de tabla: horas al doble × `costoHora` local × 2, de `useConfig`). Un gerente no sabe cuál es "lo que pago". Además el tercero cambia si edita Configuración; los otros dos no.
- **Badge "−400.0 h" junto a "400.0 h"**: el delta repite el valor porque la propuesta siempre llega a 0. Ruido puro.
- **"Cobertura pico 100 % · −8.9 pts" en rojo** (prueba) a un lado de "ahorro" verde: el mensaje "la propuesta empeora los picos" queda a la misma altura que "la propuesta ahorra" sin ninguna explicación de que la baseline con horas extra cubre de más.
- **Header con select de tope + Reprogramar + Subir CSV + línea "publicada el…"**: tres controles y un metadato antes de cualquier resultado; en móvil ocupan 180 px arriba de la primera cifra.
- **Toggle Antes/Después** flotando a la derecha, arriba de la tabla, sin título ni pista de que es el elemento más importante de la página.

### Elementos de poco valor (medido contra los principios del producto)
| Elemento | Problema | Veredicto |
|---|---|---|
| `HorasPorPersonaChart` (72 barras) | Solo muestra "hoy"; no muestra la propuesta; barras idénticas; nombres cortados; 1 200 px | Eliminar. La lista por persona vive ya en la tabla y en Colaboradores |
| `CostoSemanalChart` | En `prueba` es **un punto** ("$48,000" flotando). En `retail` dibuja S28–S30 a $0 y S31 a $44 160 porque las semanas pasadas se miden contra 48 h y la actual contra 40 h: la curva "se dispara" por un cambio de regla, no por un cambio real | Eliminar del Diagnóstico; llevar una versión honesta (misma regla en todas las semanas, ahorro en vez de costo extra) a Semanas |
| Tarjeta `Tope 2027` (rama sin propuesta) | Informativa, ámbar (compite con el acento) y no cambia con la semana | Pasar al subtítulo del header ("tope legal 2027: 46 h · propuesta a 40 h") |
| `AntesDespuesChart` | Cuatro barras con las mismas cifras que las tarjetas 1 y 2; la barra "Reacomodada" siempre es 0 | Sustituir por el centro antes/después (sección B) |
| Pie `JornadaTotales` | Repite Horas al doble y Fuera de norma por tercera vez (tarjeta, chart, pie) | Conservar solo el dinero y las vacantes; lo demás ya está arriba |
| Badge "−400.0 h", "−50" | Deltas que replican el valor | Quitar; el delta interesa cuando la propuesta no llega a cero |
| Aviso "publicada el 21 sep, 08:01 pm" | Metadato de sistema en la línea de acciones | Tooltip del botón Reprogramar |

Cifras duplicadas: *Horas al doble* aparece 4 veces (tarjeta, chart pares, pie, ancho de 50 barras); *Fuera de norma* 4 veces; *dinero* 3 veces con 3 valores distintos.

### Móvil (390 px)
Recorrido: header (5 líneas) → 3 botones → 4 tarjetas apiladas (una pantalla y media) → 1 200 px de barras → chart pares → chart costo → toggle → tabla. El pie de totales rompe: "AL DOBLE · TOPE 40 H / FUERA DE NORMA / AL DOBLE · SEM" se encima en `grid-cols-3` fijo. El gerente llega al "Después" tras ~9 pantallas de scroll.

## B. Propuesta: el centro "Antes / Después" del Diagnóstico

Objetivo: en 5 segundos responder *cuánto me cuesta hoy · cuánto con la propuesta · cuánto ahorro · se cubren los picos · cuántas personas cambian*. Una sola pantalla, sin scroll en desktop.

### Jerarquía de cifras
1. **Héroe: el ahorro semanal en MXN** (`programacion.ahorroMxn`), `text-5xl/6xl`, emerald-400, contador (`useContador`) como en el hero de la portada. Sub-línea: "13.5 % del costo laboral · $1.4 M al año" (× 52).
2. **Secundarias (dos columnas, mismas filas)**: Costo laboral semanal *hoy* vs *propuesta* ($205 680 → $177 840), Horas al doble (400 → 0), Personas fuera de norma (50 de 72 → 0), Cobertura pico (100 % → 91.1 %). `text-2xl` a la izquierda (hoy, gris o rojo cuando duele), `text-2xl` a la derecha (propuesta, blanco; verde/ámbar/rojo según la lectura).
3. **Terciarias, 13 px**: "1 vacante sugerida · faltan 2.0 h en picos", "publicada 21 sep", tope.

Regla: **un número grande por pantalla**. Todo lo que hoy es `text-2xl` en cuatro tarjetas baja a una fila de comparación.

### Layout (desktop ≥ xl)
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ DIAGNÓSTICO · Sucursal Celaya · S30 · 20–26 jul · 72 colaboradores   [⋯]     │
├──────────────────────────────┬───────────────────────────────────────────────┤
│ AHORRO CON LA PROPUESTA      │  COBERTURA DE LA SEMANA (demanda vs personal) │
│ $27,840 /semana  ●contador   │   ▁▂▃▅▇▅▃  ▁▂▄▆▇▆▄  … (7 días × 30 min)       │
│ 13.5 % del costo · $1.4M/año │   ─ demanda requerida   ▒ hoy   ▓ propuesta   │
│                              │   picos sin cubrir marcados en ámbar          │
│          HOY      PROPUESTA  │                                               │
│ Costo    $205,680 → $177,840 │                                               │
│ Al doble  400 h  →   0 h     │                                               │
│ Fuera     50/72  →   0/72    │                                               │
│ Picos     100 %  →   91 %  ⚠ │  Lun Mar Mié Jue Vie Sáb Dom                  │
│ 1 vacante · faltan 2 h pico  │                                               │
├──────────────────────────────┴───────────────────────────────────────────────┤
│ QUIÉN CAMBIA DE HORAS            [Antes ◉ Después]   50 bajan · 22 igual     │
│ Bautista Castillo C.  48.0 ─────────▶ 40.0   −8.0 h   Excede → Cumple        │
│ Aguilar Moreno J.     24.0 ─────▶ 32.0       +8.0 h   Cumple                 │
│ …  (ordenado por |delta|, filas sin cambio colapsadas "22 sin cambios")      │
└──────────────────────────────────────────────────────────────────────────────┘
```
Tailwind: `grid grid-cols-1 gap-4 xl:grid-cols-5` → tarjeta héroe `xl:col-span-2`, gráfica de cobertura `xl:col-span-3`, lista de deltas `xl:col-span-5`. Acciones (tope, Reprogramar, Subir CSV) en un solo menú `[⋯]`/`DropdownMenu` o en el `TabHeader.action` con **un** botón primario.

### La comparación visual: dos columnas, mismas filas
Componente nuevo `ComparacionAntesDespues` (`src/components/dashboard/comparacion.tsx`): `<dl>` de 4 filas, `grid-cols-[auto_1fr_auto_1fr]`, flecha `→` entre columnas, valores `tabular-nums`. Color = estado: la columna Hoy en `text-destructive` solo donde duele (400 h, 50/72), la columna Propuesta en `text-emerald-400` cuando mejora, `text-amber-400` cuando empeora (cobertura 100 → 91). Sin barras: las barras de `AntesDespuesChart` no añaden nada cuando un lado siempre es 0.

### La gráfica que falta: cobertura vs demanda de la semana
Es la única gráfica que explica *por qué* la propuesta es válida (mantiene la cobertura donde hay demanda) y *dónde* falla (picos). Los datos existen: `cobertura_intervalo` (por escenario e intervalo de 30 min: `requerido_total`, `asignado_total`, `es_pico`) para baseline y propuesta; el motor también la devuelve en memoria (`EvaluacionEscenario.cobertura`).
- Recharts `ComposedChart` con eje X de 336 intervalos (7 días × 48), `XAxis` con ticks solo en el inicio de cada día (`ticks=[0,48,96,…]`, formateador "Lun…Dom") y `ReferenceLine` vertical tenue por día.
- `Area` **demanda requerida** (relleno `--muted` 30 %, sin línea fuerte) como fondo.
- `Line` **hoy** (`asignado_total` baseline, `--muted-foreground`, 1.5 px) y `Line` **propuesta** (`asignado_total` propuesta, `AMBAR` 2 px). Dos líneas, un área: máximo 3 tintas.
- `ReferenceArea` ámbar 12 % sobre intervalos `es_pico` con `asignado < requerido` en la propuesta (los que suman `deficitPicoHoras`); tooltip "Sáb 13:00 · requiere 9 · propuesta 8 · hoy 11".
- Altura 220 px; en móvil, 7 mini-áreas apiladas (`grid-cols-7` de sparklines de 40 px) o la misma gráfica con scroll horizontal `snap` por día.
- Modo "antes/después" de la gráfica: la línea *hoy* se atenúa cuando la vista está en Después, y viceversa; el área de demanda no cambia. Esto hace visible que la propuesta recorta el **sobrestaffing** (hoy por encima de la demanda) sin abrir huecos.
Datos: `obtenerDatosPanel` agrega una consulta a `cobertura_intervalo` para `baselineId` y `propuestaId` (672 filas, `select inicio, requerido_total, asignado_total, es_pico`) y expone `programacion.cobertura: { inicio, requerido, hoy, propuesta, pico }[]`.

### Lista de deltas por persona (en lugar de 72 barras)
- Filas: nombre · barra doble (segmento gris = hoy, segmento ámbar = propuesta, sobre la misma escala 0–52 con marca del tope) · `−8.0 h` en `text-destructive`/`+8.0 h` en emerald · badge estado *antes → después*.
- Orden por `|reacomodada − hoy|` descendente; las filas con delta 0 colapsadas en una línea "22 colaboradores sin cambio" con `Collapsible`.
- Resumen en el header de la lista: "50 bajan a 40 h · 22 reciben horas · 0 quedan fuera". Ese es el número "cuántas personas cambian" que hoy no existe (`fueraAntes − fueraDespues` no es lo mismo).
- Reutiliza `Persona` y `EstadoBadge` de `jornada-artefacto.tsx`; `Barra` se extiende con `horasSombra` para dibujar el segundo segmento.

### Qué anima
- **Contador** del héroe (`useContador`, ya existe) al cargar y al reprogramar.
- **Toggle manual Antes / Después** como control único de la página, colocado en el header de la comparación (no flotando sobre la tabla), con el **shimmer** existente (`j40-shimmer`, `DiagnosticoTabla.cambiar`) recorriendo héroe + comparación + gráfica + lista en un solo barrido: es el momento "wow" que gustó en la portada. Sin ciclo automático en el panel: el gerente necesita leer cifras quietas. Un ciclo automático de 2 vueltas solo la primera vez que aparece una propuesta recién publicada (`programacion.publicadoEn` < 60 s) y luego se detiene.
- Ninguna otra animación (barras de recharts `isAnimationActive={false}`, como ya está).

### Móvil (390 px)
Orden: título (2 líneas) → héroe ($27 840, `text-4xl`) → comparación 4 filas (`grid-cols-[1fr_auto_1fr]`, etiquetas encima de cada fila) → toggle → sparklines por día (7 columnas de 44 px, ámbar sobre gris; tocar un día abre la gráfica completa en `Sheet`) → lista de deltas (primeros 10, "ver 62 más"). Todo lo importante en las primeras 2 pantallas. Acciones en el menú `⋯` de la barra superior.

### Rama sin propuesta (`programacion === null`)
Hoy muestra cuatro tarjetas más un aviso. Debe ser una sola tarjeta con el diagnóstico de hoy (costo extra estimado, 400 h, 50/72) y el botón **Programar semana** como único CTA grande; la gráfica de cobertura y la lista de deltas aparecen al terminar (`router.refresh()`), con el shimmer. Idealmente Programar corre solo tras el import (principio del producto: "la propuesta se genera sola").

## C. Reportes (multi-sucursal) y Semanas

### Reportes (`tabs/reportes.tsx`, `charts-reportes.tsx`)
Lo bueno: hay un héroe claro ($29 444 814 en verde con borde emerald). Lo que sobra o confunde:
- Cuatro tarjetas iguales otra vez; "Costo propuesta vs. baseline" con delta en horas (`−159,334.0 h`) mezcla unidades; "Déficit pico 291 h-persona" en rojo compite con el héroe.
- Tabla "Por semana" repite baseline/propuesta/ahorro de las tarjetas en cuatro filas; sin gráfica de tendencia.
- "Tiendas con menor ahorro" (8 columnas, scroll horizontal en móvil) y "Mayor ahorro" son dos listas para la misma pregunta.
Propuesta:
1. Héroe único: ahorro total + "45.6 % · 50 tiendas · 4 semanas"; a su derecha la comparación baseline → propuesta (costo, horas, cobertura pico 50.9 → 98.1) con el mismo `ComparacionAntesDespues`.
2. `BarChart` **por semana con barras agrupadas** baseline (gris) / propuesta (ámbar) y `LabelList` con el ahorro encima (4 semanas → 8 barras); sustituye la tabla. `Bar` + `LabelList` + `CartesianGrid vertical={false}`.
3. `DesgloseAhorroChart` se queda (es útil) pero como **barra apilada de 100 %** de una sola fila (`BarChart layout="vertical"` con 4 `Bar stackId`), 48 px de alto, debajo del héroe: "de dónde sale el ahorro".
4. Tiendas: **un solo** `ScatterChart` o lista ordenada por ahorro % con `Bar` horizontal por tienda (50 filas, ámbar; rojo las que tienen déficit pico > 0), con filtro "solo las que piden revisión". Fusiona "menor" y "mayor" ahorro en una vista con extremo arriba y abajo.
5. Móvil: héroe → comparación → barras por semana → desglose → lista de tiendas (nombre, ahorro, pill %), sin tablas anchas.

### Semanas (`tabs/semanas.tsx`)
- La columna "Horas al doble" mezcla reglas (S31 vs 40 h = 368 h; S28–S30 vs 48 h = 0 h): el historial parece "sin problema hasta que llegó S31". Debe medirse toda la serie contra el **mismo tope** (el de la propuesta) o mostrar dos columnas con nombre explícito.
- Falta la gráfica de tendencia. Propuesta: `ComposedChart` pequeño (160 px) arriba de la tabla con `Bar` costo baseline (gris) y `Bar` costo propuesta (ámbar) por semana y `Line` ahorro acumulado (emerald) en eje derecho; el título lee "Ahorro acumulado: $469 578 en 4 semanas". Esa gráfica sustituye a `CostoSemanalChart` del Diagnóstico.
- Tabla: Semana · Fechas · Ahorro (verde) · Cobertura pico · Estado; "Fuera de norma" y "Horas al doble" salen (ya los da el Diagnóstico de cada semana) y la fila es link al Diagnóstico de esa semana.
- El importador CSV debe sentirse onboarding: cuando no hay semanas, la zona de arrastre ocupa toda la columna y la tabla no se dibuja vacía; tras importar, un paso 2 automático "Programando semana…" con la barra de progreso de `ProgramarSemana` y al terminar navegar al Diagnóstico con el shimmer.

## D. Implementación, por impacto

1. **Héroe + comparación** (`src/components/dashboard/comparacion.tsx` nuevo; `page.tsx` sustituye `TarjetasProgramadas`, `AntesDespuesChart` y las 4 `StatCard`). Solo HTML/Tailwind + `useContador`. Elimina 3 de los 4 duplicados.
2. **Quitar `HorasPorPersonaChart` y `CostoSemanalChart` del Diagnóstico** (`page.tsx`, `charts.tsx`; `CostoKpi` y el `costoHora` local dejan de generar un tercer dinero). Cero riesgo, recupera 1 400 px.
3. **Lista de deltas** (`src/components/dashboard/deltas-persona.tsx` nuevo; extiende `Barra` en `jornada-artefacto.tsx` con segmento "sombra"; `DiagnosticoTabla` pasa a envolver héroe+comparación+lista con el toggle y el `j40-shimmer` sobre un `section` común).
4. **Gráfica de cobertura vs demanda** (`src/components/dashboard/cobertura-semana.tsx` nuevo con `ComposedChart`, `Area`, `Line`×2, `ReferenceArea`, `ReferenceLine`, `Tooltip` custom; `dashboard.ts` consulta `cobertura_intervalo` para ambos escenarios; `tipos.ts` añade `ProgramacionPanel.cobertura`). Es la pieza más informativa y la única con trabajo de datos.
5. **Header a una acción** (`page.tsx`, `programar-semana.tsx`): select de tope + Reprogramar + Subir CSV dentro de un `DropdownMenu`; fecha de publicación a tooltip; tarjeta `Tope` al subtítulo.
6. **Semanas**: `tendencia-semanas.tsx` (`ComposedChart` `Bar`×2 + `Line`), tabla reducida, serie medida con un solo tope (`dashboard.ts` línea ~414: `horasAlDoble` del historial recalculado o etiquetado).
7. **Reportes**: reutilizar `ComparacionAntesDespues`; `BarChart` agrupado por semana; desglose como barra apilada 100 %; una sola lista de tiendas.
8. **Móvil**: sparklines por día (`AreaChart` 7 × 44 px sin ejes) y `Sheet` para la gráfica completa; pie de totales pasa a `grid-cols-1 sm:grid-cols-3`.
9. **Onboarding → propuesta automática**: `importar-csv.tsx` dispara `programarSemana` al terminar y redirige a `/dashboard` con el shimmer inicial (`publicadoEn` reciente).

Reglas de color a mantener (ya están en `charts.tsx`): gris = hoy/contexto, ámbar = propuesta/tope, emerald = ahorro, destructive = lo que duele hoy. Nunca dos magnitudes en un eje, máximo tres tintas por gráfica, un número héroe por pantalla.
