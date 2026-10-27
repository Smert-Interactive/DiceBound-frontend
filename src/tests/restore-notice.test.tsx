import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  createMemoryRouter,
  generatePath,
  RouterProvider,
} from "react-router-dom";

import { routes } from "../app/router";
import AuthProvider from "../auth/AuthProvider";
import { MOCK_USER } from "../auth/authContext";
import { ROUTES } from "../constants/routes";
import { MOCK_CHARACTERS } from "../mocks/characters";

// История хранится в памяти модуля, а файл тестов получает свою копию модулей:
// восстановление здесь не влияет на другие файлы. Сценарии берут разных персонажей
// (Aldric, 7 версий; Sarah, 4 версии), чтобы не зависеть от порядка.
const aldricId = MOCK_CHARACTERS.owned[0].id;
const sarahId = MOCK_CHARACTERS.owned[1].id;

beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.setAttribute("open", "");
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.removeAttribute("open");
    },
  });
});
afterEach(() => {
  cleanup();
  Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
  Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
});

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <AuthProvider initialUser={MOCK_USER}>
      <RouterProvider router={router} />
    </AuthProvider>,
  );
  return { router, user: userEvent.setup() };
}

describe("restore notice", () => {
  test("restoring from the history tab opens the sheet tab with the notice once", async () => {
    const { router, user } = renderAt(
      generatePath(ROUTES.character, { id: sarahId }),
    );
    await user.click(screen.getByRole("tab", { name: "История" }));
    await user.click(
      screen.getByRole("button", { name: "Восстановить версию 2" }),
    );
    await user.click(
      screen.getByRole("button", { name: /Восстановить и удалить/u }),
    );

    expect(
      await screen.findByText(
        "Восстановлена версия 2. Удалено версий: 2",
        {},
        { timeout: 3000 },
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Лист" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    // Состояние очищено, поэтому возврат по истории браузера не покажет баннер повторно.
    await waitFor(() => expect(router.state.location.state).toBeNull());
  });

  test("restoring from the version page opens the sheet tab with the notice", async () => {
    const { router, user } = renderAt(
      generatePath(ROUTES.characterVersion, { id: aldricId, version: "6" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Восстановить эту версию" }),
    );
    await user.click(
      screen.getByRole("button", { name: /Восстановить и удалить/u }),
    );

    expect(
      await screen.findByText(
        "Восстановлена версия 6. Удалено версий: 1",
        {},
        { timeout: 3000 },
      ),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(
      generatePath(ROUTES.character, { id: aldricId }),
    );
    expect(screen.getByRole("tab", { name: "Лист" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});
