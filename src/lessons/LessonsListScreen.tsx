import { HomeLink } from "../HomeLink";
import { LessonList } from "./LessonList";
import { lessons } from "./lessons";
import { useFinishedLessonIds } from "./useFinishedLessonIds";

export function LessonsListScreen() {
  const finishedLessonIds = useFinishedLessonIds();

  return (
    <section aria-labelledby="lessons-heading" className="home-section">
      <HomeLink />
      <h1 id="lessons-heading" className="home-section__heading">
        Lessons
      </h1>
      <LessonList lessons={lessons} finishedLessonIds={finishedLessonIds} />
    </section>
  );
}
