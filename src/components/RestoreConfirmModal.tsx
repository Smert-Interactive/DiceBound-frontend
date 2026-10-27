import { useRef, useState } from "react";
import type { CharacterVersionSummary } from "../history/historyTypes";
import { formatDateTime } from "../shared/formatDateTime";
import { RestoreIcon } from "../shared/icons";
import { pluralize } from "../shared/pluralize";
import { useMediaQuery } from "../shared/states/useMediaQuery";
import { Button, Modal } from "../shared/ui";

import "./RestoreConfirmModal.css";

interface Props {
  open: boolean;
  version: CharacterVersionSummary;
  versions: readonly CharacterVersionSummary[];
  onCancel: () => void;
  // Родитель меняет данные и выполняет переход; окно управляет ожиданием и ошибкой.
  onConfirm?: () => Promise<void>;
}

const listFormatter = new Intl.ListFormat("ru", {
  style: "long",
  type: "conjunction",
});

export default function RestoreConfirmModal({
  open,
  version,
  versions,
  onCancel,
  onConfirm,
}: Props) {
  // Телефон (лист снизу) показывает короткий текст без подписей к таймлайну, как MVersion.
  const isMobile = useMediaQuery("(max-width: 639px)");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Ref блокирует повторное подтверждение сразу, ещё до следующей отрисовки React.
  const pendingRef = useRef(false);

  function handleCancel() {
    if (pendingRef.current) return;
    setError(null);
    onCancel();
  }

  async function handleConfirm() {
    if (!onConfirm || pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setError(null);
    try {
      await onConfirm();
    } catch {
      // При ошибке цель и таймлайн остаются на экране, действие можно повторить.
      setError("Не удалось выполнить действие. Попробуйте ещё раз.");
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  // История приходит от новых к старым, а таймлайн читается слева направо: v1 … vM.
  // Сортируем копию, чтобы не менять порядок списка на странице персонажа.
  const timeline = [...versions].sort(
    (left, right) => left.version_number - right.version_number,
  );
  const deletedVersions = timeline.filter(
    (item) => item.version_number > version.version_number,
  );
  const deletedNumbers = listFormatter.format(
    deletedVersions.map((item) => String(item.version_number)),
  );
  // Одна удаляемая версия: «Версия 7 будет удалена», несколько: «Версии 5, 6 и 7 будут удалены».
  const isSingle = deletedVersions.length === 1;
  const deletedLabel = isSingle ? "Версия" : "Версии";
  const deletedVerb = isSingle ? "будет удалена" : "будут удалены";
  const versionsWord = pluralize(deletedVersions.length, {
    one: "версию",
    few: "версии",
    many: "версий",
  });

  return (
    <Modal
      open={open}
      {...(pending
        ? { dismissible: false as const }
        : { onClose: handleCancel })}
      title={`Восстановить версию ${version.version_number}?`}
      className="restore-confirm-modal"
      // Как в окне удаления, сначала фокусируем отмену. На телефоне Modal меняет порядок.
      actions={
        <>
          <Button onClick={handleCancel} disabled={pending}>
            Отмена
          </Button>
          <Button
            variant="danger"
            icon={<RestoreIcon />}
            disabled={!onConfirm || deletedVersions.length === 0}
            loading={pending}
            loadingText="Восстановление…"
            onClick={handleConfirm}
          >
            Восстановить и удалить {deletedVersions.length} {versionsWord}
          </Button>
        </>
      }
    >
      <p className="restore-confirm-modal__description">
        {isMobile ? (
          <>
            Версия {version.version_number} станет текущей. {deletedLabel}{" "}
            {deletedNumbers} {deletedVerb}. Действие необратимо.
          </>
        ) : (
          <>
            Персонаж получит данные версии {version.version_number} от{" "}
            {formatDateTime(version.created_at)}. {deletedLabel}{" "}
            {deletedNumbers} {deletedVerb} без возможности вернуть.
          </>
        )}
      </p>
      <div className="restore-confirm-modal__timeline-scroll">
        <ol
          className="restore-confirm-modal__timeline"
          aria-label="Последствия восстановления версий"
        >
          {timeline.map((item) => {
            const isSelected = item.version_number === version.version_number;
            const isDeleted = item.version_number > version.version_number;
            const status = isSelected
              ? "станет текущей"
              : isDeleted
                ? "будет удалена"
                : "сохранится";
            return (
              <li
                key={item.id}
                className={`restore-confirm-modal__version${isSelected ? " restore-confirm-modal__version--selected" : ""}${isDeleted ? " restore-confirm-modal__version--deleted" : ""}`}
                aria-label={`Версия ${item.version_number} — ${status}`}
              >
                <span
                  className="restore-confirm-modal__number"
                  aria-hidden="true"
                >
                  v{item.version_number}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
      {/* Подписи дополняют цвет и пунктир; у каждой ячейки есть текстовый статус для программ экрана. */}
      {!isMobile && (
        <div className="restore-confirm-modal__legend" aria-hidden="true">
          <span className="restore-confirm-modal__legend-selected">
            станет текущей
          </span>
          <span className="restore-confirm-modal__legend-deleted">
            будут удалены
          </span>
        </div>
      )}
      {error && (
        <div className="restore-confirm-modal__error" role="alert">
          {error}
        </div>
      )}
    </Modal>
  );
}
