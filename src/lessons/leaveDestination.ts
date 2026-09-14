export interface LeaveDestination {
  path: string;
  label: string;
}

/** Navigation state a screen passes when it opens a Lesson, so the Lesson flow can leave back to it. */
export interface LessonOpenerState {
  openedFrom: "home";
}

export const openedFromHome: LessonOpenerState = { openedFrom: "home" };

/**
 * Where leaving a Lesson goes: the screen that opened it. With no opener in the navigation
 * state, as on a direct link, it's the Lessons list.
 */
export function getLeaveDestination(locationState: unknown): LeaveDestination {
  const openedFromHomeScreen =
    typeof locationState === "object" &&
    locationState !== null &&
    (locationState as Partial<LessonOpenerState>).openedFrom === "home";

  return openedFromHomeScreen ? { path: "/", label: "← Home" } : { path: "/lessons", label: "← Lessons" };
}
