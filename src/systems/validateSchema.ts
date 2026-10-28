import {
  findNodeAtLocation,
  getNodeValue,
  parseTree,
  type JSONPath,
  type ParseError,
} from "jsonc-parser";
import { parseFormula } from "../sheet/formula/parse";
import { getFormulaFunction } from "../sheet/formula/functions";
import type { FormulaNode } from "../sheet/formula/types";
import type { SheetField, SheetSchemaBody } from "../sheet/sheetTypes";
import type {
  SchemaValidationError,
  SchemaValidationResult,
} from "./schemaValidationTypes";

const FIELD_TYPES = [
  "text",
  "number",
  "select",
  "checkbox",
  "resource",
  "calculated",
];

// Сужает неизвестное JSON-значение до объекта перед чтением его свойств.
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Локальная имитация серверной проверки. UI вызывает её только через mock-сервис.
// Формулы разбираем существующим движком, но не вычисляем на выдуманных значениях полей.
export function validateSchema(text: string): SchemaValidationResult {
  const parseErrors: ParseError[] = [];
  const tree = parseTree(text, parseErrors, {
    disallowComments: true,
    allowTrailingComma: false,
    allowEmptyContent: false,
  });
  const lineAt = (offset: number) =>
    text.slice(0, offset).split(/\r\n?|\n/u).length;
  if (parseErrors.length || !tree)
    return {
      valid: false,
      schema: null,
      summary: null,
      errors: [
        {
          path: "schema_text",
          message: "Исправьте синтаксис JSON.",
          line: lineAt(parseErrors[0]?.offset ?? 0),
        },
      ],
    };

  const errors: SchemaValidationError[] = [];
  const fields = new Map<string, { field: SheetField; path: JSONPath }>();
  const formulas = new Map<string, Set<string>>();

  // Путь берём из структуры JSON, а строку — из её исходного дерева, без поиска по тексту.
  function addError(path: JSONPath, message: string) {
    const node = findNodeAtLocation(tree!, path);
    const name = path.reduce<string>(
      (result, part) =>
        typeof part === "number"
          ? `${result}[${part}]`
          : result
            ? `${result}.${part}`
            : part,
      "",
    );
    errors.push({
      path: name || "$",
      message,
      line: node ? lineAt(node.offset) : null,
    });
  }

  // Обязательные текстовые свойства не должны превращаться в пустые подписи на листе.
  function requiredText(
    object: Record<string, unknown>,
    key: string,
    path: JSONPath,
  ) {
    const value = object[key];
    if (typeof value !== "string" || !value.trim())
      addError([...path, key], "Укажите непустую строку.");
  }

  // Необязательная числовая граница должна быть конечным числом, если присутствует.
  function numberOption(
    object: Record<string, unknown>,
    key: string,
    path: JSONPath,
  ) {
    if (
      object[key] !== undefined &&
      (typeof object[key] !== "number" || !Number.isFinite(object[key]))
    ) {
      addError([...path, key], "Ожидается конечное число.");
    }
  }

  // Проверяем известные свойства шести типов полей; общие ошибки собираем за один проход.
  function validateField(
    value: unknown,
    path: JSONPath,
  ): SheetField | undefined {
    if (!isObject(value)) {
      addError(path, "Поле должно быть объектом.");
      return;
    }
    const before = errors.length;
    requiredText(value, "id", path);
    requiredText(value, "label", path);
    switch (value.type) {
      case "text":
        if (value.required !== undefined && typeof value.required !== "boolean")
          addError([...path, "required"], "Ожидается true или false.");
        if (
          value.maxLength !== undefined &&
          (typeof value.maxLength !== "number" ||
            !Number.isInteger(value.maxLength) ||
            value.maxLength < 0)
        )
          addError(
            [...path, "maxLength"],
            "Ожидается целое неотрицательное число.",
          );
        break;
      case "number":
        numberOption(value, "min", path);
        numberOption(value, "max", path);
        if (
          typeof value.min === "number" &&
          typeof value.max === "number" &&
          value.min > value.max
        )
          addError([...path, "max"], "Максимум не может быть меньше минимума.");
        break;
      case "resource":
        numberOption(value, "min", path);
        break;
      case "select": {
        if (!Array.isArray(value.options) || value.options.length === 0) {
          addError(
            [...path, "options"],
            "Добавьте хотя бы один вариант выбора.",
          );
          break;
        }
        const values = new Set<string>();
        value.options.forEach((option: unknown, index: number) => {
          const optionPath = [...path, "options", index];
          if (!isObject(option)) {
            addError(optionPath, "Вариант должен быть объектом.");
            return;
          }
          requiredText(option, "value", optionPath);
          requiredText(option, "label", optionPath);
          if (typeof option.value === "string") {
            if (values.has(option.value))
              addError(
                [...optionPath, "value"],
                "Значения вариантов не должны повторяться.",
              );
            values.add(option.value);
          }
        });
        break;
      }
      case "checkbox":
        break;
      case "calculated":
        requiredText(value, "formula", path);
        break;
      default:
        addError(
          [...path, "type"],
          `Неизвестный тип «${String(value.type)}». Допустимо: ${FIELD_TYPES.join(", ")}.`,
        );
    }
    if (errors.length === before) return value as unknown as SheetField;
  }

  const value: unknown = getNodeValue(tree);
  if (
    !isObject(value) ||
    !Array.isArray(value.sections) ||
    value.sections.length === 0
  ) {
    addError(
      isObject(value) ? ["sections"] : [],
      "Схема должна содержать непустой массив sections.",
    );
  } else {
    const sectionIds = new Set<string>();
    value.sections.forEach((section: unknown, sectionIndex: number) => {
      const path: JSONPath = ["sections", sectionIndex];
      if (!isObject(section)) {
        addError(path, "Секция должна быть объектом.");
        return;
      }
      requiredText(section, "id", path);
      requiredText(section, "label", path);
      if (typeof section.id === "string") {
        if (sectionIds.has(section.id))
          addError([...path, "id"], "Идентификатор секции уже используется.");
        sectionIds.add(section.id);
      }
      if (!Array.isArray(section.fields) || section.fields.length === 0) {
        addError([...path, "fields"], "Добавьте хотя бы одно поле.");
        return;
      }
      section.fields.forEach((item: unknown, index: number) => {
        const fieldPath = [...path, "fields", index];
        const field = validateField(item, fieldPath);
        if (!field) return;
        if (fields.has(field.id))
          addError(
            [...fieldPath, "id"],
            `Поле «${field.id}» уже существует в схеме.`,
          );
        else fields.set(field.id, { field, path: fieldPath });
      });
    });
  }

  // Разбор AST переиспользует грамматику renderer; ссылки проверяем после сбора всех полей.
  function checkFormula(
    node: FormulaNode,
    path: JSONPath,
    dependencies: Set<string>,
  ) {
    if (node.type === "field") {
      const reference = fields.get(node.id);
      if (!reference) addError(path, `Поле «${node.id}» не найдено в схеме.`);
      else if (reference.field.type === "calculated") dependencies.add(node.id);
      else if (reference.field.type !== "number")
        addError(
          path,
          `Поле «${node.id}» должно иметь тип number или calculated.`,
        );
    } else if (node.type === "number") {
      if (!Number.isFinite(node.value))
        addError(path, "Числовая константа должна быть конечной.");
    } else if (node.type === "negate")
      checkFormula(node.operand, path, dependencies);
    else if (node.type === "binary") {
      checkFormula(node.left, path, dependencies);
      checkFormula(node.right, path, dependencies);
    } else if (node.type === "call") {
      const fn = getFormulaFunction(node.name);
      if (!fn)
        addError(
          path,
          `Функция «${node.name}» не поддерживается. Допустимо: floor, ceil, round, min, max.`,
        );
      else if (node.args.length < fn.minArgs || node.args.length > fn.maxArgs)
        addError(path, `Неверное число аргументов у функции «${node.name}».`);
      node.args.forEach((arg) => checkFormula(arg, path, dependencies));
    }
  }

  for (const [id, { field, path }] of fields) {
    if (field.type !== "calculated") continue;
    const dependencies = new Set<string>();
    try {
      checkFormula(
        parseFormula(field.formula),
        [...path, "formula"],
        dependencies,
      );
    } catch {
      addError([...path, "formula"], "Не удалось разобрать формулу.");
    }
    formulas.set(id, dependencies);
  }

  const visiting = new Set<string>();
  const done = new Set<string>();
  const stack: string[] = [];
  const cyclic = new Set<string>();
  // Повторный вход в текущую цепочку означает цикл; сообщаем обо всех его участниках один раз.
  function checkCycle(id: string) {
    if (visiting.has(id)) {
      for (const member of stack.slice(stack.indexOf(id))) cyclic.add(member);
      return;
    }
    if (done.has(id)) return;
    visiting.add(id);
    stack.push(id);
    for (const dependency of formulas.get(id) ?? []) checkCycle(dependency);
    stack.pop();
    visiting.delete(id);
    done.add(id);
  }
  for (const id of formulas.keys()) checkCycle(id);
  for (const id of cyclic)
    addError(
      [...fields.get(id)!.path, "formula"],
      `Циклическая зависимость формулы «${id}».`,
    );

  if (errors.length)
    return { valid: false, errors, summary: null, schema: null };
  const schema = value as SheetSchemaBody;
  return {
    valid: true,
    errors: [],
    schema,
    summary: {
      sections_count: schema.sections.length,
      fields_count: fields.size,
    },
  };
}
