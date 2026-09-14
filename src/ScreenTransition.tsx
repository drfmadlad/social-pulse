import { createContext, useContext, useRef, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { getScreenDirection, screenTransitionClassName, type ScreenDirection } from "./screenDirection";

const ScreenDirectionContext = createContext<ScreenDirection>("forward");

/**
 * Tracks the previous route's pathname across navigations so descendant screens know
 * whether they're being pushed onto the stack or popped back off it. Must wrap `<Routes>`
 * (not sit inside it), since every screen unmounts and remounts on navigation but this
 * provider needs to persist to compare consecutive locations.
 */
export function ScreenDirectionProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const previousPathnameRef = useRef(pathname);
  const previousPathname = previousPathnameRef.current;
  if (previousPathname !== pathname) {
    previousPathnameRef.current = pathname;
  }

  return (
    <ScreenDirectionContext.Provider value={getScreenDirection(previousPathname, pathname)}>
      {children}
    </ScreenDirectionContext.Provider>
  );
}

export function useScreenDirection(): ScreenDirection {
  return useContext(ScreenDirectionContext);
}

/**
 * Wraps a screen's routed content to give it the DESIGN.md §6 screen-push entrance
 * animation. Not used for screens that are `position: fixed` (Conversation, the Lesson flow): a `transform`
 * on this wrapper would make it the containing block for a fixed descendant, breaking its
 * full-viewport layout for the animation's duration. Those screens apply the same
 * `screen-transition` classes directly to their own root element instead.
 */
export function ScreenTransition({ children }: { children: ReactNode }) {
  const direction = useScreenDirection();
  return <div className={screenTransitionClassName(direction)}>{children}</div>;
}
