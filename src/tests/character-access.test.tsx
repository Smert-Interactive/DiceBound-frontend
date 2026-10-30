import { describe, expect, test } from "vitest";

import { MOCK_USER } from "../mocks/authUser";
import { getMockCharacterShares } from "../mocks/characterShares";
import { MOCK_CHARACTERS } from "../mocks/characters";

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
