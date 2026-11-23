# Workspace

## Overview

NEXUS — Command Center: A retro-futuristic personal productivity dashboard with Google Calendar/Gmail sync and a JARVIS-style AI assistant (Friday AI). Built as a pnpm workspace monorepo using TypeScript.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React 19, Vite 7, Tailwind CSS v4, Framer Motion, Lucide Icons, Wouter router, TanStack Query, Sonner toasts
- **AI**: Anthropic SDK (`claude-opus-5-5` by default) via Replit AI Integrations or `ANTHROPIC_API_KEY`
- **Design**: Spectacular fusion theme — Apple glass morphism + gaming HUD + sci-fi holographic. Orbitron (display), Share Tech Mono (mono), Rajdhani (body). Colors: electric blue (#00c8ff), violet (#a855f7), amber (#f59e0b), green (#00ff6a), red (#ff3a3a) on deep obsidian backgrounds (#080b14 → #0e1328). Utility classes: `.nexus-glass`, `.nexus-glass-strong`, `.nexus-hex-bg`, `.hud-bracket`, `.rank-badge`, `.xp-bar`, `.scan-line-overlay`

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   ├── mockup-sandbox/     # Vite component-preview sandbox for design mockups
│   └── nexus/              # React+Vite frontend (NEXUS Command Center)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   ├── db/                 # Drizzle ORM schema + DB connection
│   └── integrations-anthropic-ai/  # Anthropic client + batch helpers
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## NEXUS Frontend (`artifacts/nexus`)

The main React+Vite frontend application with a retro-futuristic command center design.

- **Landing page** (`src/pages/Landing.tsx`): "System Awakening" — animated star field + hexagonal grid with mouse parallax, holographic NEXUS logo that assembles on load, frosted glass center panel with a live boot sequence (core ping, task/goal counts, comms + FRIDAY status), liquid-fill Enter button (or press Enter), HUD-corner status readouts (clock, pointer coords, FPS, API latency)
- **Dashboard** (`src/pages/Dashboard.tsx`): Floating glass pill navigation bar (Apple Dynamic Island-inspired — expands on hover into a live status ticker), operator level ring, periodic scan-line sweep, spring-physics directional tab transitions, FRIDAY AI toggle. Hotkeys: `1`/`2`/`3` switch modules, `F` toggles FRIDAY, `Esc` closes it. Module layouts use container queries so they re-flow when FRIDAY docks beside them
  - **Command Deck** (`src/components/CommandDeck.tsx`): "Mission Briefing Room" — task cards with ALPHA/BETA/GAMMA rank badges (click to cycle), XP reward indicators, completion burst animations, inline title editing, two-step delete, Active/Cleared/All filters, optimistic updates, hexagonal grid background, operator progression card. Pomodoro timer redesigned as "Ability Recharge" circular gauge with pulsing core (`src/components/AbilityRecharge.tsx`, state in `src/lib/recharge-store.ts` — keeps running across modules and reloads, shows the countdown in the tab title, chimes on completion)
  - **Comms Hub** (`src/components/CommsHub.tsx`): "Signal Intercept" — holographic timeline calendar with glass day capsules (14 days, schedule/delete events, live-event progress), classified-document email cards with sender avatar rings (pulsing when unread), frosted glass email reading modal with threaded reply, compose modal, animated signal-waveform background. Shows a "SIGNAL LOST" panel when Google isn't connected
  - **Mission Log** (`src/components/MissionLog.tsx`): "Operative Progression" — tiered quest system (Legendary/violet = yearly, Epic/blue = monthly, Daily/green = weekly) with segmented XP progress bars, game-control increment buttons, inline edit of title/target, drifting star particles background
- **FRIDAY AI Sidebar** (`src/components/FridaySidebar.tsx`): "Neural Interface" — holographic panel with animated neural network visualization (`src/components/NeuralNet.tsx`), terminal-style chat input with glowing cursor, pulsing edge glow during active state, typewriter replies, suggestion chips, action receipts when FRIDAY edits the board. Conversation persists in localStorage
- **Gamification** (`src/lib/game.ts`): ALPHA/BETA/GAMMA tasks pay 150/100/50 XP; quests pay up to 1000/400/150 XP pro-rata. Level n starts at 100·(n−1)² XP, with titles RECRUIT → CADET → OPERATIVE → SPECIALIST → VANGUARD → COMMANDER → ARCHON
- **Data hooks** (`src/hooks/use-nexus-data.ts`): wraps the generated React Query hooks with optimistic task/goal mutations and derived XP/level
- **Routing**: Wouter — `/` = landing, `/dashboard` = main dashboard (`#deck`, `#comms`, `#log` select a module), anything else = 404
- **Dev**: `pnpm --filter @workspace/nexus run dev` (reads `PORT`, default 5173, and `BASE_PATH`). Locally `/api` is proxied to `API_PROXY_TARGET` (default `http://localhost:8080`); on Replit the platform routes `/api` to the API server
- **Design system**: Glass morphism + gaming HUD + sci-fi holographic CSS in `src/index.css`. Uses `@theme inline` for Tailwind v4. Utility classes: `.nexus-glass`, `.nexus-glass-strong`, `.nexus-hex-bg`, `.hud-bracket`, `.rank-badge`, `.xp-bar`, `.glow-cyan`, `.glow-violet`, `.text-glow-*`, `.scan-line-overlay`
- **Fonts**: Google Fonts loaded via `index.html` — Orbitron, Share Tech Mono, Rajdhani. Referenced as `font-[Orbitron]`, `font-[Share_Tech_Mono]`, `font-[Rajdhani]` in JSX

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers
  - `src/routes/health.ts` — `GET /healthz`
  - `src/routes/tasks.ts` — `GET/POST /tasks`, `PATCH/DELETE /tasks/:id`
  - `src/routes/goals.ts` — `GET/POST /goals`, `PATCH/DELETE /goals/:id`
  - `src/routes/calendar.ts` — `GET/POST /calendar/events`, `DELETE /calendar/events/:id` (Google Calendar via Replit connector)
  - `src/routes/email.ts` — `GET /email/messages`, `GET /email/messages/:id`, `POST /email/send` (Gmail via Replit connector; supports threaded replies)
  - `src/routes/friday.ts` — `GET /friday/status`, `POST /friday/chat` (FRIDAY assistant)
- Google integration clients: `src/lib/google-calendar.ts`, `src/lib/google-mail.ts`, auth in `src/lib/google-auth.ts` + `src/lib/replit-connectors.ts` (Replit connector OAuth tokens; self-hosted fallback via `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REFRESH_TOKEN`). When neither is available, Google routes answer `503 { code: "integration_unavailable" }`
- FRIDAY (`src/lib/friday.ts`): builds a live snapshot (tasks, goals, today's calendar, unread mail) into the system prompt and runs a tool loop with strict tools `create_task`, `set_task_completed`, `create_goal`, `set_goal_progress`. Returns `{ reply, actions }`. Env: `FRIDAY_MODEL` (default `claude-opus-5-5`), `FRIDAY_EFFORT` (`low` | `medium` | `high` | `max`, default `low`)
- Errors (`src/lib/errors.ts`): every error is JSON `{ error, code }` — 400 validation, 404 not found, 503 integration offline, 502 upstream failure
- Depends on: `@workspace/db`, `@workspace/api-zod`, `@workspace/integrations-anthropic-ai`, `googleapis`, `cookie-parser`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/tasks.ts` — `tasksTable` (id, title, completed, priority [alpha/beta/gamma, default beta], createdAt, completedAt)
- `src/schema/goals.ts` — `goalsTable` (id, title, type [yearly/monthly/weekly], progress, target, createdAt). The API clamps progress to 0..target
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `lib/integrations-anthropic-ai` (`@workspace/integrations-anthropic-ai`)

Shared Anthropic client. `getAnthropicClient()` uses Replit AI Integrations (`AI_INTEGRATIONS_ANTHROPIC_API_KEY` + `AI_INTEGRATIONS_ANTHROPIC_BASE_URL`) or falls back to `ANTHROPIC_API_KEY`; `isAnthropicConfigured()` reports availability. `batchProcess()` runs many requests with bounded concurrency (p-limit) and backoff retries on rate limits (p-retry).

### `artifacts/mockup-sandbox` (`@workspace/mockup-sandbox`)

Component preview sandbox. Any default-exported component in `src/components/mockups/` is listed at `/` and rendered full-screen at `/preview/<name>` (discovered with fast-glob, hot-reloaded with chokidar via `mockup-preview-plugin.ts`).

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.

- `seed` — loads starter missions and quests into a running API (`API_URL`, default `http://localhost:8080/api`; skips when data exists unless `FORCE=1`)
- `hello` — sanity check

## Running locally

1. `pnpm install`
2. Provision Postgres and export `DATABASE_URL`, then `pnpm --filter @workspace/db run push`
3. `PORT=8080 pnpm --filter @workspace/api-server run dev`
4. `pnpm --filter @workspace/nexus run dev` → http://localhost:5173
5. Optional: `pnpm --filter @workspace/scripts run seed`, `ANTHROPIC_API_KEY` for FRIDAY, Google env vars for Comms Hub
