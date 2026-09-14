import { useEffect, useState, type CSSProperties } from "react";
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
  leftPercent: number;
  delayMs: number;
  peakVh: number;
  driftPx: number;
  spinDeg: number;
  durationS: number;
}

function generatePieces(): ConfettiPiece[] {
  return Array.from({ length: PIECE_COUNT }, (_, id) => ({
    id,
    color: pickColor(),
    isSquare: Math.random() < 0.3, // 70% 6×12px rectangles, 30% 8px squares
    leftPercent: randomBetween(15, 85),
    delayMs: randomBetween(0, 120), // spread over the first 120ms
    peakVh: randomBetween(45, 75), // rise to 45–75% of viewport height
    driftPx: randomSign() * randomBetween(60, 140), // drift 60–140px sideways
    spinDeg: randomSign() * randomBetween(360, 1080), // spin 360–1080°
    durationS: randomBetween(1.8, 2.6), // each piece lives 1.8–2.6s
  }));
}

/**
 * One confetti burst on Finish (DESIGN.md §6). Dependency-free DOM pieces, colored with the
 * `--confetti-*` tokens, removed once the burst ends. Renders nothing under reduced motion.
 */
export function Confetti() {
  const [pieces] = useState(() => (prefersReducedMotion() ? [] : generatePieces()));
  const [burstEnded, setBurstEnded] = useState(false);

  useEffect(() => {
    if (pieces.length === 0) return;
    const timer = window.setTimeout(() => setBurstEnded(true), BURST_LIFETIME_MS);
    return () => window.clearTimeout(timer);
  }, [pieces]);

  if (pieces.length === 0 || burstEnded) return null;

  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((piece) => (
        <span
          key={piece.id}
          className={`confetti-piece${piece.isSquare ? " confetti-piece--square" : ""}`}
          style={
            {
              left: `${piece.leftPercent}%`,
              "--confetti-color": piece.color,
              "--confetti-delay": `${piece.delayMs}ms`,
              "--confetti-duration": `${piece.durationS}s`,
              "--confetti-peak": `${piece.peakVh}vh`,
              "--confetti-drift": `${piece.driftPx}px`,
              "--confetti-spin": `${piece.spinDeg}deg`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
