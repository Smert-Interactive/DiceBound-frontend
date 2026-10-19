import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

import {
  SaveBar,
  SessionExpiredModal,
  getSaveBarModel,
} from "../shared/states";

describe("getSaveBarModel", () => {
  test("clean state locks both buttons and shows the current version", () => {
    const model = getSaveBarModel({
      status: "clean",
      changedCount: 0,
      version: 7,
    });

    expect(model.title).toBe("Все изменения сохранены · версия 7");
    expect(model.resetDisabled).toBe(true);
    expect(model.saveDisabled).toBe(true);
  });

  test("dirty state announces the next version and unlocks the buttons", () => {
    const model = getSaveBarModel({
      status: "dirty",
      changedCount: 2,
      version: 7,
    });

    expect(model.title).toBe(
      "Несохранённых изменений: 2 — сохранение создаст версию 8",
    );
    expect(model.resetDisabled).toBe(false);
    expect(model.saveDisabled).toBe(false);
  });

  test("invalid state blocks saving but still allows cancelling", () => {
    const model = getSaveBarModel({
      status: "invalid",
      changedCount: 1,
      version: 7,
    });

    expect(model.title).toBe("Несохранённых изменений: 1");
    expect(model.problem).toBe("Исправьте ошибки, чтобы сохранить");
    expect(model.saveDisabled).toBe(true);
    expect(model.resetDisabled).toBe(false);
  });

  test("saving state puts the save button in loading and locks cancel", () => {
    const model = getSaveBarModel({
      status: "saving",
      changedCount: 1,
      version: 7,
    });

    expect(model.dot).toBe("loader");
    expect(model.title).toBe("Сохранение… создаётся версия 8");
    expect(model.saveLoading).toBe(true);
    expect(model.resetDisabled).toBe(true);
  });

  test("saved state names the created version and stays locked", () => {
    const model = getSaveBarModel({
      status: "saved",
      changedCount: 0,
      version: 8,
    });

    expect(model.title).toBe("Сохранено · создана версия 8");
    expect(model.resetDisabled).toBe(true);
    expect(model.saveDisabled).toBe(true);
  });

  test("network error keeps the changes and offers only a retry", () => {
    const model = getSaveBarModel({
      status: "error",
      changedCount: 2,
      version: 7,
    });

    expect(model.title).toBe("Не удалось сохранить");
    expect(model.hint).toBe(
      "Изменения остались на листе, новая версия не создана",
    );
    expect(model.showRetry).toBe(true);
  });

  test("an EDIT copy adds «копии» to the version and renames the save button", () => {
    const saved = getSaveBarModel({
      status: "saved",
      changedCount: 0,
      version: 2,
      isCopy: true,
    });
    const dirty = getSaveBarModel({
      status: "dirty",
      changedCount: 1,
      version: 2,
      isCopy: true,
    });

    expect(saved.title).toBe(
      "Сохранено · создана версия 2 копии · оригинал не изменён",
    );
    expect(dirty.saveLabel).toBe("Сохранить копию");
  });

  test("compact layout shortens the texts and the cancel button", () => {
    const dirty = getSaveBarModel({
      status: "dirty",
      changedCount: 3,
      version: 7,
      compact: true,
    });
    const invalid = getSaveBarModel({
      status: "invalid",
      changedCount: 3,
      version: 7,
      compact: true,
    });

    expect(dirty.title).toBe("Изменений: 3 · будет версия 8");
    expect(dirty.resetLabel).toBe("Отменить");
    expect(invalid.title).toBe("Исправьте ошибки, чтобы сохранить");
    expect(invalid.problem).toBeUndefined();
  });
});

describe("SaveBar", () => {
  function renderBar(
    status: "clean" | "dirty" | "error",
    handlers = { onSave: vi.fn(), onReset: vi.fn(), onRetry: vi.fn() },
  ) {
    render(
      <SaveBar status={status} changedCount={2} version={7} {...handlers} />,
    );
    return handlers;
  }

  test("buttons are inactive while nothing has changed", async () => {
    const handlers = renderBar("clean");
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Сохранить" }));
    await user.click(
      screen.getByRole("button", { name: "Отменить изменения" }),
    );

    expect(handlers.onSave).not.toHaveBeenCalled();
    expect(handlers.onReset).not.toHaveBeenCalled();
  });

  test("changes can be saved or cancelled", async () => {
    const handlers = renderBar("dirty");
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Сохранить" }));
    await user.click(
      screen.getByRole("button", { name: "Отменить изменения" }),
    );

    expect(handlers.onSave).toHaveBeenCalledTimes(1);
    expect(handlers.onReset).toHaveBeenCalledTimes(1);
  });

  test("a network error is announced as an alert and replaces the buttons with a retry", async () => {
    const handlers = renderBar("error");
    const user = userEvent.setup();

    expect(screen.getByRole("alert")).toHaveTextContent("Не удалось сохранить");
    expect(
      screen.queryByRole("button", { name: "Сохранить" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Повторить" }));

    expect(handlers.onRetry).toHaveBeenCalledTimes(1);
  });
});

describe("SessionExpiredModal", () => {
  // В jsdom нет нативного dialog, поэтому showModal и close подменяются (как в тестах Modal).
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

  // Показывает, что пришло в state при переходе на /login.
  function LoginProbe() {
    const location = useLocation();
    const from = (location.state as { from?: { pathname: string } } | null)
      ?.from;

    return <p>Вход, вернуться на {from?.pathname}</p>;
  }

  test("sign in leads to /login and remembers the page where the session ended", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/characters/42"]}>
        <Routes>
          <Route
            path="/characters/:id"
            element={<SessionExpiredModal open />}
          />
          <Route path="/login" element={<LoginProbe />} />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("link", { name: "Войти" }));

    expect(
      screen.getByText("Вход, вернуться на /characters/42"),
    ).toBeInTheDocument();
  });
});
