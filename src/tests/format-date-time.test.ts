import { expect, test } from "vitest";
import { formatDateTime } from "../shared/formatDateTime";

// Локальная полночь может относиться к другому дню UTC: дата не должна сдвигаться.
test("formats local midnight with a non-breaking space and a zero hour", () => {
  const local = new Date(2026, 0, 1, 0, 5);
  expect(formatDateTime(local.toISOString())).toBe("01.01.2026\u00a000:05");
});

// Проверяем зимнюю и летнюю даты: форматтер учитывает часовой пояс и сезонное смещение.
test.each([0, 6])("formats local time in month %s", (month) => {
  const local = new Date(2026, month, 24, 18, 42);
  const date = month === 0 ? "24.01.2026" : "24.07.2026";
  expect(formatDateTime(local.toISOString())).toBe(`${date}\u00a018:42`);
});
