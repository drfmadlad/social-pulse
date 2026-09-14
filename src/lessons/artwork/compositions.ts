import type { FlatObject, GestureShape, Hue } from "./kit";

/** Where a piece stands in its composition's coordinates, and how it sits there once settled. */
interface Pose {
  x: number;
  y: number;
  /** Degrees, pivoting from the piece's base. */
  rotate?: number;
  scale?: number;
}

/** How a gesture shape moves into its pose as its step enters (DESIGN.md §6, Artwork entrance). */
export type GestureMotion = "lean-left" | "lean-right" | "turn-away-left" | "turn-away-right" | "rise";

type GestureFill =
  | { hue: Hue; soft?: boolean; gesture?: GestureMotion }
  /** Lighting up crossfades from the hue's soft tint to the full hue, so it always settles on the full hue. */
  | { hue: Hue; soft?: never; gesture: "light-up" };

export type GesturePiece = Pose & { shape: GestureShape } & GestureFill;

/** Flat objects never move; they fade in. */
export type ObjectPiece = Pose & { object: FlatObject; hue: Hue; soft?: boolean };

export type Piece = GesturePiece | ObjectPiece;

export interface Composition {
  width: number;
  height: number;
  /** Painted in order, so later pieces overlap earlier ones. */
  pieces: Piece[];
}

export function isGesturePiece(piece: Piece): piece is GesturePiece {
  return "shape" in piece;
}

// Wide compositions are 360 x 180 and square ones 180 x 180, so a unit is never more than a pixel
// on screen and gesture offsets stay within DESIGN.md §6's limits. Wide compositions keep their
// action inside x 100–260, because bleed-edge crops a third off either side.

/** Every composition an Explainer can reference, registered by name. */
export const compositions = {
  "leaning-in": {
    width: 360,
    height: 180,
    pieces: [
      { shape: "pebble", x: 132, y: 170, rotate: 14, scale: 1.55, hue: "primary", gesture: "lean-right" },
      { shape: "pebble", x: 234, y: 170, rotate: -16, scale: 1.3, hue: "positive", gesture: "lean-left" },
      { shape: "dot", x: 184, y: 48, scale: 0.9, hue: "growth", gesture: "rise" },
    ],
  },
  echo: {
    width: 360,
    height: 180,
    pieces: [
      { shape: "pebble", x: 112, y: 170, rotate: 6, scale: 1.6, hue: "primary", gesture: "rise" },
      { shape: "dot", x: 168, y: 92, hue: "primary", soft: true },
      { shape: "pebble", x: 212, y: 170, rotate: -6, scale: 1.15, hue: "positive", gesture: "light-up" },
    ],
  },
  nudge: {
    width: 180,
    height: 180,
    pieces: [
      { shape: "capsule", x: 68, y: 166, rotate: -4, scale: 1.7, hue: "primary" },
      { shape: "capsule", x: 118, y: 166, rotate: -18, scale: 1.3, hue: "growth", gesture: "lean-left" },
    ],
  },
  "holding-back": {
    width: 180,
    height: 180,
    pieces: [
      { shape: "pebble", x: 60, y: 166, rotate: 10, scale: 1.5, hue: "positive", gesture: "lean-right" },
      { shape: "capsule", x: 132, y: 166, scale: 1.5, hue: "primary", soft: true },
      { shape: "dot", x: 132, y: 58, scale: 1.3, hue: "primary", gesture: "rise" },
    ],
  },
  "turning-away": {
    width: 360,
    height: 180,
    pieces: [
      { shape: "pebble", x: 150, y: 170, rotate: 8, scale: 1.55, hue: "primary", gesture: "lean-right" },
      { shape: "pebble", x: 238, y: 170, rotate: 16, scale: 1.25, hue: "growth", gesture: "turn-away-right" },
    ],
  },
  "open-door": {
    width: 180,
    height: 180,
    pieces: [
      { object: "door", x: 118, y: 168, scale: 2.1, hue: "primary", soft: true },
      { shape: "pebble", x: 62, y: 168, rotate: 14, scale: 1.4, hue: "positive", gesture: "lean-right" },
    ],
  },
  "following-the-thread": {
    width: 360,
    height: 180,
    pieces: [
      { shape: "arc", x: 180, y: 164, scale: 2.1, hue: "positive", soft: true },
      { shape: "pebble", x: 108, y: 170, rotate: 10, scale: 1.3, hue: "primary", gesture: "lean-right" },
      { shape: "dot", x: 180, y: 70, scale: 1.2, hue: "growth", gesture: "rise" },
      { shape: "capsule", x: 252, y: 170, rotate: -8, scale: 1.4, hue: "primary", gesture: "light-up" },
    ],
  },
  "across-the-table": {
    width: 360,
    height: 180,
    pieces: [
      { shape: "pebble", x: 112, y: 170, rotate: 8, scale: 1.5, hue: "primary", gesture: "lean-right" },
      { object: "cup", x: 184, y: 170, scale: 1.3, hue: "growth" },
      { shape: "pebble", x: 256, y: 170, rotate: -8, scale: 1.4, hue: "positive", gesture: "lean-left" },
    ],
  },
  "lighting-up": {
    width: 360,
    height: 180,
    pieces: [
      { shape: "capsule", x: 112, y: 170, rotate: 6, scale: 1.8, hue: "primary", gesture: "lean-right" },
      { shape: "pebble", x: 182, y: 170, scale: 1.35, hue: "positive", gesture: "light-up" },
      { shape: "pebble", x: 252, y: 170, rotate: -4, scale: 1.15, hue: "primary", soft: true },
    ],
  },
  "drifting-apart": {
    width: 360,
    height: 180,
    pieces: [
      { shape: "capsule", x: 140, y: 170, scale: 1.8, hue: "primary" },
      { shape: "pebble", x: 214, y: 170, rotate: 14, scale: 1.2, hue: "growth", gesture: "turn-away-right" },
      { shape: "dot", x: 178, y: 52, scale: 0.8, hue: "growth" },
    ],
  },
  "changing-course": {
    width: 180,
    height: 180,
    pieces: [
      { shape: "arc", x: 90, y: 166, scale: 2.2, hue: "primary", soft: true },
      { shape: "pebble", x: 90, y: 104, rotate: -12, scale: 1.1, hue: "primary", gesture: "rise" },
    ],
  },
  "passing-the-floor": {
    width: 360,
    height: 180,
    pieces: [
      { object: "chair", x: 100, y: 170, scale: 1.8, hue: "growth" },
      { shape: "pebble", x: 164, y: 170, rotate: 14, scale: 1.3, hue: "primary", gesture: "lean-right" },
      { shape: "pebble", x: 250, y: 170, rotate: -4, scale: 1.35, hue: "positive", gesture: "light-up" },
    ],
  },
} satisfies Record<string, Composition>;

export type CompositionName = keyof typeof compositions;
