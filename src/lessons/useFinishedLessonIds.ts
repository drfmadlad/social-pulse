import { useEffect, useState } from "react";
import { useLatestRequestGuard } from "../practice/useLatestRequestGuard";
import { getFinishedLessonIds, subscribeToLessonProgressChanges } from "./lessonProgressStore";

/** Fetches finished Lesson ids and keeps them live as Lessons are finished elsewhere on the page. */
export function useFinishedLessonIds(): Set<string> {
  const [finishedIds, setFinishedIds] = useState<Set<string>>(new Set());
  const { start, isStale } = useLatestRequestGuard();

  useEffect(() => {
    async function refresh() {
      const requestId = start();
      const latest = await getFinishedLessonIds();
      if (isStale(requestId)) return;
      setFinishedIds(latest);
    }
    void refresh();
    return subscribeToLessonProgressChanges(() => void refresh());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return finishedIds;
}
