import type { SheetSchema } from "../sheet/sheetTypes";
import type { GameSystemSummary } from "./systemTypes";

export interface ImportGameSystemRequest {
  system_name: string;
  sheet_schema_name: string;
  schema_text: string;
}

export interface ImportedSystemResult {
  system: GameSystemSummary;
  sheet_schema: SheetSchema;
}
