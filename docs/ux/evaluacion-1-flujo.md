# Evaluación UX 1 · Flujo, número de pasos y arquitectura de información

Revisor 1 del comité. Lente: recorrido del usuario, clics/pantallas y jerarquía de la información.
Evidencia: capturas `ux1-*.png` en el scratchpad de la sesión (1280 px y 390 px) y referencias `archivo:línea`.
Principios evaluados: (1) pocos botones, (2) poca información de bajo valor, (3) panel centrado en antes/después,
(4) el CSV como onboarding, (5) propuesta automática al terminar la importación.

## a) Recorrido actual: del registro al antes/después

| # | Pantalla | Acción del usuario | Clics | Espera |
|---|----------|--------------------|-------|--------|
| 1 | `/` (ux1-home.png) | "Crear cuenta" en el header | 1 | — |
| 2 | `/registro` (ux1-registro.png) | 6 campos (nombre, apellido, empresa, correo, contraseña, confirmar) + casilla de privacidad + "Crear cuenta" (`register-form.tsx:442`) | 2 + tecleo | — |
| 3 | Correo | Abrir el buzón, clic en el enlace de confirmación → `/auth/confirm` → `/dashboard` (`register-form.tsx:173,196`) | 1 (fuera de la app) | minutos |
| 4 | Onboarding (ux1-onboarding.png) | Leer 3 pasos + tabla de 10 columnas + ejemplo; descargar plantilla; llenar en Excel; volver; soltar el CSV (la zona está al final de una página de 1 300 px; 1 500 px en móvil, ux1-onb-m.png) | 1 descarga + 2 (elegir archivo) | trabajo en Excel |
| 5 | Vista previa (`importar-csv.tsx:261-345`) | Revisar cifras; si el CSV no trae columna `sucursal`, escribir el nombre (`:271-290`) o elegir en un `<select>` (`:292-316`); "Importar N turnos" | 1 (+1 campo) | 1–3 s |
| 6 | Tarjeta "Importación completada" (`:477-550`) | Nada: `router.refresh()` (`onboarding.tsx:176`) sustituye el onboarding por el shell; la tarjeta desaparece a medias | 0 | recarga |
| 7 | Diagnóstico sin propuesta (`page.tsx:167-179`) | Leer el aviso "Esta semana aún no está programada: presiona Programar semana"; tarjetas con cifras del reacomodo heurístico de Postgres (`dashboard.ts:363-403`), no del motor | 0 | — |
| 8 | Mismo panel | Selector de tope (ya en 40) + "Programar semana" (`programar-semana.tsx:124-144`) | 1 | 5–10 s en un popover |
| 9 | Popover "Propuesta publicada" (`:242-301`) | Cerrar con la X; `router.refresh()` cambia las tarjetas | 1 | recarga |
| 10 | Tabla al fondo del panel (ux1-dash-scroll2.png) | Desplazarse ~1 300 px bajo la gráfica de 72 barras; pulsar "Después" (`diagnostico-tabla.tsx:47-76`) para ver la propuesta persona por persona | 1 + scroll | — |

Total: **6 pantallas + correo + Excel, 10–11 clics, 3 esperas y 2 recargas** antes de ver el antes/después completo.
De ellos, los pasos 7, 8, 9 y el toggle del 10 son puro "trabajo de la máquina que se le pide al usuario".
Además el panel enseña **dos "después" distintos**: el reacomodo heurístico (paso 7) y la propuesta del motor (paso 9),
con cifras que no coinciden, y el usuario no sabe por qué cambiaron.

## b) Problemas, por severidad

### Alta

1. **La propuesta no se genera sola tras importar** (principio 5). `ImportarCsv.onImportado` solo hace
   `router.refresh()` (`onboarding.tsx:176`, `tabs/semanas.tsx:145`); el motor solo corre desde el botón
   (`programar-semana.tsx:93-120`). El aviso ámbar de `page.tsx:167-179` pide al usuario que pulse un botón para
   obtener lo que vino a ver. Evidencia: paso 7-9 del recorrido.
2. **El antes/después no es el centro del panel** (principio 3). Orden real en `page.tsx:181-301`: 4 tarjetas →
   gráfica "Horas por colaborador" de 72 barras (~1 300 px, ux1-dash.png + ux1-dash-scroll1.png) → dos tarjetas
   laterales → **la tabla antes/después al final, detrás de un toggle** que solo muestra una fase a la vez
   (`diagnostico-tabla.tsx:29,47-76`). En móvil está a más de 3 000 px del inicio (ux1-dash-m-scroll.png).
3. **El onboarding es documentación, no onboarding** (principio 4). `onboarding.tsx:21-62,110-174`: 3 pasos
   numerados, tabla de 10 columnas con "Obligatoria/Ejemplo/Descripción", bloque de código, 2 botones de plantilla,
   y un tercer enlace "Descargar plantilla" dentro del importador (`importar-csv.tsx:210-219`). La zona de arrastre
   —la única acción— queda al fondo. En móvil la tabla se corta horizontalmente (ux1-onb-m.png).
4. **Dos topes que no son el mismo tope.** El selector del header (`programar-semana.tsx:154-167`, alimenta al
   motor) y "Tope vigente 46 h · 2027" en Configuración (`tabs/configuracion.tsx:15-21`, guardado en localStorage,
   `use-local-store.ts:89`) que el motor ignora; ese valor solo afecta a `CostoKpi` (`costo-kpi.tsx:38`) que además
   solo se muestra cuando no hay propuesta. La cuenta real ve "Sucursal principal: Coapa" (semilla demo,
   `tabs/sucursales.tsx:51`) aunque su sucursal es Celaya (ux1-configuracion.png).
5. **La misma lista de personas aparece tres veces en la ruta `/dashboard`**: gráfica de barras por persona
   (`page.tsx:242`), tabla antes/después (`page.tsx:295`) y pestaña Colaboradores (ux1-colaboradores.png, mismas
   barras y pastillas Cumple/Excede). Principio 2.

### Media

6. **Correo de confirmación rompe el flujo** (`register-form.tsx:196`): el usuario sale de la app en el paso 3.
   Más "Confirmar contraseña" y casilla de privacidad. No es decisión de UI, pero es el primer abandono posible.
7. **Decisión de sucursal en el importador** (`importar-csv.tsx:269-317`): campo de texto o `<select>` que
   condiciona el botón (`destinoListo`, `:158`). Para la primera importación debería inferirse (nombre de la
   empresa o "Principal", `importar.ts:24`) y ser editable después, no bloquear.
8. **"Subir semana (CSV)" vive en dos sitios**: botón del header del Diagnóstico que enlaza a `#semanas`
   (`page.tsx:158-163`) y el panel dentro de la pestaña Semanas (`tabs/semanas.tsx:145`). Y la pestaña Semanas de
   una cuenta con una semana es una tabla de una fila (ux1-semanas.png).
9. **Buscador muerto**: item "Buscar ⌘K" en el sidebar (`dashboard-shell.tsx:41`), input en el header (`:313-323`)
   y el diálogo `command-search.tsx` no buscan nada ("Escribe un comando o busca…", `:55-58`).
10. **Reportes duplica el Diagnóstico** para una tienda: mismo $27,840 / 13.5 % / 91.1 % en otro envoltorio,
    "Tiendas con menor ahorro 1 de 1" y "Mayor ahorro" con la misma tienda, y una línea "TRAZABILIDAD ·
    resumen_escenario → v_ahorro_escenario → reporte_ejecutivo()" para desarrolladores (ux1-reportes.png).
11. **Popover de resultado con telemetría**: "Turnos asignados 1,234 · 7.3 s" (`programar-semana.tsx:293-296`) y
    "El panel ya muestra la propuesta" mientras el panel de fondo aún no la muestra hasta el refresh (`:111`).
12. **Sucursales dice lo contrario que el importador**: "Las sucursales se crean al registrar la empresa; para
    agregar otra escríbenos" (`tabs/sucursales.tsx:211`) vs. "se crea si no existe" (`onboarding.tsx:44`).
    La tarjeta muestra "Principal" (nombre del hub) como ciudad (ux1-sucursales.png).

### Baja

13. Gráfica "Costo extra por semana" con un solo punto para cuentas nuevas (ux1-dash.png, abajo derecha).
14. Header del Diagnóstico en móvil: selector + Reprogramar + Subir semana ocupan tres filas antes del contenido
    (ux1-dash-m.png); pie de totales de la tabla se encima a 390 px (ux1-dash-m-scroll.png).
15. Checkbox "Registro electrónico de asistencia conectado" sin efecto (`tabs/configuracion.tsx:91-105`).
16. Tarjeta "Antes vs. propuesta" (`page.tsx:251-272`) repite las tarjetas 1 y 2 en formato barra.

## c) Flujo objetivo

**Una pantalla de onboarding = una zona de arrastre.** Todo lo demás es progresivo y automático.

1. **Registro** (`/registro`): nombre, empresa, correo, contraseña. Fuera "Confirmar contraseña"; la casilla de
   privacidad pasa a una línea "Al crear la cuenta aceptas el aviso de privacidad" bajo el botón. Si Supabase exige
   confirmación, la pantalla "revisa tu correo" ya existe (`register-form.tsx:263-290`); si no, directo a `/dashboard`.
2. **Onboarding** (`/dashboard` con `sinDatos`): título "Suelta la semana de tu sucursal", **la zona de arrastre
   arriba, a pantalla completa**, y una sola línea secundaria: "¿No tienes el archivo? Descarga la plantilla ·
   Ver columnas" (la tabla de columnas vive en un `<details>` colapsado o en un diálogo; una sola plantilla).
3. **Al soltar el archivo, sin botón**, comienza una narrativa continua de progreso en la misma tarjeta:
   - "Leyendo `archivo.csv` · 1 234 turnos · 72 personas · semana 30" (parseo, ya existe `parsearTurnos`).
   - Si hay filas con error: se muestran inline y **se continúa** con las válidas (hoy ya se importan sólo las
     válidas, `importar.ts`); "Cancelar" es el único botón, y solo mientras corre.
   - Si no hay columna `sucursal` y la empresa no tiene sucursales: se crea con el nombre de la empresa (o
     "Principal") sin preguntar; el nombre se puede corregir después en Sucursales. Si hay varias sucursales y el CSV
     no dice cuál: se usa la activa y se muestra un chip "Se guardará en Celaya · cambiar" que no bloquea.
   - "Guardando en Celaya" (`importarTurnos`).
   - "Programando la semana a 40 h" → llamar `programarSemana({ sucursalId, semanaIso, tope: 40, onProgreso })`
     por cada `resultados[i].sucursal.id × resultados[i].semanas[j]` (`ResultadoImportacion`, `importar.ts:56-70`),
     mapeando `ProgresoProgramacion.paso` a frases humanas ("Buscando la mejor combinación de turnos…"), una sola
     barra del 0 al 100 que abarca parseo + importación + motor.
   - Si el motor falla, la importación ya quedó: se muestra el panel con el aviso y un único botón "Generar propuesta".
4. **Al terminar**: `document.cookie = j40_sucursal=<id>` (como `dashboard-shell.tsx:203`) y `router.refresh()`;
   el layout deja de estar en `sinDatos` y abre el **Diagnóstico ya con `programacion`**. El resumen del popover
   actual ("Ahorro · semana $27,840") se convierte en el hero del panel, no en un popover.

**Botones que desaparecen**: "Importar N turnos", "Importar otro archivo", "Programar semana", el aviso ámbar
"presiona Programar semana", la X del popover, el toggle Antes/Después de la tabla, "Descargar plantilla" ×3 → ×1,
el `<select>` de tope del header, los botones/inputs muertos "Buscar ⌘K", "Registro electrónico", "Sucursal principal".

**Lo que se queda**: "Subir semana" (una sola vez, en el header del Diagnóstico, abre la misma tarjeta de arrastre
como diálogo; repite exactamente el flujo 3-4). "Reprogramar" pasa a botón secundario/outline dentro de la tarjeta
de la propuesta ("Propuesta a 40 h · publicada 21 sep · Reprogramar"), útil solo si cambió el tope o los datos.
El **tope pasa a Configuración** como único valor, guardado en la empresa (Supabase, no localStorage), con la
tabla de años de la reforma; cambiarlo ofrece "Reprogramar la semana actual con 44 h" ahí mismo.

## d) Arquitectura de información

**Navegación**: de 6 pestañas + buscador a **3**: Diagnóstico · Semanas · Configuración (y el selector de sucursal
que ya existe en el sidebar). Motivo: Sucursales, Colaboradores y Reportes no tienen acción propia ni información
que no esté en Diagnóstico para una empresa de 1–5 tiendas; se reintroducen bajo demanda:
- **Sucursales** → una fila por sucursal dentro de Semanas (o el selector del sidebar); las tarjetas actuales
  (ux1-sucursales.png) son el resumen que ya da el selector. Para `retail` (50 tiendas) se mantiene como lista
  compacta en Reportes.
- **Colaboradores** → se elimina; es la tabla "Antes" (ux1-colaboradores.png). El buscador por nombre pasa a la
  tabla antes/después del Diagnóstico.
- **Reportes** → se muestra solo cuando hay ≥2 sucursales o ≥2 semanas programadas (`reporte.total.tiendas > 1 ||
  semanas > 1`); para una tienda-semana es el Diagnóstico repetido. Quitar "TRAZABILIDAD".
- **Buscar ⌘K** → quitar hasta que busque algo.

**Diagnóstico (única pantalla importante)**, de arriba abajo:
1. Header: "Celaya · semana 30 · 72 colaboradores" + "Subir semana" (outline). Estado de la propuesta en una línea.
2. **Hero antes → después** en una sola franja de 3 pares (no 4 tarjetas con hints de dos líneas): Horas al doble
   400 → 0 · Fuera de norma 50 → 0 · Costo semanal $205,680 → $177,840 (**ahorro $27,840, −13.5 %** como cifra
   dominante). Cobertura pico y vacantes van como una línea de "condiciones" bajo el ahorro ("Cobertura pico 91 %
   · 1 vacante de 40 h"), porque son consecuencias, no el resultado.
3. **Tabla antes | después lado a lado** (una fila por persona: hoy → reacomodada, con barra y delta), altura
   fija con scroll interno (`JornadaArtefacto` ya lo hace con `maxAltura`, `jornada-artefacto.tsx:251-286`) y
   buscador. Sustituye a la gráfica de 72 barras, a la tarjeta "Antes vs. propuesta" y al toggle.
4. Fusionar en un solo bloque colapsado "Tendencia" la gráfica "Costo extra por semana" (`page.tsx:274-291`),
   visible solo cuando `semanas.length >= 2`.
5. Quitar: `HorasPorPersonaChart` (misma información que la tabla), tarjeta "Antes vs. propuesta", tarjeta
   "Tope 2026" del estado sin propuesta (`page.tsx:216-228`), `CostoKpi` (dato de localStorage).

**Semanas**: historial (ya está bien, ux1-retail-semanas.png) + clic en una fila cambia la semana del Diagnóstico
(hoy no hay forma de ver una semana anterior). La tarjeta de importación sale de aquí y vive en "Subir semana".

**Configuración**: tope (fuente única, en Supabase) y costo por hora. Fuera "Sucursal principal" y "Registro
electrónico" hasta que hagan algo.

**Onboarding**: ver c.2: hero + zona de arrastre; la tabla de columnas y el ejemplo se colapsan; una plantilla.

## e) Lista de implementación (impacto/esfuerzo)

1. **Encadenar importación → motor** (impacto máximo, esfuerzo medio). Nuevo `src/components/dashboard/
   importar-y-programar.tsx` (o ampliar `importar-csv.tsx`): estado `parseando → importando → programando(sucursal,
   semana, progreso) → listo | errorMotor`; al cargar el archivo llama `importarTurnos` sin botón intermedio y
   luego `programarSemana` con `tope: 40` por cada sucursal-semana de `resultados`; una sola barra 0-100 con
   frases humanas para `ProgresoProgramacion.paso` (`programar.ts:59-63`); al terminar fija la cookie
   `COOKIE_SUCURSAL` y `router.refresh()`. Reutilizar `Resumen` de `programar-semana.tsx:242-301` como hero.
2. **Onboarding mínimo** (`onboarding.tsx`, alto/bajo): mover `ImportarCsv` arriba; `PASOS`, `COLUMNAS`, `EJEMPLO`
   y las plantillas a un `<details>` "¿Cómo debe verse el CSV?"; un solo enlace de plantilla; quitar el aviso de
   `importar-csv.tsx:247-250` (encabezado repetido bajo la zona de arrastre).
3. **Destino automático de la sucursal** (`importar-csv.tsx:151-171,269-317`, alto/bajo): sin sucursales → crear
   con `datos.empresa.nombre`; con una → usarla; con varias → chip "cambiar" no bloqueante. Quitar `destinoListo`
   del `disabled`.
4. **Diagnóstico reordenado** (`page.tsx`, alto/medio): hero de 3 pares con ahorro dominante (nuevo componente
   `antes-despues-hero.tsx` a partir de `StatCard`); tabla lado a lado en `jornada-artefacto.tsx` (nueva prop
   `modo: "comparar"` que pinta `hoy` y `reacomodada` en la misma fila) o dos `JornadaArtefacto` en grid; borrar
   `HorasPorPersonaChart`, `AntesDespuesChart` y el toggle de `diagnostico-tabla.tsx`; `CostoSemanalChart` solo con
   `semanas.length >= 2`. Quitar el aviso `page.tsx:167-179` y el botón "Subir semana → #semanas": que abra el
   diálogo de importación del punto 1.
5. **Tope a Configuración y "Reprogramar" secundario** (`programar-semana.tsx`, `tabs/configuracion.tsx`,
   medio/medio): eliminar el `<select>` del header; el tope se lee de `empresas` (nueva columna `tope_horas` o
   tabla de config por empresa) con `TOPE_2030` por defecto; `ProgramarSemana` queda como botón outline dentro de la
   tarjeta de la propuesta, sin popover: el progreso se muestra inline en el hero. Quitar `use-local-store` para
   tope/costo.
6. **Podar navegación** (`dashboard-shell.tsx:37-77`, medio/bajo): quitar `search`, `colaboradores`, `sucursales`;
   `reportes` condicionado a `reporte.total.tiendas > 1 || reporte.total.semanas > 1`. Borrar `command-search.tsx`,
   `tabs/colaboradores.tsx`; `tabs/sucursales.tsx` se reduce a lista dentro de Semanas y corregir el texto de
   `:211`. Quitar "TRAZABILIDAD" y las tarjetas "menor/mayor ahorro" cuando hay una sola tienda (`tabs/reportes.tsx:
   268-300`).
7. **Semana seleccionable** (`tabs/semanas.tsx`, `dashboard.ts:279-283`, medio/medio): cookie `j40_semana` o
   query `?semana=` para que el Diagnóstico muestre otra semana del historial.
8. **Registro más corto** (`register-form.tsx`, bajo/bajo): quitar "Confirmar contraseña" (mostrar/ocultar ya
   existe), casilla → texto legal bajo el botón.
9. **Móvil** (bajo/bajo): pie de totales de la tabla a una columna en `<sm` (`jornada-artefacto.tsx:395-400`);
   header del Diagnóstico con un solo botón.
