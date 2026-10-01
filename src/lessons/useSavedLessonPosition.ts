import { useEffect, useState } from "react";
import { getLessonPosition } from "./lessonPositionStore";

/** How long a Lesson waits for the device before giving up on a kept position and starting at step 1. */
export const SAVED_POSITION_TIMEOUT_MS = 1500;

/**
 * The step this Lesson was left on (zero-based), read once when the Lesson opens. `undefined`
 * while the device is being read, then the step or `null` for "start at step 1". A device that
 * is slow to answer, or can't, never keeps the Lesson from opening.
 */
export function useSavedLessonPosition(lessonId: string, stepCount: number): number | null | undefined {
  const [position, setPosition] = useState<number | null | undefined>(undefined);

  useEffect(() => {
    let settled = false;
    const settle = (value: number | null) => {
      if (settled) return;
      settled = true;
      setPosition(value);
    };
    void getLessonPosition(lessonId, stepCount).then(settle);
    const timeout = window.setTimeout(() => settle(null), SAVED_POSITION_TIMEOUT_MS);
    return () => {
      settled = true;
      window.clearTimeout(timeout);
    };
  }, [lessonId, stepCount]);

  return position;
}
