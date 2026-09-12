export type ScreenDirection = "forward" | "back";

/**
 * The app's navigation is a stack (see INFORMATION-ARCHITECTURE.md §3): every back
 * affordance pushes to a shallower path than the one it left, so path depth alone tells
 * a screen-push transition which way to animate, without needing browser POP/PUSH state
 * (our own back links use forward `<Link>` navigation, not history.back()).
 */
export function getScreenDirection(previousPathname: string, nextPathname: string): ScreenDirection {
  return countSegments(nextPathname) < countSegments(previousPathname) ? "back" : "forward";
}

/** The CSS classes a screen applies for its DESIGN.md §6 screen-push transition. */
export function screenTransitionClassName(direction: ScreenDirection): string {
  return `screen-transition screen-transition--${direction}`;
}

function countSegments(pathname: string): number {
  return pathname.split("/").filter(Boolean).length;
}
