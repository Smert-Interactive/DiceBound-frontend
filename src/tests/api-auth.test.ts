import { afterEach, describe, expect, test, vi } from "vitest";
import { getCurrentUser, signOut } from "../api/auth";
import { ApiError, apiRequest } from "../api/client";

afterEach(() => vi.unstubAllGlobals());

describe("API transport", () => {
  test("accepts a 204 without parsing JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
    );
    await expect(signOut()).resolves.toBeUndefined();
  });
  test("preserves status, code, message, details and Retry-After", async () => {
    const details = [{ field: "data.strength", message: "Invalid" }];
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { code: "VALIDATION_ERROR", message: "Invalid data", details },
            { status: 422, headers: { "Retry-After": "60" } },
          ),
        ),
    );
    await expect(apiRequest("/example")).rejects.toMatchObject({
      status: 422,
      code: "VALIDATION_ERROR",
      message: "Invalid data",
      details,
      retryAfter: "60",
    });
  });
  test("handles an HTML error from a proxy", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response("<html>Bad gateway</html>", { status: 502 }),
        ),
    );
    await expect(getCurrentUser()).rejects.toMatchObject({
      status: 502,
      code: "HTTP_ERROR",
    });
  });
  test("keeps cancellation distinct from HTTP failures", async () => {
    const failure = new DOMException("Aborted", "AbortError");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(failure));
    await expect(getCurrentUser()).rejects.toBe(failure);
    expect(failure).not.toBeInstanceOf(ApiError);
  });
});
