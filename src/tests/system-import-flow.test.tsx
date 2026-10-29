import { afterEach, expect, test, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { routes } from "../app/router";
import AuthProvider from "../auth/AuthProvider";
import { MOCK_USER } from "../auth/authContext";
import * as imports from "../mocks/systemImport";
import * as validation from "../mocks/schemaValidation";
import { CUSTOM_SCHEMA } from "../mocks/sheetSchemas";

function renderImport() {
  const router = createMemoryRouter(routes, {
    initialEntries: ["/systems/import"],
  });
  render(
    <AuthProvider initialUser={MOCK_USER}>
      <RouterProvider router={router} />
    </AuthProvider>,
  );
  return {
    router,
    user: userEvent.setup(),
    editor: screen.getByRole("textbox", {
      name: "JSON-схема",
    }) as HTMLTextAreaElement,
  };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

test("imports a validated schema and creates a character using the preselected system", async () => {
  const save = vi.spyOn(imports, "importMockSystem");
  const { user, editor } = renderImport();
  await user.clear(screen.getByRole("textbox", { name: "Название системы" }));
  await user.type(
    screen.getByRole("textbox", { name: "Название системы" }),
    "Star Routes UI",
  );
  const raw = JSON.stringify(
    {
      sections: [
        {
          id: "crew",
          label: "Экипаж",
          fields: [{ id: "power", label: "Мощность", type: "number", min: 2 }],
        },
      ],
    },
    null,
    2,
  );
  fireEvent.change(editor, { target: { value: raw } });
  const button = screen.getByRole("button", { name: "Импортировать систему" });
  expect(button).toBeDisabled();
  await user.click(screen.getByRole("button", { name: "Проверить схему" }));
  await screen.findByRole("region", { name: "Предпросмотр листа" });
  fireEvent.change(screen.getByRole("textbox", { name: "Мощность" }), {
    target: { value: "99" },
  });
  fireEvent.click(button);
  fireEvent.click(button);
  expect(save).toHaveBeenCalledTimes(1);
  expect(save).toHaveBeenCalledWith(
    {
      system_name: "Star Routes UI",
      sheet_schema_name: "Базовый лист",
      schema_text: raw,
    },
    MOCK_USER.email,
  );
  expect(editor).toBeDisabled();
  await screen.findByRole("heading", { name: "Новый персонаж" });
  expect(
    screen.getByText("Система «Star Routes UI» импортирована"),
  ).toBeInTheDocument();
  expect(screen.getByRole("radio", { name: /Star Routes UI/u })).toBeChecked();
  expect(
    within(screen.getByRole("complementary", { name: "Сводка" })).getByText(
      "Star Routes UI",
    ),
  ).toBeInTheDocument();
  await user.type(
    screen.getByRole("textbox", { name: "Имя персонажа" }),
    "Pilot Alpha",
  );
  await user.click(screen.getByRole("button", { name: "Создать персонажа" }));
  // Пробные 99 не сохраняются: настоящий лист начинается со значения по умолчанию.
  expect(await screen.findByRole("textbox", { name: "Мощность" })).toHaveValue(
    "2",
  );
});

test("keeps names, checked JSON and preview after an import failure and allows retry", async () => {
  const validate = vi
    .spyOn(validation, "validateMockSchema")
    .mockResolvedValue({
      valid: true,
      errors: [],
      schema: CUSTOM_SCHEMA.schema,
      summary: { sections_count: 2, fields_count: 7 },
    });
  const save = vi
    .spyOn(imports, "importMockSystem")
    .mockRejectedValue(new Error("offline"));
  const { user, editor, router } = renderImport();
  const raw = editor.value;
  await user.click(screen.getByRole("button", { name: "Проверить схему" }));
  await screen.findByRole("region", { name: "Предпросмотр листа" });
  await user.type(screen.getByRole("textbox", { name: "Позывной" }), "Trial");
  await user.click(
    screen.getByRole("button", { name: "Импортировать систему" }),
  );
  await screen.findByText("Не удалось импортировать систему");
  expect(router.state.location.pathname).toBe("/systems/import");
  expect(editor).toHaveValue(raw);
  expect(screen.getByRole("textbox", { name: "Название системы" })).toHaveValue(
    "Custom System",
  );
  expect(screen.getByRole("textbox", { name: "Позывной" })).toHaveValue(
    "Trial",
  );
  expect(
    screen.getByRole("button", { name: "Импортировать систему" }),
  ).toBeEnabled();
  await user.click(
    screen.getByRole("button", { name: "Импортировать систему" }),
  );
  await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
  expect(validate).toHaveBeenCalledTimes(1);
});

test("editing checked JSON disables import until it is checked again", async () => {
  vi.spyOn(validation, "validateMockSchema").mockResolvedValue({
    valid: true,
    errors: [],
    schema: CUSTOM_SCHEMA.schema,
    summary: { sections_count: 2, fields_count: 7 },
  });
  const save = vi.spyOn(imports, "importMockSystem");
  const { user, editor } = renderImport();
  await user.click(screen.getByRole("button", { name: "Проверить схему" }));
  await screen.findByRole("region", { name: "Предпросмотр листа" });
  fireEvent.change(editor, { target: { value: editor.value + " " } });
  expect(
    screen.getByRole("button", { name: "Импортировать систему" }),
  ).toBeDisabled();
  expect(save).not.toHaveBeenCalled();
});
