import { afterEach, expect, test, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import ImportSystemPage from "../pages/ImportSystemPage";
import SchemaPreview from "../components/SchemaPreview";
import { CUSTOM_SCHEMA } from "../mocks/sheetSchemas";
import * as service from "../mocks/schemaValidation";

const success = {
  valid: true as const,
  errors: [] as [],
  schema: CUSTOM_SCHEMA.schema,
  summary: { sections_count: 2, fields_count: 7 },
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

test("preview supports the six shared field types and recalculates only local trial values", async () => {
  const user = userEvent.setup();
  render(<SchemaPreview schema={CUSTOM_SCHEMA.schema} />);
  const preview = within(
    screen.getByRole("region", { name: "Предпросмотр листа" }),
  );
  expect(preview.getByText("тот же renderer")).toBeInTheDocument();
  const callsign = preview.getByRole("textbox", { name: "Позывной" });
  await user.type(callsign, "Viktor");
  await user.selectOptions(
    preview.getByRole("combobox", { name: "Роль" }),
    "pilot",
  );
  await user.click(
    preview.getByRole("checkbox", { name: "Имплант установлен" }),
  );
  fireEvent.change(preview.getByRole("textbox", { name: "Ранг" }), {
    target: { value: "4" },
  });
  fireEvent.change(preview.getByRole("textbox", { name: "Реакция" }), {
    target: { value: "12" },
  });
  const defense = preview.getByRole("group", { name: "Защита" });
  expect(within(defense).getByText("10")).toBeInTheDocument();
  fireEvent.change(preview.getByRole("textbox", { name: "Реакция" }), {
    target: { value: "14" },
  });
  expect(within(defense).getByText("11")).toBeInTheDocument();
  fireEvent.change(
    preview.getByRole("textbox", { name: "Энергия: максимум" }),
    { target: { value: "10" } },
  );
  fireEvent.change(preview.getByRole("textbox", { name: "Энергия: текущее" }), {
    target: { value: "6" },
  });
  expect(callsign).toHaveValue("Viktor");
  expect(
    preview.getByRole("checkbox", { name: "Имплант установлен" }),
  ).toBeChecked();
  expect(
    screen.queryByRole("button", { name: /Сохранить/u }),
  ).not.toBeInTheDocument();
});

test("shows field and calculation errors without invalidating the checked schema", () => {
  render(<SchemaPreview schema={CUSTOM_SCHEMA.schema} />);
  expect(screen.getByRole("textbox", { name: "Позывной" })).not.toHaveAttribute(
    "aria-invalid",
    "true",
  );
  fireEvent.change(screen.getByRole("textbox", { name: "Ранг" }), {
    target: { value: "11" },
  });
  expect(screen.getByRole("textbox", { name: "Ранг" })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  fireEvent.change(screen.getByRole("textbox", { name: "Ранг" }), {
    target: { value: "4" },
  });
  expect(screen.getByRole("textbox", { name: "Ранг" })).not.toHaveAttribute(
    "aria-invalid",
    "true",
  );
});

test("preview appears only after success, preserves JSON and resets on a new check", async () => {
  const user = userEvent.setup();
  const validate = vi
    .spyOn(service, "validateMockSchema")
    .mockResolvedValue(success);
  render(
    <MemoryRouter>
      <ImportSystemPage />
    </MemoryRouter>,
  );
  const editor = screen.getByRole("textbox", { name: "JSON-схема" });
  const source = (editor as HTMLTextAreaElement).value;
  expect(
    screen.queryByRole("region", { name: "Предпросмотр листа" }),
  ).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Проверить схему" }));
  await screen.findByRole("region", { name: "Предпросмотр листа" });
  await user.type(screen.getByRole("textbox", { name: "Позывной" }), "Trial");
  expect(editor).toHaveValue(source);
  expect(validate).toHaveBeenCalledTimes(1);
  await user.click(screen.getByRole("button", { name: "Проверить схему" }));
  await screen.findByRole("region", { name: "Предпросмотр листа" });
  expect(screen.getByRole("textbox", { name: "Позывной" })).toHaveValue("");
  fireEvent.change(editor, { target: { value: source + " " } });
  expect(
    screen.queryByRole("region", { name: "Предпросмотр листа" }),
  ).not.toBeInTheDocument();
});

test("does not display preview after invalid validation or a request failure", async () => {
  const user = userEvent.setup();
  const validate = vi.spyOn(service, "validateMockSchema").mockResolvedValue({
    valid: false,
    errors: [{ path: "sections", message: "Ошибка схемы", line: 2 }],
    schema: null,
    summary: null,
  });
  render(
    <MemoryRouter>
      <ImportSystemPage />
    </MemoryRouter>,
  );
  await user.click(screen.getByRole("button", { name: "Проверить схему" }));
  await screen.findByText("Ошибка схемы");
  expect(
    screen.queryByRole("region", { name: "Предпросмотр листа" }),
  ).not.toBeInTheDocument();
  validate.mockRejectedValueOnce(new Error("offline"));
  await user.click(screen.getByRole("button", { name: "Проверить схему" }));
  await screen.findByText("Не удалось проверить схему");
  expect(
    screen.queryByRole("region", { name: "Предпросмотр листа" }),
  ).not.toBeInTheDocument();
});
