import { type gmail_v1, google } from "googleapis";
import { getGoogleAuth } from "./google-auth";

/** Fresh Gmail client per call — access tokens expire, so never cache the client. */
export async function getUncachableGmailClient(): Promise<gmail_v1.Gmail> {
  const auth = await getGoogleAuth("google-mail");
  return google.gmail({ version: "v1", auth });
}

type Header = gmail_v1.Schema$MessagePartHeader;

export function header(headers: Header[] | undefined, name: string): string {
  const lower = name.toLowerCase();
  return headers?.find((h) => h.name?.toLowerCase() === lower)?.value?.trim() ?? "";
}

/** Split `"Ada Lovelace" <ada@example.com>` into display name + address. */
export function parseAddress(raw: string): { name: string; address: string } {
  const match = raw.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (match) {
    const address = match[2]!.trim();
    return { name: match[1]!.trim() || address, address };
  }
  const address = raw.trim();
  return { name: address, address };
}

export function decodeBase64Url(data: string): string {
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (whole, entity: string) => {
    if (entity[0] === "#") {
      const code = entity[1]?.toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    return ENTITIES[entity.toLowerCase()] ?? whole;
  });
}

/** Very small HTML → readable text conversion for HTML-only emails. */
export function htmlToText(html: string): string {
  const text = html
    .replace(/<(script|style|head)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6]|blockquote|section|article|table)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href: string, label: string) => {
      const inner = label.replace(/<[^>]+>/g, "").trim();
      return inner && inner !== href ? `${inner} (${href})` : href;
    })
    .replace(/<[^>]+>/g, "");
  return decodeEntities(text)
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function findPart(
  part: gmail_v1.Schema$MessagePart | undefined,
  mimeType: string,
): gmail_v1.Schema$MessagePart | undefined {
  if (!part) return undefined;
  if (part.mimeType === mimeType && part.body?.data && !part.filename) return part;
  for (const child of part.parts ?? []) {
    const found = findPart(child, mimeType);
    if (found) return found;
  }
  return undefined;
}

/** Best readable body: text/plain if present, otherwise text/html converted to text. */
export function extractBody(payload: gmail_v1.Schema$MessagePart | undefined, fallback: string): string {
  const plain = findPart(payload, "text/plain");
  if (plain?.body?.data) return decodeBase64Url(plain.body.data).replace(/\r\n/g, "\n").trim();
  const html = findPart(payload, "text/html");
  if (html?.body?.data) return htmlToText(decodeBase64Url(html.body.data));
  return fallback;
}

export interface EmailSummaryDto {
  id: string;
  threadId: string;
  from: string;
  fromName: string;
  subject: string;
  snippet: string;
  date: string;
  unread: boolean;
}

export function toEmailSummary(message: gmail_v1.Schema$Message): EmailSummaryDto {
  const headers = message.payload?.headers ?? undefined;
  const sender = parseAddress(header(headers, "From"));
  const internal = Number(message.internalDate);
  const date = Number.isFinite(internal) ? new Date(internal) : new Date(header(headers, "Date") || Date.now());
  return {
    id: message.id ?? "",
    threadId: message.threadId ?? message.id ?? "",
    from: sender.address,
    fromName: sender.name,
    subject: header(headers, "Subject") || "(no subject)",
    snippet: decodeEntities(message.snippet ?? ""),
    date: (Number.isNaN(date.getTime()) ? new Date() : date).toISOString(),
    unread: message.labelIds?.includes("UNREAD") ?? false,
  };
}

/** Recent inbox messages with metadata, newest first. */
export async function fetchInbox(maxResults: number, query?: string): Promise<EmailSummaryDto[]> {
  const gmail = await getUncachableGmailClient();
  const { data } = await gmail.users.messages.list({
    userId: "me",
    labelIds: ["INBOX"],
    maxResults,
    q: query,
  });
  const ids = (data.messages ?? []).map((m) => m.id).filter((id): id is string => Boolean(id));
  const messages = await Promise.all(
    ids.map((id) =>
      gmail.users.messages
        .get({
          userId: "me",
          id,
          format: "metadata",
          metadataHeaders: ["From", "Subject", "Date"],
        })
        .then((res) => res.data),
    ),
  );
  return messages.map(toEmailSummary).sort((a, b) => b.date.localeCompare(a.date));
}

/** RFC 2047 encode a header value when it contains non-ASCII characters. */
function encodeHeader(value: string): string {
  // eslint-disable-next-line no-control-regex
  return /^[\x00-\x7F]*$/.test(value) ? value : `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

/** Strip CR/LF so user input can never inject extra headers. */
const singleLine = (value: string) => value.replace(/[\r\n]+/g, " ").trim();

export function buildRawEmail(options: {
  to: string;
  subject: string;
  body: string;
  inReplyTo?: string;
  references?: string;
}): string {
  const lines = [
    `To: ${singleLine(options.to)}`,
    `Subject: ${encodeHeader(singleLine(options.subject))}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
  ];
  if (options.inReplyTo) lines.push(`In-Reply-To: ${singleLine(options.inReplyTo)}`);
  if (options.references) lines.push(`References: ${singleLine(options.references)}`);
  const encodedBody = Buffer.from(options.body.replace(/\r?\n/g, "\r\n"), "utf8")
    .toString("base64")
    .replace(/(.{76})/g, "$1\r\n");
  const message = `${lines.join("\r\n")}\r\n\r\n${encodedBody}`;
  return Buffer.from(message, "utf8").toString("base64url");
}
