import { TrashIcon } from "../shared/icons";
import { NO_BREAK_SPACE } from "../shared/noBreakSpace";
import { pluralize } from "../shared/pluralize";
import { Button, Modal } from "../shared/ui";

interface Props {
  open: boolean;
  characterName: string;
  versionCount?: number;
  onCancel: () => void;
  onConfirm: () => void;
}

// Подтверждение удаления персонажа. Кнопка называет последствие, а не «ОК».
export default function DeleteConfirmModal({
  open,
  characterName,
  versionCount,
  onCancel,
  onConfirm,
}: Props) {
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
      onClose={onCancel}
      title={`Удалить персонажа ${characterName}?`}
      // «Отмена» первой: она получает фокус при открытии, а на телефоне Modal сам ставит
      // основное действие сверху.
      actions={
        <>
          <Button onClick={onCancel}>Отмена</Button>
          <Button variant="danger" icon={<TrashIcon />} onClick={onConfirm}>
            Удалить персонажа
          </Button>
        </>
      }
    >
      Будут удалены лист, {historyText} и выданные доступы. Копии, созданные
      другим пользователям через EDIT, останутся у них.
    </Modal>
  );
}
