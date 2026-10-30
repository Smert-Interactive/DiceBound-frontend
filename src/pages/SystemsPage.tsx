import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import DeleteSystemModal from "../components/DeleteSystemModal";
import SystemListItem from "../components/SystemListItem";
import { ROUTES } from "../constants/routes";
import { deleteSystem, getCreationCatalog } from "../api/systems";
import { useApiQuery } from "../api/useApiQuery";
import { LoadingSkeleton, LoadErrorState } from "../shared/states";
import type { GameSystemSummary } from "../systems/systemTypes";
import { CloseIcon, UploadIcon } from "../shared/icons";
import { useMediaQuery } from "../shared/states/useMediaQuery";
import { Banner, Button, getButtonClassName } from "../shared/ui";

import "./SystemsPage.css";

// Управление доступными системами; UI получает список из сервиса, не меняя исходные схемы.
export default function SystemsPage() {
  const { user, handleUnauthorized } = useAuth();
  const query = useApiQuery(getCreationCatalog, user?.id ?? "");
  const deleting = useRef<AbortController | null>(null);
  useEffect(() => () => deleting.current?.abort(), []);
  const isPhone = useMediaQuery("(max-width: 639px)");
  const importLinkRef = useRef<HTMLAnchorElement>(null);
  const [target, setTarget] = useState<GameSystemSummary | null>(null);
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const systems = query.data?.systems ?? [];

  // Новое подтверждение сбрасывает прошлую ошибку; цель сохраняется до конца закрытия.
  function handleDeleteRequest(system: GameSystemSummary) {
    if (system.source !== "IMPORTED" || system.owner_id !== user?.id) return;
    setTarget(system);
    setSession((value) => value + 1);
    setOpen(true);
  }

  // Строка исчезает только после успеха. Ошибку запроса показывает окно подтверждения.
  async function handleDeleteConfirm() {
    if (!target || !user || deleting.current) return;
    const controller = new AbortController();
    deleting.current = controller;
    try {
      await deleteSystem(target.id, controller.signal);
      if (controller.signal.aborted) return;
      query.update((previous) => ({
        ...previous,
        systems: previous.systems.filter((system) => system.id !== target.id),
      }));
      setNotice(`Система «${target.name}» удалена из списка игровых систем.`);
      setOpen(false);
    } catch (error) {
      if (!controller.signal.aborted && !handleUnauthorized(error)) throw error;
    } finally {
      if (deleting.current === controller) deleting.current = null;
    }
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
      {query.loading ? (
        <LoadingSkeleton variant="list" label="Игровые системы загружаются" />
      ) : query.error ? (
        <LoadErrorState onRetry={query.retry} />
      ) : !systems.length ? (
        <Banner title="Игровых систем пока нет" />
      ) : isPhone ? (
        <ul className="systems-page__cards" aria-label="Игровые системы">
          {systems.map((system) => (
            <SystemListItem
              key={system.id}
              system={system}
              isPhone
              schemaNames={(query.data?.schemasBySystem[system.id] ?? []).map(
                (schema) => schema.name,
              )}
              onDelete={handleDeleteRequest}
              canDelete={system.owner_id === user?.id}
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
                  schemaNames={(
                    query.data?.schemasBySystem[system.id] ?? []
                  ).map((schema) => schema.name)}
                  onDelete={handleDeleteRequest}
                  canDelete={system.owner_id === user?.id}
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
          onRefresh={() => {
            setOpen(false);
            query.retry();
          }}
        />
      )}
    </div>
  );
}
