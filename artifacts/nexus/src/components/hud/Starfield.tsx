import { useEffect, useMemo, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { useCanvasLoop } from "@/hooks/use-animation-frame";
import { cn, seededRandom } from "@/lib/utils";

interface Star {
  x: number;
  y: number;
  z: number; // depth 0.15 (far) .. 1 (near)
  r: number;
  twinkle: number;
  hue: string;
}

interface StarfieldProps {
  className?: string;
  /** Stars per 10k px² of canvas. */
  density?: number;
  /** Base drift speed in px/s for the nearest layer. */
  speed?: number;
  /** Drift direction in radians (default: slowly upward-left). */
  angle?: number;
  /** Follow the pointer for a parallax shift. */
  parallax?: number;
  colors?: string[];
  seed?: number;
}

/** Layered, twinkling star particles on a canvas. Pauses when off-screen. */
export function Starfield({
  className,
  density = 1.1,
  speed = 14,
  angle = -Math.PI / 2.4,
  parallax = 0,
  colors = ["#e6f6ff", "#9fe6ff", "#c7a6ff"],
  seed = 7,
}: StarfieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const stars = useRef<Star[]>([]);
  const sizeKey = useRef("");
  const pointer = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const random = useMemo(() => seededRandom(seed), [seed]);

  useCanvasLoop(
    canvasRef,
    (ctx, { width, height }, t, dt) => {
      const key = `${Math.round(width / 80)}x${Math.round(height / 80)}`;
      if (key !== sizeKey.current) {
        sizeKey.current = key;
        const count = Math.round(((width * height) / 10000) * density);
        stars.current = Array.from({ length: count }, () => {
          const z = 0.15 + random() ** 1.6 * 0.85;
          return {
            x: random() * width,
            y: random() * height,
            z,
            r: 0.35 + z * 1.35,
            twinkle: random() * Math.PI * 2,
            hue: colors[Math.floor(random() * colors.length)]!,
          };
        });
      }

      const p = pointer.current;
      p.x += (p.tx - p.x) * Math.min(dt * 3, 1);
      p.y += (p.ty - p.y) * Math.min(dt * 3, 1);

      ctx.clearRect(0, 0, width, height);
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const motion = reduced ? 0 : 1;

      for (const s of stars.current) {
        s.x += vx * s.z * dt * motion;
        s.y += vy * s.z * dt * motion;
        if (s.x < -4) s.x += width + 8;
        if (s.x > width + 4) s.x -= width + 8;
        if (s.y < -4) s.y += height + 8;
        if (s.y > height + 4) s.y -= height + 8;

        const px = s.x + p.x * parallax * s.z;
        const py = s.y + p.y * parallax * s.z;
        const flicker = reduced ? 0.8 : 0.55 + 0.45 * Math.sin(t * (1.2 + s.z * 2.2) + s.twinkle);
        ctx.globalAlpha = Math.min(1, (0.25 + s.z * 0.75) * flicker);
        ctx.fillStyle = s.hue;
        ctx.beginPath();
        ctx.arc(px, py, s.r, 0, Math.PI * 2);
        ctx.fill();
        if (s.z > 0.82) {
          ctx.globalAlpha *= 0.25;
          ctx.beginPath();
          ctx.arc(px, py, s.r * 3.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    },
    [density, speed, angle, parallax, reduced, colors.join(",")],
  );

  useEffect(() => {
    if (!parallax) return;
    const onMove = (e: PointerEvent) => {
      pointer.current.tx = (e.clientX / window.innerWidth - 0.5) * -40;
      pointer.current.ty = (e.clientY / window.innerHeight - 0.5) * -40;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [parallax]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
    />
  );
}
