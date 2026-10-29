import AuthProvider from "../auth/AuthProvider";
import { MOCK_USER } from "../mocks/authUser";
import { afterEach, expect, test, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import ImportSystemPage from "../pages/ImportSystemPage";
import * as files from "../systems/readJsonFile";

// Проверяем загрузку файла с начальной mock-сессией; настоящий backend не нужен.
function renderImport() {
  render(
    <MemoryRouter>
      <AuthProvider initialUser={MOCK_USER}>
        <ImportSystemPage />
      </AuthProvider>
    </MemoryRouter>,
  );
  return {
    input: screen.getByLabelText("Загрузить JSON-схему") as HTMLInputElement,
    editor: screen.getByRole("textbox", { name: "JSON-схема" }),
    form: screen.getByRole("region", { name: "Параметры импорта" }),
  };
}

// Отложенное чтение позволяет проверить порядок завершения двух выбранных файлов.
function deferredText() {
  let resolve!: (text: string) => void;
  const promise = new Promise<string>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

test("the picker button opens the input and a JSON file replaces only the source text", async () => {
  const user = userEvent.setup();
  const { input, editor } = renderImport();
  const click = vi.spyOn(input, "click");
  await user.click(screen.getByRole("button", { name: "Выбрать .json файл" }));
  expect(click).toHaveBeenCalledOnce();
  await user.clear(screen.getByRole("textbox", { name: "Название системы" }));
  await user.type(
    screen.getByRole("textbox", { name: "Название системы" }),
    "Моя система",
  );
  const text = '{\n  "sections": []\n}\n';
  await user.upload(
    input,
    new File([text], "schema.json", { type: "application/json" }),
  );
  await waitFor(() => expect(editor).toHaveValue(text));
  expect(screen.getByRole("textbox", { name: "Название системы" })).toHaveValue(
    "Моя система",
  );
  expect(screen.getByRole("textbox", { name: "Название листа" })).toHaveValue(
    "Базовый лист",
  );
  expect(screen.getByRole("status")).toHaveTextContent(
    "JSON корректен · 4 строки",
  );
  expect(input.value).toBe("");
});

test("wrong extensions preserve the edited draft and show the documented file error", async () => {
  const user = userEvent.setup({ applyAccept: false });
  const { input, editor, form } = renderImport();
  fireEvent.change(editor, { target: { value: '{"draft":true}' } });
  await user.upload(
    input,
    new File(["different text"], "schema.txt", { type: "application/json" }),
  );
  const error = await within(form).findByRole("alert");
  expect(error).toHaveTextContent("Не удалось прочитать файл «schema.txt»");
  expect(error).toHaveTextContent(
    "Выберите файл с расширением .json. Текст в редакторе не изменён.",
  );
  expect(editor).toHaveValue('{"draft":true}');
});

test("a reading failure preserves the draft and the same file can be selected again", async () => {
  const user = userEvent.setup();
  const { input, editor, form } = renderImport();
  const original = (editor as HTMLTextAreaElement).value;
  const read = vi
    .spyOn(files, "readJsonFile")
    .mockRejectedValueOnce(new Error("private path"))
    .mockResolvedValueOnce('{"loaded":true}');
  const file = new File(["{}"], "schema.json");
  await user.upload(input, file);
  expect(await within(form).findByRole("alert")).toHaveTextContent(
    "Не удалось прочитать файл «schema.json»",
  );
  expect(editor).toHaveValue(original);
  expect(screen.queryByText("private path")).not.toBeInTheDocument();
  await user.upload(input, file);
  await waitFor(() => expect(editor).toHaveValue('{"loaded":true}'));
  expect(read).toHaveBeenCalledTimes(2);
  expect(within(form).queryByRole("alert")).not.toBeInTheDocument();
});

test("reading a syntactically invalid JSON file updates the editor and its syntax status", async () => {
  const user = userEvent.setup();
  const { input, editor, form } = renderImport();
  const text = '{\n  "unfinished":\n}';
  await user.upload(input, new File([text], "schema.json"));
  await waitFor(() => expect(editor).toHaveValue(text));
  expect(screen.getByRole("status")).toHaveTextContent(
    "Ошибка синтаксиса JSON",
  );
  expect(within(form).queryByRole("alert")).not.toBeInTheDocument();
});

test("an earlier file cannot overwrite the file selected later", async () => {
  const user = userEvent.setup();
  const { input, editor } = renderImport();
  const earlier = deferredText();
  vi.spyOn(files, "readJsonFile")
    .mockReturnValueOnce(earlier.promise)
    .mockResolvedValueOnce('{"newer":true}');
  await user.upload(input, new File(["old"], "first.json"));
  await user.upload(input, new File(["new"], "second.json"));
  await waitFor(() => expect(editor).toHaveValue('{"newer":true}'));
  await act(async () => {
    earlier.resolve('{"older":true}');
  });
  expect(editor).toHaveValue('{"newer":true}');
});

test("manual edits made during reading take precedence over the file", async () => {
  const user = userEvent.setup();
  const { input, editor } = renderImport();
  const reading = deferredText();
  vi.spyOn(files, "readJsonFile").mockReturnValueOnce(reading.promise);
  await user.upload(input, new File(["{}"], "schema.json"));
  fireEvent.change(editor, { target: { value: '{"manual":true}' } });
  await act(async () => {
    reading.resolve('{"file":true}');
  });
  expect(editor).toHaveValue('{"manual":true}');
});
