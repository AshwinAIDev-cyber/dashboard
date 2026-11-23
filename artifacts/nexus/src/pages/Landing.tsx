import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
import {
  getGetFridayStatusQueryKey,
  getListCalendarEventsQueryKey,
  useGetFridayStatus,
  useListCalendarEvents,
} from "@workspace/api-client-react";
import { HexGridBackdrop } from "@/components/hud/HexGridBackdrop";
import { NexusMark } from "@/components/hud/NexusMark";
import { Starfield } from "@/components/hud/Starfield";
import { useGoals, useTasks } from "@/hooks/use-nexus-data";
import { useNow } from "@/hooks/use-now";
import { formatClock } from "@/lib/format";
import { cn, isTypingTarget, seededRandom } from "@/lib/utils";

/* ------------------------------------------------------------------ logo */

const LETTERS = ["N", "E", "X", "U", "S"];

function AssemblingLogo() {
  const reduced = useReducedMotion();
  const scatter = useMemo(() => {
    const rand = seededRandom(42);
    return LETTERS.map(() => ({
      x: (rand() - 0.5) * 520,
      y: (rand() - 0.5) * 260,
      rotate: (rand() - 0.5) * 120,
    }));
  }, []);

  return (
    <div className="relative flex flex-col items-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="relative mb-5"
      >
        <div className="absolute inset-0 -z-10 rounded-full bg-nexus-cyan/25 blur-2xl" />
        <NexusMark animate className="h-16 w-16 sm:h-20 sm:w-20" />
      </motion.div>

      <h1 className="relative select-none font-[Orbitron] text-[3.4rem] font-black leading-none tracking-[0.28em] sm:text-[5.5rem]">
        <span className="sr-only">NEXUS</span>
        <span aria-hidden className="relative inline-flex pl-[0.28em]">
          {LETTERS.map((letter, i) => (
            <motion.span
              key={letter}
              className="relative inline-block text-transparent"
              style={{
                backgroundImage: "linear-gradient(180deg, #ffffff 0%, #9fe6ff 45%, #00c8ff 70%, #a855f7 110%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                filter: "drop-shadow(0 0 18px rgba(0,200,255,0.45))",
              }}
              initial={
                reduced
                  ? { opacity: 0 }
                  : { opacity: 0, x: scatter[i]!.x, y: scatter[i]!.y, rotate: scatter[i]!.rotate, filter: "blur(12px)" }
              }
              animate={{
                opacity: 1,
                x: 0,
                y: 0,
                rotate: 0,
                filter: "blur(0px) drop-shadow(0 0 18px rgba(0,200,255,0.45))",
              }}
              transition={{ delay: 0.35 + i * 0.12, duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
            >
              {letter}
              {/* chromatic glitch ghosts */}
              {!reduced && (
                <>
                  <motion.span
                    aria-hidden
                    className="absolute inset-0 text-nexus-cyan mix-blend-screen"
                    initial={{ opacity: 0, x: 0 }}
                    animate={{ opacity: [0, 0.8, 0, 0.6, 0], x: [0, -6, 3, -2, 0] }}
                    transition={{ delay: 1.3 + i * 0.12, duration: 0.5 }}
                  >
                    {letter}
                  </motion.span>
                  <motion.span
                    aria-hidden
                    className="absolute inset-0 text-nexus-violet mix-blend-screen"
                    initial={{ opacity: 0, x: 0 }}
                    animate={{ opacity: [0, 0.7, 0, 0.5, 0], x: [0, 5, -3, 2, 0] }}
                    transition={{ delay: 1.35 + i * 0.12, duration: 0.5 }}
                  >
                    {letter}
                  </motion.span>
                </>
              )}
            </motion.span>
          ))}
        </span>
      </h1>

      <motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.9, ease: [0.65, 0, 0.35, 1] }}
        className="mt-4 h-px w-64 bg-gradient-to-r from-transparent via-nexus-cyan to-transparent sm:w-96"
      />
      <motion.p
        initial={{ opacity: 0, letterSpacing: "0.9em" }}
        animate={{ opacity: 1, letterSpacing: "0.55em" }}
        transition={{ delay: 1.6, duration: 1.2, ease: "easeOut" }}
        className="mt-4 pl-[0.55em] font-[Share_Tech_Mono] text-xs uppercase text-ink-dim sm:text-sm"
      >
        Personal Command Center
      </motion.p>
    </div>
  );
}

/* ------------------------------------------------------------ boot lines */

type LineState = "pending" | "ok" | "warn" | "fail";

interface BootLine {
  label: string;
  value: string;
  state: LineState;
}

const STATE_COLOR: Record<LineState, string> = {
  pending: "text-ink-faint",
  ok: "text-nexus-green",
  warn: "text-nexus-amber",
  fail: "text-nexus-red",
};

function useCoreLatency() {
  const [latency, setLatency] = useState<number | null>(null);
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    const ping = async () => {
      const started = performance.now();
      try {
        const res = await fetch(`${import.meta.env.BASE_URL.replace(/\/$/, "")}/api/healthz`, { cache: "no-store" });
        if (cancelled) return;
        setOnline(res.ok);
        setLatency(Math.round(performance.now() - started));
      } catch {
        if (!cancelled) setOnline(false);
      }
    };
    void ping();
    const timer = setInterval(ping, 15_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return { latency, online };
}

function BootSequence({ lines }: { lines: BootLine[] }) {
  return (
    <ul className="space-y-1.5 font-[Share_Tech_Mono] text-[0.78rem] sm:text-[0.82rem]" aria-label="System status">
      {lines.map((line, i) => (
        <motion.li
          key={line.label}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.9 + i * 0.16, duration: 0.35 }}
          className="flex items-baseline gap-2"
        >
          <span className="text-nexus-cyan/70">&gt;</span>
          <span className="shrink-0 text-ink-dim">{line.label}</span>
          <span className="min-w-4 flex-1 translate-y-[-3px] border-b border-dotted border-ink-faint/40" />
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={line.value}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={cn("shrink-0 tracking-wider", STATE_COLOR[line.state])}
            >
              {line.state === "pending" ? <span className="animate-blink">{line.value}</span> : line.value}
            </motion.span>
          </AnimatePresence>
        </motion.li>
      ))}
    </ul>
  );
}

/* ---------------------------------------------------------- enter button */

function LiquidEnterButton({ onEnter, engaging }: { onEnter: () => void; engaging: boolean }) {
  const [hover, setHover] = useState(false);
  const reduced = useReducedMotion();
  const filled = hover || engaging;

  return (
    <button
      type="button"
      onClick={onEnter}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      disabled={engaging}
      className="group relative h-14 w-full overflow-hidden rounded-xl border border-nexus-cyan/60 bg-nexus-cyan/[0.06] shadow-[0_0_30px_-8px_rgba(0,200,255,0.7)] sm:w-72"
    >
      {/* liquid */}
      <motion.div
        aria-hidden
        className="absolute inset-x-0 bottom-0"
        initial={false}
        animate={{ height: filled ? "130%" : "12%" }}
        transition={{ type: "spring", stiffness: 90, damping: 16 }}
      >
        <svg
          className="absolute -top-[14px] left-0 h-4 w-[200%]"
          viewBox="0 0 1200 40"
          preserveAspectRatio="none"
          style={{ animation: reduced ? undefined : "liquid-wave 2.2s linear infinite" }}
        >
          <path
            d="M0 20 Q 75 0 150 20 T 300 20 T 450 20 T 600 20 T 750 20 T 900 20 T 1050 20 T 1200 20 V40 H0Z"
            fill="#00c8ff"
          />
        </svg>
        <div className="h-full w-full bg-gradient-to-b from-nexus-cyan to-[#0090d0]" />
      </motion.div>
      <span
        className={cn(
          "relative z-10 flex items-center justify-center gap-2 font-[Orbitron] text-sm font-bold tracking-[0.35em] transition-colors duration-300",
          filled ? "text-obsidian-950" : "text-nexus-cyan",
        )}
      >
        {engaging ? "ENGAGING" : "ENTER NEXUS"}
        <ChevronRight className={cn("h-4 w-4 transition-transform", filled && "translate-x-1")} />
      </span>
      <style>{`@keyframes liquid-wave { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>
    </button>
  );
}

/* ---------------------------------------------------------- HUD corners */

function useFps() {
  const [fps, setFps] = useState(0);
  useEffect(() => {
    let frames = 0;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      frames++;
      if (now - last >= 1000) {
        setFps(Math.round((frames * 1000) / (now - last)));
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return fps;
}

function usePointer() {
  const [pos, setPos] = useState({ x: 0.5, y: 0.5 });
  useEffect(() => {
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() =>
        setPos({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight }),
      );
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);
  return pos;
}

function Corner({ position, children, delay }: { position: string; children: React.ReactNode; delay: number }) {
  const isRight = position.includes("right");
  const isBottom = position.includes("bottom");
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay, duration: 0.8 }}
      className={cn(
        "pointer-events-none absolute z-20 hidden font-[Share_Tech_Mono] text-[0.68rem] uppercase leading-relaxed tracking-[0.2em] text-ink-faint sm:block",
        position,
        isRight && "text-right",
      )}
    >
      <div
        className={cn(
          "absolute h-5 w-5 border-nexus-cyan/50",
          isBottom ? "-bottom-3" : "-top-3",
          isRight ? "-right-3" : "-left-3",
          isBottom ? "border-b" : "border-t",
          isRight ? "border-r" : "border-l",
        )}
      />
      {children}
    </motion.div>
  );
}

function HudCorners({ latency, online }: { latency: number | null; online: boolean | null }) {
  const now = useNow(1000);
  const fps = useFps();
  const pointer = usePointer();
  const [bootedAt] = useState(() => Date.now());
  const uptime = Math.floor((now.getTime() - bootedAt) / 1000);

  return (
    <>
      <Corner position="left-8 top-7" delay={2.2}>
        <p className="text-nexus-cyan/80">NEXUS//OS 2.0</p>
        <p>
          SYS STATUS ·{" "}
          <span className={online === false ? "text-nexus-red" : "text-nexus-green"}>
            {online === false ? "DEGRADED" : "NOMINAL"}
          </span>
        </p>
      </Corner>
      <Corner position="right-8 top-7" delay={2.3}>
        <p className="font-[Orbitron] text-sm tracking-[0.25em] text-ink tabular-nums">{formatClock(now, true)}</p>
        <p>{now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</p>
      </Corner>
      <Corner position="left-8 bottom-7" delay={2.4}>
        <p className="tabular-nums">
          X {pointer.x.toFixed(3)} · Y {pointer.y.toFixed(3)}
        </p>
        <p className="tabular-nums">RENDER {fps || "--"} FPS</p>
      </Corner>
      <Corner position="right-8 bottom-7" delay={2.5}>
        <p className="tabular-nums">CORE LATENCY {latency !== null ? `${latency}MS` : "--"}</p>
        <p className="tabular-nums">
          SESSION {String(Math.floor(uptime / 60)).padStart(2, "0")}:{String(uptime % 60).padStart(2, "0")}
        </p>
      </Corner>
    </>
  );
}

/* ----------------------------------------------------------------- page */

export default function Landing() {
  const [, setLocation] = useLocation();
  const [engaging, setEngaging] = useState(false);
  const engagingRef = useRef(false);
  const reduced = useReducedMotion();

  const { latency, online } = useCoreLatency();
  const tasks = useTasks();
  const goals = useGoals();
  const friday = useGetFridayStatus({ query: { queryKey: getGetFridayStatusQueryKey(), staleTime: 60_000 } });
  const comms = useListCalendarEvents(
    { days: 1 },
    { query: { queryKey: getListCalendarEventsQueryKey({ days: 1 }), staleTime: 60_000 } },
  );

  const lines: BootLine[] = [
    {
      label: "CORE SYSTEMS",
      value: online === null ? "SYNCING" : online ? "ONLINE" : "OFFLINE",
      state: online === null ? "pending" : online ? "ok" : "fail",
    },
    {
      label: "MISSION DATABASE",
      value: tasks.isPending
        ? "SYNCING"
        : tasks.isError
          ? "OFFLINE"
          : `${tasks.data.filter((t) => !t.completed).length} ACTIVE`,
      state: tasks.isPending ? "pending" : tasks.isError ? "fail" : "ok",
    },
    {
      label: "QUEST LOG",
      value: goals.isPending ? "SYNCING" : goals.isError ? "OFFLINE" : `${goals.data.length} TRACKED`,
      state: goals.isPending ? "pending" : goals.isError ? "fail" : "ok",
    },
    {
      label: "COMMS ARRAY",
      value: comms.isPending ? "SCANNING" : comms.isError ? "NO SIGNAL" : "LINKED",
      state: comms.isPending ? "pending" : comms.isError ? "warn" : "ok",
    },
    {
      label: "NEURAL LINK · FRIDAY",
      value: friday.isPending ? "SYNCING" : friday.data?.online ? "ONLINE" : "STANDBY",
      state: friday.isPending ? "pending" : friday.data?.online ? "ok" : "warn",
    },
  ];

  const enter = useCallback(() => {
    if (engagingRef.current) return;
    engagingRef.current = true;
    setEngaging(true);
    setTimeout(() => setLocation("/dashboard"), reduced ? 0 : 650);
  }, [reduced, setLocation]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !isTypingTarget(e.target) && !(e.target instanceof HTMLButtonElement)) enter();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enter]);

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-16">
      {/* deep space */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#0e1328_0%,#080b14_55%,#05070d_100%)]"
      />
      <Starfield parallax={1} density={1.5} speed={10} />
      <HexGridBackdrop strength={26} />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[46rem] w-[46rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(0,200,255,0.12),rgba(168,85,247,0.06)_40%,transparent_70%)]"
      />
      <div aria-hidden className="scan-line-overlay" />

      <HudCorners latency={latency} online={online} />

      <motion.div
        className="relative z-10 flex w-full max-w-xl flex-col items-center"
        animate={engaging ? { scale: 1.08, opacity: 0, filter: "blur(8px)" } : { scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.65, 0, 0.35, 1] }}
      >
        <AssemblingLogo />

        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.7, type: "spring", stiffness: 120, damping: 20 }}
          className="nexus-glass-strong hud-bracket mt-10 w-full rounded-2xl p-6 sm:p-7"
          aria-label="System awakening"
        >
          <div className="mb-4 flex items-center justify-between">
            <p className="hud-label">Boot sequence</p>
            <span className="flex items-center gap-1.5 font-[Share_Tech_Mono] text-[0.65rem] tracking-[0.2em] text-nexus-green">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-nexus-green opacity-70" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-nexus-green" />
              </span>
              LIVE
            </span>
          </div>
          <BootSequence lines={lines} />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.8 }}
            className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-between"
          >
            <p className="order-2 text-center font-[Share_Tech_Mono] [@media(pointer:coarse)]:hidden text-[0.68rem] tracking-[0.2em] text-ink-faint sm:order-1 sm:text-left">
              PRESS <kbd className="rounded border border-ink-faint/40 px-1.5 py-0.5 text-ink-dim">ENTER</kbd> TO ENGAGE
            </p>
            <div className="order-1 w-full sm:order-2 sm:w-auto">
              <LiquidEnterButton onEnter={enter} engaging={engaging} />
            </div>
          </motion.div>
        </motion.section>
      </motion.div>

      {/* warp flash on enter */}
      <AnimatePresence>
        {engaging && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-30 bg-[radial-gradient(circle_at_center,rgba(0,200,255,0.55),rgba(8,11,20,0.95)_60%)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
