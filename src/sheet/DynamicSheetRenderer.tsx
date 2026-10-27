import { useId, type ReactNode } from "react";

import SheetCalculatedField from "./fields/SheetCalculatedField";
import SheetCheckboxField from "./fields/SheetCheckboxField";
import SheetNumberField from "./fields/SheetNumberField";
import SheetResourceField from "./fields/SheetResourceField";
import SheetSelectField from "./fields/SheetSelectField";
import SheetTextField from "./fields/SheetTextField";
import { getFormulaFieldIds } from "./formula/evaluate";
import type { ResourceDraft } from "./resourceField";
import type { SheetDraft, SheetDraftValue } from "./sheetDraft";
import { FunctionIcon } from "../shared/icons";
import { useMediaQuery } from "../shared/states/useMediaQuery";
import { buildSheetLayout, type SheetPair } from "./sheetLayout";
import type { SheetField, SheetSchemaBody, SheetSection } from "./sheetTypes";

import "./DynamicSheetRenderer.css";

interface Props {
  schema: SheetSchemaBody;
  // Значения полей так, как они набраны; нет значения — поле пустое.
  draft: SheetDraft;
  // Результаты формул по id поля; undefined — посчитать нельзя.
  calculated: Readonly<Record<string, number | undefined>>;
  errors?: Readonly<Record<string, string>>;
  // id полей, изменённых после последнего сохранения.
  changed?: ReadonlySet<string>;
  // Тот же renderer показывает версию и лист получателя VIEW: поля только для чтения.
  readOnly?: boolean;
  onChange?: (fieldId: string, value: SheetDraftValue) => void;
}

const NO_ERRORS: Readonly<Record<string, string>> = {};
const NO_CHANGES: ReadonlySet<string> = new Set();

function asText(value: SheetDraftValue | undefined): string {
  return typeof value === "string" ? value : "";
}

function asResource(value: SheetDraftValue | undefined): ResourceDraft {
  return typeof value === "object" ? value : { current: "", max: "" };
}

// Лист строится из схемы и данных: компонент выбирается по field.type, игровая система
// здесь не упоминается. Цвет полос resource задаёт data-system на предке (ui-ux).
export default function DynamicSheetRenderer({
  schema,
  draft,
  calculated,
  errors = NO_ERRORS,
  changed = NO_CHANGES,
  readOnly = false,
  onChange,
}: Props) {
  const isPhone = useMediaQuery("(max-width: 639px)");
  // Подписи полей нужны подсказке calculated: «пересчитывается при изменении STR».
  const labels = new Map<string, string>();
  for (const section of schema.sections) {
    for (const field of section.fields) labels.set(field.id, field.label);
  }

  // inPair: поле стоит в паре «значение | модификатор». Число получает счётчик − / +,
  // модификатор — знак и формулу под плашкой (ui-ux, «Секции и сетка»).
  function renderField(field: SheetField, inPair = false) {
    const error = errors[field.id];
    const isChanged = changed.has(field.id);
    const update = (value: SheetDraftValue) => onChange?.(field.id, value);

    switch (field.type) {
      case "text":
        return (
          <SheetTextField
            field={field}
            value={asText(draft[field.id])}
            onChange={update}
            error={error}
            changed={isChanged}
            readOnly={readOnly}
          />
        );
      case "number":
        return (
          <SheetNumberField
            field={field}
            value={asText(draft[field.id])}
            onChange={update}
            error={error}
            changed={isChanged}
            readOnly={readOnly}
            counter={inPair}
          />
        );
      case "select":
        return (
          <SheetSelectField
            field={field}
            value={asText(draft[field.id])}
            onChange={update}
            error={error}
            changed={isChanged}
            readOnly={readOnly}
          />
        );
      case "checkbox":
        return (
          // Пустая подпись над флажком, как на FieldKit: строка совпадает по высоте
          // с соседними полями, у которых подпись есть.
          <div className="ui-field">
            <span className="ui-field__label" aria-hidden="true">
              &nbsp;
            </span>
            <SheetCheckboxField
              field={field}
              checked={draft[field.id] === true}
              onChange={update}
              changed={isChanged}
              readOnly={readOnly}
            />
          </div>
        );
      case "resource":
        return (
          <SheetResourceField
            field={field}
            value={asResource(draft[field.id])}
            onChange={update}
            error={error}
            changed={isChanged}
            readOnly={readOnly}
          />
        );
      case "calculated":
        return (
          <SheetCalculatedField
            field={field}
            value={calculated[field.id]}
            dependsOn={getFormulaFieldIds(field.formula).map(
              (id) => labels.get(id) ?? id,
            )}
            error={error}
            readOnly={readOnly}
            signed={inPair}
            inPair={inPair}
          />
        );
    }
  }

  // Пара — одна плашка: рамка меняется на уровне пары, а не у отдельных полей (ui-ux).
  function renderPair(pair: SheetPair) {
    return (
      <div
        key={pair.number.id}
        className="sheet-pair"
        data-changed={changed.has(pair.number.id) || undefined}
        data-error={errors[pair.number.id] ? true : undefined}
        data-readonly={readOnly || undefined}
      >
        {renderField(pair.number, true)}
        {renderField(pair.calculated, true)}
      </div>
    );
  }

  return (
    <div className="sheet">
      {schema.sections.map((section) => (
        <SheetSectionCard
          key={section.id}
          section={section}
          isPhone={isPhone}
          renderField={renderField}
          renderPair={renderPair}
        />
      ))}
    </div>
  );
}

interface SectionProps {
  section: SheetSection;
  isPhone: boolean;
  renderField: (field: SheetField) => ReactNode;
  renderPair: (pair: SheetPair) => ReactNode;
}

// Секция — карточка с заголовком, а не поле. Поля идут в порядке массива fields,
// подряд идущие пары собираются в свою сетку (3 колонки на desktop).
function SheetSectionCard({
  section,
  isPhone,
  renderField,
  renderPair,
}: SectionProps) {
  const titleId = useId();
  const blocks = buildSheetLayout(section.fields);
  const hasPairs = blocks.some((block) => block.type === "pairs");

  return (
    <section className="sheet-section ui-card" aria-labelledby={titleId}>
      <header className="sheet-section__head">
        <h2 id={titleId} className="sheet-section__title">
          {section.label}
        </h2>
        {/* Пояснение к парам: на телефоне короткая подпись столбцов, как на MSheetDnD. */}
        {hasPairs && (
          <span className="sheet-section__hint">
            {isPhone ? (
              "значение · модиф."
            ) : (
              <>
                <FunctionIcon aria-hidden="true" />
                Модификаторы вычисляются автоматически
              </>
            )}
          </span>
        )}
      </header>
      {blocks.map((block, index) =>
        block.type === "pairs" ? (
          <div key={index} className="sheet-pairs">
            {block.pairs.map(renderPair)}
          </div>
        ) : (
          <div key={index} className="sheet-grid">
            {block.fields.map((field) => (
              <div key={field.id} className="sheet-cell" data-type={field.type}>
                {renderField(field)}
              </div>
            ))}
          </div>
        ),
      )}
    </section>
  );
}
