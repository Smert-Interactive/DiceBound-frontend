import { render, screen } from "@testing-library/react";
import { describe, test, expect } from "vitest";
import { MemoryRouter } from "react-router-dom";
import AppBreadcrumbs from "../components/AppBreadcrumbs";
import { getBreadcrumbs } from "../components/breadcrumbs";

function renderAt(path: string, characterName?: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppBreadcrumbs characterName={characterName} />
    </MemoryRouter>,
  );
}

describe("getBreadcrumbs", () => {
  // Образец из дизайна: Персонажи / Aldric / История / Версия 4.
  test("builds crumbs for a character version", () => {
    const crumbs = getBreadcrumbs("/characters/42/versions/4", "Aldric");

    expect(crumbs.map((crumb) => crumb.label)).toEqual([
      "Персонажи",
      "Aldric",
      "История",
      "Версия 4",
    ]);
  });

  // Пока имени персонажа нет, вместо него показывается id.
  test("falls back to id when character name is unknown", () => {
    const crumbs = getBreadcrumbs("/characters/42");

    expect(crumbs.map((crumb) => crumb.label)).toEqual(["Персонажи", "42"]);
  });

  // «new» — это не id персонажа, а страница создания.
  test("does not treat /characters/new as a character", () => {
    const crumbs = getBreadcrumbs("/characters/new", "Aldric");

    expect(crumbs.map((crumb) => crumb.label)).toEqual([
      "Персонажи",
      "Новый персонаж",
    ]);
  });

  // У «Истории» нет собственного адреса, поэтому нет и ссылки.
  test("history crumb has no link", () => {
    const history = getBreadcrumbs("/characters/42/versions/4")[2];

    expect(history.to).toBeUndefined();
  });

  // Адреса крошек накапливаются и поэтому уникальны.
  test("accumulates paths", () => {
    const crumbs = getBreadcrumbs("/characters/42/versions/4");

    expect(crumbs.map((crumb) => crumb.path)).toEqual([
      "/characters",
      "/characters/42",
      "/characters/42/versions",
      "/characters/42/versions/4",
    ]);
  });
});

describe("AppBreadcrumbs", () => {
  // Проверяет, что компонент правильно отображает переведённые названия маршрутов из URL.
  test("renders translated route labels", () => {
    renderAt("/characters/new");

    // Проверяем, что первый элемент хлебных крошек отображается с русским названием "Персонажи".
    expect(screen.getByText("Персонажи")).toBeInTheDocument();

    // Проверяем, что второй элемент хлебных крошек содержит название текущего маршрута "Новый персонаж".
    expect(screen.getByText("Новый персонаж")).toBeInTheDocument();
  });

  // Проверяет поведение компонента для неизвестного маршрута.
  test("renders unknown paths as they are", () => {
    renderAt("/unknown");

    // Проверяем, что неизвестный путь отображается без изменений.
    expect(screen.getByText("unknown")).toBeInTheDocument();
  });

  // Разметка должна быть навигацией со списком, чтобы скринридер её понимал.
  test("renders a labelled navigation list", () => {
    renderAt("/characters/42/versions/4", "Aldric");

    const nav = screen.getByRole("navigation", { name: "Хлебные крошки" });

    expect(nav).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
  });

  // Промежуточные крошки — ссылки, последняя — обычный текст с aria-current.
  test("links previous crumbs and marks the current page", () => {
    renderAt("/characters/42/versions/4", "Aldric");

    expect(screen.getByRole("link", { name: "Персонажи" })).toHaveAttribute(
      "href",
      "/characters",
    );
    expect(screen.getByRole("link", { name: "Aldric" })).toHaveAttribute(
      "href",
      "/characters/42",
    );

    // «История» — обычный текст, «Версия 4» — текущая страница.
    expect(
      screen.queryByRole("link", { name: "История" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Версия 4")).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.queryByRole("link", { name: "Версия 4" }),
    ).not.toBeInTheDocument();
  });
});
