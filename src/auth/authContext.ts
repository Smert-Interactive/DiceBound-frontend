import { createContext, useContext } from "react";

import type { LoginCredentials, RegisterCredentials } from "./mockAuth";

export interface User {
  email: string;
}

export interface AuthState {
  // null — пользователь не вошёл.
  user: User | null;
  // Общий флаг запроса: обе формы и вкладки получают одно и то же состояние загрузки.
  pending: boolean;
  // Асинхронные методы создают сессию при успехе; отказ перехватывается в форме.
  signIn: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  signOut: () => void;
}

// Демонстрационный пользователь для начальной сессии в тестах каркаса.
export const MOCK_USER: User = { email: "alex@example.com" };

// null вместо значения по умолчанию: так хук поймёт, что провайдера нет.
export const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const state = useContext(AuthContext);

  if (!state) {
    throw new Error("useAuth нужно вызывать внутри AuthProvider");
  }

  return state;
}
