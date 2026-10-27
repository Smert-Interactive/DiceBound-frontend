import type { SheetDraft } from "./sheetDraft";
import type { SheetSchemaBody } from "./sheetTypes";
import { validateField } from "./validateField";

// Ошибки всех полей листа по id. Поле без ошибки в результат не попадает.
// calculated не проверяем: его ошибка — следствие ошибки в числе, второй счёт не нужен.
// Вызывается при каждом рендере вместе с recalculateSheet, ничего не хранит.
export function validateSheet(
  schema: SheetSchemaBody,
  draft: SheetDraft,
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const section of schema.sections) {
    for (const field of section.fields) {
      if (field.type === "calculated") continue;
      const message = validateField(field, draft[field.id]);
      if (message) errors[field.id] = message;
    }
  }

  return errors;
}
