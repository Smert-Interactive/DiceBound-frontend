import { useState } from "react";
import { afterEach, expect, test } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import JsonSchemaEditor from "../components/JsonSchemaEditor";

// Проверяем управляемый редактор с настоящим обновлением черновика родителя.
function EditorExample({ initial = "" }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <JsonSchemaEditor value={value} onChange={setValue} />
      <button>Следующее действие</button>
    </>
  );
}

afterEach(cleanup);

test("keeps incomplete JSON and updates numbers including the final empty line", () => {
  const { container } = render(<EditorExample />);
  const input = screen.getByRole("textbox", { name: "JSON-схема" });
  const numbers = container.querySelector(".json-editor__numbers")!;
  expect(numbers.textContent).toBe("1");
  fireEvent.change(input, { target: { value: '{\n  "unfinished":\n' } });
  expect(input).toHaveValue('{\n  "unfinished":\n');
  expect(numbers.textContent).toBe("1\n2\n3");
  fireEvent.change(input, { target: { value: "" } });
  expect(numbers.textContent).toBe("1");
});

test("scrolls numbers with the text and lets Tab leave the editor", async () => {
  const user = userEvent.setup();
  const { container } = render(
    <EditorExample
      initial={Array.from({ length: 80 }, (_, i) => String(i)).join("\n")}
    />,
  );
  const input = screen.getByRole("textbox", { name: "JSON-схема" });
  fireEvent.scroll(input, { target: { scrollTop: 120, scrollLeft: 50 } });
  expect(container.querySelector(".json-editor__numbers pre")).toHaveStyle({
    transform: "translateY(-120px)",
  });
  expect(container.querySelector(".json-editor__numbers")?.scrollLeft).toBe(0);
  expect(container.querySelector(".json-editor__highlight code")).toHaveStyle({
    transform: "translate(-50px, -120px)",
  });
  await user.click(input);
  await user.tab();
  expect(
    screen.getByRole("button", { name: "Следующее действие" }),
  ).toHaveFocus();
});

test("updates the syntax status and accessible field description while typing", () => {
  render(<EditorExample />);
  const input = screen.getByRole("textbox", { name: "JSON-схема" });
  expect(input).not.toHaveAttribute("aria-invalid");
  expect(screen.getByRole("status")).toHaveTextContent(
    "Введите JSON или загрузите файл",
  );
  fireEvent.change(input, { target: { value: "\n{}\n" } });
  expect(input).not.toHaveAttribute("aria-invalid");
  expect(screen.getByRole("status")).toHaveTextContent(
    "JSON корректен · 3 строки",
  );
  expect(input).toHaveAccessibleDescription("JSON корректен · 3 строки");
  fireEvent.change(input, { target: { value: '{\n  "field": ]\n}' } });
  expect(screen.getByRole("status")).toHaveTextContent(
    "Ошибка синтаксиса JSON · строка 2",
  );
  expect(input).toHaveValue('{\n  "field": ]\n}');
  fireEvent.change(input, { target: { value: " \n " } });
  expect(input).not.toHaveAttribute("aria-invalid");
  expect(screen.getByRole("status")).toHaveTextContent(
    "Введите JSON или загрузите файл",
  );
});

test("renders HTML-like strings as text without creating elements", () => {
  const text = JSON.stringify({
    html: '<img src=x onerror="alert(1)">',
    formula: "floor(reflex / 2)",
  });
  const { container } = render(<EditorExample initial={text} />);
  expect(container.querySelector(".json-editor__highlight img")).toBeNull();
  expect(screen.getByRole("textbox", { name: "JSON-схема" })).toHaveValue(text);
  expect(
    container.querySelector(".json-editor__token--formula"),
  ).toHaveTextContent('"floor(reflex / 2)"');
});
