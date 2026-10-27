export type SystemKind = "dnd" | "coc" | "imported";

// Тон чипа и метки системы: D&D красная, CoC зелёная, импортированные фиолетовые.
export const SYSTEM_TONES = {
  dnd: "crimson",
  coc: "ok",
  imported: "violet",
} as const satisfies Record<SystemKind, string>;

// TODO: цвет метки зависит от системы, а в данных от API его нет: source даёт только
// BUILT_IN или IMPORTED. Пока определяем вид по началу названия: backend отдаёт
// «Call of Cthulhu (simplified)», поэтому точное совпадение не подходит.
// Надёжнее стабильный идентификатор системы в контракте.
export function getSystemKind(systemName: string): SystemKind {
  if (systemName.startsWith("D&D")) return "dnd";
  if (systemName.startsWith("Call of Cthulhu")) return "coc";
  return "imported";
}
