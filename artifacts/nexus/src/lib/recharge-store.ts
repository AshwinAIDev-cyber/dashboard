import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { localDateKey } from "./format";
import { readStored, writeStored } from "./utils";

/**
 * "Ability Recharge" focus timer (pomodoro) as a tiny global store so it keeps
 * running while the operator switches modules — and survives reloads, since
 * the end time is persisted rather than a countdown.
 */

export type RechargeMode = "focus" | "short" | "long";
export type RechargeStatus = "idle" | "running" | "paused";

export const RECHARGE_MODES: Record<RechargeMode, { label: string; minutes: number; color: string }> = {
  focus: { label: "FOCUS", minutes: 25, color: "#00c8ff" },
  short: { label: "SHORT REST", minutes: 5, color: "#00ff6a" },
  long: { label: "LONG REST", minutes: 15, color: "#a855f7" },
};

export interface RechargeState {
  mode: RechargeMode;
  status: RechargeStatus;
  /** Epoch ms when the running session ends. */
  endsAt: number | null;
  /** Remaining ms while idle/paused. */
  remaining: number;
  /** Focus sessions completed today. */
  charges: number;
  chargesDay: string;
}

const STORAGE_KEY = "nexus.recharge.v1";
const durationOf = (mode: RechargeMode) => RECHARGE_MODES[mode].minutes * 60_000;

function load(): RechargeState {
  const fallback: RechargeState = {
    mode: "focus",
    status: "idle",
    endsAt: null,
    remaining: durationOf("focus"),
    charges: 0,
    chargesDay: localDateKey(new Date()),
  };
  const stored = readStored<RechargeState | null>(STORAGE_KEY, null);
  if (!stored || !(stored.mode in RECHARGE_MODES)) return fallback;
  const today = localDateKey(new Date());
  return {
    ...fallback,
    ...stored,
    charges: stored.chargesDay === today ? stored.charges : 0,
    chargesDay: today,
  };
}

let state: RechargeState = typeof window === "undefined" ? (null as never) : load();
const listeners = new Set<() => void>();
let ticker: ReturnType<typeof setInterval> | null = null;
let baseTitle = typeof document === "undefined" ? "NEXUS" : document.title;

function set(next: Partial<RechargeState>) {
  state = { ...state, ...next };
  writeStored(STORAGE_KEY, state);
  listeners.forEach((listener) => listener());
  syncTicker();
}

export function remainingMs(s: RechargeState = state, now = Date.now()): number {
  return s.status === "running" && s.endsAt ? Math.max(0, s.endsAt - now) : s.remaining;
}

function chime() {
  try {
    const AudioCtx =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = [880, 1174.66, 1567.98];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.14;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.55);
    });
    setTimeout(() => void ctx.close(), 1200);
  } catch {
    /* audio blocked — ignore */
  }
}

function complete() {
  const finished = state.mode;
  chime();
  if (finished === "focus") {
    const charges = state.charges + 1;
    const nextMode: RechargeMode = charges % 4 === 0 ? "long" : "short";
    set({ status: "idle", endsAt: null, charges, mode: nextMode, remaining: durationOf(nextMode) });
    toast.success("Ability recharged", {
      description: `Focus charge ${charges} banked. Take a ${RECHARGE_MODES[nextMode].minutes}-minute ${nextMode === "long" ? "long" : "short"} rest.`,
    });
  } else {
    set({ status: "idle", endsAt: null, mode: "focus", remaining: durationOf("focus") });
    toast("Rest complete", { description: "Systems cooled. Ready for the next focus charge." });
  }
}

function updateTitle() {
  if (typeof document === "undefined") return;
  if (!document.title.startsWith("⏵")) baseTitle = document.title;
  if (state.status === "running") {
    const s = Math.ceil(remainingMs() / 1000);
    document.title = `⏵ ${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")} · ${RECHARGE_MODES[state.mode].label}`;
  } else if (document.title.startsWith("⏵")) {
    document.title = baseTitle;
  }
}

function syncTicker() {
  if (state.status === "running" && !ticker) {
    ticker = setInterval(() => {
      if (state.status === "running" && remainingMs() <= 0) complete();
      updateTitle();
    }, 500);
  } else if (state.status !== "running" && ticker) {
    clearInterval(ticker);
    ticker = null;
  }
  updateTitle();
}

if (typeof window !== "undefined") {
  // A session that ended while the tab was closed completes on load.
  if (state.status === "running" && remainingMs() <= 0) queueMicrotask(complete);
  syncTicker();
}

export const recharge = {
  start() {
    if (state.status === "running") return;
    set({ status: "running", endsAt: Date.now() + state.remaining });
  },
  pause() {
    if (state.status !== "running") return;
    set({ status: "paused", remaining: remainingMs(), endsAt: null });
  },
  reset() {
    set({ status: "idle", endsAt: null, remaining: durationOf(state.mode) });
  },
  setMode(mode: RechargeMode) {
    set({ mode, status: "idle", endsAt: null, remaining: durationOf(mode) });
  },
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useRecharge(): RechargeState {
  return useSyncExternalStore(subscribe, () => state);
}

export { durationOf as rechargeDuration };
