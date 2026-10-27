import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, test, expect, vi } from "vitest";

import { MemoryRouter } from "react-router-dom";

import AppLayout from "../layouts/AppLayout";

type SidebarProps = {
  mobile?: boolean;
  onClose?: () => void;
};

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

vi.mock("../components/AppHeader", () => ({
  default: ({ onMenuClick }: HeaderProps) => (
    <button onClick={onMenuClick}>menu</button>
  ),
}));

describe("AppLayout", () => {
  test("opens mobile sidebar", () => {
    render(
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText("menu"));

    expect(screen.getByText("close")).toBeInTheDocument();
  });

  test("closes sidebar from button", async () => {
    render(
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText("menu"));

    fireEvent.click(screen.getByText("close"));

    // Sidebar убирается после анимации выхода, поэтому ждём.
    await waitFor(() =>
      expect(screen.queryByText("close")).not.toBeInTheDocument(),
    );
  });

  test("closes sidebar on Escape", async () => {
    render(
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText("menu"));

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
