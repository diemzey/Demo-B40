# Jornada40

Jornada40 toma la semana de turnos de una tienda (un CSV con quién trabaja
qué día y a qué hora) y devuelve el **antes y después** bajo la reforma de las
40 horas: cuánto cuesta la semana hoy, cuánto costaría con una programación
que respeta el tope elegido, cuántas horas al doble desaparecen y si la
cobertura en horas pico se mantiene. Está pensado para retail mexicano con
decenas de sucursales (el caso de referencia son 50 tiendas y ~80 personas
por tienda, operación de domingo a domingo).

Producción: https://testing-app.cesargonzalezzapata.workers.dev

## Cómo funciona

1. **Cuenta y empresa.** Al registrarse se crea la empresa; no hay datos de
   muestra. La primera pantalla pide el CSV y explica su formato
   (`public/plantillas/` trae ejemplos: una tienda, una cadena de 50 tiendas
   con 4 semanas).
2. **Tope de horas.** Antes de soltar el archivo se elige el tope semanal con
   el que se programa (48 · 46 · 44 · 42 · 40, la transición de la reforma).
   Queda guardado en la empresa y se puede afinar en Configuración.
3. **Guardar.** El archivo se lee en el navegador (papaparse), se valida fila
   por fila y se envía a Postgres **una llamada por sucursal**
   (`importar_turnos_sucursal`), que da de alta o actualiza colaboradores y
   turnos en una transacción. 85 mil turnos de 50 tiendas tardan ~40 s.
4. **Panel de inmediato.** En cuanto los turnos están guardados el panel abre
   en la primera sucursal y semana del archivo. Una cola en segundo plano
   programa todas las sucursal-semanas (2 tiendas a la vez) y una barra
   flotante muestra el avance; el Diagnóstico se actualiza solo conforme
   llegan propuestas. Si la pestaña se cierra a medias, al volver el panel
   ofrece terminar lo que falte.
5. **Antes y después.** Por sucursal y semana: costo laboral hoy contra
   propuesta, horas al doble, colaboradores fuera de norma, cobertura pico,
   cobertura por intervalo de 30 min, quién cede y quién recibe horas, y la
   tabla persona por persona. Reportes agrega toda la empresa.

Volver a soltar el mismo archivo no repite nada: cada carga guarda una huella
del contenido por sucursal y las que ya están idénticas se omiten.

## Tecnología

| Capa | Tecnología | Por qué |
|---|---|---|
| Web | Next.js 16 (App Router, React 19, TypeScript 5) | Componentes de servidor para el panel con datos por petición; `proxy.ts` renueva la sesión; Web Workers para el motor sin bloquear la UI. |
| UI | Tailwind CSS 4, shadcn/ui, Recharts, lucide-react | Sistema visual único para marketing y panel (`docs/ux/`). |
| Datos | Supabase: PostgreSQL 17, Auth, PostgREST, RLS | Integridad transaccional de las asignaciones (`EXCLUDE`, *constraint triggers*), particionado por semana, RLS multi-empresa, funciones junto a los datos. |
| Motor | TypeScript puro (`src/lib/motor`) | Corre en el navegador (Web Worker) y en scripts Node con el mismo código; sin solver externo. |
| Despliegue | OpenNext → Cloudflare Workers (`wrangler.jsonc`) | Edge global, sin servidor que mantener; `npm run deploy`. |
| Scripts | tsx, papaparse | Generador de datos sintéticos calibrados y corrida del motor por lotes. |

## Estructura del repositorio

```
src/app/                 rutas: marketing (/), login/registro, dashboard (layout con datos por sesión)
src/components/dashboard  panel: onboarding, importar-y-programar, estado-cola (cola en segundo plano),
                          comparacion, cobertura-semana, deltas-persona, diagnostico-tabla, tabs/
src/lib/importacion/      contrato del CSV (parse), destino, importar (RPC por sucursal, huella), flujo
src/lib/programacion/     cola.ts: programación en segundo plano a nivel de módulo
src/lib/motor/            motor: pronóstico, requerimiento, optimizar, evaluar, baseline, programar.ts
src/lib/reacomodo/        reacomodo simple de horas (mismo algoritmo que public.reacomodar_semana)
src/lib/datos/            lectura del panel y del reporte (Supabase → DatosPanel / DatosReporte)
supabase/migrations/      0002 esquema · 0003 RLS · 0004 vistas · 0005 reacomodo · 0006–0007 programación
                          0008 parámetros de empresa · 0009 huella · 0010 timeout · 0011 auditoría
                          0012 semanas_sin_propuesta · 0013–0014 importar_turnos_sucursal
scripts/sintetico/        generador y cargador de la cadena sintética (50 tiendas)
scripts/motor/            corrida por lotes del motor, verificación contra la base, reporte
docs/                     arquitectura, calibración de datos, resultados, evaluaciones UX
public/plantillas/        CSV de ejemplo
```

## Puesta en marcha

```bash
npm install
npm run dev            # http://localhost:3000
npm run build && npm start
npm run lint
npm run deploy         # OpenNext build + Cloudflare Workers
npm run sintetico:generar   # cadena sintética (scripts/sintetico/salida/)
npm run sintetico:cargar    # la sube a Supabase con la cuenta indicada en .env.local
npm run motor               # programa tienda-semanas por lotes y verifica contra la base
```

Variables en `.env.local` (nunca se versionan): `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `CLOUDFLARE_ACCOUNT_ID`,
`CLOUDFLARE_API_TOKEN`, y para los scripts `SINTETICO_EMAIL` /
`SINTETICO_PASSWORD`. Las migraciones se aplican en orden numérico
(`supabase/README.md` documenta cada una y el contrato del CSV). En Supabase
hay que fijar Site URL y Redirect URL del proyecto a la URL de producción para
que el correo de confirmación no apunte a localhost.

## Decisiones de diseño

Las decisiones de fondo, con alternativas descartadas, están en
`docs/arquitectura.md` (§2). Resumen y decisiones tomadas después al operar
con 50 tiendas:

- **Postgres como sistema de registro y de reglas.** Las reglas laborales no
  se validan sólo en la app: un turno que viole el tope, la jornada diaria,
  el descanso entre turnos, el día de descanso, la disponibilidad o la
  habilidad no puede existir en la base (ver trazabilidad abajo).
- **Intervalos de 30 minutos.** Los contadores de tráfico y los turnos reales
  operan a la media hora; 15 min cuadruplica el costo sin cambiar decisiones y
  60 min esconde los picos de comida y cierre.
- **Motor heurístico en TypeScript, formulación MILP documentada.** Voraz +
  búsqueda local, determinista, < 2 s por tienda-semana; la interfaz permite
  cambiar a un solver sin tocar el esquema. Corre en el navegador (Web Worker)
  para que el servidor no cargue con 200 optimizaciones.
- **Dos modos de demanda.** Con tráfico observado, pronóstico estacional y
  requerimiento por productividad (ahorros del orden del 45 % en el caso
  sintético). Sin tráfico, "cobertura actual": la demanda de cada intervalo y
  habilidad es la que hoy cubre el horario importado, así la propuesta
  conserva la curva de cobertura y el ahorro (11–13 %) viene sólo de las horas
  extra eliminadas. Nunca se reduce plantilla por inferencia.
- **Escenarios inmutables y versionados.** Baseline y propuesta son escenarios
  completos; uno publicado no se edita, se crea otro con `padre_id`. Comparar
  antes y después es comparar dos escenarios de la misma sucursal-semana.
- **Guardar rápido, programar en el fondo.** El panel abre al terminar de
  guardar; la cola programa después. Se probó guardar sucursales en paralelo
  y programar 3 a la vez: en la instancia base de Supabase cada llamada pasaba
  de ~0.5 s a 5–12 s por contención, así que el guardado va en serie y la cola
  programa 2 sucursales a la vez con reintento ante timeouts.
- **Cargas idempotentes.** Huella SHA-256 por sucursal en `importaciones_csv`;
  re-importar actualiza turnos por `(empleado, fecha, hora_inicio)` y omite
  sucursales ya cargadas iguales.
- **Lo que el panel lee son resúmenes.** La UI consulta `resumen_escenario`,
  `v_ahorro_escenario` y `reporte_ejecutivo`; nunca agrega asignaciones en
  interactivo. El reporte ejecutivo se pide sólo al abrir su pestaña.
- **Auditoría proporcional.** `escenarios` y toda actualización o baja de
  `asignaciones` se auditan; los *inserts* de asignaciones no, porque el
  escenario publicado e inmutable ya es la traza y mil filas por escenario
  duplicaban el volumen escrito.

## Nota de trazabilidad de restricciones

Cada restricción tiene una fuente, un parámetro y un punto donde se hace
cumplir. Ninguna es una constante escondida en el código: viven en
`reglas_laborales` (una fila global por año de la reforma y, si hace falta,
una por empresa) y el motor las lee de ahí.

| Restricción | Fuente | Parámetro | Dónde se hace cumplir | Qué pasa si se viola |
|---|---|---|---|---|
| Tope semanal (48 → 40 h) | Reforma LFT, transición 2026–2030; tope elegido por la empresa | `escenarios.tope_semanal`, `empleados.max_horas_semana`, `empresas.tope_objetivo` | Motor (`validarReglasDuras`, optimizador) y trigger diferido `trg_asignaciones_validar` al `COMMIT` | `check_violation` "Tope semanal excedido: … suma … h (tope … h)"; la propuesta no se guarda |
| Jornada diaria máxima | LFT art. 61 (8 h diurna) | `reglas.max_horas_dia`; `check` ≤ 12 h por turno | Motor y trigger | "Jornada diaria excedida: …" |
| Día de descanso semanal | LFT art. 69 | `reglas.max_dias_semana` = 6 | Motor y trigger | "Día de descanso semanal: … trabaja … días" |
| Descanso entre turnos | Política de empresa con base en art. 69 | `reglas.descanso_entre_turnos_horas` = 12 | Motor y trigger (también contra escenarios publicados de la misma semana) | "Descanso entre turnos insuficiente: …" |
| Sin traslape de turnos | Consistencia física | — | `EXCLUDE USING gist` en `asignaciones` (constraint, no trigger) | Error de exclusión al insertar |
| Disponibilidad del colaborador | Datos del colaborador | `disponibilidad` (ventanas por día) | Motor y trigger | "Fuera de disponibilidad: …" |
| Habilidad para el puesto | Catálogo de la empresa | `empleado_habilidades` (con vigencia) | Motor y trigger | "Habilidad no vigente: …" |
| Horas extra y prima | LFT arts. 67–68 (9 h al 200 %, resto al 300 %), art. 71 (25 % dominical) | `reglas.horas_dobles_max`, `factor_doble`, `factor_triple`, `prima_dominical_pct` | `v_costo_empleado_semana` en Postgres; `evaluar.ts` en el motor replica la fórmula al centavo | No es una prohibición: se valúa y se muestra como costo |
| Cobertura en picos | Objetivo del brief: sin subdotación en horas pico | `demanda_intervalo.es_pico` (P80 del requerimiento) | Optimizador (penalización); `cobertura_intervalo` y `v_subdotacion_pico` la miden | Se reporta como déficit de horas pico y vacantes sugeridas, nunca se oculta |
| Inmutabilidad | Trazabilidad | estado `publicado` / `archivado` | `trg_escenarios_proteger`, `trg_asignaciones_proteger`, `auditoria` sólo `INSERT` | "El escenario … está publicado y es inmutable" |

**Cómo se reconstruye una cifra.** Cada número del panel y del reporte se
sigue hacia atrás sin pasos manuales:

```
CSV (fila, sucursal)
  → importaciones_csv (archivo, huella, conteos, errores por fila)
  → horarios (origen = 'csv', importacion_id)                ← "hoy"
  → escenario baseline (materializar_baseline)  ─┐
  → escenario propuesta (motor, versión n)       ├→ asignaciones (una fila por turno)
                                                 │    → v_asignacion_horas_semana → v_costo_empleado_semana
                                                 │    → cobertura_intervalo (por intervalo de 30 min)
                                                 └→ resumen_escenario (resumir_escenario)
  → v_ahorro_escenario (baseline vs propuesta de la misma sucursal-semana)
  → reporte_ejecutivo (agregado por empresa y semana)
```

`select * from asignaciones where escenario_id = …` reproduce el costo de un
escenario con las fórmulas de `docs/arquitectura.md` §7; `scripts/motor`
verifica que el total calculado en TypeScript coincide con el de Postgres al
peso para cada tienda-semana (400/400 en `docs/reporte-resultados.md` §8).
Los parámetros usados por cada propuesta quedan en el escenario
(`tope_semanal`, `reglas_id`, `pronostico_id`, `parametros`), de modo que una
propuesta vieja se lee con las reglas de su momento aunque las reglas cambien.

## Documentación relacionada

- `docs/arquitectura.md` — ERD, decisiones y alternativas, formulación del
  motor, cálculo del ahorro, escalado a 50 tiendas.
- `docs/calibracion-datos.md` — supuestos de la cadena sintética (salarios,
  tráfico, productividad, mezcla de puestos).
- `docs/reporte-resultados.md` — resultados sobre 50 tiendas × 4 semanas,
  evidencia de cobertura en picos y verificación en la base.
- `supabase/README.md` — esquema, RLS, cada migración, contrato del CSV.
- `src/lib/motor/README.md` y `scripts/motor/README.md` — el motor en la app y
  por lotes.
- `docs/ux/` — principios de interfaz y evaluaciones.

## Límites conocidos

- La cola de programación vive en la pestaña abierta: si se cierra, el panel
  ofrece retomar, pero no hay un trabajador en servidor.
- Sin tráfico observado la demanda es la cobertura actual; el modo con
  pronóstico requiere cargar `trafico_observado` (todavía sin pantalla de
  carga propia).
- Turnos que cruzan medianoche no generan plantilla y su cobertura después de
  las 24:00 se ignora.
- No hay pantalla para borrar semanas o sucursales; la baja se hace archivando
  escenarios desde la base.
