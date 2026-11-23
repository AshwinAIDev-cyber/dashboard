import { useMemo, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Crown, Flame, Minus, Pencil, Plus, Sparkles, Swords, Target, Trash2, type LucideIcon } from "lucide-react";
import type { Goal, GoalType } from "@workspace/api-client-react";
import { ConfirmIconButton } from "@/components/hud/ConfirmIconButton";
import { SectionHeading } from "@/components/hud/SectionHeading";
import { SignalLost } from "@/components/hud/SignalLost";
import { StatChip } from "@/components/hud/StatChip";
import { Starfield } from "@/components/hud/Starfield";
import { errorMessage, useGoalMutations, useGoals } from "@/hooks/use-nexus-data";
import { TIER_ORDER, TIERS, goalRatio } from "@/lib/game";
import { cn } from "@/lib/utils";

const TIER_ICONS: Record<GoalType, LucideIcon> = { yearly: Crown, monthly: Swords, weekly: Flame };
const MAX_SEGMENTS = 20;

/* ------------------------------------------------------- segmented bar */

function SegmentedBar({ goal, color }: { goal: Goal; color: string }) {
  const segments = Math.min(goal.target, MAX_SEGMENTS);
  const ratio = goalRatio(goal);
  const filled = ratio * segments;
  return (
    <div
      className="flex gap-[3px]"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={goal.target}
      aria-valuenow={goal.progress}
      aria-label={`${goal.title}: ${goal.progress} of ${goal.target}`}
    >
      {Array.from({ length: segments }, (_, i) => {
        const fill = Math.min(Math.max(filled - i, 0), 1);
        return (
          <span key={i} className="relative h-3 flex-1 overflow-hidden rounded-[3px] bg-white/[0.06]">
            <motion.span
              className="absolute inset-y-0 left-0 rounded-[3px]"
              style={{ background: color, boxShadow: fill > 0 ? `0 0 10px ${color}` : undefined }}
              initial={false}
              animate={{ width: `${fill * 100}%` }}
              transition={{ type: "spring", stiffness: 260, damping: 26, delay: i * 0.012 }}
            />
          </span>
        );
      })}
    </div>
  );
}

/* --------------------------------------------------------- arcade btn */

function ArcadeButton({
  children,
  onClick,
  disabled,
  color,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  color: string;
  label: string;
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.88, y: 2 }}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="relative grid h-10 w-10 place-items-center rounded-full border-2 font-[Orbitron] text-sm font-black transition-[box-shadow,opacity] disabled:opacity-30"
      style={{
        borderColor: `${color}aa`,
        color,
        background: `radial-gradient(circle at 35% 30%, ${color}40, ${color}10 60%, transparent)`,
        boxShadow: disabled ? undefined : `0 4px 0 ${color}40, 0 0 18px -6px ${color}`,
      }}
    >
      {children}
    </motion.button>
  );
}

/* ------------------------------------------------------------ quest card */

function QuestCard({ goal }: { goal: Goal }) {
  const tier = TIERS[goal.type];
  const Icon = TIER_ICONS[goal.type];
  const { update, remove } = useGoalMutations();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(goal.title);
  const [target, setTarget] = useState(String(goal.target));
  const ratio = goalRatio(goal);
  const complete = ratio >= 1;
  const xp = Math.floor(ratio * tier.reward);
  const step = goal.target >= 50 ? 5 : 1;

  const bump = (delta: number) =>
    update.mutate({ id: goal.id, data: { progress: Math.min(Math.max(goal.progress + delta, 0), goal.target) } });

  const save = (e: FormEvent) => {
    e.preventDefault();
    const nextTarget = Math.min(Math.max(parseInt(target, 10) || goal.target, 1), 100000);
    const nextTitle = title.replace(/\s+/g, " ").trim() || goal.title;
    update.mutate({ id: goal.id, data: { title: nextTitle, target: nextTarget } });
    setEditing(false);
  };

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.2 } }}
      transition={{ type: "spring", stiffness: 340, damping: 30 }}
    >
      <article
        className={cn(
          "nexus-glass hud-bracket group relative overflow-hidden rounded-2xl p-4",
          complete && tier.glowClass,
        )}
        style={{ ["--bracket-color" as string]: `${tier.color}b3` }}
      >
        {complete && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 animate-shimmer bg-[linear-gradient(110deg,transparent_30%,rgba(255,255,255,0.08)_50%,transparent_70%)] bg-[length:200%_100%]"
          />
        )}
        <div className="flex items-start gap-3">
          <span
            className="grid h-10 w-10 shrink-0 place-items-center [clip-path:polygon(25%_0,75%_0,100%_50%,75%_100%,25%_100%,0_50%)]"
            style={{ background: `linear-gradient(160deg, ${tier.color}55, ${tier.color}15)` }}
            aria-hidden
          >
            <Icon className="h-4.5 w-4.5" style={{ color: tier.color }} />
          </span>
          <div className="min-w-0 flex-1">
            {editing ? (
              <form onSubmit={save} className="space-y-2" aria-label="Edit quest">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="nexus-input py-1.5"
                  maxLength={200}
                  autoFocus
                  aria-label="Quest title"
                />
                <div className="flex items-center gap-2">
                  <label className="hud-label shrink-0 text-[0.6rem]" htmlFor={`target-${goal.id}`}>
                    Target
                  </label>
                  <input
                    id={`target-${goal.id}`}
                    type="number"
                    min={1}
                    max={100000}
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    className="nexus-input w-24 py-1.5 font-[Share_Tech_Mono]"
                  />
                  <button type="submit" className="nexus-btn ml-auto px-3 py-1.5 text-[0.56rem]">
                    Save
                  </button>
                  <button
                    type="button"
                    className="nexus-btn px-3 py-1.5 text-[0.56rem] [--btn-color:#8fa3c0]"
                    onClick={() => {
                      setTitle(goal.title);
                      setTarget(String(goal.target));
                      setEditing(false);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <p className="font-[Orbitron] text-[0.55rem] font-bold tracking-[0.25em]" style={{ color: tier.color }}>
                  {tier.label} · {tier.horizon.toUpperCase()}
                </p>
                <h3 className="mt-0.5 text-[1.08rem] font-semibold leading-snug text-ink [overflow-wrap:anywhere]">
                  {goal.title}
                </h3>
              </>
            )}
          </div>
          {!editing && (
            <div className="-mr-1 -mt-1 flex items-center opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
              <button
                type="button"
                className="nexus-icon-btn h-8 w-8"
                onClick={() => setEditing(true)}
                aria-label="Edit quest"
                title="Edit"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <ConfirmIconButton
                icon={<Trash2 className="h-3.5 w-3.5" />}
                label="Abandon quest"
                confirmLabel="Abandon"
                onConfirm={() => remove.mutate({ id: goal.id })}
              />
            </div>
          )}
        </div>

        <div className="mt-4">
          <SegmentedBar goal={goal} color={tier.color} />
          <div className="mt-2 flex items-center justify-between font-[Share_Tech_Mono] text-xs tracking-wider">
            <span className="tabular-nums text-ink-dim">
              <span className="text-ink">{goal.progress}</span> / {goal.target}
              <span className="ml-2 text-ink-faint">{Math.round(ratio * 100)}%</span>
            </span>
            <span className="tabular-nums" style={{ color: complete ? tier.color : undefined }}>
              {complete ? (
                <span className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> QUEST COMPLETE · {tier.reward} XP
                </span>
              ) : (
                <span className="text-nexus-amber">
                  {xp} / {tier.reward} XP
                </span>
              )}
            </span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-3">
          <ArcadeButton
            color="#8fa3c0"
            onClick={() => bump(-step)}
            disabled={goal.progress <= 0}
            label={`Decrease progress by ${step}`}
          >
            <Minus className="h-4 w-4" />
          </ArcadeButton>
          <div className="min-w-16 text-center">
            <motion.p
              key={goal.progress}
              initial={{ scale: 1.35, opacity: 0.4 }}
              animate={{ scale: 1, opacity: 1 }}
              className="font-[Orbitron] text-2xl font-black tabular-nums"
              style={{ color: tier.color, textShadow: `0 0 14px ${tier.color}90` }}
            >
              {goal.progress}
            </motion.p>
          </div>
          <ArcadeButton
            color={tier.color}
            onClick={() => bump(step)}
            disabled={complete}
            label={`Increase progress by ${step}`}
          >
            <Plus className="h-4 w-4" />
          </ArcadeButton>
        </div>
      </article>
    </motion.li>
  );
}

/* ---------------------------------------------------------- composer */

function QuestComposer() {
  const { create } = useGoalMutations();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<GoalType>("monthly");
  const [target, setTarget] = useState(String(TIERS.monthly.defaultTarget));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const clean = title.replace(/\s+/g, " ").trim();
    if (!clean || create.isPending) return;
    const parsed = Math.min(Math.max(parseInt(target, 10) || TIERS[type].defaultTarget, 1), 100000);
    create.mutate({ data: { title: clean, type, target: parsed } }, { onSuccess: () => setTitle("") });
  };

  return (
    <form
      onSubmit={submit}
      className="nexus-glass-strong hud-bracket rounded-2xl p-4 sm:p-5"
      aria-label="Start a new quest"
    >
      <p className="hud-label">Accept a new quest</p>
      <div className="mt-3 grid gap-3 @2xl:grid-cols-[minmax(0,1fr)_auto] @5xl:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Name the objective — e.g. Run 100 km"
          maxLength={200}
          className="nexus-input"
          aria-label="Quest title"
        />
        <div role="radiogroup" aria-label="Quest tier" className="flex gap-1 rounded-xl bg-obsidian-950/50 p-1">
          {TIER_ORDER.map((key) => {
            const tier = TIERS[key];
            const active = type === key;
            return (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  setType(key);
                  setTarget(String(tier.defaultTarget));
                }}
                title={tier.horizon}
                className={cn(
                  "flex flex-1 items-center justify-center rounded-lg px-3 py-1.5 font-[Orbitron] text-[0.56rem] font-bold tracking-[0.14em] transition-all",
                  !active && "text-ink-faint hover:text-ink",
                )}
                style={
                  active
                    ? { color: tier.color, background: `${tier.color}18`, boxShadow: `inset 0 0 0 1px ${tier.color}90` }
                    : undefined
                }
              >
                {tier.label}
              </button>
            );
          })}
        </div>
        <label className="flex items-center gap-2">
          <span className="hud-label flex shrink-0 items-center gap-1 whitespace-nowrap text-[0.6rem]">
            <Target className="h-3 w-3" />
            Target
          </span>
          <input
            type="number"
            min={1}
            max={100000}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="nexus-input w-full font-[Share_Tech_Mono] @2xl:w-24"
            aria-label="Target"
          />
        </label>
        <button
          type="submit"
          disabled={!title.trim() || create.isPending}
          className="nexus-btn nexus-btn-solid"
          style={{ ["--btn-color" as string]: TIERS[type].color }}
        >
          <Plus className="h-3.5 w-3.5" />
          {create.isPending ? "Accepting" : "Accept"}
        </button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------- module */

export function MissionLog() {
  const goalsQuery = useGoals();
  const goals = goalsQuery.data;

  const stats = useMemo(() => {
    const list = goals ?? [];
    const complete = list.filter((g) => goalRatio(g) >= 1).length;
    const overall = list.length ? list.reduce((s, g) => s + goalRatio(g), 0) / list.length : 0;
    const xp = list.reduce((s, g) => s + Math.floor(goalRatio(g) * TIERS[g.type].reward), 0);
    return { total: list.length, complete, overall, xp };
  }, [goals]);

  return (
    <div className="relative space-y-6">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-0 opacity-80">
        <Starfield
          density={0.9}
          speed={9}
          angle={-Math.PI / 2}
          colors={["#a855f7", "#00c8ff", "#00ff6a", "#e6f6ff"]}
          seed={21}
        />
      </div>
      <SectionHeading
        code="Module 03 · Mission Log"
        title="Operative Progression"
        subtitle="Long-range objectives as tiered quests. Legendary campaigns span the year, Epic arcs the month, Daily ops the week."
        accent="violet"
        className="relative"
      >
        <StatChip label="Quests" value={stats.total} color="#a855f7" />
        <StatChip label="Complete" value={stats.complete} color="#00ff6a" />
        <StatChip label="Overall" value={`${Math.round(stats.overall * 100)}%`} />
        <StatChip label="Quest XP" value={stats.xp.toLocaleString()} color="#f59e0b" />
      </SectionHeading>

      <div className="relative">
        <QuestComposer />
      </div>

      {goalsQuery.isPending ? (
        <div className="relative grid gap-6 @5xl:grid-cols-3" aria-hidden>
          {TIER_ORDER.map((t) => (
            <div
              key={t}
              className="nexus-glass h-64 animate-shimmer rounded-2xl bg-[linear-gradient(90deg,transparent,rgba(168,85,247,0.06),transparent)] bg-[length:200%_100%]"
            />
          ))}
        </div>
      ) : goalsQuery.isError ? (
        <SignalLost
          title="QUEST LOG UNREACHABLE"
          message={errorMessage(goalsQuery.error, "Could not load quests.")}
          onRetry={() => void goalsQuery.refetch()}
          retrying={goalsQuery.isFetching}
        />
      ) : (
        <div className="relative grid gap-6 @5xl:grid-cols-3">
          {TIER_ORDER.map((type) => {
            const tier = TIERS[type];
            const Icon = TIER_ICONS[type];
            const quests = (goals ?? [])
              .filter((g) => g.type === type)
              .sort((a, b) => goalRatio(a) - goalRatio(b) || b.createdAt.localeCompare(a.createdAt));
            const tierProgress = quests.length ? quests.reduce((s, g) => s + goalRatio(g), 0) / quests.length : 0;
            return (
              <section key={type} aria-labelledby={`tier-${type}`} className="space-y-3">
                <header
                  className="nexus-glass flex items-center gap-3 rounded-2xl px-4 py-3"
                  style={{ boxShadow: `inset 0 -2px 0 ${tier.color}80` }}
                >
                  <Icon
                    className="h-5 w-5"
                    style={{ color: tier.color, filter: `drop-shadow(0 0 6px ${tier.color})` }}
                  />
                  <div className="min-w-0 flex-1">
                    <h2 id={`tier-${type}`} className={cn("hud-title text-sm", tier.textGlowClass)}>
                      {tier.label}
                    </h2>
                    <p className="font-[Share_Tech_Mono] text-[0.62rem] tracking-[0.2em] text-ink-faint">
                      {tier.horizon.toUpperCase()} · {quests.length} QUEST{quests.length === 1 ? "" : "S"}
                    </p>
                  </div>
                  <span className="font-[Orbitron] text-sm font-bold tabular-nums" style={{ color: tier.color }}>
                    {Math.round(tierProgress * 100)}%
                  </span>
                </header>
                {quests.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-ink-faint">
                    No {tier.label.toLowerCase()} quests yet.
                  </p>
                ) : (
                  <ul className="grid gap-3 @2xl:grid-cols-2 @5xl:grid-cols-1">
                    <AnimatePresence initial={false} mode="popLayout">
                      {quests.map((goal) => (
                        <QuestCard key={goal.id} goal={goal} />
                      ))}
                    </AnimatePresence>
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
