import { describe, expect, test } from "vitest";

import { pluralize } from "../shared/pluralize";

const versions = { one: "версию", few: "версии", many: "версий" };

describe("pluralize", () => {
  test.each([
    [1, "версию"],
    [21, "версию"],
    [2, "версии"],
    [4, "версии"],
    [22, "версии"],
    [0, "версий"],
    [5, "версий"],
    [11, "версий"],
    [12, "версий"],
    [25, "версий"],
  ])("picks the Russian form for %i", (count, expected) => {
    expect(pluralize(count, versions)).toBe(expected);
  });
});
