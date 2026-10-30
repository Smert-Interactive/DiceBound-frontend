import { ApiError } from "../api/client";

// Не выдаёт сетевые ошибки и ограничения сервера за неверный пароль.
export function authErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 429)
      return "Слишком много попыток. Подождите немного и попробуйте снова.";
    if (error.status === 403)
      return "Сервер отклонил запрос. Попробуйте позже или обратитесь к администратору.";
    if (error.status === 400)
      return "Проверьте введённые данные и попробуйте ещё раз.";
  }
  return "Не удалось связаться с сервером. Попробуйте ещё раз.";
}
