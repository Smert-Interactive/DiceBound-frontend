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
