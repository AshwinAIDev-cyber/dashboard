import { Router } from "express";
import { asc, desc, eq, sql } from "drizzle-orm";
import { db, tasksTable } from "@workspace/db";
import {
  CreateTaskBody,
  DeleteTaskParams,
  ListTasksResponse,
  ListTasksResponseItem,
  UpdateTaskBody,
  UpdateTaskParams,
} from "@workspace/api-zod";
import { NotFoundError } from "../lib/errors";
import { cleanTitle, serializeTask } from "../lib/serialize";

const router = Router();

const priorityOrder = sql`case ${tasksTable.priority} when 'alpha' then 0 when 'beta' then 1 else 2 end`;

router.get("/tasks", async (_req, res) => {
  const rows = await db
    .select()
    .from(tasksTable)
    .orderBy(asc(tasksTable.completed), priorityOrder, desc(tasksTable.createdAt));
  res.json(ListTasksResponse.parse(rows.map(serializeTask)));
});

router.post("/tasks", async (req, res) => {
  const body = CreateTaskBody.parse(req.body);
  const [row] = await db
    .insert(tasksTable)
    .values({ title: cleanTitle(body.title), priority: body.priority ?? "beta" })
    .returning();
  res.status(201).json(ListTasksResponseItem.parse(serializeTask(row!)));
});

router.patch("/tasks/:id", async (req, res) => {
  const { id } = UpdateTaskParams.parse(req.params);
  const body = UpdateTaskBody.parse(req.body);

  const changes: Partial<typeof tasksTable.$inferInsert> = {};
  if (body.title !== undefined) changes.title = cleanTitle(body.title);
  if (body.priority !== undefined) changes.priority = body.priority;
  if (body.completed !== undefined) {
    changes.completed = body.completed;
    changes.completedAt = body.completed ? new Date() : null;
  }

  const [row] =
    Object.keys(changes).length > 0
      ? await db.update(tasksTable).set(changes).where(eq(tasksTable.id, id)).returning()
      : await db.select().from(tasksTable).where(eq(tasksTable.id, id));
  if (!row) throw new NotFoundError(`Task ${id} not found`);
  res.json(ListTasksResponseItem.parse(serializeTask(row)));
});

router.delete("/tasks/:id", async (req, res) => {
  const { id } = DeleteTaskParams.parse(req.params);
  const [row] = await db.delete(tasksTable).where(eq(tasksTable.id, id)).returning({ id: tasksTable.id });
  if (!row) throw new NotFoundError(`Task ${id} not found`);
  res.status(204).end();
});

export default router;
