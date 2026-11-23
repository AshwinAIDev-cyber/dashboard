// Production bundle: dist/index.cjs
//
// Workspace libraries and a small allowlist of runtime deps are bundled in so
// the output runs without the monorepo's symlinked packages. Everything else
// in package.json (notably the very large `googleapis`) stays external and is
// loaded from node_modules at runtime.
import { build } from "esbuild";
import { readFile, rm } from "node:fs/promises";

const BUNDLE_ALLOWLIST = new Set([
  "@anthropic-ai/sdk",
  "cookie-parser",
  "cors",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "p-limit",
  "p-retry",
  "pg",
  "zod",
]);

const pkg = JSON.parse(await readFile(new URL("./package.json", import.meta.url), "utf8"));
const external = Object.keys({ ...pkg.dependencies }).filter(
  (dep) => !dep.startsWith("@workspace/") && !BUNDLE_ALLOWLIST.has(dep),
);

await rm(new URL("./dist", import.meta.url), { recursive: true, force: true });

const result = await build({
  entryPoints: ["src/index.ts"],
  outfile: "dist/index.cjs",
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node20",
  sourcemap: true,
  minify: false,
  external: [...external, "pg-native"],
  conditions: ["workspace"],
  logLevel: "info",
  metafile: true,
});

const bytes = Object.values(result.metafile.outputs).reduce((sum, o) => sum + o.bytes, 0);
console.log(`[build] externals: ${external.join(", ") || "(none)"}`);
console.log(`[build] wrote dist/index.cjs (${(bytes / 1024).toFixed(0)} KiB incl. sourcemap)`);
