import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { useCharacterLabel } from "../../components/useCharacterName";
import { useAuth } from "../../auth/authContext";
import { getCharacterFieldErrors } from "../../api/validationErrors";
import CharacterHistory from "../../components/CharacterHistory";
import CharacterAccess from "../../components/CharacterAccess";
import ShareAddModal from "../../components/ShareAddModal";
import RevokeAccessModal from "../../components/RevokeAccessModal";
import type { CreateShareRequest, ViewShare } from "../../sharing/sharingTypes";
import RestoreConfirmModal from "../../components/RestoreConfirmModal";
import type { CharacterVersionSummary } from "../../history/historyTypes";
import { formatRestoreNotice } from "../../history/restoreNotice";
import { getMockCharacterList } from "../../mocks/characters";
import {
  createMockCharacterShare,
  getMockCharacterShares,
  revokeMockCharacterShare,
} from "../../mocks/characterShares";
import {
  getMockCharacterVersions,
  restoreMockCharacterVersion,
  saveMockCharacterVersion,
} from "../../mocks/characterVersions";
import CharacterHeader from "../../components/CharacterHeader";
import { getMockCharacterDetails } from "../../mocks/characterDetails";
import { getMockSheetSchema } from "../../mocks/sheetSchemas";
import DynamicSheetRenderer from "../../sheet/DynamicSheetRenderer";
import { recalculateSheet } from "../../sheet/recalculate";
import {
  getSaveStatus,
  hasSaveBlockers,
  type SavePhase,
} from "../../sheet/saveStatus";
import { getStoredCalculated, toCharacterData } from "../../sheet/sheetDraft";
import type { CharacterDetails } from "../../sheet/sheetTypes";
import type { SheetDraftValue } from "../../sheet/sheetDraft";
import { useSheetDraft } from "../../sheet/useSheetDraft";
import { validateSheet } from "../../sheet/validateSheet";
import {
  getActiveTab,
  getRestoreNotice,
} from "../../shared/characterRouteState";
import { NotFoundOrForbidden, SaveBar } from "../../shared/states";
import { formatDate } from "../../shared/formatDate";
import { getSystemKind } from "../../shared/systemKind";
import { Banner, Tabs } from "../../shared/ui";
import type { TabItem } from "../../shared/ui";

import "../../pages/CharacterPage.css";

// Показывает лист по контрактным данным; результаты сохранения становятся новой основой черновика.
export default function CharacterPage() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const incomingNotice = getRestoreNotice(location.state);
  const [notice, setNotice] = useState<string | null>(incomingNotice);
  // Уведомление приходит в state и со страницы версии, и с вкладки «История» (страница уже
  // открыта). Новое значение замечаем при рендере: setState в эффекте дал бы лишний кадр.
  const [seenNotice, setSeenNotice] = useState(incomingNotice);
  if (incomingNotice !== seenNotice) {
    setSeenNotice(incomingNotice);
    if (incomingNotice) setNotice(incomingNotice);
  }
  useEffect(() => {
    // Баннер показывается один раз: state очищается, поэтому «Назад» его не повторит.
    if (incomingNotice)
      navigate(location.pathname, { replace: true, state: null });
  }, [incomingNotice, location.pathname, navigate]);
  // Цель оставляем при закрытии, чтобы Modal закончил анимацию с тем же содержимым.
  const [restoreTarget, setRestoreTarget] = useState<{
    version: CharacterVersionSummary;
    versions: CharacterVersionSummary[];
  } | null>(null);
  const [isRestoreOpen, setIsRestoreOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [shareSession, setShareSession] = useState(0);
  const [revokeTarget, setRevokeTarget] = useState<ViewShare | null>(null);
  const [isRevokeOpen, setIsRevokeOpen] = useState(false);
  const [revokeSession, setRevokeSession] = useState(0);
  // После отзыва строка с прежней кнопкой исчезает; Modal вернёт фокус на выдачу доступа.
  const addAccessButtonRef = useRef<HTMLButtonElement>(null);
  // После mock-запроса перечитываем выдачи; цель остаётся для анимации закрытия окна.
  const [, refreshShares] = useState(0);

  // Каждый выбор открывает новое подтверждение без ошибки от прошлой попытки.
  function handleRevokeRequest(share: ViewShare) {
    setRevokeSession((session) => session + 1);
    setRevokeTarget(share);
    setIsRevokeOpen(true);
  }

  // Закрытие подтверждения не отзывает доступ.
  function handleRevokeCancel() {
    setIsRevokeOpen(false);
  }

  // Новое открытие сбрасывает форму; при закрытии содержимое остаётся до конца анимации.
  function handleShareOpen() {
    setShareSession((session) => session + 1);
    setIsShareOpen(true);
  }

  // Возвращаем фокус к кнопке выдачи через общий Modal.
  function handleShareCancel() {
    setIsShareOpen(false);
  }
  // Состояние маршрута общее для вкладок и хлебных крошек; сам URL не меняется.
  const tabId = getActiveTab(location.state) ?? "sheet";

  function handleTabChange(nextTab: string) {
    // replace не добавляет отдельный шаг браузерной истории на каждое переключение вкладки.
    navigate(location.pathname, {
      replace: true,
      state: { activeTab: nextTab },
    });
  }

  // Одной сессии недостаточно: прямой адрес не должен открывать чужого mock-персонажа.
  const list = user && getMockCharacterList(user.email);
  const summary =
    list && [...list.owned, ...list.shared_view].find((item) => item.id === id);
  const [savedCharacter, setSavedCharacter] = useState<CharacterDetails | null>(
    null,
  );
  const loadedCharacter = summary
    ? getMockCharacterDetails(id, user!.email)
    : undefined;
  const character =
    savedCharacter?.id === id ? savedCharacter : loadedCharacter;
  useCharacterLabel(id, character?.name);
  const schema = character && getMockSheetSchema(character.sheet_schema_id);
  // Черновик живёт здесь, а не во вкладке: вкладки показывают только активную панель.
  // Хук вызывается до проверок ниже, иначе нарушится порядок хуков.
  const sheet = useSheetDraft(
    schema?.schema,
    character?.data,
    `${id}:${character?.current_version_number}:${character?.updated_at}`,
  );
  // Результат последнего запроса сохранения; правка листа или «Отменить» возвращают idle.
  const [savePhase, setSavePhase] = useState<SavePhase>("idle");
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  // 404 и 403 выглядят одинаково: интерфейс не раскрывает, существует ли чужой персонаж.
  if (!user || !character || !schema || !summary)
    return <NotFoundOrForbidden />;

  // В VIEW берём сохранённые calculated; формулы исполняются только у редактируемого листа.
  const calculation = character.can_edit
    ? recalculateSheet(schema.schema, sheet.draft)
    : {
        values: getStoredCalculated(schema.schema, character.data),
        errors: {},
      };
  const fieldErrors = character.can_edit
    ? validateSheet(schema.schema, sheet.draft)
    : {};
  const isCopy = Boolean(summary?.copy_source_owner_name);
  const saveStatus = getSaveStatus({
    changedCount: sheet.changed.size,
    hasErrors: hasSaveBlockers(
      { ...fieldErrors, ...serverErrors },
      calculation.errors,
    ),
    phase: savePhase,
  });

  // Панель нужна тому, кто правит лист, и только на вкладке «Лист».
  const showSaveBar = character.can_edit && tabId === "sheet";

  // Строка исчезает только после успешного ответа; ошибку показывает окно подтверждения.
  async function handleRevokeConfirm() {
    if (!revokeTarget) return;
    await revokeMockCharacterShare(
      revokeTarget.character_id,
      revokeTarget.id,
      user!.email,
    );
    // Одно уведомление заменяет предыдущее и закрывается общей кнопкой баннера.
    setNotice(`Доступ ${revokeTarget.recipient_email} отозван`);
    refreshShares((revision) => revision + 1);
    setIsRevokeOpen(false);
  }

  // После выдачи обновляем владельцу список и показываем результат; отказ обрабатывает форма.
  async function handleShareSubmit(request: CreateShareRequest) {
    const result = await createMockCharacterShare(id, request, user!.email);
    refreshShares((revision) => revision + 1);
    setIsShareOpen(false);
    setNotice(
      result.share.permission === "VIEW"
        ? `Доступ VIEW выдан ${result.share.recipient_email}`
        : `Копия передана ${result.share.recipient_email}`,
    );
  }

  // Новая правка снимает устаревшие ошибки запроса и отмечает поле изменённым.
  function handleSheetChange(fieldId: string, value: SheetDraftValue) {
    setServerErrors({});
    setSavePhase("idle");
    sheet.setValue(fieldId, value);
  }

  // Возвращает значения последнего успешного ответа сервиса.
  function handleSheetReset() {
    setServerErrors({});
    setSavePhase("idle");
    sheet.reset();
  }

  // Сохраняет пользовательские значения и применяет полный ответ, сохраняя черновик при отказе.
  async function handleSave() {
    // «Повторить» после ошибки сети отправляет те же изменения, поэтому error тоже допустим.
    if (!user || !schema) return;
    if (saveStatus !== "dirty" && saveStatus !== "error") return;
    setSavePhase("saving");
    try {
      const saved = await saveMockCharacterVersion(
        id,
        toCharacterData(schema.schema, sheet.draft),
        user.email,
      );
      setSavedCharacter(saved);
      setServerErrors({});
      setSavePhase("saved");
    } catch (error) {
      const errors = getCharacterFieldErrors(error, schema.schema);
      setServerErrors(errors);
      setSavePhase(Object.keys(errors).length ? "idle" : "error");
    }
  }

  const tabs: TabItem[] = [
    {
      id: "sheet",
      label: "Лист",
      content: (
        // На время запроса лист блокируется через inert, а не через readOnly: readOnly меняет вид
        // полей (плашки вместо полей), а ui-ux требует блокировку без смены вида.
        <div
          inert={saveStatus === "saving"}
          aria-busy={saveStatus === "saving"}
        >
          <DynamicSheetRenderer
            schema={schema.schema}
            draft={sheet.draft}
            calculated={calculation.values}
            errors={{ ...calculation.errors, ...fieldErrors, ...serverErrors }}
            changed={sheet.changed}
            readOnly={!character.can_edit}
            onChange={handleSheetChange}
          />
        </div>
      ),
    },
  ];
  function handleRestoreRequest(version: CharacterVersionSummary) {
    if (character?.access !== "OWNER" || version.is_current) return;
    if (!versions) return;
    // Оставляем исходный таймлайн до конца анимации закрытия.
    setRestoreTarget({ version, versions });
    setIsRestoreOpen(true);
  }

  async function handleRestoreConfirm() {
    if (!user || !restoreTarget) return;
    const result = await restoreMockCharacterVersion(
      id,
      restoreTarget.version.version_number,
      user.email,
    );
    setSavedCharacter(null);
    setIsRestoreOpen(false);
    // Без activeTab страница открывает «Лист»; баннер покажет эффект выше.
    navigate(location.pathname, {
      replace: true,
      state: { restoreNotice: formatRestoreNotice(result) },
    });
  }

  const versions = character.can_view_history
    ? getMockCharacterVersions(id, user.email)
    : undefined;
  if (versions) {
    tabs.push({
      id: "history",
      label: "История",
      content: (
        <CharacterHistory
          characterId={id}
          versions={versions}
          ownerName={character.owner_username}
          canRestore={character.access === "OWNER"}
          onRestore={handleRestoreRequest}
        />
      ),
    });
  }
  // Вкладку «Доступ» видит только владелец, в том числе владелец EDIT-копии.
  if (character.access === "OWNER") {
    tabs.push({
      id: "access",
      label: "Доступ",
      content: (
        <CharacterAccess
          addButtonRef={addAccessButtonRef}
          shares={getMockCharacterShares(id, user.email) ?? []}
          onAdd={handleShareOpen}
          onRevoke={handleRevokeRequest}
        />
      ),
    });
  }

  return (
    // data-system задаёт цвет полос resource через CSS, без ветвлений в renderer.
    <div
      className={
        showSaveBar
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
      {character.access === "VIEW" && (
        <Banner icon="eye" title="Только просмотр">
          {character.can_view_history
            ? `Персонажем поделился ${character.owner_username} вместе с историей версий. Изменять лист и восстанавливать версии может только владелец.`
            : `Персонажем поделился ${character.owner_username}. Вы видите актуальное состояние листа, история версий скрыта владельцем.`}
        </Banner>
      )}
      <CharacterHeader
        name={character.name}
        systemName={summary.game_system_name}
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
          title={`Это ваша копия персонажа ${character.name.replace(/ \(копия\)$/u, "")} от ${summary!.copy_source_owner_name}`}
        >
          Создана {formatDate(character.created_at)} при выдаче доступа EDIT.
          История версий копии начинается с v1. Ваши сохранения не меняют
          оригинал, изменения оригинала сюда не приходят.
        </Banner>
      )}
      <Tabs
        items={tabs}
        value={tabId}
        onChange={handleTabChange}
        label="Разделы персонажа"
      />
      {showSaveBar && (
        <SaveBar
          status={saveStatus}
          changedCount={sheet.changed.size}
          version={character.current_version_number}
          isCopy={isCopy}
          onSave={handleSave}
          onReset={handleSheetReset}
          onRetry={handleSave}
        />
      )}
      {revokeTarget && character.access === "OWNER" && (
        <RevokeAccessModal
          key={`${revokeTarget.id}:${revokeSession}`}
          open={isRevokeOpen}
          recipientEmail={revokeTarget.recipient_email}
          characterName={character.name}
          onCancel={handleRevokeCancel}
          onConfirm={handleRevokeConfirm}
          fallbackFocusRef={addAccessButtonRef}
        />
      )}
      {shareSession > 0 && character.access === "OWNER" && (
        <ShareAddModal
          key={`${id}:${shareSession}`}
          open={isShareOpen}
          characterName={character.name}
          shares={getMockCharacterShares(id, user.email) ?? []}
          systemName={summary.game_system_name}
          onCancel={handleShareCancel}
          onSubmit={handleShareSubmit}
        />
      )}
      {restoreTarget && versions && character.access === "OWNER" && (
        <RestoreConfirmModal
          open={isRestoreOpen}
          version={restoreTarget.version}
          versions={restoreTarget.versions}
          onConfirm={handleRestoreConfirm}
          onCancel={() => setIsRestoreOpen(false)}
        />
      )}
    </div>
  );
}
