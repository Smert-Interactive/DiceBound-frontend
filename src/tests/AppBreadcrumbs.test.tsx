import { render, screen } from "@testing-library/react";
import { describe, test, expect } from "vitest";
import { MemoryRouter } from "react-router-dom";
import AppBreadcrumbs from "../components/AppBreadcrumbs";

describe("AppBreadcrumbs", () => {
  // Проверяет, что компонент правильно отображает переведённые названия маршрутов из URL.
  test("renders translated route labels", () => {
    render(
      <MemoryRouter initialEntries={["/characters/new"]}>
        <AppBreadcrumbs />
      </MemoryRouter>,
    );

    // Проверяем, что первый элемент хлебных крошек отображается с русским названием "Персонажи".
    expect(screen.getByText("Персонажи")).toBeInTheDocument();

    // Проверяем, что второй элемент хлебных крошек содержит название текущего маршрута "Новый персонаж".
    expect(
      screen.getByText((content) => content.includes("Новый персонаж")),
    ).toBeInTheDocument();
  });

  // Проверяет поведение компонента для неизвестного маршрута.
  test("renders unknown paths as they are", () => {
    render(
      <MemoryRouter initialEntries={["/unknown"]}>
        <AppBreadcrumbs />
      </MemoryRouter>,
    );

    // Проверяем, что неизвестный путь отображается без изменений.
    expect(screen.getByText("unknown")).toBeInTheDocument();
  });
});
