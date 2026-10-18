import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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
  test("closes sidebar from button", async () => {
    render(
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>,
    );

    // Открываем мобильный Sidebar.
    fireEvent.click(screen.getByText("menu"));

    // Нажимаем кнопку закрытия Sidebar.
    fireEvent.click(screen.getByText("close"));

    // Sidebar убирается после анимации выхода, поэтому ждём.
    await waitFor(() =>
      expect(screen.queryByText("close")).not.toBeInTheDocument(),
    );
  });

  //Проверяет закрытие мобильного Sidebar клавишей Escape.
  test("closes sidebar on Escape", async () => {
    render(
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>,
    );

    // Открываем мобильный Sidebar.
    fireEvent.click(screen.getByText("menu"));

    // Нажимаем Escape.
    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() =>
      expect(screen.queryByText("close")).not.toBeInTheDocument(),
    );
  });

  // Клик по затемнению тоже закрывает меню.
  test("closes sidebar on overlay click", async () => {
    const { container } = render(
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText("menu"));
    fireEvent.click(container.querySelector(".sidebar-overlay")!);

    await waitFor(() =>
      expect(screen.queryByText("close")).not.toBeInTheDocument(),
    );
  });

  // Меню можно открыть снова, пока оно закрывается: таймер закрытия отменяется.
  test("keeps sidebar open when reopened while closing", async () => {
    render(
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText("menu"));
    fireEvent.click(screen.getByText("close"));
    fireEvent.click(screen.getByText("menu"));

    // Ждём дольше времени анимации выхода: меню должно остаться.
    await new Promise((resolve) => setTimeout(resolve, 250));

    expect(screen.getByText("close")).toBeInTheDocument();
  });
});
