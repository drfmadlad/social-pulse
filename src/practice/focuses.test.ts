import { describe, expect, it } from "vitest";
import { findFocus, focuses } from "./focuses";

describe("focuses", () => {
  it("offers a short fixed list, each with an id and a label", () => {
    expect(focuses.length).toBeGreaterThanOrEqual(5);
    expect(focuses.length).toBeLessThanOrEqual(7);
    for (const focus of focuses) {
      expect(focus.id).toMatch(/^[a-z]+(-[a-z]+)*$/);
      expect(focus.label.trim()).not.toBe("");
    }
    const ids = focuses.map((focus) => focus.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("words each Focus as something to practise, never a target to hit (CONTEXT.md, Focus)", () => {
    for (const focus of focuses) {
      expect(focus.label, focus.id).toMatch(/^[A-Z][a-z]+ing\b/);
      expect(focus.label, focus.id).not.toMatch(/\d/);
      for (const term of ["goal", "target", "objective", "score", "at least", "every", "never", "always"]) {
        expect(focus.label.toLowerCase(), focus.id).not.toContain(term);
      }
    }
  });

  it("finds a Focus by id, and nothing for an unknown, missing or inherited id", () => {
    const [first] = focuses;
    expect(findFocus(first.id)).toBe(first);
    expect(findFocus("not-a-real-focus")).toBeUndefined();
    expect(findFocus(undefined)).toBeUndefined();
    expect(findFocus(null)).toBeUndefined();
    expect(findFocus("")).toBeUndefined();
    for (const inheritedKey of ["constructor", "toString", "__proto__", "hasOwnProperty"]) {
      expect(findFocus(inheritedKey)).toBeUndefined();
    }
  });
});
