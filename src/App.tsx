import {
  createBrowserRouter,
  createRoutesFromElements,
  Navigate,
  Outlet,
  Route,
  RouterProvider,
  useRoutes,
} from "react-router-dom";
import { AppUpdateOffer } from "./AppUpdateOffer";
import { HomeScreen } from "./HomeScreen";
import { ConversationScreen } from "./practice/ConversationScreen";
import { FeedbackSummaryRoute } from "./practice/FeedbackSummaryRoute";
import { PracticePickerScreen } from "./practice/PracticePickerScreen";
import { LessonFlowScreen } from "./lessons/LessonFlowScreen";
import { LessonsListScreen } from "./lessons/LessonsListScreen";
import { HistoryEntryDetailScreen } from "./history/HistoryEntryDetailScreen";
import { HistoryListScreen } from "./history/HistoryListScreen";
import { ScreenDirectionProvider, ScreenTransition } from "./ScreenTransition";

function AppShell() {
  return (
    <div className="home-feed">
      <ScreenDirectionProvider>
        <Outlet />
      </ScreenDirectionProvider>
      <AppUpdateOffer />
    </div>
  );
}

// A data router, not the plain `<BrowserRouter>` this used to be: Practice Conversation's leave
// confirmation (issue #33) uses `useBlocker`, which only works against a data router's navigation,
// so every screen shares this router rather than each screen picking its own. Exported as a
// factory, not a fixed array: `createBrowserRouter`/`createMemoryRouter` mutate the route objects
// they're given to assign each one an id, so a second router built from the same array collides
// with the first. Tests that need their own router (to drive the system back gesture the way a
// real back button press does) call this again rather than reusing App's.
// eslint-disable-next-line react-refresh/only-export-components
export function createAppRouteObjects() {
  return createRoutesFromElements(
    <Route element={<AppShell />}>
      <Route path="/" element={<ScreenTransition><HomeScreen /></ScreenTransition>} />
      <Route path="/practice" element={<ScreenTransition><PracticePickerScreen /></ScreenTransition>} />
      {/* Conversation and the Lesson flow are position:fixed/full-viewport; they animate themselves instead of via this wrapper. */}
      <Route path="/practice/:categoryId" element={<ConversationScreen />} />
      <Route
        path="/practice/:categoryId/feedback/:entryId"
        element={<ScreenTransition><FeedbackSummaryRoute /></ScreenTransition>}
      />
      <Route path="/lessons" element={<ScreenTransition><LessonsListScreen /></ScreenTransition>} />
      <Route path="/lessons/:lessonId" element={<LessonFlowScreen />} />
      <Route path="/history" element={<ScreenTransition><HistoryListScreen /></ScreenTransition>} />
      <Route
        path="/history/:entryId"
        element={<ScreenTransition><HistoryEntryDetailScreen /></ScreenTransition>}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Route>,
  );
}

/**
 * The same routes rendered as a plain component, for tests that don't touch Practice Conversation
 * and so don't need a data router: `useRoutes` only needs to be inside *some* `<Router>`, data or
 * not.
 */
export function AppRoutes() {
  return useRoutes(createAppRouteObjects());
}

const router = createBrowserRouter(createAppRouteObjects());

function App() {
  return <RouterProvider router={router} />;
}

export default App;
