import { afterEach, expect, test } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { routes } from "../app/router";
import AuthProvider from "../auth/AuthProvider";
import { MOCK_USER } from "../mocks/authUser";
import { getMockCharacterDetails } from "../mocks/characterDetails";

const aldricId = "c1a00000-0000-4000-8000-000000000001";
const viktorId = "c1a00000-0000-4000-8000-000000000003";
const merlinId = "c1a00000-0000-4000-8000-000000000004";
const editorCopyId = "c1a00000-0000-4000-8000-000000000005";

afterEach(cleanup);

// Права приходят из настоящих mock-выдач, а не задаются пропсами тестового компонента.
function renderSheet(id: string, email: string) {
  const router = createMemoryRouter(routes, {
    initialEntries: [`/characters/${id}`],
  });
  render(
    <AuthProvider initialUser={{ ...MOCK_USER, email }}>
      <RouterProvider router={router} />
    </AuthProvider>,
  );
  return userEvent.setup();
}

test.each([
  {
    role: "owner of original",
    id: aldricId,
    email: "alex@example.com",
    editable: true,
    history: true,
  },
  {
    role: "owner of Viktor copy",
    id: viktorId,
    email: "alex@example.com",
    editable: true,
    history: true,
  },
  {
    role: "recipient of EDIT copy",
    id: editorCopyId,
    email: "editor@example.com",
    editable: true,
    history: true,
  },
  {
    role: "owner of shared Merlin",
    id: merlinId,
    email: "gm@example.com",
    editable: true,
    history: true,
  },
  {
    role: "VIEW with history",
    id: aldricId,
    email: "user@example.com",
    editable: false,
    history: true,
  },
  {
    role: "VIEW without history",
    id: aldricId,
    email: "player@example.com",
    editable: false,
    history: false,
  },
  {
    role: "VIEW recipient of Merlin",
    id: merlinId,
    email: "alex@example.com",
    editable: false,
    history: false,
  },
])(
  "$role can use only the tabs and actions allowed by the grant",
  async ({ id, email, editable, history }) => {
    const user = renderSheet(id, email);
    const tabs = screen.getByRole("tablist", { name: "Разделы персонажа" });
    const expectedTabs = [
      "Лист",
      ...(history ? ["История"] : []),
      ...(editable ? ["Доступ"] : []),
    ];
    expect(within(tabs).getAllByRole("tab")).toHaveLength(expectedTabs.length);
    for (const name of expectedTabs) {
      expect(within(tabs).getByRole("tab", { name })).toBeEnabled();
    }
    expect(screen.queryAllByRole("textbox").length > 0).toBe(editable);

    if (editable) {
      await user.click(screen.getByRole("tab", { name: "Доступ" }));
      expect(
        screen.getByRole("region", { name: "Пользователи с доступом" }),
      ).toBeInTheDocument();
      expect(
        within(
          screen.getByRole("navigation", { name: "Хлебные крошки" }),
        ).getByText("Доступ"),
      ).toHaveAttribute("aria-current", "page");
      expect(
        screen.getByRole("button", { name: "Выдать доступ" }),
      ).toBeEnabled();
    } else {
      expect(
        screen.queryByRole("button", { name: "Выдать доступ" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Сохранить" }),
      ).not.toBeInTheDocument();
    }

    if (history) {
      await user.click(screen.getByRole("tab", { name: "История" }));
      const list = screen.getByRole("region", { name: "История версий" });
      expect(within(list).getAllByRole("link").length).toBeGreaterThan(0);
      const hasOlderVersions =
        getMockCharacterDetails(id, email)!.current_version_number > 1;
      expect(
        within(list).queryAllByRole("button", { name: /Восстановить/u })
          .length > 0,
      ).toBe(editable && hasOlderVersions);
    }
  },
);

test("EDIT recipient opens the independent copy history from v1", async () => {
  const user = renderSheet(editorCopyId, "editor@example.com");
  await user.click(screen.getByRole("tab", { name: "История" }));
  await user.click(screen.getByRole("link", { name: "Открыть версию 1" }));
  expect(
    screen.getByRole("heading", { name: "Aldric (копия)" }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: /Восстановить/u }),
  ).not.toBeInTheDocument();
});
