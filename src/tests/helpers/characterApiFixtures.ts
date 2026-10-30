import { MOCK_USER } from "../../mocks/authUser";
import type { CharacterDetails, SheetSchema } from "../../sheet/sheetTypes";

export const character: CharacterDetails = {
  id: "91111111-1111-4111-8111-111111111111",
  owner_id: MOCK_USER.id,
  game_system_id: "92222222-2222-4222-8222-222222222222",
  sheet_schema_id: "93333333-3333-4333-8333-333333333333",
  name: "Server pilot",
  data: {
    callsign: "Raven",
    power: 8,
    bonus: 4,
    ready: false,
    fuel: { current: 0, max: 10 },
    role: "scout",
  },
  created_at: "2026-10-01T10:00:00Z",
  updated_at: "2026-10-30T10:00:00Z",
  current_version_number: 3,
  access: "OWNER",
  can_edit: true,
  can_view_history: true,
  owner_username: "captain",
};
export const schema: SheetSchema = {
  id: character.sheet_schema_id,
  game_system_id: character.game_system_id,
  name: "Flight sheet",
  created_at: character.created_at,
  schema: {
    sections: [
      {
        id: "flight",
        label: "Flight data",
        fields: [
          { id: "callsign", type: "text", label: "Позывной", required: true },
          { id: "power", type: "number", label: "Мощность", min: 0, max: 20 },
          {
            id: "bonus",
            type: "calculated",
            label: "Бонус",
            formula: "power / 2",
          },
          { id: "ready", type: "checkbox", label: "Готов" },
          { id: "fuel", type: "resource", label: "Топливо", min: 0 },
          {
            id: "role",
            type: "select",
            label: "Роль",
            options: [{ value: "scout", label: "Разведчик" }],
          },
          { id: "optional", type: "number", label: "Резерв" },
        ],
      },
    ],
  },
};
export const summary = {
  id: character.id,
  name: character.name,
  game_system_id: character.game_system_id,
  game_system_name: "Orbital",
  updated_at: character.updated_at,
  access: "OWNER",
  owner_username: "captain",
  copy_source_owner_name: null,
};
