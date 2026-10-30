import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, test, vi } from "vitest";

import AuthProvider from "../auth/AuthProvider";
import AppHeader from "../components/AppHeader";

vi.mock("../components/AppBreadcrumbs", () => ({
  default: () => <div>Breadcrumbs</div>,
}));

describe("AppHeader", () => {
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
