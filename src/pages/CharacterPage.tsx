import { useState } from "react";
import { useLocation, useParams } from "react-router-dom";

import { useAuth } from "../auth/authContext";
import CharacterHistory from "../components/CharacterHistory";
import { getMockCharacterList } from "../mocks/characters";
import { getMockCharacterVersions } from "../mocks/characterVersions";
import CharacterHeader from "../components/CharacterHeader";
import { getMockCharacterDetails } from "../mocks/characterDetails";
import { getMockSheetSchema } from "../mocks/sheetSchemas";
import { MOCK_SYSTEMS } from "../mocks/systems";
import { NotFoundOrForbidden } from "../shared/states";
import { getSystemKind } from "../shared/systemKind";
import { Tabs } from "../shared/ui";
import type { TabItem } from "../shared/ui";

import "./CharacterPage.css";

export default function CharacterPage() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const location = useLocation();
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
  if (character.can_view_history) {
    const versions = getMockCharacterVersions(id, user.email);
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
          />
        ),
      });
    }
  }
  // Вкладку «Доступ» видит только владелец, в том числе владелец EDIT-копии.
  if (character.access === "OWNER") {
    tabs.push({ id: "access", label: "Доступ", content: null });
  }

  return (
    // data-system задаёт цвет полос resource через CSS, без ветвлений в renderer.
    <div className="character-page" data-system={getSystemKind(system.name)}>
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
    </div>
  );
}
