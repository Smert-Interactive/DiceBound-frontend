import { afterEach, describe, expect, test } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  createMemoryRouter,
  generatePath,
  RouterProvider,
} from "react-router-dom";

import { routes } from "./helpers/mockCharacterRoutes";
import AuthProvider from "../auth/AuthProvider";
import { MOCK_USER } from "../mocks/authUser";
import { ROUTES } from "../constants/routes";
import { getMockCharacterShares } from "../mocks/characterShares";
import { MOCK_CHARACTERS } from "../mocks/characters";

afterEach(cleanup);

const aldric = MOCK_CHARACTERS.owned[0];

describe("getMockCharacterShares", () => {
  test("the owner sees VIEW grants and records of EDIT copies", () => {
    const shares = getMockCharacterShares(aldric.id, MOCK_USER.email)!;
    expect(
      shares.map((share) => [share.permission, share.history_visible]),
    ).toEqual([
      ["VIEW", true],
      ["VIEW", false],
      ["EDIT", null],
    ]);
  });

  test("the owner can have no grants, including on their own EDIT copy", () => {
    for (const character of MOCK_CHARACTERS.owned.slice(1)) {
      expect(getMockCharacterShares(character.id, MOCK_USER.email)).toEqual([]);
    }
  });

  test("a non-owner, a VIEW recipient and an unknown character reveal no grants", () => {
    expect(
      getMockCharacterShares(aldric.id, "nobody@example.com"),
    ).toBeUndefined();
    expect(
      getMockCharacterShares(
        MOCK_CHARACTERS.shared_view[0].id,
        MOCK_USER.email,
      ),
    ).toBeUndefined();
    expect(getMockCharacterShares("missing", MOCK_USER.email)).toBeUndefined();
  });

  test("changing a returned record cannot change the stored grants", () => {
    const shares = getMockCharacterShares(aldric.id, MOCK_USER.email)!;
    shares[0].recipient_email = "changed@example.com";
    shares.length = 0;
    const again = getMockCharacterShares(aldric.id, MOCK_USER.email)!;
    expect(again).toHaveLength(3);
    expect(again[0].recipient_email).toBe("user@example.com");
  });
});

describe("the access tab", () => {
  test("the owner can open access and return to their sheet without losing edits", async () => {
    const router = createMemoryRouter(routes, {
      initialEntries: [generatePath(ROUTES.character, { id: aldric.id })],
    });
    const user = userEvent.setup();
    render(
      <AuthProvider initialUser={MOCK_USER}>
        <RouterProvider router={router} />
      </AuthProvider>,
    );
    const name = screen.getByRole("textbox", { name: "Имя" });
    await user.clear(name);
    await user.type(name, "Changed");
    await user.click(screen.getByRole("tab", { name: "Доступ" }));
    expect(screen.getByText("user@example.com")).toBeInTheDocument();
    const crumbs = screen.getByRole("navigation", { name: "Хлебные крошки" });
    expect(within(crumbs).getByText("Доступ")).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(router.state.location.state).toEqual({ activeTab: "access" });
    await user.click(screen.getByRole("tab", { name: "Лист" }));
    expect(screen.getByRole("textbox", { name: "Имя" })).toHaveValue("Changed");
  });
});
