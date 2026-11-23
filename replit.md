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
- **Frontend**: React 18, Vite, Tailwind CSS v4, Framer Motion, Lucide Icons, Wouter router
- **Design**: Spectacular fusion theme — Apple glass morphism + gaming HUD + sci-fi holographic. Orbitron (display), Share Tech Mono (mono), Rajdhani (body). Colors: electric blue (#00c8ff), violet (#a855f7), amber (#f59e0b), green (#00ff6a), red (#ff3a3a) on deep obsidian backgrounds (#080b14 → #0e1328). Utility classes: `.nexus-glass`, `.nexus-glass-strong`, `.nexus-hex-bg`, `.hud-bracket`, `.rank-badge`, `.xp-bar`, `.scan-line-overlay`

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── nexus/              # React+Vite frontend (NEXUS Command Center)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## NEXUS Frontend (`artifacts/nexus`)

The main React+Vite frontend application with a retro-futuristic command center design.

- **Landing page** (`src/pages/Landing.tsx`): "System Awakening" — animated star field + hexagonal grid with mouse parallax, holographic NEXUS logo that assembles on load, frosted glass center panel, liquid-fill Enter button, HUD-corner status readouts
- **Dashboard** (`src/pages/Dashboard.tsx`): Floating glass pill navigation bar (Apple Dynamic Island-inspired), periodic scan-line sweep, spring-physics tab transitions, FRIDAY AI toggle
  - **Command Deck** (`src/components/CommandDeck.tsx`): "Mission Briefing Room" — task cards with ALPHA/BETA/GAMMA rank badges, XP reward indicators, completion burst animations, hexagonal grid background. Pomodoro timer redesigned as "Ability Recharge" circular gauge with pulsing core
  - **Comms Hub** (`src/components/CommsHub.tsx`): "Signal Intercept" — holographic timeline calendar with glass day capsules, classified-document email cards with sender avatar rings, frosted glass email reading modal, animated signal-waveform background
  - **Mission Log** (`src/components/MissionLog.tsx`): "Operative Progression" — tiered quest system (Legendary/violet, Epic/blue, Daily/green) with segmented XP progress bars, game-control increment buttons, drifting star particles background
- **FRIDAY AI Sidebar** (`src/components/FridaySidebar.tsx`): "Neural Interface" — holographic panel with animated neural network visualization, terminal-style chat input with glowing cursor, pulsing edge glow during active state
- **Routing**: Wouter — `/` = landing, `/dashboard` = main dashboard
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
  - `src/routes/email.ts` — `GET /email/messages`, `GET /email/messages/:id`, `POST /email/send` (Gmail via Replit connector)
- Google integration clients: `src/lib/google-calendar.ts`, `src/lib/google-mail.ts` (use Replit connector OAuth tokens)
- Depends on: `@workspace/db`, `@workspace/api-zod`, `googleapis`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/tasks.ts` — `tasksTable` (id, title, completed, createdAt)
- `src/schema/goals.ts` — `goalsTable` (id, title, type [yearly/monthly/weekly], progress, target, createdAt)
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

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.
