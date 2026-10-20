import { useState } from "react";
import type { FormEvent } from "react";

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

export default function RegisterForm() {
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // Отменяем обычную отправку HTML-формы, чтобы не перезагружать страницу.
    event.preventDefault();
    setSubmitted(true);

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
      // Object.keys возвращает имена полей с ошибками; хотя бы одно блокирует продолжение.
      Object.keys(nextErrors).length > 0
    ) {
      return;
    }

    // Пока показываем демонстрационный отказ. Успешная регистрация подключается отдельно.
    // Нейтральный текст не подтверждает, что аккаунт с такой почтой существует.
    setErrors({ email: REGISTRATION_ERROR });
  }

  return (
    <form
      className="register-form"
      aria-label="Регистрация"
      // Проверки запускает handleSubmit; всплывающие сообщения браузера отключены.
      noValidate
      onSubmit={handleSubmit}
    >
      <Input
        label="Почта"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        placeholder="you@example.com"
        required
        // value и onChange связывают поле с состоянием React.
        value={email}
        onChange={(event) => {
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
        autoComplete="new-password"
        required
        value={password}
        onChange={(event) => {
          // При смене пароля прежняя проверка его подтверждения тоже становится неактуальной.
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
        autoComplete="new-password"
        required
        value={passwordConfirmation}
        onChange={(event) => {
          // Новое подтверждение проверится при следующей отправке, остальные ошибки остаются.
          setPasswordConfirmation(event.target.value);
          setErrors((previous) => ({
            ...previous,
            passwordConfirmation: undefined,
          }));
        }}
        error={errors.passwordConfirmation}
        aria-invalid={confirmationMissing || undefined}
      />
      {/* submit вызывает handleSubmit по нажатию кнопки или Enter внутри формы. */}
      <Button type="submit" variant="primary" className="register-form__submit">
        Создать аккаунт
      </Button>
    </form>
  );
}
