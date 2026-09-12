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
            <Link className="scenario-list__card" to={`/practice/${category.id}`}>
              <span className="scenario-list__name">{category.name}</span>
              <span className="scenario-list__detail">
                {category.personaName} · {category.blurb}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
