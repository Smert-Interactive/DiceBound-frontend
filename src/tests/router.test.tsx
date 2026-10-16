import { render, screen } from "@testing-library/react";
import { describe, test, expect } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";

import { routes } from "../app/router";

// Рисует приложение с настоящими маршрутами, но с «фальшивым» адресом вместо адресной строки.
function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });

  return render(<RouterProvider router={router} />);
}

describe("routes", () => {
  // Корень сайта должен перенаправлять на список персонажей, а не показывать 404.
  test("redirects / to /characters", () => {
    renderAt("/");

    expect(
      screen.getByRole("heading", { name: "Characters page" }),
    ).toBeInTheDocument();
  });

  // Страница /systems существует.
  test("renders /systems", () => {
    renderAt("/systems");

    expect(
      screen.getByRole("heading", { name: "Systems page" }),
    ).toBeInTheDocument();
  });

  // Со страницы импорта есть ссылка на список систем.
  test("links from /systems/import to /systems", () => {
    renderAt("/systems/import");

    expect(
      screen.getByRole("link", { name: "К списку систем" }),
    ).toHaveAttribute("href", "/systems");
  });

  // Неизвестный адрес по-прежнему показывает 404.
  test("renders 404 for unknown path", () => {
    renderAt("/nope");

    expect(
      screen.getByRole("heading", { name: "404 - Page not found" }),
    ).toBeInTheDocument();
  });
});
