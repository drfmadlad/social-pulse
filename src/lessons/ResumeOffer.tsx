/** Shown in place of a step when a Lesson was left partway. The bottom row carries the two choices. */
export function ResumeOffer({ stepNumber }: { stepNumber: number }) {
  return (
    <div className="explainer">
      <h2>Pick up where you left off?</h2>
      <div className="explainer__paragraphs">
        <p>You stopped at step {stepNumber}.</p>
      </div>
    </div>
  );
}
