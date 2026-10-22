import { getRangeMessage, parseNumber } from "./numberField";
import type { FieldValue, SheetField } from "./sheetTypes";

// Возвращает текст ошибки по ui-ux (Dynamic Character Sheet → Типы полей) или undefined.
// Типы resource и calculated добавляются вместе с их компонентами.
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

    case "number": {
      // Из данных приходит число, из поля ввода строка (пустая, пока человек стёр значение).
      const number =
        typeof value === "number" ? value : parseNumber(`${value}`);
      // Нет границ — в ui-ux нет и текста для пустого поля; TODO: утвердить формулировку.
      const rangeMessage = getRangeMessage(field);
      if (number === undefined) return rangeMessage ?? "Нужно число";
      if (field.min !== undefined && number < field.min) return rangeMessage;
      if (field.max !== undefined && number > field.max) return rangeMessage;
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
