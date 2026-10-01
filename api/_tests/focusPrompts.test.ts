import { describe, expect, it } from "vitest";
import { focuses } from "../../src/practice/focuses.js";
import { focusPrompts, getFocusPrompt } from "../_lib/focusPrompts.js";

describe("focusPrompts", () => {
  it("resolves wording for every Focus the browser offers, and has none the browser doesn't", () => {
    for (const focus of focuses) {
      const prompt = getFocusPrompt(focus.id);
      expect(prompt, `add server-owned wording for the "${focus.id}" Focus`).toBeDefined();
      expect(prompt!.guidance.trim().length).toBeGreaterThan(0);
    }
    expect(Object.keys(focusPrompts).sort()).toEqual(focuses.map((focus) => focus.id).sort());
  });

  it("names each Focus exactly as the app's line at the top of the Feedback Summary does", () => {
    for (const focus of focuses) {
      expect(getFocusPrompt(focus.id)!.name).toBe(focus.label);
    }
  });

  it("has nothing for an unknown id, or one that only exists on Object.prototype", () => {
    expect(getFocusPrompt("not-a-real-focus")).toBeUndefined();
    for (const inheritedKey of ["constructor", "toString", "__proto__", "hasOwnProperty"]) {
      expect(getFocusPrompt(inheritedKey)).toBeUndefined();
    }
  });
});
