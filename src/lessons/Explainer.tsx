import { Artwork } from "./artwork/Artwork";
import type { ExplainerArtwork, ExplainerStep } from "./lessons";

function PlacedArtwork({ artwork }: { artwork: ExplainerArtwork }) {
  const edge = artwork.placement === "bleed-edge" ? ` artwork--bleed-${artwork.edge}` : "";
  return (
    <Artwork
      composition={artwork.composition}
      className={`artwork--${artwork.placement} artwork--${artwork.scale}${edge}`}
    />
  );
}

export function Explainer({ step }: { step: ExplainerStep }) {
  const { artwork } = step;
  return (
    <div className="explainer">
      {artwork?.placement === "above-title" && <PlacedArtwork artwork={artwork} />}
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
          {artwork?.placement === "beside-key-line" && <PlacedArtwork artwork={artwork} />}
          <mark>{step.keyLine}</mark>
        </p>
      )}
      {artwork?.placement === "bleed-edge" && (
        // Clips the artwork at the screen edge, whatever the column width.
        <div className="explainer__bleed">
          <PlacedArtwork artwork={artwork} />
        </div>
      )}
    </div>
  );
}
