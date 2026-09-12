import { useId } from "react";
import type { FeedbackPoint, FeedbackSummary } from "./feedbackSummary";

function FeedbackPointList({ points }: { points: FeedbackPoint[] }) {
  return (
    <ul className="feedback-points__list">
      {points.map((point, index) => (
        <li key={index} className="feedback-points__item">
          <blockquote className="feedback-points__quote">&ldquo;{point.quote}&rdquo;</blockquote>
          {point.explanation && <p className="feedback-points__explanation">{point.explanation}</p>}
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
      <section className="feedback-points feedback-points--positive" aria-labelledby={didWellId}>
        <h4 id={didWellId}>What you did well</h4>
        <FeedbackPointList points={summary.didWell} />
      </section>
      <section className="feedback-points feedback-points--growth" aria-labelledby={canImproveId}>
        <h4 id={canImproveId}>What you can do better</h4>
        <FeedbackPointList points={summary.canImprove} />
      </section>
    </>
  );
}
