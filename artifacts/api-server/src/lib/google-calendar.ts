import { type calendar_v3, google } from "googleapis";
import { getGoogleAuth } from "./google-auth";

/** Fresh Calendar client per call — access tokens expire, so never cache the client. */
export async function getUncachableGoogleCalendarClient(): Promise<calendar_v3.Calendar> {
  const auth = await getGoogleAuth("google-calendar");
  return google.calendar({ version: "v3", auth });
}

export interface CalendarEventDto {
  id: string;
  summary: string;
  description: string | null;
  location: string | null;
  start: string;
  end: string;
  allDay: boolean;
  htmlLink: string | null;
}

export function toCalendarEventDto(event: calendar_v3.Schema$Event): CalendarEventDto | null {
  const start = event.start?.dateTime ?? event.start?.date;
  const end = event.end?.dateTime ?? event.end?.date ?? start;
  if (!event.id || !start || !end) return null;
  return {
    id: event.id,
    summary: event.summary?.trim() || "(untitled event)",
    description: event.description ?? null,
    location: event.location ?? null,
    start,
    end,
    allDay: !event.start?.dateTime,
    htmlLink: event.htmlLink ?? null,
  };
}

/** Events from the primary calendar between `from` and `to`, ordered by start. */
export async function fetchCalendarEvents(from: Date, to: Date): Promise<CalendarEventDto[]> {
  const calendar = await getUncachableGoogleCalendarClient();
  const { data } = await calendar.events.list({
    calendarId: "primary",
    timeMin: from.toISOString(),
    timeMax: to.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 250,
  });
  return (data.items ?? [])
    .filter((event) => event.status !== "cancelled")
    .map(toCalendarEventDto)
    .filter((event): event is CalendarEventDto => event !== null);
}
