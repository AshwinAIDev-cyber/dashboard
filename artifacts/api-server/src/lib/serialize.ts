import type { Goal, Task } from "@workspace/db";
import { BadRequestError } from "./errors";

const iso = (value: Date | null): string | null => (value ? value.toISOString() : null);

export function serializeTask(task: Task) {
  return {
    id: task.id,
    title: task.title,
    completed: task.completed,
    priority: task.priority,
    createdAt: task.createdAt.toISOString(),
    completedAt: iso(task.completedAt),
  };
}

export function serializeGoal(goal: Goal) {
  return {
    id: goal.id,
    title: goal.title,
    type: goal.type,
    progress: goal.progress,
    target: goal.target,
    createdAt: goal.createdAt.toISOString(),
  };
}

/** Trim a user-supplied title and reject blank strings. */
export function cleanTitle(value: string): string {
  const title = value.replace(/\s+/g, " ").trim();
  if (!title) {
    throw new BadRequestError("title must not be blank");
  }
  return title;
}
