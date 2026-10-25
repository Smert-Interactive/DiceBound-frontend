import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { useAuth } from "../auth/authContext";
import CharacterHistory from "../components/CharacterHistory";
import RestoreConfirmModal from "../components/RestoreConfirmModal";
import type { CharacterVersionSummary } from "../history/historyTypes";
import { getMockCharacterList } from "../mocks/characters";
import {
  getMockCharacterVersions,
  restoreMockCharacterVersion,
} from "../mocks/characterVersions";
import CharacterHeader from "../components/CharacterHeader";
import { getMockCharacterDetails } from "../mocks/characterDetails";
import { getMockSheetSchema } from "../mocks/sheetSchemas";
import { MOCK_SYSTEMS } from "../mocks/systems";
import { NotFoundOrForbidden } from "../shared/states";
import { getSystemKind } from "../shared/systemKind";
import { Banner, Tabs } from "../shared/ui";
import type { TabItem } from "../shared/ui";

import "./CharacterPage.css";

export default function CharacterPage() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const routeState: unknown = location.state;
  const incomingNotice =
    routeState &&
    typeof routeState === "object" &&
    "restoreNotice" in routeState &&
    typeof routeState.restoreNotice === "string"
      ? routeState.restoreNotice
      : null;
  const [notice, setNotice] = useState<string | null>(incomingNotice);
  useEffect(() => {
    // Уведомление передаётся со страницы версии один раз и не появляется заново через «Назад».
    if (incomingNotice)
      navigate(location.pathname, { replace: true, state: null });
  }, [incomingNotice, location.pathname, navigate]);
  // Цель оставляем при закрытии, чтобы Modal закончил анимацию с тем же содержимым.
  const [restoreTarget, setRestoreTarget] = useState<{
    version: CharacterVersionSummary;
    versions: CharacterVersionSummary[];
  } | null>(null);
  const [isRestoreOpen, setIsRestoreOpen] = useState(false);
  // Вкладки меняют состояние страницы, отдельного адреса у них нет (ui-ux).
  const [tabId, setTabId] = useState(() => {
    const state: unknown = location.state;
    // Кнопка из снимка открывает именно историю; отдельного URL у вкладки нет.
    return state &&
      typeof state === "object" &&
      "activeTab" in state &&
      state.activeTab === "history"
      ? "history"
      : "sheet";
  });

  // Одной сессии недостаточно: прямой адрес не должен открывать чужого mock-персонажа.
  const list = user && getMockCharacterList(user.email);
  const accessible =
    list && [...list.owned, ...list.shared_view].some((item) => item.id === id);
  const character = accessible ? getMockCharacterDetails(id) : undefined;
  const schema = character && getMockSheetSchema(character.sheet_schema_id);
  const system = MOCK_SYSTEMS.find(
    (item) => item.id === character?.game_system_id,
  );
  // 404 и 403 выглядят одинаково: интерфейс не раскрывает, существует ли чужой персонаж.
  if (!user || !character || !schema || !system) return <NotFoundOrForbidden />;

  // Лист подключит renderer, «Доступ» — отдельная задача; история уже имеет свой список.
  const tabs: TabItem[] = [{ id: "sheet", label: "Лист", content: null }];
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
    setIsRestoreOpen(false);
    setTabId("sheet");
    setNotice(
      `Восстановлена версия ${result.character.current_version_number}. Удалено версий: ${result.deleted_versions_count}`,
    );
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
          ownerEmail={character.owner_username}
          canRestore={character.access === "OWNER"}
          onRestore={handleRestoreRequest}
        />
      ),
    });
  }
  // Вкладку «Доступ» видит только владелец, в том числе владелец EDIT-копии.
  if (character.access === "OWNER") {
    tabs.push({ id: "access", label: "Доступ", content: null });
  }

  return (
    // data-system задаёт цвет полос resource через CSS, без ветвлений в renderer.
    <div className="character-page" data-system={getSystemKind(system.name)}>
      {notice && (
        <Banner
          variant="success"
          notification
          title={notice}
          onClose={() => setNotice(null)}
        />
      )}
      <CharacterHeader
        name={character.name}
        systemName={system.name}
        schemaName={schema.name}
        updatedAt={character.updated_at}
        version={character.current_version_number}
      />
      <Tabs
        items={tabs}
        value={tabId}
        onChange={setTabId}
        label="Разделы персонажа"
      />
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
