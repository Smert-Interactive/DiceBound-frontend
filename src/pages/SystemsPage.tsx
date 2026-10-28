import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import DeleteSystemModal from "../components/DeleteSystemModal";
import SystemListItem from "../components/SystemListItem";
import { ROUTES } from "../constants/routes";
import {
  deleteMockSystem,
  getMockSchemas,
  getMockSystems,
} from "../mocks/systems";
import type { GameSystemSummary } from "../systems/systemTypes";
import { CloseIcon, UploadIcon } from "../shared/icons";
import { useMediaQuery } from "../shared/states/useMediaQuery";
import { Banner, Button, getButtonClassName } from "../shared/ui";

import "./SystemsPage.css";

// Управление доступными системами; UI получает список из сервиса, не меняя исходные схемы.
export default function SystemsPage() {
  const { user } = useAuth();
  const isPhone = useMediaQuery("(max-width: 639px)");
  const importLinkRef = useRef<HTMLAnchorElement>(null);
  const [target, setTarget] = useState<GameSystemSummary | null>(null);
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [, refresh] = useState(0);
  const systems = getMockSystems(user?.email ?? "");

  // Новое подтверждение сбрасывает прошлую ошибку; цель сохраняется до конца закрытия.
  function handleDeleteRequest(system: GameSystemSummary) {
    setTarget(system);
    setSession((value) => value + 1);
    setOpen(true);
  }

  // Строка исчезает только после успеха. Ошибку запроса показывает окно подтверждения.
  async function handleDeleteConfirm() {
    if (!target || !user) return;
    await deleteMockSystem(target.id, user.email);
    refresh((value) => value + 1);
    setNotice(`Система «${target.name}» удалена из списка игровых систем.`);
    setOpen(false);
  }

  // Кнопка закрытия исчезает с баннером, поэтому переводим фокус на оставшуюся ссылку.
  function handleNoticeClose() {
    setNotice(null);
    importLinkRef.current?.focus();
  }

  return (
    <div className="systems-page">
      {notice && (
        <Banner
          variant="success"
          title={notice}
          notification
          className="systems-page__notice"
          onClose={isPhone ? undefined : handleNoticeClose}
          actions={
            isPhone ? (
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                icon={<CloseIcon />}
                aria-label="Закрыть уведомление"
                onClick={handleNoticeClose}
              />
            ) : undefined
          }
        />
      )}
      <div className="systems-page__header">
        <div className="systems-page__heading">
          <h1>Игровые системы</h1>
          <p>
            Системы, из которых можно создать персонажа. Импортированные вами
            системы можно удалить.
          </p>
        </div>
        <Link
          ref={importLinkRef}
          to={ROUTES.importSystem}
          className={getButtonClassName({
            variant: "primary",
            className: "systems-page__import",
          })}
        >
          <span className="ui-button__rest">
            <UploadIcon />
            Импортировать из JSON
          </span>
        </Link>
      </div>
      {isPhone ? (
        <ul className="systems-page__cards" aria-label="Игровые системы">
          {systems.map((system) => (
            <SystemListItem
              key={system.id}
              system={system}
              isPhone
              schemaNames={getMockSchemas(system.id).map(
                (schema) => schema.name,
              )}
              onDelete={handleDeleteRequest}
            />
          ))}
        </ul>
      ) : (
        <section className="systems-page__list ui-card">
          <table className="systems-page__table" aria-label="Игровые системы">
            <colgroup>
              <col />
              <col className="systems-page__source-col" />
              <col className="systems-page__count-col" />
              <col className="systems-page__action-col" />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">Система</th>
                <th scope="col">Источник</th>
                <th scope="col">Персонажи на системе</th>
                <th scope="col" aria-label="Действия" />
              </tr>
            </thead>
            <tbody>
              {systems.map((system) => (
                <SystemListItem
                  key={system.id}
                  system={system}
                  isPhone={false}
                  schemaNames={getMockSchemas(system.id).map(
                    (schema) => schema.name,
                  )}
                  onDelete={handleDeleteRequest}
                />
              ))}
            </tbody>
          </table>
        </section>
      )}
      <p className="systems-page__note">
        Удаление не затрагивает существующих персонажей: их лист и история
        версий продолжают работать по сохранённой Sheet Schema. Система только
        пропадает из выбора при создании нового персонажа.
      </p>
      {target && (
        <DeleteSystemModal
          key={session}
          open={open}
          system={target}
          fallbackFocusRef={importLinkRef}
          onCancel={() => setOpen(false)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  );
}
