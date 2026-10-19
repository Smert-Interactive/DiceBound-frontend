import { useCallback, useSyncExternalStore } from "react";

// Следит за media query и перерисовывает компонент, когда она начинает или перестаёт выполняться.
// Где matchMedia нет (например, в тестах jsdom), считается, что условие не выполняется.
export function useMediaQuery(query: string): boolean {
  // Ссылка на функцию подписки должна быть стабильной: если она меняется на каждом рендере,
  // React отписывается и подписывается заново. useCallback пересоздаёт её только при смене query.
  const subscribe = useCallback(
    (notify: () => void) => {
      const list = window.matchMedia?.(query);
      list?.addEventListener("change", notify);
      return () => list?.removeEventListener("change", notify);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia?.(query).matches ?? false,
    () => false,
  );
}
