import {
  PLANTILLA_BASE,
  PLANTILLA_COAPA,
  reacomodoDe,
  resumenDe,
  resumenDespues,
} from "@/components/demo/plantilla-coapa";
import { SEMANAS, SEMANA_ACTUAL } from "@/components/dashboard/semanas-data";
import { TOPE_2027 } from "@/components/dashboard/colaboradores-table";
import { semanaDesdeLunes } from "@/lib/datos/semana";
import { TOPE_2030, type DatosPanel, type SucursalPanel } from "@/lib/datos/tipos";

/**
 * Datos de muestra del panel: la plantilla sintética de Coapa (misma que la
 * portada) con el tope transitorio de 2027. Se usan cuando Supabase no está
 * configurado o la empresa aún no tiene datos.
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

export function datosDemo(aviso: DatosPanel["aviso"] = null): DatosPanel {
  // La columna reacomodada sale del motor con el tope del panel (mismo 46 h que la portada).
  const { personas, resumen: reacomodo } = reacomodoDe(
    PLANTILLA_BASE.map((p) => ({ ...p, detalle: "Piso de venta" })),
    TOPE_2027,
  );
  const semana = semanaDesdeLunes(LUNES_DEMO);
  return {
    origen: "demo",
    aviso,
    sinDatos: false,
    empresa: { id: "demo", nombre: "Grupo Solmar" },
    sucursales: SUCURSALES_DEMO,
    sucursal: { id: "coapa", nombre: "Coapa" },
    semana,
    tope: TOPE_2027,
    topeAnio: 2027,
    topeAnterior: 48,
    tope2030: TOPE_2030,
    personas,
    antes: resumenDe(personas, "hoy", TOPE_2027),
    despues: resumenDespues(personas, reacomodo),
    antes2030: resumenDe(personas, "hoy", TOPE_2030),
    semanas: SEMANAS.map((s) => ({
      inicio: lunesDeSemanaDemo(s.semana),
      iso: s.semana,
      horasAlDoble: s.horasAlDoble,
      fueraDeNorma: s.fueraDeNorma,
      colaboradores: PLANTILLA_COAPA.length,
    })),
  };
}
