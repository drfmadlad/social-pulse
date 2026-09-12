import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { HomeScreen } from "./HomeScreen";
import { ConversationScreen } from "./practice/ConversationScreen";
import { FeedbackSummaryRoute } from "./practice/FeedbackSummaryRoute";
import { PracticePickerScreen } from "./practice/PracticePickerScreen";
import { LessonDetailScreen } from "./lessons/LessonDetailScreen";
import { LessonsListScreen } from "./lessons/LessonsListScreen";
import { HistoryEntryDetailScreen } from "./history/HistoryEntryDetailScreen";
import { HistoryListScreen } from "./history/HistoryListScreen";

export function AppRoutes() {
  return (
    <div className="home-feed">
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/practice" element={<PracticePickerScreen />} />
        <Route path="/practice/:categoryId" element={<ConversationScreen />} />
        <Route path="/practice/:categoryId/feedback" element={<FeedbackSummaryRoute />} />
        <Route path="/lessons" element={<LessonsListScreen />} />
        <Route path="/lessons/:lessonId" element={<LessonDetailScreen />} />
        <Route path="/history" element={<HistoryListScreen />} />
        <Route path="/history/:entryId" element={<HistoryEntryDetailScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
