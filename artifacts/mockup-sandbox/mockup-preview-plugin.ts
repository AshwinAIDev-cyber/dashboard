import path from "node:path";
import chokidar from "chokidar";
import fg from "fast-glob";
import type { Plugin, ViteDevServer } from "vite";

/**
 * Discovers every component under src/components/mockups and exposes them as
 * the virtual module `virtual:mockups` — a map of "relative/path" → lazy
 * import. New or deleted mockup files trigger a full reload in dev.
 */
const VIRTUAL_ID = "virtual:mockups";
const RESOLVED_ID = `\0${VIRTUAL_ID}`;

export function mockupPreviewPlugin(): Plugin {
  let root = process.cwd();
  let mockupsDir = "";

  const generate = async () => {
    const files = await fg("**/*.tsx", { cwd: mockupsDir, ignore: ["**/_*.tsx", "**/*.test.tsx"] });
    files.sort();
    const entries = files.map((file) => {
      const key = file.replace(/\.tsx$/, "");
      const abs = path.join(mockupsDir, file).split(path.sep).join("/");
      return `  ${JSON.stringify(key)}: () => import(${JSON.stringify(abs)}),`;
    });
    return `export const mockups = {\n${entries.join("\n")}\n};\n`;
  };

  return {
    name: "mockup-preview",
    configResolved(config) {
      root = config.root;
      mockupsDir = path.resolve(root, "src/components/mockups");
    },
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : undefined;
    },
    async load(id) {
      return id === RESOLVED_ID ? generate() : undefined;
    },
    configureServer(server: ViteDevServer) {
      const watcher = chokidar.watch(mockupsDir, { ignoreInitial: true });
      const refresh = () => {
        const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: "full-reload" });
      };
      watcher.on("add", refresh).on("unlink", refresh);
      server.httpServer?.once("close", () => void watcher.close());
    },
  };
}
