import { useId, useState } from "react";
import type { FormEvent } from "react";
import type { CreateShareRequest } from "../sharing/sharingTypes";
import { Button, Checkbox, Input, Modal, RadioCard } from "../shared/ui";

import "./ShareAddModal.css";

interface Props {
  open: boolean;
  characterName: string;
  systemName: string;
  onCancel: () => void;
  // Выдачу и ошибки подключает родитель следующим этапом; пока действие недоступно.
  onSubmit?: (request: CreateShareRequest) => void;
  pending?: boolean;
}

// Собирает параметры новой выдачи; VIEW открывает оригинал, EDIT передаёт копию.
export default function ShareAddModal({
  open,
  characterName,
  systemName,
  onCancel,
  onSubmit,
  pending = false,
}: Props) {
  const formId = useId();
  const permissionName = useId();
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<"VIEW" | "EDIT">("VIEW");
  const [historyVisible, setHistoryVisible] = useState(false);

  // Не отправляем незаполненную форму и не переносим флаг истории в EDIT-запрос.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !onSubmit || !event.currentTarget.checkValidity()) return;
    const recipient_email = email.trim();
    onSubmit(
      permission === "VIEW"
        ? { recipient_email, permission, history_visible: historyVisible }
        : { recipient_email, permission },
    );
  }

  return (
    <Modal
      open={open}
      title="Поделиться персонажем"
      className="share-add-modal"
      {...(pending ? { dismissible: false as const } : { onClose: onCancel })}
      actions={
        <>
          <Button onClick={onCancel} disabled={pending}>
            Отмена
          </Button>
          <Button
            variant="primary"
            type="submit"
            form={formId}
            disabled={!onSubmit}
            loading={pending}
            loadingText="Выдача…"
          >
            {permission === "VIEW"
              ? "Выдать доступ VIEW"
              : "Создать копию и выдать EDIT"}
          </Button>
        </>
      }
    >
      <p className="share-add-modal__character">
        {characterName} · {systemName}
      </p>
      <form
        id={formId}
        className="share-add-modal__form"
        onSubmit={handleSubmit}
      >
        <Input
          label="Почта пользователя"
          type="email"
          inputMode="email"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="name@example.com"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={pending}
        />
        <fieldset className="share-add-modal__permissions" disabled={pending}>
          <legend>Доступ</legend>
          <RadioCard
            name={permissionName}
            value="VIEW"
            label="Просмотр · VIEW"
            description="Видит актуальный лист, ничего не меняет. Доступ можно отозвать"
            checked={permission === "VIEW"}
            onChange={() => setPermission("VIEW")}
          />
          <RadioCard
            name={permissionName}
            value="EDIT"
            label="Редактирование · EDIT"
            description="Получает собственную копию персонажа. Отозвать нельзя"
            checked={permission === "EDIT"}
            onChange={() => setPermission("EDIT")}
          />
        </fieldset>
        {permission === "VIEW" && (
          <Checkbox
            className="share-add-modal__history"
            label="Показывать историю версий"
            hint={
              historyVisible
                ? "Получатель увидит вкладку «История» и сможет открывать старые версии. Настройку нельзя изменить после выдачи."
                : "Получатель увидит только актуальный лист. Настройку нельзя изменить после выдачи."
            }
            checked={historyVisible}
            onChange={(event) => setHistoryVisible(event.target.checked)}
            disabled={pending}
          />
        )}
      </form>
    </Modal>
  );
}
