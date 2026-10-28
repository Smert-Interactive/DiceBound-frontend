import { afterEach, beforeEach, expect, test, vi } from "vitest";

const originalId = "c1a00000-0000-4000-8000-000000000001";
const owner = "alex@example.com";

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

// Дожидаемся mock-ответа, не тратя реальное время на задержку запроса.
async function respond<T>(request: Promise<T>) {
  await vi.runAllTimersAsync();
  return request;
}

test.each([
  ["user@example.com", true],
  ["player@example.com", false],
])(
  "%s can read snapshots only when history is shared",
  async (email, allowed) => {
    const history = await import("../mocks/characterVersions");
    expect(Boolean(history.getMockCharacterVersions(originalId, email))).toBe(
      allowed,
    );
    expect(Boolean(history.getMockCharacterVersion(originalId, 4, email))).toBe(
      allowed,
    );
  },
);

test.each(["user@example.com", "player@example.com", "editor@example.com"])(
  "%s cannot save, restore or manage grants on the original",
  async (email) => {
    const history = await import("../mocks/characterVersions");
    const shares = await import("../mocks/characterShares");
    const details = await import("../mocks/characterDetails");
    const before = details.getMockCharacterDetails(originalId, owner)!;
    const grants = shares.getMockCharacterShares(originalId, owner)!;
    expect(shares.getMockCharacterShares(originalId, email)).toBeUndefined();
    const rejections = [
      expect(
        history.saveMockCharacterVersion(
          originalId,
          { ...before.data, level: 20 },
          email,
        ),
      ).rejects.toThrow("NOT_FOUND_OR_FORBIDDEN"),
      expect(
        history.restoreMockCharacterVersion(originalId, 4, email),
      ).rejects.toThrow("NOT_FOUND_OR_FORBIDDEN"),
      expect(
        shares.revokeMockCharacterShare(originalId, grants[0].id, email),
      ).rejects.toThrow("NOT_FOUND_OR_FORBIDDEN"),
      expect(
        shares.createMockCharacterShare(
          originalId,
          {
            permission: "VIEW",
            recipient_email: "gm@example.com",
            history_visible: true,
          },
          email,
        ),
      ).rejects.toMatchObject({ code: "NOT_FOUND_OR_FORBIDDEN" }),
    ];
    await vi.runAllTimersAsync();
    await Promise.all(rejections);
    expect(details.getMockCharacterDetails(originalId, owner)).toEqual(before);
    expect(shares.getMockCharacterShares(originalId, owner)).toEqual(grants);
  },
);

test("history visibility can change only after VIEW is revoked and issued again", async () => {
  const history = await import("../mocks/characterVersions");
  const shares = await import("../mocks/characterShares");
  const details = await import("../mocks/characterDetails");
  const recipient = "player@example.com";
  const existing = shares
    .getMockCharacterShares(originalId, owner)!
    .find((share) => share.recipient_email === recipient)!;
  const rejection = expect(
    shares.createMockCharacterShare(
      originalId,
      { permission: "VIEW", recipient_email: recipient, history_visible: true },
      owner,
    ),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  await vi.runAllTimersAsync();
  await rejection;
  expect(
    details.getMockCharacterDetails(originalId, recipient)?.can_view_history,
  ).toBe(false);
  expect(
    history.getMockCharacterVersion(originalId, 4, recipient),
  ).toBeUndefined();

  await respond(
    shares.revokeMockCharacterShare(originalId, existing.id, owner),
  );
  expect(
    details.getMockCharacterDetails(originalId, recipient),
  ).toBeUndefined();
  await respond(
    shares.createMockCharacterShare(
      originalId,
      { permission: "VIEW", recipient_email: recipient, history_visible: true },
      owner,
    ),
  );
  expect(
    details.getMockCharacterDetails(originalId, recipient)?.can_view_history,
  ).toBe(true);
  expect(history.getMockCharacterVersions(originalId, recipient)).toHaveLength(
    7,
  );
  expect(
    history.getMockCharacterVersion(originalId, 4, recipient)?.version_number,
  ).toBe(4);
});
