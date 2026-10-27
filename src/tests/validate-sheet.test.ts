import { describe, expect, test } from "vitest";

import { getMockCharacterDetails } from "../mocks/characterDetails";
import { MOCK_CHARACTERS } from "../mocks/characters";
import { DND_SCHEMA } from "../mocks/sheetSchemas";
import { toDraft } from "../sheet/sheetDraft";
import { validateSheet } from "../sheet/validateSheet";

const schema = DND_SCHEMA.schema;
const data = getMockCharacterDetails(MOCK_CHARACTERS.owned[0].id)!.data;

describe("validateSheet", () => {
  test("saved data has no errors", () => {
    expect(validateSheet(schema, toDraft(schema, data))).toEqual({});
  });

  test("an emptied number and an out-of-range number are errors of that field only", () => {
    const draft = toDraft(schema, data);
    draft.str = "";
    draft.dex = "31";
    const errors = validateSheet(schema, draft);
    expect(Object.keys(errors).sort()).toEqual(["dex", "str"]);
    expect(errors.dex).toBe("Допустимо от 1 до 30");
  });

  test("calculated fields never get an error of their own", () => {
    const draft = toDraft(schema, data);
    draft.str = "";
    expect(validateSheet(schema, draft).str_modifier).toBeUndefined();
  });
});
