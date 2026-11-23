import { Router } from "express";
import { asc, desc, eq, sql } from "drizzle-orm";
import { db, goalsTable } from "@workspace/db";
import {
  CreateGoalBody,
  DeleteGoalParams,
  ListGoalsResponse,
  ListGoalsResponseItem,
  UpdateGoalBody,
  UpdateGoalParams,
} from "@workspace/api-zod";
import { NotFoundError } from "../lib/errors";
import { cleanTitle, serializeGoal } from "../lib/serialize";

const router = Router();

const DEFAULT_TARGETS = { yearly: 12, monthly: 4, weekly: 5 } as const;
const tierOrder = sql`case ${goalsTable.type} when 'yearly' then 0 when 'monthly' then 1 else 2 end`;
const clamp = (value: number, max: number) => Math.min(Math.max(Math.round(value), 0), max);

router.get("/goals", async (_req, res) => {
  const rows = await db.select().from(goalsTable).orderBy(tierOrder, desc(goalsTable.createdAt), asc(goalsTable.id));
  res.json(ListGoalsResponse.parse(rows.map(serializeGoal)));
});

router.post("/goals", async (req, res) => {
  const body = CreateGoalBody.parse(req.body);
  const target = Math.round(body.target ?? DEFAULT_TARGETS[body.type]);
  const [row] = await db
    .insert(goalsTable)
    .values({
      title: cleanTitle(body.title),
      type: body.type,
      target,
      progress: clamp(body.progress ?? 0, target),
    })
    .returning();
  res.status(201).json(ListGoalsResponseItem.parse(serializeGoal(row!)));
});

router.patch("/goals/:id", async (req, res) => {
  const { id } = UpdateGoalParams.parse(req.params);
  const body = UpdateGoalBody.parse(req.body);

  const [existing] = await db.select().from(goalsTable).where(eq(goalsTable.id, id));
  if (!existing) throw new NotFoundError(`Goal ${id} not found`);

  const target = Math.round(body.target ?? existing.target);
  const progress = clamp(body.progress ?? existing.progress, target);
  const [row] = await db
    .update(goalsTable)
    .set({
      title: body.title !== undefined ? cleanTitle(body.title) : existing.title,
      type: body.type ?? existing.type,
      target,
      progress,
    })
    .where(eq(goalsTable.id, id))
    .returning();
  res.json(ListGoalsResponseItem.parse(serializeGoal(row!)));
});

router.delete("/goals/:id", async (req, res) => {
  const { id } = DeleteGoalParams.parse(req.params);
  const [row] = await db.delete(goalsTable).where(eq(goalsTable.id, id)).returning({ id: goalsTable.id });
  if (!row) throw new NotFoundError(`Goal ${id} not found`);
  res.status(204).end();
});

export default router;
