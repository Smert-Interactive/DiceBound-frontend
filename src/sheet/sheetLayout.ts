import { getFormulaFieldIds } from "./formula/evaluate";
import type { CalculatedField, NumberField, SheetField } from "./sheetTypes";

// Пара «значение | модификатор»: число и следующее за ним вычисляемое поле.
export interface SheetPair {
  number: NumberField;
  calculated: CalculatedField;
}

// Секция раскладывается на блоки в порядке массива fields: обычные поля идут по сетке
// в 4 колонки, подряд идущие пары — отдельной сеткой в 3 колонки (ui-ux, «Секции и сетка»).
export type SheetBlock =
  | { type: "fields"; fields: SheetField[] }
  | { type: "pairs"; pairs: SheetPair[] };

// Пара — это number, сразу за которым стоит calculated, чья формула ссылается на это число.
// Системы здесь не различаются: правило одинаково для D&D, CoC и импортированных схем.
function isPair(
  field: SheetField,
  following: SheetField | undefined,
): following is CalculatedField {
  return (
    field.type === "number" &&
    following?.type === "calculated" &&
    getFormulaFieldIds(following.formula).includes(field.id)
  );
}

export function buildSheetLayout(fields: readonly SheetField[]): SheetBlock[] {
  const blocks: SheetBlock[] = [];

  for (let index = 0; index < fields.length; index += 1) {
    const field = fields[index];
    const following = fields[index + 1];
    const last = blocks.at(-1);

    if (field.type === "number" && isPair(field, following)) {
      const pair: SheetPair = { number: field, calculated: following };
      if (last?.type === "pairs") {
        last.pairs.push(pair);
      } else {
        blocks.push({ type: "pairs", pairs: [pair] });
      }
      // Вычисляемое поле уже вошло в пару, второй раз его выводить не нужно.
      index += 1;
    } else if (last?.type === "fields") {
      last.fields.push(field);
    } else {
      blocks.push({ type: "fields", fields: [field] });
    }
  }

  return blocks;
}
