// В EDIT-запросе history_visible отсутствует: новая копия всегда начинает с v1.
export type CreateShareRequest =
  | { recipient_email: string; permission: "VIEW"; history_visible: boolean }
  | { recipient_email: string; permission: "EDIT"; history_visible?: never };

interface ShareBase {
  id: string;
  character_id: string;
  user_id: string;
  recipient_email: string;
  created_at: string;
}

// CharacterShare из technical-contracts.md: у переданной EDIT-копии своя история.
export type CharacterShare = ShareBase &
  (
    | { permission: "VIEW"; history_visible: boolean }
    | { permission: "EDIT"; history_visible: null }
  );
