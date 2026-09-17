import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { prefersReducedMotion } from "../prefersReducedMotion";

const PIECE_COUNT = 120;
/** All pieces are removed by 2.6s (DESIGN.md §6, Finish confetti): the longest possible
 * delay (120ms) plus the longest possible lifetime (2.6s) rounds up to this. */
const BURST_LIFETIME_MS = 2720;

/** Piece share is fixed: teal 35%, berry 25%, leaf 20%, sunflower 20% (DESIGN.md §3), expressed
 * here as the cumulative thresholds a random roll is checked against. */
const COLORS = ["--confetti-teal", "--confetti-berry", "--confetti-leaf", "--confetti-sunflower"] as const;
const COLOR_THRESHOLDS = [0.35, 0.6, 0.8, 1] as const;

function pickColor(): string {
  const roll = Math.random();
  const index = COLOR_THRESHOLDS.findIndex((threshold) => roll < threshold);
  return `var(${COLORS[index === -1 ? COLORS.length - 1 : index]})`;
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randomSign(): 1 | -1 {
  return Math.random() < 0.5 ? -1 : 1;
}

interface ConfettiPiece {
  id: number;
  color: string;
  isSquare: boolean;
  delayMs: number;
  /** Total sideways throw, spent almost entirely in the first third as drag kills it. */
  spreadXVw: number;
  /** Apex height above the pill, as a negative (upward) offset. */
  peakYVh: number;
  spinDeg: number;
  durationS: number;
}

/** The pill sits at the screen's bottom edge, so a downward-launched piece has nowhere to go
 * before it's clipped; the barrel points up and fans out to ±72°, wide enough to throw pieces
 * at the side edges while still giving every one of them real height to climb. */
const LAUNCH_ARC_RADIANS = Math.PI * 0.4;
/** Reach along the launch angle. Vertical runs nearly the screen's height, so the burst tops out
 * near the status bar rather than against a low ceiling partway up. */
const MAX_RISE_VH = 92;
const MIN_RISE_VH = 52;
const PIECE_LIFETIME_RANGE_S = [1.8, 2.6] as const;

/**
 * A cannon, not a fountain: each piece gets its own angle within the launch arc and its own
 * reach, so the spread is continuous (no bimodal "two streams") and scales to the viewport
 * (vw/vh) so it fills most of the screen on any device size, not just a fixed pixel band.
 */
function generatePieces(): ConfettiPiece[] {
  const [minLifetimeS, maxLifetimeS] = PIECE_LIFETIME_RANGE_S;

  return Array.from({ length: PIECE_COUNT }, (_, id) => {
    const angle = randomBetween(-LAUNCH_ARC_RADIANS, LAUNCH_ARC_RADIANS);
    const riseVh = Math.cos(angle) * randomBetween(MIN_RISE_VH, MAX_RISE_VH);

    return {
      id,
      color: pickColor(),
      isSquare: Math.random() < 0.3, // 70% 6×12px rectangles, 30% 8px squares
      delayMs: randomBetween(0, 120), // spread over the first 120ms
      spreadXVw: Math.sin(angle) * randomBetween(30, 66),
      peakYVh: -riseVh,
      spinDeg: randomSign() * randomBetween(360, 1080), // spin 360–1080°
      // Pieces thrown higher stay up proportionally longer, so everything comes down at about
      // the same speed instead of the high fliers plummeting to cover their extra ground in the
      // same time. The band itself is unchanged: every piece still lives 1.8–2.6s.
      durationS: minLifetimeS + (riseVh / MAX_RISE_VH) * (maxLifetimeS - minLifetimeS),
    };
  });
}

interface ConfettiProps {
  /** The pinned pill: every piece launches from its on-screen position, so the burst reads as
   * an explosion out of the button rather than pieces already scattered along the bottom. */
  origin: RefObject<HTMLElement | null>;
}

/**
 * One confetti burst on Finish (DESIGN.md §6). Dependency-free DOM pieces, colored with the
 * `--confetti-*` tokens, removed once the burst ends. Renders nothing under reduced motion.
 */
export function Confetti({ origin }: ConfettiProps) {
  const [pieces] = useState(() => (prefersReducedMotion() ? [] : generatePieces()));
  const [burstEnded, setBurstEnded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Runs before paint, so the burst never flashes at the fallback center-bottom position first.
  useLayoutEffect(() => {
    const button = origin.current;
    const container = containerRef.current;
    if (!button || !container) return;
    const rect = button.getBoundingClientRect();
    container.style.setProperty("--confetti-origin-x", `${rect.left + rect.width / 2}px`);
    container.style.setProperty("--confetti-origin-y", `${rect.top + rect.height / 2}px`);
  }, [origin]);

  useEffect(() => {
    if (pieces.length === 0) return;
    const timer = window.setTimeout(() => setBurstEnded(true), BURST_LIFETIME_MS);
    return () => window.clearTimeout(timer);
  }, [pieces]);

  if (pieces.length === 0 || burstEnded) return null;

  return (
    <div ref={containerRef} className="confetti" aria-hidden="true">
      {pieces.map((piece) => (
        <span
          key={piece.id}
          className={`confetti-piece${piece.isSquare ? " confetti-piece--square" : ""}`}
          style={
            {
              "--confetti-color": piece.color,
              "--confetti-delay": `${piece.delayMs}ms`,
              "--confetti-duration": `${piece.durationS}s`,
              "--confetti-spread-x": `${piece.spreadXVw}vw`,
              "--confetti-peak-y": `${piece.peakYVh}vh`,
              "--confetti-spin": `${piece.spinDeg}deg`,
            } as CSSProperties
          }
        >
          {/* The sideways throw and the rise-and-fall run on separate elements so each can carry
              its own curve: drag decays the spread while gravity acts on the climb. */}
          <span className="confetti-piece__flake" />
        </span>
      ))}
    </div>
  );
}
