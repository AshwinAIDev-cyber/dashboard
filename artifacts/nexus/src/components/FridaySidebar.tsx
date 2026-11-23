import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, CornerDownLeft, Eraser, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getGetFridayStatusQueryKey,
  getListGoalsQueryKey,
  getListTasksQueryKey,
  useFridayChat,
  useGetFridayStatus,
  type FridayAction,
} from "@workspace/api-client-react";
import { FridayOrb } from "@/components/FridayOrb";
import { NeuralNet } from "@/components/NeuralNet";
import { errorMessage } from "@/hooks/use-nexus-data";
import { formatClock, operatorTimeZone } from "@/lib/format";
import { cn, readStored, writeStored } from "@/lib/utils";

interface LogEntry {
  id: string;
  role: "user" | "assistant" | "error";
  content: string;
  actions?: FridayAction[];
  at: number;
}

const LOG_KEY = "nexus.friday.log.v1";
const MAX_LOG = 60;
const HISTORY_SENT = 30;

const SUGGESTIONS = [
  "Brief me on today",
  "What should I tackle first?",
  "Log an ALPHA mission: prep the quarterly review",
  "How are my quests tracking?",
];

const uid = () => Math.random().toString(36).slice(2, 10);

/* ----------------------------------------------------------- typewriter */

function Typewriter({ text, animate, onDone }: { text: string; animate: boolean; onDone?: () => void }) {
  const [count, setCount] = useState(animate ? 0 : text.length);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    if (!animate) {
      setCount(text.length);
      return;
    }
    let raf = 0;
    let last = performance.now();
    let shown = 0;
    const cps = Math.max(60, text.length / 2.2); // finish long replies in ~2s
    const step = (now: number) => {
      shown = Math.min(text.length, shown + ((now - last) / 1000) * cps);
      last = now;
      setCount(Math.floor(shown));
      if (shown < text.length) raf = requestAnimationFrame(step);
      else doneRef.current?.();
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [text, animate]);

  const typing = count < text.length;
  return (
    <span onClick={() => setCount(text.length)}>
      {text.slice(0, count)}
      {typing && (
        <span className="ml-0.5 inline-block h-[1em] w-[0.5em] translate-y-[2px] bg-nexus-violet animate-blink" />
      )}
    </span>
  );
}

/* -------------------------------------------------------------- message */

function Message({ entry, animate, onTyped }: { entry: LogEntry; animate: boolean; onTyped: () => void }) {
  if (entry.role === "user") {
    return (
      <motion.li
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-[Share_Tech_Mono] text-[0.84rem] leading-relaxed"
      >
        <span className="mr-2 text-nexus-cyan">OPERATOR ›</span>
        <span className="whitespace-pre-wrap text-ink [overflow-wrap:anywhere]">{entry.content}</span>
      </motion.li>
    );
  }
  if (entry.role === "error") {
    return (
      <motion.li
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-lg border border-nexus-red/30 bg-nexus-red/5 px-3 py-2 font-[Share_Tech_Mono] text-[0.78rem] text-nexus-red"
      >
        ⚠ LINK ERROR · {entry.content}
      </motion.li>
    );
  }
  return (
    <motion.li initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="relative pl-4">
      <span
        aria-hidden
        className="absolute bottom-1 left-0 top-1 w-[2px] rounded-full bg-gradient-to-b from-nexus-violet to-nexus-violet/10"
      />
      <p className="mb-1 flex items-center gap-2 font-[Share_Tech_Mono] text-[0.62rem] tracking-[0.25em] text-nexus-violet">
        FRIDAY <span className="text-ink-faint">{formatClock(new Date(entry.at))}</span>
      </p>
      <p className="whitespace-pre-wrap text-[0.98rem] leading-relaxed text-ink [overflow-wrap:anywhere]">
        <Typewriter text={entry.content} animate={animate} onDone={onTyped} />
      </p>
      {entry.actions && entry.actions.length > 0 && (
        <ul className="mt-2 space-y-1">
          {entry.actions.map((action, i) => (
            <li
              key={i}
              className="flex items-start gap-2 rounded-md bg-nexus-green/[0.07] px-2.5 py-1.5 font-[Share_Tech_Mono] text-[0.72rem] text-nexus-green"
            >
              <CheckCircle2 className="mt-px h-3.5 w-3.5 shrink-0" />
              <span className="[overflow-wrap:anywhere]">{action.summary}</span>
            </li>
          ))}
        </ul>
      )}
    </motion.li>
  );
}

/* ------------------------------------------------------------- sidebar */

interface FridaySidebarProps {
  open: boolean;
  onClose: () => void;
  /** Narrow screens: render as a full overlay with a backdrop. */
  overlay: boolean;
}

export function FridaySidebar({ open, onClose, overlay }: FridaySidebarProps) {
  const qc = useQueryClient();
  const reduced = useReducedMotion();
  const [log, setLog] = useState<LogEntry[]>(() => readStored<LogEntry[]>(LOG_KEY, []));
  const [input, setInput] = useState("");
  const [typingId, setTypingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const status = useGetFridayStatus({ query: { queryKey: getGetFridayStatusQueryKey(), staleTime: 60_000 } });
  const online = status.data?.online ?? false;

  const chat = useFridayChat({
    mutation: {
      onSuccess: (data) => {
        const entry: LogEntry = {
          id: uid(),
          role: "assistant",
          content: data.reply,
          actions: data.actions,
          at: Date.now(),
        };
        setTypingId(reduced ? null : entry.id);
        setLog((prev) => [...prev, entry].slice(-MAX_LOG));
        if (data.actions.length > 0) {
          void qc.invalidateQueries({ queryKey: getListTasksQueryKey() });
          void qc.invalidateQueries({ queryKey: getListGoalsQueryKey() });
          toast.success("FRIDAY updated the board", {
            description: data.actions.map((a) => a.summary).join(" · "),
          });
        }
      },
      onError: (error) => {
        setLog((prev) =>
          [...prev, { id: uid(), role: "error" as const, content: errorMessage(error), at: Date.now() }].slice(
            -MAX_LOG,
          ),
        );
      },
    },
  });

  useEffect(() => writeStored(LOG_KEY, log), [log]);

  // keep the latest line in view (also while the typewriter runs)
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [log, chat.isPending]);
  useEffect(() => {
    if (!typingId) return;
    const el = scrollRef.current;
    const timer = setInterval(() => {
      if (el) el.scrollTop = el.scrollHeight;
    }, 120);
    return () => clearInterval(timer);
  }, [typingId]);

  // Return focus to whatever opened the panel when it closes, so global
  // hotkeys don't land in the input while the panel animates out.
  const panelRef = useRef<HTMLElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (open) {
      restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      return;
    }
    if (panelRef.current?.contains(document.activeElement)) {
      const target = restoreFocusRef.current;
      if (target && target.isConnected) target.focus();
      else (document.activeElement as HTMLElement | null)?.blur();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 250);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const send = useCallback(
    (text: string) => {
      const content = text.trim();
      if (!content || chat.isPending || !online) return;
      const entry: LogEntry = { id: uid(), role: "user", content: content.slice(0, 8000), at: Date.now() };
      const next = [...log, entry].slice(-MAX_LOG);
      setLog(next);
      setInput("");
      setTypingId(null);
      const history = next
        .filter((m): m is LogEntry & { role: "user" | "assistant" } => m.role !== "error")
        .slice(-HISTORY_SENT)
        .map((m) => ({ role: m.role, content: m.content }));
      chat.mutate({ data: { messages: history, timeZone: operatorTimeZone() } });
    },
    [chat, log, online],
  );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    send(input);
  };

  const clear = () => {
    setLog([]);
    setTypingId(null);
    inputRef.current?.focus();
  };

  const thinking = chat.isPending;

  return (
    <AnimatePresence>
      {open && (
        <>
          {overlay && (
            <motion.div
              key="friday-backdrop"
              className="fixed inset-0 z-40 bg-obsidian-950/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              aria-hidden
            />
          )}
          <motion.aside
            key="friday-panel"
            ref={panelRef}
            role="complementary"
            aria-label="FRIDAY AI assistant"
            initial={{ x: "105%", opacity: 0.6 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "105%", opacity: 0.6 }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
            className="nexus-glass-strong fixed bottom-0 right-0 top-0 z-50 flex w-full flex-col overflow-hidden sm:bottom-3 sm:right-3 sm:top-3 sm:w-[25.5rem] sm:rounded-3xl"
          >
            {/* pulsing edge glow while thinking */}
            <motion.span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-transparent via-nexus-violet to-transparent"
              animate={thinking ? { opacity: [0.3, 1, 0.3] } : { opacity: 0.25 }}
              transition={thinking ? { duration: 1.1, repeat: Infinity } : { duration: 0.4 }}
            />
            <motion.span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-[inherit]"
              animate={{
                boxShadow: thinking
                  ? [
                      "inset 0 0 0 1px rgba(168,85,247,0.3), inset 0 0 40px -20px rgba(168,85,247,0.6)",
                      "inset 0 0 0 1px rgba(168,85,247,0.7), inset 0 0 60px -16px rgba(168,85,247,0.9)",
                    ]
                  : "inset 0 0 0 1px rgba(168,85,247,0.18), inset 0 0 0px 0px rgba(168,85,247,0)",
              }}
              transition={thinking ? { duration: 1.1, repeat: Infinity, repeatType: "reverse" } : { duration: 0.4 }}
            />

            {/* header */}
            <header className="relative flex items-center gap-3 px-5 pb-3 pt-4">
              <FridayOrb active={thinking} size={38} />
              <div className="min-w-0 flex-1">
                <h2 className="hud-title text-base text-glow-violet">FRIDAY</h2>
                <p className="font-[Share_Tech_Mono] text-[0.62rem] tracking-[0.25em] text-ink-faint">
                  NEURAL INTERFACE
                </p>
              </div>
              <span
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-[Share_Tech_Mono] text-[0.58rem] tracking-[0.2em]",
                  status.isPending
                    ? "border-ink-faint/30 text-ink-faint"
                    : online
                      ? "border-nexus-green/40 text-nexus-green"
                      : "border-nexus-amber/40 text-nexus-amber",
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    online ? "bg-nexus-green shadow-[0_0_6px_#00ff6a]" : "bg-nexus-amber",
                  )}
                />
                {status.isPending ? "SYNC" : thinking ? "THINKING" : online ? "ONLINE" : "OFFLINE"}
              </span>
              <button
                type="button"
                onClick={clear}
                disabled={log.length === 0}
                className="nexus-icon-btn"
                aria-label="Clear conversation"
                title="Clear log"
              >
                <Eraser className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="nexus-icon-btn"
                aria-label="Close FRIDAY"
                title="Close (Esc)"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            {/* neural visualization */}
            <div className="relative mx-4 h-28 shrink-0 overflow-hidden rounded-2xl border border-nexus-violet/20 bg-obsidian-950/60">
              <NeuralNet active={thinking} />
              <p className="absolute bottom-1.5 left-3 font-[Share_Tech_Mono] text-[0.55rem] tracking-[0.25em] text-ink-faint">
                SYNAPTIC ACTIVITY · {thinking ? "HIGH" : "IDLE"}
              </p>
              {status.data?.model && (
                <p className="absolute bottom-1.5 right-3 font-[Share_Tech_Mono] text-[0.55rem] tracking-[0.18em] text-ink-faint">
                  {status.data.model.toUpperCase()}
                </p>
              )}
            </div>

            {/* transcript */}
            <div ref={scrollRef} className="relative mt-3 min-h-0 flex-1 overflow-y-auto px-5 pb-4" aria-live="polite">
              {log.length === 0 && !thinking ? (
                <div className="flex h-full flex-col justify-end pb-2">
                  <p className="font-[Share_Tech_Mono] text-[0.84rem] leading-relaxed text-ink-dim">
                    <span className="text-nexus-violet">FRIDAY ›</span>{" "}
                    {online
                      ? "Neural link established. I can read your board, log missions, close them out and move quest progress. What do you need?"
                      : "My AI core is offline. Enable the Anthropic integration on Replit (or set ANTHROPIC_API_KEY on the API server) to bring me online."}
                  </p>
                  {online && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {SUGGESTIONS.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => send(s)}
                          className="rounded-full border border-nexus-violet/30 bg-nexus-violet/[0.06] px-3 py-1.5 text-left text-[0.85rem] text-ink-dim transition-colors hover:border-nexus-violet/60 hover:text-ink"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <ul className="space-y-4">
                  {log.map((entry) => (
                    <Message
                      key={entry.id}
                      entry={entry}
                      animate={entry.id === typingId}
                      onTyped={() => setTypingId(null)}
                    />
                  ))}
                  {thinking && (
                    <motion.li
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-2 pl-4 font-[Share_Tech_Mono] text-[0.72rem] tracking-[0.2em] text-nexus-violet"
                    >
                      <span className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                          <motion.span
                            key={i}
                            className="h-1.5 w-1.5 rounded-full bg-nexus-violet"
                            animate={{ opacity: [0.2, 1, 0.2], y: [0, -3, 0] }}
                            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
                          />
                        ))}
                      </span>
                      PROCESSING
                    </motion.li>
                  )}
                </ul>
              )}
            </div>

            {/* terminal input */}
            <form onSubmit={submit} className="relative border-t border-white/[0.07] px-4 pb-4 pt-3">
              <div
                className={cn(
                  "flex items-center gap-2 rounded-xl border bg-obsidian-950/70 px-3 py-2.5 transition-[border-color,box-shadow]",
                  online
                    ? "border-nexus-violet/30 focus-within:border-nexus-violet/70 focus-within:shadow-[0_0_24px_-8px_#a855f7]"
                    : "border-white/10",
                )}
              >
                <span className="shrink-0 font-[Share_Tech_Mono] text-sm text-nexus-cyan">›</span>
                <div className="relative min-w-0 flex-1">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={!online}
                    maxLength={8000}
                    aria-label="Message FRIDAY"
                    placeholder={online ? "" : "AI core offline"}
                    className="w-full bg-transparent font-[Share_Tech_Mono] text-[0.9rem] text-ink caret-nexus-cyan outline-none placeholder:text-ink-faint disabled:cursor-not-allowed [text-shadow:0_0_8px_rgba(0,200,255,0.35)]"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  {online && input.length === 0 && (
                    <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 flex items-center gap-2">
                      <span className="h-[1.1em] w-[0.55em] bg-nexus-cyan shadow-[0_0_10px_#00c8ff] animate-blink" />
                      <span className="font-[Share_Tech_Mono] text-[0.85rem] text-ink-faint">Ask FRIDAY…</span>
                    </span>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={!online || thinking || !input.trim()}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-nexus-violet/20 text-nexus-violet transition-colors hover:bg-nexus-violet/35 disabled:opacity-30"
                  aria-label="Send"
                >
                  <CornerDownLeft className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-2 text-center font-[Share_Tech_Mono] text-[0.56rem] tracking-[0.22em] text-ink-faint">
                FRIDAY CAN EDIT MISSIONS & QUESTS · ESC TO CLOSE
              </p>
            </form>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
