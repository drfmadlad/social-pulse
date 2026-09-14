import { Navigate, useLocation, useParams } from "react-router-dom";
import { getLeaveDestination } from "./leaveDestination";
import { LessonFlow } from "./LessonFlow";
import { lessons } from "./lessons";

export function LessonFlowScreen() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const location = useLocation();
  const lesson = lessons.find((candidate) => candidate.id === lessonId);

  if (!lesson) {
    return <Navigate to="/lessons" replace />;
  }

  // Keyed by Lesson so moving between Lessons on this route always starts the new one at step 1.
  return (
    <LessonFlow
      key={lesson.id}
      lesson={lesson}
      leaveTo={getLeaveDestination(location.state)}
      openerState={location.state}
    />
  );
}
