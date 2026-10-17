import { createContext, useContext } from "react";

export interface User {
  email: string;
}

export interface AuthState {
  // null — пользователь не вошёл.
  user: User | null;
}

// Пока нет API, «вошедшим» считается этот пользователь. Потом его заменит ответ сервера.
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
