import {
  getNodeValue,
  parseTree,
  type JSONPath,
  type ParseError,
} from "jsonc-parser";
import {
  CONTRACT_LIMITS,
  isSchemaTextWithinLimit,
} from "../api/contractLimits";
import { evaluateFormulaNode } from "../sheet/formula/evaluate";
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
// Постоянные части формул проверяются без подстановки выдуманных значений персонажа.
export function validateSchema(text: string): SchemaValidationResult {
  if (!isSchemaTextWithinLimit(text))
    return {
      valid: false,
      schema: null,
      summary: null,
      errors: [
        {
          path: "schema_text",
          message: "JSON превышает 64 KiB UTF-8.",
          line: null,
        },
      ],
    };
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

  // Семантическая ошибка возвращает путь и line:null, как HTTP API.
  function addError(path: JSONPath, message: string) {
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
      line: null,
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
    else if (value.length > CONTRACT_LIMITS.name)
      addError([...path, key], "Не длиннее 255 символов.");
  }

  // Неизвестные свойства отклоняются сервером на каждом уровне схемы.
  function strictProperties(
    object: Record<string, unknown>,
    allowed: string[],
    path: JSONPath,
  ) {
    for (const key of Object.keys(object))
      if (!allowed.includes(key))
        addError([...path, key], "Неизвестное свойство.");
  }

  // Секции не участвуют в формулах; поле должно быть допустимым именем переменной.
  function identifier(
    object: Record<string, unknown>,
    path: JSONPath,
    field = false,
  ) {
    const id = object.id;
    if (
      typeof id !== "string" ||
      !id ||
      id.length > CONTRACT_LIMITS.identifier ||
      id.trim() !== id ||
      ["__proto__", "prototype", "constructor"].includes(id) ||
      (field && !/^[A-Za-z_][A-Za-z0-9_]*$/.test(id))
    )
      addError([...path, "id"], "Недопустимый идентификатор.");
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
    identifier(value, path, true);
    const extra: Record<string, string[]> = {
      text: ["maxLength"],
      number: ["min", "max"],
      select: ["options"],
      checkbox: [],
      resource: ["min"],
      calculated: ["formula"],
    };
    strictProperties(
      value,
      [
        "id",
        "type",
        "label",
        "required",
        ...(Object.hasOwn(extra, String(value.type))
          ? extra[String(value.type)]
          : []),
      ],
      path,
    );
    if (value.required !== undefined && typeof value.required !== "boolean")
      addError([...path, "required"], "Ожидается true или false.");
    requiredText(value, "label", path);
    switch (value.type) {
      case "text":
        if (
          value.maxLength !== undefined &&
          (typeof value.maxLength !== "number" ||
            !Number.isSafeInteger(value.maxLength) ||
            value.maxLength <= 0)
        )
          addError(
            [...path, "maxLength"],
            "Ожидается целое положительное число.",
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
        if (value.options.length > CONTRACT_LIMITS.options)
          addError([...path, "options"], "Допустимо не больше 1024 вариантов.");
        const values = new Set<string>();
        value.options.forEach((option: unknown, index: number) => {
          const optionPath = [...path, "options", index];
          if (!isObject(option)) {
            addError(optionPath, "Вариант должен быть объектом.");
            return;
          }
          strictProperties(option, ["value", "label"], optionPath);
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
        if (
          typeof value.formula !== "string" ||
          !value.formula.trim() ||
          value.formula.length > CONTRACT_LIMITS.formulaLength
        )
          addError(
            [...path, "formula"],
            "Нужна формула длиной от 1 до 2048 символов.",
          );
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
  if (!isObject(value) || !Array.isArray(value.sections)) {
    addError(
      isObject(value) ? ["sections"] : [],
      "Схема должна содержать массив sections.",
    );
  } else {
    strictProperties(value, ["sections"], []);
    if (value.sections.length > CONTRACT_LIMITS.sections)
      addError(["sections"], "Допустимо не больше 64 секций.");
    let fieldCount = 0;
    const sectionIds = new Set<string>();
    value.sections.forEach((section: unknown, sectionIndex: number) => {
      const path: JSONPath = ["sections", sectionIndex];
      if (!isObject(section)) {
        addError(path, "Секция должна быть объектом.");
        return;
      }
      strictProperties(section, ["id", "label", "fields"], path);
      identifier(section, path);
      requiredText(section, "label", path);
      if (typeof section.id === "string") {
        if (sectionIds.has(section.id))
          addError([...path, "id"], "Идентификатор секции уже используется.");
        sectionIds.add(section.id);
      }
      if (!Array.isArray(section.fields)) {
        addError([...path, "fields"], "Ожидается массив fields.");
        return;
      }
      fieldCount += section.fields.length;
      if (section.fields.length > CONTRACT_LIMITS.fieldsPerSection)
        addError(
          [...path, "fields"],
          "Допустимо не больше 256 полей в секции.",
        );
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
    if (fieldCount > CONTRACT_LIMITS.fields)
      addError(["sections"], "Допустимо не больше 1024 полей в схеме.");
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
    const before = errors.length;
    try {
      const tree = parseFormula(field.formula);
      checkFormula(tree, [...path, "formula"], dependencies);
      if (errors.length === before) evaluateFormulaNode(tree, () => undefined);
    } catch {
      addError(
        [...path, "formula"],
        "Формула некорректна: проверьте синтаксис, деление на ноль и переполнение.",
      );
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
    return {
      valid: false,
      errors: errors.slice(0, CONTRACT_LIMITS.errors),
      summary: null,
      schema: null,
    };
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
