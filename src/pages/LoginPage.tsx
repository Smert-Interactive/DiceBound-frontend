import { useState } from "react";

import logo from "../assets/logo.svg";
import { Tabs } from "../shared/ui";
import type { TabItem } from "../shared/ui";

import "./LoginPage.css";

// Содержимое форм добавляется отдельно; переключение вкладок уже доступно с клавиатуры.
const authTabs: readonly TabItem[] = [
  { id: "login", label: "Вход", content: null },
  { id: "register", label: "Регистрация", content: null },
];

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState("login");

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
