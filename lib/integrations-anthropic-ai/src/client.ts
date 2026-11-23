import Anthropic from "@anthropic-ai/sdk";

/**
 * Anthropic client for the workspace.
 *
 * Credentials resolve in this order:
 *   1. Replit AI Integrations (AI_INTEGRATIONS_ANTHROPIC_API_KEY + _BASE_URL),
 *      provisioned automatically when the integration is enabled on Replit.
 *   2. A plain ANTHROPIC_API_KEY (optionally ANTHROPIC_BASE_URL) for running
 *      anywhere else.
 */

export const DEFAULT_MODEL = "claude-opus-5-5";

function resolveCredentials(): { apiKey: string; baseURL?: string } | null {
  const replitKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
  if (replitKey) {
    return {
      apiKey: replitKey,
      baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL || undefined,
    };
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    return { apiKey, baseURL: process.env.ANTHROPIC_BASE_URL || undefined };
  }
  return null;
}

export function isAnthropicConfigured(): boolean {
  return resolveCredentials() !== null;
}

let cached: Anthropic | null = null;

/** Returns a shared client, or throws if no credentials are configured. */
export function getAnthropicClient(): Anthropic {
  if (cached) return cached;
  const credentials = resolveCredentials();
  if (!credentials) {
    throw new Error(
      "Anthropic is not configured. Enable the Replit Anthropic AI integration or set ANTHROPIC_API_KEY.",
    );
  }
  cached = new Anthropic({
    apiKey: credentials.apiKey,
    baseURL: credentials.baseURL,
    maxRetries: 2,
  });
  return cached;
}

/** True for errors worth retrying (rate limits, overload, transient 5xx, network). */
export function isRetryableAnthropicError(error: unknown): boolean {
  if (error instanceof Anthropic.RateLimitError) return true;
  if (error instanceof Anthropic.InternalServerError) return true;
  if (error instanceof Anthropic.APIConnectionError) return true;
  if (error instanceof Anthropic.APIError) {
    return error.status === 408 || error.status === 409 || error.status === 529;
  }
  return false;
}

export { Anthropic };
