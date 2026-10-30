import { formatNumberInput, getRangeMessage, parseNumber } from "./numberField";
import type { ResourceField, ResourceValue } from "./sheetTypes";

// То, что набрано в двух полях ресурса: строки, пока человек печатает (как у number).
export interface ResourceDraft {
  current: string;
  max: string;
}

export type ResourceInput = ResourceValue | ResourceDraft;

export interface ResourceError {
  message: string;
  // Поле, у которого показывается ошибка (aria-invalid и красная рамка).
  target: "current" | "max";
}

// Числа из API остаются редактируемыми, включая очень большие и малые значения.
export function toResourceDraft(value: ResourceValue): ResourceDraft {
  return {
    current: formatNumberInput(value.current),
    max: formatNumberInput(value.max),
  };
}

// Ресурс принимает только конечные числа, как серверный Character.data.
function toNumber(value: number | string): number | undefined {
  return typeof value === "number"
    ? Number.isFinite(value)
      ? value
      : undefined
    : parseNumber(value);
}

// Ошибки по ui-ux и контракту: min <= current <= max, max не меньше min.
export function getResourceError(
  field: Pick<ResourceField, "min">,
  value: ResourceInput,
): ResourceError | undefined {
  const current = toNumber(value.current);
  const max = toNumber(value.max);

  if (current === undefined || max === undefined) {
    return {
      message: "Нужно число в current и max",
      target: current === undefined ? "current" : "max",
    };
  }

  if (field.min !== undefined && max < field.min) {
    return {
      message: getRangeMessage({ min: field.min }) ?? "",
      target: "max",
    };
  }

  if ((field.min !== undefined && current < field.min) || current > max) {
    return {
      message: getRangeMessage({ min: field.min, max }) ?? "",
      target: "current",
    };
  }

  return undefined;
}

// Доля заполнения полосы 0…1; при пустых и неверных значениях или max <= 0 полоса пуста.
export function getResourceRatio(value: ResourceInput): number {
  const current = toNumber(value.current);
  const max = toNumber(value.max);

  if (current === undefined || max === undefined || max <= 0) return 0;

  return Math.min(1, Math.max(0, current / max));
}
