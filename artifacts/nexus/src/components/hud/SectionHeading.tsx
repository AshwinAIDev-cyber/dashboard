import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  code: string;
  title: string;
  subtitle: string;
  accent?: "cyan" | "violet" | "green" | "amber";
  children?: ReactNode;
  className?: string;
}

const ACCENTS = {
  cyan: "text-glow-cyan",
  violet: "text-glow-violet",
  green: "text-glow-green",
  amber: "text-glow-amber",
} as const;

/** Big HUD heading used at the top of each dashboard module. */
export function SectionHeading({ code, title, subtitle, accent = "cyan", children, className }: SectionHeadingProps) {
  return (
    <div className={cn("flex flex-col gap-4 @3xl:flex-row @3xl:items-end @3xl:justify-between", className)}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
      >
        <p className="hud-label flex items-center gap-2">
          <span className="inline-block h-1.5 w-1.5 rotate-45 bg-nexus-cyan shadow-[0_0_8px_#00c8ff]" />
          {code}
        </p>
        <h1 className={cn("hud-title mt-2 text-2xl leading-none sm:text-3xl", ACCENTS[accent])}>{title}</h1>
        <p className="mt-2 max-w-xl text-[0.95rem] text-ink-dim">{subtitle}</p>
      </motion.div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
