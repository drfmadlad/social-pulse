import { Navigate, useLocation, useParams } from "react-router-dom";
import { getLeaveDestination } from "./leaveDestination";
import { LessonFlow } from "./LessonFlow";
import { lessons, type Lesson } from "./lessons";
import { useSavedLessonPosition } from "./useSavedLessonPosition";

export function LessonFlowScreen() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const lesson = lessons.find((candidate) => candidate.id === lessonId);

  if (!lesson) {
    return <Navigate to="/lessons" replace />;
  }

  // Keyed by Lesson so moving between Lessons on this route always starts the new one afresh.
  return <OpenLesson key={lesson.id} lesson={lesson} />;
}

/** Waits for the kept position before the Lesson shows, so it opens once, on the right screen. */
function OpenLesson({ lesson }: { lesson: Lesson }) {
  const location = useLocation();
  const resumeStepIndex = useSavedLessonPosition(lesson.id, lesson.steps.length);

  if (resumeStepIndex === undefined) return null;

  return (
    <LessonFlow
      lesson={lesson}
      leaveTo={getLeaveDestination(location.state)}
      openerState={location.state}
      resumeStepIndex={resumeStepIndex}
    />
  );
}
