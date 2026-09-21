import { cn } from "@/lib/utils";

/**
 * Jornada40 brand mark: an 8-segment loader ring with one amber "active"
 * segment that steps around the ring, tucked into a bold "Jornada40" wordmark.
 *
 * Intro (runs once on mount when `animated`):
 *   1. 0–700 ms   the whole ring, centered in the lockup, does one fast eased
 *                 full turn (0→360°).
 *   2. 700–1050 ms the ring glides left to its resting slot while the wordmark
 *                 fades in (opacity 0→1, blur 6px→0, translateX -8px→0 over
 *                 500 ms, 20 ms per-letter stagger).
 *   3. from 1050 ms the amber segment resumes its slow clock tick + blink.
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
  /** Run the intro (ring spin → glide + wordmark fade) and the clock tick. */
  animated?: boolean;
  /** "mono": aro y "40" heredan currentColor (para fondos de marca). */
  variant?: "default" | "mono";
  /** Accessible name announced by screen readers. */
  label?: string;
};

const VIEW_W = 258;
const VIEW_H = 64;

// Ring geometry (viewBox units).
const RING_CX = 32;
const RING_CY = 32;
const RING_R = 24;
const RING_STROKE = 6.5;
// 8 segments, each 20° of arc on a 45° pitch. With round caps the visible
// arc grows by ~8° per side, leaving a ~9° gap between neighbours.
const SEGMENT_ARC = 20;
// Offset the dash pattern so a gap (not a segment) sits at 3 o'clock, facing
// the wordmark.
const SEGMENT_OFFSET = 32.5;

const AMBER = "#f0a63a";
const GREY = "#8a8a85";

// Per-letter slot centers for Geist Bold at 40px with -0.02em tracking.
// Each letter is its own <text> anchored at its slot center so a fallback
// font that is slightly wider or narrower stays centered in its slot rather
// than accumulating drift.
const LETTERS: ReadonlyArray<{ ch: string; x: number; amber?: boolean }> = [
  { ch: "J", x: 81.0 },
  { ch: "o", x: 100.2 },
  { ch: "r", x: 118.3 },
  { ch: "n", x: 137.5 },
  { ch: "a", x: 157.8 },
  { ch: "d", x: 178.1 },
  { ch: "a", x: 198.5 },
  { ch: "4", x: 217.7, amber: true },
  { ch: "0", x: 236.9, amber: true },
];
const TEXT_BASELINE_Y = 46;

// Intro timeline (ms).
const SPIN_MS = 700;
const GLIDE_MS = 350;
const FADE_MS = 500;
const LETTER_STAGGER_MS = 20;
const GLIDE_START_MS = SPIN_MS;
const TICK_START_MS = SPIN_MS + GLIDE_MS;
// Where the ring sits while it spins: centered in the lockup.
const GLIDE_FROM_X = VIEW_W / 2 - RING_CX;

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

const STYLES = `
.j40-glide {
  transform-box: view-box;
  transform: translateX(${GLIDE_FROM_X}px);
  animation: j40-glide ${GLIDE_MS}ms ${EASE} ${GLIDE_START_MS}ms both;
}
.j40-whirl {
  transform-box: fill-box;
  transform-origin: center;
  animation: j40-whirl ${SPIN_MS}ms ${EASE} both;
}
.j40-spin {
  transform-box: view-box;
  transform-origin: ${RING_CX}px ${RING_CY}px;
  animation: j40-spin 8s steps(8, end) ${TICK_START_MS}ms infinite;
}
.j40-tick {
  animation: j40-blink 1s ease-in-out ${TICK_START_MS}ms infinite;
}
.j40-letter {
  transform-box: fill-box;
  transform-origin: center;
  opacity: 0;
  transform: translateX(-8px);
  filter: blur(6px);
  animation: j40-fade ${FADE_MS}ms ${EASE} both;
}
.j40-text {
  font-family: var(--font-sans), system-ui, sans-serif;
  font-weight: 700;
  font-size: 40px;
  letter-spacing: -0.02em;
}
@keyframes j40-whirl {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes j40-glide {
  from { transform: translateX(${GLIDE_FROM_X}px); }
  to { transform: translateX(0); }
}
@keyframes j40-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes j40-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}
@keyframes j40-fade {
  from { opacity: 0; transform: translateX(-8px); filter: blur(6px); }
  to { opacity: 1; transform: translateX(0); filter: blur(0); }
}
.j40-static .j40-glide { animation: none; transform: none; }
.j40-static .j40-whirl { animation: none; }
.j40-static .j40-spin, .j40-static .j40-tick { animation: none; }
.j40-static .j40-letter { animation: none; opacity: 1; transform: none; filter: none; }
@media (prefers-reduced-motion: reduce) {
  .j40-glide { animation: none; transform: none; }
  .j40-whirl { animation: none; }
  .j40-spin, .j40-tick { animation: none; }
  .j40-letter { animation: none; opacity: 1; transform: none; filter: none; }
}
`;

export function JornadaLogo({
  size = 40,
  animated = true,
  variant = "default",
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

      {/*
        Ring. Outer group glides from the lockup center to the left slot;
        inner group does the intro spin around its own center.
      */}
      <g className="j40-glide">
        <g className="j40-whirl">
          {/* 8 grey segments */}
          <circle
            cx={RING_CX}
            cy={RING_CY}
            r={RING_R}
            fill="none"
            stroke={variant === "mono" ? "currentColor" : GREY}
            opacity={variant === "mono" ? 0.35 : 1}
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            pathLength={360}
            strokeDasharray={`${SEGMENT_ARC} ${45 - SEGMENT_ARC}`}
            strokeDashoffset={SEGMENT_OFFSET}
          />

          {/* Active amber segment: one tick per second, blinking like a clock */}
          <g className="j40-spin">
            <circle
              className="j40-tick"
              cx={RING_CX}
              cy={RING_CY}
              r={RING_R}
              fill="none"
              stroke={variant === "mono" ? "currentColor" : AMBER}
              strokeWidth={RING_STROKE}
              strokeLinecap="round"
              pathLength={360}
              strokeDasharray={`${SEGMENT_ARC} ${360 - SEGMENT_ARC}`}
              strokeDashoffset={SEGMENT_OFFSET}
              transform={`rotate(-90 ${RING_CX} ${RING_CY})`}
            />
          </g>
        </g>
      </g>

      {/* Wordmark: one <text> per letter so the fade can stagger slightly */}
      <g className="j40-text" aria-hidden="true">
        {LETTERS.map((letter, i) => (
          <g
            key={`${letter.ch}-${i}`}
            className="j40-letter"
            style={{
              animationDelay: `${GLIDE_START_MS + i * LETTER_STAGGER_MS}ms`,
            }}
          >
            <text
              x={letter.x}
              y={TEXT_BASELINE_Y}
              textAnchor="middle"
              fill={letter.amber && variant !== "mono" ? AMBER : "currentColor"}
            >
              {letter.ch}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}
