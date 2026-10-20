import { render, screen, fireEvent } from "@testing-library/react";
import { describe, test, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import AppHeader from "../components/AppHeader";
import AuthProvider from "../auth/AuthProvider";
import { MOCK_USER } from "../auth/authContext";

vi.mock("../components/AppBreadcrumbs", () => ({
  default: () => <div>Breadcrumbs</div>,
}));

describe("AppHeader", () => {
  //Проверяет, что при клике на кнопку меню (burger)вызывается переданный callback onMenuClick.

  test("calls menu callback", () => {
    // Создаём mock-функцию. Она позволяет проверить, была ли она вызвана и сколько раз.
    const onMenuClick = vi.fn();

    // Рендерим компонент AppHeader. Передаём ему функцию, которая должна вызваться при нажатии на кнопку меню.
    render(
      <MemoryRouter>
        <AuthProvider>
          <AppHeader onMenuClick={onMenuClick} />
        </AuthProvider>
      </MemoryRouter>,
    );

    // Находим кнопку открытия меню по доступному имени.
    const button = screen.getByRole("button", { name: "Открыть меню" });

    // Имитируем клик пользователя по кнопке меню.
    fireEvent.click(button);

    // Проверяем, что после клика функция onMenuClick была вызвана ровно один раз.
    expect(onMenuClick).toHaveBeenCalledTimes(1);
  });

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

  // Блок с email в шапке на desktop ведёт на страницу профиля.
  test("links the desktop profile block to /profile", () => {
    render(
      <MemoryRouter>
        <AuthProvider initialUser={{ ...MOCK_USER, email: "bob@example.com" }}>
          <AppHeader />
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("link", { name: "Профиль: bob@example.com" }),
    ).toHaveAttribute("href", "/profile");
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

  // Кнопка профиля на телефоне ведёт на страницу профиля.
  test("links the mobile profile button to /profile", () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <AppHeader />
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Профиль" })).toHaveAttribute(
      "href",
      "/profile",
    );
  });
});
