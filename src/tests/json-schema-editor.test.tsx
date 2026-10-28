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
  await user.click(input);
  await user.tab();
  expect(
    screen.getByRole("button", { name: "Следующее действие" }),
  ).toHaveFocus();
});
