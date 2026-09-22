# Jornada40 · Calibración de los datos sintéticos

> Cómo se construyó "Almacenes del Valle", la cadena departamental sintética
> con la que se prueba el sistema, y por qué cada número es el que es. Los
> datos los produce `scripts/sintetico/generar.ts` (determinista, semilla 40)
> y los carga `scripts/sintetico/cargar.ts`; el contrato de archivos está en
> `scripts/sintetico/contrato.ts`. **Nada aquí es información real de ninguna
> empresa**: son órdenes de magnitud públicas de retail mexicano usadas como
> referencia para que los resultados sean creíbles.

```
npm run sintetico:generar -- --tiendas 50 --semanas-historia 8 --semanas-objetivo 4
SINTETICO_EMAIL=… SINTETICO_PASSWORD=… npm run sintetico:cargar -- [--solo catalogo|empleados|trafico|turnos] [--tiendas N]
```

## 1. La cadena y sus tiendas

| Supuesto | Valor | Por qué |
|---|---|---|
| Formato | Tienda departamental de barrio/ciudad media (ropa, calzado, muebles, electrónica, crédito) | Es el formato de Coppel (~1,600 tiendas, salas de 3–6 mil m²) y de Suburbia/Liverpool en su versión mediana: mucha venta asistida y mucho tráfico de abonos en caja, lo que hace que el personal sea sensible al tráfico por hora. Chedraui/Walmart son autoservicio (más cajas, menos piso) y sirven sólo como contraste. |
| Tiendas | 50 en 8 hubs regionales (Valle de México, Noreste, Occidente, Bajío, Centro-Sur, Golfo, Sureste, Noroeste), 6–7 por hub | Fijado en `docs/arquitectura.md` §1. Se reparten por *round-robin* entre hubs para que con `--tiendas 5` ya haya varias regiones; los nombres son localidades reales pero las tiendas son ficticias. |
| Horario | 09:00–21:00 todos los días (12 h, 24 intervalos de 30 min) | Horario típico de las departamentales mexicanas (Coppel 09–21, Liverpool 11–21, Suburbia 10–21); se toma el más largo para que el problema de cobertura tenga apertura y cierre. Parametrizable por sucursal en `catalogo.json`. |
| Plantilla por tienda | 65–95 personas, media ≈ 79 | `docs/arquitectura.md` §1 (~80 FTE). Una Coppel de tamaño medio opera con 80–150 personas incluyendo cobranza en campo y reparto; aquí sólo modelamos el personal de tienda (piso, caja, almacén, supervisión, crédito). |
| Tamaño ↔ tráfico | `base_hora = 220 + (fte − 65)/30 × 100` → 220–320 clientes/hora entre semana | El tráfico se escala con la plantilla para que ninguna tienda esté estructuralmente sobre/subdotada por construcción; las diferencias vienen del *horario*, no del tamaño. |

## 2. Puestos, mezcla y habilidades

| Puesto | % plantilla | Habilidades | Medio tiempo | Por qué |
|---|---|---|---|---|
| Vendedor(a) de piso | 48 % | piso | sí | La venta asistida es el corazón del formato departamental. |
| Cajero(a) | 22 % | caja + piso | sí | Alta carga de caja por abonos de crédito; los cajeros apoyan piso en valle. |
| Almacenista | 15 % | almacen (+piso en 50 %) | sí | Recepción, surtido y entrega de muebles/electrónica; la mitad puede cubrir piso. |
| Supervisor(a) de piso | 8 % | supervision + piso + caja | no | Un supervisor por área (~1 por cada 10–12 personas). |
| Asesor(a) de crédito | 5 % | piso | sí | Apertura de cuentas y cobranza en mostrador. |
| Gerente de tienda | 2 % (mín. 1) | supervision + piso + caja | no | Gerente + subgerente. |

- **Contratos**: 70 % tiempo completo (48 h/sem contratadas hoy, `max_horas_semana` 40 = tope
  del escenario) y 30 % medio tiempo (24 h/sem; `max_horas_semana` 24 porque
  un medio tiempo no puede subir a 40 h sin cambiar de contrato). Sólo cajeros,
  vendedores, almacenistas y asesores pueden ser medio tiempo.
- **Disponibilidad restringida** (≈ 14 % de la plantilla, ≈ 40 % de los medio
  tiempo y ≈ 4 % de los tiempo completo): estudiantes (`estudiante_tarde`:
  L–V 15:00–21:00, S–D todo el día), `fin_de_semana` (J–V tarde, S–D todo el
  día), `solo_manana` (L–S 09:00–15:00), `sin_domingo` y `hasta_18`. Sin filas
  de disponibilidad = disponible todo el horario de tienda.

## 3. Salarios (tabulador 2026)

| Supuesto | Valor | Por qué |
|---|---|---|
| Salario mínimo general 2026 | **$315.04 MXN/día** (supuesto: ≈ +13 % sobre $278.80 de 2025) | Es el supuesto de este proyecto; ajústese en `PUESTOS` de `generar.ts` si el decreto difiere. Piso por hora ≈ 315.04 / 8 = **$39.4/h**. |
| Piso de retail | 1.3–1.6 × mínimo ≈ $51–63/h | Rango observado en vacantes públicas de cajero/vendedor de departamentales y autoservicio en 2024–2025 (sueldo base + vales, sin comisiones). |
| Cajero(a) | $58/h (≈ $12,060 brutos/mes a 208 h) | 1.47 × mínimo. |
| Vendedor(a) de piso | $60/h (≈ $12,480/mes) | 1.52 × mínimo; ligeramente arriba de caja por comisiones promedio. |
| Almacenista | $55/h (≈ $11,440/mes) | 1.40 × mínimo. |
| Asesor(a) de crédito | $62/h (≈ $12,900/mes) | Requiere capacitación en originación de crédito. |
| Supervisor(a) | $95/h (≈ $19,760/mes) | Mando medio, ~1.6 × vendedor. |
| Gerente | $160/h (≈ $33,280/mes) | Gerente de tienda mediana. |
| Mensual bruto | hora × 208 h (48 h × 4.33 semanas) | Convención para comparar con ofertas mensuales. |
| Prima dominical | 25 % sobre las horas trabajadas en domingo | LFT art. 71. |
| Horas extra | primeras 9 h/sem al 200 %, resto al 300 % | LFT arts. 67–68; en `reglas_laborales`. |
| Tarifa media ponderada | ≈ $63.7/h | Resultado de la mezcla anterior. |

## 4. Tráfico, conversión y ventas

Todos los intervalos son de 30 min (ver `docs/arquitectura.md` §2.2). Por
tienda se generan 8 semanas de historia (lunes 2026-05-11 … 2026-06-29) y
4 semanas objetivo (2026-07-06 … 2026-07-27, la última coincide con el seed
demo): 12 semanas × 7 días × 24 intervalos = 2,016 filas por tienda.

| Supuesto | Valor | Por qué |
|---|---|---|
| Base entre semana | 220–320 clientes/hora según tamaño | Una departamental mediana recibe 2,500–5,000 visitas/día; con la curva y los fines de semana el promedio resultante es ≈ 4,500 clientes/día y ≈ 31,500/semana por tienda. |
| Curva intradía | valle 09:00–11:00 ×0.6; pico de comida 13:30–15:00 ×1.4; pico de cierre 18:30–20:30 ×1.5; interpolación lineal entre anclas | Los contadores de tráfico de retail en México muestran de forma consistente el pico de comida y el de salida de oficinas; el cociente pico/valle resultante es 2.5. |
| Día de la semana | L 1.0, M 0.95, X 0.95, J 1.0, V 1.15, S 1.6, D 1.4 | El sábado es el día fuerte del retail mexicano; el domingo es alto pero cierra el mismo horario. |
| Quincena | ×1.15 en semanas que contienen el día 15 o el último día del mes | Efecto quincena de nómina, muy marcado en Coppel/Elektra por abonos y compras a crédito. Semanas quincena del dataset: 05-11, 05-25, 06-15, 06-29, 07-13, 07-27. |
| Ruido | ±8 % uniforme por intervalo (tráfico), ±5 % adicional en ventas | Suficiente para que el pronóstico no sea trivial sin ocultar la estacionalidad. |
| Conversión | 0.35 transacciones por visitante | Rango típico departamental 25–40 % (incluye abonos en caja, que en Coppel elevan la conversión). |
| Ticket promedio | $650 MXN ± 20 % por tienda | Ticket departamental de ropa/calzado; muebles y electrónica suben la media pero son minoría de tickets. Ventas resultantes ≈ $7.2 M/semana/tienda. |
| Nómina / ventas | ≈ $215 k/sem ÷ $7.2 M ≈ 3 % (sólo personal de tienda modelado) | Bajo frente al 8–12 % de la industria porque no se modela cobranza, reparto, seguridad, limpieza ni prestaciones; es coherente con la plantilla de ~80. |

## 5. Requerimiento de personal (parámetros de productividad)

`parametros_demanda` en `catalogo.json`; el motor los guarda en
`pronosticos.parametros`. Fórmula (`docs/arquitectura.md` §5):
`requerido_piso = ceil(trafico_30 / clientes_por_colaborador_30min)`,
`requerido_caja = ceil(trafico_30 × conversion / transacciones_por_cajero_30min)`,
ambos con piso `minimo_apertura`.

| Supuesto | Valor | Por qué |
|---|---|---|
| `clientes_por_colaborador_30min` | **10** (20 clientes/hora por persona de piso) | Venta asistida: ~3 min por cliente atendido. El coordinador pidió ≈ 12; se usó 10 para que el requerimiento semanal (≈ 2,160 h) quede en ~78 % de la capacidad con tope 40 h (≈ 2,770 h) y ~67 % del horario vigente (≈ 3,215 h): hay holgura para cubrir picos sin que el problema sea trivial. Configurable con `--clientes-por-colaborador`. |
| `transacciones_por_cajero_30min` | **16** (≈ 1.9 min por transacción) | Abonos y compras a crédito tardan más que un cobro de autoservicio (25–30/30 min). Se pidió ≈ 18; 16 por la misma razón de holgura. Configurable con `--transacciones-por-cajero`. |
| `conversion` | 0.35 | Igual que en ventas, para que el requerimiento de caja sea coherente con las ventas generadas. |
| `minimo_apertura` | caja 1, piso 2, almacen 1, supervision 1 | Piso operativo: una caja abierta, dos personas en sala, alguien en recepción de mercancía y un responsable de tienda en todo momento. |
| Pico | intervalo con `requerido_total ≥ percentil 80` de la tienda-semana | Definición del motor; con esta curva los picos caen en 13:30–15:00 y 18:30–20:30 de jueves a domingo. |

## 6. Horario rígido vigente (baseline)

| Supuesto | Valor | Por qué |
|---|---|---|
| Tiempo completo | 6 días × 8 h = 48 h en una plantilla fija: `apertura` 09:00–17:30 o `cierre` 12:30–21:00 (510 min con 30 min de descanso), ~50/50 sin mirar la demanda; un día de descanso que rota cada semana | Es la práctica común hoy: dos turnos fijos, descanso rotativo, y el domingo se cubre como cualquier otro día. Las plantillas se ajustaron a 17:30/12:30 (no 17:00/13:00) para que las horas efectivas (`horarios.horas = duración − descanso`) sean exactamente 8 y la semana sume 48. |
| Medio tiempo | 4 días × 6 h = 24 h: `medio_manana` 09:00–15:00 (70 %) o `medio_tarde` 15:00–21:00; días que rotan | Los medio tiempo se contratan "para la mañana" aunque la demanda esté en la tarde. |
| Restringidos | El baseline respeta las ventanas de disponibilidad | Verificado por el generador (0 violaciones). |
| Efecto buscado | Mañanas sobredotadas (≈ 31 personas vs 13 requeridas a las 10:00 entre semana) y picos subdotados (≈ 26 vs 43 el sábado a las 19:00) | Es exactamente lo que debe corregir el optimizador: mover horas de la mañana a los picos y del exceso de 48 h a ≤ 40 h. |
| Plantillas adicionales | `intermedio` 11:00–19:30, `medio_intermedio` 12:00–18:00, cortos de 4 h (mañana, comida, cierre), de 5 h (mañana, cierre) y `siete_cierre` 13:30–21:00 | Menú del optimizador; todas entre 180 y 600 min como exige el DDL. |

## 7. Reglas laborales del escenario

`reglas_laborales` (vigente desde 2026-01-01): tope semanal 40 h, jornada
diaria máx. 8 h, hasta 9 h dobles y el resto triples, prima dominical 25 %,
descanso entre turnos 12 h, máximo 6 días por semana. El tope de 40 es el
parámetro del escenario (la ley vigente en 2026 sigue en 48); el baseline se
evalúa contra ese mismo tope para que el ahorro incluya las horas extra que
hoy se pagarían.

## 8. Cifras resultantes (50 tiendas, semilla 40)

| Métrica | Valor |
|---|---|
| Empleados | 3,941 (2,756 tiempo completo, 1,185 medio tiempo) |
| Filas de tráfico | 100,800 (2,016 por tienda) |
| Turnos vigentes (4 semanas) | 85,104 |
| Horas/semana por tiempo completo / medio tiempo | 48.0 / 24.0 (todas las semanas) |
| Clientes por hora (promedio de todos los intervalos) | ≈ 375; máximo en 30 min: 463 |
| Ratio pico (18:30–20:30) / valle (09:00–11:00) | 2.5 |
| Horas requeridas por tienda-semana | ≈ 2,164 (67 % del horario vigente, 78 % de la capacidad con tope 40) |
| Nómina semanal por tienda | ≈ $215 k MXN (≈ $11.2 M/año) |
| Tiempo de generación | < 1 s |

Estas cifras se recalculan en `scripts/sintetico/salida/resumen.json` cada vez
que corre el generador; `scripts/sintetico/muestra/` conserva en el repo la
tienda T001 completa como ejemplo del contrato.
