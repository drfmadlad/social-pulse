import { isValidElement } from "react";
import type { RouteObject } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { createAppRouteObjects } from "./App";
import { ScreenTransition } from "./ScreenTransition";
import { holdsBackUpdateOffer } from "./updateOfferHoldBack";

// Screens wrapped in ScreenTransition are ordinary scrolling pages. The ones that aren't
// (Conversation, the Lesson flow) are full-viewport and animate themselves (App.tsx), and they're
// exactly the ones a reload would cost the user something on.
function routes(): RouteObject[] {
  return createAppRouteObjects()[0].children!.filter((route) => route.path && route.path !== "*");
}

function isFullViewport(route: RouteObject): boolean {
  return !(isValidElement(route.element) && route.element.type === ScreenTransition);
}

function pathnameFor(route: RouteObject): string {
  return route.path!.replace(/:\w+/g, "example");
}

describe("holdsBackUpdateOffer", () => {
  it("holds the offer back on every full-viewport route in App", () => {
    const fullViewport = routes().filter(isFullViewport);
    expect(fullViewport.map((route) => route.path)).toEqual(["/practice/:categoryId", "/lessons/:lessonId"]);

    for (const route of fullViewport) {
      expect(holdsBackUpdateOffer(pathnameFor(route)), route.path).toBe(true);
    }
  });

  it("lets every other route show the offer", () => {
    for (const route of routes().filter((candidate) => !isFullViewport(candidate))) {
      expect(holdsBackUpdateOffer(pathnameFor(route)), route.path).toBe(false);
    }
  });
});
