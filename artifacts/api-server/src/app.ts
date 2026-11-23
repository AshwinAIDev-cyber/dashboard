import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";
import { errorHandler, notFoundHandler } from "./lib/errors";
import router from "./routes";

const app: Express = express();

app.disable("x-powered-by");
app.set("trust proxy", true);

app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Compact access log for API calls (skips the health probe).
app.use("/api", (req, res, next) => {
  if (req.path === "/healthz") return next();
  const started = process.hrtime.bigint();
  res.on("finish", () => {
    const ms = Number(process.hrtime.bigint() - started) / 1e6;
    console.log(`[api] ${req.method} ${req.originalUrl} → ${res.statusCode} (${ms.toFixed(0)}ms)`);
  });
  next();
});

app.use("/api", router);
app.use("/api", notFoundHandler);
app.use(errorHandler);

export default app;
