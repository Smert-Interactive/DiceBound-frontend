import type { SchemaValidationResult } from "../systems/schemaValidationTypes";
import { AlertIcon } from "../shared/icons";
import { pluralize } from "../shared/pluralize";
import { Banner } from "../shared/ui";

import "./SchemaValidationFeedback.css";

interface Props {
  result: SchemaValidationResult | null;
  pending: boolean;
  requestFailed: boolean;
}

// Показывает ответ проверки: UI не вычисляет ошибки и использует пути и строки из сервиса.
export default function SchemaValidationFeedback({
  result,
  pending,
  requestFailed,
}: Props) {
  if (pending) return <Banner icon="clock" title="Проверка схемы…" />;
  if (requestFailed)
    return (
      <Banner variant="error" title="Не удалось проверить схему">
        Не удалось выполнить действие. Попробуйте ещё раз.
      </Banner>
    );
  if (!result)
    return (
      <Banner variant="error" title="Схему нельзя проверить">
        Исправьте синтаксис JSON — предпросмотр появится после проверки схемы.
      </Banner>
    );
  if (result.valid) {
    const sections = result.summary.sections_count;
    const fields = result.summary.fields_count;
    const formulas = result.schema.sections
      .flatMap((section) => section.fields)
      .filter((field) => field.type === "calculated").length;
    return (
      <Banner variant="success" title="Схема корректна" notification>
        {sections}{" "}
        {pluralize(sections, { one: "секция", few: "секции", many: "секций" })}{" "}
        · {fields}{" "}
        {pluralize(fields, { one: "поле", few: "поля", many: "полей" })} ·{" "}
        {formulas}{" "}
        {pluralize(formulas, {
          one: "формула",
          few: "формулы",
          many: "формул",
        })}
      </Banner>
    );
  }
  const count = result.errors.length;
  return (
    <div className="schema-validation">
      <Banner
        variant="error"
        title={`${count % 10 === 1 && count % 100 !== 11 ? "Найдена" : "Найдено"} ${count} ${pluralize(count, { one: "ошибка", few: "ошибки", many: "ошибок" })}`}
      >
        Исправьте JSON и проверьте снова
      </Banner>
      <section
        className="schema-validation__card ui-card"
        aria-label="Ошибки схемы"
      >
        <h2>Ошибки</h2>
        <ul className="schema-validation__errors" aria-label="Ошибки">
          {result.errors.map((error, index) => (
            <li
              className="schema-validation__error"
              key={`${error.path}:${index}`}
            >
              <AlertIcon aria-hidden="true" />
              <div>
                <div className="schema-validation__path">
                  {error.path}
                  {error.line !== null && <span> · строка {error.line}</span>}
                </div>
                <div>{error.message}</div>
              </div>
            </li>
          ))}
        </ul>
      </section>
      <p className="schema-validation__preview-hint ui-card">
        Предпросмотр листа появится, когда схема пройдёт проверку
      </p>
    </div>
  );
}
