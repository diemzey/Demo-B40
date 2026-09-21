import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/cnippet-table";

const ESCALONES = [
  { year: "2026", tope: "48 h" },
  { year: "2027", tope: "46 h" },
  { year: "2028", tope: "44 h" },
  { year: "2029", tope: "42 h" },
  { year: "2030", tope: "40 h" },
] as const;

const FILAS = [
  { year: "2026", tope: "48 h", desde: "la hora 49", maxDoble: "9 h", absoluto: "61 h" },
  { year: "2027", tope: "46 h", desde: "la hora 47", maxDoble: "9 h", absoluto: "59 h" },
  { year: "2028", tope: "44 h", desde: "la hora 45", maxDoble: "11 h", absoluto: "59 h" },
  { year: "2029", tope: "42 h", desde: "la hora 43", maxDoble: "11 h", absoluto: "57 h" },
  { year: "2030", tope: "40 h", desde: "la hora 41", maxDoble: "12 h", absoluto: "56 h" },
] as const;

const YEAR_DESTACADO = "2027";

export function QueCambia() {
  return (
    <section id="que-cambia" className="scroll-mt-24 py-16 md:py-24">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="grid gap-12 md:grid-cols-2 md:gap-16">
          <div>
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Qué cambia en enero
            </p>
            <h2 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight text-balance">
              Las mismas horas, más caras cada enero.
            </h2>

            <div className="mt-6 space-y-4 max-w-[56ch]">
              <p className="text-base text-muted-foreground leading-relaxed">
                La reforma publicada el 3 de marzo de 2026 baja el tope de la
                semana dos horas cada 1.º de enero hasta llegar a 40 en 2030, y
                prohíbe bajar el salario.
              </p>
              <p className="text-base text-muted-foreground leading-relaxed">
                Para la nómina eso no se siente como menos horas: se siente como
                un umbral que baja. La hora que hoy es ordinaria pasa a pagarse
                al doble en cuanto cruza el tope del año, y más arriba al
                triple, hasta un tope absoluto que ya no se puede cruzar. Nada
                cambia en el piso; cambia el precio de lo que ya se trabaja.
              </p>
              <p className="text-base text-muted-foreground leading-relaxed">
                La misma reforma obliga al registro electrónico de asistencia.
                Con él, la carga de la prueba pasa al patrón: cada hora por
                encima del tope queda escrita.
              </p>
              <p className="text-base text-muted-foreground leading-relaxed">
                Reponer con tiempo extra toda la cobertura que se pierde al
                bajar a 40 horas cuesta 33 % más de nómina; contratar, 20 %. La
                salida barata es reacomodar lo que ya existe.
              </p>
              <p className="font-mono text-xs text-muted-foreground">
                Hanademi, 2026 · LFT arts. 66–68
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-5 divide-x rounded-xl border bg-card overflow-hidden">
              {ESCALONES.map((e) => (
                <div
                  key={e.year}
                  className={cn(
                    "flex flex-col gap-2 px-3 py-4 md:px-4",
                    e.year === YEAR_DESTACADO && "bg-ambar/10",
                  )}
                >
                  <p className="font-mono text-[10px] md:text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Enero {e.year}
                  </p>
                  <p
                    className={cn(
                      "text-2xl font-semibold tabular-nums tracking-tight",
                      e.year === YEAR_DESTACADO ? "text-ambar" : "text-foreground",
                    )}
                  >
                    {e.tope}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-xl border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-mono text-[11px] uppercase tracking-[0.14em]">
                      Año
                    </TableHead>
                    <TableHead className="font-mono text-[11px] uppercase tracking-[0.14em]">
                      Tope semanal
                    </TableHead>
                    <TableHead className="font-mono text-[11px] uppercase tracking-[0.14em]">
                      Al doble desde
                    </TableHead>
                    <TableHead className="font-mono text-[11px] uppercase tracking-[0.14em]">
                      Máximo al doble
                    </TableHead>
                    <TableHead className="font-mono text-[11px] uppercase tracking-[0.14em]">
                      Tope absoluto
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {FILAS.map((f) => {
                    const destacado = f.year === YEAR_DESTACADO;
                    const cell = cn(
                      "tabular-nums",
                      destacado ? "text-ambar font-medium" : "text-foreground",
                    );
                    return (
                      <TableRow
                        key={f.year}
                        className={cn(destacado && "bg-ambar/10 hover:bg-ambar/10")}
                      >
                        <TableCell className={cell}>{f.year}</TableCell>
                        <TableCell className={cell}>{f.tope}</TableCell>
                        <TableCell className={cell}>{f.desde}</TableCell>
                        <TableCell className={cell}>{f.maxDoble}</TableCell>
                        <TableCell className={cell}>{f.absoluto}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">
              Calendario y escalones del régimen transitorio publicado. La
              lectura diaria o semanal del escalamiento sigue sujeta a criterio
              legal; Jornada40 la trae parametrizada.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default QueCambia;
