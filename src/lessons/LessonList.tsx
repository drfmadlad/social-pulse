import type { Lesson } from "./lessons";

interface LessonListProps {
  lessons: Lesson[];
  onSelect: (lesson: Lesson) => void;
}

export function LessonList({ lessons, onSelect }: LessonListProps) {
  return (
    <ul className="lesson-list">
      {lessons.map((lesson) => (
        <li key={lesson.id}>
          <button type="button" onClick={() => onSelect(lesson)}>
            <span className="lesson-list__title">
              {lesson.title}
              {lesson.isPlaceholder && <span className="lesson-placeholder-badge">Placeholder</span>}
            </span>
            <span className="lesson-list__summary">{lesson.summary}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
