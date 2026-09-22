# src/lib/motor · Motor de programación en la app

El motor de docs/arquitectura.md §5–§7 vive aquí como TypeScript puro
(sin `node:`, sin `process`) para poder correr **en el navegador** con la
sesión del usuario. `scripts/motor/*.ts` re-exporta estos mismos módulos, así
que el pipeline batch (`npm run motor`) y la app comparten una sola
implementación.

| Archivo | Qué hace |
|---|---|
| `tipos.ts`, `tiempo.ts`, `reglas.ts`, `requerimiento.ts`, `pronostico.ts`, `optimizar.ts`, `evaluar.ts`, `baseline.ts`, `capacidad.ts` | El motor (ver `scripts/motor/README.md`). |
| `programar.ts` | `programarSemana({ supabase, sucursalId, semanaIso, tope?, costoHoraDefault?, onProgreso? })`: catálogo mínimo → demanda → baseline → optimización → propuesta publicada → `v_ahorro_escenario`. |
| `worker.ts` | Web Worker que corre `optimizar` fuera del hilo principal (si no puede crearse, se corre en línea). |

## Qué corre dónde

- **Navegador** (usuario firmado, RLS): todo `programarSemana`. Lecturas y
  escrituras van por PostgREST; el cálculo pesado (`optimizar`, ≤ 3 s) va en
  un Web Worker. No hay CPU de servidor involucrada (Cloudflare Workers).
- **Postgres**: `materializar_baseline` (baseline desde `horarios`),
  el constraint trigger diferido que valida las reglas duras de cada lote de
  `asignaciones`, y `resumir_escenario` (costo, sobrestaffing, cobertura pico).
  La UI lee `v_ahorro_escenario`.

## Catálogo mínimo (idempotente)

Un CSV sólo trae `empleados.puesto` (texto) y `horarios`. Antes de programar,
`programarSemana` completa lo que el esquema de 0006 exige, sin duplicar:
habilidades `piso/caja/almacen/supervision`; un `puesto` por texto distinto
(clave = slug; habilidad por palabra clave: caj→caja, almac/bodeg/recib→almacen,
superv/gerent/encarg/jefe→supervision, resto piso); un tabulador por puesto
sin tarifa vigente (`costoHoraDefault`, prima 25 %); `empleados.puesto_id`;
`empleado_habilidades` (puesto + piso); `plantillas_turno` derivadas del
horario importado más un juego estándar (sólo si la empresa no tiene); y una
fila de `reglas_laborales` de la empresa con `tope_semanal = tope` vigente
desde el lunes (copia de la regla global del año). Escribir catálogos requiere
rol owner/admin; el resto, owner/admin/gerente.

## Demanda sin tráfico: "cobertura actual"

Con `trafico_observado` de las 8 semanas previas se usa el pronóstico de media
estacional + requerimiento por productividad (`pronosticos.metodo =
media_estacional_8s_quincena`). Sin tráfico —el caso de un CSV recién
importado— la demanda por intervalo de 30 min y habilidad es **la cobertura
que hoy da el horario importado** (`metodo = cobertura_actual`, `es_pico` =
percentil 80). Así la propuesta conserva la curva de cobertura actual y sólo
elimina horas extra: el ahorro viene de dobles/triples y prima dominical, y si
la plantilla no alcanza para cubrir lo mismo bajo el tope aparecen `vacantes`
(horas-turno sin cubrir, en `escenarios.parametros`).

## Límites

- Una sucursal-semana por llamada; la semana debe tener `horarios`.
- Presupuesto de optimización 3 s (heurística determinista, no óptimo global).
- Las plantillas se alinean a 30 min; turnos importados que crucen medianoche
  no generan plantilla y su cobertura después de las 24:00 se ignora.
- Las ventanas de `disponibilidad` con vigencia parcial dentro de la semana se
  tratan como vigentes toda la semana (más restrictivo, nunca menos).
- Cada lote de 500 asignaciones es una transacción: el trigger diferido valida
  sumas parciales, que sólo crecen, así que un lote válido nunca falla por
  orden de inserción.
