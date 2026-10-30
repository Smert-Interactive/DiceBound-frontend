import { ApiError } from "../api/client";

// Различает устаревшую историю, отсутствие доступа и временный сбой запроса.
export function getRestoreError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 409)
      return "Эта версия уже текущая. Обновите данные персонажа.";
    if (error.status === 404)
      return "Персонаж или версия больше недоступны. Обновите данные персонажа.";
    if (error.status === 403)
      return "Сервер запретил восстановление. Проверьте доступ и попробуйте ещё раз.";
  }
  return "Не удалось выполнить действие. Попробуйте ещё раз.";
}
