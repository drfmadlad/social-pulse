import { describe, expect, it, vi } from "vitest";
import { shuffleOptions } from "./shuffleOptions";

describe("shuffleOptions", () => {
  const options = [
    { id: "a", text: "A" },
    { id: "b", text: "B" },
    { id: "c", text: "C" },
  ];

  it("returns the same options, possibly reordered", () => {
    const shuffled = shuffleOptions(options);
    expect(shuffled.map((option) => option.id).sort()).toEqual(options.map((option) => option.id).sort());
  });

  it("doesn't mutate the array it's given", () => {
    shuffleOptions(options);
    expect(options.map((option) => option.id)).toEqual(["a", "b", "c"]);
  });

  it("is driven by Math.random, so a fixed sequence gives a fixed order", () => {
    const randomSpy = vi.spyOn(Math, "random");

    randomSpy.mockReturnValue(0);
    expect(shuffleOptions(options).map((option) => option.id)).toEqual(["b", "c", "a"]);

    randomSpy.mockReturnValue(0.999);
    expect(shuffleOptions(options).map((option) => option.id)).toEqual(["a", "b", "c"]);

    randomSpy.mockRestore();
  });
});
