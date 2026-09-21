import { cn } from "@/lib/utils";

export type StatCardProps = {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
  tone?: "default" | "destructive" | "amber";
};

const TONE: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "text-foreground",
  destructive: "text-destructive",
  amber: "text-amber-400",
};

export function StatCard({ label, value, unit, hint, tone = "default" }: StatCardProps) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
        {label}
      </p>
      <p className={cn("mt-2 text-3xl font-semibold tracking-tight tabular-nums", TONE[tone])}>
        {value}
        {unit && (
          <span className="ml-1 text-base font-medium text-muted-foreground">{unit}</span>
        )}
      </p>
      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
