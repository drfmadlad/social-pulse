import { render } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Confetti } from "./Confetti";

function stubPrefersReducedMotion(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({ matches } as MediaQueryList),
  );
}

/** Stands in for LessonFlow's pinned pill: a real button, ref'd, so Confetti has something to measure. */
function ConfettiWithOriginButton() {
  const buttonRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button ref={buttonRef} type="button">
        Finish
      </button>
      <Confetti origin={buttonRef} />
    </>
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Confetti", () => {
  it("bursts pieces built only from the celebration color tokens, hidden from assistive technology", () => {
    stubPrefersReducedMotion(false);
    const { container } = render(<ConfettiWithOriginButton />);

    const burst = container.querySelector(".confetti");
    expect(burst).toHaveAttribute("aria-hidden", "true");

    const pieces = container.querySelectorAll(".confetti-piece");
    expect(pieces.length).toBeGreaterThan(0);
    for (const piece of pieces) {
      const color = (piece as HTMLElement).style.getPropertyValue("--confetti-color");
      expect(color).toMatch(/^var\(--confetti-(teal|berry|leaf|sunflower)\)$/);
    }
  });

  it("launches every piece from the origin button's own position", () => {
    stubPrefersReducedMotion(false);
    const { container } = render(<ConfettiWithOriginButton />);

    const burst = container.querySelector(".confetti") as HTMLElement;
    // jsdom lays out everything at (0, 0), so this just confirms the container carries the
    // measured origin rather than the CSS-only fallback the stylesheet defines.
    expect(burst.style.getPropertyValue("--confetti-origin-x")).toBe("0px");
    expect(burst.style.getPropertyValue("--confetti-origin-y")).toBe("0px");
  });

  it("launches every piece upward, since the pill sits at the clipped bottom edge", () => {
    stubPrefersReducedMotion(false);
    const { container } = render(<ConfettiWithOriginButton />);

    for (const piece of container.querySelectorAll(".confetti-piece")) {
      const peakY = (piece as HTMLElement).style.getPropertyValue("--confetti-peak-y");
      expect(Number.parseFloat(peakY)).toBeLessThan(0);
    }
  });

  it("renders no pieces under prefers-reduced-motion", () => {
    stubPrefersReducedMotion(true);
    const { container } = render(<ConfettiWithOriginButton />);

    expect(container.querySelector(".confetti")).not.toBeInTheDocument();
    expect(container.querySelectorAll(".confetti-piece")).toHaveLength(0);
  });
});
