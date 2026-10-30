import { useRef, useState, type RefObject } from "react";
import { ApiError } from "../api/client";
import type { GameSystemSummary } from "../systems/systemTypes";
import { TrashIcon } from "../shared/icons";
import { pluralize } from "../shared/pluralize";
import { NO_BREAK_SPACE } from "../shared/noBreakSpace";
import { Banner, Button, Modal } from "../shared/ui";

import "./DeleteSystemModal.css";

interface Props {
  open: boolean;
  system: GameSystemSummary;
  fallbackFocusRef?: RefObject<HTMLElement | null>;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
  onRefresh?: () => void;
}

// Подтверждение скрывает систему из выбора; существующие листы и история остаются доступны.
export default function DeleteSystemModal({
  open,
  system,
  fallbackFocusRef,
  onCancel,
  onConfirm,
  onRefresh,
}: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const pendingRef = useRef(false);
  const count = system.character_count;
  const characters = `${count}${NO_BREAK_SPACE}${pluralize(count, {
    one: "персонаж",
    few: "персонажа",
    many: "персонажей",
  })}`;

  // Запрос нельзя прервать закрытием окна: его результат должен остаться виден пользователю.
  function handleCancel() {
    if (!pendingRef.current) onCancel();
  }

  // Повторяем сбой без потери выбранной системы и отсекаем двойное подтверждение.
  async function handleConfirm() {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setError(null);
    setMissing(false);
    try {
      await onConfirm();
    } catch (error) {
      setMissing(error instanceof ApiError && error.status === 404);
      setError(
        error instanceof ApiError && error.status === 404
          ? "Система уже удалена или недоступна. Обновите список."
          : error instanceof ApiError && error.status === 403
            ? "Сервер запретил удаление этой системы."
            : "Не удалось выполнить действие. Попробуйте ещё раз.",
      );
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  return (
    <Modal
      open={open}
      title={`Удалить систему «${system.name}»?`}
      className="delete-system-modal"
      fallbackFocusRef={fallbackFocusRef}
      {...(pending
        ? { dismissible: false as const }
        : { onClose: handleCancel })}
      actions={
        <>
          <Button onClick={handleCancel} disabled={pending}>
            Отмена
          </Button>
          {missing && onRefresh ? (
            <Button onClick={onRefresh}>Обновить список</Button>
          ) : (
            <Button
              variant="danger"
              icon={<TrashIcon />}
              onClick={handleConfirm}
              loading={pending}
              loadingText="Удаление…"
            >
              Удалить систему
            </Button>
          )}
        </>
      }
    >
      <p className="delete-system-modal__description">
        {count === 0
          ? "Система будет удалена. Персонажей на ней нет. Вернуть её можно только повторным импортом JSON."
          : "Система пропадёт из выбора при создании персонажа. Вернуть её можно только повторным импортом JSON."}
      </p>
      {count > 0 && (
        <p className="delete-system-modal__used">
          На системе есть {characters}, включая чужих. Они останутся и продолжат
          работать: лист, формулы и история версий используют сохранённую схему.
        </p>
      )}
      {error && <Banner variant="error" title={error} />}
    </Modal>
  );
}
