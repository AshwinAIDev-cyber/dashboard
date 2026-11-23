import { initials } from "@/lib/format";
import { cn, hashString } from "@/lib/utils";

const RING_COLORS = ["#00c8ff", "#a855f7", "#00ff6a", "#f59e0b", "#ff3a3a", "#38bdf8", "#e879f9"];

/** Initials inside a glowing ring; the ring pulses for unread messages. */
export function SenderAvatar({
  name,
  email,
  unread,
  size = 44,
}: {
  name: string;
  email: string;
  unread?: boolean;
  size?: number;
}) {
  const color = RING_COLORS[hashString(email || name) % RING_COLORS.length]!;
  return (
    <span
      className="relative inline-grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {unread && (
        <span className="absolute inset-0 rounded-full border-2 animate-pulse-ring" style={{ borderColor: color }} />
      )}
      <span
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(from 210deg, ${color}, transparent 40%, ${color}80 70%, ${color})`,
          padding: 2,
          WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px))",
          mask: "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px))",
          boxShadow: unread ? `0 0 14px ${color}90` : undefined,
        }}
      />
      <span
        className={cn("relative grid place-items-center rounded-full bg-obsidian-850 font-[Orbitron] font-bold")}
        style={{ width: size - 8, height: size - 8, color, fontSize: size * 0.28 }}
      >
        {initials(name)}
      </span>
    </span>
  );
}
