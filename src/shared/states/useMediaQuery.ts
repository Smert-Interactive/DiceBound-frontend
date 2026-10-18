import { useSyncExternalStore } from "react";

// Следит за media query и перерисовывает компонент, когда она начинает или перестаёт выполняться.
// Где matchMedia нет (например, в тестах jsdom), считается, что условие не выполняется.
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      const list = window.matchMedia?.(query);
      list?.addEventListener("change", notify);
      return () => list?.removeEventListener("change", notify);
    },
    () => window.matchMedia?.(query).matches ?? false,
    () => false,
  );
}
