import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "@workspace/api-zod";

export class HttpError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, message: string, code = "error") {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
  }
}

export class NotFoundError extends HttpError {
  constructor(message = "Not found") {
    super(404, message, "not_found");
  }
}

export class BadRequestError extends HttpError {
  constructor(message: string) {
    super(400, message, "invalid_request");
  }
}

/** An external integration (Google, AI) is missing or unauthorized → 503. */
export class IntegrationUnavailableError extends HttpError {
  constructor(message: string, code = "integration_unavailable") {
    super(503, message, code);
  }
}

/** Google client errors carry the HTTP status on `.status` or `.response.status`. */
function googleStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const e = error as { status?: unknown; code?: unknown; response?: { status?: unknown } };
  const candidates = [e.response?.status, e.status, e.code];
  for (const value of candidates) {
    if (typeof value === "number") return value;
    if (typeof value === "string" && /^\d{3}$/.test(value)) return Number(value);
  }
  return undefined;
}

function isGoogleApiError(error: unknown): boolean {
  return (
    !!error && typeof error === "object" && ("config" in error || (error as { name?: string }).name === "GaxiosError")
  );
}

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ error: `No route for ${req.method} ${req.originalUrl}`, code: "not_found" });
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (res.headersSent) return;

  if (err instanceof ZodError) {
    const issue = err.issues[0];
    const where = issue?.path.length ? `${issue.path.join(".")}: ` : "";
    res.status(400).json({ error: `${where}${issue?.message ?? "Invalid request"}`, code: "invalid_request" });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, code: err.code });
    return;
  }

  // Malformed JSON bodies from express.json()
  if (err && typeof err === "object" && (err as { type?: string }).type === "entity.parse.failed") {
    res.status(400).json({ error: "Malformed JSON body", code: "invalid_json" });
    return;
  }

  if (isGoogleApiError(err)) {
    const status = googleStatus(err);
    if (status === 401 || status === 403) {
      res.status(503).json({
        error: "Google rejected the connection — reconnect the integration to restore the signal.",
        code: "integration_unauthorized",
      });
      return;
    }
    if (status === 404 || status === 410) {
      res.status(404).json({ error: "That item no longer exists in Google.", code: "not_found" });
      return;
    }
    console.error(`[api] Google API error on ${req.method} ${req.originalUrl}:`, (err as Error).message);
    res.status(502).json({ error: "Google API request failed.", code: "upstream_error" });
    return;
  }

  console.error(`[api] Unhandled error on ${req.method} ${req.originalUrl}:`, err);
  res.status(500).json({ error: "Internal server error", code: "internal" });
};
