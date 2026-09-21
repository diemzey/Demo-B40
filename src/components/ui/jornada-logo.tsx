import { cn } from "@/lib/utils";

/**
 * Jornada40 brand mark: an 8-segment loader ring with one amber "active"
 * segment that steps around the ring, tucked into a bold "Jornada40" wordmark
 * whose letters bounce in one by one on mount.
 *
 * Pure SVG + CSS. No hooks, no images, no external libraries, so it renders
 * as a server component. All CSS lives inside the SVG under the `j40-` prefix.
 */
export type JornadaLogoProps = Omit<
  React.ComponentProps<"svg">,
  "children" | "viewBox" | "role"
> & {
  /** Rendered height in px. Width scales proportionally. */
  size?: number;
  /** Run the ring loader and the letter reveal. */
  animated?: boolean;
  /** Accessible name announced by screen readers. */
  label?: string;
};

const VIEW_W = 244;
const VIEW_H = 64;

// Ring geometry (viewBox units).
const RING_CX = 32;
const RING_CY = 32;
const RING_R = 24;
const RING_STROKE = 6.5;
// 8 segments, each 20° of arc on a 45° pitch. With round caps the visible
// arc grows by ~8° per side, leaving a ~9° gap between neighbours.
const SEGMENT_ARC = 20;
// Offset the dash pattern so a gap (not a segment) sits at 3 o'clock, where
// the "J" tucks into the ring.
const SEGMENT_OFFSET = 32.5;

const AMBER = "#f0a63a";
const GREY = "#8a8a85";

// Per-letter slot centers for Geist Bold at 40px with -0.02em tracking.
// Each letter is its own <text> anchored at its slot center so a fallback
// font that is slightly wider or narrower stays centered in its slot rather
// than accumulating drift.
const LETTERS: ReadonlyArray<{ ch: string; x: number; amber?: boolean }> = [
  { ch: "J", x: 67 },
  { ch: "o", x: 86.2 },
  { ch: "r", x: 104.3 },
  { ch: "n", x: 123.5 },
  { ch: "a", x: 143.8 },
  { ch: "d", x: 164.1 },
  { ch: "a", x: 184.5 },
  { ch: "4", x: 203.7, amber: true },
  { ch: "0", x: 222.9, amber: true },
];
const LETTER_STAGGER_MS = 60;
const TEXT_BASELINE_Y = 46;

const STYLES = `
.j40-spin {
  transform-box: view-box;
  transform-origin: ${RING_CX}px ${RING_CY}px;
  animation: j40-spin 1.2s steps(8, end) infinite;
}
.j40-letter {
  transform-box: fill-box;
  transform-origin: center;
  opacity: 0;
  transform: translateY(14px);
  animation: j40-rise 0.72s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
.j40-text {
  font-family: var(--font-sans), system-ui, sans-serif;
  font-weight: 700;
  font-size: 40px;
  letter-spacing: -0.02em;
}
@keyframes j40-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes j40-rise {
  0% { opacity: 0; transform: translateY(14px) scale(0.94); }
  45% { opacity: 1; }
  70% { transform: translateY(-3px) scale(1.02); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
.j40-static .j40-spin { animation: none; }
.j40-static .j40-letter { animation: none; opacity: 1; transform: none; }
@media (prefers-reduced-motion: reduce) {
  .j40-spin { animation: none; }
  .j40-letter { animation: none; opacity: 1; transform: none; }
}
`;

export function JornadaLogo({
  size = 40,
  animated = true,
  label = "Jornada40",
  className,
  ...props
}: JornadaLogoProps) {
  const width = Math.round((size * VIEW_W) / VIEW_H);

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      width={width}
      height={size}
      className={cn("text-neutral-100", !animated && "j40-static", className)}
      {...props}
    >
      <title>{label}</title>
      <style>{STYLES}</style>

      {/* Ring: 8 grey segments */}
      <circle
        cx={RING_CX}
        cy={RING_CY}
        r={RING_R}
        fill="none"
        stroke={GREY}
        strokeWidth={RING_STROKE}
        strokeLinecap="round"
        pathLength={360}
        strokeDasharray={`${SEGMENT_ARC} ${45 - SEGMENT_ARC}`}
        strokeDashoffset={SEGMENT_OFFSET}
      />

      {/* Active amber segment, stepping around the ring */}
      <g className="j40-spin">
        <circle
          cx={RING_CX}
          cy={RING_CY}
          r={RING_R}
          fill="none"
          stroke={AMBER}
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          pathLength={360}
          strokeDasharray={`${SEGMENT_ARC} ${360 - SEGMENT_ARC}`}
          strokeDashoffset={SEGMENT_OFFSET}
          transform={`rotate(-90 ${RING_CX} ${RING_CY})`}
        />
      </g>

      {/* Wordmark: one <text> per letter so each can bounce in on its own */}
      <g className="j40-text" aria-hidden="true">
        {LETTERS.map((letter, i) => (
          <g
            key={`${letter.ch}-${i}`}
            className="j40-letter"
            style={{ animationDelay: `${i * LETTER_STAGGER_MS}ms` }}
          >
            <text
              x={letter.x}
              y={TEXT_BASELINE_Y}
              textAnchor="middle"
              fill={letter.amber ? AMBER : "currentColor"}
            >
              {letter.ch}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}
