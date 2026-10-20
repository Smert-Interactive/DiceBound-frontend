import { useRef, useState } from "react";
import type { ReactNode } from "react";

import { AuthContext, MOCK_USER } from "./authContext";
import type { User } from "./authContext";
import { mockRegister, mockSignIn } from "./mockAuth";
import type { LoginCredentials, RegisterCredentials } from "./mockAuth";

interface Props {
  // В приложении передаётся null; тесты каркаса могут начинать с mock-пользователя.
  initialUser?: User | null;
  children: ReactNode;
}

export default function AuthProvider({
  initialUser = MOCK_USER,
  children,
}: Props) {
  // user хранит текущую mock-сессию. pending управляет загрузкой форм и блокировкой вкладок.
  const [user, setUser] = useState<User | null>(initialUser);
  const [pending, setPending] = useState(false);
  // ref меняется сразу, ещё до перерисовки кнопки: два быстрых submit не создают два запроса.
  const pendingRef = useRef(false);

  // Общая обёртка входа и регистрации: запускает запрос и создаёт сессию только при успехе.
  async function authenticate(request: () => Promise<User>) {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    try {
      // await ждёт результат. При исключении setUser не вызывается, ошибка уходит в форму.
      setUser(await request());
    } finally {
      // finally выполняется и при успехе, и при исключении: загрузка всегда завершается.
      // При отказе сессия не создаётся, но форму снова можно отправить.
      pendingRef.current = false;
      setPending(false);
    }
  }

  function signIn(credentials: LoginCredentials) {
    return authenticate(() => mockSignIn(credentials));
  }

  function register(credentials: RegisterCredentials) {
    return authenticate(() => mockRegister(credentials));
  }

  // Сейчас выход только сбрасывает локальную сессию; запроса к backend ещё нет.
  function signOut() {
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, pending, signIn, register, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
