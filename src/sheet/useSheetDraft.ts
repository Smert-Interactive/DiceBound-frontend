import { useMemo, useState } from "react";

import {
  getChangedFieldIds,
  toDraft,
  type SheetDraft,
  type SheetDraftValue,
} from "./sheetDraft";
import type { CharacterData, SheetSchemaBody } from "./sheetTypes";

const EMPTY_DRAFT: SheetDraft = {};

// Черновик листа: что набрано сейчас и что сохранено. Живёт на странице персонажа, а не во
// вкладке «Лист»: вкладки показывают только активную панель, и правки пропали бы при переходе.
// Схема и данные необязательны: страница вызывает хуки до проверки «персонаж найден».
// resetKey меняется, когда сохранённые данные стали другими (например, после восстановления
// версии): черновик тогда собирается заново.
export function useSheetDraft(
  schema: SheetSchemaBody | undefined,
  data: CharacterData | undefined,
  resetKey: string,
) {
  const build = () => (schema && data ? toDraft(schema, data) : EMPTY_DRAFT);

  const [state, setState] = useState(() => {
    const baseline = build();
    return { key: resetKey, baseline, draft: baseline };
  });

  // Новый ключ замечаем при рендере: setState в эффекте дал бы лишний кадр со старым листом.
  if (state.key !== resetKey) {
    const baseline = build();
    setState({ key: resetKey, baseline, draft: baseline });
  }

  const changed = useMemo(
    () => getChangedFieldIds(state.draft, state.baseline),
    [state.draft, state.baseline],
  );

  function setValue(fieldId: string, value: SheetDraftValue) {
    setState((previous) => ({
      ...previous,
      draft: { ...previous.draft, [fieldId]: value },
    }));
  }

  // «Отменить изменения»: возвращаем последнее сохранённое состояние, без подтверждения.
  function reset() {
    setState((previous) => ({ ...previous, draft: previous.baseline }));
  }

  return { draft: state.draft, changed, setValue, reset };
}
