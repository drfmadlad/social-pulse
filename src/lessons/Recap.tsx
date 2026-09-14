import { useId } from "react";
import type { RecapStep } from "./lessons";

export function Recap({ step }: { step: RecapStep }) {
  const applyItId = useId();

  return (
    <div className="recap">
      <h2 className="visually-hidden">Recap</h2>
      <ul className="recap__takeaways">
        {step.takeaways.map((takeaway) => (
          <li key={takeaway}>{takeaway}</li>
        ))}
      </ul>
      <section className="apply-it" aria-labelledby={applyItId}>
        <h3 id={applyItId}>Apply it in the real world</h3>
        <p>{step.applyIt}</p>
      </section>
    </div>
  );
}
