// Comparison 3 from Hirael <https://hirael.com/blocks/comparison/comparison-03>
// MIT · Mohammad Shehadeh · https://github.com/MohammadShehadeh/hirael

import {
  ArrowRight,
  Check,
  CircleAlert,
  CircleCheck,
  Minus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ComparisonColumn = {
  label: string;
  items: readonly string[];
};

export type ComparisonOutcome = {
  value: string;
  label: string;
};

export type Comparison03Props = React.ComponentProps<"section"> & {
  eyebrow: string;
  title: string;
  /** Columna resaltada (lo que sí hace). */
  yes: ComparisonColumn;
  /** Columna atenuada (lo que no hace). */
  no: ComparisonColumn;
  outcomes?: readonly ComparisonOutcome[];
  cta?: { label: string; href?: string };
  /** Tacha los elementos de la columna "no". */
  strikeNo?: boolean;
};

const Comparison03 = ({
  eyebrow,
  title,
  yes,
  no,
  outcomes,
  cta,
  strikeNo = false,
  className,
  ...props
}: Comparison03Props) => {
  const headingId = "comparison-03-heading";
  return (
    <section
      className={cn("bg-background py-20 sm:py-28", className)}
      aria-labelledby={headingId}
      {...props}
    >
      <div className="container mx-auto w-full max-w-5xl px-4">
        <div className="max-w-2xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {eyebrow}
          </p>
          <h2
            id={headingId}
            className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl"
          >
            {title}
          </h2>
        </div>

        <div className="mt-12 grid gap-px overflow-hidden rounded-md border border-border bg-border md:grid-cols-2">
          <div className="bg-card p-7 sm:p-8">
            <div className="flex items-center gap-2">
              <CircleCheck aria-hidden className="size-4 text-emerald-500" />
              <h3 className="font-mono text-[10px] uppercase tracking-[0.12em]">
                {yes.label}
              </h3>
            </div>
            <ul className="mt-6 flex flex-col gap-4">
              {yes.items.map((item) => (
                <li key={item} className="flex gap-3 text-sm">
                  <Check
                    aria-hidden
                    className="mt-0.5 size-4 shrink-0 text-emerald-500"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-background p-7 sm:p-8">
            <div className="flex items-center gap-2">
              <CircleAlert
                aria-hidden
                className="size-4 text-muted-foreground"
              />
              <h3 className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                {no.label}
              </h3>
            </div>
            <ul className="mt-6 flex flex-col gap-4">
              {no.items.map((item) => (
                <li
                  key={item}
                  className="flex gap-3 text-sm text-muted-foreground"
                >
                  <Minus
                    aria-hidden
                    className="mt-0.5 size-4 shrink-0 text-muted-foreground/50"
                  />
                  <span
                    className={cn(
                      strikeNo && "line-through decoration-muted-foreground/30",
                    )}
                  >
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {(outcomes?.length || cta) && (
          <div className="mt-10 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            {outcomes?.length ? (
              <dl className="flex flex-wrap items-baseline gap-x-8 gap-y-3">
                {outcomes.map((outcome) => (
                  <div
                    key={outcome.value}
                    className="flex items-baseline gap-2"
                  >
                    <dt className="text-xs text-muted-foreground">
                      {outcome.label}
                    </dt>
                    <dd className="order-first font-mono text-sm font-semibold tracking-tight">
                      {outcome.value}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <span />
            )}
            {cta && (
              <Button variant="outline" className="group" asChild={!!cta.href}>
                {cta.href ? (
                  <a href={cta.href}>
                    {cta.label}
                    <ArrowRight className="ml-2 size-3.5 transition-transform duration-150 ease-out group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
                  </a>
                ) : (
                  <>
                    {cta.label}
                    <ArrowRight className="ml-2 size-3.5 transition-transform duration-150 ease-out group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default Comparison03;
