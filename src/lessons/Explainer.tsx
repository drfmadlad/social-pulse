import type { ExplainerStep } from "./lessons";

export function Explainer({ step }: { step: ExplainerStep }) {
  return (
    <div className="explainer">
      <h2>{step.title}</h2>
      <div className="explainer__paragraphs">
        {step.paragraphs.map((paragraph, paragraphIndex) => (
          <p key={paragraphIndex}>
            {paragraph.map((run, runIndex) =>
              run.emphasis ? <em key={runIndex}>{run.text}</em> : <span key={runIndex}>{run.text}</span>,
            )}
          </p>
        ))}
      </div>
      {step.quote && (
        <blockquote className="explainer__quote">
          <p>&ldquo;{step.quote}&rdquo;</p>
        </blockquote>
      )}
      {step.keyLine && (
        <p className="explainer__key-line">
          <mark>{step.keyLine}</mark>
        </p>
      )}
    </div>
  );
}
