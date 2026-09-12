import { HomeLink } from "../HomeLink";
import { LessonList } from "./LessonList";
import { lessons } from "./lessons";

export function LessonsListScreen() {
  return (
    <section aria-labelledby="lessons-heading" className="home-section">
      <HomeLink />
      <h2 id="lessons-heading">Lessons</h2>
      <LessonList lessons={lessons} />
    </section>
  );
}
