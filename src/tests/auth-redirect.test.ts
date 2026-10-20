import { describe, expect, test } from "vitest";

import { getLoginRedirect } from "../auth/getLoginRedirect";
import { ROUTES } from "../constants/routes";

describe("getLoginRedirect", () => {
  test.each([
    undefined,
    null,
    {},
    { from: null },
    { from: "/profile" },
    { from: {} },
    { from: { pathname: 42 } },
  ])("falls back to characters for missing or malformed state: %j", (state) => {
    expect(getLoginRedirect(state)).toBe(ROUTES.characters);
  });

  // Внешний адрес не должен стать целью перехода, а /login не должен создать цикл.
  test.each([
    "https://example.com",
    "//example.com",
    "/\\example.com",
    "profile",
    ROUTES.login,
    `${ROUTES.login}/`,
  ])("rejects an external, relative or looping pathname: %s", (pathname) => {
    expect(getLoginRedirect({ from: { pathname } })).toBe(ROUTES.characters);
  });

  test("preserves an internal pathname, query string and fragment", () => {
    expect(
      getLoginRedirect({
        from: {
          pathname: ROUTES.profile,
          search: "?source=login",
          hash: "#details",
        },
      }),
    ).toEqual({
      pathname: ROUTES.profile,
      search: "?source=login",
      hash: "#details",
    });
  });

  test("uses empty search and hash when their values are missing or invalid", () => {
    expect(
      getLoginRedirect({
        from: { pathname: ROUTES.profile, search: 42, hash: null },
      }),
    ).toEqual({ pathname: ROUTES.profile, search: "", hash: "" });
  });
});
