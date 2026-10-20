import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "../auth/authContext";
import { getLoginRedirect } from "../auth/getLoginRedirect";
import { ROUTES } from "../constants/routes";

import logo from "../assets/logo.svg";
import LoginForm from "../components/LoginForm";
import RegisterForm from "../components/RegisterForm";
import { Tabs } from "../shared/ui";
import type { TabItem } from "../shared/ui";

import "./LoginPage.css";

// Вкладки монтируют только активную форму с её собственными значениями и ошибками.
const authTabs: readonly TabItem[] = [
  { id: "login", label: "Вход", content: <LoginForm /> },
  { id: "register", label: "Регистрация", content: <RegisterForm /> },
];

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState("login");
  const { user, pending } = useAuth();
  const location = useLocation();
  // Запоминаем состояние только при открытии страницы, а не после успешной отправки формы.
  // Это отличает визит с готовой сессией от входа, который должен восстановить state.from.
  const [initiallySignedIn] = useState(user !== null);

  // Уже вошедший пользователь идёт к персонажам. Новый вход возвращает на исходную страницу;
  // регистрация всегда открывает пустой список, даже если перед ней был защищённый адрес.
  if (user) {
    const destination =
      initiallySignedIn || activeTab === "register"
        ? ROUTES.characters
        : getLoginRedirect(location.state);
    // replace заменяет /login в истории: кнопка «назад» не возвращает к отправленной форме.
    return <Navigate to={destination} replace />;
  }

  return (
    <div className="login-page">
      <header className="login-page__header">
        <img src={logo} className="login-page__logo" alt="DiceBound" />
      </header>

      <main className="login-page__content">
        <div className="login-page__intro">
          <h1 className="login-page__title">Листы персонажей для любой НРИ</h1>
          <p className="login-page__subtitle">
            Войдите, чтобы открыть своих персонажей
          </p>
        </div>

        <div className="ui-card login-page__card">
          <Tabs
            variant="segmented"
            // Не даём сменить вкладку и размонтировать форму, пока её запрос не завершён.
            disabled={pending}
            items={authTabs}
            value={activeTab}
            onChange={setActiveTab}
            label="Вход или регистрация"
          />
        </div>
      </main>
    </div>
  );
}
