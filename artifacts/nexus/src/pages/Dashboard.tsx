import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Crosshair, Radio, Trophy, type LucideIcon } from "lucide-react";
import { Link } from "wouter";
import { getListCalendarEventsQueryKey, useListCalendarEvents } from "@workspace/api-client-react";
import { CommandDeck } from "@/components/CommandDeck";
import { CommsHub } from "@/components/CommsHub";
import { FridaySidebar } from "@/components/FridaySidebar";
import { FridayOrb } from "@/components/FridayOrb";
import { MissionLog } from "@/components/MissionLog";
import { HexGridBackdrop } from "@/components/hud/HexGridBackdrop";
import { NexusMark } from "@/components/hud/NexusMark";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useGoals, useOperatorProgress, useTasks } from "@/hooks/use-nexus-data";
import { useNow } from "@/hooks/use-now";
import { formatClock, formatTime } from "@/lib/format";
import { cn, isTypingTarget, readStored, writeStored } from "@/lib/utils";

type TabKey = "deck" | "comms" | "log";

const TABS: { key: TabKey; label: string; icon: LucideIcon; hotkey: string }[] = [
  { key: "deck", label: "Command Deck", icon: Crosshair, hotkey: "1" },
  { key: "comms", label: "Comms Hub", icon: Radio, hotkey: "2" },
  { key: "log", label: "Mission Log", icon: Trophy, hotkey: "3" },
];

const TAB_STORAGE = "nexus.tab";
const FRIDAY_STORAGE = "nexus.friday.open";

function initialTab(): TabKey {
  const fromHash = window.location.hash.replace("#", "");
  if (TABS.some((t) => t.key === fromHash)) return fromHash as TabKey;
  const stored = readStored<string>(TAB_STORAGE, "deck");
  return TABS.some((t) => t.key === stored) ? (stored as TabKey) : "deck";
}

/* --------------------------------------------------------- level ring */

function LevelRing() {
  const { level, progress, title, xp, xpIntoLevel, xpForLevel } = useOperatorProgress();
  const r = 15;
  const c = 2 * Math.PI * r;
  return (
    <div
      className="flex items-center gap-2 pr-1"
      title={`${title} · ${xp.toLocaleString()} XP total · ${xpIntoLevel}/${xpForLevel} to next level`}
    >
      <div className="relative h-9 w-9">
        <svg viewBox="0 0 36 36" className="h-9 w-9 -rotate-90">
          <circle cx="18" cy="18" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2.5" />
          <motion.circle
            cx="18"
            cy="18"
            r={r}
            fill="none"
            stroke="url(#lvl-grad)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={c}
            initial={false}
            animate={{ strokeDashoffset: c * (1 - progress) }}
            transition={{ type: "spring", stiffness: 60, damping: 18 }}
          />
          <defs>
            <linearGradient id="lvl-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#00c8ff" />
              <stop offset="1" stopColor="#a855f7" />
            </linearGradient>
          </defs>
        </svg>
        <span className="absolute inset-0 grid place-items-center font-[Orbitron] text-[0.7rem] font-bold text-ink">
          {level}
        </span>
      </div>
      <div className="hidden leading-tight xl:block">
        <p className="font-[Orbitron] text-[0.6rem] font-bold tracking-[0.2em] text-nexus-violet">{title}</p>
        <p className="font-[Share_Tech_Mono] text-[0.62rem] tracking-wider text-ink-faint tabular-nums">
          {xp.toLocaleString()} XP
        </p>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- nav pill */

interface NavPillProps {
  tab: TabKey;
  onTab: (tab: TabKey) => void;
  fridayOpen: boolean;
  onToggleFriday: () => void;
}

function NavPill({ tab, onTab, fridayOpen, onToggleFriday }: NavPillProps) {
  const now = useNow(1000);
  const [expanded, setExpanded] = useState(false);
  const { data: tasks } = useTasks();
  const { data: goals } = useGoals();
  const calendar = useListCalendarEvents(
    { days: 14 },
    { query: { queryKey: getListCalendarEventsQueryKey({ days: 14 }), staleTime: 60_000, refetchInterval: 120_000 } },
  );

  const ticker = useMemo(() => {
    const open = tasks?.filter((t) => !t.completed) ?? [];
    const alpha = open.filter((t) => t.priority === "alpha").length;
    const nearlyDone = goals?.filter((g) => g.progress < g.target && g.progress / g.target >= 0.75).length ?? 0;
    const next = calendar.data?.find((e) => !e.allDay && new Date(e.end).getTime() > now.getTime());
    const items = [
      `${open.length} OPEN MISSION${open.length === 1 ? "" : "S"}`,
      alpha ? `${alpha} ALPHA PRIORITY` : null,
      nearlyDone ? `${nearlyDone} QUEST${nearlyDone === 1 ? "" : "S"} NEAR COMPLETE` : null,
      next
        ? `NEXT · ${next.summary.toUpperCase()} ${new Date(next.start) <= now ? "NOW" : formatTime(new Date(next.start))}`
        : calendar.isError
          ? "COMMS OFFLINE"
          : null,
    ].filter(Boolean);
    return items.join("  ·  ");
  }, [tasks, goals, calendar.data, calendar.isError, now]);

  return (
    <motion.nav
      layout
      aria-label="Primary"
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      onFocusCapture={() => setExpanded(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setExpanded(false);
      }}
      initial={{ y: -40, opacity: 0, scale: 0.9 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className="nexus-glass-strong pointer-events-auto mx-auto flex w-fit max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-[1.75rem] px-2 py-1.5"
    >
      <motion.div layout="position" className="flex items-center gap-1 sm:gap-2">
        <Link
          href="/"
          aria-label="Back to boot screen"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full transition-colors hover:bg-white/5"
        >
          <NexusMark className="h-7 w-7" />
        </Link>

        <div role="tablist" aria-label="Modules" className="relative flex items-center gap-0.5">
          {TABS.map(({ key, label, icon: Icon, hotkey }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                role="tab"
                id={`tab-${key}`}
                aria-selected={active}
                aria-controls={`panel-${key}`}
                title={`${label} (${hotkey})`}
                onClick={() => onTab(key)}
                className={cn(
                  "relative flex h-10 items-center gap-2 rounded-full px-3 font-[Orbitron] text-[0.62rem] font-bold tracking-[0.16em] uppercase transition-colors sm:px-4",
                  active ? "text-obsidian-950" : "text-ink-dim hover:text-ink",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-full bg-gradient-to-b from-[#7fe3ff] to-nexus-cyan shadow-[0_0_24px_-4px_#00c8ff]"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  />
                )}
                <Icon className="relative h-4 w-4" />
                <span className="relative hidden md:inline">{label}</span>
              </button>
            );
          })}
        </div>

        <span className="mx-1 hidden h-6 w-px bg-white/10 sm:block" />
        <div className="hidden sm:block">
          <LevelRing />
        </div>
        <span className="hidden font-[Orbitron] text-xs tracking-[0.18em] text-ink-dim tabular-nums lg:block">
          {formatClock(now)}
        </span>
        <span className="mx-1 hidden h-6 w-px bg-white/10 sm:block" />

        <button
          type="button"
          onClick={onToggleFriday}
          aria-pressed={fridayOpen}
          aria-label={fridayOpen ? "Close FRIDAY" : "Open FRIDAY"}
          title="FRIDAY AI (F)"
          className={cn(
            "flex h-10 items-center gap-2 rounded-full pl-1.5 pr-1.5 transition-colors sm:pr-3.5",
            fridayOpen ? "bg-nexus-violet/20 text-ink" : "text-ink-dim hover:bg-white/5 hover:text-ink",
          )}
        >
          <FridayOrb active={fridayOpen} size={28} />
          <span className="hidden font-[Orbitron] text-[0.62rem] font-bold tracking-[0.2em] sm:inline">FRIDAY</span>
        </button>
      </motion.div>

      <AnimatePresence initial={false}>
        {expanded && ticker && (
          <motion.div
            key="ticker"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="overflow-hidden"
          >
            <p className="truncate px-4 pb-1.5 pt-1 text-center font-[Share_Tech_Mono] text-[0.66rem] tracking-[0.18em] text-nexus-cyan/80">
              {ticker}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

/* -------------------------------------------------------- scan sweep */

function ScanSweep() {
  const reduced = useReducedMotion();
  if (reduced) return null;
  return (
    <motion.div
      aria-hidden
      className="scan-sweep"
      initial={{ top: "-160px", opacity: 0 }}
      animate={{ top: ["-160px", "110vh"], opacity: [0, 1, 1, 0] }}
      transition={{
        duration: 2.6,
        ease: "easeInOut",
        repeat: Infinity,
        repeatDelay: 11,
        delay: 1.5,
        times: [0, 0.1, 0.85, 1],
      }}
    />
  );
}

/* --------------------------------------------------------------- page */

const panelVariants = {
  enter: (dir: number) => ({ x: dir * 80, opacity: 0, scale: 0.98, filter: "blur(6px)" }),
  center: { x: 0, opacity: 1, scale: 1, filter: "blur(0px)" },
  exit: (dir: number) => ({ x: dir * -80, opacity: 0, scale: 0.98, filter: "blur(6px)" }),
};

export default function Dashboard() {
  const [tab, setTabState] = useState<TabKey>(initialTab);
  const [direction, setDirection] = useState(1);
  const [fridayOpen, setFridayOpen] = useState(() => readStored<boolean>(FRIDAY_STORAGE, false));
  const wide = useMediaQuery("(min-width: 1280px)");
  const tabRef = useRef(tab);

  const setTab = useCallback((next: TabKey) => {
    const from = TABS.findIndex((t) => t.key === tabRef.current);
    const to = TABS.findIndex((t) => t.key === next);
    if (from === to) return;
    setDirection(to > from ? 1 : -1);
    tabRef.current = next;
    setTabState(next);
    writeStored(TAB_STORAGE, next);
    history.replaceState(null, "", `#${next}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const toggleFriday = useCallback(() => {
    setFridayOpen((open) => {
      writeStored(FRIDAY_STORAGE, !open);
      return !open;
    });
  }, []);

  const closeFriday = useCallback(() => {
    setFridayOpen(false);
    writeStored(FRIDAY_STORAGE, false);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
      const match = TABS.find((t) => t.hotkey === e.key);
      if (match) {
        e.preventDefault();
        setTab(match.key);
      } else if (e.key.toLowerCase() === "f") {
        e.preventDefault();
        toggleFriday();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setTab, toggleFriday]);

  useEffect(() => {
    document.title = `NEXUS — ${TABS.find((t) => t.key === tab)?.label ?? "Command Center"}`;
  }, [tab]);

  return (
    <div className="relative min-h-dvh overflow-x-hidden">
      <div aria-hidden className="pointer-events-none fixed inset-0">
        <HexGridBackdrop strength={10} className="opacity-60" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_30%,rgba(5,7,13,0.75)_100%)]" />
      </div>
      <div aria-hidden className="scan-line-overlay" />
      <ScanSweep />

      <motion.header
        className="pointer-events-none fixed inset-x-0 top-3 z-40 px-3 sm:top-4"
        animate={{ paddingRight: fridayOpen && wide ? "27rem" : "0.75rem" }}
        transition={{ type: "spring", stiffness: 200, damping: 30 }}
      >
        <NavPill tab={tab} onTab={setTab} fridayOpen={fridayOpen} onToggleFriday={toggleFriday} />
      </motion.header>

      <motion.main
        className="@container relative z-10 mx-auto max-w-7xl px-4 pb-20 pt-28 sm:px-6 sm:pt-32"
        animate={{ paddingRight: fridayOpen && wide ? "27rem" : undefined }}
        transition={{ type: "spring", stiffness: 200, damping: 30 }}
      >
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={tab}
            id={`panel-${tab}`}
            role="tabpanel"
            aria-labelledby={`tab-${tab}`}
            custom={direction}
            variants={panelVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.8 }}
          >
            {tab === "deck" && <CommandDeck />}
            {tab === "comms" && <CommsHub />}
            {tab === "log" && <MissionLog />}
          </motion.div>
        </AnimatePresence>
      </motion.main>

      <FridaySidebar open={fridayOpen} onClose={closeFriday} overlay={!wide} />
    </div>
  );
}
