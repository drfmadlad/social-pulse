import { LessonsSection } from "./sections/LessonsSection";
import { PracticeSection } from "./sections/PracticeSection";
import { HistorySection } from "./sections/HistorySection";

function App() {
  return (
    <div className="home-feed">
      <header className="home-header">
        <h1>Social Pulse</h1>
      </header>
      <main>
        <LessonsSection />
        <PracticeSection />
        <HistorySection />
      </main>
    </div>
  );
}

export default App;
