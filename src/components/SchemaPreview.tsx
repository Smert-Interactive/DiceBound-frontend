import { useMemo } from "react";
import DynamicSheetRenderer from "../sheet/DynamicSheetRenderer";
import { recalculateSheet } from "../sheet/recalculate";
import { useSheetDraft } from "../sheet/useSheetDraft";
import { validateSheet } from "../sheet/validateSheet";
import type { CharacterData, SheetSchemaBody } from "../sheet/sheetTypes";
import { Chip } from "../shared/ui";

import "./SchemaPreview.css";

interface Props {
  schema: SheetSchemaBody;
}

const EMPTY_DATA: CharacterData = {};

// Пробные значения существуют только пока открыт проверенный лист; JSON и персонажи не меняются.
export default function SchemaPreview({ schema }: Props) {
  const { draft, changed, setValue } = useSheetDraft(
    schema,
    EMPTY_DATA,
    "preview",
  );
  const calculation = useMemo(
    () => recalculateSheet(schema, draft),
    [schema, draft],
  );
  const errors = useMemo(() => {
    const validation = validateSheet(schema, draft);
    // Пустой предпросмотр не требует заполнить весь лист: показываем ошибки изменённых полей.
    return Object.fromEntries(
      Object.entries(validation).filter(([id]) => changed.has(id)),
    );
  }, [schema, draft, changed]);

  return (
    <section
      className="schema-preview ui-card"
      aria-label="Предпросмотр листа"
      data-system="imported"
    >
      <header className="schema-preview__header">
        <h2>Предпросмотр листа</h2>
        <Chip>тот же renderer</Chip>
      </header>
      <DynamicSheetRenderer
        schema={schema}
        groupPairs={false}
        draft={draft}
        calculated={calculation.values}
        errors={{ ...errors, ...(changed.size ? calculation.errors : {}) }}
        onChange={setValue}
      />
    </section>
  );
}
