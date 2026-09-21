import { cn } from "@/lib/utils";

export type StatCardProps = {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
  /** Delta corto (p. ej. "−123.5 h") con su lectura: bueno / malo / neutro. */
  delta?: string;
  deltaTone?: "good" | "bad" | "neutral";
  tone?: "default" | "destructive" | "amber";
};

const TONE: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "text-foreground",
  destructive: "text-destructive",
  amber: "text-amber-400",
};

const DELTA_TONE: Record<NonNullable<StatCardProps["deltaTone"]>, string> = {
  good: "bg-emerald-500/15 text-emerald-400",
  bad: "bg-destructive/15 text-destructive",
  neutral: "bg-muted text-muted-foreground",
};

export function StatCard({
  label,
  value,
  unit,
  hint,
  delta,
  deltaTone = "neutral",
  tone = "default",
}: StatCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-lg shadow-black/5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {delta && (
          <span
            className={cn(
              "inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-4 tabular-nums",
              DELTA_TONE[deltaTone],
            )}
          >
            {delta}
          </span>
        )}
      </div>
      <p className={cn("mt-1.5 text-2xl font-semibold tracking-tight", TONE[tone])}>
        {value}
        {unit && <span className="ml-1 text-sm font-medium text-muted-foreground">{unit}</span>}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
