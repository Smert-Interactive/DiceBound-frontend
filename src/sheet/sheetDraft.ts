import { formatNumberInput, parseNumber } from "./numberField";
import { toResourceDraft, type ResourceDraft } from "./resourceField";
import type { CharacterData, SheetField, SheetSchemaBody } from "./sheetTypes";

// Значение поля так, как оно набрано на листе: number и текстовые поля хранят строку
// (пока человек печатает, она бывает пустой), checkbox — булево, resource — две строки.
export type SheetDraftValue = string | boolean | ResourceDraft;

// Черновик листа по field.id. Поля calculated в нём нет: их значения считает движок формул.
export type SheetDraft = Record<string, SheetDraftValue>;

// Собирает поля независимо от количества и порядка секций.
function allFields(schema: SheetSchemaBody): SheetField[] {
  return schema.sections.flatMap((section) => section.fields);
}

// Данные персонажа → черновик. Нет значения — поле пустое, лист не падает.
export function toDraft(
  schema: SheetSchemaBody,
  data: CharacterData,
): SheetDraft {
  const draft: SheetDraft = {};

  for (const field of allFields(schema)) {
    const value = data[field.id];

    switch (field.type) {
      case "text":
      case "select":
        draft[field.id] = typeof value === "string" ? value : "";
        break;
      case "number":
        draft[field.id] =
          typeof value === "number" ? formatNumberInput(value) : "";
        break;
      case "checkbox":
        draft[field.id] = value === true;
        break;
      case "resource":
        draft[field.id] =
          typeof value === "object"
            ? toResourceDraft(value)
            : { current: "", max: "" };
        break;
      case "calculated":
        break;
    }
  }

  return draft;
}

// Черновик → данные для сохранения: строки становятся числами. Только пользовательские
// значения: backend сам считает формулы и отвечает 422, если calculated пришёл в запросе
// (technical-contracts, SaveCharacterRequest). Вызывать после validateSheet без ошибок;
// значение, которое всё же не разобралось, в данные не попадает.
export function toCharacterData(
  schema: SheetSchemaBody,
  draft: SheetDraft,
): CharacterData {
  const data: CharacterData = {};

  for (const field of allFields(schema)) {
    const value = draft[field.id];

    switch (field.type) {
      case "text":
        if (typeof value === "string") data[field.id] = value;
        break;
      case "select":
        if (typeof value === "string" && value !== "") data[field.id] = value;
        break;
      case "number": {
        const number =
          typeof value === "string" ? parseNumber(value) : undefined;
        if (number !== undefined) data[field.id] = number;
        break;
      }
      case "checkbox":
        data[field.id] = value === true;
        break;
      case "resource": {
        if (typeof value !== "object") break;
        const current = parseNumber(value.current);
        const max = parseNumber(value.max);
        if (current !== undefined && max !== undefined) {
          data[field.id] = { current, max };
        }
        break;
      }
      case "calculated":
        break;
    }
  }

  return data;
}

// Сравнивает ресурс по значениям, а остальные поля — по содержимому черновика.
function isSameValue(a: SheetDraftValue, b: SheetDraftValue | undefined) {
  if (typeof a === "object" && typeof b === "object") {
    return a.current === b.current && a.max === b.max;
  }
  return a === b;
}

// id полей, которые отличаются от сохранённых значений: у них рамка «изменено».
export function getChangedFieldIds(
  draft: SheetDraft,
  baseline: SheetDraft,
): Set<string> {
  const changed = new Set<string>();

  for (const [id, value] of Object.entries(draft)) {
    if (!isSameValue(value, baseline[id])) changed.add(id);
  }

  return changed;
}

// Значения calculated, сохранённые в данных персонажа (так их отдаёт backend).
// undefined — значения нет или оно не число.
export function getStoredCalculated(
  schema: SheetSchemaBody,
  data: CharacterData,
): Record<string, number | undefined> {
  const result: Record<string, number | undefined> = {};

  for (const field of allFields(schema)) {
    if (field.type !== "calculated") continue;
    const value = data[field.id];
    result[field.id] = typeof value === "number" ? value : undefined;
  }

  return result;
}
