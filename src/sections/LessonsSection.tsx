import { useState } from "react";
import { LessonDetail } from "../lessons/LessonDetail";
import { LessonList } from "../lessons/LessonList";
import { lessons, type Lesson } from "../lessons/lessons";

type LessonsView = { kind: "list" } | { kind: "detail"; lesson: Lesson };

export function LessonsSection() {
  const [view, setView] = useState<LessonsView>({ kind: "list" });

  return (
    <section aria-labelledby="lessons-heading" className="home-section">
      <h2 id="lessons-heading">Lessons</h2>
      {view.kind === "list" && (
        <LessonList lessons={lessons} onSelect={(lesson) => setView({ kind: "detail", lesson })} />
      )}
      {view.kind === "detail" && <LessonDetail lesson={view.lesson} onBack={() => setView({ kind: "list" })} />}
    </section>
  );
}
