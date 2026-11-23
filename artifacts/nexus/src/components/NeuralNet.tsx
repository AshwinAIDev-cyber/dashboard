import { useMemo, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { useCanvasLoop } from "@/hooks/use-animation-frame";
import { cn, seededRandom } from "@/lib/utils";

interface Node {
  x: number;
  y: number;
  layer: number;
  phase: number;
}

interface Pulse {
  edge: number;
  t: number;
  speed: number;
}

/**
 * Layered neural-network visualization. Pulses travel along synapses; when
 * `active` (FRIDAY is thinking) they fire faster and brighter.
 */
export function NeuralNet({ active, className }: { active: boolean; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const activity = useRef(0);
  const pulses = useRef<Pulse[]>([]);

  const graph = useMemo(() => {
    const rand = seededRandom(1337);
    const layers = [4, 6, 7, 6, 4];
    const nodes: Node[] = [];
    layers.forEach((count, layer) => {
      for (let i = 0; i < count; i++) {
        nodes.push({
          x: (layer + 0.5) / layers.length,
          y: (i + 0.5) / count + (rand() - 0.5) * 0.08,
          layer,
          phase: rand() * Math.PI * 2,
        });
      }
    });
    const edges: [number, number][] = [];
    nodes.forEach((a, ai) => {
      nodes.forEach((b, bi) => {
        if (b.layer === a.layer + 1 && rand() < 0.55) edges.push([ai, bi]);
      });
    });
    return { nodes, edges };
  }, []);

  useCanvasLoop(
    canvasRef,
    (ctx, { width, height }, t, dt) => {
      activity.current += ((active ? 1 : 0) - activity.current) * Math.min(dt * 2.5, 1);
      const a = activity.current;
      const padX = 18;
      const padY = 10;
      const px = (n: Node) => padX + n.x * (width - padX * 2);
      const py = (n: Node, time: number) => padY + n.y * (height - padY * 2) + Math.sin(time * 0.8 + n.phase) * 2.5;
      const time = reduced ? 0 : t;

      ctx.clearRect(0, 0, width, height);

      // synapses
      ctx.lineWidth = 0.8;
      for (const [ai, bi] of graph.edges) {
        const n1 = graph.nodes[ai]!;
        const n2 = graph.nodes[bi]!;
        ctx.strokeStyle = `rgba(168,85,247,${0.08 + a * 0.12})`;
        ctx.beginPath();
        ctx.moveTo(px(n1), py(n1, time));
        ctx.lineTo(px(n2), py(n2, time));
        ctx.stroke();
      }

      // spawn pulses
      if (!reduced) {
        const rate = 1.2 + a * 14;
        if (Math.random() < rate * dt) {
          pulses.current.push({
            edge: Math.floor(Math.random() * graph.edges.length),
            t: 0,
            speed: 0.7 + Math.random() * 0.8 + a * 1.2,
          });
        }
      }

      // pulses
      pulses.current = pulses.current.filter((p) => p.t <= 1);
      for (const p of pulses.current) {
        p.t += p.speed * dt;
        const [ai, bi] = graph.edges[p.edge]!;
        const n1 = graph.nodes[ai]!;
        const n2 = graph.nodes[bi]!;
        const x = px(n1) + (px(n2) - px(n1)) * p.t;
        const y = py(n1, time) + (py(n2, time) - py(n1, time)) * p.t;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, 6);
        grad.addColorStop(0, a > 0.5 ? "rgba(255,255,255,0.95)" : "rgba(0,200,255,0.9)");
        grad.addColorStop(1, "rgba(0,200,255,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      // neurons
      for (const n of graph.nodes) {
        const glow = 0.5 + 0.5 * Math.sin(time * (1.5 + a * 4) + n.phase);
        const r = 2.2 + glow * (0.8 + a * 1.4);
        ctx.fillStyle =
          n.layer === 2 ? `rgba(168,85,247,${0.55 + glow * 0.45})` : `rgba(0,200,255,${0.45 + glow * 0.45})`;
        ctx.shadowBlur = 8 + a * 10;
        ctx.shadowColor = n.layer === 2 ? "#a855f7" : "#00c8ff";
        ctx.beginPath();
        ctx.arc(px(n), py(n, time), r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    },
    [active, reduced, graph],
  );

  return <canvas ref={canvasRef} aria-hidden className={cn("h-full w-full", className)} />;
}
