import { motion } from "framer-motion";
import { Link } from "wouter";
import { HexGridBackdrop } from "@/components/hud/HexGridBackdrop";
import { NexusMark } from "@/components/hud/NexusMark";

export default function NotFound() {
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-4">
      <HexGridBackdrop />
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="nexus-glass-strong hud-bracket relative w-full max-w-md rounded-2xl p-8 text-center"
      >
        <NexusMark className="mx-auto h-12 w-12" />
        <p className="hud-label mt-5">ERR · 404 · SECTOR UNMAPPED</p>
        <h1 className="hud-title mt-2 text-2xl text-glow-red">Coordinates not found</h1>
        <p className="mt-3 text-ink-dim">
          This sector isn't on any NEXUS chart. Return to the command center to resume operations.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/dashboard" className="nexus-btn nexus-btn-solid">
            Command Center
          </Link>
          <Link href="/" className="nexus-btn">
            Boot Screen
          </Link>
        </div>
      </motion.div>
    </main>
  );
}
