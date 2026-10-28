import type { SaveBarStatus } from "../shared/states/saveBarModel";

// Что случилось с последним запросом сохранения. Любая правка листа возвращает idle.
export type SavePhase = "idle" | "saving" | "saved" | "error";

type ErrorsById = Readonly<Record<string, string>>;

// Лист нельзя сохранить, пока есть ошибка в поле или сбой формулы calculated: backend отвечает
// на оба случая 422 (деление на ноль, цикл, неразбираемая формула), версия бы не создалась.
export function hasSaveBlockers(
  fieldErrors: ErrorsById,
  calculationErrors: ErrorsById,
): boolean {
  return (
    Object.keys(fieldErrors).length > 0 ||
    Object.keys(calculationErrors).length > 0
  );
}

interface Input {
  // Сколько полей изменено относительно сохранённой версии.
  changedCount: number;
  hasErrors: boolean;
  phase: SavePhase;
}

// Статус панели сохранения (ui-ux, «Состояния панели сохранения»). Порядок проверок важен:
// запрос главнее всего, «Сохранено» держится, пока нет новых изменений.
export function getSaveStatus({
  changedCount,
  hasErrors,
  phase,
}: Input): SaveBarStatus {
  if (phase === "saving") return "saving";
  if (phase === "error") return "error";
  if (changedCount === 0) return phase === "saved" ? "saved" : "clean";
  return hasErrors ? "invalid" : "dirty";
}
