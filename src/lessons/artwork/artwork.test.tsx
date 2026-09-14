import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Artwork } from "./Artwork";
import { compositions, isGesturePiece, type CompositionName } from "./compositions";

const PALETTE_FILL = /^var\(--(primary|positive|growth)(-soft)?\)$/;

describe("Lesson artwork compositions", () => {
  describe.each(Object.keys(compositions) as CompositionName[])("%s", (name) => {
    const { pieces } = compositions[name];

    it("has a flat object only alongside at least one gesture shape", () => {
      if (pieces.some((piece) => !isGesturePiece(piece))) {
        expect(pieces.some(isGesturePiece)).toBe(true);
      }
    });

    it("moves at most three shapes as it enters", () => {
      expect(pieces.filter((piece) => isGesturePiece(piece) && piece.gesture).length).toBeLessThanOrEqual(3);
    });

    it("is colored only through palette tokens, with no hard-coded colors, strokes, gradients or filters", () => {
      const { container } = render(<Artwork composition={name} />);
      const svg = container.querySelector("svg")!;
      const elements = [svg, ...svg.querySelectorAll("*")];

      expect(svg.querySelectorAll("defs, linearGradient, radialGradient, pattern, filter, image")).toHaveLength(0);
      for (const element of elements) {
        expect(element.hasAttribute("fill"), `${element.tagName} has a fill attribute`).toBe(false);
        expect(element.hasAttribute("stroke"), `${element.tagName} has a stroke attribute`).toBe(false);
        const style = (element as SVGElement).style;
        if (style.fill) expect(style.fill).toMatch(PALETTE_FILL);
        expect(style.stroke).toBe("");
        expect(style.filter).toBe("");
      }
      const filled = elements.filter((element) => (element as SVGElement).style.fill);
      expect(filled.length).toBe(pieces.length);
    });
  });
});
