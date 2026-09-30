import { useId } from "react";
import { useHref, useLinkClickHandler } from "react-router-dom";
import { HomeLink } from "../HomeLink";
import { useOnlineStatus } from "../useOnlineStatus";
import { scenarioBriefPath } from "./practicePaths";
import { scenarioCategories, type ScenarioCategory } from "./scenarioCategories";

interface CategoryCardProps {
  category: ScenarioCategory;
  online: boolean;
  offlineNoticeId: string;
}

/**
 * One category's card: a link to its Scenario brief, or, offline, where the Conversation it sets up
 * would fail on its first line, a disabled link that can't open one. It's the same <a> either way, not a router
 * <Link> swapped for a plain anchor, so a keyboard user focused on it keeps their focus when the
 * connection drops or returns. Offline it stays focusable and is described by the notice, so a
 * screen reader hears the category, that it's unavailable, and why.
 */
function CategoryCard({ category, online, offlineNoticeId }: CategoryCardProps) {
  const to = scenarioBriefPath(category.id);
  const href = useHref(to);
  const followLink = useLinkClickHandler<HTMLAnchorElement>(to);

  return (
    <a
      className="scenario-list__card"
      href={online ? href : undefined}
      onClick={online ? followLink : undefined}
      role={online ? undefined : "link"}
      aria-disabled={online ? undefined : true}
      aria-describedby={online ? undefined : offlineNoticeId}
      tabIndex={online ? undefined : 0}
    >
      <span className="scenario-list__name">{category.name}</span>
      <span className="scenario-list__detail">
        {category.personaName} · {category.blurb}
      </span>
    </a>
  );
}

export function PracticePickerScreen() {
  const online = useOnlineStatus();
  const offlineNoticeId = useId();

  return (
    <section aria-labelledby="practice-heading" className="home-section">
      <HomeLink />
      <h1 id="practice-heading" className="home-section__heading">
        Practice
      </h1>
      {/* The live region stays mounted so the notice is announced when the connection drops while
          this screen is showing, not only when the screen opens offline. That's why this isn't a
          HistorySaveNotice, which is itself the role="status" element and mounts with its text. */}
      <div role="status">
        {!online && (
          <p id={offlineNoticeId} className="offline-notice">
            You're offline — Practice needs a connection. Lessons work offline.
          </p>
        )}
      </div>
      <ul className="scenario-list">
        {scenarioCategories.map((category) => (
          <li key={category.id}>
            <CategoryCard category={category} online={online} offlineNoticeId={offlineNoticeId} />
          </li>
        ))}
      </ul>
    </section>
  );
}
