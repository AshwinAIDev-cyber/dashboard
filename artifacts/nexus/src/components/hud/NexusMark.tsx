import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface NexusMarkProps {
  className?: string;
  /** Draw the hexagon stroke in on mount. */
  animate?: boolean;
  delay?: number;
}

/** The NEXUS hex emblem: a hexagon frame wrapping a stylised N. */
export function NexusMark({ className, animate = false, delay = 0 }: NexusMarkProps) {
  const draw = animate
    ? {
        initial: { pathLength: 0, opacity: 0 },
        animate: { pathLength: 1, opacity: 1 },
      }
    : {};
  return (
    <svg viewBox="0 0 64 64" className={cn("h-8 w-8", className)} aria-hidden>
      <defs>
        <linearGradient id="nexus-mark-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#00c8ff" />
          <stop offset="1" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      <motion.path
        d="M32 5 55.4 18.5v27L32 59 8.6 45.5v-27Z"
        fill="rgba(0,200,255,0.06)"
        stroke="url(#nexus-mark-gradient)"
        strokeWidth={3}
        strokeLinejoin="round"
        {...draw}
        transition={{ duration: 1.4, delay, ease: [0.65, 0, 0.35, 1] }}
      />
      <motion.path
        d="M23 42V22l18 20V22"
        fill="none"
        stroke="#00c8ff"
        strokeWidth={4.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: "drop-shadow(0 0 4px rgba(0,200,255,0.9))" }}
        {...draw}
        transition={{ duration: 1, delay: delay + 0.6, ease: "easeInOut" }}
      />
    </svg>
  );
}
