import { useRef, useState, type RefObject } from "react";
import { ApiError } from "../api/client";
import { TrashIcon } from "../shared/icons";
import { NO_BREAK_SPACE } from "../shared/noBreakSpace";
import { pluralize } from "../shared/pluralize";
import { Banner, Button, Modal } from "../shared/ui";

interface Props {
  open: boolean;
  characterName: string;
  versionCount?: number;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
  fallbackFocusRef?: RefObject<HTMLElement | null>;
}

// Подтверждение удаления персонажа. Кнопка называет последствие, а не «ОК».
export default function DeleteConfirmModal({
  open,
  characterName,
  versionCount,
  onCancel,
  onConfirm,
  fallbackFocusRef,
}: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingRef = useRef(false);

  // Подтверждение нельзя закрыть, пока сервер выполняет удаление.
  function handleCancel() {
    if (pendingRef.current) return;
    setError(null);
    onCancel();
  }

  // Повтор не создаёт параллельный DELETE; при отказе персонаж остаётся в списке.
  async function handleConfirm() {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setError(null);
    try {
      await onConfirm();
    } catch (failure) {
      setError(
        failure instanceof ApiError && failure.status === 403
          ? "Недостаточно прав для удаления персонажа."
          : failure instanceof ApiError && failure.status === 404
            ? "Персонаж уже удалён или недоступен. Обновите список."
            : "Не удалось выполнить действие. Попробуйте ещё раз.",
      );
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }
  // «все 1 версию» звучит неправильно, поэтому для одной версии отдельная фраза.
  const versionsWord = pluralize(versionCount ?? 0, {
    one: "версию",
    few: "версии",
    many: "версий",
  });
  const historyText =
    versionCount === undefined
      ? "вся история версий"
      : versionCount === 1
        ? "единственная версия истории"
        : `все${NO_BREAK_SPACE}${versionCount}${NO_BREAK_SPACE}${versionsWord} истории`;

  return (
    <Modal
      open={open}
      {...(pending
        ? { dismissible: false as const }
        : { onClose: handleCancel })}
      fallbackFocusRef={fallbackFocusRef}
      title={`Удалить персонажа ${characterName}?`}
      // «Отмена» первой: она получает фокус при открытии, а на телефоне Modal сам ставит
      // основное действие сверху.
      actions={
        <>
          <Button onClick={handleCancel} disabled={pending}>
            Отмена
          </Button>
          <Button
            variant="danger"
            icon={<TrashIcon />}
            onClick={handleConfirm}
            loading={pending}
            loadingText="Удаление…"
          >
            Удалить персонажа
          </Button>
        </>
      }
    >
      <p>
        Будут удалены лист, {historyText} и выданные доступы. Копии, созданные
        другим пользователям через EDIT, останутся у них.
      </p>
      {error && <Banner variant="error" title={error} />}
    </Modal>
  );
}
