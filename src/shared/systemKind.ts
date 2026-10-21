export type SystemKind = "dnd" | "coc" | "imported";

// TODO: цвет метки зависит от системы, а в данных от API его нет: source даёт только
// BUILT_IN или IMPORTED. Пока определяем вид по названию.
export function getSystemKind(systemName: string): SystemKind {
  if (systemName.startsWith("D&D")) return "dnd";
  if (systemName === "Call of Cthulhu") return "coc";
  return "imported";
}
