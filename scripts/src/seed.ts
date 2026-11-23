/**
 * Seed a running NEXUS API with a starter set of missions and quests.
 *
 *   pnpm --filter @workspace/scripts run seed
 *   API_URL=https://your-app.replit.app/api pnpm --filter @workspace/scripts run seed
 *
 * Skips seeding when data already exists unless FORCE=1.
 */

const API_URL = (process.env.API_URL ?? "http://localhost:8080/api").replace(/\/+$/, "");
const FORCE = process.env.FORCE === "1";

type Priority = "alpha" | "beta" | "gamma";
type GoalType = "yearly" | "monthly" | "weekly";

const TASKS: { title: string; priority: Priority; completed?: boolean }[] = [
  { title: "Finalize Q4 roadmap and circulate to the team", priority: "alpha" },
  { title: "Fix the flaky login test in CI", priority: "alpha" },
  { title: "Review pull requests in the comms module", priority: "beta" },
  { title: "Book dentist appointment", priority: "beta" },
  { title: "Draft blog post on focus rituals", priority: "gamma" },
  { title: "Back up photo library to cold storage", priority: "gamma", completed: true },
  { title: "Renew passport", priority: "beta", completed: true },
];

const GOALS: { title: string; type: GoalType; target: number; progress: number }[] = [
  { title: "Read 24 books", type: "yearly", target: 24, progress: 17 },
  { title: "Run 1,000 km", type: "yearly", target: 1000, progress: 642 },
  { title: "Ship the NEXUS mobile companion", type: "monthly", target: 4, progress: 3 },
  { title: "Publish 2 long-form articles", type: "monthly", target: 2, progress: 0 },
  { title: "Gym sessions", type: "weekly", target: 4, progress: 2 },
  { title: "Inbox zero days", type: "weekly", target: 5, progress: 5 },
];

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`${init?.method ?? "GET"} ${path} → ${res.status} ${await res.text()}`);
  return (res.status === 204 ? undefined : await res.json()) as T;
}

async function main() {
  const [tasks, goals] = await Promise.all([api<unknown[]>("/tasks"), api<unknown[]>("/goals")]);
  if ((tasks.length || goals.length) && !FORCE) {
    console.log(
      `Found ${tasks.length} tasks and ${goals.length} goals already — skipping (set FORCE=1 to seed anyway).`,
    );
    return;
  }

  for (const task of [...TASKS].reverse()) {
    const created = await api<{ id: number }>("/tasks", {
      method: "POST",
      body: JSON.stringify({ title: task.title, priority: task.priority }),
    });
    if (task.completed) {
      await api(`/tasks/${created.id}`, { method: "PATCH", body: JSON.stringify({ completed: true }) });
    }
  }
  for (const goal of [...GOALS].reverse()) {
    await api("/goals", { method: "POST", body: JSON.stringify(goal) });
  }
  console.log(`Seeded ${TASKS.length} missions and ${GOALS.length} quests into ${API_URL}.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
