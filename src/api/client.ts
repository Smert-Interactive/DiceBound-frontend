import type { ApiErrorDetail } from "./types";

// Сохраняет HTTP-статус и серверные подробности для обработки ошибок в интерфейсе.
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: ApiErrorDetail[];
  readonly retryAfter?: string | null;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: ApiErrorDetail[],
    retryAfter?: string | null,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.retryAfter = retryAfter;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
}

// Отправляет JSON с cookie; пустой ответ logout не пытается разобрать как JSON.
export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    method: options.method ?? "GET",
    credentials: "include",
    cache: "no-store",
    signal: options.signal,
    headers: {
      Accept: "application/json",
      ...(options.body === undefined
        ? {}
        : { "Content-Type": "application/json" }),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  if (!response.ok) {
    // При HTML-ошибке прокси сохраняем HTTP-статус даже без JSON-ответа.
    const error = await response.json().catch(() => null);
    throw new ApiError(
      response.status,
      typeof error?.code === "string" ? error.code : "HTTP_ERROR",
      typeof error?.message === "string"
        ? error.message
        : "Не удалось выполнить запрос",
      Array.isArray(error?.details) ? error.details : undefined,
      response.headers.get("Retry-After"),
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
