import { IntegrationUnavailableError } from "./errors";

/**
 * OAuth access tokens for Replit-managed connectors (Google Calendar, Gmail).
 *
 * On Replit the connector service hands out short-lived access tokens for the
 * account the user connected in the Integrations pane. Tokens are cached until
 * a minute before they expire, and dropped early if Google rejects them.
 */

export type ConnectorName = "google-calendar" | "google-mail";

const LABELS: Record<ConnectorName, string> = {
  "google-calendar": "Google Calendar",
  "google-mail": "Gmail",
};

interface ConnectionSettings {
  access_token?: string;
  expires_at?: string | number;
  oauth?: { credentials?: { access_token?: string } };
}

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

const cache = new Map<ConnectorName, CachedToken>();
const inflight = new Map<ConnectorName, Promise<string>>();

function replitIdentityToken(): string | null {
  if (process.env.REPL_IDENTITY) return `repl ${process.env.REPL_IDENTITY}`;
  if (process.env.WEB_REPL_RENEWAL) return `depl ${process.env.WEB_REPL_RENEWAL}`;
  return null;
}

export function hasReplitConnectors(): boolean {
  return Boolean(process.env.REPLIT_CONNECTORS_HOSTNAME && replitIdentityToken());
}

async function fetchToken(connector: ConnectorName): Promise<string> {
  const label = LABELS[connector];
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const identity = replitIdentityToken();
  if (!hostname || !identity) {
    throw new IntegrationUnavailableError(`${label} is not connected in this environment.`);
  }

  let response: Response;
  try {
    response = await fetch(`https://${hostname}/api/v2/connection?include_secrets=true&connector_names=${connector}`, {
      headers: { Accept: "application/json", X_REPLIT_TOKEN: identity },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new IntegrationUnavailableError(`Could not reach the ${label} connector.`);
  }
  if (!response.ok) {
    throw new IntegrationUnavailableError(`${label} connector responded with ${response.status}.`);
  }

  const data = (await response.json()) as { items?: Array<{ settings?: ConnectionSettings }> };
  const settings = data.items?.[0]?.settings;
  const accessToken = settings?.access_token ?? settings?.oauth?.credentials?.access_token;
  if (!accessToken) {
    throw new IntegrationUnavailableError(`${label} is not connected. Connect it from Integrations.`);
  }

  const parsedExpiry = settings?.expires_at ? new Date(settings.expires_at).getTime() : NaN;
  const expiresAt = Number.isFinite(parsedExpiry) ? parsedExpiry : Date.now() + 5 * 60_000;
  cache.set(connector, { accessToken, expiresAt });
  return accessToken;
}

export async function getConnectorAccessToken(connector: ConnectorName): Promise<string> {
  const cached = cache.get(connector);
  if (cached && cached.expiresAt - 60_000 > Date.now()) return cached.accessToken;

  const pending = inflight.get(connector);
  if (pending) return pending;

  const request = fetchToken(connector).finally(() => inflight.delete(connector));
  inflight.set(connector, request);
  return request;
}

/** Forget a cached token (e.g. after Google answered 401). */
export function invalidateConnectorToken(connector: ConnectorName): void {
  cache.delete(connector);
}
