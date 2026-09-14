/** Guarded for environments without `matchMedia` (older jsdom, tests that don't stub it). */
export function prefersReducedMotion(): boolean {
  if (typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
