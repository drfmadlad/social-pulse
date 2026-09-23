import { expect } from "vitest";

/**
 * issue #38: a screen reader user reads page structure off heading levels, so every screen needs
 * exactly one h1 naming it, and every heading below it has to descend without skipping a level.
 */
export function expectSaneHeadingHierarchy(container: HTMLElement): void {
  const levels = Array.from(container.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, h6")).map((heading) =>
    Number(heading.tagName[1]),
  );

  expect(levels.filter((level) => level === 1)).toHaveLength(1);

  let deepestSoFar = 1;
  for (const level of levels) {
    expect(level).toBeLessThanOrEqual(deepestSoFar + 1);
    deepestSoFar = Math.max(deepestSoFar, level);
  }
}
