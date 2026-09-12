import { describe, expect, it } from "vitest";
import { getScreenDirection, screenTransitionClassName } from "./screenDirection";

describe("getScreenDirection", () => {
  it("treats navigating to a deeper path as forward", () => {
    expect(getScreenDirection("/practice", "/practice/dating")).toBe("forward");
  });

  it("treats navigating to a shallower path as back", () => {
    expect(getScreenDirection("/practice/dating", "/practice")).toBe("back");
  });

  it("treats navigating between paths of equal depth as forward", () => {
    expect(getScreenDirection("/lessons/active-listening", "/history/some-entry")).toBe("forward");
  });

  it("treats the very first render, with no prior navigation, as forward", () => {
    expect(getScreenDirection("/", "/")).toBe("forward");
  });

  it("treats a deep redirect back to Home as back", () => {
    expect(getScreenDirection("/practice/dating/feedback", "/")).toBe("back");
  });
});

describe("screenTransitionClassName", () => {
  it("names both the base transition class and its direction modifier", () => {
    expect(screenTransitionClassName("forward")).toBe("screen-transition screen-transition--forward");
    expect(screenTransitionClassName("back")).toBe("screen-transition screen-transition--back");
  });
});
