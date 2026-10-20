import { useAuth } from "../auth/authContext";
import { UserIcon } from "../shared/icons";

import "./ProfilePage.css";

// UTC оставляет календарную дату одинаковой независимо от часового пояса браузера.
const accountDateFormat = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

export default function ProfilePage() {
  const { user } = useAuth();
  // Маршрут защищён RequireAuth; проверка также сужает тип user для TypeScript.
  if (!user) return null;

  return (
    <div className="profile-page">
      <h1>Профиль</h1>
      <section
        className="profile-page__card ui-card"
        aria-label="Данные аккаунта"
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
      </section>
    </div>
  );
}
