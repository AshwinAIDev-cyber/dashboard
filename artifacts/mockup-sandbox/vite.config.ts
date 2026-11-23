import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { defineConfig, type PluginOption } from "vite";
import { mockupPreviewPlugin } from "./mockup-preview-plugin";

const port = Number(process.env.PORT ?? 5174);
if (!Number.isInteger(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${process.env.PORT}"`);
}

const isReplitDev = process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined;
const replitPlugins: PluginOption[] = isReplitDev
  ? [
      await import("@replit/vite-plugin-cartographer").then((m) =>
        m.cartographer({ root: path.resolve(import.meta.dirname, "..") }),
      ),
    ]
  : [];

export default defineConfig({
  base: process.env.BASE_PATH ?? "/",
  plugins: [mockupPreviewPlugin(), react(), tailwindcss(), runtimeErrorOverlay(), ...replitPlugins],
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
  },
  server: { port, host: "0.0.0.0", allowedHosts: true },
  preview: { port, host: "0.0.0.0", allowedHosts: true },
});
