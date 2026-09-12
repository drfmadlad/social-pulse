import { Link } from "react-router-dom";
import { HomeLink } from "../HomeLink";
import { scenarioCategories } from "./scenarioCategories";

export function PracticePickerScreen() {
  return (
    <section aria-labelledby="practice-heading" className="home-section">
      <HomeLink />
      <h2 id="practice-heading">Practice</h2>
      <ul className="scenario-list">
        {scenarioCategories.map((category) => (
          <li key={category.id}>
            <Link to={`/practice/${category.id}`}>{category.name}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
