import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatChipProps {
  label: string;
  value: ReactNode;
  color?: string;
  className?: string;
}

/** Compact glass readout: tiny mono label over an Orbitron value. */
export function StatChip({ label, value, color = "#00c8ff", className }: StatChipProps) {
  return (
    <div className={cn("nexus-glass min-w-[6.5rem] rounded-xl px-3.5 py-2", className)}>
      <p className="hud-label text-[0.6rem]">{label}</p>
      <p
        className="mt-0.5 font-[Orbitron] text-lg font-bold tabular-nums"
        style={{ color, textShadow: `0 0 12px ${color}80` }}
      >
        {value}
      </p>
    </div>
  );
}
