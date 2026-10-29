import { apiRequest } from "./client";
import type {
  CurrentUser,
  LoginCredentials,
  RegisterCredentials,
  User,
} from "./types";

// Получает полный профиль по серверной HttpOnly-cookie.
export function getCurrentUser(signal?: AbortSignal) {
  return apiRequest<CurrentUser>("/auth/me", { signal });
}

// После установки cookie получает профиль со счётчиками из /me.
export async function signIn(
  credentials: LoginCredentials,
  signal?: AbortSignal,
) {
  await apiRequest<User>("/auth/login", {
    method: "POST",
    body: credentials,
    signal,
  });
  return getCurrentUser(signal);
}

// Отделяет уже созданный аккаунт от отказа регистрации при сбое автоматического входа.
export class RegistrationSignInError extends Error {}

// Регистрация не создаёт сессию, поэтому явно выполняет вход новым аккаунтом.
export async function register(
  credentials: RegisterCredentials,
  signal?: AbortSignal,
) {
  await apiRequest<User>("/auth/register", {
    method: "POST",
    body: {
      email: credentials.email,
      password: credentials.password,
      password_confirmation: credentials.passwordConfirmation,
    },
    signal,
  });
  try {
    return await signIn(
      { email: credentials.email, password: credentials.password },
      signal,
    );
  } catch (cause) {
    if (signal?.aborted) throw cause;
    throw new RegistrationSignInError(
      "Аккаунт создан, но войти автоматически не удалось. Перейдите на вкладку «Вход» и войдите с указанным паролем.",
      { cause },
    );
  }
}

// Отзывает сессию на сервере до очистки локального профиля.
export function signOut(signal?: AbortSignal) {
  return apiRequest<void>("/auth/logout", { method: "POST", signal });
}
