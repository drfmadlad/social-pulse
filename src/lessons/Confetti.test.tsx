import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Confetti } from "./Confetti";

function stubPrefersReducedMotion(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({ matches } as MediaQueryList),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Confetti", () => {
  it("bursts pieces built only from the celebration color tokens, hidden from assistive technology", () => {
    stubPrefersReducedMotion(false);
    const { container } = render(<Confetti />);

    const burst = container.querySelector(".confetti");
    expect(burst).toHaveAttribute("aria-hidden", "true");

    const pieces = container.querySelectorAll(".confetti-piece");
    expect(pieces.length).toBeGreaterThan(0);
    for (const piece of pieces) {
      const color = (piece as HTMLElement).style.getPropertyValue("--confetti-color");
      expect(color).toMatch(/^var\(--confetti-(teal|berry|leaf|sunflower)\)$/);
    }
  });

  it("renders no pieces under prefers-reduced-motion", () => {
    stubPrefersReducedMotion(true);
    const { container } = render(<Confetti />);

    expect(container.querySelector(".confetti")).not.toBeInTheDocument();
    expect(container.querySelectorAll(".confetti-piece")).toHaveLength(0);
  });
});
