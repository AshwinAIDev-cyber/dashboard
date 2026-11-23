import { RefreshCw, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface SignalLostProps {
  title?: string;
  message: string;
  hint?: string;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
}

/** Static-noise panel shown when an integration is offline. */
export function SignalLost({ title = "SIGNAL LOST", message, hint, onRetry, retrying, className }: SignalLostProps) {
  return (
    <div
      role="status"
      className={cn(
        "relative flex flex-col items-center justify-center overflow-hidden rounded-xl border border-nexus-red/25 bg-obsidian-950/60 px-6 py-10 text-center",
        className,
      )}
    >
      <div aria-hidden className="signal-noise pointer-events-none absolute -inset-10 opacity-[0.07]" />
      <WifiOff className="relative h-8 w-8 text-nexus-red animate-flicker" />
      <p className="hud-title relative mt-3 text-sm text-glow-red">{title}</p>
      <p className="relative mt-2 max-w-sm text-sm text-ink-dim">{message}</p>
      {hint && <p className="relative mt-1 max-w-sm font-[Share_Tech_Mono] text-xs text-ink-faint">{hint}</p>}
      {onRetry && (
        <button type="button" onClick={onRetry} disabled={retrying} className="nexus-btn relative mt-5">
          <RefreshCw className={cn("h-3.5 w-3.5", retrying && "animate-spin")} />
          {retrying ? "Re-scanning" : "Re-scan"}
        </button>
      )}
    </div>
  );
}
