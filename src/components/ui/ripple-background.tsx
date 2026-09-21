import { cn } from "@/lib/utils";

type RippleBackgroundProps = React.ComponentProps<"section"> & {
  /** Número de anillos concéntricos animados. */
  rings?: number;
};

/**
 * Sección con fondo amarillo y ondas concéntricas que se expanden
 * continuamente. Respeta prefers-reduced-motion (ver globals.css).
 */
export function RippleBackground({
  rings = 4,
  className,
  children,
  ...props
}: RippleBackgroundProps) {
  return (
    <section
      className={cn(
        "relative isolate overflow-hidden bg-ambar text-neutral-950",
        className,
      )}
      {...props}
    >
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        {Array.from({ length: rings }).map((_, i) => (
          <span
            key={i}
            className="ripple-ring absolute top-1/2 left-1/2 aspect-square w-[60vmax] rounded-full border-[3px] border-ambar-hondo/25"
            style={{ animationDelay: `${(i * 7) / rings}s` }}
          />
        ))}
      </div>
      {children}
    </section>
  );
}
