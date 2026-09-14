import { Link } from "react-router-dom";
import { findNextUnfinishedLesson } from "./findNextUnfinishedLesson";
import type { Lesson } from "./lessons";

interface LessonListProps {
  lessons: Lesson[];
  finishedLessonIds: ReadonlySet<string>;
}

export function LessonList({ lessons, finishedLessonIds }: LessonListProps) {
  const upNextLesson = findNextUnfinishedLesson(lessons, finishedLessonIds);

  return (
    <ul className="lesson-list">
      {lessons.map((lesson) => {
        const isFinished = finishedLessonIds.has(lesson.id);
        const isUpNext = lesson.id === upNextLesson?.id;
        return (
          <li key={lesson.id}>
            <Link
              to={`/lessons/${lesson.id}`}
              className={isUpNext ? "lesson-list__row lesson-list__row--up-next" : "lesson-list__row"}
            >
              <span className="lesson-list__text">
                <span className="lesson-list__title">
                  {lesson.title}
                  {lesson.isPlaceholder && <span className="draft-chip">Draft</span>}
                </span>
                <span className="lesson-list__summary">{lesson.summary}</span>
              </span>
              {isUpNext && <span className="visually-hidden">Up next</span>}
              {isFinished && (
                <span className="lesson-list__done">
                  <span aria-hidden="true">✓</span>
                  <span className="visually-hidden">Done</span>
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
