/**
 * The shared Lesson artwork kit (DESIGN.md §8): abstract gesture shapes and a few flat objects,
 * drawn as SVG paths. Every path is drawn standing on its base at (0, 0) and rising into negative
 * y, so a piece placed at (x, y) stands on that point and its gestures pivot from its base.
 */

/** Artwork is colored only through these palette hues, as the full token or its `-soft` tint. */
export type Hue = "primary" | "positive" | "growth";

/** Abstract forms that act out a social dynamic through tilt, spacing, overlap and fill. Never faces, limbs or silhouettes. */
export type GestureShape = "pebble" | "capsule" | "arc" | "dot";

/** Everyday props that set a scene. They only ever appear alongside gesture shapes. */
export type FlatObject = "cup" | "chair" | "door";

export const gestureShapePaths: Record<GestureShape, string> = {
  pebble: "M -24 0 C -29 -30 -20 -66 0 -66 C 20 -66 29 -30 24 0 C 16 3 -16 3 -24 0 Z",
  capsule: "M -14 0 L -14 -58 A 14 14 0 0 1 14 -58 L 14 0 Z",
  arc: "M -34 0 A 34 34 0 0 1 34 0 L 20 0 A 20 20 0 0 0 -20 0 Z",
  dot: "M -9 -9 A 9 9 0 1 1 9 -9 A 9 9 0 1 1 -9 -9 Z",
};

export const flatObjectPaths: Record<FlatObject, string> = {
  // A tapered cup with a ring handle, on a saucer.
  cup: "M -13 -30 L 13 -30 L 10 -5 L -10 -5 Z M 12 -26 A 8 8 0 0 1 12 -10 L 12 -14 A 4 4 0 0 0 12 -22 Z M -18 -4 L 18 -4 L 18 0 L -18 0 Z",
  // A side-on chair: a backrest tilted back, a thick seat and splayed legs.
  chair:
    "M -22 -62 L -13 -62 L -8 -29 L -17 -29 Z M -18 -31 L 18 -31 L 18 -22 L -18 -22 Z M -16 -22 L -10 -22 L -14 0 L -20 0 Z M 10 -22 L 16 -22 L 20 0 L 14 0 Z",
  // A door with its knob cut out of the leaf, so the ground shows through.
  door: "M -18 0 L -18 -68 L 18 -68 L 18 0 Z M 8 -34 A 3 3 0 1 0 8 -33.99 Z",
};
