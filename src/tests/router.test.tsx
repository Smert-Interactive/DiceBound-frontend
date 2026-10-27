import { render, screen } from "@testing-library/react";
import { describe, test, expect } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";

import { routes } from "../app/router";
import AuthProvider from "../auth/AuthProvider";
import type { User } from "../auth/authContext";

// Рисует приложение с настоящими маршрутами, но с «фальшивым» адресом вместо адресной строки.
// По умолчанию пользователь вошёл (mock), user: null — не вошёл.
function renderAt(path: string, user?: User | null) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });

  render(
    <AuthProvider initialUser={user}>
      <RouterProvider router={router} />
    </AuthProvider>,
  );

  return router;
}

describe("routes", () => {
  // Корень сайта должен перенаправлять на список персонажей, а не показывать 404.
  test("redirects / to /characters", () => {
    renderAt("/");

    expect(
      screen.getByRole("heading", { name: "Персонажи" }),
    ).toBeInTheDocument();
  });

  // Без входа защищённая страница недоступна: человека отправляет на /login.
  test("redirects to /login when not signed in", () => {
    renderAt("/characters", null);

    expect(
      screen.getByRole("heading", { name: "Листы персонажей для любой НРИ" }),
    ).toBeInTheDocument();
  });

  // Адрес, куда шёл человек, сохраняется, чтобы вернуть его туда после входа.
  test("remembers the requested page when redirecting to /login", () => {
    const router = renderAt("/characters/new", null);

    expect(router.state.location.pathname).toBe("/login");
    expect(router.state.location.state.from.pathname).toBe("/characters/new");
  });

  // Неизвестный адрес показывает экран «не найден или доступ закрыт» со ссылкой на список.
  test("renders the not found screen for unknown path", () => {
    renderAt("/nope");

    expect(
      screen.getByRole("heading", {
        name: "Персонаж не найден или доступ закрыт",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "К списку персонажей" }),
    ).toHaveAttribute("href", "/characters");
  });
});
