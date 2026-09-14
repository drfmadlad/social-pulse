import type { ChoiceOption } from "./lessons";

/** Fisher-Yates, so every ordering of the options is equally likely. */
export function shuffleOptions(options: ChoiceOption[]): ChoiceOption[] {
  const shuffled = [...options];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
