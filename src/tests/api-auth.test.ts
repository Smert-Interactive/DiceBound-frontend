import { afterEach, describe, expect, test, vi } from "vitest";
import { apiRequest, ApiError } from "../api/client";
import {
  getCurrentUser,
  register,
  RegistrationSignInError,
  signIn,
  signOut,
} from "../api/auth";
import { MOCK_USER } from "../mocks/authUser";

const credentials = {
  email: "player@example.com",
  password: " safe-password ",
};
afterEach(() => vi.unstubAllGlobals());

describe("API transport", () => {
  test("sends cookie, relative URL, original JSON and AbortSignal", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json(MOCK_USER));
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();
    await apiRequest("/example", {
      method: "POST",
      body: credentials,
      signal: controller.signal,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/example",
      expect.objectContaining({
        credentials: "include",
        method: "POST",
        body: JSON.stringify(credentials),
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      }),
    );
  });
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

describe("authentication contract", () => {
  test("registers, logs in and uses only the profile returned by /me", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json(
          { ...MOCK_USER, username: "registered" },
          { status: 201 },
        ),
      )
      .mockResolvedValueOnce(Response.json({ ...MOCK_USER, username: "login" }))
      .mockResolvedValueOnce(
        Response.json({
          ...MOCK_USER,
          username: "profile",
          owned_characters_count: 17,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const result = await register({
      ...credentials,
      passwordConfirmation: credentials.password,
    });
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "/api/v1/auth/register",
      "/api/v1/auth/login",
      "/api/v1/auth/me",
    ]);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      ...credentials,
      password_confirmation: credentials.password,
    });
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual(credentials);
    expect(result).toMatchObject({
      username: "profile",
      owned_characters_count: 17,
    });
  });
  test("does not attempt login after a failed registration", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        Response.json(
          { code: "CONFLICT", message: "Conflict" },
          { status: 409 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      register({ ...credentials, passwordConfirmation: credentials.password }),
    ).rejects.toMatchObject({ status: 409 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  test("reports a created account when automatic login fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(Response.json(MOCK_USER, { status: 201 }))
        .mockRejectedValueOnce(new TypeError("Offline")),
    );
    await expect(
      register({ ...credentials, passwordConfirmation: credentials.password }),
    ).rejects.toBeInstanceOf(RegistrationSignInError);
  });
  test("does not treat login as successful if /me fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json(MOCK_USER))
      .mockResolvedValueOnce(
        Response.json({ code: "UNAUTHORIZED" }, { status: 401 }),
      );
    vi.stubGlobal("fetch", fetchMock);
    await expect(signIn(credentials)).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
