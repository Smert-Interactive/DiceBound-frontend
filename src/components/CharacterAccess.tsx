import { useId } from "react";

import type { CharacterShare } from "../sharing/sharingTypes";
import { formatDate } from "../shared/formatDate";
import { LockIcon, PlusIcon } from "../shared/icons";
import { useMediaQuery } from "../shared/states/useMediaQuery";
import { Button, Chip } from "../shared/ui";

import "./CharacterAccess.css";

interface Props {
  shares: readonly CharacterShare[];
  // Окна выдачи и отзыва подключаются отдельно; без обработчика кнопка недоступна.
  onAdd?: () => void;
  onRevoke?: (share: CharacterShare & { permission: "VIEW" }) => void;
}

// Выданные доступы владельца: таблица на широком экране, карточки на телефоне и справка.
export default function CharacterAccess({ shares, onAdd, onRevoke }: Props) {
  const titleId = useId();
  const helpId = useId();
  const isPhone = useMediaQuery("(max-width: 639px)");

  // Чип различает просмотр оригинала (VIEW) и передачу независимой копии (EDIT).
  function permission(share: CharacterShare) {
    return (
      <Chip tone={share.permission === "VIEW" ? "violet" : "crimson"}>
        {share.permission}
      </Chip>
    );
  }

  // У VIEW история открыта или скрыта владельцем; у EDIT-копии своя история с v1.
  function history(share: CharacterShare) {
    if (share.permission === "EDIT") return "Своя у копии, с v1";
    return share.history_visible ? "Открыта" : "Скрыта";
  }

  // VIEW можно отозвать, а EDIT остаётся записью об окончательно переданной копии.
  function action(share: CharacterShare) {
    if (share.permission === "EDIT") {
      return (
        <span className="character-access__permanent">
          <LockIcon aria-hidden="true" />
          Копия передана окончательно
        </span>
      );
    }

    return (
      <Button
        variant="ghost"
        size="sm"
        disabled={!onRevoke}
        onClick={() => onRevoke?.(share)}
        aria-label={`Отозвать доступ ${share.recipient_email}`}
      >
        Отозвать доступ
      </Button>
    );
  }

  // Показываем короткую дату, сохраняя исходную ISO-запись в атрибуте time.
  function date(share: CharacterShare) {
    return (
      <time dateTime={share.created_at}>{formatDate(share.created_at)}</time>
    );
  }

  return (
    <div className="character-access">
      <section
        className="character-access__list-card ui-card"
        aria-labelledby={titleId}
      >
        <header className="character-access__head">
          <h2 id={titleId}>Пользователи с доступом</h2>
          <Button
            variant="primary"
            size="sm"
            icon={<PlusIcon />}
            disabled={!onAdd}
            onClick={onAdd}
          >
            Выдать доступ
          </Button>
        </header>
        {shares.length === 0 ? (
          <p className="character-access__empty">
            Персонажем пока ни с кем не поделились.
          </p>
        ) : isPhone ? (
          <ul className="character-access__cards">
            {shares.map((share) => (
              <li
                key={share.id}
                className="character-access__card"
                data-permission={share.permission}
              >
                <div className="character-access__recipient">
                  <b>{share.recipient_email}</b>
                  {permission(share)}
                </div>
                <dl className="character-access__details">
                  <div>
                    <dt>
                      {share.permission === "VIEW" ? "Выдан" : "Копия передана"}
                    </dt>
                    <dd>{date(share)}</dd>
                  </div>
                  <div>
                    <dt>История версий</dt>
                    <dd>{history(share)}</dd>
                  </div>
                </dl>
                <div className="character-access__action">{action(share)}</div>
              </li>
            ))}
          </ul>
        ) : (
          <table className="character-access__table" aria-labelledby={titleId}>
            <colgroup>
              <col className="character-access__email-col" />
              <col className="character-access__permission-col" />
              <col className="character-access__history-col" />
              <col className="character-access__action-col" />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">Почта</th>
                <th scope="col">Доступ</th>
                <th scope="col">История версий</th>
                <th scope="col">Действие</th>
              </tr>
            </thead>
            <tbody>
              {shares.map((share) => (
                <tr key={share.id}>
                  <th scope="row" className="character-access__email">
                    <b>{share.recipient_email}</b>
                    <span>
                      {share.permission === "VIEW" ? "Выдан" : "Копия передана"}{" "}
                      {date(share)}
                    </span>
                  </th>
                  <td>{permission(share)}</td>
                  <td>{history(share)}</td>
                  <td>{action(share)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <aside
        className="character-access__help ui-card"
        aria-labelledby={helpId}
      >
        <h2 id={helpId}>Уровни доступа</h2>
        <div className="character-access__level">
          <Chip tone="violet">VIEW</Chip>
          <p>
            {isPhone
              ? "Получатель видит актуальное состояние листа только для чтения. Историю версий — если вы открыли её при выдаче. Доступ можно отозвать."
              : "Получатель видит актуальное состояние вашего листа только для чтения. Историю версий он видит, если вы открыли её при выдаче доступа. Доступ можно отозвать в любой момент."}
          </p>
        </div>
        <div className="character-access__level">
          <Chip tone="crimson">EDIT</Chip>
          <p>
            {isPhone
              ? "Получатель получает собственную копию с новой историей. Выдача окончательная."
              : "Получатель получает собственную копию персонажа с новой историей. Выдача окончательная: копию нельзя отозвать, а её изменения не влияют на ваш лист."}
          </p>
        </div>
        <p className="character-access__note">
          Тип доступа и видимость истории задаются при выдаче и потом не
          меняются.
          {!isPhone &&
            " Чтобы изменить их, отзовите VIEW и выдайте доступ заново."}
        </p>
        {!isPhone && (
          <p className="character-access__note">
            Доступ выдаётся по почте зарегистрированного пользователя.
          </p>
        )}
      </aside>
    </div>
  );
}
