import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/** Small animated energy orb used as FRIDAY's icon. */
export function FridayOrb({ active, size = 28, className }: { active?: boolean; size?: number; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <span
      className={cn("relative inline-grid shrink-0 place-items-center", className)}
      style={{ width: size, height: size }}
    >
      <span
        className={cn(
          "absolute inset-0 rounded-full bg-[radial-gradient(circle_at_35%_30%,#f3e8ff_0%,#c084fc_28%,#7c3aed_60%,#1e1240_100%)]",
          active ? "shadow-[0_0_18px_2px_rgba(168,85,247,0.75)]" : "shadow-[0_0_10px_rgba(168,85,247,0.45)]",
        )}
      />
      {!reduced && (
        <motion.span
          aria-hidden
          className="absolute inset-[-3px] rounded-full border border-nexus-violet/60"
          animate={{ scale: active ? [1, 1.35] : [1, 1.2], opacity: [0.8, 0] }}
          transition={{ duration: active ? 1.2 : 2.6, repeat: Infinity, ease: "easeOut" }}
        />
      )}
      <motion.span
        aria-hidden
        className="absolute inset-[22%] rounded-full bg-white/80 blur-[3px]"
        animate={reduced ? undefined : { opacity: active ? [0.6, 1, 0.6] : [0.35, 0.6, 0.35] }}
        transition={{ duration: active ? 0.9 : 2.4, repeat: Infinity }}
      />
    </span>
  );
}
