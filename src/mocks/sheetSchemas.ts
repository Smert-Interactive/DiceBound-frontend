import type {
  CalculatedField,
  NumberField,
  SheetSchema,
} from "../sheet/sheetTypes";
import {
  COC_SYSTEM_ID,
  DND_SYSTEM_ID,
  CUSTOM_SYSTEM_ID,
  SPACE_FRONTIER_SYSTEM_ID,
} from "./systems";

export const DND_SCHEMA_ID = "5c0a7c1e-0000-4000-8000-000000000001";
export const COC_SCHEMA_ID = "5c0a7c1e-0000-4000-8000-000000000002";
export const CUSTOM_SCHEMA_ID = "5c0a7c1e-0000-4000-8000-000000000003";

function numberField(
  id: string,
  label: string,
  min: number,
  max: number,
): NumberField {
  return { id, type: "number", label, min, max };
}

// Характеристика D&D и следом её модификатор: формула ссылается на id числа.
function dndAbility(id: string, label: string): [NumberField, CalculatedField] {
  return [
    numberField(id, label, 1, 30),
    {
      id: `${id}_modifier`,
      type: "calculated",
      label: `${label} Modifier`,
      formula: `floor((${id} - 10) / 2)`,
    },
  ];
}

// Данные досок SheetDnD и MSheetDnD холста.
export const DND_SCHEMA: SheetSchema = {
  id: DND_SCHEMA_ID,
  game_system_id: DND_SYSTEM_ID,
  name: "Базовый лист",
  created_at: "2026-01-01T12:00:00Z",
  schema: {
    sections: [
      {
        id: "basic",
        label: "Основное",
        fields: [
          {
            id: "name",
            type: "text",
            label: "Имя",
            required: true,
            maxLength: 40,
          },
          numberField("level", "Уровень", 1, 20),
          {
            id: "class",
            type: "select",
            label: "Класс",
            options: [
              { value: "fighter", label: "Fighter" },
              { value: "wizard", label: "Wizard" },
              { value: "rogue", label: "Rogue" },
              { value: "cleric", label: "Cleric" },
            ],
          },
        ],
      },
      {
        id: "abilities",
        label: "Характеристики",
        fields: [
          ...dndAbility("str", "STR"),
          ...dndAbility("dex", "DEX"),
          ...dndAbility("con", "CON"),
          ...dndAbility("int", "INT"),
          ...dndAbility("wis", "WIS"),
          ...dndAbility("cha", "CHA"),
        ],
      },
      {
        id: "resources",
        label: "Ресурсы",
        fields: [
          { id: "hp", type: "resource", label: "HP", min: 0 },
          numberField("ac", "AC", 1, 30),
        ],
      },
    ],
  },
};

// Данные доски SheetCoC холста. Навыки — обычные number, отдельного типа нет.
export const COC_SCHEMA: SheetSchema = {
  id: COC_SCHEMA_ID,
  game_system_id: COC_SYSTEM_ID,
  name: "Сыщик",
  created_at: "2026-01-01T12:00:00Z",
  schema: {
    sections: [
      {
        id: "basic",
        label: "Основное",
        fields: [
          {
            id: "name",
            type: "text",
            label: "Имя",
            required: true,
            maxLength: 40,
          },
          { id: "profession", type: "text", label: "Профессия" },
          numberField("age", "Возраст", 15, 90),
        ],
      },
      {
        id: "characteristics",
        label: "Характеристики",
        fields: [
          numberField("str", "STR", 1, 99),
          numberField("con", "CON", 1, 99),
          numberField("dex", "DEX", 1, 99),
          numberField("int", "INT", 1, 99),
          numberField("pow", "POW", 1, 99),
          numberField("app", "APP", 1, 99),
          numberField("edu", "EDU", 1, 99),
          numberField("siz", "SIZ", 1, 99),
        ],
      },
      {
        id: "resources",
        label: "Ресурсы",
        fields: [
          { id: "hp", type: "resource", label: "HP", min: 0 },
          { id: "sanity", type: "resource", label: "Sanity", min: 0 },
          { id: "luck", type: "resource", label: "Luck", min: 0 },
        ],
      },
      {
        id: "skills",
        label: "Навыки",
        fields: [
          numberField("spot_hidden", "Spot Hidden", 1, 99),
          numberField("library_use", "Library Use", 1, 99),
          numberField("listen", "Listen", 1, 99),
          numberField("psychology", "Psychology", 1, 99),
          numberField("stealth", "Stealth", 1, 99),
          numberField("persuade", "Persuade", 1, 99),
        ],
      },
    ],
  },
};

// Та же схема Custom System с доски SheetCopy, без отдельного renderer для системы.
export const CUSTOM_SCHEMA: SheetSchema = {
  id: CUSTOM_SCHEMA_ID,
  game_system_id: CUSTOM_SYSTEM_ID,
  name: "Базовый лист",
  created_at: "2026-09-10T09:00:00Z",
  schema: {
    sections: [
      {
        id: "dossier",
        label: "Досье",
        fields: [
          { id: "callsign", type: "text", label: "Позывной", required: true },
          {
            id: "role",
            type: "select",
            label: "Роль",
            options: [
              { value: "pilot", label: "Пилот" },
              { value: "engineer", label: "Инженер" },
              { value: "medic", label: "Медик" },
            ],
          },
          numberField("rank", "Ранг", 1, 10),
          { id: "implant", type: "checkbox", label: "Имплант установлен" },
        ],
      },
      {
        id: "parameters",
        label: "Параметры",
        fields: [
          numberField("reflex", "Реакция", 1, 20),
          {
            id: "defense",
            type: "calculated",
            label: "Защита",
            formula: "floor(reflex / 2) + rank",
          },
          { id: "energy", type: "resource", label: "Энергия", min: 0 },
        ],
      },
    ],
  },
};

// Лист демонстрационной Space Frontier переиспользует поля досье, без нового renderer.
export const SPACE_FRONTIER_SCHEMA: SheetSchema = {
  id: "5c0a7c1e-0000-4000-8000-000000000004",
  game_system_id: SPACE_FRONTIER_SYSTEM_ID,
  name: "Экипаж",
  created_at: "2026-09-25T11:05:00Z",
  schema: {
    sections: [
      {
        id: "crew",
        label: "Экипаж",
        fields: structuredClone(CUSTOM_SCHEMA.schema.sections[0].fields),
      },
    ],
  },
};

export const MOCK_SHEET_SCHEMAS: SheetSchema[] = [
  DND_SCHEMA,
  COC_SCHEMA,
  CUSTOM_SCHEMA,
  SPACE_FRONTIER_SCHEMA,
];

export function getMockSheetSchema(schemaId: string): SheetSchema | undefined {
  return MOCK_SHEET_SCHEMAS.find((schema) => schema.id === schemaId);
}
