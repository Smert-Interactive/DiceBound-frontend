export type SystemKind = "dnd" | "coc" | "imported" | "builtin" | "unknown";

// Одинаковые тона используются в списках, шапке листа и его ресурсах.
export const SYSTEM_TONES = {
  dnd: "crimson",
  coc: "ok",
  imported: "violet",
  builtin: "neutral",
  unknown: "neutral",
} as const satisfies Record<SystemKind, string>;

// Постоянные ID опубликованных систем из prisma/seeds/builtin-systems.json backend.
const BUILTIN_SYSTEM_KINDS: Readonly<Record<string, "dnd" | "coc">> = {
  "10000000-0000-4000-8000-000000000001": "dnd",
  "10000000-0000-4000-8000-000000000002": "coc",
};

// В текущем MVP встроены D&D и CoC; остальные ID персонажей относятся к импортам.
// Название не используется, поэтому пользовательская система «D&D» остаётся фиолетовой.
export function getSystemKind(
  source?: "BUILT_IN" | "IMPORTED",
  systemId?: string,
): SystemKind {
  if (source === "IMPORTED") return "imported";
  const builtin = systemId && BUILTIN_SYSTEM_KINDS[systemId.toLowerCase()];
  if (builtin) return builtin;
  if (source === "BUILT_IN") return "builtin";
  if (systemId) return "imported";
  return "unknown";
}
