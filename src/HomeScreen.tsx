import { Link } from "react-router-dom";
import { useHistoryEntries } from "./history/useHistoryEntries";
import { lessons } from "./lessons/lessons";
import { pickTodaysLesson } from "./lessons/pickTodaysLesson";

const todaysLesson = pickTodaysLesson(lessons);

export function HomeScreen() {
  const historyCount = useHistoryEntries().length;

  return (
    <>
      <header className="home-header">
        <h1>Social Pulse</h1>
      </header>

      <Link className="todays-idea" to={`/lessons/${todaysLesson.id}`}>
        <span className="todays-idea__eyebrow">Today&rsquo;s idea</span>
        <span className="todays-idea__title">{todaysLesson.title}</span>
        <span className="todays-idea__summary">{todaysLesson.summary}</span>
      </Link>

      <Link className="button-primary start-practicing" to="/practice">
        Start practicing
      </Link>

      <ul className="home-nav">
        <li>
          <Link to="/lessons">
            <span>Lessons</span> <span className="home-nav__count">{lessons.length}</span>
          </Link>
        </li>
        <li>
          <Link to="/history">
            <span>History</span> <span className="home-nav__count">{historyCount}</span>
          </Link>
        </li>
      </ul>
    </>
  );
}
