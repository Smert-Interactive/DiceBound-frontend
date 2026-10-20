import type { To } from "react-router-dom";

import { ROUTES } from "../constants/routes";

// state.from приходит от ProtectedRoute или окна истёкшей сессии.
// Принимаем только внутренний адрес, чтобы вход не уводил на сторонний сайт или снова на /login.
export function getLoginRedirect(state: unknown): To {
  // state имеет тип unknown: проверяем структуру перед чтением полей.
  if (!state || typeof state !== "object" || !("from" in state)) {
    return ROUTES.characters;
  }
  const from = state.from;
  if (!from || typeof from !== "object" || !("pathname" in from)) {
    return ROUTES.characters;
  }
  // Двойной слеш и обратный слеш могут менять смысл адреса; /login создал бы цикл переходов.
  const pathname = from.pathname;
  if (
    typeof pathname !== "string" ||
    !pathname.startsWith("/") ||
    pathname.startsWith("//") ||
    pathname.includes("\\") ||
    pathname.replace(/\/+$/u, "") === ROUTES.login
  ) {
    return ROUTES.characters;
  }
  // Возвращаем также параметры (?...) и якорь (#...), чтобы восстановить полный адрес.
  return {
    pathname,
    search:
      "search" in from && typeof from.search === "string" ? from.search : "",
    hash: "hash" in from && typeof from.hash === "string" ? from.hash : "",
  };
}
