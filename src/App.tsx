import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { HomeScreen } from "./HomeScreen";
import { ConversationScreen } from "./practice/ConversationScreen";
import { FeedbackSummaryRoute } from "./practice/FeedbackSummaryRoute";
import { PracticePickerScreen } from "./practice/PracticePickerScreen";
import { LessonDetailScreen } from "./lessons/LessonDetailScreen";
import { LessonsListScreen } from "./lessons/LessonsListScreen";
import { HistoryEntryDetailScreen } from "./history/HistoryEntryDetailScreen";
import { HistoryListScreen } from "./history/HistoryListScreen";
import { ScreenDirectionProvider, ScreenTransition } from "./ScreenTransition";

export function AppRoutes() {
  return (
    <div className="home-feed">
      <ScreenDirectionProvider>
        <Routes>
          <Route path="/" element={<ScreenTransition><HomeScreen /></ScreenTransition>} />
          <Route path="/practice" element={<ScreenTransition><PracticePickerScreen /></ScreenTransition>} />
          {/* Conversation is position:fixed/full-viewport; it animates itself instead of via this wrapper. */}
          <Route path="/practice/:categoryId" element={<ConversationScreen />} />
          <Route
            path="/practice/:categoryId/feedback"
            element={<ScreenTransition><FeedbackSummaryRoute /></ScreenTransition>}
          />
          <Route path="/lessons" element={<ScreenTransition><LessonsListScreen /></ScreenTransition>} />
          <Route path="/lessons/:lessonId" element={<ScreenTransition><LessonDetailScreen /></ScreenTransition>} />
          <Route path="/history" element={<ScreenTransition><HistoryListScreen /></ScreenTransition>} />
          <Route
            path="/history/:entryId"
            element={<ScreenTransition><HistoryEntryDetailScreen /></ScreenTransition>}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ScreenDirectionProvider>
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
