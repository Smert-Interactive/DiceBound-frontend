import { createContext, useContext } from "react";

import type { LoginCredentials, RegisterCredentials } from "../api/types";

export type { CurrentUser as User } from "../api/types";
import type { CurrentUser as User } from "../api/types";

export interface AuthState {
  // null — пользователь не вошёл.
  user: User | null;
  // Общий флаг запроса: обе формы и вкладки получают одно и то же состояние загрузки.
  pending: boolean;
  // Асинхронные методы создают сессию при успехе; отказ перехватывается в форме.
  signIn: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  signOut: (onSignedOut?: () => void) => Promise<void>;
}

// null вместо значения по умолчанию: так хук поймёт, что провайдера нет.
export const AuthContext = createContext<AuthState | null>(null);

// Возвращает сессию и действия только внутри провайдера авторизации.
export function useAuth(): AuthState {
  const state = useContext(AuthContext);

  if (!state) {
    throw new Error("useAuth нужно вызывать внутри AuthProvider");
  }

  return state;
}
