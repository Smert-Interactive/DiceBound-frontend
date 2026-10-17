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
});
