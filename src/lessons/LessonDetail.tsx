import { LessonQuiz } from "./LessonQuiz";
import type { Lesson } from "./lessons";

interface LessonDetailProps {
  lesson: Lesson;
  onBack: () => void;
}

export function LessonDetail({ lesson, onBack }: LessonDetailProps) {
  return (
    <div className="lesson-detail">
      <button type="button" className="back-button" onClick={onBack}>
        ← Back to Lessons
      </button>
      <h3>{lesson.title}</h3>
      {lesson.isPlaceholder && (
        <p className="lesson-detail__placeholder-note">
          Placeholder content — this Lesson is a stub while the real material is written.
        </p>
      )}
      {lesson.passage.map((paragraph, index) => (
        <p key={index} className="lesson-detail__passage">
          {paragraph}
        </p>
      ))}
      <LessonQuiz questions={lesson.quiz} />
    </div>
  );
}
