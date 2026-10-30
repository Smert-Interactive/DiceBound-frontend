import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../auth/authContext";

type QueryState<T> =
  | { key: string; status: "success"; data: T }
  | { key: string; status: "error"; error: unknown };

// Отменяет чтение при смене ключа или уходе; запоздалые ответы не заменяют актуальные данные.
export function useApiQuery<T>(
  request: (signal: AbortSignal) => Promise<T>,
  key: string,
) {
  const { handleUnauthorized } = useAuth();
  const [attempt, setAttempt] = useState(0);
  const queryKey = `${key}:${attempt}`;
  const [state, setState] = useState<QueryState<T> | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    request(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted)
          setState({ key: queryKey, status: "success", data });
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        handleUnauthorized(error);
        setState({ key: queryKey, status: "error", error });
      },
    );
    return () => controller.abort();
  }, [request, queryKey, handleUnauthorized]);

  // Повтор начинает новый запрос, не меняя введённые на странице значения.
  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  // Успешная мутация обновляет только ответ своего запроса, без вмешательства в другие страницы.
  const update = useCallback(
    (transform: (data: T) => T) => {
      setState((previous) =>
        previous?.key === queryKey && previous.status === "success"
          ? { ...previous, data: transform(previous.data) }
          : previous,
      );
    },
    [queryKey],
  );
  const current = state?.key === queryKey ? state : null;
  return {
    data: current?.status === "success" ? current.data : undefined,
    error: current?.status === "error" ? current.error : null,
    loading: current === null,
    retry,
    update,
  };
}
