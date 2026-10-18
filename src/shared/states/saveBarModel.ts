export type SaveBarStatus =
  "clean" | "dirty" | "invalid" | "saving" | "saved" | "error";

export interface SaveBarInput {
  status: SaveBarStatus;
  // Сколько полей изменено относительно сохранённой версии.
  changedCount: number;
  // Номер текущей сохранённой версии.
  version: number;
  // EDIT-копия: к номеру версии добавляется «копии», кнопка называется «Сохранить копию».
  isCopy?: boolean;
  // Телефон: тексты и подписи кнопок короче.
  compact?: boolean;
}

export type SaveBarDot = "success" | "error" | "loader";

export interface SaveBarModel {
  dot: SaveBarDot;
  title: string;
  // Вторая строка под заголовком (только при ошибке сети).
  hint?: string;
  // Текст ошибки справа от заголовка (только на desktop при ошибках в полях).
  problem?: string;
  resetLabel: string;
  saveLabel: string;
  resetDisabled: boolean;
  saveDisabled: boolean;
  saveLoading: boolean;
  // Вместо обычных кнопок показывается одна «Повторить».
  showRetry: boolean;
}

const INVALID_TEXT = "Исправьте ошибки, чтобы сохранить";

// Все тексты и доступность кнопок панели сохранения для каждого статуса (ui-ux, «Состояния панели сохранения»).
export function getSaveBarModel({
  status,
  changedCount,
  version,
  isCopy = false,
  compact = false,
}: SaveBarInput): SaveBarModel {
  const suffix = isCopy ? " копии" : "";
  const current = `версия ${version}${suffix}`;
  const next = version + 1;

  const base = {
    resetLabel: compact ? "Отменить" : "Отменить изменения",
    saveLabel: isCopy ? "Сохранить копию" : "Сохранить",
    resetDisabled: false,
    saveDisabled: false,
    saveLoading: false,
    showRetry: false,
  };

  switch (status) {
    case "clean":
      return {
        ...base,
        dot: "success",
        title: `Все изменения сохранены · ${current}`,
        resetDisabled: true,
        saveDisabled: true,
      };

    case "dirty":
      return {
        ...base,
        dot: "error",
        title: compact
          ? `Изменений: ${changedCount} · будет версия ${next}${suffix}`
          : `Несохранённых изменений: ${changedCount} — сохранение создаст версию ${next}${suffix}`,
      };

    case "invalid":
      return {
        ...base,
        dot: "error",
        // На телефоне места мало: счётчик изменений уступает тексту ошибки.
        title: compact
          ? INVALID_TEXT
          : `Несохранённых изменений: ${changedCount}`,
        problem: compact ? undefined : INVALID_TEXT,
        saveDisabled: true,
      };

    case "saving":
      return {
        ...base,
        dot: "loader",
        title: `Сохранение… создаётся версия ${next}${suffix}`,
        resetDisabled: true,
        saveLoading: true,
      };

    case "saved":
      return {
        ...base,
        dot: "success",
        title: isCopy
          ? `Сохранено · создана версия ${version} копии · оригинал не изменён`
          : `Сохранено · создана версия ${version}`,
        resetDisabled: true,
        saveDisabled: true,
      };

    case "error":
      return {
        ...base,
        dot: "error",
        title: "Не удалось сохранить",
        hint: "Изменения остались на листе, новая версия не создана",
        showRetry: true,
      };
  }
}
