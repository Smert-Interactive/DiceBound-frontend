import { describe, expect, test } from "vitest";

import { MOCK_USER } from "../mocks/authUser";
import { getMockCharacterDetails } from "../mocks/characterDetails";
import {
  getMockCharacterVersion,
  getMockCharacterVersions,
} from "../mocks/characterVersions";
import { MOCK_CHARACTERS } from "../mocks/characters";
import { getMockSheetSchema } from "../mocks/sheetSchemas";

const aldricId = MOCK_CHARACTERS.owned[0].id;
const sarahId = MOCK_CHARACTERS.owned[1].id;

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
