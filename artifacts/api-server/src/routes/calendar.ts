import { Router } from "express";
import {
  CreateCalendarEventBody,
  DeleteCalendarEventParams,
  ListCalendarEventsQueryParams,
  ListCalendarEventsResponse,
  ListCalendarEventsResponseItem,
} from "@workspace/api-zod";
import { BadRequestError, HttpError } from "../lib/errors";
import { fetchCalendarEvents, getUncachableGoogleCalendarClient, toCalendarEventDto } from "../lib/google-calendar";

const router = Router();
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function isValidTimeZone(zone: string | undefined): zone is string {
  if (!zone) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

router.get("/calendar/events", async (req, res) => {
  const { days } = ListCalendarEventsQueryParams.parse(req.query);
  // Look back a day so "today" is complete in every operator time zone; the
  // client trims anything that ended before its local midnight.
  const from = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const to = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  const events = await fetchCalendarEvents(from, to);
  res.json(ListCalendarEventsResponse.parse(events));
});

router.post("/calendar/events", async (req, res) => {
  const body = CreateCalendarEventBody.parse(req.body);
  const allDay = body.allDay ?? (DATE_ONLY.test(body.start) && DATE_ONLY.test(body.end));

  if (allDay) {
    if (!DATE_ONLY.test(body.start) || !DATE_ONLY.test(body.end)) {
      throw new BadRequestError("All-day events need start/end as YYYY-MM-DD");
    }
  } else if (Number.isNaN(Date.parse(body.start)) || Number.isNaN(Date.parse(body.end))) {
    throw new BadRequestError("start and end must be ISO date-times");
  }
  if (body.end < body.start && allDay) throw new BadRequestError("end must not be before start");
  if (!allDay && Date.parse(body.end) <= Date.parse(body.start)) {
    throw new BadRequestError("end must be after start");
  }

  const timeZone = isValidTimeZone(body.timeZone) ? body.timeZone : undefined;
  const calendar = await getUncachableGoogleCalendarClient();
  const { data } = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: body.summary.trim(),
      description: body.description?.trim() || undefined,
      location: body.location?.trim() || undefined,
      start: allDay ? { date: body.start } : { dateTime: new Date(body.start).toISOString(), timeZone },
      end: allDay ? { date: body.end } : { dateTime: new Date(body.end).toISOString(), timeZone },
    },
  });
  const event = toCalendarEventDto(data);
  if (!event) throw new HttpError(502, "Google returned an incomplete event", "upstream_error");
  res.status(201).json(ListCalendarEventsResponseItem.parse(event));
});

router.delete("/calendar/events/:eventId", async (req, res) => {
  const { eventId } = DeleteCalendarEventParams.parse(req.params);
  const calendar = await getUncachableGoogleCalendarClient();
  await calendar.events.delete({ calendarId: "primary", eventId });
  res.status(204).end();
});

export default router;
