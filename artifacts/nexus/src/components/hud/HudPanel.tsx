import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface HudPanelProps {
  children: ReactNode;
  className?: string;
  title?: ReactNode;
  kicker?: ReactNode;
  actions?: ReactNode;
  strong?: boolean;
  brackets?: boolean;
  bodyClassName?: string;
  as?: "section" | "div" | "aside";
  "aria-label"?: string;
}

/** Frosted glass panel with optional HUD title bar and corner brackets. */
export function HudPanel({
  children,
  className,
  title,
  kicker,
  actions,
  strong,
  brackets = true,
  bodyClassName,
  as: Tag = "section",
  ...rest
}: HudPanelProps) {
  return (
    <Tag
      className={cn(
        strong ? "nexus-glass-strong" : "nexus-glass",
        brackets && "hud-bracket",
        "relative rounded-2xl",
        className,
      )}
      {...rest}
    >
      {(title || actions || kicker) && (
        <header className="flex items-start justify-between gap-3 border-b border-white/[0.06] px-5 pb-3 pt-4">
          <div className="min-w-0">
            {kicker && <p className="hud-label">{kicker}</p>}
            {title && <h2 className="hud-title mt-1 truncate text-sm text-ink">{title}</h2>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
        </header>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </Tag>
  );
}
