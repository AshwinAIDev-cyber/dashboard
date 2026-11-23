import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import type { z } from "zod/v4";

/**
 * Goal horizons. Mission Log renders them as quest tiers:
 * yearly = LEGENDARY (violet), monthly = EPIC (blue), weekly = DAILY (green).
 */
export const GOAL_TYPES = ["yearly", "monthly", "weekly"] as const;
export type GoalType = (typeof GOAL_TYPES)[number];

export const goalsTable = pgTable("goals", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  type: text("type", { enum: GOAL_TYPES }).notNull(),
  progress: integer("progress").notNull().default(0),
  target: integer("target").notNull().default(10),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertGoalSchema = createInsertSchema(goalsTable).omit({
  id: true,
  createdAt: true,
});
export const selectGoalSchema = createSelectSchema(goalsTable);

export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type Goal = typeof goalsTable.$inferSelect;
