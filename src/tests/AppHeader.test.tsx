import { render, screen, fireEvent } from "@testing-library/react";
import { describe, test, expect, vi } from "vitest";

import AppHeader from "../components/AppHeader";


vi.mock("../components/AppBreadcrumbs", () => ({
  default: () => <div>Breadcrumbs</div>,
}));

describe("AppHeader", () => {
    //Проверяет, что при клике на кнопку меню (burger)вызывается переданный callback onMenuClick.
  
  test("calls menu callback", () => {
    // Создаём mock-функцию. Она позволяет проверить, была ли она вызвана и сколько раз.
    const onMenuClick = vi.fn();

    // Рендерим компонент AppHeader. Передаём ему функцию, которая должна вызваться при нажатии на кнопку меню.
    render(<AppHeader onMenuClick={onMenuClick} />);

    // Находим кнопку открытия меню по доступному имени.
    const button = screen.getByRole("button", { name: "Открыть меню" });

    // Имитируем клик пользователя по кнопке меню.
    fireEvent.click(button);

    // Проверяем, что после клика функция onMenuClick была вызвана ровно один раз.
    expect(onMenuClick).toHaveBeenCalledTimes(1);
  });

  // Проверяет, что кнопка меню сообщает скринридеру, открыто ли меню.
  test("reflects menu state in aria-expanded", () => {
    const { rerender } = render(<AppHeader menuOpen={false} />);

    const button = screen.getByRole("button", { name: "Открыть меню" });
    expect(button).toHaveAttribute("aria-expanded", "false");

    rerender(<AppHeader menuOpen />);
    expect(button).toHaveAttribute("aria-expanded", "true");
  });

  // Проверяет, что у иконки-кнопки профиля есть доступное имя.
  test("labels mobile profile button", () => {
    render(<AppHeader />);

    expect(screen.getByRole("button", { name: "Профиль" })).toBeInTheDocument();
  });
});
