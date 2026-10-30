import { CONTRACT_LIMITS } from "../api/contractLimits";
import { useState } from "react";
import type { FormEvent } from "react";

import { ApiError } from "../api/client";
import { RegistrationSignInError } from "../api/auth";
import { authErrorMessage } from "../auth/authErrorMessage";
import { useAuth } from "../auth/authContext";
import { Button, Input } from "../shared/ui";

import "./RegisterForm.css";

const EMAIL_ERROR = "Введите почту в формате name@example.com";
const PASSWORD_HINT = "Не короче 8 символов";
const PASSWORD_CONFIRMATION_ERROR = "Пароли не совпадают";
const REGISTRATION_ERROR =
  "Не удалось создать аккаунт с этой почтой. Если он у вас уже есть — войдите";

// У каждого поля свой текст ошибки. Необязательное свойство (?:) позволяет не задавать его.
interface FormErrors {
  email?: string;
  password?: string;
  passwordConfirmation?: string;
}

// Проверяет поля регистрации и сохраняет введённое при отказе сервера.
export default function RegisterForm() {
  const { register, pending } = useAuth();
  // Значения полей не очищаются после проверки или отказа в регистрации.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");

  // submitted включает проверку пустых полей, errors хранит сообщения последней отправки.
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  // Пустые поля подсвечиваются только после первой попытки отправить форму.
  const emailMissing = submitted && email.trim().length === 0;
  const passwordMissing = submitted && password.length === 0;
  const confirmationMissing = submitted && passwordConfirmation.length === 0;

  const [requestError, setRequestError] = useState<string | null>(null);

  // Проверяет все поля за один проход и запускает регистрацию с автоматическим входом.
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // Отменяем обычную отправку HTML-формы, чтобы не перезагружать страницу.
    event.preventDefault();
    // Повторную отправку игнорируем; AuthProvider дополнительно защищает запрос через ref.
    if (pending) return;
    setSubmitted(true);
    setRequestError(null);

    // currentTarget — форма; по name находим настоящий input для браузерной проверки email.
    const emailInput = event.currentTarget.elements.namedItem("email");
    if (!(emailInput instanceof HTMLInputElement)) return;

    // Собираем все ошибки за один проход, чтобы показать их одновременно, а не по очереди.
    const nextErrors: FormErrors = {};

    // Формат проверяет input[type=email], сообщения и обводку рисует общий Input.
    // У пустых полей остаётся только обводка, без придуманного текста ошибки.
    if (email.trim().length > 0 && !emailInput.validity.valid) {
      nextErrors.email = EMAIL_ERROR;
    }
    // Пробелы в пароле учитываются как символы: пароль не обрезаем и не изменяем.
    if (password.length > 0 && password.length < 8) {
      nextErrors.password = PASSWORD_HINT;
    }
    if (passwordConfirmation.length > 0 && passwordConfirmation !== password) {
      nextErrors.passwordConfirmation = PASSWORD_CONFIRMATION_ERROR;
    }

    // Заменяем прошлые сообщения результатом новой проверки. Пустой объект убирает их все.
    setErrors(nextErrors);
    if (
      email.trim().length === 0 ||
      password.length === 0 ||
      passwordConfirmation.length === 0 ||
      Object.keys(nextErrors).length > 0
    ) {
      return;
    }

    try {
      await register({ email, password, passwordConfirmation });
      // Новая сессия откроет список персонажей; он пока пустой.
    } catch (error) {
      // Различаем конфликт почты, сбой сети и сбой входа уже созданного аккаунта.
      if (error instanceof ApiError && error.status === 409) {
        setErrors({ email: REGISTRATION_ERROR });
      } else {
        setRequestError(
          error instanceof RegistrationSignInError
            ? error.message
            : authErrorMessage(error),
        );
      }
    }
  }

  return (
    <form
      className="register-form"
      aria-label="Регистрация"
      // Сообщаем программам экранного доступа, что форма ожидает завершения запроса.
      aria-busy={pending || undefined}
      // Проверки запускает handleSubmit; всплывающие сообщения браузера отключены.
      noValidate
      onSubmit={handleSubmit}
    >
      <Input
        label="Почта"
        name="email"
        type="email"
        maxLength={CONTRACT_LIMITS.email}
        autoComplete="email"
        inputMode="email"
        placeholder="you@example.com"
        required
        disabled={pending}
        value={email}
        onChange={(event) => {
          setRequestError(null);
          setEmail(event.target.value);
          // Сохраняем ошибки других полей, сбрасывая только сообщение для изменённой почты.
          setErrors((previous) => ({ ...previous, email: undefined }));
        }}
        // Input сам выводит текст error, связывает его с полем и включает обводку ошибки.
        error={errors.email}
        // Пустое поле подсвечивается и без текста; undefined убирает атрибут, когда ошибки нет.
        aria-invalid={emailMissing || undefined}
      />
      <Input
        label="Пароль"
        name="password"
        type="password"
        maxLength={CONTRACT_LIMITS.password}
        autoComplete="new-password"
        required
        disabled={pending}
        value={password}
        onChange={(event) => {
          // При смене пароля прежняя проверка его подтверждения тоже становится неактуальной.
          setRequestError(null);
          setPassword(event.target.value);
          setErrors((previous) => ({
            ...previous,
            password: undefined,
            passwordConfirmation: undefined,
          }));
        }}
        // При ошибке длины подсказка заменяется ошибкой, а не выводится второй раз.
        hint={errors.password ? undefined : PASSWORD_HINT}
        error={errors.password}
        aria-invalid={passwordMissing || undefined}
      />
      <Input
        label="Повторите пароль"
        name="password_confirmation"
        type="password"
        maxLength={CONTRACT_LIMITS.password}
        autoComplete="new-password"
        required
        disabled={pending}
        value={passwordConfirmation}
        onChange={(event) => {
          // Новое подтверждение проверится при следующей отправке, остальные ошибки остаются.
          setRequestError(null);
          setPasswordConfirmation(event.target.value);
          setErrors((previous) => ({
            ...previous,
            passwordConfirmation: undefined,
          }));
        }}
        error={errors.passwordConfirmation}
        aria-invalid={confirmationMissing || undefined}
      />
      {requestError && (
        <div className="register-form__error" role="alert">
          {requestError}
        </div>
      )}
      {/* submit вызывает handleSubmit по нажатию кнопки или Enter внутри формы. */}
      <Button
        type="submit"
        variant="primary"
        className="register-form__submit"
        loading={pending}
        loadingText="Создание…"
      >
        Создать аккаунт
      </Button>
    </form>
  );
}
