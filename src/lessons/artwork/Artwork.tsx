import type { CSSProperties } from "react";
import { compositions, isGesturePiece, type CompositionName, type Piece } from "./compositions";
import { flatObjectPaths, gestureShapePaths, type Hue } from "./kit";

/**
 * DESIGN.md §6, Artwork entrance: moving shapes start 120ms in, 80ms apart, and play for 520ms.
 * With at most three moving shapes (enforced by the composition tests) the last settles by 800ms,
 * inside the 900ms limit.
 */
const ENTRANCE_DELAY_MS = 120;
const GESTURE_STAGGER_MS = 80;

function hueToken(hue: Hue, soft = false) {
  return `var(--${hue}${soft ? "-soft" : ""})`;
}

function gestureOf(piece: Piece) {
  return isGesturePiece(piece) ? piece.gesture : undefined;
}

/** Decorative: hidden from assistive technology, since the Explainer's text carries the meaning. */
export function Artwork({ composition, className }: { composition: CompositionName; className?: string }) {
  const { width, height, pieces } = compositions[composition];
  let movingCount = 0;

  return (
    <svg
      className={`artwork${className ? ` ${className}` : ""}`}
      viewBox={`0 0 ${width} ${height}`}
      style={{ "--artwork-ratio": width / height } as CSSProperties}
      aria-hidden="true"
      focusable="false"
    >
      {pieces.map((piece, index) => {
        const delay = ENTRANCE_DELAY_MS + (gestureOf(piece) ? GESTURE_STAGGER_MS * movingCount++ : 0);
        return <ArtworkPiece key={index} piece={piece} delay={delay} />;
      })}
    </svg>
  );
}

function ArtworkPiece({ piece, delay }: { piece: Piece; delay: number }) {
  const gesture = gestureOf(piece);
  const style = {
    fill: hueToken(piece.hue, piece.soft),
    "--artwork-soft-fill": hueToken(piece.hue, true),
    "--artwork-delay": `${delay}ms`,
  } as CSSProperties;

  return (
    <g transform={`translate(${piece.x} ${piece.y})`}>
      {/* The animated group pivots on the piece's base. Its pose sits inside it, so gesture
          offsets stay in composition units rather than being scaled with the piece. */}
      <g className={`artwork-piece${gesture ? ` artwork-piece--${gesture}` : ""}`} style={style}>
        <path
          transform={`rotate(${piece.rotate ?? 0}) scale(${piece.scale ?? 1})`}
          d={isGesturePiece(piece) ? gestureShapePaths[piece.shape] : flatObjectPaths[piece.object]}
        />
      </g>
    </g>
  );
}
