import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../auth/authContext";
import { ROUTES } from "../constants/routes";
import { LogoutIcon, UserIcon } from "../shared/icons";
import { authErrorMessage } from "../auth/authErrorMessage";
import { Banner, Button } from "../shared/ui";

import "./ProfilePage.css";

// UTC оставляет календарную дату одинаковой независимо от часового пояса браузера.
const accountDateFormat = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

// При каждом открытии обновляет профиль из /me; уже загруженные данные остаются видимыми.
export default function ProfilePage() {
  const { user, signOut, pending, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    refreshUser(controller.signal).then(
      () => {
        if (!controller.signal.aborted) setLoadState("ready");
      },
      () => {
        if (!controller.signal.aborted) setLoadState("error");
      },
    );
    return () => controller.abort();
  }, [refreshUser, attempt]);

  // Повторяет GET без очистки последнего успешно полученного профиля.
  function handleRetry() {
    setLoadState("loading");
    setAttempt((value) => value + 1);
  }
  // Маршрут защищён ProtectedRoute; проверка также сужает тип user для TypeScript.
  if (!user) return null;

  // Меняет маршрут и профиль вместе только после серверного отзыва сессии.
  async function handleSignOut() {
    if (pending) return;
    setLogoutError(null);
    try {
      await signOut(() => navigate(ROUTES.login, { replace: true }));
    } catch (error) {
      setLogoutError(authErrorMessage(error));
    }
  }

  return (
    <div className="profile-page">
      <h1>Профиль</h1>
      {loadState === "loading" && (
        <Banner icon="clock" title="Обновление профиля…" notification />
      )}
      {loadState === "error" && (
        <Banner
          variant="error"
          title="Не удалось обновить профиль"
          actions={<Button onClick={handleRetry}>Повторить</Button>}
        >
          Показаны последние загруженные данные. Проверьте соединение и
          попробуйте ещё раз.
        </Banner>
      )}
      {logoutError && <Banner variant="error" title={logoutError} />}
      <section
        className="profile-page__card ui-card"
        aria-label="Данные аккаунта"
        aria-busy={loadState === "loading" || undefined}
      >
        <div className="profile-page__account">
          <div className="profile-page__avatar">
            <UserIcon />
          </div>
          <div className="profile-page__identity">
            <b className="profile-page__email">{user.email}</b>
            <span className="profile-page__created">
              Аккаунт создан{" "}
              <time dateTime={user.created_at}>
                {accountDateFormat.format(new Date(user.created_at))}
              </time>
            </span>
          </div>
        </div>
        {/* Показатели берём из текущей сессии, а не из демонстрационных чисел макета. */}
        <dl className="profile-page__statistics">
          <div className="profile-page__statistic">
            <dt>Мои персонажи</dt>
            <dd>{user.owned_characters_count}</dd>
          </div>
          <div className="profile-page__statistic">
            <dt>Доступные мне</dt>
            <dd>{user.shared_characters_count}</dd>
          </div>
        </dl>
        <div className="profile-page__actions">
          <Button
            icon={<LogoutIcon />}
            onClick={handleSignOut}
            loading={pending}
            loadingText="Выход…"
          >
            Выйти
          </Button>
        </div>
      </section>
    </div>
  );
}
