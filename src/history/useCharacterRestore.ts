import { useEffect, useRef, useState } from "react";
import {
  getCharacterVersions,
  restoreCharacterVersion,
} from "../api/characterHistory";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/authContext";
import type { CharacterVersionSummary, RestoreResult } from "./historyTypes";
import { getRestoreError } from "./restoreError";

// Общий цикл восстановления для истории и снимка: подготовка, подтверждение и отмена при уходе.
export function useCharacterRestore(
  id: string,
  onRestored: (result: RestoreResult) => void,
) {
  const { handleUnauthorized } = useAuth();
  const [target, setTarget] = useState<{
    version: CharacterVersionSummary;
    versions: CharacterVersionSummary[];
    session: number;
  } | null>(null);
  const [open, setOpen] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [preparationError, setPreparationError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const session = useRef(0);
  useEffect(() => () => request.current?.abort(), []);

  // Перед подтверждением перечитывает историю, чтобы показать актуальный список удаляемых версий.
  async function begin(versionNumber: number) {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setPreparing(true);
    setPreparationError(null);
    try {
      const versions = await getCharacterVersions(id, controller.signal);
      if (controller.signal.aborted) return;
      const version = versions.find(
        (item) => item.version_number === versionNumber,
      );
      if (!version) throw new ApiError(404, "NOT_FOUND", "Version unavailable");
      if (version.is_current)
        throw new ApiError(409, "RESTORE_NOT_ALLOWED", "Version is current");
      setTarget({ version, versions, session: ++session.current });
      setOpen(true);
    } catch (error) {
      if (!controller.signal.aborted && !handleUnauthorized(error))
        setPreparationError(getRestoreError(error));
    } finally {
      if (!controller.signal.aborted) setPreparing(false);
      if (request.current === controller) request.current = null;
    }
  }

  // Отмена не меняет персонажа и оставляет цель до завершения анимации окна.
  function cancel() {
    if (!request.current) setOpen(false);
  }

  // POST выполняется один раз; только успешный ответ меняет лист и вызывает переход.
  async function confirm() {
    if (!target || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    try {
      const result = await restoreCharacterVersion(
        id,
        target.version.version_number,
        controller.signal,
      );
      if (controller.signal.aborted) return;
      setOpen(false);
      onRestored(result);
    } catch (error) {
      if (!controller.signal.aborted && !handleUnauthorized(error)) throw error;
    } finally {
      if (request.current === controller) request.current = null;
    }
  }
  return { target, open, preparing, preparationError, begin, cancel, confirm };
}
