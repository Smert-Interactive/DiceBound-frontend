import { TrashIcon } from "../shared/icons";
import { pluralize } from "../shared/pluralize";
import { Button, Modal } from "../shared/ui";

interface Props {
  open: boolean;
  characterName: string;
  versionCount: number;
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
  const versionsWord = pluralize(versionCount, {
    one: "версию",
    few: "версии",
    many: "версий",
  });

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
      Будут удалены лист, все {versionCount}&nbsp;{versionsWord} истории и
      выданные доступы. Копии, созданные другим пользователям через EDIT,
      останутся у них.
    </Modal>
  );
}
