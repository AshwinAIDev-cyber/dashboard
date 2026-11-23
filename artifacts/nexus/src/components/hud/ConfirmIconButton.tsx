import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ConfirmIconButtonProps {
  icon: ReactNode;
  label: string;
  confirmLabel?: string;
  onConfirm: () => void;
  className?: string;
  disabled?: boolean;
}

/**
 * Two-step destructive button: first click arms it (turns red with a label),
 * second click within 3s confirms. Escape or blur disarms.
 */
export function ConfirmIconButton({
  icon,
  label,
  confirmLabel = "Confirm",
  onConfirm,
  className,
  disabled,
}: ConfirmIconButtonProps) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(timer);
  }, [armed]);

  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={armed ? `${confirmLabel}: ${label}` : label}
      title={armed ? "Click again to confirm" : label}
      onClick={(e) => {
        e.stopPropagation();
        if (armed) {
          setArmed(false);
          onConfirm();
        } else {
          setArmed(true);
        }
      }}
      onBlur={() => setArmed(false)}
      onKeyDown={(e) => e.key === "Escape" && setArmed(false)}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2 text-ink-faint transition-colors",
        armed
          ? "border-nexus-red/60 bg-nexus-red/15 text-nexus-red"
          : "border-transparent hover:border-nexus-red/30 hover:bg-nexus-red/10 hover:text-nexus-red",
        className,
      )}
    >
      {icon}
      <AnimatePresence initial={false}>
        {armed && (
          <motion.span
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: "auto", opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="overflow-hidden whitespace-nowrap font-[Orbitron] text-[0.58rem] font-bold tracking-[0.18em]"
          >
            {confirmLabel.toUpperCase()}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
