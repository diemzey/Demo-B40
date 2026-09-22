# scripts/motor · Motor de programación bajo tope de 40 h

Pronóstico → requerimiento por intervalo → baseline (turnos vigentes) →
optimización → evaluación de ambos escenarios, por tienda-semana. Sin
dependencias de solver; TypeScript puro sobre Node 22 (`npx tsx`).

## Cómo correr

```bash
# 1) generar datos sintéticos (agente B): scripts/sintetico/salida/
npm run sintetico:generar

# 2) motor sobre las 4 semanas objetivo, 50 tiendas
npm run motor -- --entrada scripts/sintetico/salida --salida scripts/motor/salida \
  --semanas 2026-07-06,2026-07-13,2026-07-20,2026-07-27 [--tiendas 50] [--presupuesto 3000]

# fixture mínimo (1 tienda de 20 empleados) para pruebas rápidas
npx tsx scripts/motor/fixtures/generar-mini.ts
npm run motor -- --entrada scripts/motor/fixtures/mini --salida /tmp/mini --reporte no

# 3) subir a Supabase y verificar contra v_ahorro_escenario (requiere sesión)
SINTETICO_EMAIL=… SINTETICO_PASSWORD=… npm run motor -- --cargar [--tiendas 5]
```

Salidas: `scripts/motor/salida/<sucursal>/<semana>.json` (pronóstico,
demanda, asignaciones y evaluación de baseline y propuesta, cota de
capacidad), `scripts/motor/salida/resumen.json` (por tienda-semana y
totales) y `docs/reporte-resultados.md` (reporte ejecutivo en español).

Opciones: `--semana YYYY-MM-DD` (una sola), `--tiendas N` (primeras N por
clave), `--presupuesto ms` (búsqueda local por tienda-semana, default 3000),
`--reporte ruta|no`, `--silencioso`, `--cargar`.

## Módulos

| Archivo | Qué hace |
|---|---|
| `tipos.ts` | Contratos de entrada (salida de `scripts/sintetico`) y de salida (formas de `demanda_intervalo`, `asignaciones`, `resumen_escenario`). |
| `tiempo.ts` | Hora local México (UTC−6 fijo), ISO con `-06:00`, redondeo tipo Postgres. |
| `pronostico.ts` | Media estacional por (día ISO, intervalo) sobre 8 semanas, × 1.15 en quincena. |
| `requerimiento.ts` | `requerido_caja`, `requerido_piso`, mínimos de apertura, `es_pico` (percentil 80, nearest-rank). |
| `baseline.ts` | Asignaciones del baseline desde `turnos_vigentes`. |
| `reglas.ts` | Horas netas (= `asignaciones.horas`), tarifa vigente, `validarReglasDuras` (validador independiente). |
| `optimizar.ts` | Heurística §6: voraz por déficit + búsqueda local; multi-arranque determinista; self-check. |
| `evaluar.ts` | Espejo de `resumir_escenario` (§7): costo por empleado, sobrestaffing, cobertura pico. |
| `pipeline.ts` / `resumen.ts` / `reporte.ts` | Orquestación por tienda-semana, agregados y Markdown. |
| `capacidad.ts` | Cota inferior exacta de empleados-día por día y subconjunto de habilidades (conjunto de intervalos no co-cubribles de peso máximo, DP); explica vacantes. |
| `cargar.ts` | `--cargar`: inserta en Supabase y compara con `v_ahorro_escenario`. |

## Formulación (resumen de docs/arquitectura.md §6)

Variables `x[e,d,p] ∈ {0,1}` (empleado *e* trabaja la plantilla *p* el día
*d*) con habilidad cubierta *h*; déficit `u[i,h] ≥ 0` y exceso `o[i] ≥ 0`.

```
min  Σ horas(p)·tarifa(e)·(1 + prima·[d = domingo]) · x[e,d,p]
   + M · Σ u[i,h]          (M ≫ λ; los intervalos pico pesan 50× en la fase voraz)
   + λ · Σ o[i]            (λ = tarifa media ponderada × 0.5 h, como resumir_escenario)
s.a. 1 turno por empleado-día · Σ horas ≤ min(tope, max_horas_semana) · horas/día ≤ 8
     · días ≤ 6 · ≥ 12 h entre turnos · disponibilidad · habilidad · sin traslapes
     · Σ cobertura[i,h] + u[i,h] ≥ requerido[i,h]
```

Heurística: (1) construcción voraz: mientras haya déficit, elegir la
(día, plantilla, habilidad) con mejor `(déficit ponderado cubierto − 0.1·exceso) / (horas + K)`
y dársela al empleado elegible más barato (prefiere puesto = habilidad,
continuidad con el día anterior, menos horas acumuladas). (2) Búsqueda
local: eliminar turnos redundantes; mover cada turno a otra (plantilla,
empleado, habilidad) del mismo día o a otro día del mismo empleado si baja
`M·déficit + costo + λ·exceso`; re-llenar con la voraz. (3) Multi-arranque
con K ∈ {0, 4, 8, ∞} (horas escasas → empleados-día escasos) × reserva ∈
{no, sí} (reserva: primero se cubren los picos de cada día en orden de
requerimiento pico descendente, y al elegir empleado se penaliza consumir el
último día u hora útil de alguien que aún podría cubrir un pico pendiente en
otro día); se conserva la mejor de las 8 soluciones por objetivo. Lo que queda sin empleado elegible se reporta como
`vacantes` (horas-turno), nunca se rompe una regla. Al final
`validarReglasDuras` re-verifica todo y lanza si algo falla.

Convenciones que deben coincidir con la base: `horas` = duración − descanso
(2 decimales); cobertura de un intervalo = turnos cuyo `[inicio, fin)`
contiene el inicio del intervalo (el descanso no descuenta); costo por
componente redondeado a centavos por empleado; sobrestaffing a nivel total
(no por habilidad) valuado a tarifa media ponderada por horas.

## Complejidad y tiempos

Por tienda-semana (E ≈ 80 empleados, 7 días, P = 12 plantillas, H = 4
habilidades, 168 intervalos): la voraz evalúa 7·P·H candidatos × ≤ 24
intervalos por iteración y ~E elegibilidades por turno asignado (≈ 450
turnos) → ~10⁶ operaciones; cada pasada de búsqueda local es
O(turnos × (E + 7) × P × H × 24) ≈ 10⁷. Medido en Node 22: ~0.4–0.5 s por
tienda-semana con los 8 arranques (máximo observado < 1 s), 50 tiendas × 4
semanas ≈ 90 s en un solo proceso. El presupuesto (`--presupuesto`, 3 s)
sólo actúa como tope. La cota de capacidad es O(7 × 2^H × S² × P) ≈ 10⁵.
