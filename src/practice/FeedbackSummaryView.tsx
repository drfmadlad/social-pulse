import { useId } from "react";
import type { FeedbackPoint, FeedbackSummary } from "./feedbackSummary";

function FeedbackPointList({ points }: { points: FeedbackPoint[] }) {
  return (
    <ul>
      {points.map((point, index) => (
        <li key={index}>
          <blockquote>&ldquo;{point.quote}&rdquo;</blockquote>
          {point.explanation && <p>{point.explanation}</p>}
        </li>
      ))}
    </ul>
  );
}

export function FeedbackSummaryView({ summary }: { summary: FeedbackSummary }) {
  const didWellId = useId();
  const canImproveId = useId();

  return (
    <>
      <section aria-labelledby={didWellId}>
        <h4 id={didWellId}>What you did well</h4>
        <FeedbackPointList points={summary.didWell} />
      </section>
      <section aria-labelledby={canImproveId}>
        <h4 id={canImproveId}>What you can do better</h4>
        <FeedbackPointList points={summary.canImprove} />
      </section>
    </>
  );
}
