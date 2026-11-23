import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Pause, Play, RotateCcw } from "lucide-react";
import { HudPanel } from "@/components/hud/HudPanel";
import { formatDuration } from "@/lib/format";
import {
  RECHARGE_MODES,
  recharge,
  rechargeDuration,
  remainingMs,
  useRecharge,
  type RechargeMode,
} from "@/lib/recharge-store";
import { cn } from "@/lib/utils";

const TICKS = 60;
const SIZE = 240;
const CENTER = SIZE / 2;

/** Pomodoro timer styled as a circular "ability recharge" gauge with a pulsing core. */
export function AbilityRecharge() {
  const state = useRecharge();
  const reduced = useReducedMotion();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (state.status !== "running") return;
    let raf = 0;
    const loop = () => {
      setNow(Date.now());
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [state.status]);

  const mode = RECHARGE_MODES[state.mode];
  const total = rechargeDuration(state.mode);
  const remaining = remainingMs(state, now);
  // The gauge *fills* as the ability recharges.
  const charge = 1 - remaining / total;
  const running = state.status === "running";
  const litTicks = Math.floor(charge * TICKS);

  const arcR = 92;
  const arcC = 2 * Math.PI * arcR;

  return (
    <HudPanel kicker="Focus protocol" title="Ability Recharge" strong bodyClassName="pt-4">
      {/* mode selector */}
      <div
        role="radiogroup"
        aria-label="Recharge mode"
        className="mb-4 grid grid-cols-3 gap-1 rounded-xl bg-obsidian-950/50 p-1"
      >
        {(Object.keys(RECHARGE_MODES) as RechargeMode[]).map((key) => {
          const active = state.mode === key;
          return (
            <button
              key={key}
              role="radio"
              aria-checked={active}
              onClick={() => recharge.setMode(key)}
              className={cn(
                "relative rounded-lg py-1.5 font-[Orbitron] text-[0.55rem] font-bold tracking-[0.14em] transition-colors",
                active ? "text-obsidian-950" : "text-ink-faint hover:text-ink",
              )}
            >
              {active && (
                <motion.span
                  layoutId="recharge-mode"
                  className="absolute inset-0 rounded-lg"
                  style={{
                    background: RECHARGE_MODES[key].color,
                    boxShadow: `0 0 16px -4px ${RECHARGE_MODES[key].color}`,
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <span className="relative">
                {RECHARGE_MODES[key].label.split(" ")[0]} {RECHARGE_MODES[key].minutes}
              </span>
            </button>
          );
        })}
      </div>

      {/* gauge */}
      <div className="relative mx-auto aspect-square w-full max-w-[240px]">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="h-full w-full"
          role="img"
          aria-label={`${mode.label} ${formatDuration(remaining / 1000)} remaining`}
        >
          <defs>
            <radialGradient id="core-gradient">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="35%" stopColor={mode.color} stopOpacity="0.75" />
              <stop offset="100%" stopColor={mode.color} stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* tick ring */}
          {Array.from({ length: TICKS }, (_, i) => {
            const angle = (i / TICKS) * Math.PI * 2 - Math.PI / 2;
            const long = i % 5 === 0;
            const r1 = 108;
            const r2 = long ? 118 : 114;
            const lit = i < litTicks;
            return (
              <line
                key={i}
                x1={CENTER + Math.cos(angle) * r1}
                y1={CENTER + Math.sin(angle) * r1}
                x2={CENTER + Math.cos(angle) * r2}
                y2={CENTER + Math.sin(angle) * r2}
                stroke={lit ? mode.color : "rgba(255,255,255,0.12)"}
                strokeWidth={long ? 2.2 : 1.4}
                strokeLinecap="round"
                style={lit ? { filter: `drop-shadow(0 0 3px ${mode.color})` } : undefined}
              />
            );
          })}

          {/* track + progress arc */}
          <circle cx={CENTER} cy={CENTER} r={arcR} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
          <circle
            cx={CENTER}
            cy={CENTER}
            r={arcR}
            fill="none"
            stroke={mode.color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={arcC}
            strokeDashoffset={arcC * (1 - charge)}
            transform={`rotate(-90 ${CENTER} ${CENTER})`}
            style={{
              filter: `drop-shadow(0 0 6px ${mode.color})`,
              transition: running ? undefined : "stroke-dashoffset 0.6s ease",
            }}
          />
          {/* inner ring */}
          <circle cx={CENTER} cy={CENTER} r={70} fill="rgba(5,7,13,0.6)" stroke="rgba(255,255,255,0.06)" />
        </svg>

        {/* pulsing core */}
        <motion.div
          aria-hidden
          className="absolute left-1/2 top-1/2 h-[46%] w-[46%] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background: `radial-gradient(circle, ${mode.color}55 0%, ${mode.color}10 55%, transparent 70%)` }}
          animate={
            reduced
              ? undefined
              : running
                ? { scale: [0.9, 1.08, 0.9], opacity: [0.7, 1, 0.7] }
                : { scale: 0.92, opacity: 0.45 }
          }
          transition={running ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" } : { duration: 0.6 }}
        />

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="font-[Share_Tech_Mono] text-[0.6rem] tracking-[0.3em]" style={{ color: mode.color }}>
            {state.status === "paused" ? "PAUSED" : running ? "CHARGING" : "READY"}
          </p>
          <p
            className="mt-1 font-[Orbitron] text-[2.4rem] font-bold leading-none tabular-nums text-ink"
            style={{ textShadow: `0 0 18px ${mode.color}90` }}
          >
            {formatDuration(remaining / 1000)}
          </p>
          <p className="mt-1.5 font-[Share_Tech_Mono] text-[0.62rem] tracking-[0.25em] text-ink-faint tabular-nums">
            {Math.floor(charge * 100)}% · {mode.label}
          </p>
        </div>
      </div>

      {/* controls */}
      <div className="mt-4 flex items-center justify-center gap-2">
        {running ? (
          <button
            type="button"
            onClick={recharge.pause}
            className="nexus-btn min-w-32"
            style={{ ["--btn-color" as string]: mode.color }}
          >
            <Pause className="h-3.5 w-3.5" /> Pause
          </button>
        ) : (
          <button
            type="button"
            onClick={recharge.start}
            className="nexus-btn nexus-btn-solid min-w-32"
            style={{ ["--btn-color" as string]: mode.color }}
          >
            <Play className="h-3.5 w-3.5" /> {state.status === "paused" ? "Resume" : "Engage"}
          </button>
        )}
        <button
          type="button"
          onClick={recharge.reset}
          disabled={state.status === "idle" && remaining === total}
          className="nexus-icon-btn h-[2.35rem] w-[2.35rem]"
          aria-label="Reset timer"
          title="Reset"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      {/* charges */}
      <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3">
        <span className="hud-label text-[0.6rem]">Charges today</span>
        <div className="flex items-center gap-1.5" aria-label={`${state.charges} focus sessions completed today`}>
          {Array.from({ length: Math.max(4, Math.ceil((state.charges + 1) / 4) * 4) }, (_, i) => (
            <span
              key={i}
              className={cn(
                "h-2.5 w-2.5 rotate-45 rounded-[2px] border",
                i < state.charges ? "border-nexus-cyan bg-nexus-cyan shadow-[0_0_8px_#00c8ff]" : "border-white/15",
              )}
            />
          ))}
        </div>
      </div>
    </HudPanel>
  );
}
