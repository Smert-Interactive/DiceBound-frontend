export type SystemKind = "dnd" | "coc" | "imported" | "builtin" | "unknown";

// Специальные тона остаются в UI-kit; API без кода системы использует нейтральную метку.
export const SYSTEM_TONES = {
  dnd: "crimson",
  coc: "ok",
  imported: "violet",
  builtin: "neutral",
  unknown: "neutral",
} as const satisfies Record<SystemKind, string>;

// Контракт гарантирует только source. Название пользователя не определяет тип системы.
export function getSystemKind(source?: "BUILT_IN" | "IMPORTED"): SystemKind {
  if (source === "BUILT_IN") return "builtin";
  if (source === "IMPORTED") return "imported";
  return "unknown";
}
