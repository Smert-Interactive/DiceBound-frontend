import { installDataApi } from "./helpers/dataApi";
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { routes } from "./helpers/mockCharacterRoutes";
import AuthProvider from "../auth/AuthProvider";
import { MOCK_USER } from "../mocks/authUser";
import * as recalculate from "../sheet/recalculate";

const originalId = "c1a00000-0000-4000-8000-000000000001";
const viktorId = "c1a00000-0000-4000-8000-000000000003";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// Начинаем с реального маршрута и выбранного mock-аккаунта, без подмены данных листа.
function renderRecipient(path: string, email = MOCK_USER.email) {
  installDataApi(email);
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <AuthProvider initialUser={{ ...MOCK_USER, email }}>
      <RouterProvider router={router} />
    </AuthProvider>,
  );
  return userEvent.setup();
}

test("Merlin opens from available characters as a read-only original", async () => {
  const calculate = vi.spyOn(recalculate, "recalculateSheet");
  const user = renderRecipient("/characters");
  await user.click(await screen.findByRole("link", { name: "Merlin" }));
  expect(screen.getByRole("heading", { name: "Merlin" })).toBeInTheDocument();
  expect(screen.getByText("Владелец: gm@example.com")).toBeInTheDocument();
  expect(
    screen.getByText(/история версий скрыта владельцем/u),
  ).toBeInTheDocument();
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Сохранить" }),
  ).not.toBeInTheDocument();
  expect(calculate).not.toHaveBeenCalled();
});

test("a recipient opens shared history with the owner named on the version page", async () => {
  const user = renderRecipient(`/characters/${originalId}`, "user@example.com");
  expect(screen.getByText(/вместе с историей версий/u)).toBeInTheDocument();
  await user.click(screen.getByRole("tab", { name: "История" }));
  await user.click(screen.getByRole("link", { name: "Открыть версию 4" }));
  expect(screen.getByText("Владелец: alex@example.com")).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: /Восстановить/u }),
  ).not.toBeInTheDocument();
});

test("Viktor uses the shared renderer and saves with copy labels", async () => {
  const user = renderRecipient(`/characters/${viktorId}`);
  expect(
    screen.getByText("Это ваша копия персонажа Viktor от mira@example.com"),
  ).toBeInTheDocument();
  expect(screen.getByText("копия", { exact: true })).toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: "Позывной" })).toHaveValue(
    "Viktor",
  );
  const rank = screen.getByRole("textbox", { name: "Ранг" });
  await user.clear(rank);
  await user.type(rank, "5");
  await user.click(screen.getByRole("button", { name: "Сохранить копию" }));
  expect(
    await screen.findByText(
      "Сохранено · создана версия 4 копии · оригинал не изменён",
    ),
  ).toBeInTheDocument();
  await user.click(screen.getByRole("tab", { name: "История" }));
  expect(
    within(screen.getByRole("region", { name: "История версий" })).getByText(
      "Версия 4",
    ),
  ).toBeInTheDocument();
});
