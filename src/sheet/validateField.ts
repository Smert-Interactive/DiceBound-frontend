import type { FieldValue, SheetField } from "./sheetTypes";

// Возвращает текст ошибки по ui-ux (Dynamic Character Sheet → Типы полей) или undefined.
// Типы number, resource и calculated добавляются вместе с их компонентами.
export function validateField(
  field: SheetField,
  value: FieldValue | undefined,
): string | undefined {
  switch (field.type) {
    case "text": {
      const text = typeof value === "string" ? value : "";
      if (field.required && text.trim() === "") return "Обязательное поле";
      if (field.maxLength !== undefined && text.length > field.maxLength) {
        return `Не длиннее ${field.maxLength} символов`;
      }
      return undefined;
    }

    case "select": {
      const isKnown = field.options.some((option) => option.value === value);
      return isKnown ? undefined : "Значение не из списка options";
    }

    default:
      return undefined;
  }
}
