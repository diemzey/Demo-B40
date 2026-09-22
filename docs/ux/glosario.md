# Glosario de UI · Jornada40

Vocabulario único para todo el producto (portada, auth, onboarding, panel). Español de México, segunda persona, corto y concreto. Si un texto usa una palabra de la columna "No usar", se reescribe.

| Concepto | Término en la UI | No usar |
|---|---|---|
| El resultado del motor | **propuesta** ("tu propuesta", "con la propuesta") | reacomodo, reacomodada, escenario, optimizar/optimizado, cuadrante, baseline |
| El verbo del botón | **Programar** (semana) | Reprogramar, Generar escenario, Optimizar |
| Límite semanal de horas | **tope** ("tope de 40 h", "tope objetivo", "arriba del tope") | jornada (como límite), umbral, hora 47, máximo legal (solo como dato del año) |
| Dato del CSV con horas contratadas | jornada contratada | — |
| Persona que trabaja en la sucursal | **colaborador / colaboradores** | persona(s), empleado(s), plantilla (para gente), staff |
| Conjunto de colaboradores | plantilla (solo en "72 en plantilla") | nómina, headcount |
| Tienda / unidad | **sucursal** | tienda, tienda-semana, workspace, unidad |
| Archivo de turnos | **formato CSV** ("Descargar formato CSV", "Sube tu semana") | plantilla (para el archivo), template, layout |
| Horas arriba del tope | **horas al doble** | horas extra, overtime, dobles/triples (solo en desglose de costo) |
| Colaboradores arriba del tope | **fuera de norma** ("50 fuera de norma") | excedidos, en incumplimiento |
| Intervalos pico cubiertos | **cobertura de picos** ("cobertura de picos 91 %") | cobertura pico, subdotación, déficit pico, h-persona |
| Horas pico sin cubrir | "faltan 2 h en horas pico" | déficit, subdotación |
| Posiciones por contratar | **vacantes** ("1 vacante de 40 h") | headcount, posiciones, FTE |
| Personal de más | **personal de más** | sobrestaffing, overstaffing |
| Dinero | "costo actual", "costo con la propuesta", "ahorro", "costo de horas al doble" | costo extra, costo laboral, baseline, MXN como sufijo |
| Estado de la semana | **programada** (ya tiene propuesta) / **sin propuesta** | publicado, escenario publicado |
| Estado de una persona | Excede / En el tope / Cumple | Fuera / OK / Alerta |
| Ajustes | **Configuración** | Ajustes, Settings, Parámetros |

## Semanas y fechas

- Título: **"semana del 20 al 26 de julio"** (`fmtSemanaLarga`). Si cruza de mes: "semana del 27 de julio al 2 de agosto".
- Corto (tablas, cápsulas, migas): **"20 – 26 jul"** (`fmtSemana`). Si cruza: "27 jul – 2 ago".
- Nunca "S30", "semana ISO", "2026-07-27" ni "27–2 ago" en la UI. El número ISO solo en `title`/tooltip si hace falta.
- Fecha con hora: "21 sep, 8:01 pm" (`fmtFechaHora`), sin puntos.

## Números

Todos con `Intl es-MX` desde `src/components/dashboard/tabs/ui.tsx`:

| Helper | Ejemplo | Regla |
|---|---|---|
| `fmtMXN(205680)` | `$205,680` | sin decimales, sin sufijo "MXN", signo menos tipográfico `−` |
| `fmtHoras(400)` · `fmtHoras(2928.5)` | `400 h` · `2,928.5 h` | máximo 1 decimal, sin ".0" |
| `fmtPct(13.5)` | `13.5 %` | 0–100, espacio fino antes de `%` |
| `fmtEntero(1250)` | `1,250` | |
| `conSigno(fmtHoras(-400), -400)` | `−400 h` / `+12 h` | deltas |
| `fmtFecha("2026-09-21")` | `21 sep 2026` | |

## Botones y cápsulas

- Un primario por pantalla: amarillo (`Button variant="primary"` o `BotonPrimario`). Secundario: `variant="outline"` / `BotonOutline`. En el panel, `size="sm"` (36 px escritorio, 40 px táctil).
- Cápsulas: solo `Pill` con tonos `good` (cumple/en norma/programada), `warn` (en el tope, atención), `bad` (excede/fuera de norma), `neutral` (sin dato), `marca` (amarillo: "Actual"). `TONO_ESTADO` mapea excede/limite/cumple.
- Eyebrow: `j40-eyebrow` (10 px mono, mayúsculas, gris). Cuerpo: `j40-body` (13 px). Secundario: `j40-muted` (12 px gris). No `text-[Npx]`.

## Tono de los mensajes

- Estados vacíos: qué ver aquí + un solo botón. "Aquí verás el ahorro de todas tus sucursales. Empieza por programar una semana."
- Errores: qué pasó + qué hacer, nunca `error.message`. "No pudimos cargar tus sucursales. Recarga la página."
- Éxito: el dato, no el proceso. "Semana del 20 al 26 de julio guardada · 72 colaboradores · 214 turnos".
- Progreso: verbos en gerundio, sin jerga: "Leyendo tus turnos → Midiendo la demanda → Armando la propuesta → Calculando el ahorro → Listo".
