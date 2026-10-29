import { render, screen, fireEvent } from "@testing-library/react";
import { describe, test, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import AppSidebar from "../components/AppSidebar";
import AuthProvider from "../auth/AuthProvider";
import { MOCK_USER } from "../mocks/authUser";

// Link работает только внутри Router, поэтому оборачиваем Sidebar в MemoryRouter.
// AuthProvider нужен мобильному меню: внизу оно показывает почту аккаунта.
function renderSidebar(
  ui: React.ReactElement,
  initialEntries: string[] = ["/"],
) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider initialUser={{ ...MOCK_USER, email: "bob@example.com" }}>
        {ui}
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("AppSidebar", () => {
  test("focuses close button on mobile", () => {
    renderSidebar(<AppSidebar mobile />);

    expect(screen.getByRole("button", { name: "Закрыть меню" })).toHaveFocus();
  });

  // Мобильное меню удерживает фокус: Tab с последнего пункта ведёт на первый, Shift+Tab с первого на последний.
  test("keeps focus inside the mobile menu", () => {
    renderSidebar(<AppSidebar mobile />);

    const first = screen.getByRole("link", { name: "DiceBound" });
    const last = screen.getByRole("link", { name: "Профиль" });

    last.focus();
    fireEvent.keyDown(last, { key: "Tab" });
    expect(first).toHaveFocus();

    fireEvent.keyDown(first, { key: "Tab", shiftKey: true });
    expect(last).toHaveFocus();
  });

  test("marks current page link", () => {
    renderSidebar(<AppSidebar />, ["/characters/new"]);

    expect(screen.getByRole("link", { name: "Персонажи" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Профиль" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  // По холсту на странице /systems в меню активен «Импорт системы».
  test("marks import link as current on /systems", () => {
    renderSidebar(<AppSidebar />, ["/systems"]);

    expect(
      screen.getByRole("link", { name: "Импорт системы" }),
    ).toHaveAttribute("aria-current", "page");
  });

  // Переход по пункту мобильного меню закрывает меню.
  test("closes mobile menu after navigating", () => {
    const onClose = vi.fn();

    renderSidebar(<AppSidebar mobile onClose={onClose} />);

    fireEvent.click(screen.getByRole("link", { name: "Профиль" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // Внизу мобильного меню показана почта аккаунта, на desktop её в панели нет.
  test("shows the account email only in the mobile menu", () => {
    const { unmount } = renderSidebar(<AppSidebar mobile />);
    expect(screen.getByText("bob@example.com")).toBeInTheDocument();
    unmount();

    renderSidebar(<AppSidebar />);
    expect(screen.queryByText("bob@example.com")).not.toBeInTheDocument();
  });
});
