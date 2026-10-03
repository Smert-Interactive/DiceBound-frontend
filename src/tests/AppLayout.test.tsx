import { render, screen, fireEvent } from "@testing-library/react";
import { describe, test, expect, vi } from "vitest";

import { MemoryRouter } from "react-router-dom";

import AppLayout from "../layouts/AppLayout";


type SidebarProps = {
  mobile?: boolean;
  onClose?: () => void;
};

//Мокаем AppSidebar.
vi.mock("../components/AppSidebar", () => ({
  default: ({ mobile, onClose }: SidebarProps) => (
    <div>
      {mobile && (
        // Кнопка закрытия мобильного меню. При клике вызывает переданную функцию onClose.
        <button onClick={onClose}>close</button>
      )}
      Sidebar
    </div>
  ),
}));


type HeaderProps = {
  onMenuClick?: () => void;
};

//Мокаем AppHeader.
vi.mock("../components/AppHeader", () => ({
  default: ({ onMenuClick }: HeaderProps) => (
    <button onClick={onMenuClick}>menu</button>
  ),
}));

describe("AppLayout", () => {
  //Проверяет открытие мобильного Sidebar.
  test("opens mobile sidebar", () => {
    render(
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>,
    );

    // Имитируем клик пользователя по кнопке меню.
    fireEvent.click(screen.getByText("menu"));

    // Проверяем, что после клика появилась кнопка закрытия Sidebar.
    expect(screen.getByText("close")).toBeInTheDocument();
  });

  //Проверяет закрытие мобильного Sidebar.
  test("closes sidebar from button", () => {
    render(
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>,
    );

    // Открываем мобильный Sidebar.
    fireEvent.click(screen.getByText("menu"));

    // Нажимаем кнопку закрытия Sidebar.
    fireEvent.click(screen.getByText("close"));

    // Проверяем, что Sidebar больше не отображается.
    expect(screen.queryByText("close")).not.toBeInTheDocument();
  });
});
