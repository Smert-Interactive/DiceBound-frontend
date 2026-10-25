import { afterEach, describe, expect, test } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  createMemoryRouter,
  generatePath,
  RouterProvider,
} from "react-router-dom";

import { routes } from "../app/router";
import AuthProvider from "../auth/AuthProvider";
import { MOCK_USER } from "../auth/authContext";
import { ROUTES } from "../constants/routes";
import { getMockCharacterDetails } from "../mocks/characterDetails";
import {
  getMockCharacterVersion,
  getMockCharacterVersions,
} from "../mocks/characterVersions";
import { MOCK_CHARACTERS } from "../mocks/characters";
import { getMockSheetSchema } from "../mocks/sheetSchemas";
import { formatDateTime } from "../shared/formatDateTime";

const aldricId = MOCK_CHARACTERS.owned[0].id;
const sarahId = MOCK_CHARACTERS.owned[1].id;

afterEach(cleanup);

function renderVersion(
  version: string,
  email = MOCK_USER.email,
  characterId = aldricId,
) {
  const router = createMemoryRouter(routes, {
    initialEntries: [
      generatePath(ROUTES.characterVersion, { id: characterId, version }),
    ],
  });
  render(
    <AuthProvider initialUser={{ ...MOCK_USER, email }}>
      <RouterProvider router={router} />
    </AuthProvider>,
  );
  return { router, user: userEvent.setup() };
}

describe("mock version snapshots", () => {
  test.each([aldricId, sarahId])(
    "contains every field from the schema for %s",
    (id) => {
      const character = getMockCharacterDetails(id)!;
      const schema = getMockSheetSchema(character.sheet_schema_id)!;
      const keys = schema.schema.sections
        .flatMap((section) => section.fields.map((field) => field.id))
        .sort();
      for (const summary of getMockCharacterVersions(id, MOCK_USER.email)!) {
        const snapshot = getMockCharacterVersion(
          id,
          summary.version_number,
          MOCK_USER.email,
        )!;
        expect(snapshot).toMatchObject({
          id: summary.id,
          character_id: id,
          version_number: summary.version_number,
          created_at: summary.created_at,
        });
        expect(Object.keys(snapshot.data).sort()).toEqual(keys);
      }
      expect(
        getMockCharacterVersion(
          id,
          character.current_version_number,
          MOCK_USER.email,
        )!.data,
      ).toEqual(character.data);
    },
  );

  test("keeps historical values, including calculated and nested resources", () => {
    const snapshot = getMockCharacterVersion(aldricId, 4, MOCK_USER.email)!;
    expect(snapshot.data).toMatchObject({
      level: 2,
      str: 15,
      str_modifier: 2,
      hp: { current: 20, max: 20 },
    });
    snapshot.data.str_modifier = 100;
    if (typeof snapshot.data.hp === "object") snapshot.data.hp.current = 0;
    expect(
      getMockCharacterVersion(aldricId, 4, MOCK_USER.email)!.data,
    ).toMatchObject({ str_modifier: 2, hp: { current: 20, max: 20 } });
    expect(getMockCharacterDetails(aldricId)!.data.str_modifier).toBe(0);
  });

  test.each([0, -1, 1.5, 8, NaN, Infinity])(
    "rejects an invalid or missing version: %s",
    (version) => {
      expect(
        getMockCharacterVersion(aldricId, version, MOCK_USER.email),
      ).toBeUndefined();
    },
  );

  test("does not expose another account's snapshot", () => {
    expect(
      getMockCharacterVersion(aldricId, 4, "new@example.com"),
    ).toBeUndefined();
    expect(
      getMockCharacterVersion("missing", 4, MOCK_USER.email),
    ).toBeUndefined();
  });
});

describe("character version page", () => {
  test("shows snapshot metadata and returns to the history tab", async () => {
    const { user, router } = renderVersion("4");
    const snapshot = getMockCharacterVersion(aldricId, 4, MOCK_USER.email)!;
    expect(
      screen.getByText(
        `Версия 4 · ${formatDateTime(snapshot.created_at).replace(/\u00a0/gu, " ")}`,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Только просмотр. Текущая версия персонажа — 7."),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Aldric" })).toBeInTheDocument();
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.queryByRole("button", { name: "Сохранить" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Открыть меню" })).toBeNull();
    // Баннер и мобильная шапка ведут к одной вкладке независимо от предыдущего адреса.
    const links = screen.getAllByRole("link", { name: "К истории" });
    expect(links).toHaveLength(2);
    await user.click(links.at(-1)!);
    expect(router.state.location.pathname).toBe(
      generatePath(ROUTES.character, { id: aldricId }),
    );
    expect(screen.getByRole("tab", { name: "История" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(
      within(
        screen.getByRole("region", { name: "История версий" }),
      ).getAllByRole("listitem"),
    ).toHaveLength(7);
  });

  test("does not offer to restore the current version", () => {
    renderVersion("7");
    expect(screen.queryByRole("button", { name: /Восстановить/u })).toBeNull();
  });

  test.each(["0", "-1", "1.5", "8", "abc", "01"])(
    "shows the same 404 for an invalid version: %s",
    (version) => {
      renderVersion(version);
      expect(
        screen.getByRole("heading", {
          name: "Персонаж не найден или доступ закрыт",
        }),
      ).toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: "Aldric" })).toBeNull();
    },
  );

  test("shows 404 when a different account opens the snapshot directly", () => {
    renderVersion("4", "new@example.com");
    expect(
      screen.getByRole("heading", {
        name: "Персонаж не найден или доступ закрыт",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Только просмотр. Текущая версия персонажа — 7."),
    ).toBeNull();
  });
});
