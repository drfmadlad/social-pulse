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
        ← Lessons
      </button>
      <h3>
        {lesson.title}
        {lesson.isPlaceholder && <span className="draft-chip">Draft</span>}
      </h3>
      {lesson.passage.map((paragraph, index) => (
        <p key={index} className="lesson-detail__passage">
          {paragraph}
        </p>
      ))}
      <LessonQuiz questions={lesson.quiz} />
    </div>
  );
}
