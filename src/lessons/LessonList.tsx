import { Link } from "react-router-dom";
import type { Lesson } from "./lessons";

interface LessonListProps {
  lessons: Lesson[];
}

export function LessonList({ lessons }: LessonListProps) {
  return (
    <ul className="lesson-list">
      {lessons.map((lesson) => (
        <li key={lesson.id}>
          <Link to={`/lessons/${lesson.id}`}>
            <span className="lesson-list__title">
              {lesson.title}
              {lesson.isPlaceholder && <span className="lesson-placeholder-badge">Placeholder</span>}
            </span>
            <span className="lesson-list__summary">{lesson.summary}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
