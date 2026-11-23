import { cn } from "@/lib/utils";

/** Static design study of a Mission Log quest card. */
export default function QuestCardMockup() {
  const progress = 3;
  const target = 4;
  return (
    <div className="grid min-h-dvh place-items-center p-8">
      <article className="w-80 rounded-2xl border border-nexus-cyan/25 bg-[rgba(14,19,40,0.6)] p-4 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)] backdrop-blur-xl">
        <p className="text-[0.6rem] font-bold tracking-[0.25em] text-nexus-cyan">EPIC · MONTHLY ARC</p>
        <h3 className="mt-1 text-lg font-semibold">Ship the mobile companion</h3>
        <div className="mt-4 flex gap-1">
          {Array.from({ length: target }, (_, i) => (
            <span
              key={i}
              className={cn(
                "h-3 flex-1 rounded-[3px]",
                i < progress ? "bg-nexus-cyan shadow-[0_0_10px_#00c8ff]" : "bg-white/10",
              )}
            />
          ))}
        </div>
        <p className="mt-2 font-mono text-xs text-slate-400">
          {progress} / {target} · {Math.round((progress / target) * 100)}%
        </p>
      </article>
    </div>
  );
}
