import { useState } from "react";
import { useParams } from "react-router-dom";

import CharacterHeader from "../components/CharacterHeader";
import { getMockCharacterDetails } from "../mocks/characterDetails";
import { getMockSheetSchema } from "../mocks/sheetSchemas";
import { MOCK_SYSTEMS } from "../mocks/systems";
import { NotFoundOrForbidden } from "../shared/states";
import { Tabs } from "../shared/ui";
import type { TabItem } from "../shared/ui";

import "./CharacterPage.css";

export default function CharacterPage() {
  const { id = "" } = useParams();
  // Вкладки меняют состояние страницы, отдельного адреса у них нет (ui-ux).
  const [tabId, setTabId] = useState("sheet");

  const character = getMockCharacterDetails(id);
  const schema = character && getMockSheetSchema(character.sheet_schema_id);
  const system = MOCK_SYSTEMS.find(
    (item) => item.id === character?.game_system_id,
  );
  // 404 и 403 выглядят одинаково: интерфейс не раскрывает, существует ли чужой персонаж.
  if (!character || !schema || !system) return <NotFoundOrForbidden />;

  // Содержимое вкладок подключается следом: лист — в этой ветке, история и доступ — в 8 и 9.
  const tabs: TabItem[] = [{ id: "sheet", label: "Лист", content: null }];
  if (character.can_view_history) {
    tabs.push({ id: "history", label: "История", content: null });
  }
  // Вкладку «Доступ» видит только владелец, в том числе владелец EDIT-копии.
  if (character.access === "OWNER") {
    tabs.push({ id: "access", label: "Доступ", content: null });
  }

  return (
    <div className="character-page">
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
