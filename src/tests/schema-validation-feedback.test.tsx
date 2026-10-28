import { afterEach, expect, test } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import SchemaValidationFeedback from "../components/SchemaValidationFeedback";

afterEach(cleanup);

test.each([
  [1, "Найдена 1 ошибка"],
  [2, "Найдено 2 ошибки"],
  [5, "Найдено 5 ошибок"],
  [11, "Найдено 11 ошибок"],
  [21, "Найдена 21 ошибка"],
] as const)(
  "uses the correct Russian title for %i validation errors",
  (count, title) => {
    render(
      <SchemaValidationFeedback
        pending={false}
        requestFailed={false}
        result={{
          valid: false,
          schema: null,
          summary: null,
          errors: Array.from({ length: count }, (_, index) => ({
            path: `fields[${index}]`,
            message: "Ошибка поля",
            line: null,
          })),
        }}
      />,
    );
    expect(screen.getByText(title)).toBeInTheDocument();
  },
);
