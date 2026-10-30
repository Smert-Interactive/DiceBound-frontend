import { ApiError } from "./client";
import type { SheetSchemaBody } from "../sheet/sheetTypes";

// Привязывает безопасные details из 422 к известным полям, сохраняя остальные ошибки общими.
export function getCharacterFieldErrors(
  error: unknown,
  schema: SheetSchemaBody,
): Record<string, string> {
  if (!(error instanceof ApiError) || error.status !== 422) return {};
  const ids = new Set(
    schema.sections.flatMap((section) =>
      section.fields.map((field) => field.id),
    ),
  );
  const errors: Record<string, string> = {};
  for (const detail of error.details ?? []) {
    const path = detail.field ?? detail.path;
    if (typeof path !== "string" || typeof detail.message !== "string")
      continue;
    const id = path.startsWith("data.") ? path.slice(5).split(".")[0] : path;
    if (ids.has(id) && !Object.hasOwn(errors, id)) errors[id] = detail.message;
  }
  return errors;
}
