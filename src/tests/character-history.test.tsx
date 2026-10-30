import { describe, expect, test } from "vitest";

import { MOCK_USER } from "../mocks/authUser";
import { getMockCharacterDetails } from "../mocks/characterDetails";
import { getMockCharacterVersions } from "../mocks/characterVersions";
import { MOCK_CHARACTERS } from "../mocks/characters";

const aldricId = MOCK_CHARACTERS.owned[0].id;
const sarahId = MOCK_CHARACTERS.owned[1].id;

describe("mock version history", () => {
  test.each([aldricId, sarahId])(
    "returns every version from newest to oldest for %s",
    (characterId) => {
      const character = getMockCharacterDetails(characterId)!;
      const versions = getMockCharacterVersions(characterId, MOCK_USER.email)!;
      const count = character.current_version_number;

      expect(versions.map((version) => version.version_number)).toEqual(
        Array.from({ length: count }, (_, index) => count - index),
      );
      expect(versions.filter((version) => version.is_current)).toEqual([
        versions[0],
      ]);
      expect(Date.parse(versions[0].created_at)).toBe(
        Date.parse(character.updated_at),
      );
      expect(Date.parse(versions.at(-1)!.created_at)).toBe(
        Date.parse(character.created_at),
      );
      expect(new Set(versions.map((version) => version.id)).size).toBe(count);
    },
  );

  test("does not expose another account's history or an unknown character", () => {
    expect(
      getMockCharacterVersions(aldricId, "new@example.com"),
    ).toBeUndefined();
    expect(
      getMockCharacterVersions("missing", MOCK_USER.email),
    ).toBeUndefined();
  });

  test("does not expose VIEW history when it is not shared", () => {
    const shared = MOCK_CHARACTERS.shared_view[0];
    expect(
      getMockCharacterVersions(shared.id, MOCK_USER.email),
    ).toBeUndefined();
  });

  test("returns copies so a caller cannot modify the stored list", () => {
    const first = getMockCharacterVersions(aldricId, MOCK_USER.email)!;
    first[0].version_number = 100;
    first.pop();

    const second = getMockCharacterVersions(aldricId, MOCK_USER.email)!;
    expect(second).toHaveLength(7);
    expect(second[0].version_number).toBe(7);
  });
});
