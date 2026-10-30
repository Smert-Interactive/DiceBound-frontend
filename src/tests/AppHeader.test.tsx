import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, test, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { ROUTES } from "../constants/routes";

import AuthProvider from "../auth/AuthProvider";
import AppHeader from "../components/AppHeader";

vi.mock("../components/AppBreadcrumbs", () => ({
  default: () => <div>Breadcrumbs</div>,
}));

describe("AppHeader", () => {
  test("opens the menu from the import page instead of linking to systems", async () => {
    const openMenu = vi.fn();
    render(
      <MemoryRouter initialEntries={[ROUTES.importSystem]}>
        <AuthProvider initialUser={null}>
          <AppHeader onMenuClick={openMenu} />
        </AuthProvider>
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Открыть меню" }));
    expect(openMenu).toHaveBeenCalledOnce();
    expect(screen.getByRole("img", { name: "DiceBound" })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "К игровым системам" }),
    ).not.toBeInTheDocument();
  });

  // Без почты подпись ссылки остаётся осмысленной, а не «Профиль: undefined».
  test("names the profile link without an email", () => {
    render(
      <MemoryRouter>
        <AuthProvider initialUser={null}>
          <AppHeader />
        </AuthProvider>
      </MemoryRouter>,
    );

    const links = screen.getAllByRole("link", { name: "Профиль" });

    expect(links).toHaveLength(2);
    links.forEach((link) => expect(link).toHaveAttribute("href", "/profile"));
  });
});
