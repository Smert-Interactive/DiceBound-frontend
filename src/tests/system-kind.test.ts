import { expect, test } from "vitest";

import { getSystemKind } from "../shared/systemKind";

// Названия встроенных систем backend может дополнять: «Call of Cthulhu (simplified)».
test.each([
  ["D&D 5e", "dnd"],
  ["Call of Cthulhu", "coc"],
  ["Call of Cthulhu (simplified)", "coc"],
  ["Custom System", "imported"],
  ["My Call of Cthulhu", "imported"],
  ["", "imported"],
])("%j is %s", (name, kind) => {
  expect(getSystemKind(name)).toBe(kind);
});
