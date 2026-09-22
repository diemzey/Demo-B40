import { cn } from "@/lib/utils";

/**
 * Indicador de carga de Jornada40: el aro del logo (8 segmentos) con el
 * segmento ámbar girando como manecilla. Misma geometría que `JornadaLogo`,
 * sin el texto; gira más rápido que en el logo porque aquí significa
 * "trabajando". Con `prefers-reduced-motion` sólo parpadea.
 */
const CX = 32;
const CY = 32;
const R = 24;
const STROKE = 6.5;
const SEGMENT_ARC = 20;
const SEGMENT_OFFSET = 32.5;
const AMBER = "#f0a63a";

const CSS = `
.j40-carga-giro {
  transform-box: view-box;
  transform-origin: ${CX}px ${CY}px;
  animation: j40-carga-giro 1.6s steps(8, end) infinite;
}
.j40-carga-tick { animation: j40-carga-blink 0.8s ease-in-out infinite; }
@keyframes j40-carga-giro { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes j40-carga-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
@media (prefers-reduced-motion: reduce) {
  .j40-carga-giro { animation: none; }
  .j40-carga-tick { animation: j40-carga-blink 1.6s ease-in-out infinite; }
}
`;

export function LogoCargando({
  size = 20,
  label = "Cargando",
  className,
  mono = false,
}: {
  size?: number;
  /** Texto para lectores de pantalla; cadena vacía = decorativo. */
  label?: string;
  className?: string;
  /** Todo en `currentColor` (fondos amarillos). */
  mono?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role={label ? "img" : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
      className={cn("shrink-0", className)}
    >
      <style>{CSS}</style>
      <circle
        cx={CX}
        cy={CY}
        r={R}
        fill="none"
        stroke="currentColor"
        opacity={0.3}
        strokeWidth={STROKE}
        strokeLinecap="round"
        pathLength={360}
        strokeDasharray={`${SEGMENT_ARC} ${45 - SEGMENT_ARC}`}
        strokeDashoffset={SEGMENT_OFFSET}
      />
      <g className="j40-carga-giro">
        <circle
          className="j40-carga-tick"
          cx={CX}
          cy={CY}
          r={R}
          fill="none"
          stroke={mono ? "currentColor" : AMBER}
          strokeWidth={STROKE}
          strokeLinecap="round"
          pathLength={360}
          strokeDasharray={`${SEGMENT_ARC} ${360 - SEGMENT_ARC}`}
          strokeDashoffset={SEGMENT_OFFSET}
          transform={`rotate(-90 ${CX} ${CY})`}
        />
      </g>
    </svg>
  );
}
