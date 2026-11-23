import type { Goal, GoalType, Task, TaskPriority } from "@workspace/api-client-react";

/* ---------- task ranks ---------- */

export interface RankMeta {
  key: TaskPriority;
  label: string;
  short: string;
  xp: number;
  color: string;
  className: string;
  description: string;
}

export const RANKS: Record<TaskPriority, RankMeta> = {
  alpha: {
    key: "alpha",
    label: "ALPHA",
    short: "α",
    xp: 150,
    color: "#ff3a3a",
    className: "rank-alpha",
    description: "Critical mission",
  },
  beta: {
    key: "beta",
    label: "BETA",
    short: "β",
    xp: 100,
    color: "#f59e0b",
    className: "rank-beta",
    description: "Standard mission",
  },
  gamma: {
    key: "gamma",
    label: "GAMMA",
    short: "γ",
    xp: 50,
    color: "#00c8ff",
    className: "rank-gamma",
    description: "Side quest",
  },
};

export const RANK_ORDER: TaskPriority[] = ["alpha", "beta", "gamma"];

export function nextRank(rank: TaskPriority): TaskPriority {
  return RANK_ORDER[(RANK_ORDER.indexOf(rank) + 1) % RANK_ORDER.length]!;
}

/* ---------- quest tiers ---------- */

export interface TierMeta {
  key: GoalType;
  label: string;
  horizon: string;
  color: string;
  glowClass: string;
  textGlowClass: string;
  reward: number;
  defaultTarget: number;
}

export const TIERS: Record<GoalType, TierMeta> = {
  yearly: {
    key: "yearly",
    label: "LEGENDARY",
    horizon: "Yearly campaign",
    color: "#a855f7",
    glowClass: "glow-violet",
    textGlowClass: "text-glow-violet",
    reward: 1000,
    defaultTarget: 12,
  },
  monthly: {
    key: "monthly",
    label: "EPIC",
    horizon: "Monthly arc",
    color: "#00c8ff",
    glowClass: "glow-cyan",
    textGlowClass: "text-glow-cyan",
    reward: 400,
    defaultTarget: 4,
  },
  weekly: {
    key: "weekly",
    label: "DAILY",
    horizon: "Weekly ops",
    color: "#00ff6a",
    glowClass: "glow-green",
    textGlowClass: "text-glow-green",
    reward: 150,
    defaultTarget: 5,
  },
};

export const TIER_ORDER: GoalType[] = ["yearly", "monthly", "weekly"];

/* ---------- XP + levels ---------- */

export function goalRatio(goal: Pick<Goal, "progress" | "target">): number {
  return goal.target > 0 ? Math.min(goal.progress / goal.target, 1) : 0;
}

export function totalXp(tasks: Task[] | undefined, goals: Goal[] | undefined): number {
  const taskXp = (tasks ?? []).reduce((sum, t) => sum + (t.completed ? RANKS[t.priority].xp : 0), 0);
  const goalXp = (goals ?? []).reduce((sum, g) => sum + Math.floor(goalRatio(g) * TIERS[g.type].reward), 0);
  return taskXp + goalXp;
}

/** Level n starts at 100·(n−1)² XP. */
export function levelFromXp(xp: number) {
  const level = Math.floor(Math.sqrt(Math.max(xp, 0) / 100)) + 1;
  const floor = 100 * (level - 1) ** 2;
  const ceiling = 100 * level ** 2;
  return {
    level,
    xpIntoLevel: xp - floor,
    xpForLevel: ceiling - floor,
    progress: (xp - floor) / (ceiling - floor),
    title: rankTitle(level),
  };
}

const TITLES: [number, string][] = [
  [20, "ARCHON"],
  [14, "COMMANDER"],
  [10, "VANGUARD"],
  [7, "SPECIALIST"],
  [4, "OPERATIVE"],
  [2, "CADET"],
  [1, "RECRUIT"],
];

export function rankTitle(level: number): string {
  return TITLES.find(([min]) => level >= min)?.[1] ?? "RECRUIT";
}
