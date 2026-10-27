import type { RestoreResult } from "./historyTypes";

// Уведомление после восстановления: числа берутся из ответа сервиса, а не из выбранной строки.
export function formatRestoreNotice(result: RestoreResult): string {
  return `Восстановлена версия ${result.character.current_version_number}. Удалено версий: ${result.deleted_versions_count}`;
}
