import { Navigate, useNavigate, useParams } from "react-router-dom";
import { LessonDetail } from "./LessonDetail";
import { lessons } from "./lessons";

export function LessonDetailScreen() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const lesson = lessons.find((candidate) => candidate.id === lessonId);

  if (!lesson) {
    return <Navigate to="/lessons" replace />;
  }

  return <LessonDetail lesson={lesson} onBack={() => navigate("/lessons")} />;
}
