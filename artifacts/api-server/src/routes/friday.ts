import { Router } from "express";
import { FridayChatBody, FridayChatResponse, GetFridayStatusResponse } from "@workspace/api-zod";
import { fridayStatus, runFriday } from "../lib/friday";

const router = Router();

router.get("/friday/status", (_req, res) => {
  res.json(GetFridayStatusResponse.parse(fridayStatus()));
});

router.post("/friday/chat", async (req, res) => {
  const body = FridayChatBody.parse(req.body);
  const result = await runFriday(body);
  res.json(FridayChatResponse.parse(result));
});

export default router;
