import { useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { useCanvasLoop } from "@/hooks/use-animation-frame";
import { cn } from "@/lib/utils";

const WAVES = [
  { color: "0,200,255", amp: 0.18, freq: 1.6, speed: 0.55, width: 1.6, alpha: 0.5 },
  { color: "168,85,247", amp: 0.13, freq: 2.4, speed: -0.4, width: 1.2, alpha: 0.4 },
  { color: "0,255,106", amp: 0.08, freq: 3.6, speed: 0.9, width: 1, alpha: 0.3 },
  { color: "0,200,255", amp: 0.06, freq: 6.2, speed: -1.3, width: 0.8, alpha: 0.25 },
];

/** Layered, slowly modulating signal waves behind the Comms Hub. */
export function SignalWaveform({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  useCanvasLoop(
    canvasRef,
    (ctx, { width, height }, t) => {
      const time = reduced ? 0 : t;
      ctx.clearRect(0, 0, width, height);
      const mid = height * 0.5;
      for (const [index, w] of WAVES.entries()) {
        ctx.beginPath();
        for (let x = 0; x <= width; x += 4) {
          const u = x / width;
          // envelope keeps the edges calm and the center lively
          const envelope = Math.sin(Math.PI * u) ** 1.5;
          const carrier = Math.sin(u * Math.PI * 2 * w.freq + time * w.speed * 2 + index);
          const modulation = 0.6 + 0.4 * Math.sin(u * Math.PI * 3 + time * 0.7 + index * 1.7);
          const y = mid + carrier * modulation * envelope * w.amp * height;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(${w.color},${w.alpha})`;
        ctx.lineWidth = w.width;
        ctx.shadowBlur = 12;
        ctx.shadowColor = `rgba(${w.color},0.8)`;
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
      // sampling grid
      ctx.fillStyle = "rgba(0,200,255,0.12)";
      for (let x = 0; x < width; x += 32) ctx.fillRect(x, mid - 0.5, 1, 1);
    },
    [reduced],
  );

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
    />
  );
}
