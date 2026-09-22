/**
 * Unwraps a ```-fenced block, so a reply the AI was asked for as JSON still parses when it
 * helpfully formats it as Markdown anyway. Text that isn't fenced comes back trimmed.
 *
 * Shared by every caller that asks the AI for JSON: the Feedback Summary and the Written Reply
 * verdict both hit this, and each new one would hit it too.
 */
export function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  return fenced ? fenced[1] : trimmed;
}
