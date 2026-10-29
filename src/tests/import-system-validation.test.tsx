import AuthProvider from "../auth/AuthProvider";
import { MOCK_USER } from "../auth/authContext";
import { afterEach, expect, test, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import ImportSystemPage from "../pages/ImportSystemPage";
import * as service from "../mocks/schemaValidation";
import * as fileService from "../systems/readJsonFile";
import type { SchemaValidationResult } from "../systems/schemaValidationTypes";
import { CUSTOM_SCHEMA } from "../mocks/sheetSchemas";

const validResponse: SchemaValidationResult = {
  valid: true,
  errors: [],
  schema: CUSTOM_SCHEMA.schema,
  summary: { sections_count: 2, fields_count: 7 },
};

// Проверяем экран с реальным редактором; только сетевые сбои и задержанные ответы подменяются.
function renderImport() {
  const view = render(
    <MemoryRouter>
      <AuthProvider initialUser={MOCK_USER}>
        <ImportSystemPage />
      </AuthProvider>
    </MemoryRouter>,
  );
  return {
    ...view,
    editor: screen.getByRole("textbox", {
      name: "JSON-схема",
    }) as HTMLTextAreaElement,
    feedback: screen.getByRole("complementary", {
      name: "Результат проверки схемы",
    }),
    check: screen.getByRole("button", { name: "Проверить схему" }),
  };
}

// Позволяет вернуть ответ после правки текста, имитируя медленный backend.
function deferredResult() {
  let resolve!: (result: SchemaValidationResult) => void;
  const promise = new Promise<SchemaValidationResult>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

test("checks the original source once and displays the server summary", async () => {
  const user = userEvent.setup();
  const { editor, feedback, check } = renderImport();
  const read = vi.spyOn(service, "validateMockSchema");
  const source = editor.value;
  await user.click(check);
  await within(feedback).findByText("Схема корректна");
  expect(read).toHaveBeenCalledExactlyOnceWith({ schema_text: source });
  expect(feedback).toHaveTextContent("2 секции · 7 полей · 1 формула");
  expect(editor).toHaveValue(source);
  expect(editor).not.toHaveAttribute("aria-invalid");
});

test("lists field paths and source lines and highlights the errors from the design example", async () => {
  const user = userEvent.setup();
  const { container, editor, feedback, check } = renderImport();
  const source = editor.value
    .replace('"select"', '"slider"')
    .replace("floor(reflex / 2) + rank", "pow(agility, 2) + rank");
  fireEvent.change(editor, { target: { value: source } });
  await user.click(check);
  await within(feedback).findByText("Найдено 3 ошибки");
  const rows = within(
    within(feedback).getByRole("list", { name: "Ошибки" }),
  ).getAllByRole("listitem");
  expect(rows).toHaveLength(3);
  expect(rows[0]).toHaveTextContent("sections[0].fields[1].type");
  expect(rows[0]).toHaveTextContent("Неизвестный тип «slider».");
  expect(rows[1]).toHaveTextContent("Функция «pow» не поддерживается.");
  expect(rows[2]).toHaveTextContent("Поле «agility» не найдено в схеме.");
  const lines = source.split("\n");
  const typeLine = lines.findIndex((line) => line.includes('"slider"')) + 1;
  const formulaLine =
    lines.findIndex((line) => line.includes("pow(agility")) + 1;
  expect(rows[0]).toHaveTextContent(`строка ${typeLine}`);
  expect(rows[1]).toHaveTextContent(`строка ${formulaLine}`);
  expect(
    container.querySelectorAll(".json-editor__line[data-error]"),
  ).toHaveLength(2);
  expect(
    container.querySelectorAll(".json-editor__line-number[data-error]"),
  ).toHaveLength(2);
  expect(editor).toHaveValue(source);
  expect(editor).toHaveAttribute("aria-invalid", "true");
  fireEvent.change(editor, { target: { value: source + " " } });
  expect(within(feedback).queryByRole("list")).not.toBeInTheDocument();
  expect(
    container.querySelectorAll(".json-editor__line[data-error]"),
  ).toHaveLength(0);
});

test("the check button cannot send syntactically invalid JSON", async () => {
  const user = userEvent.setup();
  const { editor, check } = renderImport();
  const read = vi.spyOn(service, "validateMockSchema");
  fireEvent.change(editor, { target: { value: "{" } });
  expect(check).toBeDisabled();
  await user.click(check);
  expect(read).not.toHaveBeenCalled();
});

test("a pending check rejects duplicate requests and its stale response is ignored", async () => {
  const pending = deferredResult();
  const read = vi
    .spyOn(service, "validateMockSchema")
    .mockReturnValue(pending.promise);
  const { editor, feedback, check } = renderImport();
  fireEvent.click(check);
  fireEvent.click(check);
  expect(read).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("button", { name: "Проверка…" })).toBeDisabled();
  fireEvent.change(editor, { target: { value: '{"sections":[]}' } });
  await act(async () => {
    pending.resolve(validResponse);
  });
  expect(
    within(feedback).queryByText("Схема корректна"),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Проверить схему" })).toBeEnabled();
});

test("a transport failure preserves the draft and can be retried", async () => {
  const user = userEvent.setup();
  const realCheck = service.validateMockSchema;
  vi.spyOn(service, "validateMockSchema")
    .mockRejectedValueOnce(new Error("private details"))
    .mockImplementation(realCheck);
  const { editor, feedback, check } = renderImport();
  const source = editor.value;
  await user.click(check);
  await within(feedback).findByText("Не удалось проверить схему");
  expect(editor).toHaveValue(source);
  expect(screen.queryByText("private details")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Проверить схему" }));
  await within(feedback).findByText("Схема корректна");
});

test("an error without a known source line is displayed without inventing a line number", async () => {
  const user = userEvent.setup();
  vi.spyOn(service, "validateMockSchema").mockResolvedValue({
    valid: false,
    schema: null,
    summary: null,
    errors: [{ path: "sections", message: "Ошибка структуры", line: null }],
  });
  const { container, feedback, check } = renderImport();
  await user.click(check);
  await within(feedback).findByText("Ошибка структуры");
  expect(feedback).not.toHaveTextContent("строка");
  expect(
    container.querySelectorAll(".json-editor__line[data-error]"),
  ).toHaveLength(0);
});

test("loading a new file resets the checked result and blocks checks while the file is read", async () => {
  const user = userEvent.setup();
  const { feedback, check } = renderImport();
  await user.click(check);
  await within(feedback).findByText("Схема корректна");
  let resolve!: (text: string) => void;
  vi.spyOn(fileService, "readJsonFile").mockReturnValue(
    new Promise<string>((done) => {
      resolve = done;
    }),
  );
  await user.upload(
    screen.getByLabelText("Загрузить JSON-схему"),
    new File(["{}"], "new.json"),
  );
  expect(
    screen.getByRole("button", { name: "Проверить схему" }),
  ).toBeDisabled();
  await act(async () => {
    resolve('{"sections":[]}');
  });
  expect(
    within(feedback).queryByText("Схема корректна"),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Проверить схему" })).toBeEnabled();
});

test("empty names show field errors before a check is sent", async () => {
  const user = userEvent.setup();
  const { check } = renderImport();
  const read = vi.spyOn(service, "validateMockSchema");
  await user.clear(screen.getByRole("textbox", { name: "Название системы" }));
  await user.clear(screen.getByRole("textbox", { name: "Название листа" }));
  await user.click(check);
  expect(screen.getByText("Введите название системы")).toBeInTheDocument();
  expect(screen.getByText("Введите название листа")).toBeInTheDocument();
  expect(read).not.toHaveBeenCalled();
});

test("a dependency cycle is reported as formula errors instead of hanging the page", async () => {
  const user = userEvent.setup();
  const { editor, feedback, check } = renderImport();
  const source = JSON.stringify(
    {
      sections: [
        {
          id: "test",
          label: "Тест",
          fields: [
            { id: "a", label: "A", type: "calculated", formula: "b + 1" },
            { id: "b", label: "B", type: "calculated", formula: "a + 1" },
          ],
        },
      ],
    },
    null,
    2,
  );
  fireEvent.change(editor, { target: { value: source } });
  await user.click(check);
  await within(feedback).findByText("Найдено 2 ошибки");
  expect(
    within(feedback).getAllByText(/Циклическая зависимость формулы/u),
  ).toHaveLength(2);
});
