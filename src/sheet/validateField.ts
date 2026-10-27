import { getRangeMessage, parseNumber } from "./numberField";
import { getResourceError } from "./resourceField";
import type { ResourceDraft } from "./resourceField";
import type { FieldValue, SheetField } from "./sheetTypes";

// Возвращает текст ошибки по ui-ux (Dynamic Character Sheet → Типы полей) или undefined.
// Тип calculated добавляется вместе с его компонентом.
// Значение — как в данных персонажа или как набрано в поле (строки, у resource черновик).
export function validateField(
  field: SheetField,
  value: FieldValue | ResourceDraft | undefined,
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
      let number: number | undefined;
      if (typeof value === "number") {
        number = value;
      } else if (typeof value === "string") {
        number = parseNumber(value);
      }
      // Пустое поле без границ: текст «Нужно число», как у resource.
      const rangeMessage = getRangeMessage(field);
      if (number === undefined) return rangeMessage ?? "Нужно число";
      if (field.min !== undefined && number < field.min) return rangeMessage;
      if (field.max !== undefined && number > field.max) return rangeMessage;
      return undefined;
    }

    case "resource": {
      // Не объект (значения нет или тип не тот) — то же, что пустые current и max.
      const input =
        typeof value === "object" ? value : { current: "", max: "" };
      return getResourceError(field, input)?.message;
    }

    case "select": {
      const isKnown = field.options.some((option) => option.value === value);
      return isKnown ? undefined : "Значение не из списка options";
    }

    default:
      return undefined;
  }
}
