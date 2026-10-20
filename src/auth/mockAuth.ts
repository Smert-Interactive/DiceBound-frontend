import { MOCK_USER } from "./authContext";
import type { User } from "./authContext";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends LoginCredentials {
  passwordConfirmation: string;
}

// Только демонстрационные данные, не настоящая авторизация.
// Зарегистрированные аккаунты живут в памяти и исчезают после перезагрузки страницы.
export const MOCK_PASSWORD = "admin";
// Храним профиль вместе с паролем, чтобы повторный вход сохранял дату регистрации.
// Пароль остаётся внутри сервиса и не попадает в контекст. Данные живут только в памяти.
const accounts = new Map<string, { user: User; password: string }>([
  [MOCK_USER.email, { user: { ...MOCK_USER }, password: MOCK_PASSWORD }],
]);
const MOCK_REQUEST_DELAY = 500;

// Одинаковая нормализация при регистрации и входе; регистр и пробелы пароля не меняются.
function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

// Задержка имитирует запрос: позволяет проверить загрузку и блокировку повторной отправки.
function waitForResponse() {
  return new Promise<void>((resolve) =>
    window.setTimeout(resolve, MOCK_REQUEST_DELAY),
  );
}

export async function mockSignIn({
  email,
  password,
}: LoginCredentials): Promise<User> {
  await waitForResponse();
  const normalizedEmail = normalizeEmail(email);
  // Для неизвестной почты и неверного пароля результат одинаковый, без раскрытия аккаунтов.
  const account = accounts.get(normalizedEmail);
  if (!account || account.password !== password) {
    throw new Error("INVALID_CREDENTIALS");
  }
  return { ...account.user };
}

export async function mockRegister({
  email,
  password,
  passwordConfirmation,
}: RegisterCredentials): Promise<User> {
  await waitForResponse();
  const normalizedEmail = normalizeEmail(email);
  if (
    accounts.has(normalizedEmail) ||
    normalizedEmail.length === 0 ||
    password.length < 8 ||
    passwordConfirmation !== password
  ) {
    throw new Error("REGISTRATION_FAILED");
  }
  // Сохраняем аккаунт лишь после всех проверок. Между страницами Map остаётся в памяти.
  const user: User = {
    email: normalizedEmail,
    created_at: new Date().toISOString(),
    // Новый аккаунт получает пустой список. Позже показатели придут из /auth/me.
    owned_characters_count: 0,
    shared_characters_count: 0,
  };
  accounts.set(normalizedEmail, { user, password });
  return { ...user };
}
