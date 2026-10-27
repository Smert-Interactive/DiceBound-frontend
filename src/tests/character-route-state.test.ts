import { describe, expect, test } from "vitest";

import { getActiveTab, getRestoreNotice } from "../shared/characterRouteState";

describe("character route state", () => {
  test.each(["sheet", "history", "access"])("reads the %s tab", (tab) => {
    expect(getActiveTab({ activeTab: tab })).toBe(tab);
  });

  test.each([null, undefined, "history", 7, {}, { activeTab: "settings" }])(
    "ignores state without a known tab: %j",
    (state) => {
      expect(getActiveTab(state)).toBeUndefined();
    },
  );

  test("reads the restore notice only when it is a string", () => {
    expect(getRestoreNotice({ restoreNotice: "Готово" })).toBe("Готово");
    expect(getRestoreNotice({ restoreNotice: 3 })).toBeNull();
    expect(getRestoreNotice({ activeTab: "sheet" })).toBeNull();
    expect(getRestoreNotice(null)).toBeNull();
  });
});
