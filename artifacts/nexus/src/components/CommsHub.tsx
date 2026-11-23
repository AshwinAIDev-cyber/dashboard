import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarPlus, Clock, ExternalLink, MapPin, PenLine, RefreshCw, Reply, Send, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ApiError,
  getListCalendarEventsQueryKey,
  getListEmailMessagesQueryKey,
  useCreateCalendarEvent,
  useDeleteCalendarEvent,
  useGetEmailMessage,
  useListCalendarEvents,
  useListEmailMessages,
  useSendEmail,
  getGetEmailMessageQueryKey,
  type CalendarEvent,
  type EmailSummary,
} from "@workspace/api-client-react";
import { SenderAvatar } from "@/components/SenderAvatar";
import { SignalWaveform } from "@/components/SignalWaveform";
import { ConfirmIconButton } from "@/components/hud/ConfirmIconButton";
import { GlassModal } from "@/components/hud/GlassModal";
import { HudPanel } from "@/components/hud/HudPanel";
import { SectionHeading } from "@/components/hud/SectionHeading";
import { SignalLost } from "@/components/hud/SignalLost";
import { StatChip } from "@/components/hud/StatChip";
import { errorMessage } from "@/hooks/use-nexus-data";
import { useNow } from "@/hooks/use-now";
import {
  addDays,
  formatInboxDate,
  formatTime,
  fromDateKey,
  localDateKey,
  operatorTimeZone,
  startOfDay,
} from "@/lib/format";
import { cn, hashString, seededRandom } from "@/lib/utils";

const DAYS = 14;
const calendarParams = { days: DAYS };
const calendarKey = getListCalendarEventsQueryKey(calendarParams);
const inboxParams = { maxResults: 20 };
const inboxKey = getListEmailMessagesQueryKey(inboxParams);

function offlineCopy(error: unknown, service: string) {
  if (error instanceof ApiError && error.status === 503) {
    return {
      message: error.message,
      hint: `Connect ${service} from the Replit Integrations pane (or set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN) to restore the link.`,
    };
  }
  return { message: errorMessage(error, `${service} is not responding.`), hint: undefined };
}

/* ======================================================================
   Calendar
   ====================================================================== */

/** Which local days an event touches (all-day events use exclusive end dates). */
function eventDayKeys(event: CalendarEvent): string[] {
  if (event.allDay) {
    const keys: string[] = [];
    let day = fromDateKey(event.start);
    const end = fromDateKey(event.end);
    while (day < end && keys.length < 62) {
      keys.push(localDateKey(day));
      day = addDays(day, 1);
    }
    return keys.length ? keys : [event.start];
  }
  const start = new Date(event.start);
  const end = new Date(new Date(event.end).getTime() - 1);
  const keys: string[] = [];
  let day = startOfDay(start);
  while (day <= end && keys.length < 62) {
    keys.push(localDateKey(day));
    day = addDays(day, 1);
  }
  return keys.length ? keys : [localDateKey(start)];
}

function DayCapsule({
  date,
  count,
  selected,
  isToday,
  onSelect,
}: {
  date: Date;
  count: number;
  selected: boolean;
  isToday: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onSelect}
      className={cn(
        "relative flex w-[4.25rem] shrink-0 snap-start flex-col items-center rounded-[1.4rem] border px-2 pb-2.5 pt-2 transition-all",
        selected
          ? "border-nexus-cyan/70 bg-nexus-cyan/12 shadow-[0_0_24px_-6px_#00c8ff]"
          : "border-white/[0.07] bg-white/[0.03] hover:border-nexus-cyan/30 hover:bg-white/[0.05]",
      )}
    >
      {selected && (
        <motion.span
          layoutId="day-glow"
          className="absolute inset-0 rounded-[1.4rem] bg-gradient-to-b from-nexus-cyan/20 to-transparent"
        />
      )}
      <span
        className={cn(
          "relative font-[Share_Tech_Mono] text-[0.6rem] tracking-[0.2em]",
          isToday ? "text-nexus-cyan" : "text-ink-faint",
        )}
      >
        {isToday ? "TODAY" : date.toLocaleDateString([], { weekday: "short" }).toUpperCase()}
      </span>
      <span className={cn("relative mt-0.5 font-[Orbitron] text-xl font-bold", selected ? "text-ink" : "text-ink-dim")}>
        {date.getDate()}
      </span>
      <span className="relative font-[Share_Tech_Mono] text-[0.55rem] tracking-[0.15em] text-ink-faint">
        {date.toLocaleDateString([], { month: "short" }).toUpperCase()}
      </span>
      <span className="relative mt-1.5 flex h-1.5 items-center gap-0.5">
        {Array.from({ length: Math.min(count, 4) }, (_, i) => (
          <span key={i} className="h-1.5 w-1.5 rounded-full bg-nexus-cyan shadow-[0_0_6px_#00c8ff]" />
        ))}
        {count > 4 && <span className="font-[Share_Tech_Mono] text-[0.5rem] text-nexus-cyan">+</span>}
      </span>
    </button>
  );
}

function EventCard({ event, now, onDelete }: { event: CalendarEvent; now: Date; onDelete: () => void }) {
  const start = new Date(event.start);
  const end = new Date(event.end);
  const live = !event.allDay && start <= now && end > now;
  const past = !event.allDay && end <= now;
  const progress = live ? (now.getTime() - start.getTime()) / (end.getTime() - start.getTime()) : 0;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      className="relative pl-8"
    >
      {/* rail node */}
      <span
        aria-hidden
        className={cn(
          "absolute left-[7px] top-4 h-3 w-3 rotate-45 border-2",
          live
            ? "border-nexus-green bg-nexus-green shadow-[0_0_12px_#00ff6a]"
            : past
              ? "border-ink-faint bg-obsidian-900"
              : "border-nexus-cyan bg-obsidian-900 shadow-[0_0_10px_#00c8ff]",
        )}
      />
      <article className={cn("nexus-glass group rounded-xl p-3.5 transition-opacity", past && "opacity-55")}>
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 font-[Share_Tech_Mono] text-xs tracking-wider text-nexus-cyan">
              <Clock className="h-3 w-3" />
              {event.allDay ? "ALL DAY" : `${formatTime(start)} – ${formatTime(end)}`}
              {live && (
                <span className="rounded-full bg-nexus-green/15 px-2 py-0.5 text-[0.58rem] tracking-[0.2em] text-nexus-green">
                  LIVE
                </span>
              )}
            </p>
            <h4 className="mt-1 text-[1.05rem] font-semibold leading-snug text-ink [overflow-wrap:anywhere]">
              {event.summary}
            </h4>
            {event.location && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-dim">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{event.location}</span>
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
            {event.htmlLink && (
              <a
                href={event.htmlLink}
                target="_blank"
                rel="noreferrer"
                className="nexus-icon-btn h-8 w-8"
                aria-label="Open in Google Calendar"
                title="Open in Google Calendar"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            <ConfirmIconButton
              icon={<Trash2 className="h-3.5 w-3.5" />}
              label="Delete event"
              confirmLabel="Delete"
              onConfirm={onDelete}
            />
          </div>
        </div>
        {live && (
          <div className="xp-bar mt-3 h-1 [--xp-color:#00ff6a]">
            <div className="xp-fill" style={{ width: `${progress * 100}%` }} />
          </div>
        )}
      </article>
    </motion.li>
  );
}

function ScheduleForm({ dayKey, onDone }: { dayKey: string; onDone: () => void }) {
  const qc = useQueryClient();
  const [summary, setSummary] = useState("");
  const [date, setDate] = useState(dayKey);
  const [startTime, setStartTime] = useState(() => {
    const next = new Date();
    next.setMinutes(0, 0, 0);
    next.setHours(Math.min(next.getHours() + 1, 23));
    return next.toTimeString().slice(0, 5);
  });
  const [endTime, setEndTime] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState("");

  useEffect(() => setDate(dayKey), [dayKey]);
  useEffect(() => {
    if (!startTime) return;
    const [h, m] = startTime.split(":").map(Number);
    const end = new Date(2000, 0, 1, h, m + 30);
    setEndTime(end.toTimeString().slice(0, 5));
  }, [startTime]);

  const create = useCreateCalendarEvent({
    mutation: {
      onSuccess: (event) => {
        qc.setQueryData<CalendarEvent[]>(calendarKey, (old) =>
          [...(old ?? []), event].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()),
        );
        toast.success("Event scheduled", { description: event.summary });
        onDone();
      },
      onError: (error) => toast.error("Could not schedule", { description: errorMessage(error) }),
      onSettled: () => qc.invalidateQueries({ queryKey: calendarKey }),
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const title = summary.trim();
    if (!title) return;
    if (allDay) {
      create.mutate({
        data: {
          summary: title,
          location: location.trim() || undefined,
          allDay: true,
          start: date,
          end: localDateKey(addDays(fromDateKey(date), 1)),
        },
      });
      return;
    }
    const start = new Date(`${date}T${startTime}`);
    let end = new Date(`${date}T${endTime}`);
    if (end <= start) end = new Date(end.getTime() + 24 * 3600 * 1000);
    create.mutate({
      data: {
        summary: title,
        location: location.trim() || undefined,
        start: start.toISOString(),
        end: end.toISOString(),
        timeZone: operatorTimeZone(),
      },
    });
  };

  return (
    <motion.form
      onSubmit={submit}
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="overflow-hidden"
      aria-label="Schedule event"
    >
      <div className="mb-4 space-y-3 rounded-xl border border-nexus-cyan/20 bg-obsidian-950/40 p-3.5">
        <input
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Event title"
          className="nexus-input"
          maxLength={300}
          autoFocus
          aria-label="Event title"
        />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1.3fr_1fr_1fr]">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="nexus-input col-span-2 sm:col-span-1"
            required
            aria-label="Date"
          />
          {!allDay && (
            <>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="nexus-input"
                required
                aria-label="Start time"
              />
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="nexus-input"
                required
                aria-label="End time"
              />
            </>
          )}
        </div>
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Location (optional)"
          className="nexus-input"
          maxLength={500}
          aria-label="Location"
        />
        <div className="flex items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-dim">
            <input
              type="checkbox"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="h-4 w-4 accent-[#00c8ff]"
            />
            All day
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={onDone} className="nexus-btn [--btn-color:#8fa3c0]">
              Cancel
            </button>
            <button type="submit" disabled={!summary.trim() || create.isPending} className="nexus-btn nexus-btn-solid">
              <CalendarPlus className="h-3.5 w-3.5" />
              {create.isPending ? "Scheduling" : "Schedule"}
            </button>
          </div>
        </div>
      </div>
    </motion.form>
  );
}

function CalendarTimeline() {
  const qc = useQueryClient();
  const now = useNow(30_000);
  const calendar = useListCalendarEvents(calendarParams, {
    query: { queryKey: calendarKey, staleTime: 60_000, refetchInterval: 120_000 },
  });
  const todayKey = localDateKey(now);
  const [selected, setSelected] = useState(todayKey);
  const [scheduling, setScheduling] = useState(false);

  const remove = useDeleteCalendarEvent({
    mutation: {
      onMutate: async ({ eventId }) => {
        await qc.cancelQueries({ queryKey: calendarKey });
        const previous = qc.getQueryData<CalendarEvent[]>(calendarKey);
        qc.setQueryData<CalendarEvent[]>(calendarKey, (old) => old?.filter((e) => e.id !== eventId));
        return { previous };
      },
      onError: (error, _vars, context) => {
        const ctx = context as { previous?: CalendarEvent[] } | undefined;
        if (ctx?.previous) qc.setQueryData(calendarKey, ctx.previous);
        toast.error("Could not delete event", { description: errorMessage(error) });
      },
      onSettled: () => qc.invalidateQueries({ queryKey: calendarKey }),
    },
  });

  const days = useMemo(() => Array.from({ length: DAYS }, (_, i) => addDays(startOfDay(now), i)), [now]);

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of calendar.data ?? []) {
      for (const key of eventDayKeys(event)) {
        if (key < todayKey) continue;
        const list = map.get(key) ?? [];
        list.push(event);
        map.set(key, list);
      }
    }
    for (const list of map.values()) {
      list.sort(
        (a, b) => Number(b.allDay) - Number(a.allDay) || new Date(a.start).getTime() - new Date(b.start).getTime(),
      );
    }
    return map;
  }, [calendar.data, todayKey]);

  const events = byDay.get(selected) ?? [];
  const selectedDate = fromDateKey(selected);
  const offline = calendar.isError ? offlineCopy(calendar.error, "Google Calendar") : null;

  return (
    <HudPanel
      kicker="Temporal feed · Google Calendar"
      title="Holo-Timeline"
      strong
      actions={
        <>
          <button
            type="button"
            className="nexus-icon-btn"
            onClick={() => void calendar.refetch()}
            aria-label="Refresh calendar"
            title="Refresh"
          >
            <RefreshCw className={cn("h-4 w-4", calendar.isFetching && "animate-spin")} />
          </button>
          {!offline && (
            <button
              type="button"
              className="nexus-btn px-3 py-1.5 text-[0.58rem]"
              onClick={() => setScheduling((v) => !v)}
              aria-expanded={scheduling}
            >
              <CalendarPlus className="h-3.5 w-3.5" />
              Schedule
            </button>
          )}
        </>
      }
    >
      {offline ? (
        <SignalLost
          message={offline.message}
          hint={offline.hint}
          onRetry={() => void calendar.refetch()}
          retrying={calendar.isFetching}
        />
      ) : (
        <>
          <div role="tablist" aria-label="Days" className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-3">
            {days.map((day) => {
              const key = localDateKey(day);
              return (
                <DayCapsule
                  key={key}
                  date={day}
                  count={byDay.get(key)?.length ?? 0}
                  selected={key === selected}
                  isToday={key === todayKey}
                  onSelect={() => setSelected(key)}
                />
              );
            })}
          </div>

          <AnimatePresence>
            {scheduling && <ScheduleForm dayKey={selected} onDone={() => setScheduling(false)} />}
          </AnimatePresence>

          <div className="flex items-baseline justify-between border-t border-white/[0.06] pt-4">
            <h3 className="font-[Orbitron] text-sm font-bold tracking-[0.14em] text-ink">
              {selectedDate.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" }).toUpperCase()}
            </h3>
            <span className="font-[Share_Tech_Mono] text-xs text-ink-faint">
              {events.length} EVENT{events.length === 1 ? "" : "S"}
            </span>
          </div>

          {calendar.isPending ? (
            <div className="mt-4 space-y-3" aria-hidden>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="ml-8 h-16 animate-shimmer rounded-xl bg-[linear-gradient(90deg,rgba(255,255,255,0.03),rgba(0,200,255,0.08),rgba(255,255,255,0.03))] bg-[length:200%_100%]"
                />
              ))}
            </div>
          ) : events.length === 0 ? (
            <p className="mt-6 pb-2 text-center text-ink-dim">
              Clear skies — nothing scheduled.{" "}
              <button
                type="button"
                className="text-nexus-cyan underline-offset-4 hover:underline"
                onClick={() => setScheduling(true)}
              >
                Schedule something
              </button>
            </p>
          ) : (
            <ul className="relative mt-4 space-y-3">
              <span
                aria-hidden
                className="absolute bottom-2 left-[12px] top-2 w-px bg-gradient-to-b from-nexus-cyan/60 via-nexus-cyan/20 to-transparent"
              />
              <AnimatePresence initial={false}>
                {events.map((event) => (
                  <EventCard
                    key={`${selected}-${event.id}`}
                    event={event}
                    now={now}
                    onDelete={() => remove.mutate({ eventId: event.id })}
                  />
                ))}
              </AnimatePresence>
            </ul>
          )}
        </>
      )}
    </HudPanel>
  );
}

/* ======================================================================
   Inbox
   ====================================================================== */

function RedactionBars({ seed }: { seed: string }) {
  const widths = useMemo(() => {
    const rand = seededRandom(hashString(seed));
    return Array.from({ length: 3 }, () => 18 + Math.round(rand() * 46));
  }, [seed]);
  return (
    <span aria-hidden className="flex gap-1.5">
      {widths.map((w, i) => (
        <span key={i} className="redaction" style={{ width: w }} />
      ))}
    </span>
  );
}

function EmailCard({ email, index, onOpen }: { email: EmailSummary; index: number; onOpen: () => void }) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.035, 0.35) }}
    >
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          "classified-card group relative flex w-full items-start gap-3.5 overflow-hidden rounded-xl border p-3.5 text-left transition-all hover:-translate-y-0.5",
          email.unread
            ? "border-nexus-cyan/35 hover:shadow-[0_0_28px_-10px_#00c8ff]"
            : "border-white/[0.06] hover:border-white/15",
        )}
      >
        {/* folder tab */}
        <span
          aria-hidden
          className="absolute right-0 top-0 h-6 w-16 bg-gradient-to-l from-white/[0.06] to-transparent [clip-path:polygon(14px_0,100%_0,100%_100%,0_100%)]"
        />
        <SenderAvatar name={email.fromName} email={email.from} unread={email.unread} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <p
              className={cn(
                "truncate text-[0.98rem]",
                email.unread ? "font-bold text-ink" : "font-semibold text-ink-dim",
              )}
            >
              {email.fromName}
            </p>
            <span className="ml-auto shrink-0 font-[Share_Tech_Mono] text-[0.68rem] tracking-wider text-ink-faint">
              {formatInboxDate(email.date)}
            </span>
          </div>
          <p className={cn("truncate text-sm", email.unread ? "text-ink" : "text-ink-dim")}>{email.subject}</p>
          <p className="mt-0.5 line-clamp-1 text-[0.82rem] text-ink-faint">{email.snippet}</p>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={cn(
                "rounded-sm border px-1.5 py-px font-[Share_Tech_Mono] text-[0.56rem] tracking-[0.25em]",
                email.unread ? "border-nexus-red/50 text-nexus-red" : "border-ink-faint/40 text-ink-faint",
              )}
            >
              {email.unread ? "CLASSIFIED · NEW" : "DECLASSIFIED"}
            </span>
            <RedactionBars seed={email.id} />
          </div>
        </div>
      </button>
    </motion.li>
  );
}

function ComposeForm({
  initial,
  onSent,
  onCancel,
}: {
  initial: { to: string; subject: string; body?: string; threadId?: string; inReplyTo?: string };
  onSent: () => void;
  onCancel?: () => void;
}) {
  const qc = useQueryClient();
  const [to, setTo] = useState(initial.to);
  const [subject, setSubject] = useState(initial.subject);
  const [body, setBody] = useState(initial.body ?? "");
  const send = useSendEmail({
    mutation: {
      onSuccess: () => {
        toast.success("Transmission sent", { description: `To ${to}` });
        void qc.invalidateQueries({ queryKey: inboxKey });
        onSent();
      },
      onError: (error) => toast.error("Transmission failed", { description: errorMessage(error) }),
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!to.trim() || !subject.trim() || !body.trim()) return;
    send.mutate({
      data: { to: to.trim(), subject: subject.trim(), body, threadId: initial.threadId, inReplyTo: initial.inReplyTo },
    });
  };

  return (
    <form onSubmit={submit} className="space-y-3" aria-label="Compose transmission">
      <label className="block">
        <span className="hud-label">To</span>
        <input
          type="email"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="nexus-input mt-1"
          required
          placeholder="recipient@domain.com"
        />
      </label>
      <label className="block">
        <span className="hud-label">Subject</span>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="nexus-input mt-1"
          required
          maxLength={300}
        />
      </label>
      <label className="block">
        <span className="hud-label">Message</span>
        <textarea
          data-autofocus
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={8}
          required
          maxLength={20000}
          className="nexus-input mt-1 resize-y font-[Rajdhani] leading-relaxed"
          placeholder="Compose your transmission…"
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit(e);
          }}
        />
      </label>
      <div className="flex items-center justify-end gap-2">
        <span className="mr-auto hidden font-[Share_Tech_Mono] text-[0.62rem] tracking-[0.2em] text-ink-faint sm:block">
          CTRL/⌘ + ENTER TO SEND
        </span>
        {onCancel && (
          <button type="button" onClick={onCancel} className="nexus-btn [--btn-color:#8fa3c0]">
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={send.isPending || !to.trim() || !subject.trim() || !body.trim()}
          className="nexus-btn nexus-btn-solid"
        >
          <Send className="h-3.5 w-3.5" />
          {send.isPending ? "Transmitting" : "Transmit"}
        </button>
      </div>
    </form>
  );
}

function EmailReader({ email, onClose }: { email: EmailSummary | null; onClose: () => void }) {
  const [replying, setReplying] = useState(false);
  const messageId = email?.id ?? "";
  const message = useGetEmailMessage(messageId, {
    query: { queryKey: getGetEmailMessageQueryKey(messageId), enabled: Boolean(email), staleTime: 5 * 60_000 },
  });

  useEffect(() => setReplying(false), [messageId]);

  const full = message.data;
  const replySubject = email ? (/^re:/i.test(email.subject) ? email.subject : `Re: ${email.subject}`) : "";

  return (
    <GlassModal
      open={Boolean(email)}
      onClose={onClose}
      labelId="email-reader-title"
      kicker={<span className="text-nexus-red">● Intercepted transmission</span>}
      title={email?.subject ?? ""}
      footer={
        email && !replying ? (
          <div className="flex justify-end">
            <button type="button" className="nexus-btn" onClick={() => setReplying(true)}>
              <Reply className="h-3.5 w-3.5" /> Reply
            </button>
          </div>
        ) : undefined
      }
    >
      {email && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <SenderAvatar name={email.fromName} email={email.from} size={48} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-ink">{email.fromName}</p>
              <p className="truncate font-[Share_Tech_Mono] text-xs text-ink-faint">{email.from}</p>
              {full?.to && <p className="truncate font-[Share_Tech_Mono] text-xs text-ink-faint">to {full.to}</p>}
            </div>
            <p className="shrink-0 text-right font-[Share_Tech_Mono] text-xs text-ink-dim">
              {new Date(email.date).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
            </p>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-obsidian-950/50 p-4">
            {message.isPending ? (
              <div className="space-y-2" aria-label="Decrypting">
                <p className="font-[Share_Tech_Mono] text-xs tracking-[0.25em] text-nexus-cyan animate-blink">
                  DECRYPTING…
                </p>
                {[92, 80, 86, 60].map((w, i) => (
                  <div key={i} className="redaction block h-3" style={{ width: `${w}%` }} />
                ))}
              </div>
            ) : message.isError ? (
              <p className="text-nexus-red">{errorMessage(message.error, "Could not decrypt this message.")}</p>
            ) : (
              <div className="max-h-[48dvh] overflow-y-auto whitespace-pre-wrap text-[0.98rem] leading-relaxed text-ink [overflow-wrap:anywhere]">
                {full?.body || email.snippet}
              </div>
            )}
          </div>

          <AnimatePresence>
            {replying && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <p className="hud-label mb-2 flex items-center gap-2">
                  <Reply className="h-3 w-3" /> Reply transmission
                </p>
                <ComposeForm
                  initial={{ to: email.from, subject: replySubject, threadId: email.threadId, inReplyTo: email.id }}
                  onSent={onClose}
                  onCancel={() => setReplying(false)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </GlassModal>
  );
}

function Inbox() {
  const inbox = useListEmailMessages(inboxParams, {
    query: { queryKey: inboxKey, staleTime: 60_000, refetchInterval: 120_000 },
  });
  const [open, setOpen] = useState<EmailSummary | null>(null);
  const [composing, setComposing] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const offline = inbox.isError ? offlineCopy(inbox.error, "Gmail") : null;
  const unread = inbox.data?.filter((m) => m.unread).length ?? 0;
  const list = (inbox.data ?? []).filter((m) => filter === "all" || m.unread);

  return (
    <HudPanel
      kicker="Signal intercept · Gmail"
      title="Classified Inbox"
      strong
      actions={
        <>
          <button
            type="button"
            className="nexus-icon-btn"
            onClick={() => void inbox.refetch()}
            aria-label="Refresh inbox"
            title="Refresh"
          >
            <RefreshCw className={cn("h-4 w-4", inbox.isFetching && "animate-spin")} />
          </button>
          {!offline && (
            <button type="button" className="nexus-btn px-3 py-1.5 text-[0.58rem]" onClick={() => setComposing(true)}>
              <PenLine className="h-3.5 w-3.5" /> Compose
            </button>
          )}
        </>
      }
    >
      {offline ? (
        <SignalLost
          message={offline.message}
          hint={offline.hint}
          onRetry={() => void inbox.refetch()}
          retrying={inbox.isFetching}
        />
      ) : (
        <>
          <div role="tablist" aria-label="Inbox filter" className="mb-3 flex gap-1">
            {(["all", "unread"] as const).map((key) => (
              <button
                key={key}
                role="tab"
                aria-selected={filter === key}
                onClick={() => setFilter(key)}
                className={cn(
                  "rounded-lg px-3 py-1 font-[Orbitron] text-[0.56rem] font-bold tracking-[0.16em] uppercase transition-colors",
                  filter === key
                    ? "bg-nexus-cyan/15 text-ink shadow-[inset_0_0_0_1px_rgba(0,200,255,0.4)]"
                    : "text-ink-faint hover:text-ink-dim",
                )}
              >
                {key === "all" ? `All ${inbox.data?.length ?? ""}` : `Unread ${unread}`}
              </button>
            ))}
          </div>
          {inbox.isPending ? (
            <ul className="space-y-2.5" aria-hidden>
              {[0, 1, 2, 3].map((i) => (
                <li
                  key={i}
                  className="h-[5.5rem] animate-shimmer rounded-xl bg-[linear-gradient(90deg,rgba(255,255,255,0.03),rgba(0,200,255,0.07),rgba(255,255,255,0.03))] bg-[length:200%_100%]"
                />
              ))}
            </ul>
          ) : list.length === 0 ? (
            <p className="py-10 text-center text-ink-dim">
              {filter === "unread" ? "No unread intercepts. Inbox secured." : "No transmissions intercepted."}
            </p>
          ) : (
            <ul className="max-h-[38rem] space-y-2.5 overflow-y-auto pr-1">
              {list.map((email, i) => (
                <EmailCard key={email.id} email={email} index={i} onOpen={() => setOpen(email)} />
              ))}
            </ul>
          )}
        </>
      )}

      <EmailReader email={open} onClose={() => setOpen(null)} />
      <GlassModal
        open={composing}
        onClose={() => setComposing(false)}
        labelId="compose-title"
        kicker="Outbound channel"
        title="New Transmission"
      >
        <ComposeForm
          initial={{ to: "", subject: "" }}
          onSent={() => setComposing(false)}
          onCancel={() => setComposing(false)}
        />
      </GlassModal>
    </HudPanel>
  );
}

/* ======================================================================
   Module
   ====================================================================== */

export function CommsHub() {
  const now = useNow(60_000);
  const calendar = useListCalendarEvents(calendarParams, { query: { queryKey: calendarKey, staleTime: 60_000 } });
  const inbox = useListEmailMessages(inboxParams, { query: { queryKey: inboxKey, staleTime: 60_000 } });
  const todayKey = localDateKey(now);
  const todayCount = (calendar.data ?? []).filter((e) => eventDayKeys(e).includes(todayKey)).length;
  const next = (calendar.data ?? []).find((e) => !e.allDay && new Date(e.start) > now);
  const unread = inbox.data?.filter((m) => m.unread).length;

  return (
    <div className="relative space-y-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-6 -top-10 h-72 opacity-70 [mask-image:linear-gradient(to_bottom,black,transparent)]"
      >
        <SignalWaveform />
      </div>
      <SectionHeading
        code="Module 02 · Comms Hub"
        title="Signal Intercept"
        subtitle="Your calendar as a holographic timeline and your inbox as intercepted dispatches — synced live from Google."
        className="relative"
      >
        <StatChip label="Today" value={calendar.isError ? "—" : todayCount} />
        <StatChip label="Next" value={next ? formatTime(new Date(next.start)) : "—"} color="#a855f7" />
        <StatChip label="Unread" value={inbox.isError ? "—" : (unread ?? "…")} color="#ff3a3a" />
      </SectionHeading>
      <div className="relative grid gap-6 @5xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <CalendarTimeline />
        <Inbox />
      </div>
    </div>
  );
}
