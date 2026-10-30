import { CONTRACT_LIMITS } from "../api/contractLimits";
import { useId, useRef, useState } from "react";
import type { ChangeEvent, FocusEvent, FormEvent } from "react";
import {
  getShareAddErrors,
  validateShareEmail,
} from "../sharing/shareAddErrors";
import type {
  CharacterShare,
  CreateShareRequest,
} from "../sharing/sharingTypes";
import {
  Banner,
  Button,
  Checkbox,
  Input,
  Modal,
  RadioCard,
} from "../shared/ui";

import "./ShareAddModal.css";

interface Props {
  open: boolean;
  characterName: string;
  systemName: string;
  onCancel: () => void;
  // Родитель выполняет выдачу; окно обрабатывает ожидание и ошибки по контракту API.
  onSubmit?: (request: CreateShareRequest) => void | Promise<void>;
  shares?: readonly CharacterShare[];
  pending?: boolean;
}

// Собирает параметры новой выдачи; VIEW открывает оригинал, EDIT передаёт копию.
export default function ShareAddModal({
  open,
  characterName,
  systemName,
  onCancel,
  onSubmit,
  shares = [],
  pending = false,
}: Props) {
  const formId = useId();
  const permissionName = useId();
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<"VIEW" | "EDIT">("VIEW");
  const [historyVisible, setHistoryVisible] = useState(false);
  const [emailError, setEmailError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const pendingRef = useRef(false);
  const busy = pending || submitting;

  // Только изменение адреса снимает ошибку получателя; смена VIEW/EDIT её не исправляет.
  function handleEmailChange(event: ChangeEvent<HTMLInputElement>) {
    setEmail(event.target.value);
    setEmailError(undefined);
    setFormError(undefined);
  }

  // Проверяем посещённое поле, сохраняя серверную ошибку до изменения адреса.
  function handleEmailBlur(event: FocusEvent<HTMLInputElement>) {
    // Закрытие dialog возвращает фокус наружу, в том числе при проверке эффектов StrictMode.
    // Такой blur не означает, что пользователь закончил ввод в открытой форме.
    if (!event.currentTarget.closest("dialog")?.open || busy || emailError)
      return;
    setEmailError(
      validateShareEmail(email, event.currentTarget.validity.typeMismatch),
    );
  }

  // Не закрываем окно во время запроса, в том числе до следующего рендера React.
  function handleCancel() {
    if (!busy && !pendingRef.current) onCancel();
  }

  // Отправляем одну выдачу; EDIT не получает флаг истории, а отказ сохраняет введённые данные.
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || pendingRef.current || emailError) return;
    const emailInput =
      event.currentTarget.elements.namedItem("recipient_email");
    if (!(emailInput instanceof HTMLInputElement)) return;
    const validationError = validateShareEmail(
      email,
      emailInput.validity.typeMismatch,
    );
    if (validationError) {
      setEmailError(validationError);
      emailInput.focus();
      return;
    }
    if (!onSubmit) return;
    const recipient_email = email.trim();
    pendingRef.current = true;
    setSubmitting(true);
    setFormError(undefined);
    try {
      await onSubmit(
        permission === "VIEW"
          ? { recipient_email, permission, history_visible: historyVisible }
          : { recipient_email, permission },
      );
    } catch (error) {
      const existingShare = shares.find(
        (share) =>
          share.recipient_email.trim().toLowerCase() ===
          recipient_email.toLowerCase(),
      );
      const errors = getShareAddErrors(error, existingShare?.permission);
      setEmailError(errors.email);
      setFormError(errors.form);
    } finally {
      pendingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      title="Поделиться персонажем"
      className="share-add-modal"
      {...(busy ? { dismissible: false as const } : { onClose: handleCancel })}
      actions={
        <>
          <Button onClick={handleCancel} disabled={busy}>
            Отмена
          </Button>
          <Button
            variant="primary"
            type="submit"
            form={formId}
            disabled={!onSubmit || Boolean(emailError)}
            loading={busy}
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
        aria-busy={busy || undefined}
        noValidate
      >
        <Input
          label="Почта пользователя"
          name="recipient_email"
          type="email"
          maxLength={CONTRACT_LIMITS.email}
          inputMode="email"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="name@example.com"
          required
          value={email}
          onChange={handleEmailChange}
          onBlur={handleEmailBlur}
          error={emailError}
          disabled={busy}
        />
        <fieldset className="share-add-modal__permissions" disabled={busy}>
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
            disabled={busy}
          />
        )}
        {permission === "EDIT" && (
          <Banner
            variant="warning"
            className="share-add-modal__warning"
            title={`У получателя появится «${characterName} (копия)» с текущим состоянием листа и новой историей с v1. Выдачу нельзя отменить: копия остаётся у получателя и не синхронизируется с оригиналом.`}
          />
        )}
        {formError && (
          <div className="share-add-modal__error" role="alert">
            {formError}
          </div>
        )}
      </form>
    </Modal>
  );
}
