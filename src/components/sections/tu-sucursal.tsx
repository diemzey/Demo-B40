"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Valor hora del salario mínimo general de 2026, pagado al doble.
const VALOR_HORA_SMG_2026 = 39.38;
const FACTOR_DOBLE = 2;
const SEMANAS_POR_ANO = 52;
// El tope baja de 46 h (2027) a 40 h (2030): seis horas más cruzan la línea.
const HORAS_EXTRA_2030 = 6;

const pesos = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });

function parseNonNegative(value: string): number {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function TuSucursal() {
  const [personasInput, setPersonasInput] = useState("20");
  const [excesoInput, setExcesoInput] = useState("3");

  const personas = parseNonNegative(personasInput);
  const exceso = parseNonNegative(excesoInput);

  const horasDoble = personas * exceso;
  const costoSemana = horasDoble * VALOR_HORA_SMG_2026 * FACTOR_DOBLE;
  const costoAnual = costoSemana * SEMANAS_POR_ANO;
  const exceso2030 = exceso + HORAS_EXTRA_2030;

  return (
    <section id="tu-sucursal" className="scroll-mt-24 py-16 md:py-24">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Tu sucursal
            </p>
            <h2 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight text-balance">
              Cuánto de tu semana cruza la línea en enero.
            </h2>

            <div className="mt-8 space-y-6">
              <div className="flex flex-col gap-2">
                <Label htmlFor="sucursal-personas">
                  Colaboradores que hoy pasan de 46 horas a la semana
                </Label>
                <Input
                  id="sucursal-personas"
                  name="personas"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  value={personasInput}
                  onChange={(e) => setPersonasInput(e.target.value)}
                  className="tabular-nums"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="sucursal-exceso">
                  Horas que se pasan, en promedio
                </Label>
                <Input
                  id="sucursal-exceso"
                  name="exceso"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={0.5}
                  value={excesoInput}
                  onChange={(e) => setExcesoInput(e.target.value)}
                  className="tabular-nums"
                />
              </div>
            </div>

            <p className="mt-6 max-w-[56ch] text-xs leading-relaxed text-muted-foreground">
              Cálculo: personas × horas de exceso. El costo sale del valor hora
              del salario mínimo general de 2026 ($39.38) pagado al doble. Con
              tu tabulador, es más.
            </p>
          </div>

          <div
            className="bg-card border rounded-xl p-6 md:p-8"
            aria-live="polite"
          >
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Se pagan al doble desde enero de 2027 · por semana
            </p>
            <p className="mt-3 text-4xl font-semibold tabular-nums text-ambar">
              {horasDoble.toFixed(1)} h
            </p>
            <p className="mt-4 text-sm leading-relaxed text-foreground">
              Al salario mínimo, ${pesos.format(costoSemana)} a la semana solo
              en esas horas.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Con el tope en 40 h, en 2030, las mismas personas cruzan por{" "}
              <span className="tabular-nums">{exceso2030.toFixed(1)} h</span>{" "}
              cada una.
            </p>

            <div className="mt-8 border-t pt-6">
              <p className="text-2xl font-semibold tabular-nums">
                ${pesos.format(costoAnual)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Al año, si la semana no cambia.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default TuSucursal;
