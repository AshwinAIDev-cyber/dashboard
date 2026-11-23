import { Router } from "express";
import calendarRouter from "./calendar";
import emailRouter from "./email";
import fridayRouter from "./friday";
import goalsRouter from "./goals";
import healthRouter from "./health";
import tasksRouter from "./tasks";

const router = Router();

router.use(healthRouter);
router.use(tasksRouter);
router.use(goalsRouter);
router.use(calendarRouter);
router.use(emailRouter);
router.use(fridayRouter);

export default router;
