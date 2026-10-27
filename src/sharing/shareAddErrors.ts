import type { CharacterShare } from "./sharingTypes";

interface ShareAddErrors {
  email?: string;
  form?: string;
}

const UNAVAILABLE =
  "Не удалось выдать доступ по этой почте. Проверьте адрес и попробуйте ещё раз.";

// Формат проверяет браузерный email-input; собственные сообщения совпадают с макетом.
export function validateShareEmail(value: string, typeMismatch: boolean) {
  if (!value.trim()) return "Введите почту пользователя";
  if (typeMismatch) return "Введите почту в формате name@example.com";
  return undefined;
}

// При конфликте уточняем только уже известную владельцу выдачу, без догадок об аккаунте.
export function getShareAddErrors(
  error: unknown,
  existingPermission?: CharacterShare["permission"],
): ShareAddErrors {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? error.code
      : undefined;
  if (code === "SHARE_UNAVAILABLE") return { email: UNAVAILABLE };
  if (code === "CONFLICT") {
    if (existingPermission === "VIEW") {
      return {
        email:
          "У этого пользователя уже есть доступ VIEW. Тип доступа и видимость истории не меняются: чтобы изменить их, сначала отзовите VIEW.",
      };
    }
    if (existingPermission === "EDIT") {
      return {
        email:
          "Этот пользователь уже получил копию через EDIT. Повторно выдать доступ нельзя.",
      };
    }
    return { email: UNAVAILABLE };
  }
  // Сбой сети можно повторить с теми же параметрами; сырой текст сервера не показываем.
  return { form: "Не удалось выполнить действие. Попробуйте ещё раз." };
}
