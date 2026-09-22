/**
 * Genera un fixture mínimo (1 tienda pequeña) con la MISMA forma que
 * scripts/sintetico/salida/ para probar el motor sin depender del
 * generador sintético. Determinista (LCG con semilla fija).
 *
 *   npx tsx scripts/motor/fixtures/generar-mini.ts
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Catalogo, Empleado, TraficoFila, TurnoVigente } from '../tipos';
import { MS_DIA, MS_MIN, fechaAMs, msAIso, sumarDias } from '../tiempo';

const dir = join(__dirname, 'mini');
mkdirSync(join(dir, 'trafico'), { recursive: true });
mkdirSync(join(dir, 'turnos_vigentes'), { recursive: true });

let semilla = 20260706;
const rnd = (): number => {
  semilla = (semilla * 1103515245 + 12345) % 2147483648;
  return semilla / 2147483648;
};

const catalogo: Catalogo = {
  empresa: { nombre: 'Mini Retail de Prueba' },
  hubs: [{ clave: 'H01', nombre: 'Hub Centro', ciudad: 'Ciudad de México', estado: 'Ciudad de México' }],
  sucursales: [
    { clave: 'T01', nombre: 'Tienda Mini 01', hub_clave: 'H01', ciudad: 'Ciudad de México', apertura: '09:00', cierre: '21:00', fte: 20 },
  ],
  puestos: [
    { clave: 'cajero', nombre: 'Cajero', habilidad_clave: 'caja' },
    { clave: 'piso', nombre: 'Asesor de piso', habilidad_clave: 'piso' },
    { clave: 'almacenista', nombre: 'Almacenista', habilidad_clave: 'almacen' },
    { clave: 'supervisor', nombre: 'Supervisor', habilidad_clave: 'supervision' },
  ],
  habilidades: [
    { clave: 'caja', nombre: 'Caja' },
    { clave: 'piso', nombre: 'Piso de venta' },
    { clave: 'almacen', nombre: 'Almacén' },
    { clave: 'supervision', nombre: 'Supervisión' },
  ],
  tabuladores: [
    { puesto_clave: 'cajero', vigente_desde: '2026-01-01', salario_hora: 62, prima_dominical_pct: 25 },
    { puesto_clave: 'piso', vigente_desde: '2026-01-01', salario_hora: 58, prima_dominical_pct: 25 },
    { puesto_clave: 'almacenista', vigente_desde: '2026-01-01', salario_hora: 60, prima_dominical_pct: 25 },
    { puesto_clave: 'supervisor', vigente_desde: '2026-01-01', salario_hora: 110, prima_dominical_pct: 25 },
  ],
  plantillas_turno: [
    { clave: 'C0900', hora_inicio: '09:00', duracion_min: 510, descanso_min: 30 },
    { clave: 'C1000', hora_inicio: '10:00', duracion_min: 510, descanso_min: 30 },
    { clave: 'C1100', hora_inicio: '11:00', duracion_min: 510, descanso_min: 30 },
    { clave: 'C1230', hora_inicio: '12:30', duracion_min: 510, descanso_min: 30 },
    { clave: 'S0900', hora_inicio: '09:00', duracion_min: 390, descanso_min: 30 },
    { clave: 'S1500', hora_inicio: '15:00', duracion_min: 360, descanso_min: 30 },
    { clave: 'M0900', hora_inicio: '09:00', duracion_min: 240, descanso_min: 0 },
    { clave: 'M1200', hora_inicio: '12:00', duracion_min: 240, descanso_min: 0 },
    { clave: 'M1300', hora_inicio: '13:00', duracion_min: 240, descanso_min: 0 },
    { clave: 'M1700', hora_inicio: '17:00', duracion_min: 240, descanso_min: 0 },
    { clave: 'M1800', hora_inicio: '18:00', duracion_min: 180, descanso_min: 0 },
  ],
  reglas_laborales: {
    vigente_desde: '2026-01-01',
    tope_semanal: 40,
    max_horas_dia: 8,
    horas_dobles_max: 9,
    factor_doble: 2,
    factor_triple: 3,
    prima_dominical_pct: 25,
    descanso_entre_turnos_horas: 12,
    max_dias_semana: 6,
  },
  parametros_demanda: {
    clientes_por_colaborador_30min: 12,
    conversion: 0.35,
    transacciones_por_cajero_30min: 10,
    minimo_apertura: { caja: 1, piso: 2, almacen: 1, supervision: 1 },
  },
};

// Empleados: 2 supervisores, 2 almacenistas, 6 cajeros, 10 piso (4 medio tiempo).
const empleados: Empleado[] = [];
const alta = (
  n: number,
  puesto: string,
  habilidades: string[],
  tipo: Empleado['tipo_contrato'],
  disponibilidad: Empleado['disponibilidad'] = [],
): void => {
  const idx = empleados.length + 1;
  empleados.push({
    clave_externa: `E${String(idx).padStart(3, '0')}`,
    sucursal_clave: 'T01',
    nombre: `Nombre${idx}`,
    apellido: `Apellido${idx}`,
    puesto_clave: puesto,
    tipo_contrato: tipo,
    jornada_contratada: tipo === 'tiempo_completo' ? 48 : 24,
    max_horas_semana: tipo === 'tiempo_completo' ? 40 : 24,
    habilidades,
    disponibilidad,
  });
  void n;
};
alta(1, 'supervisor', ['supervision', 'piso', 'caja'], 'tiempo_completo');
alta(2, 'supervisor', ['supervision', 'piso'], 'tiempo_completo');
alta(3, 'almacenista', ['almacen', 'piso'], 'tiempo_completo');
alta(4, 'almacenista', ['almacen'], 'tiempo_completo');
for (let i = 0; i < 6; i++) alta(5 + i, 'cajero', i < 3 ? ['caja', 'piso'] : ['caja'], 'tiempo_completo');
for (let i = 0; i < 6; i++) alta(11 + i, 'piso', i < 2 ? ['piso', 'caja'] : ['piso'], 'tiempo_completo');
// Medio tiempo: sólo tardes (13:00–21:00) o sólo mañanas (09:00–15:00).
const tardes = [1, 2, 3, 4, 5, 6, 7].map((d) => ({ dia_semana: d, hora_inicio: '13:00', hora_fin: '21:00' }));
const mananas = [1, 2, 3, 4, 5, 6].map((d) => ({ dia_semana: d, hora_inicio: '09:00', hora_fin: '15:00' }));
alta(17, 'piso', ['piso'], 'medio_tiempo', tardes);
alta(18, 'piso', ['piso', 'caja'], 'medio_tiempo', tardes);
alta(19, 'piso', ['piso'], 'medio_tiempo', mananas);
alta(20, 'cajero', ['caja', 'piso'], 'medio_tiempo', tardes);

// Tráfico: 12 semanas (8 historia + 4 objetivo) desde 2026-05-11.
const primerLunes = '2026-05-11';
const curvaHora = [0.35, 0.45, 0.55, 0.7, 0.85, 1.0, 1.0, 0.85, 0.75, 0.8, 0.95, 1.05, 1.1, 1.15, 1.2, 1.25, 1.3, 1.3, 1.25, 1.1, 0.95, 0.8, 0.6, 0.4];
const factorDia = [0.8, 0.8, 0.85, 0.9, 1.05, 1.35, 1.25];
const trafico: TraficoFila[] = [];
for (let w = 0; w < 12; w++) {
  const lunes = sumarDias(primerLunes, 7 * w);
  let quincena = false;
  for (let d = 0; d < 7; d++) {
    const f = sumarDias(lunes, d);
    const dia = Number(f.slice(8, 10));
    const ult = new Date(Date.UTC(Number(f.slice(0, 4)), Number(f.slice(5, 7)), 0)).getUTCDate();
    if (dia === 15 || dia === ult) quincena = true;
  }
  for (let d = 0; d < 7; d++) {
    for (let s = 0; s < 24; s++) {
      const base = 45 * curvaHora[s] * factorDia[d] * (quincena ? 1.15 : 1) * (0.85 + 0.3 * rnd());
      const t = Math.max(0, Math.round(base));
      const ms = fechaAMs(lunes) + d * MS_DIA + (9 * 60 + s * 30) * MS_MIN;
      trafico.push({ inicio: msAIso(ms), trafico: t, ventas: Math.round(t * 0.35 * (380 + 120 * rnd()) * 100) / 100 });
    }
  }
}

// Turnos vigentes (baseline rígido): tiempo completo 6 días × 8 h (48 h);
// medio tiempo 6 días × 4 h. Descanso rotativo. Mañana o tarde fijos.
const turnos: TurnoVigente[] = [];
const habPuesto: Record<string, string> = { cajero: 'caja', piso: 'piso', almacenista: 'almacen', supervisor: 'supervision' };
for (let w = 8; w < 12; w++) {
  const lunes = sumarDias(primerLunes, 7 * w);
  empleados.forEach((e, k) => {
    const libre = k % 7;
    const tarde = k % 2 === 1;
    for (let d = 0; d < 7; d++) {
      if (d === libre) continue;
      const fecha = sumarDias(lunes, d);
      if (e.tipo_contrato === 'tiempo_completo') {
        turnos.push({
          clave_externa: e.clave_externa,
          fecha,
          hora_inicio: tarde ? '12:30' : '09:00',
          hora_fin: tarde ? '21:00' : '17:30',
          descanso_min: 30,
          habilidad_clave: habPuesto[e.puesto_clave],
        });
      } else {
        const manana = e.disponibilidad[0]?.hora_inicio === '09:00';
        if (manana && d === 6) continue; // sin disponibilidad domingo
        turnos.push({
          clave_externa: e.clave_externa,
          fecha,
          hora_inicio: manana ? '09:00' : '17:00',
          hora_fin: manana ? '13:00' : '21:00',
          descanso_min: 0,
          habilidad_clave: habPuesto[e.puesto_clave],
        });
      }
    }
  });
}

writeFileSync(join(dir, 'catalogo.json'), JSON.stringify(catalogo, null, 2));
writeFileSync(join(dir, 'empleados.json'), JSON.stringify(empleados, null, 2));
writeFileSync(join(dir, 'trafico', 'T01.json'), JSON.stringify(trafico));
writeFileSync(join(dir, 'turnos_vigentes', 'T01.json'), JSON.stringify(turnos));
console.log(`Fixture escrito en ${dir}: ${empleados.length} empleados, ${trafico.length} intervalos, ${turnos.length} turnos vigentes`);
