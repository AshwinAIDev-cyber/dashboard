import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

/** Hexagonal grid layer that drifts opposite the pointer for depth. */
export function HexGridBackdrop({ className, strength = 18 }: { className?: string; strength?: number }) {
  const reduced = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 18 });
  const sy = useSpring(my, { stiffness: 60, damping: 18 });
  const x = useTransform(sx, (v) => v * strength);
  const y = useTransform(sy, (v) => v * strength);

  useEffect(() => {
    if (reduced) return;
    const onMove = (e: PointerEvent) => {
      mx.set(0.5 - e.clientX / window.innerWidth);
      my.set(0.5 - e.clientY / window.innerHeight);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [mx, my, reduced]);

  return (
    <motion.div
      aria-hidden
      style={{ x, y }}
      className={cn(
        "nexus-hex-bg pointer-events-none absolute -inset-12 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]",
        className,
      )}
    />
  );
}
