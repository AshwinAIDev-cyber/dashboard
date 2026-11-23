import { useMemo, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, CornerDownLeft, Pencil, Rocket, Trash2, Undo2, Zap } from "lucide-react";
import type { Task, TaskPriority } from "@workspace/api-client-react";
import { AbilityRecharge } from "@/components/AbilityRecharge";
import { ConfirmIconButton } from "@/components/hud/ConfirmIconButton";
import { HudPanel } from "@/components/hud/HudPanel";
import { SectionHeading } from "@/components/hud/SectionHeading";
import { SignalLost } from "@/components/hud/SignalLost";
import { StatChip } from "@/components/hud/StatChip";
import { errorMessage, useGoals, useOperatorProgress, useTaskMutations, useTasks } from "@/hooks/use-nexus-data";
import { formatRelative, localDateKey } from "@/lib/format";
import { RANK_ORDER, RANKS, TIERS, goalRatio, nextRank } from "@/lib/game";
import { cn } from "@/lib/utils";

type Filter = "active" | "cleared" | "all";

/* -------------------------------------------------------- completion burst */

function CompletionBurst({ color, xp }: { color: string; xp: number }) {
  const particles = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => {
        const angle = (i / 16) * Math.PI * 2 + (i % 2 ? 0.2 : 0);
        const distance = 60 + (i % 3) * 22;
        return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance, size: i % 3 === 0 ? 6 : 4 };
      }),
    [],
  );
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-20 grid place-items-center overflow-visible">
      <motion.span
        className="absolute h-16 w-16 rounded-full border-2"
        style={{ borderColor: color }}
        initial={{ scale: 0.2, opacity: 1 }}
        animate={{ scale: 4, opacity: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      />
      {particles.map((p, i) => (
        <motion.span
          key={i}
          className="absolute rotate-45 rounded-[1px]"
          style={{ width: p.size, height: p.size, background: color, boxShadow: `0 0 10px ${color}` }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: p.x, y: p.y, opacity: 0, scale: 0.4 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        />
      ))}
      <motion.span
        className="absolute font-[Orbitron] text-lg font-black"
        style={{ color, textShadow: `0 0 16px ${color}` }}
        initial={{ y: 0, opacity: 0, scale: 0.7 }}
        animate={{ y: -56, opacity: [0, 1, 1, 0], scale: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      >
        +{xp} XP
      </motion.span>
    </div>
  );
}

/* -------------------------------------------------------------- task card */

interface TaskCardProps {
  task: Task;
  onToggle: (task: Task) => void;
  onRank: (task: Task) => void;
  onRename: (task: Task, title: string) => void;
  onDelete: (task: Task) => void;
}

function TaskCard({ task, onToggle, onRank, onRename, onDelete }: TaskCardProps) {
  const rank = RANKS[task.priority];
  const reduced = useReducedMotion();
  const [burstKey, setBurstKey] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);

  const toggle = () => {
    if (!task.completed && !reduced) setBurstKey(Date.now());
    onToggle(task);
  };

  const commitEdit = () => {
    const title = draft.replace(/\s+/g, " ").trim();
    setEditing(false);
    if (title && title !== task.title) onRename(task, title);
    else setDraft(task.title);
  };

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92, filter: "blur(4px)", transition: { duration: 0.2 } }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
      className="relative"
    >
      <article
        className={cn(
          "nexus-glass hud-bracket group relative flex h-full flex-col overflow-hidden rounded-2xl p-4 pl-5 transition-[opacity,transform] duration-300",
          task.completed ? "opacity-60" : "hover:-translate-y-0.5",
        )}
        style={{ ["--bracket-color" as string]: `${rank.color}b3` }}
      >
        {/* rank accent rail */}
        <span
          aria-hidden
          className="absolute inset-y-3 left-0 w-[3px] rounded-r-full"
          style={{ background: rank.color, boxShadow: `0 0 12px ${rank.color}` }}
        />
        {/* hover sheen */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_40%,rgba(255,255,255,0.05)_50%,transparent_60%)] bg-[length:250%_100%] bg-[position:100%_0] transition-[background-position] duration-700 group-hover:bg-[position:-50%_0]"
        />

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onRank(task)}
            className={cn("rank-badge transition-transform hover:scale-105", rank.className)}
            title={`${rank.description} — click to change rank`}
            aria-label={`Rank ${rank.label}. Change rank`}
          >
            <span className="text-[0.8rem] leading-none">{rank.short}</span>
            {rank.label}
          </button>
          <span
            className={cn(
              "flex items-center gap-1 font-[Share_Tech_Mono] text-xs tracking-wider",
              task.completed ? "text-nexus-green" : "text-nexus-amber",
            )}
            title="XP reward"
          >
            <Zap className="h-3 w-3" />
            {task.completed ? "BANKED" : "+"}
            {rank.xp} XP
          </span>
          <div className="ml-auto flex items-center opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
            {!task.completed && (
              <button
                type="button"
                className="nexus-icon-btn h-8 w-8"
                onClick={() => {
                  setDraft(task.title);
                  setEditing(true);
                }}
                aria-label="Edit mission title"
                title="Edit"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            <ConfirmIconButton
              icon={<Trash2 className="h-3.5 w-3.5" />}
              label="Scrub mission"
              confirmLabel="Scrub"
              onConfirm={() => onDelete(task)}
            />
          </div>
        </div>

        <div className="mt-3 flex-1">
          {editing ? (
            <input
              autoFocus
              value={draft}
              maxLength={200}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitEdit();
                if (e.key === "Escape") {
                  setDraft(task.title);
                  setEditing(false);
                }
              }}
              className="nexus-input py-1.5 text-[1.05rem]"
              aria-label="Mission title"
            />
          ) : (
            <h3
              onDoubleClick={() => !task.completed && setEditing(true)}
              className={cn(
                "text-[1.12rem] font-semibold leading-snug text-ink [overflow-wrap:anywhere]",
                task.completed && "text-ink-dim line-through decoration-nexus-green/60 decoration-2",
              )}
            >
              {task.title}
            </h3>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="font-[Share_Tech_Mono] text-[0.66rem] uppercase tracking-[0.18em] text-ink-faint">
            {task.completed && task.completedAt
              ? `Cleared ${formatRelative(task.completedAt)}`
              : `Logged ${formatRelative(task.createdAt)}`}
          </p>
          <button
            type="button"
            onClick={toggle}
            className={cn(
              "nexus-btn px-3 py-1.5 text-[0.58rem]",
              task.completed ? "[--btn-color:#8fa3c0]" : "[--btn-color:#00ff6a]",
            )}
            aria-label={task.completed ? `Reopen ${task.title}` : `Complete ${task.title}`}
          >
            {task.completed ? <Undo2 className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
            {task.completed ? "Reopen" : "Complete"}
          </button>
        </div>
      </article>

      <AnimatePresence>
        {burstKey !== null && (
          <motion.div
            key={burstKey}
            className="absolute inset-0"
            exit={{ opacity: 0 }}
            onAnimationComplete={() => setTimeout(() => setBurstKey(null), 900)}
          >
            <CompletionBurst color={rank.color} xp={rank.xp} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

/* --------------------------------------------------------------- composer */

function MissionComposer() {
  const { create } = useTaskMutations();
  const [title, setTitle] = useState("");
  const [rank, setRank] = useState<TaskPriority>("beta");
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const clean = title.replace(/\s+/g, " ").trim();
    if (!clean || create.isPending) return;
    create.mutate(
      { data: { title: clean, priority: rank } },
      {
        onSuccess: () => {
          setTitle("");
          inputRef.current?.focus();
        },
      },
    );
  };

  return (
    <form
      onSubmit={submit}
      className="nexus-glass-strong hud-bracket relative rounded-2xl p-4 sm:p-5"
      aria-label="Log a new mission"
    >
      <div className="flex items-center justify-between">
        <p className="hud-label">New mission briefing</p>
        <p className="hidden font-[Share_Tech_Mono] text-[0.62rem] tracking-[0.2em] text-ink-faint sm:block">
          <CornerDownLeft className="mr-1 inline h-3 w-3" />
          ENTER TO DEPLOY
        </p>
      </div>
      <div className="mt-3 flex flex-col gap-3 @4xl:flex-row">
        <input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          placeholder="Describe the objective, Operator…"
          className="nexus-input flex-1 text-[1.05rem]"
          aria-label="Mission objective"
        />
        <div className="flex gap-2">
          <div
            role="radiogroup"
            aria-label="Mission rank"
            className="flex flex-1 gap-1 rounded-xl bg-obsidian-950/50 p-1"
          >
            {RANK_ORDER.map((key) => {
              const meta = RANKS[key];
              const active = rank === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setRank(key)}
                  title={`${meta.label} · ${meta.description} · ${meta.xp} XP`}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 font-[Orbitron] text-[0.58rem] font-bold tracking-[0.14em] transition-all",
                    active ? "bg-white/[0.07]" : "text-ink-faint hover:text-ink",
                  )}
                  style={
                    active
                      ? { color: meta.color, boxShadow: `inset 0 0 0 1px ${meta.color}80, 0 0 16px -6px ${meta.color}` }
                      : undefined
                  }
                >
                  <span className="h-1.5 w-1.5 rotate-45" style={{ background: meta.color }} />
                  {meta.label}
                </button>
              );
            })}
          </div>
          <button
            type="submit"
            disabled={!title.trim() || create.isPending}
            className="nexus-btn nexus-btn-solid shrink-0"
          >
            <Rocket className="h-3.5 w-3.5" />
            {create.isPending ? "Deploying" : "Deploy"}
          </button>
        </div>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------ operator card */

function OperatorCard({ tasks }: { tasks: Task[] | undefined }) {
  const { level, title, xp, xpIntoLevel, xpForLevel, progress } = useOperatorProgress();
  const { data: goals } = useGoals();
  const cleared = tasks?.filter((t) => t.completed).length ?? 0;
  const questsDone = goals?.filter((g) => goalRatio(g) >= 1).length ?? 0;
  const legendary = goals?.filter((g) => g.type === "yearly") ?? [];

  return (
    <HudPanel kicker="Operator profile" title="Progression" bodyClassName="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative grid h-16 w-16 shrink-0 place-items-center">
          <svg viewBox="0 0 64 64" className="absolute inset-0 h-full w-full" aria-hidden>
            <path d="M32 3 57 17.5v29L32 61 7 46.5v-29Z" fill="rgba(168,85,247,0.1)" stroke="#a855f7" strokeWidth="2" />
          </svg>
          <div className="relative text-center leading-none">
            <p className="font-[Share_Tech_Mono] text-[0.5rem] tracking-[0.2em] text-ink-faint">LVL</p>
            <p className="font-[Orbitron] text-xl font-black text-glow-violet">{level}</p>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-[Orbitron] text-sm font-bold tracking-[0.2em] text-ink">{title}</p>
          <p className="font-[Share_Tech_Mono] text-xs text-ink-faint tabular-nums">
            {xp.toLocaleString()} XP lifetime
          </p>
          <div
            className="xp-bar mt-2 [--xp-color:#a855f7]"
            role="progressbar"
            aria-valuenow={Math.round(progress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progress to next level"
          >
            <motion.div
              className="xp-fill"
              initial={false}
              animate={{ width: `${Math.max(progress * 100, 2)}%` }}
              transition={{ type: "spring", stiffness: 70, damping: 18 }}
            />
          </div>
          <p className="mt-1 text-right font-[Share_Tech_Mono] text-[0.62rem] tracking-wider text-ink-faint tabular-nums">
            {xpIntoLevel} / {xpForLevel} TO LVL {level + 1}
          </p>
        </div>
      </div>
      <dl className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: "Missions", value: cleared, color: "#00ff6a" },
          { label: "Quests", value: questsDone, color: "#00c8ff" },
          { label: "Legendary", value: legendary.length, color: "#a855f7" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-obsidian-950/40 py-2">
            <dt className="hud-label text-[0.55rem]">{s.label}</dt>
            <dd className="font-[Orbitron] text-base font-bold" style={{ color: s.color }}>
              {s.value}
            </dd>
          </div>
        ))}
      </dl>
      <div className="space-y-1.5 border-t border-white/[0.06] pt-3">
        <p className="hud-label text-[0.58rem]">Rank rewards</p>
        {RANK_ORDER.map((key) => (
          <div key={key} className="flex items-center justify-between text-sm">
            <span className={cn("rank-badge", RANKS[key].className)}>{RANKS[key].label}</span>
            <span className="text-ink-dim">{RANKS[key].description}</span>
            <span className="font-[Share_Tech_Mono] text-xs text-nexus-amber">{RANKS[key].xp} XP</span>
          </div>
        ))}
        <p className="pt-1 text-xs text-ink-faint">
          Quests pay out up to {TIERS.yearly.reward} XP (Legendary), {TIERS.monthly.reward} (Epic) and{" "}
          {TIERS.weekly.reward} (Daily) as progress fills.
        </p>
      </div>
    </HudPanel>
  );
}

/* ------------------------------------------------------------------ module */

function SkeletonCards() {
  return (
    <ul className="grid gap-3 @xl:grid-cols-2" aria-hidden>
      {Array.from({ length: 4 }, (_, i) => (
        <li key={i} className="nexus-glass h-36 overflow-hidden rounded-2xl">
          <div className="h-full w-full animate-shimmer bg-[linear-gradient(90deg,transparent,rgba(0,200,255,0.06),transparent)] bg-[length:200%_100%]" />
        </li>
      ))}
    </ul>
  );
}

export function CommandDeck() {
  const tasksQuery = useTasks();
  const { update, remove } = useTaskMutations();
  const [filter, setFilter] = useState<Filter>("active");
  const tasks = tasksQuery.data;

  const counts = useMemo(() => {
    const today = localDateKey(new Date());
    const open = tasks?.filter((t) => !t.completed) ?? [];
    const cleared = tasks?.filter((t) => t.completed) ?? [];
    return {
      open: open.length,
      cleared: cleared.length,
      clearedToday: cleared.filter((t) => t.completedAt && localDateKey(new Date(t.completedAt)) === today).length,
      alpha: open.filter((t) => t.priority === "alpha").length,
    };
  }, [tasks]);
  const { xp } = useOperatorProgress();

  const visible = useMemo(() => {
    const list = tasks ?? [];
    const rankIndex = (t: Task) => RANK_ORDER.indexOf(t.priority);
    if (filter === "active")
      return list
        .filter((t) => !t.completed)
        .sort((a, b) => rankIndex(a) - rankIndex(b) || b.createdAt.localeCompare(a.createdAt));
    if (filter === "cleared")
      return list.filter((t) => t.completed).sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));
    return list;
  }, [tasks, filter]);

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: "active", label: "Active", count: counts.open },
    { key: "cleared", label: "Cleared", count: counts.cleared },
    { key: "all", label: "All", count: tasks?.length ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <SectionHeading
        code="Module 01 · Command Deck"
        title="Mission Briefing Room"
        subtitle="Log objectives, rank them by threat level and clear them for XP. Engage the recharge gauge when it's time to focus."
      >
        <StatChip label="Open" value={counts.open} />
        <StatChip label="Alpha" value={counts.alpha} color="#ff3a3a" />
        <StatChip label="Cleared today" value={counts.clearedToday} color="#00ff6a" />
        <StatChip label="XP banked" value={xp.toLocaleString()} color="#f59e0b" />
      </SectionHeading>

      <div className="grid gap-6 @4xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="relative space-y-4">
          <div
            aria-hidden
            className="nexus-hex-bg pointer-events-none absolute -inset-6 -z-10 opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent)]"
          />
          <MissionComposer />

          <div className="flex items-center justify-between gap-3">
            <div role="tablist" aria-label="Filter missions" className="nexus-glass flex gap-1 rounded-xl p-1">
              {filters.map((f) => (
                <button
                  key={f.key}
                  role="tab"
                  aria-selected={filter === f.key}
                  onClick={() => setFilter(f.key)}
                  className={cn(
                    "relative rounded-lg px-3 py-1.5 font-[Orbitron] text-[0.58rem] font-bold tracking-[0.16em] uppercase transition-colors",
                    filter === f.key ? "text-ink" : "text-ink-faint hover:text-ink-dim",
                  )}
                >
                  {filter === f.key && (
                    <motion.span
                      layoutId="deck-filter"
                      className="absolute inset-0 rounded-lg bg-nexus-cyan/15 shadow-[inset_0_0_0_1px_rgba(0,200,255,0.4)]"
                    />
                  )}
                  <span className="relative">
                    {f.label} <span className="text-nexus-cyan tabular-nums">{f.count}</span>
                  </span>
                </button>
              ))}
            </div>
            {tasksQuery.isFetching && !tasksQuery.isPending && (
              <span className="font-[Share_Tech_Mono] text-[0.62rem] tracking-[0.2em] text-nexus-cyan/70 animate-blink">
                SYNC
              </span>
            )}
          </div>

          {tasksQuery.isPending ? (
            <SkeletonCards />
          ) : tasksQuery.isError ? (
            <SignalLost
              title="DATABASE UNREACHABLE"
              message={errorMessage(tasksQuery.error, "Mission database is not responding.")}
              onRetry={() => void tasksQuery.refetch()}
              retrying={tasksQuery.isFetching}
            />
          ) : visible.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="nexus-glass flex flex-col items-center rounded-2xl px-6 py-14 text-center"
            >
              <div className="grid h-14 w-14 place-items-center rounded-full border border-nexus-cyan/30 bg-nexus-cyan/5 animate-float">
                {filter === "cleared" ? (
                  <Zap className="h-6 w-6 text-nexus-amber" />
                ) : (
                  <Check className="h-6 w-6 text-nexus-green" />
                )}
              </div>
              <p className="hud-title mt-4 text-sm text-ink">
                {filter === "cleared"
                  ? "No missions cleared yet"
                  : filter === "active" && counts.cleared > 0
                    ? "All missions cleared"
                    : "No missions logged"}
              </p>
              <p className="mt-1.5 max-w-sm text-ink-dim">
                {filter === "cleared"
                  ? "Complete a mission to bank its XP here."
                  : "Brief a new objective above — or open FRIDAY (press F) and ask her to log one."}
              </p>
            </motion.div>
          ) : (
            <ul className="grid gap-3 @xl:grid-cols-2" aria-label="Missions">
              <AnimatePresence mode="popLayout" initial={false}>
                {visible.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggle={(t) => update.mutate({ id: t.id, data: { completed: !t.completed } })}
                    onRank={(t) => update.mutate({ id: t.id, data: { priority: nextRank(t.priority) } })}
                    onRename={(t, title) => update.mutate({ id: t.id, data: { title } })}
                    onDelete={(t) => remove.mutate({ id: t.id })}
                  />
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>

        <aside className="grid content-start gap-6 @2xl:grid-cols-2 @4xl:grid-cols-1">
          <AbilityRecharge />
          <OperatorCard tasks={tasks} />
        </aside>
      </div>
    </div>
  );
}
