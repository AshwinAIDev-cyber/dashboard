/**
 * Fetch mutator used by every generated hook.
 *
 * - Resolves `/api/...` URLs against an optional base (set it with
 *   `setApiBaseUrl` when the API lives on another origin).
 * - Parses JSON (and tolerates 204 / empty bodies).
 * - Throws `ApiError` for non-2xx responses so React Query surfaces them as
 *   errors with the server's `{ error, code }` payload attached.
 */

let apiBaseUrl = "";

export function setApiBaseUrl(url: string | null | undefined): void {
  apiBaseUrl = (url ?? "").replace(/\/+$/, "");
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;
  readonly body: unknown;

  constructor(status: number, message: string, code?: string, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.body = body;
  }

  /** True when an external integration (Google, AI) is not connected. */
  get isIntegrationUnavailable(): boolean {
    return this.status === 503;
  }
}

async function readBody(response: Response): Promise<unknown> {
  if (response.status === 204 || response.status === 205) return undefined;
  const text = await response.text();
  if (!text) return undefined;
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  return text;
}

export async function customFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const target = /^https?:\/\//i.test(url) ? url : `${apiBaseUrl}${url}`;
  const headers = new Headers(options.headers);
  if (options.body !== undefined && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  headers.set("accept", "application/json");

  const response = await fetch(target, {
    credentials: "same-origin",
    ...options,
    headers,
  });
  const body = await readBody(response);

  if (!response.ok) {
    const payload = body && typeof body === "object" ? (body as { error?: unknown; code?: unknown }) : {};
    const message = typeof payload.error === "string" ? payload.error : `Request failed with status ${response.status}`;
    const code = typeof payload.code === "string" ? payload.code : undefined;
    throw new ApiError(response.status, message, code, body);
  }

  return body as T;
}

/** Error type orval wires into every generated hook's `TError`. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type ErrorType<_Error = unknown> = ApiError;
/** Body type passthrough for generated mutations. */
export type BodyType<BodyData> = BodyData;
