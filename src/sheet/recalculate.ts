import { CALCULATION_FAILED, getDependencyError } from "./calculatedField";
import { calculate, getFormulaFieldIds } from "./formula/evaluate";
import { parseNumber } from "./numberField";
import type { SheetDraft } from "./sheetDraft";
import type { CalculatedField, SheetSchemaBody } from "./sheetTypes";

export interface SheetCalculation {
  // Результат формулы по id поля; undefined — посчитать нельзя.
  values: Record<string, number | undefined>;
  // Ошибка по id поля calculated: зависимость от неверного поля или общий сбой формулы.
  errors: Record<string, string>;
}

// Пересчитывает все calculated по черновику. Формула видит number-поля и другие calculated.
// Вызывается при каждом рендере листа, поэтому ничего не хранит между вызовами.
export function recalculateSheet(
  schema: SheetSchemaBody,
  draft: SheetDraft,
): SheetCalculation {
  const fields = schema.sections.flatMap((section) => section.fields);
  const labels = new Map(fields.map((field) => [field.id, field.label]));
  const formulas = new Map<string, CalculatedField>();
  const numbers: Record<string, number> = {};

  for (const field of fields) {
    if (field.type === "calculated") formulas.set(field.id, field);
    if (field.type !== "number") continue;
    const value = parseNumber(String(draft[field.id] ?? ""));
    // NaN: поле есть, но числа в нём нет; движок ответит not_a_number, а не unknown_field.
    numbers[field.id] = value ?? NaN;
  }

  const values: Record<string, number | undefined> = {};
  const errors: Record<string, string> = {};
  const done = new Set<string>();
  // Поля, которые считаются прямо сейчас: повторный заход значит цикл.
  const inProgress = new Set<string>();

  function resolve(id: string) {
    if (done.has(id) || inProgress.has(id)) return;
    const field = formulas.get(id);
    if (!field) return;

    inProgress.add(id);
    const scope: Record<string, number> = { ...numbers };
    for (const refId of getFormulaFieldIds(field.formula)) {
      if (!formulas.has(refId)) continue;
      // Calculated, на который ссылается формула, считается раньше; при цикле он останется пустым.
      resolve(refId);
      const value = values[refId];
      if (value !== undefined) scope[refId] = value;
    }
    inProgress.delete(id);

    const result = calculate(field.formula, scope);
    if (result.ok) {
      values[id] = result.value;
    } else {
      values[id] = undefined;
      const badId = result.error.fieldId;
      errors[id] =
        result.error.code === "not_a_number" && badId
          ? getDependencyError([labels.get(badId) ?? badId])
          : CALCULATION_FAILED;
    }
    done.add(id);
  }

  for (const id of formulas.keys()) resolve(id);

  return { values, errors };
}
