import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const BrowserDateTimeFormat = Intl.DateTimeFormat;

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.resetModules();
});

// Имитируем браузер UTC+14: поздний вечер UTC уже относится к следующему дню.
// Явный timeZone: "UTC" в компоненте переопределит местную зону и сломает эту проверку.
test("shows the local sharing date across a UTC day boundary", async () => {
  vi.spyOn(Intl, "DateTimeFormat").mockImplementation(
    function (locales, options) {
      return new BrowserDateTimeFormat(locales, {
        ...options,
        timeZone: options?.timeZone ?? "Pacific/Kiritimati",
      });
    },
  );
  const { default: CharacterAccess } =
    await import("../components/CharacterAccess");
  const createdAt = "2026-09-24T23:30:00Z";
  render(
    <CharacterAccess
      shares={[
        {
          id: "share-1",
          character_id: "character-1",
          user_id: "user-1",
          recipient_email: "friend@example.com",
          permission: "VIEW",
          history_visible: true,
          created_at: createdAt,
        },
      ]}
    />,
  );

  expect(screen.getByText("25.09.2026")).toHaveAttribute("dateTime", createdAt);
  expect(screen.queryByText("24.09.2026")).not.toBeInTheDocument();
});
