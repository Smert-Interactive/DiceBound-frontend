import type { CharacterVersionSummary } from "../history/historyTypes";
import { formatDateTime } from "../shared/formatDateTime";
import { RestoreIcon } from "../shared/icons";
import { pluralize } from "../shared/pluralize";
import { Button, Modal } from "../shared/ui";

import "./RestoreConfirmModal.css";

interface Props {
  open: boolean;
  version: CharacterVersionSummary;
  versions: readonly CharacterVersionSummary[];
  onCancel: () => void;
  // Само восстановление подключается отдельно: без обработчика подтверждение недоступно.
  onConfirm?: () => void;
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
  const versionsWord = pluralize(deletedVersions.length, {
    one: "версию",
    few: "версии",
    many: "версий",
  });

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={`Восстановить версию ${version.version_number}?`}
      className="restore-confirm-modal"
      // Как в окне удаления, сначала фокусируем отмену. На телефоне Modal меняет порядок.
      actions={
        <>
          <Button onClick={onCancel}>Отмена</Button>
          <Button
            variant="danger"
            icon={<RestoreIcon />}
            disabled={!onConfirm}
            onClick={onConfirm}
          >
            Восстановить и удалить {deletedVersions.length} {versionsWord}
          </Button>
        </>
      }
    >
      <p className="restore-confirm-modal__description restore-confirm-modal__description--desktop">
        Персонаж получит данные версии {version.version_number} от{" "}
        {formatDateTime(version.created_at)}.{" "}
        {deletedVersions.length === 1 ? "Версия" : "Версии"} {deletedNumbers}{" "}
        {deletedVersions.length === 1 ? "будет удалена" : "будут удалены"} без
        возможности вернуть.
      </p>
      <p className="restore-confirm-modal__description restore-confirm-modal__description--mobile">
        Версия {version.version_number} станет текущей.{" "}
        {deletedVersions.length === 1 ? "Версия" : "Версии"}{" "}
        {listFormatter.format(
          deletedVersions.map((item) => `v${item.version_number}`),
        )}{" "}
        {deletedVersions.length === 1 ? "будет удалена" : "будут удалены"}.
        Действие необратимо.
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
      <div className="restore-confirm-modal__legend" aria-hidden="true">
        <span className="restore-confirm-modal__legend-selected">
          станет текущей
        </span>
        <span className="restore-confirm-modal__legend-deleted">
          будут удалены
        </span>
      </div>
    </Modal>
  );
}
