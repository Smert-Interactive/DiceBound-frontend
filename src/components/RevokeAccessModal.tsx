import { useRef, useState } from "react";
import { Button, Modal } from "../shared/ui";

import "./RevokeAccessModal.css";

interface Props {
  open: boolean;
  recipientEmail: string;
  characterName: string;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}

// Подтверждает отзыв VIEW: получатель теряет доступ к оригиналу, а не к EDIT-копии.
export default function RevokeAccessModal({
  open,
  recipientEmail,
  characterName,
  onCancel,
  onConfirm,
}: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const pendingRef = useRef(false);

  // Во время запроса закрытие заблокировано; отмена не меняет выдачу.
  function handleCancel() {
    if (!pendingRef.current) onCancel();
  }

  // Не допускаем повторного отзыва и сохраняем окно с возможностью повторить сбой.
  async function handleConfirm() {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setError(false);
    try {
      await onConfirm();
    } catch {
      setError(true);
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  return (
    <Modal
      open={open}
      title="Отозвать доступ VIEW?"
      className="revoke-access-modal"
      {...(pending
        ? { dismissible: false as const }
        : { onClose: handleCancel })}
      actions={
        <>
          <Button onClick={handleCancel} disabled={pending}>
            Отмена
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirm}
            loading={pending}
            loadingText="Отзыв…"
          >
            Отозвать доступ
          </Button>
        </>
      }
    >
      <p className="revoke-access-modal__description">
        У {recipientEmail} пропадёт {characterName} из списка «Доступные мне».
        Выдать доступ снова можно в любой момент.
      </p>
      {error && (
        <div className="revoke-access-modal__error" role="alert">
          Не удалось выполнить действие. Попробуйте ещё раз.
        </div>
      )}
    </Modal>
  );
}
