import { render, screen, fireEvent } from "@testing-library/react";
import { describe, test, expect, vi } from "vitest";

import AppSidebar from "../components/AppSidebar";

describe("AppSidebar", () => {
    //Проверяет, что боковая панель правильно отображает основные пункты навигации.
  test("renders navigation items", () => {
    // Отображаем компонент Sidebar.
    render(<AppSidebar />);

    // Проверяем наличие пункта меню "Персонажи".
    expect(screen.getByText("Персонажи")).toBeInTheDocument();

    // Проверяем наличие пункта меню "Импорт системы".
    expect(screen.getByText("Импорт системы")).toBeInTheDocument();

    // Проверяем наличие пункта меню "Профиль".
    expect(screen.getByText("Профиль")).toBeInTheDocument();
  });

  // Проверяет, что в мобильном режиме Sidebar показывает кнопку закрытия.
  test("shows close button on mobile", () => {
    render(<AppSidebar mobile />);

    // Проверяем, что кнопка закрытия существует.
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  //Проверяет, что при нажатии на кнопку закрытия вызывается callback onClose.

  test("calls onClose when close button clicked", () => {
    const onClose = vi.fn();

    // Рендерим мобильный Sidebar с переданным обработчиком закрытия.
    render(<AppSidebar mobile onClose={onClose} />);

    // Имитируем клик пользователя по кнопке закрытия.
    fireEvent.click(screen.getByRole("button"));

    // Проверяем, что обработчик был вызван один раз.
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
