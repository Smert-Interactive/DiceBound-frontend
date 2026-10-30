import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { AuthContext } from "./authContext";
import type { User } from "./authContext";
import * as authApi from "../api/auth";
import { ApiError } from "../api/client";
import type { LoginCredentials, RegisterCredentials } from "../api/types";
import { LoadErrorState, LoadingSkeleton } from "../shared/states";

interface Props {
  // Явная сессия нужна тестам; приложение при запуске всегда проверяет /me.
  initialUser?: User | null;
  children: ReactNode;
}

// Восстанавливает серверную сессию до маршрутизации и управляет запросами авторизации.
export default function AuthProvider({ initialUser, children }: Props) {
  const [user, setUser] = useState<User | null>(initialUser ?? null);
  const [pending, setPending] = useState(false);
  const [sessionState, setSessionState] = useState<
    "loading" | "ready" | "error"
  >(initialUser === undefined ? "loading" : "ready");
  const [attempt, setAttempt] = useState(0);
  const pendingRef = useRef(false);
  const actionRef = useRef<AbortController | null>(null);
  const sessionRevision = useRef(0);

  // Сбрасывает истёкшую сессию: ProtectedRoute сохраняет исходный адрес для повторного входа.
  const handleUnauthorized = useCallback((error: unknown) => {
    if (!(error instanceof ApiError) || error.status !== 401) return false;
    sessionRevision.current += 1;
    setUser(null);
    return true;
  }, []);

  // Обновляет профиль по /me; старый ответ не восстанавливает сессию после входа или выхода.
  const refreshUser = useCallback(async (signal: AbortSignal) => {
    const revision = sessionRevision.current;
    try {
      const profile = await authApi.getCurrentUser(signal);
      if (!signal.aborted && revision === sessionRevision.current)
        setUser(profile);
    } catch (error) {
      if (
        !signal.aborted &&
        revision === sessionRevision.current &&
        error instanceof ApiError &&
        error.status === 401
      )
        setUser(null);
      throw error;
    }
  }, []);

  useEffect(() => {
    if (initialUser !== undefined) return;
    const controller = new AbortController();
    authApi.getCurrentUser(controller.signal).then(
      (profile) => {
        if (controller.signal.aborted) return;
        setUser(profile);
        setSessionState("ready");
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof ApiError && error.status === 401) {
          setUser(null);
          setSessionState("ready");
        } else {
          setSessionState("error");
        }
      },
    );
    return () => controller.abort();
  }, [initialUser, attempt]);

  useEffect(() => () => actionRef.current?.abort(), []);

  // Блокирует повторную отправку и игнорирует завершение после размонтирования.
  async function authenticate(
    request: (signal: AbortSignal) => Promise<User | null>,
    onSuccess?: () => void,
  ) {
    if (pendingRef.current) return;
    sessionRevision.current += 1;
    pendingRef.current = true;
    setPending(true);
    const controller = new AbortController();
    actionRef.current = controller;
    try {
      const profile = await request(controller.signal);
      if (!controller.signal.aborted)
        startTransition(() => {
          setUser(profile);
          onSuccess?.();
        });
    } finally {
      pendingRef.current = false;
      if (!controller.signal.aborted) setPending(false);
    }
  }

  // Создаёт серверную сессию и загружает полный профиль.
  function signIn(credentials: LoginCredentials) {
    return authenticate((signal) => authApi.signIn(credentials, signal));
  }

  // Регистрирует аккаунт и входит по контрактной последовательности запросов.
  function register(credentials: RegisterCredentials) {
    return authenticate((signal) => authApi.register(credentials, signal));
  }

  // Сохраняет профиль при сетевом сбое; 401 означает уже завершённую сессию.
  function signOut(onSignedOut?: () => void) {
    return authenticate(async (signal) => {
      try {
        await authApi.signOut(signal);
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) throw error;
      }
      return null;
    }, onSignedOut);
  }

  if (sessionState === "loading")
    return <LoadingSkeleton variant="list" label="Проверка сессии" />;
  if (sessionState === "error")
    return (
      <LoadErrorState
        onRetry={() => {
          setSessionState("loading");
          setAttempt((value) => value + 1);
        }}
      />
    );
  return (
    <AuthContext.Provider
      value={{
        user,
        pending,
        signIn,
        register,
        signOut,
        refreshUser,
        handleUnauthorized,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
