export interface User {
  id: string;
  username: string;
  email: string;
  created_at: string;
}

export interface CurrentUser extends User {
  owned_characters_count: number;
  shared_characters_count: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends LoginCredentials {
  passwordConfirmation: string;
}

export interface ApiErrorDetail {
  field?: string;
  path?: string;
  line?: number | null;
  message: string;
}
