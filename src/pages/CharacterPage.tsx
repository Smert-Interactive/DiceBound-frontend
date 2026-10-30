import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../api/client";
import { saveCharacter } from "../api/characters";
import { getCharacterSheet } from "../api/characterSheet";
import CharacterHistoryPanel from "../history/CharacterHistoryPanel";
import { formatRestoreNotice } from "../history/restoreNotice";
import type { RestoreResult } from "../history/historyTypes";
import { getActiveTab, getRestoreNotice } from "../shared/characterRouteState";
import { useApiQuery } from "../api/useApiQuery";
import { getCharacterFieldErrors } from "../api/validationErrors";
import { useAuth } from "../auth/authContext";
import CharacterHeader from "../components/CharacterHeader";
import { useCharacterLabel } from "../components/useCharacterName";
import DynamicSheetRenderer from "../sheet/DynamicSheetRenderer";
import { recalculateSheet } from "../sheet/recalculate";
import {
  getSaveStatus,
  hasSaveBlockers,
  type SavePhase,
} from "../sheet/saveStatus";
import {
  getStoredCalculated,
  toCharacterData,
  type SheetDraftValue,
} from "../sheet/sheetDraft";
import { useSheetDraft } from "../sheet/useSheetDraft";
import { validateSheet } from "../sheet/validateSheet";
import {
  LoadingSkeleton,
  LoadErrorState,
  NotFoundOrForbidden,
  SaveBar,
} from "../shared/states";
import { Banner, Tabs } from "../shared/ui";
import { formatDate } from "../shared/formatDate";
import { getSystemKind } from "../shared/systemKind";
import "./CharacterPage.css";

// Смена адреса создаёт отдельный черновик и отменяет сохранение предыдущего персонажа.
export default function CharacterPage() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  return <CharacterSheet key={`${user?.id}:${id}`} id={id} />;
}

// Загружает лист и его опубликованную схему, в том числе после архивации системы.
function CharacterSheet({ id }: { id: string }) {
  const { handleUnauthorized } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const incomingNotice = getRestoreNotice(location.state);
  const [notice, setNotice] = useState<string | null>(incomingNotice);
  const pageRef = useRef<HTMLDivElement>(null);
  // Уведомление из снимка одноразовое и не повторяется при возврате браузером.
  useEffect(() => {
    if (incomingNotice)
      navigate(`${location.pathname}${location.search}${location.hash}`, {
        replace: true,
        state: null,
      });
  }, [
    incomingNotice,
    location.pathname,
    location.search,
    location.hash,
    navigate,
  ]);
  const request = useCallback(
    (signal: AbortSignal) => getCharacterSheet(id, signal),
    [id],
  );
  const query = useApiQuery(request, id);
  // После восстановления исходная кнопка исчезает; фокус остаётся на обновлённом листе.
  useEffect(() => {
    if (notice && !query.loading) pageRef.current?.focus();
  }, [notice, query.loading]);
  const { character, schema, summary } = query.data ?? {};
  useCharacterLabel(id, character?.name);
  const sheet = useSheetDraft(
    schema?.schema,
    character?.data,
    `${id}:${character?.current_version_number}:${character?.updated_at}`,
  );
  const [phase, setPhase] = useState<SavePhase>("idle");
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const saving = useRef<AbortController | null>(null);
  useEffect(() => () => saving.current?.abort(), []);

  if (query.loading) return <LoadingSkeleton variant="sheet" />;
  if (query.error) {
    if (
      query.error instanceof ApiError &&
      [400, 403, 404].includes(query.error.status)
    )
      return <NotFoundOrForbidden />;
    return <LoadErrorState onRetry={query.retry} />;
  }
  if (!character || !schema) return <NotFoundOrForbidden />;

  // VIEW показывает сохранённые calculated; редактируемый лист считает только предпросмотр.
  const calculation = character.can_edit
    ? recalculateSheet(schema.schema, sheet.draft)
    : {
        values: getStoredCalculated(schema.schema, character.data),
        errors: {},
      };
  const fieldErrors = character.can_edit
    ? validateSheet(schema.schema, sheet.draft)
    : {};
  const status = getSaveStatus({
    changedCount: sheet.changed.size,
    hasErrors: hasSaveBlockers(
      { ...fieldErrors, ...serverErrors },
      calculation.errors,
    ),
    phase,
  });
  const isCopy = Boolean(summary?.copy_source_owner_name);
  const tabId =
    character.can_view_history && getActiveTab(location.state) === "history"
      ? "history"
      : "sheet";

  // Сохраняет вкладку для крошек и возврата со снимка, не добавляя шаг в историю браузера.
  function handleTabChange(activeTab: string) {
    navigate(`${location.pathname}${location.search}${location.hash}`, {
      replace: true,
      state: { activeTab },
    });
  }

  // Полный ответ восстановления заменяет базу черновика, сохраняя серверные права пользователя.
  function handleRestored(result: RestoreResult) {
    query.update((previous) => ({
      ...previous,
      character: { ...previous.character, ...result.character },
    }));
    setServerErrors({});
    setSaveError(null);
    setPhase("idle");
    setNotice(formatRestoreNotice(result));
    navigate(`${location.pathname}${location.search}${location.hash}`, {
      replace: true,
      state: null,
    });
  }

  // Новая правка снимает ошибки предыдущего запроса, не затрагивая другие значения.
  function handleChange(fieldId: string, value: SheetDraftValue) {
    if (saving.current) return;
    setServerErrors({});
    setSaveError(null);
    setPhase("idle");
    sheet.setValue(fieldId, value);
  }

  // Отмена возвращает полный последний успешный ответ сервера.
  function handleReset() {
    if (saving.current) return;
    setServerErrors({});
    setSaveError(null);
    setPhase("idle");
    sheet.reset();
  }

  // Отправляет полный набор пользовательских полей, оставляя черновик при любом отказе.
  async function handleSave() {
    if (
      !character?.can_edit ||
      !schema ||
      saving.current ||
      (status !== "dirty" && status !== "error")
    )
      return;
    const controller = new AbortController();
    saving.current = controller;
    setPhase("saving");
    setSaveError(null);
    try {
      const saved = await saveCharacter(
        id,
        { data: toCharacterData(schema.schema, sheet.draft) },
        controller.signal,
      );
      if (controller.signal.aborted) return;
      query.update((previous) => ({ ...previous, character: saved }));
      setServerErrors({});
      setPhase("saved");
    } catch (error) {
      if (controller.signal.aborted || handleUnauthorized(error)) return;
      const errors = getCharacterFieldErrors(error, schema.schema);
      setServerErrors(errors);
      setSaveError(
        error instanceof ApiError && [403, 404].includes(error.status)
          ? "Персонаж недоступен или право редактирования отозвано. Изменения не сохранены."
          : error instanceof ApiError && [400, 422].includes(error.status)
            ? "Сервер отклонил данные листа. Проверьте значения полей."
            : "Не удалось сохранить лист. Проверьте соединение и повторите попытку.",
      );
      setPhase(Object.keys(errors).length ? "idle" : "error");
    } finally {
      if (saving.current === controller) saving.current = null;
    }
  }

  return (
    <div
      ref={pageRef}
      tabIndex={-1}
      className={
        character.can_edit && tabId === "sheet"
          ? "character-page character-page--with-savebar"
          : "character-page"
      }
      data-system={getSystemKind()}
    >
      {notice && (
        <Banner
          variant="success"
          notification
          title={notice}
          onClose={() => setNotice(null)}
        />
      )}
      {saveError && <Banner variant="error" title={saveError} />}
      {character.access === "VIEW" && (
        <Banner icon="eye" title="Только просмотр">
          Персонажем поделился {character.owner_username}. Изменять лист может
          только владелец.
        </Banner>
      )}
      <CharacterHeader
        name={character.name}
        systemName={summary?.game_system_name ?? "Игровая система"}
        schemaName={schema.name}
        updatedAt={character.updated_at}
        version={character.current_version_number}
        ownerName={
          character.access === "VIEW" ? character.owner_username : undefined
        }
        isCopy={isCopy}
      />
      {isCopy && (
        <Banner
          icon="copy"
          title={`Это ваша копия персонажа ${character.name.replace(/ \(копия\)$/u, "")} от ${summary?.copy_source_owner_name}`}
        >
          Создана {formatDate(character.created_at)} при выдаче доступа EDIT.
          Ваши сохранения не меняют оригинал.
        </Banner>
      )}
      <Tabs
        items={[
          {
            id: "sheet",
            label: "Лист",
            content: (
              <div inert={phase === "saving"} aria-busy={phase === "saving"}>
                <DynamicSheetRenderer
                  schema={schema.schema}
                  draft={sheet.draft}
                  calculated={calculation.values}
                  errors={{
                    ...calculation.errors,
                    ...fieldErrors,
                    ...serverErrors,
                  }}
                  changed={sheet.changed}
                  readOnly={!character.can_edit}
                  onChange={handleChange}
                />
              </div>
            ),
          },
          ...(character.can_view_history
            ? [
                {
                  id: "history",
                  label: "История",
                  content: (
                    <CharacterHistoryPanel
                      characterId={id}
                      revision={`${character.current_version_number}:${character.updated_at}`}
                      ownerName={character.owner_username}
                      isOwner={character.access === "OWNER"}
                      onRestored={handleRestored}
                      onRefresh={query.retry}
                      fallbackFocusRef={pageRef}
                    />
                  ),
                },
              ]
            : []),
        ]}
        value={tabId}
        onChange={handleTabChange}
        disabled={phase === "saving"}
        label="Разделы персонажа"
      />
      {character.can_edit && tabId === "sheet" && (
        <SaveBar
          status={status}
          changedCount={sheet.changed.size}
          version={character.current_version_number}
          isCopy={isCopy}
          onSave={handleSave}
          onReset={handleReset}
          onRetry={handleSave}
        />
      )}
    </div>
  );
}
