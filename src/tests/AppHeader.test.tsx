import { render, screen } from "@testing-library/react";
import { describe, test, expect, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import userEvent from "@testing-library/user-event";

import AppHeader from "../components/AppHeader";
import AuthProvider from "../auth/AuthProvider";
import { MOCK_USER } from "../auth/authContext";

vi.mock("../components/AppBreadcrumbs", () => ({
  default: () => <div>Breadcrumbs</div>,
}));

describe("AppHeader", () => {
  // Email в шапке берётся из вошедшего пользователя, а не прописан в коде.
  test("shows the email of the signed-in user", () => {
    render(
      <MemoryRouter>
        <AuthProvider initialUser={{ ...MOCK_USER, email: "bob@example.com" }}>
          <AppHeader />
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText("bob@example.com")).toBeInTheDocument();
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

// На вложенной странице импорта доступ к списку систем остаётся через мобильную стрелку.
test("returns from system import to the systems list using the mobile back link", async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={["/systems/import"]}>
      <AuthProvider initialUser={MOCK_USER}>
        <Routes>
          <Route path="/systems/import" element={<AppHeader />} />
          <Route path="/systems" element={<h1>Игровые системы</h1>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
  expect(screen.getByText("Импорт системы")).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Открыть меню" }),
  ).not.toBeInTheDocument();
  await user.click(screen.getByRole("link", { name: "К игровым системам" }));
  expect(
    screen.getByRole("heading", { name: "Игровые системы" }),
  ).toBeInTheDocument();
});
