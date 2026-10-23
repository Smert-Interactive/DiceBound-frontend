// Типографский минус (U+2212), а не дефис: так требует ui-ux.
const MINUS = "−";

// Модификатор со знаком: 3 → «+3», -1 → «−1», 0 → «+0».
export function formatModifier(value: number): string {
  // -0 не меньше нуля, поэтому тоже даёт «+0».
  return value < 0 ? `${MINUS}${Math.abs(value)}` : `+${value}`;
}
