import { render, screen, fireEvent } from "@testing-library/react";
import { describe, test, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import AppSidebar from "../components/AppSidebar";

// NavLink работает только внутри Router, поэтому оборачиваем Sidebar в MemoryRouter.
function renderSidebar(
  ui: React.ReactElement,
  initialEntries: string[] = ["/"],
) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>,
  );
}

describe("AppSidebar", () => {
    //Проверяет, что боковая панель правильно отображает основные пункты навигации.
  test("renders navigation items", () => {
    // Отображаем компонент Sidebar.
    renderSidebar(<AppSidebar />);

    // Проверяем наличие пункта меню "Персонажи".
    expect(screen.getByText("Персонажи")).toBeInTheDocument();

    // Проверяем наличие пункта меню "Импорт системы".
    expect(screen.getByText("Импорт системы")).toBeInTheDocument();

    // Проверяем наличие пункта меню "Профиль".
    expect(screen.getByText("Профиль")).toBeInTheDocument();
  });

  // Проверяет, что в мобильном режиме Sidebar показывает кнопку закрытия.
  test("shows close button on mobile", () => {
    renderSidebar(<AppSidebar mobile />);

    // Проверяем, что кнопка закрытия существует и имеет доступное имя.
    expect(
      screen.getByRole("button", { name: "Закрыть меню" }),
    ).toBeInTheDocument();
  });

  // Проверяет, что при открытии мобильного меню фокус переходит на кнопку закрытия.
  test("focuses close button on mobile", () => {
    renderSidebar(<AppSidebar mobile />);

    expect(screen.getByRole("button", { name: "Закрыть меню" })).toHaveFocus();
  });

  // Проверяет, что мобильное меню является модальным диалогом.
  test("renders mobile sidebar as dialog", () => {
    renderSidebar(<AppSidebar mobile />);

    expect(screen.getByRole("dialog", { name: "Меню" })).toBeInTheDocument();
  });

  // Проверяет, что пункты меню — ссылки, а текущий раздел помечен aria-current.
  test("marks current page link", () => {
    renderSidebar(<AppSidebar />, ["/characters/new"]);

    expect(screen.getByRole("link", { name: "Персонажи" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByRole("link", { name: "Профиль" }),
    ).not.toHaveAttribute("aria-current");
  });

  //Проверяет, что при нажатии на кнопку закрытия вызывается callback onClose.

  test("calls onClose when close button clicked", () => {
    const onClose = vi.fn();

    // Рендерим мобильный Sidebar с переданным обработчиком закрытия.
    renderSidebar(<AppSidebar mobile onClose={onClose} />);

    // Имитируем клик пользователя по кнопке закрытия.
    fireEvent.click(screen.getByRole("button", { name: "Закрыть меню" }));

    // Проверяем, что обработчик был вызван один раз.
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
