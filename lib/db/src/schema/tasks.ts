import { boolean, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import type { z } from "zod/v4";

/**
 * Mission ranks shown on Command Deck task cards.
 * ALPHA = critical, BETA = standard, GAMMA = side-quest.
 */
export const TASK_PRIORITIES = ["alpha", "beta", "gamma"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const tasksTable = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  completed: boolean("completed").notNull().default(false),
  priority: text("priority", { enum: TASK_PRIORITIES }).notNull().default("beta"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const insertTaskSchema = createInsertSchema(tasksTable).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});
export const selectTaskSchema = createSelectSchema(tasksTable);

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;
