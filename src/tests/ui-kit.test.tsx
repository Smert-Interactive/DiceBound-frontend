import { StrictMode, useEffect, useState } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Banner,
  Button,
  ButtonLink,
  Checkbox,
  Input,
  Modal,
  RadioCard,
  Select,
  SystemBadge,
  Tabs,
} from "../shared/ui";

describe("UI controls", () => {
  test("a pending request blocks repeat activation and a form submission", async () => {
    const submit = vi.fn();
    function Form() {
      const [loading, setLoading] = useState(false);
      return (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit();
            setLoading(true);
          }}
        >
          <Button type="submit" loading={loading} loadingText="Сохранение…">
            Сохранить
          </Button>
        </form>
      );
    }
    const user = userEvent.setup();
    render(<Form />);
    const button = screen.getByRole("button", { name: "Сохранить" });
    await user.click(button);
    expect(submit).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    await user.click(button);
    expect(submit).toHaveBeenCalledTimes(1);
  });

  test("disabled links cannot navigate or invoke a click handler", async () => {
    const click = vi.fn();
    render(
      <ButtonLink href="/characters" disabled onClick={click}>
        Персонажи
      </ButtonLink>,
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    const disabled = screen.getByText("Персонажи").closest("[aria-disabled]");
    expect(disabled).not.toHaveAttribute("href");
    await userEvent.click(screen.getByText("Персонажи"));
    expect(click).not.toHaveBeenCalled();
  });

  test("input errors and hints remain connected, and clearing an error updates validity", () => {
    const { rerender } = render(
      <Input label="Имя" hint="До 100 символов" error="Введите имя" />,
    );
    const input = screen.getByRole("textbox", { name: "Имя" });
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("До 100 символов Введите имя");
    rerender(<Input label="Имя" hint="До 100 символов" />);
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).toHaveAccessibleDescription("До 100 символов");
  });

  test("select and checkbox errors describe the corresponding controls", () => {
    render(
      <>
        <Select
          label="Система"
          options={[{ value: "dnd", label: "D&D" }]}
          error="Выберите систему"
        />
        <Checkbox label="Согласие" error="Требуется согласие" />
      </>,
    );
    expect(
      screen.getByRole("combobox", { name: "Система" }),
    ).toHaveAccessibleDescription("Выберите систему");
    expect(screen.getByRole("checkbox", { name: "Согласие" })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(
      screen.getByRole("checkbox", { name: "Согласие" }),
    ).toHaveAccessibleDescription("Требуется согласие");
  });

  test("switching to read-only preserves edited values and prevents further editing", async () => {
    function Example() {
      const [name, setName] = useState("Aldric");
      const [readOnly, setReadOnly] = useState(false);
      return (
        <>
          <Input
            label="Имя"
            value={name}
            onChange={(event) => setName(event.target.value)}
            readOnly={readOnly}
          />
          <Select
            label="Класс"
            value="fighter"
            options={[{ value: "fighter", label: "Воин" }]}
            readOnly={readOnly}
            onChange={() => {}}
          />
          <Checkbox label="Вдохновение" defaultChecked readOnly={readOnly} />
          <button onClick={() => setReadOnly(true)}>Только просмотр</button>
        </>
      );
    }
    const user = userEvent.setup();
    render(<Example />);
    await user.clear(screen.getByRole("textbox", { name: "Имя" }));
    await user.type(screen.getByRole("textbox", { name: "Имя" }), "Merlin");
    await user.click(screen.getByRole("button", { name: "Только просмотр" }));
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.getByText("Воин")).toBeInTheDocument();
    expect(screen.getByText("Merlin")).toBeInTheDocument();
    expect(screen.getByText("Вдохновение: Да")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Имя" })).toHaveTextContent(
      "Merlin",
    );
    expect(screen.getByRole("group", { name: "Класс" })).toHaveTextContent(
      "Воин",
    );
  });

  test("native radio cards support exclusive selection", async () => {
    render(
      <>
        <RadioCard name="access" value="view" label="VIEW" defaultChecked />
        <RadioCard name="access" value="edit" label="EDIT" />
      </>,
    );
    await userEvent.click(screen.getByRole("radio", { name: "EDIT" }));
    expect(screen.getByRole("radio", { name: "EDIT" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "VIEW" })).not.toBeChecked();
  });

  test("a failed action can be retried and its success notification dismissed", async () => {
    function Example() {
      const [state, setState] = useState("error");
      return state === "error" ? (
        <>
          <Banner title="Не удалось сохранить" variant="error" />
          <Button onClick={() => setState("success")}>Повторить</Button>
        </>
      ) : state === "success" ? (
        <Banner
          title="Сохранено"
          variant="success"
          notification
          onClose={() => setState("closed")}
        />
      ) : null;
    }
    render(<Example />);
    expect(screen.getByRole("alert")).toHaveTextContent("Не удалось сохранить");
    await userEvent.click(screen.getByRole("button", { name: "Повторить" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Сохранено");
    await userEvent.click(screen.getByRole("button", { name: "Закрыть" }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

test("tabs wrap, skip disabled tabs, and activate with arrows, Home and End", async () => {
  function Example() {
    const [value, setValue] = useState("sheet");
    return (
      <Tabs
        label="Персонаж"
        value={value}
        onChange={setValue}
        items={[
          { id: "sheet", label: "Лист", content: "Поля листа" },
          {
            id: "history",
            label: "История",
            content: "Версии",
            disabled: true,
          },
          { id: "access", label: "Доступ", content: "Получатели" },
        ]}
      />
    );
  }
  const user = userEvent.setup();
  render(<Example />);
  await user.tab();
  await user.keyboard("{ArrowRight}");
  expect(screen.getByRole("tab", { name: "Доступ" })).toHaveFocus();
  expect(screen.getByRole("tabpanel")).toHaveTextContent("Получатели");
  await user.keyboard("{ArrowRight}");
  expect(screen.getByRole("tab", { name: "Лист" })).toHaveFocus();
  await user.keyboard("{End}");
  expect(screen.getByRole("tab", { name: "Доступ" })).toHaveFocus();
  await user.keyboard("{Home}");
  await user.keyboard("{ArrowLeft}");
  expect(screen.getByRole("tab", { name: "Доступ" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});

test("read-only fields keep their accessible descriptions", () => {
  render(
    <>
      <Input label="Имя" value="Aldric" hint="Имя персонажа" readOnly />
      <Select
        label="Класс"
        value="fighter"
        hint="Выбранный класс"
        readOnly
        options={[{ value: "fighter", label: "Воин" }]}
      />
    </>,
  );
  expect(
    screen.getByRole("group", { name: "Имя" }),
  ).toHaveAccessibleDescription("Имя персонажа");
  expect(
    screen.getByRole("group", { name: "Класс" }),
  ).toHaveAccessibleDescription("Выбранный класс");
});

test("radio descriptions preserve external help when the card description changes", () => {
  function Example({ description }: { description?: string }) {
    return (
      <>
        <p id="access-help">Тип доступа задаётся один раз</p>
        <RadioCard
          label="VIEW"
          name="access"
          description={description}
          aria-describedby="access-help"
        />
      </>
    );
  }
  const { rerender } = render(<Example description="Только просмотр" />);
  expect(screen.getByRole("radio")).toHaveAccessibleDescription(
    "Тип доступа задаётся один раз Только просмотр",
  );
  rerender(<Example />);
  expect(screen.getByRole("radio")).toHaveAccessibleDescription(
    "Тип доступа задаётся один раз",
  );
});

test("changing a badge to VIEW exposes its read-only meaning", async () => {
  function Example() {
    const [viewOnly, setViewOnly] = useState(false);
    return (
      <>
        <SystemBadge name="D&D 5e" system="dnd" viewOnly={viewOnly} />
        <button onClick={() => setViewOnly(true)}>Показать как VIEW</button>
      </>
    );
  }
  render(<Example />);
  expect(screen.getByRole("img", { name: "D&D 5e" })).toBeInTheDocument();
  await userEvent.click(
    screen.getByRole("button", { name: "Показать как VIEW" }),
  );
  expect(
    screen.getByRole("img", { name: "D&D 5e, только просмотр" }),
  ).toBeInTheDocument();
});

test("tabs mount only the selected panel and unmount the previous one", async () => {
  const mounted = vi.fn();
  const unmounted = vi.fn();

  function Panel({ name }: { name: string }) {
    useEffect(() => {
      mounted(name);
      return () => {
        unmounted(name);
      };
    }, [name]);
    return <p>{name}</p>;
  }

  function Example() {
    const [value, setValue] = useState("sheet");
    return (
      <Tabs
        label="Персонаж"
        value={value}
        onChange={setValue}
        items={[
          { id: "sheet", label: "Лист", content: <Panel name="Поля" /> },
          { id: "history", label: "История", content: <Panel name="Версии" /> },
        ]}
      />
    );
  }

  render(<Example />);
  expect(mounted.mock.calls).toEqual([["Поля"]]);
  await userEvent.click(screen.getByRole("tab", { name: "История" }));
  expect(unmounted).toHaveBeenCalledWith("Поля");
  expect(mounted.mock.calls).toEqual([["Поля"], ["Версии"]]);
  expect(screen.queryByText("Поля")).not.toBeInTheDocument();
  expect(screen.getByRole("tabpanel", { name: "История" })).toHaveTextContent(
    "Версии",
  );
});

test("tabs stay reachable by keyboard when the value matches no tab", () => {
  render(
    <Tabs
      label="Персонаж"
      value="missing"
      onChange={vi.fn()}
      items={[
        { id: "sheet", label: "Лист", content: <p>Поля</p>, disabled: true },
        { id: "history", label: "История", content: <p>Версии</p> },
        { id: "access", label: "Доступ", content: <p>Выдача</p> },
      ]}
    />,
  );

  expect(screen.getByRole("tab", { name: "История" })).toHaveAttribute(
    "tabindex",
    "0",
  );
  expect(screen.getByRole("tab", { name: "Доступ" })).toHaveAttribute(
    "tabindex",
    "-1",
  );
  expect(screen.queryByRole("tabpanel")).not.toBeInTheDocument();
});

describe("Modal lifecycle", () => {
  // jsdom lacks the native dialog lifecycle; focus navigation is exercised with real events.
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

  function Example() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button onClick={() => setOpen(true)}>Открыть</button>
        <Modal
          open={open}
          onClose={() => setOpen(false)}
          title="Удалить персонажа?"
          actions={
            <>
              <Button onClick={() => setOpen(false)}>Отмена</Button>
              <Button variant="danger">Удалить</Button>
            </>
          }
        >
          Будет удалена история.
        </Modal>
      </>
    );
  }

  test("focus enters the dialog, cycles inside and returns after Escape cancellation", async () => {
    const user = userEvent.setup();
    render(
      <StrictMode>
        <Example />
      </StrictMode>,
    );
    const trigger = screen.getByRole("button", { name: "Открыть" });
    await user.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Удалить персонажа?" });
    expect(screen.getByRole("button", { name: "Отмена" })).toHaveFocus();
    expect(document.body.style.overflow).toBe("hidden");
    await user.tab({ shift: true });
    expect(screen.getByRole("button", { name: "Удалить" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Отмена" })).toHaveFocus();
    fireEvent(dialog, new Event("cancel", { cancelable: true })); // Escape dispatches cancel in a native dialog.
    await waitFor(() => expect(dialog).not.toHaveAttribute("open"));
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe("");
  });

  test("backdrop click closes, while content clicks keep the dialog open", async () => {
    render(<Example />);
    await userEvent.click(screen.getByRole("button", { name: "Открыть" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(screen.getByText("Будет удалена история."));
    expect(dialog).toHaveAttribute("open");
    fireEvent.click(dialog, { clientX: -10, clientY: -10 });
    await waitFor(() => expect(dialog).not.toHaveAttribute("open"));
  });

  test("unmounting an open dialog restores scrolling and focus", async () => {
    const trigger = document.createElement("button");
    document.body.append(trigger);
    trigger.focus();
    const { unmount } = render(
      <StrictMode>
        <Modal open onClose={() => {}} title="Проверка">
          <Button>Отмена</Button>
        </Modal>
      </StrictMode>,
    );
    expect(screen.getByRole("button", { name: "Отмена" })).toHaveFocus();
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe("");
    trigger.remove();
  });
});
