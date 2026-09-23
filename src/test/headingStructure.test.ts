import { describe, expect, it } from "vitest";
import { expectSaneHeadingHierarchy } from "./headingStructure";

function containerOf(html: string): HTMLElement {
  const container = document.createElement("div");
  container.innerHTML = html;
  return container;
}

describe("expectSaneHeadingHierarchy", () => {
  it("accepts one h1 followed by headings that descend a level at a time, and back up again", () => {
    expect(() =>
      expectSaneHeadingHierarchy(containerOf("<h1>a</h1><h2>b</h2><h3>c</h3><h2>d</h2><h3>e</h3>")),
    ).not.toThrow();
  });

  it("rejects a screen with no headings", () => {
    expect(() => expectSaneHeadingHierarchy(containerOf("<p>nothing</p>"))).toThrow();
  });

  it("rejects a screen that starts below h1", () => {
    expect(() => expectSaneHeadingHierarchy(containerOf("<h2>a</h2><h1>b</h1>"))).toThrow();
  });

  it("rejects more than one h1", () => {
    expect(() => expectSaneHeadingHierarchy(containerOf("<h1>a</h1><h1>b</h1>"))).toThrow();
  });

  it("rejects a skipped level, including after an earlier deeper heading", () => {
    expect(() => expectSaneHeadingHierarchy(containerOf("<h1>a</h1><h3>b</h3>"))).toThrow();
    expect(() =>
      expectSaneHeadingHierarchy(containerOf("<h1>a</h1><h2>b</h2><h3>c</h3><h2>d</h2><h4>e</h4>")),
    ).toThrow();
  });
});
