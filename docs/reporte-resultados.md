# Jornada40 · Resultados del motor de programación (tope 40 h)

> Generado el 2026-09-22T00:26:13.749Z por `scripts/motor/index.ts` a partir de `scripts/sintetico/salida`.
> Salida detallada por tienda-semana en `scripts/motor/salida/<sucursal>/<semana>.json` y agregados en `scripts/motor/salida/resumen.json`.

## 1. Resumen ejecutivo

- **Alcance**: 50 tiendas × 4 semanas (2026-07-06, 2026-07-13, 2026-07-20, 2026-07-27) = 200 tienda-semanas.
- **Costo laboral baseline** (turnos vigentes, valuados con tope 40 h): **$64,515,234.97**.
- **Costo laboral propuesta** (motor, tope 40 h): **$35,070,421.19**.
- **Ahorro**: **$29,444,813.78 (45.64 %)** frente al objetivo de ≥ 8 % → **objetivo cumplido**.
- **Subdotación en pico**: 107 tienda-semanas con déficit pico (291.0 h en total; ver §6).
- **Reglas duras**: la propuesta respeta tope 40 h, ≤ 8 h/día, ≤ 6 días, ≥ 12 h entre turnos, disponibilidad y habilidad en el 100 % de las asignaciones (re-validadas por `validarReglasDuras`). El baseline registra la realidad: 22048 violaciones (principalmente tope semanal) en 200 tienda-semanas.
- **Tiempo de cómputo**: 98.4 s en total; 490 ms promedio por tienda-semana (máx. 761 ms), de los cuales 485 ms son de optimización.

## 2. Método

1. **Pronóstico** (`pronostico.ts`): media estacional por (día ISO, intervalo de 30 min) sobre las 8 semanas previas, × 1.15 en semanas de quincena (contienen día 15 o fin de mes). Las semanas objetivo anteriores alimentan el pronóstico de las siguientes (rolling).
2. **Requerimiento** (`requerimiento.ts`): `requerido_caja = max(mín. caja, ⌈tráfico × conversión / transacciones por cajero⌉)`, `requerido_piso = max(mín. piso, ⌈tráfico / clientes por colaborador⌉)`, más mínimos fijos de almacén y supervisión. `es_pico` = `requerido_total ≥ percentil 80` de la tienda-semana.
3. **Baseline** (`baseline.ts`): los turnos vigentes tal cual (semana de 48 h en la mayoría de los empleados de tiempo completo), valuados con las mismas reglas que la propuesta: horas por encima de 40 pagan al 200 % (hasta 9) y al 300 % (resto); prima dominical 25 %; sobrestaffing a tarifa media ponderada.
4. **Optimización** (`optimizar.ts`, §6 de la arquitectura): construcción voraz por déficit ponderado (pico × 50) por hora de turno, asignando al empleado elegible más barato con preferencia por puesto = habilidad y continuidad; búsqueda local (eliminar turnos redundantes; mover cada turno a otra plantilla/empleado/habilidad del mismo día o a otro día del mismo empleado cuando reduce M·déficit + costo + λ·sobrestaffing; re-llenar con la voraz); multi-arranque determinista con 4 valores del parámetro que balancea horas escasas contra empleados-día escasos, conservando la mejor solución. Todas las reglas duras se re-validan al final con código independiente. Vacantes cuando no queda empleado elegible. Determinista; presupuesto máximo de 3 s por tienda-semana (uso real ≈ 0.2 s).
5. **Evaluación** (`evaluar.ts`): espejo de `resumir_escenario` (§7). Idéntico para baseline y propuesta; no contiene parámetros ajustables.

## 3. Totales

| Concepto | Baseline | Propuesta | Diferencia |
|---|---:|---:|---:|
| Horas totales | 642,912.0 | 483,578.0 | 159,334.0 |
| Horas regulares (≤ 40) | 554,720.0 | 483,578.0 | 71,142.0 |
| Horas dobles (200 %) | 88,192.0 | 0.0 | 88,192.0 |
| Horas triples (300 %) | 0.0 | 0.0 | 0.0 |
| Horas en domingo | 89,696.0 | 81,519.0 | 8,177.0 |
| Horas de sobrestaffing | 243,716.0 | 46,737.5 | 196,978.5 |
| Costo regular | $35,712,160.00 | $30,793,849.00 | $4,918,311.00 |
| Costo horas dobles | $11,611,264.00 | $0.00 | $11,611,264.00 |
| Costo horas triples | $0.00 | $0.00 | $0.00 |
| Prima dominical | $1,452,008.00 | $1,302,285.25 | $149,722.75 |
| Costo sobrestaffing | $15,739,802.97 | $2,974,286.94 | $12,765,516.03 |
| **Costo total** | $64,515,234.97 | $35,070,421.19 | $29,444,813.78 |

**Ahorro total: $29,444,813.78 = 45.64 % del costo baseline** (objetivo ≥ 8 %: cumplido). Tienda-semanas por debajo de 8 %: 0 de 200.

Lectura sin la valuación del sobrestaffing (sólo nómina pagada: regular + extras + prima): baseline $48,775,432.00 → propuesta $32,096,134.25, ahorro $16,679,297.75 (34.20 %). El sobrestaffing se valúa a tarifa media ponderada como en `resumir_escenario` (§7) y explica $12,765,516.03 del ahorro total.

### Desglose del ahorro (MXN)

| Componente | Baseline | Propuesta | Ahorro |
|---|---:|---:|---:|
| Horas extra (dobles + triples) | $11,611,264.00 | $0.00 | $11,611,264.00 |
| Prima dominical | $1,452,008.00 | $1,302,285.25 | $149,722.75 |
| Sobrestaffing | $15,739,802.97 | $2,974,286.94 | $12,765,516.03 |
| Costo regular | $35,712,160.00 | $30,793,849.00 | $4,918,311.00 |

## 4. Evidencia de cobertura en picos

| Métrica | Baseline | Propuesta |
|---|---:|---:|
| Intervalos pico (30 min) | 7134 | 7134 |
| Intervalos pico cubiertos (asignado ≥ requerido) | 3638 (51.00 %) | 6996 (98.07 %) |
| Cobertura pico Σ min(asignado, requerido) / Σ requerido | 85.10 % | 99.80 % |
| Déficit pico (horas-persona) | 21,204.5 | 291.0 |
| Déficit total, todos los intervalos (horas-persona) | 25,784.5 | 3,263.0 |
| Vacantes reportadas por el motor (horas-turno sin empleado elegible, por habilidad) | — | 3,490.0 (en pico: 305.0) |
| Tienda-semanas con déficit pico | 200 | 107 (116 con plantilla estructuralmente insuficiente) |

Definiciones: "cubierto" = asignado ≥ requerido en el intervalo; "cobertura pico" = Σ min(asignado, requerido) / Σ requerido (§5); el déficit se mide en horas-persona (intervalos de 30 min × personas faltantes). `v_ahorro_escenario` reporta la cobertura pico como intervalos cubiertos / intervalos pico; ambas cifras están en `resumen.json`.

## 5. Distribución del ahorro entre tiendas

Ahorro % por tienda-semana: mín. 38.88 % · P25 42.21 % · mediana 45.02 % · P75 48.49 % · máx. 52.38 %.

### Peores 5 tienda-semanas

| Sucursal | Semana | Ahorro % | Ahorro MXN | Motivo |
|---|---|---:|---:|---|
| T032 | 2026-07-13 | 38.88 % | $99,350.45 | plantilla insuficiente: faltan 6 empleados-día (vacantes 20 h) |
| T006 | 2026-07-13 | 39.15 % | $98,355.85 | plantilla insuficiente: faltan 7 empleados-día (vacantes 33 h) |
| T032 | 2026-07-27 | 39.41 % | $101,000.04 | plantilla insuficiente: faltan 7 empleados-día (vacantes 21 h) |
| T006 | 2026-07-27 | 39.97 % | $100,510.96 | plantilla insuficiente: faltan 7 empleados-día (vacantes 35.5 h) |
| T042 | 2026-07-27 | 40.04 % | $100,992.31 | plantilla insuficiente: faltan 11 empleados-día (vacantes 41.5 h) |

### Por tienda (suma de las semanas)

| Sucursal | Costo baseline | Costo propuesta | Ahorro MXN | Ahorro % | Déficit pico base (h) | Déficit pico prop. (h) | Vacantes (h) | Empleados-día faltantes (cota) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| T001 · Coapa | $1,518,695.31 | $794,713.35 | $723,981.96 | 47.67 % | 695.0 | 8.0 | 85.5 | 24 |
| T002 · Monterrey Centro | $1,051,190.73 | $586,924.07 | $464,266.66 | 44.17 % | 363.5 | 4.0 | 79.0 | 14 |
| T003 · Guadalajara Centro | $1,095,778.31 | $617,164.16 | $478,614.15 | 43.68 % | 252.0 | 8.5 | 80.5 | 15 |
| T004 · León Centro | $1,489,557.85 | $810,919.56 | $678,638.29 | 45.56 % | 668.5 | 4.0 | 28.5 | 10 |
| T005 · Puebla Centro | $1,097,259.90 | $608,128.93 | $489,130.97 | 44.58 % | 425.0 | 5.0 | 48.5 | 12 |
| T006 · Veracruz Puerto | $1,027,386.44 | $584,436.34 | $442,950.10 | 43.11 % | 301.5 | 5.5 | 71.0 | 14 |
| T007 · Mérida Norte | $1,126,445.96 | $627,903.26 | $498,542.70 | 44.26 % | 345.5 | 5.5 | 60.5 | 17 |
| T008 · Culiacán | $1,445,590.73 | $767,595.40 | $677,995.33 | 46.90 % | 544.0 | 3.5 | 39.5 | 15 |
| T009 · Iztapalapa | $1,313,252.63 | $722,828.68 | $590,423.95 | 44.96 % | 330.5 | 8.0 | 82.5 | 18 |
| T010 · Guadalupe | $1,054,106.42 | $584,528.23 | $469,578.19 | 44.55 % | 353.0 | 7.0 | 108.5 | 22 |
| T011 · Zapopan | $1,459,983.42 | $768,036.71 | $691,946.71 | 47.39 % | 403.5 | 4.5 | 59.0 | 12 |
| T012 · Querétaro | $1,350,522.33 | $726,034.51 | $624,487.82 | 46.24 % | 434.0 | 8.5 | 123.5 | 39 |
| T013 · Angelópolis | $1,473,974.00 | $789,534.74 | $684,439.26 | 46.43 % | 586.5 | 3.5 | 59.5 | 14 |
| T014 · Xalapa | $1,344,782.53 | $734,716.48 | $610,066.05 | 45.37 % | 339.0 | 4.0 | 37.5 | 14 |
| T015 · Mérida Centro | $1,027,541.95 | $585,555.30 | $441,986.65 | 43.01 % | 301.0 | 6.0 | 105.0 | 23 |
| T016 · Hermosillo | $1,520,700.73 | $804,313.82 | $716,386.91 | 47.11 % | 592.5 | 8.0 | 98.5 | 23 |
| T017 · Ecatepec | $1,453,979.31 | $779,785.24 | $674,194.07 | 46.37 % | 342.0 | 3.5 | 37.5 | 11 |
| T018 · San Nicolás | $1,538,488.70 | $832,230.02 | $706,258.68 | 45.91 % | 413.5 | 6.5 | 65.0 | 19 |
| T019 · Tlaquepaque | $1,193,295.74 | $637,687.49 | $555,608.25 | 46.56 % | 641.5 | 4.5 | 55.0 | 17 |
| T020 · Celaya | $1,161,562.04 | $645,300.90 | $516,261.14 | 44.45 % | 450.0 | 5.5 | 43.5 | 13 |
| T021 · Cuernavaca | $1,517,399.66 | $796,596.10 | $720,803.56 | 47.50 % | 570.0 | 2.0 | 32.5 | 13 |
| T022 · Coatzacoalcos | $1,465,845.08 | $789,997.96 | $675,847.12 | 46.11 % | 503.0 | 5.5 | 34.0 | 13 |
| T023 · Cancún | $1,351,319.95 | $724,990.38 | $626,329.57 | 46.35 % | 418.5 | 10.5 | 142.0 | 38 |
| T024 · Tijuana | $1,157,142.79 | $644,382.47 | $512,760.32 | 44.31 % | 443.5 | 6.0 | 93.5 | 24 |
| T025 · Nezahualcóyotl | $1,250,746.86 | $698,490.80 | $552,256.06 | 44.15 % | 487.0 | 6.5 | 41.0 | 17 |
| T026 · Apodaca | $1,081,913.33 | $598,266.71 | $483,646.62 | 44.70 % | 328.5 | 6.5 | 101.5 | 22 |
| T027 · Tonalá | $1,464,839.44 | $779,500.35 | $685,339.09 | 46.79 % | 489.0 | 7.5 | 75.5 | 22 |
| T028 · Irapuato | $1,099,361.47 | $616,387.51 | $482,973.96 | 43.93 % | 344.5 | 5.0 | 41.5 | 12 |
| T029 · Pachuca | $1,450,799.41 | $781,815.72 | $668,983.69 | 46.11 % | 299.5 | 5.5 | 66.0 | 23 |
| T030 · Villahermosa | $1,136,737.49 | $619,834.53 | $516,902.96 | 45.47 % | 554.5 | 5.0 | 62.5 | 15 |
| T031 · Tuxtla Gutiérrez | $1,286,582.62 | $704,508.36 | $582,074.26 | 45.24 % | 340.0 | 4.0 | 39.5 | 11 |
| T032 · Mexicali | $1,046,027.62 | $591,752.51 | $454,275.11 | 43.43 % | 269.5 | 4.5 | 42.5 | 13 |
| T033 · Tlalpan | $1,342,684.78 | $736,316.03 | $606,368.75 | 45.16 % | 292.0 | 7.0 | 80.5 | 23 |
| T034 · Saltillo | $1,050,192.94 | $585,270.00 | $464,922.94 | 44.27 % | 522.5 | 3.5 | 38.0 | 12 |
| T035 · Morelia | $1,437,987.51 | $764,297.72 | $673,689.79 | 46.85 % | 443.0 | 4.5 | 24.0 | 13 |
| T036 · Aguascalientes | $1,234,826.60 | $677,779.18 | $557,047.42 | 45.11 % | 316.5 | 5.0 | 28.5 | 9 |
| T037 · Tlaxcala | $1,446,831.24 | $765,499.71 | $681,331.53 | 47.09 % | 513.5 | 7.5 | 137.5 | 31 |
| T038 · Veracruz Puerto II | $1,349,648.51 | $734,567.89 | $615,080.62 | 45.57 % | 421.0 | 4.5 | 32.5 | 13 |
| T039 · Mérida Norte II | $1,395,748.62 | $768,011.46 | $627,737.16 | 44.97 % | 427.5 | 7.0 | 43.0 | 13 |
| T040 · Chihuahua | $1,274,818.59 | $698,603.80 | $576,214.79 | 45.20 % | 186.0 | 4.5 | 38.5 | 16 |
| T041 · Naucalpan | $1,301,390.91 | $693,834.08 | $607,556.83 | 46.69 % | 491.5 | 5.0 | 94.0 | 12 |
| T042 · Torreón | $1,028,624.29 | $574,656.91 | $453,967.38 | 44.13 % | 309.0 | 5.5 | 103.5 | 22 |
| T043 · Puerto Vallarta | $1,297,477.21 | $692,972.74 | $604,504.47 | 46.59 % | 504.0 | 7.5 | 125.0 | 38 |
| T044 · San Luis Potosí | $1,502,887.60 | $812,564.28 | $690,323.32 | 45.93 % | 474.5 | 7.5 | 68.0 | 17 |
| T045 · Puebla Centro II | $1,259,096.92 | $671,807.05 | $587,289.87 | 46.64 % | 574.0 | 7.0 | 147.5 | 32 |
| T046 · Xalapa II | $1,140,595.25 | $643,605.53 | $496,989.72 | 43.57 % | 292.0 | 5.5 | 65.5 | 17 |
| T047 · Mérida Centro II | $1,238,242.22 | $672,136.37 | $566,105.85 | 45.72 % | 419.0 | 11.0 | 152.5 | 35 |
| T048 · Ciudad Juárez | $1,361,588.39 | $707,819.62 | $653,768.77 | 48.02 % | 574.0 | 4.0 | 48.0 | 8 |
| T049 · Toluca | $1,300,579.33 | $723,716.85 | $576,862.48 | 44.35 % | 199.5 | 5.5 | 52.0 | 13 |
| T050 · Reynosa | $1,499,203.31 | $792,101.38 | $707,101.93 | 47.17 % | 415.5 | 7.0 | 71.5 | 25 |

## 6. Lectura honesta de los resultados

El ahorro total (45.64 %) supera el objetivo de 8 %. Tres fuentes, en orden: (1) el baseline programa semanas de 48 h a la mayoría del tiempo completo, que bajo el tope de 40 h se pagan como 88,192 horas dobles ($11,611,264.00); la propuesta no tiene ninguna; (2) el baseline tiene 243,716 h de sobrestaffing (turnos rígidos de apertura/cierre que no siguen la curva de demanda) frente a 46,738 h; (3) menos horas totales (642,912 → 483,578), porque la propuesta usa plantillas cortas y medio tiempo donde la demanda es baja. El ahorro no proviene de subdotar: la cobertura pico sube de 85.10 % a 99.80 % y el déficit total (todos los intervalos) baja de 25,785 h a 3,263 h. La magnitud (muy por encima del 8 %) refleja que el baseline sintético es deliberadamente rígido (2 turnos fijos, 6 días × 8 h); con un baseline ya ajustado el ahorro sería menor.

**Subdotación residual en picos.** Quedan 107 tienda-semanas con déficit pico (291.0 h-persona en total), frente a 21,204.5 h en el baseline. El motor no rompe reglas para cubrirlo. La causa es estructural y se demuestra con una cota inferior exacta (`capacidad.ts`): con 1 turno por empleado-día, un conjunto de intervalos del día que ninguna plantilla cubre de dos en dos exige tantos empleados distintos como personas requeridas en ellos; se evalúa para cada subconjunto de habilidades (los empleados que tienen alguna de ellas contra la suma de sus requerimientos) y se toma el máximo. En 116 de 200 tienda-semanas la cota supera la plantilla disponible (faltan 918 empleados-día en total; por día de la semana: sáb 762, dom 156), así que el déficit es inevitable con las plantillas de turno y la plantilla de personal actuales. Patrones que más faltantes explican: caja+piso+supervision @ 11:30 + 20:00 (893 empleados-día); caja+piso+supervision @ 12:00 + 20:30 (25 empleados-día). En las 2 tienda-semanas restantes con déficit (1.0 h) la cota no lo demuestra: son casos con holgura de 1 empleado donde la cota (que ignora tope de horas y forma completa de la curva) no es ajustada.

Tienda-semanas estructuralmente infactibles (cota por día: habilidades, intervalos no co-cubribles, empleados necesarios vs disponibles):

| Sucursal | Semana | Déficit pico prop. (h) | Vacantes (h) | Faltantes (empleados-día) | Detalle por día |
|---|---|---:|---:|---:|---|
| T012 | 2026-07-27 | 4.5 | 56.0 | 20 | 2026-08-01: caja+piso+supervision en 11:30+20:00 → 86 > 73 (faltan 13); 2026-08-02: caja+piso+supervision en 11:30+20:00 → 73 > 66 (faltan 7) |
| T023 | 2026-07-13 | 4.5 | 66.0 | 18 | 2026-07-18: caja+piso+supervision en 11:30+20:00 → 85 > 72 (faltan 13); 2026-07-19: caja+piso+supervision en 11:30+20:00 → 73 > 68 (faltan 5) |
| T043 | 2026-07-27 | 4.0 | 57.0 | 18 | 2026-08-01: caja+piso+supervision en 11:30+20:00 → 80 > 70 (faltan 10); 2026-08-02: caja+piso+supervision en 11:30+20:00 → 70 > 62 (faltan 8) |
| T012 | 2026-07-13 | 4.0 | 54.0 | 17 | 2026-07-18: caja+piso+supervision en 11:30+20:00 → 83 > 73 (faltan 10); 2026-07-19: caja+piso+supervision en 11:30+20:00 → 73 > 66 (faltan 7) |
| T043 | 2026-07-13 | 3.5 | 53.5 | 17 | 2026-07-18: caja+piso+supervision en 11:30+20:00 → 80 > 70 (faltan 10); 2026-07-19: caja+piso+supervision en 11:30+20:00 → 69 > 62 (faltan 7) |
| T023 | 2026-07-27 | 5.0 | 67.0 | 16 | 2026-08-01: caja+piso+supervision en 11:30+20:00 → 83 > 72 (faltan 11); 2026-08-02: caja+piso+supervision en 11:30+20:00 → 73 > 68 (faltan 5) |
| T037 | 2026-07-13 | 3.5 | 63.5 | 16 | 2026-07-18: caja+piso+supervision en 11:30+20:00 → 88 > 78 (faltan 10); 2026-07-19: caja+piso+supervision en 11:30+20:00 → 79 > 73 (faltan 6) |
| T045 | 2026-07-27 | 3.5 | 72.0 | 16 | 2026-08-01: caja+piso+supervision en 11:30+20:00 → 80 > 69 (faltan 11); 2026-08-02: caja+piso+supervision en 11:30+20:00 → 70 > 65 (faltan 5) |
| T037 | 2026-07-27 | 4.0 | 72.5 | 15 | 2026-08-01: caja+piso+supervision en 11:30+20:00 → 87 > 78 (faltan 9); 2026-08-02: caja+piso+supervision en 11:30+20:00 → 79 > 73 (faltan 6) |
| T047 | 2026-07-13 | 4.5 | 72.5 | 15 | 2026-07-18: caja+piso+supervision en 11:30+20:00 → 80 > 68 (faltan 12); 2026-07-19: caja+piso+supervision en 11:30+20:00 → 69 > 66 (faltan 3) |
| T047 | 2026-07-27 | 5.0 | 69.5 | 15 | 2026-08-01: caja+piso+supervision en 11:30+20:00 → 79 > 68 (faltan 11); 2026-08-02: caja+piso+supervision en 11:30+20:00 → 70 > 66 (faltan 4) |
| T045 | 2026-07-13 | 3.0 | 63.5 | 14 | 2026-07-18: caja+piso+supervision en 11:30+20:00 → 79 > 69 (faltan 10); 2026-07-19: caja+piso+supervision en 11:30+20:00 → 69 > 65 (faltan 4) |
| T016 | 2026-07-13 | 4.0 | 39.5 | 13 | 2026-07-18: caja+piso+supervision en 11:30+20:00 → 93 > 83 (faltan 10); 2026-07-19: caja+piso+supervision en 11:30+20:00 → 82 > 79 (faltan 3) |
| T050 | 2026-07-13 | 3.0 | 34.5 | 13 | 2026-07-18: caja+piso+supervision en 11:30+20:00 → 93 > 83 (faltan 10); 2026-07-19: caja+piso+supervision en 11:30+20:00 → 81 > 78 (faltan 3) |
| T015 | 2026-07-13 | 3.0 | 50.5 | 12 | 2026-07-18: caja+piso+supervision en 11:30+20:00 → 68 > 59 (faltan 9); 2026-07-19: caja+piso+supervision en 11:30+20:00 → 60 > 57 (faltan 3) |
| T024 | 2026-07-13 | 3.0 | 39.0 | 12 | 2026-07-18: caja+piso+supervision en 11:30+20:00 → 73 > 66 (faltan 7); 2026-07-19: caja+piso+supervision en 11:30+20:00 → 64 > 59 (faltan 5) |
| T024 | 2026-07-27 | 3.0 | 50.0 | 12 | 2026-08-01: caja+piso+supervision en 11:30+20:00 → 73 > 66 (faltan 7); 2026-08-02: caja+piso+supervision en 11:30+20:00 → 64 > 59 (faltan 5) |
| T029 | 2026-07-27 | 3.0 | 32.5 | 12 | 2026-08-01: caja+piso+supervision en 11:30+20:00 → 89 > 82 (faltan 7); 2026-08-02: caja+piso+supervision en 11:30+20:00 → 81 > 76 (faltan 5) |
| T033 | 2026-07-13 | 3.5 | 37.0 | 12 | 2026-07-18: caja+piso+supervision en 11:30+20:00 → 83 > 74 (faltan 9); 2026-07-19: caja+piso+supervision en 11:30+20:00 → 74 > 71 (faltan 3) |
| T050 | 2026-07-27 | 4.0 | 31.5 | 12 | 2026-08-01: caja+piso+supervision en 11:30+20:00 → 93 > 83 (faltan 10); 2026-08-02: caja+piso+supervision en 11:30+20:00 → 80 > 78 (faltan 2) |
| T001 | 2026-07-13 | 4.0 | 40.0 | 11 | 2026-07-18: caja+piso+supervision en 11:30+20:00 → 90 > 80 (faltan 10); 2026-07-19: caja+piso+supervision en 12:00+20:30 → 79 > 78 (faltan 1) |
| T001 | 2026-07-27 | 4.0 | 44.0 | 11 | 2026-08-01: caja+piso+supervision en 11:30+20:00 → 91 > 80 (faltan 11) |
| T026 | 2026-07-13 | 3.5 | 41.5 | 11 | 2026-07-18: caja+piso+supervision en 11:30+20:00 → 69 > 62 (faltan 7); 2026-07-19: caja+piso+supervision en 11:30+20:00 → 61 > 57 (faltan 4) |
| T026 | 2026-07-27 | 3.0 | 48.5 | 11 | 2026-08-01: caja+piso+supervision en 11:30+20:00 → 69 > 62 (faltan 7); 2026-08-02: caja+piso+supervision en 11:30+20:00 → 61 > 57 (faltan 4) |
| T027 | 2026-07-13 | 3.5 | 32.0 | 11 | 2026-07-18: caja+piso+supervision en 11:30+20:00 → 88 > 79 (faltan 9); 2026-07-19: caja+piso+supervision en 12:00+20:30 → 78 > 76 (faltan 2) |
| T027 | 2026-07-27 | 4.0 | 37.5 | 11 | 2026-08-01: caja+piso+supervision en 11:30+20:00 → 88 > 79 (faltan 9); 2026-08-02: caja+piso+supervision en 11:30+20:00 → 78 > 76 (faltan 2) |
| T029 | 2026-07-13 | 2.5 | 32.0 | 11 | 2026-07-18: caja+piso+supervision en 11:30+20:00 → 88 > 82 (faltan 6); 2026-07-19: caja+piso+supervision en 11:30+20:00 → 81 > 76 (faltan 5) |
| T042 | 2026-07-13 | 3.0 | 59.0 | 11 | 2026-07-18: caja+piso+supervision en 11:30+20:00 → 68 > 60 (faltan 8); 2026-07-19: caja+piso+supervision en 11:30+20:00 → 59 > 56 (faltan 3) |
| T042 | 2026-07-27 | 2.5 | 41.5 | 11 | 2026-08-01: caja+piso+supervision en 11:30+20:00 → 68 > 60 (faltan 8); 2026-08-02: caja+piso+supervision en 11:30+20:00 → 59 > 56 (faltan 3) |
| T010 | 2026-07-13 | 3.5 | 50.5 | 10 | 2026-07-18: caja+piso+supervision en 11:30+20:00 → 69 > 60 (faltan 9); 2026-07-19: caja+piso+supervision en 11:30+20:00 → 60 > 59 (faltan 1) |
| T010 | 2026-07-27 | 3.5 | 53.5 | 10 | 2026-08-01: caja+piso+supervision en 11:30+20:00 → 69 > 60 (faltan 9); 2026-08-02: caja+piso+supervision en 11:30+20:00 → 60 > 59 (faltan 1) |
| T015 | 2026-07-27 | 3.0 | 47.5 | 10 | 2026-08-01: caja+piso+supervision en 11:30+20:00 → 67 > 59 (faltan 8); 2026-08-02: caja+piso+supervision en 11:30+20:00 → 59 > 57 (faltan 2) |
| T016 | 2026-07-27 | 4.0 | 52.5 | 10 | 2026-08-01: caja+piso+supervision en 11:30+20:00 → 91 > 83 (faltan 8); 2026-08-02: caja+piso+supervision en 11:30+20:00 → 81 > 79 (faltan 2) |
| T018 | 2026-07-27 | 3.5 | 31.0 | 10 | 2026-08-01: caja+piso+supervision en 11:30+20:00 → 96 > 86 (faltan 10) |
| T033 | 2026-07-27 | 3.5 | 37.0 | 10 | 2026-08-01: caja+piso+supervision en 11:30+20:00 → 83 > 74 (faltan 9); 2026-08-02: caja+piso+supervision en 11:30+20:00 → 72 > 71 (faltan 1) |
| T007 | 2026-07-27 | 3.0 | 21.0 | 9 | 2026-08-01: caja+piso+supervision en 11:30+20:00 → 73 > 65 (faltan 8); 2026-08-02: caja+piso+supervision en 11:30+20:00 → 62 > 61 (faltan 1) |
| T009 | 2026-07-13 | 4.0 | 41.0 | 9 | 2026-07-18: caja+piso+supervision en 11:30+20:00 → 81 > 72 (faltan 9) |
| T009 | 2026-07-27 | 4.0 | 40.5 | 9 | 2026-08-01: caja+piso+supervision en 11:30+20:00 → 81 > 72 (faltan 9) |
| T018 | 2026-07-13 | 3.0 | 34.0 | 9 | 2026-07-18: caja+piso+supervision en 11:30+20:00 → 95 > 86 (faltan 9) |
| T019 | 2026-07-27 | 2.5 | 16.0 | 9 | 2026-08-01: caja+piso+supervision en 11:30+20:00 → 72 > 66 (faltan 6); 2026-08-02: caja+piso+supervision en 11:30+20:00 → 64 > 61 (faltan 3) |
| T025 | 2026-07-27 | 3.5 | 19.5 | 9 | 2026-08-01: caja+piso+supervision en 11:30+20:00 → 81 > 72 (faltan 9) |
| T044 | 2026-07-13 | 4.0 | 31.0 | 9 | 2026-07-18: caja+piso+supervision en 11:30+20:00 → 93 > 84 (faltan 9) |
| T003 | 2026-07-13 | 4.0 | 38.0 | 8 | 2026-07-18: caja+piso+supervision en 11:30+20:00 → 70 > 62 (faltan 8) |
| T007 | 2026-07-13 | 2.5 | 37.0 | 8 | 2026-07-18: caja+piso+supervision en 11:30+20:00 → 72 > 65 (faltan 7); 2026-07-19: caja+piso+supervision en 11:30+20:00 → 62 > 61 (faltan 1) |
| T008 | 2026-07-27 | 1.5 | 19.0 | 8 | 2026-08-01: caja+piso+supervision en 11:30+20:00 → 88 > 82 (faltan 6); 2026-08-02: caja+piso+supervision en 12:00+20:30 → 78 > 76 (faltan 2) |
| T013 | 2026-07-27 | 2.0 | 41.0 | 8 | 2026-08-01: caja+piso+supervision en 11:30+20:00 → 90 > 84 (faltan 6); 2026-08-02: caja+piso+supervision en 11:30+20:00 → 81 > 79 (faltan 2) |
| T019 | 2026-07-13 | 2.0 | 36.5 | 8 | 2026-07-18: caja+piso+supervision en 11:30+20:00 → 72 > 66 (faltan 6); 2026-07-19: caja+piso+supervision en 11:30+20:00 → 63 > 61 (faltan 2) |
| T025 | 2026-07-13 | 3.0 | 21.0 | 8 | 2026-07-18: caja+piso+supervision en 11:30+20:00 → 80 > 72 (faltan 8) |
| T030 | 2026-07-13 | 2.5 | 31.5 | 8 | 2026-07-18: caja+piso+supervision en 11:30+20:00 → 70 > 63 (faltan 7); 2026-07-19: caja+piso+supervision en 11:30+20:00 → 62 > 61 (faltan 1) |
| T039 | 2026-07-27 | 4.0 | 18.5 | 8 | 2026-08-01: caja+piso+supervision en 11:30+20:00 → 86 > 78 (faltan 8) |
| T040 | 2026-07-13 | 2.5 | 19.0 | 8 | 2026-07-18: caja+piso+supervision en 11:30+20:00 → 80 > 73 (faltan 7); 2026-07-19: caja+piso+supervision en 11:30+20:00 → 71 > 70 (faltan 1) |
| T040 | 2026-07-27 | 2.0 | 19.5 | 8 | 2026-08-01: caja+piso+supervision en 11:30+20:00 → 80 > 73 (faltan 7); 2026-08-02: caja+piso+supervision en 11:30+20:00 → 71 > 70 (faltan 1) |
| T044 | 2026-07-27 | 3.5 | 36.5 | 8 | 2026-08-01: caja+piso+supervision en 11:30+20:00 → 92 > 84 (faltan 8) |
| T046 | 2026-07-13 | 3.0 | 29.5 | 8 | 2026-07-18: caja+piso+supervision en 11:30+20:00 → 73 > 65 (faltan 8) |
| T046 | 2026-07-27 | 2.5 | 35.0 | 8 | 2026-08-01: caja+piso+supervision en 11:30+20:00 → 73 > 65 (faltan 8) |
| T002 | 2026-07-13 | 2.0 | 32.5 | 7 | 2026-07-18: caja+piso+supervision en 11:30+20:00 → 68 > 61 (faltan 7) |
| T002 | 2026-07-27 | 2.0 | 44.0 | 7 | 2026-08-01: caja+piso+supervision en 11:30+20:00 → 68 > 61 (faltan 7) |
| T003 | 2026-07-27 | 3.5 | 39.5 | 7 | 2026-08-01: caja+piso+supervision en 11:30+20:00 → 69 > 62 (faltan 7) |
| T006 | 2026-07-13 | 3.0 | 33.0 | 7 | 2026-07-18: caja+piso+supervision en 11:30+20:00 → 68 > 61 (faltan 7) |
| T006 | 2026-07-27 | 2.5 | 35.5 | 7 | 2026-08-01: caja+piso+supervision en 11:30+20:00 → 68 > 61 (faltan 7) |
| T008 | 2026-07-13 | 2.0 | 19.5 | 7 | 2026-07-18: caja+piso+supervision en 11:30+20:00 → 88 > 82 (faltan 6); 2026-07-19: caja+piso+supervision en 11:30+20:00 → 77 > 76 (faltan 1) |
| T014 | 2026-07-13 | 2.0 | 20.0 | 7 | 2026-07-18: caja+piso+supervision en 11:30+20:00 → 84 > 77 (faltan 7) |
| T014 | 2026-07-27 | 2.0 | 17.0 | 7 | 2026-08-01: caja+piso+supervision en 11:30+20:00 → 84 > 77 (faltan 7) |
| T020 | 2026-07-27 | 3.0 | 21.5 | 7 | 2026-08-01: caja+piso+supervision en 12:00+20:30 → 73 > 68 (faltan 5); 2026-08-02: caja+piso+supervision en 11:30+20:00 → 66 > 64 (faltan 2) |
| T021 | 2026-07-27 | 1.0 | 16.5 | 7 | 2026-08-01: caja+piso+supervision en 11:30+20:00 → 94 > 87 (faltan 7) |
| T022 | 2026-07-27 | 3.0 | 12.5 | 7 | 2026-08-01: caja+piso+supervision en 12:00+20:30 → 89 > 83 (faltan 6); 2026-08-02: caja+piso+supervision en 11:30+20:00 → 80 > 79 (faltan 1) |
| T030 | 2026-07-27 | 2.5 | 29.5 | 7 | 2026-08-01: caja+piso+supervision en 11:30+20:00 → 70 > 63 (faltan 7) |
| T032 | 2026-07-27 | 2.5 | 21.0 | 7 | 2026-08-01: caja+piso+supervision en 11:30+20:00 → 70 > 63 (faltan 7) |
| T035 | 2026-07-27 | 2.5 | 11.0 | 7 | 2026-08-01: caja+piso+supervision en 11:30+20:00 → 88 > 81 (faltan 7) |
| T038 | 2026-07-27 | 2.0 | 19.5 | 7 | 2026-08-01: caja+piso+supervision en 11:30+20:00 → 84 > 77 (faltan 7) |
| T049 | 2026-07-13 | 2.5 | 26.0 | 7 | 2026-07-18: caja+piso+supervision en 11:30+20:00 → 82 > 75 (faltan 7) |
| T004 | 2026-07-13 | 2.0 | 14.5 | 6 | 2026-07-18: caja+piso+supervision en 11:30+20:00 → 89 > 85 (faltan 4); 2026-07-19: caja+piso+supervision en 11:30+20:00 → 82 > 80 (faltan 2) |
| T005 | 2026-07-13 | 2.5 | 27.0 | 6 | 2026-07-18: caja+piso+supervision en 11:30+20:00 → 69 > 63 (faltan 6) |
| T005 | 2026-07-27 | 2.5 | 19.5 | 6 | 2026-08-01: caja+piso+supervision en 11:30+20:00 → 69 > 63 (faltan 6) |
| T011 | 2026-07-13 | 2.0 | 24.5 | 6 | 2026-07-18: caja+piso+supervision en 11:30+20:00 → 89 > 83 (faltan 6) |
| T011 | 2026-07-27 | 2.5 | 34.5 | 6 | 2026-08-01: caja+piso+supervision en 11:30+20:00 → 89 > 83 (faltan 6) |
| T013 | 2026-07-13 | 1.5 | 18.5 | 6 | 2026-07-18: caja+piso+supervision en 11:30+20:00 → 89 > 84 (faltan 5); 2026-07-19: caja+piso+supervision en 11:30+20:00 → 80 > 79 (faltan 1) |
| T017 | 2026-07-27 | 1.5 | 17.0 | 6 | 2026-08-01: caja+piso+supervision en 11:30+20:00 → 90 > 84 (faltan 6) |
| T020 | 2026-07-13 | 2.5 | 20.0 | 6 | 2026-07-18: caja+piso+supervision en 11:30+20:00 → 72 > 68 (faltan 4); 2026-07-19: caja+piso+supervision en 11:30+20:00 → 66 > 64 (faltan 2) |
| T021 | 2026-07-13 | 1.0 | 16.0 | 6 | 2026-07-18: caja+piso+supervision en 11:30+20:00 → 93 > 87 (faltan 6) |
| T022 | 2026-07-13 | 2.5 | 20.5 | 6 | 2026-07-18: caja+piso+supervision en 11:30+20:00 → 89 > 83 (faltan 6) |
| T028 | 2026-07-13 | 2.5 | 17.5 | 6 | 2026-07-18: caja+piso+supervision en 11:30+20:00 → 71 > 65 (faltan 6) |
| T028 | 2026-07-27 | 2.5 | 23.0 | 6 | 2026-08-01: caja+piso+supervision en 11:30+20:00 → 71 > 65 (faltan 6) |
| T031 | 2026-07-13 | 2.0 | 21.5 | 6 | 2026-07-18: caja+piso+supervision en 11:30+20:00 → 80 > 74 (faltan 6) |
| T032 | 2026-07-13 | 2.0 | 20.0 | 6 | 2026-07-18: caja+piso+supervision en 11:30+20:00 → 69 > 63 (faltan 6) |
| T034 | 2026-07-13 | 2.0 | 20.5 | 6 | 2026-07-18: caja+piso+supervision en 11:30+20:00 → 66 > 62 (faltan 4); 2026-07-19: caja+piso+supervision en 11:30+20:00 → 60 > 58 (faltan 2) |
| T034 | 2026-07-27 | 1.5 | 15.5 | 6 | 2026-08-01: caja+piso+supervision en 11:30+20:00 → 66 > 62 (faltan 4); 2026-08-02: caja+piso+supervision en 11:30+20:00 → 60 > 58 (faltan 2) |
| T035 | 2026-07-13 | 2.0 | 12.0 | 6 | 2026-07-18: caja+piso+supervision en 11:30+20:00 → 87 > 81 (faltan 6) |
| T038 | 2026-07-13 | 2.5 | 13.0 | 6 | 2026-07-18: caja+piso+supervision en 11:30+20:00 → 83 > 77 (faltan 6) |
| T041 | 2026-07-13 | 2.0 | 44.0 | 6 | 2026-07-18: caja+piso+supervision en 11:30+20:00 → 80 > 74 (faltan 6) |
| T041 | 2026-07-27 | 3.0 | 49.0 | 6 | 2026-08-01: caja+piso+supervision en 11:30+20:00 → 80 > 74 (faltan 6) |
| T049 | 2026-07-27 | 3.0 | 26.0 | 6 | 2026-08-01: caja+piso+supervision en 11:30+20:00 → 81 > 75 (faltan 6) |
| T017 | 2026-07-13 | 2.0 | 20.5 | 5 | 2026-07-18: caja+piso+supervision en 11:30+20:00 → 89 > 84 (faltan 5) |
| T031 | 2026-07-27 | 2.0 | 18.0 | 5 | 2026-08-01: caja+piso+supervision en 11:30+20:00 → 79 > 74 (faltan 5) |
| T036 | 2026-07-27 | 3.0 | 14.0 | 5 | 2026-08-01: caja+piso+supervision en 11:30+20:00 → 79 > 74 (faltan 5) |
| T039 | 2026-07-13 | 3.0 | 23.0 | 5 | 2026-07-18: caja+piso+supervision en 12:00+20:30 → 83 > 78 (faltan 5) |
| T004 | 2026-07-27 | 2.0 | 14.0 | 4 | 2026-08-01: caja+piso+supervision en 11:30+20:00 → 88 > 85 (faltan 3); 2026-08-02: caja+piso+supervision en 11:30+20:00 → 81 > 80 (faltan 1) |
| T036 | 2026-07-13 | 2.0 | 14.5 | 4 | 2026-07-18: caja+piso+supervision en 12:00+20:30 → 78 > 74 (faltan 4) |
| T048 | 2026-07-13 | 2.0 | 16.5 | 4 | 2026-07-18: caja+piso+supervision en 11:30+20:00 → 81 > 77 (faltan 4) |
| T048 | 2026-07-27 | 2.0 | 31.5 | 4 | 2026-08-01: caja+piso+supervision en 11:30+20:00 → 81 > 77 (faltan 4) |
| T047 | 2026-07-06 | 1.0 | 5.5 | 3 | 2026-07-11: caja+piso+supervision en 11:30+20:00 → 71 > 68 (faltan 3) |
| T012 | 2026-07-20 | 0.0 | 4.5 | 2 | 2026-07-25: caja+piso+supervision en 11:30+20:00 → 75 > 73 (faltan 2) |
| T023 | 2026-07-06 | 0.5 | 5.5 | 2 | 2026-07-11: caja+piso+supervision en 11:30+20:00 → 74 > 72 (faltan 2) |
| T023 | 2026-07-20 | 0.5 | 3.5 | 2 | 2026-07-25: caja+piso+supervision en 11:30+20:00 → 74 > 72 (faltan 2) |
| T043 | 2026-07-20 | 0.0 | 6.5 | 2 | 2026-07-25: caja+piso+supervision en 11:30+20:00 → 71 > 70 (faltan 1); 2026-07-26: caja+piso+supervision en 11:30+20:00 → 63 > 62 (faltan 1) |
| T047 | 2026-07-20 | 0.5 | 5.0 | 2 | 2026-07-25: caja+piso+supervision en 11:30+20:00 → 70 > 68 (faltan 2) |
| T001 | 2026-07-06 | 0.0 | 0.5 | 1 | 2026-07-11: caja+piso+supervision en 11:30+20:00 → 81 > 80 (faltan 1) |
| T001 | 2026-07-20 | 0.0 | 1.0 | 1 | 2026-07-25: caja+piso+supervision en 11:30+20:00 → 81 > 80 (faltan 1) |
| T010 | 2026-07-06 | 0.0 | 2.0 | 1 | 2026-07-11: caja+piso+supervision en 11:30+20:00 → 61 > 60 (faltan 1) |
| T010 | 2026-07-20 | 0.0 | 2.5 | 1 | 2026-07-25: caja+piso+supervision en 11:30+20:00 → 61 > 60 (faltan 1) |
| T015 | 2026-07-06 | 0.0 | 3.0 | 1 | 2026-07-11: caja+piso+supervision en 11:30+20:00 → 60 > 59 (faltan 1) |
| T033 | 2026-07-06 | 0.0 | 4.5 | 1 | 2026-07-11: caja+piso+supervision en 11:30+20:00 → 75 > 74 (faltan 1) |
| T043 | 2026-07-06 | 0.0 | 8.0 | 1 | 2026-07-11: caja+piso+supervision en 11:30+20:00 → 71 > 70 (faltan 1) |
| T045 | 2026-07-06 | 0.0 | 9.5 | 1 | 2026-07-11: caja+piso+supervision en 11:30+20:00 → 70 > 69 (faltan 1) |
| T045 | 2026-07-20 | 0.5 | 2.5 | 1 | 2026-07-25: caja+piso+supervision en 11:30+20:00 → 70 > 69 (faltan 1) |
| T046 | 2026-07-20 | 0.0 | 0.5 | 1 | 2026-07-25: caja+piso+supervision en 11:30+20:00 → 66 > 65 (faltan 1) |

Acciones: una plantilla que cubra a la vez el primer y el último intervalo del patrón (p. ej. 11:30–20:00 con descanso) o medio tiempo adicional de fin de semana con las habilidades indicadas; ambas se prueban cambiando `plantillas_turno` / `empleados` sin tocar el motor.

## 7. Trazabilidad (cómo se reconstruye cada cifra en la base)

Cada número de este reporte se calcula localmente en `scripts/motor/evaluar.ts` con exactamente las fórmulas de `resumir_escenario` (docs/arquitectura.md §7) y se reconstruye en Postgres así:

| Cifra | Origen local | Origen en base de datos |
|---|---|---|
| Tráfico y ventas pronosticados por intervalo | `<semana>.json → pronostico.intervalos` | `pronosticos` (metodo, parametros) → `demanda_intervalo.trafico/ventas` |
| `requerido_total`, `requerido_caja`, `es_pico` | `<semana>.json → demanda[]` | `demanda_intervalo` (una fila por intervalo de 30 min, `unique (pronostico_id, inicio)`) |
| Turnos del baseline / propuesta | `<semana>.json → baseline.asignaciones / propuesta.asignaciones` | `asignaciones where escenario_id = …` (`horas` = duración − descanso, `es_domingo` generados) |
| Horas regulares / dobles / triples / domingo por empleado | `evaluacion.por_empleado[]` | `v_costo_empleado_semana` (Σ `asignaciones.horas` por empleado, partida con `escenarios.tope_semanal` y `reglas_laborales.horas_dobles_max`) |
| Costo por empleado | `evaluacion.por_empleado[].costo` | `tabuladores.salario_hora` vigente × (regulares + factor_doble·dobles + factor_triple·triples) + salario × prima_dominical_pct/100 × horas_domingo |
| Cobertura por intervalo (`asignado_total`, `asignado_caja`) | `evaluacion.cobertura[]` | `cobertura_intervalo` (materializada por `resumir_escenario`: cuenta asignaciones cuyo `[inicio, fin)` contiene `demanda_intervalo.inicio`) |
| Horas y costo de sobrestaffing | `evaluacion.horas_sobrestaffing / costo_sobrestaffing` | `resumen_escenario` = Σ max(asignado_total − requerido_total, 0) × 0.5 × tarifa media ponderada por horas |
| Cobertura pico y déficit pico | `evaluacion.cobertura_pico_pct / deficit_pico_horas` | `resumen_escenario.intervalos_pico, intervalos_pico_cubiertos, deficit_pico_horas`; detalle en `v_subdotacion_pico` |
| Costo total, ahorro MXN y % | `resumen.json → filas[] / totales` | `v_ahorro_escenario` (baseline vs propuesta publicados de la misma `sucursal_id + semana_iso`); `reporte_ejecutivo(empresa, semana)` agrega |

Con `npm run motor -- --cargar` el motor inserta pronóstico, demanda, escenarios y asignaciones, llama `resumir_escenario` y compara `v_ahorro_escenario` contra la evaluación local: ambas deben coincidir al peso. La verificación del lado de la base (consultas SQL ejecutadas sobre el proyecto) la añade el coordinador en una sección posterior.

## 8. Verificación en la base de datos (Supabase, proyecto Jornada40)

Tras cargar las 200 tienda-semanas con `npm run motor -- --tiendas 50 --cargar` (408 escenarios publicados: 200 baseline + 200 propuestas, más las 8 de la prueba previa de T001; 170,746 asignaciones; 34,272 intervalos de demanda; 68,544 filas de cobertura; 408 resúmenes; 171,562 filas de auditoría), la comparación campo por campo de `resumen_escenario` y `v_ahorro_escenario` contra la evaluación local dio **400 de 400 verificaciones "coincide al peso"**. La consulta agregada sobre `v_ahorro_escenario` (misma agregación que `reporte_ejecutivo()`), ejecutada directamente en Postgres:

```sql
select semana_iso, count(*) tiendas,
       sum(costo_total_baseline) costo_baseline, sum(costo_total_propuesta) costo_propuesta,
       sum(ahorro_mxn) ahorro_mxn, round(100.0*sum(ahorro_mxn)/sum(costo_total_baseline),2) ahorro_pct,
       sum(ahorro_dobles) ahorro_dobles, sum(ahorro_sobrestaffing) ahorro_sobrestaffing,
       round(avg(cobertura_pico_baseline_pct),2) cob_pico_base, round(avg(cobertura_pico_propuesta_pct),2) cob_pico_prop,
       count(*) filter (where deficit_pico_horas_propuesta > 0) tiendas_con_subdotacion,
       sum(deficit_pico_horas_propuesta) deficit_pico_h
from v_ahorro_escenario group by semana_iso order by semana_iso;
```

| Semana | Tiendas | Costo baseline | Costo propuesta | Ahorro MXN | Ahorro % | Ahorro dobles | Ahorro sobrestaffing | Cob. pico base → prop. | Tiendas con déficit pico | Déficit pico (h) |
|---|---:|---:|---:|---:|---:|---:|---:|---|---:|---:|
| 2026-07-06 | 50 | $16,429,927.04 | $8,366,011.44 | $8,063,915.60 | 49.08 | $2,902,816 | $3,483,548.35 | 53.73 % → 99.83 % | 3 | 2.0 |
| 2026-07-13 | 50 | $15,824,082.55 | $9,132,556.44 | $6,691,526.11 | 42.29 | $2,902,816 | $2,908,779.86 | 47.77 % → 96.21 % | 50 | 139.5 |
| 2026-07-20 | 50 | $16,431,949.64 | $8,452,723.50 | $7,979,226.14 | 48.56 | $2,902,816 | $3,462,329.14 | 54.28 % → 99.77 % | 4 | 2.0 |
| 2026-07-27 | 50 | $15,829,275.74 | $9,119,129.81 | $6,710,145.93 | 42.39 | $2,902,816 | $2,910,858.68 | 47.91 % → 96.39 % | 50 | 147.5 |
| **Total** | **200** | **$64,515,234.97** | **$35,070,421.19** | **$29,444,813.78** | **45.64** | **$11,611,264** | **$12,765,516.03** | | | **291.0** |

El total en SQL ($64,515,234.97 → $35,070,421.19; ahorro $29,444,813.78 = 45.64 %) es idéntico a `resumen.json`. La cobertura pico de esta vista es "intervalos pico cubiertos / intervalos pico" (definición de `v_ahorro_escenario`); la métrica Σ min(asignado, requerido) / Σ requerido de §4 da 99.8 %. Las semanas del 13 y 27 de julio son las de quincena (×1.15 de tráfico): ahí el sábado exige más empleados-día distintos de los que tiene la plantilla (§6), y por eso concentran el déficit residual.

## 9. Escenario con vacantes cubiertas (subdotación cero)

El déficit residual de 291.0 h-persona en pico (305 h-persona de vacantes en pico; 3490 h-persona de vacantes en total en las 200 tienda-semanas) no es un límite del motor sino de la plantilla: la cota exacta de `capacidad.ts` prueba que en 116 tienda-semanas faltan empleados-día con habilidad de piso/caja el sábado (918 empleados-día en total). Si esas horas se cubren con vacantes de medio tiempo de fin de semana pagadas a la tarifa media ponderada ($63.7/h), el costo adicional es de **$222,313.00** en las 200 tienda-semanas, el déficit pico queda en 0 y el ahorro neto es **$29,222,500.78 = 45.3 %** del costo laboral baseline, muy por encima del objetivo de 8 %. Equivale a ~0.7 vacantes de 24 h por tienda-semana en promedio, concentradas en sábados.

## 10. Conclusión

- Tope duro de 40 h por empleado: garantizado por la base (EXCLUDE + constraint trigger diferido) y re-validado por el motor; 0 horas dobles y 0 triples en las 200 propuestas.
- Ahorro demostrado y trazable: 45.64 % ($29.44 M MXN en 4 semanas para 50 tiendas), reconstruible fila a fila desde `asignaciones` hasta `reporte_ejecutivo()`; 0 tienda-semanas por debajo del 8 %.
- Cobertura en picos: de 85.1 % a 99.8 % (Σ min/Σ req) con la plantilla actual; 100 % con 0.7 vacantes de medio tiempo por tienda-semana.
- El 45 % es alto porque el baseline sintético reproduce una programación rígida (48 h × 6 días en dos turnos fijos, domingo dotado como día entre semana); con un baseline ya ajustado a la demanda el ahorro se acercaría al componente de horas extra (≈ 18 % del baseline en estos datos).
