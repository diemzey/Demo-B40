import {
  EJEMPLO,
  PLANTILLA_COAPA,
  TOPE,
  resumenAntesEjemplo,
  resumenDe,
  resumenDespuesEjemplo,
} from "@/components/demo/plantilla-coapa";
import { SEMANAS, SEMANA_ACTUAL } from "@/components/dashboard/semanas-data";
import { TOPE_2027 } from "@/components/dashboard/colaboradores-table";
import { semanaDesdeLunes } from "@/lib/datos/semana";
import { TOPE_2030, type DatosPanel, type ProgramacionPanel, type SucursalPanel } from "@/lib/datos/tipos";

/**
 * Datos de muestra del panel: la misma tienda-semana de la portada (corrida
 * real del motor sobre datos sintéticos, `ejemplo-tienda.json`) presentada
 * como una semana ya programada a 40 h. Se usan cuando Supabase no está
 * configurado. Ninguna persona es real.
 */

/** Lunes de la semana 31 de 2026 (misma semana que `supabase/seed.sql`). */
const LUNES_DEMO = "2026-07-27";
const DIA_MS = 86_400_000;

const coapa = resumenDe(PLANTILLA_COAPA, "hoy", TOPE_2027);

export const SUCURSALES_DEMO: SucursalPanel[] = [
  {
    id: "coapa",
    nombre: "Coapa",
    ciudad: "Ciudad de México",
    hub: "CDMX Sur",
    personas: PLANTILLA_COAPA.length,
    horasAlDoble: coapa.horasAlDoble,
    fueraDeNorma: coapa.fueraDeNorma,
  },
  { id: "polanco", nombre: "Polanco", ciudad: "Ciudad de México", hub: "CDMX Sur", personas: 22, horasAlDoble: 0, fueraDeNorma: 0 },
  { id: "satelite", nombre: "Satélite", ciudad: "Naucalpan", hub: "CDMX Sur", personas: 18, horasAlDoble: 7.5, fueraDeNorma: 3 },
];

function lunesDeSemanaDemo(semana: number): string {
  const d = new Date(`${LUNES_DEMO}T00:00:00Z`);
  return new Date(d.getTime() - (SEMANA_ACTUAL - semana) * 7 * DIA_MS).toISOString().slice(0, 10);
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** La propuesta del ejemplo con la misma forma que una fila de `v_ahorro_escenario`. */
const PROGRAMACION_DEMO: ProgramacionPanel = {
  propuestaId: "demo-propuesta",
  baselineId: "demo-baseline",
  tope: TOPE,
  costoBaseline: r2(EJEMPLO.baseline.costoTotal),
  costoPropuesta: r2(EJEMPLO.propuesta.costoTotal),
  ahorroMxn: r2(EJEMPLO.ahorro.mxn),
  ahorroPct: r2(EJEMPLO.ahorro.pct),
  costoDoblesBaseline: r2(EJEMPLO.baseline.costoDobles),
  horasDoblesBaseline: EJEMPLO.baseline.horasDobles,
  costoSobrestaffingBaseline: r2(EJEMPLO.baseline.costoSobrestaffing),
  costoSobrestaffingPropuesta: r2(EJEMPLO.propuesta.costoSobrestaffing),
  coberturaPicoBaselinePct: EJEMPLO.baseline.coberturaPicoPct,
  coberturaPicoPropuestaPct: EJEMPLO.propuesta.coberturaPicoPct,
  deficitPicoHoras: EJEMPLO.propuesta.deficitPicoHoras,
  publicadoEn: null,
  // El ejemplo exportado no trae la cobertura por intervalo: la gráfica se omite.
  cobertura: [],
};

export function datosDemo(aviso: DatosPanel["aviso"] = null): DatosPanel {
  const personas = PLANTILLA_COAPA;
  const semana = semanaDesdeLunes(LUNES_DEMO);
  return {
    origen: "demo",
    aviso,
    sinDatos: false,
    empresa: { id: "demo", nombre: "Grupo Solmar", topeObjetivo: TOPE, costoHoraDefault: 60 },
    sucursales: SUCURSALES_DEMO,
    sucursal: { id: "coapa", nombre: "Coapa" },
    semana,
    tope: TOPE,
    topeLegal: 48,
    topeAnio: semana.anio,
    topeAnterior: null,
    tope2030: TOPE_2030,
    personas,
    antes: resumenAntesEjemplo(),
    despues: resumenDespuesEjemplo(),
    antes2030: resumenDe(personas, "hoy", TOPE_2030),
    semanas: SEMANAS.map((s) => ({
      inicio: lunesDeSemanaDemo(s.semana),
      iso: s.semana,
      horasAlDoble: s.horasAlDoble,
      fueraDeNorma: s.fueraDeNorma,
      colaboradores: PLANTILLA_COAPA.length,
      programada: s.semana === SEMANA_ACTUAL,
      ...(s.semana === SEMANA_ACTUAL
        ? {
            ahorroMxn: PROGRAMACION_DEMO.ahorroMxn,
            costoBaseline: PROGRAMACION_DEMO.costoBaseline,
            costoPropuesta: PROGRAMACION_DEMO.costoPropuesta,
            tope: TOPE,
            coberturaPicoPropuestaPct: PROGRAMACION_DEMO.coberturaPicoPropuestaPct,
          }
        : {}),
    })),
    programacion: PROGRAMACION_DEMO,
  };
}
