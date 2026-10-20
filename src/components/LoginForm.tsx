import { useState } from "react";
import type { FormEvent } from "react";

import { Button, Input } from "../shared/ui";

import "./LoginForm.css";

const LOGIN_ERROR = "Неверная почта или пароль";

export default function LoginForm() {
  // Значения контролируемых полей хранятся в React и сохраняются после ошибки отправки.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Общая ошибка входа и факт попытки отправки отвечают за разные состояния интерфейса.
  const [loginError, setLoginError] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // До первой отправки пустые поля не подсвечиваются. После неё обводка снимается при вводе.
  const emailMissing = submitted && email.trim().length === 0;
  const passwordMissing = submitted && password.length === 0;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // Обрабатываем отправку сами: страница не перезагружается, введённые значения остаются.
    event.preventDefault();
    setSubmitted(true);

    // Пустые поля получают состояние ошибки без дополнительного текста.
    // Почту из одних пробелов считаем пустой; пробелы в пароле не обрезаем.
    if (email.trim().length === 0 || password.length === 0) {
      setLoginError(false);
      return;
    }

    // Пока демонстрируется отказ во входе. Подключение успешного входа — отдельный этап.
    // Значения полей сохраняются; сообщение не уточняет, неверна почта или пароль.
    setLoginError(true);
  }

  return (
    <form
      className="login-form"
      aria-label="Вход"
      // Отключаем браузерные подсказки валидации: ошибки показываются средствами UI-kit.
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
        value={email}
        onChange={(event) => {
          // При изменении данных старая общая ошибка больше не относится к новой попытке.
          setEmail(event.target.value);
          setLoginError(false);
        }}
        // Input использует aria-invalid для обводки ошибки и программ экранного доступа.
        aria-invalid={emailMissing || undefined}
      />
      <Input
        label="Пароль"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(event) => {
          setPassword(event.target.value);
          setLoginError(false);
        }}
        aria-invalid={passwordMissing || undefined}
      />
      {/* role="alert" сообщает программам экранного доступа о появлении общей ошибки. */}
      {loginError && (
        <div className="login-form__error" role="alert">
          {LOGIN_ERROR}
        </div>
      )}
      {/* submit запускает handleSubmit как по клику, так и при отправке формы клавишей Enter. */}
      <Button type="submit" variant="primary" className="login-form__submit">
        Войти
      </Button>
    </form>
  );
}
