import { expect } from "vitest";

/**
 * issue #38: a screen reader user reads page structure off heading levels, so every screen needs
 * exactly one h1 naming it, opening the outline, and each heading after it may go at most one
 * level deeper than the heading before it.
 */
export function expectSaneHeadingHierarchy(container: HTMLElement): void {
  const levels = Array.from(container.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, h6")).map((heading) =>
    Number(heading.tagName[1]),
  );

  expect(levels[0]).toBe(1);
  expect(levels.filter((level) => level === 1)).toHaveLength(1);

  levels.slice(1).forEach((level, index) => {
    expect(level).toBeLessThanOrEqual(levels[index] + 1);
  });
}
