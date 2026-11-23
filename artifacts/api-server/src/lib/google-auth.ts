import { type Auth, google } from "googleapis";
import { IntegrationUnavailableError } from "./errors";
import { type ConnectorName, getConnectorAccessToken, hasReplitConnectors } from "./replit-connectors";

/**
 * Resolve an authenticated OAuth2 client for a Google connector.
 *
 * 1. Replit connectors (preferred on Replit).
 * 2. Self-hosted fallback: GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET +
 *    GOOGLE_REFRESH_TOKEN (refresh token must carry Calendar + Gmail scopes).
 */
let refreshClient: Auth.OAuth2Client | null = null;

function selfHostedClient(): Auth.OAuth2Client | null {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) return null;
  if (!refreshClient) {
    refreshClient = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
    refreshClient.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });
  }
  return refreshClient;
}

export function isGoogleConfigured(): boolean {
  return hasReplitConnectors() || selfHostedClient() !== null;
}

export async function getGoogleAuth(connector: ConnectorName): Promise<Auth.OAuth2Client> {
  if (hasReplitConnectors()) {
    const accessToken = await getConnectorAccessToken(connector);
    const client = new google.auth.OAuth2();
    client.setCredentials({ access_token: accessToken });
    return client;
  }
  const fallback = selfHostedClient();
  if (fallback) return fallback;
  throw new IntegrationUnavailableError(
    connector === "google-calendar" ? "Google Calendar is not connected." : "Gmail is not connected.",
  );
}
