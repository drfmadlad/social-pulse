import { Link } from "react-router-dom";

export function HomeScreen() {
  return (
    <>
      <header className="home-header">
        <h1>Social Pulse</h1>
      </header>
      <nav aria-label="Main">
        <ul className="home-nav">
          <li>
            <Link to="/lessons">Lessons</Link>
          </li>
          <li>
            <Link to="/practice">Practice</Link>
          </li>
          <li>
            <Link to="/history">History</Link>
          </li>
        </ul>
      </nav>
    </>
  );
}
