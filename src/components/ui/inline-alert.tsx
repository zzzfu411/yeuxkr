import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type InlineAlertTone = "error" | "success";

const toneClasses: Record<InlineAlertTone, string> = {
  error: "border-[3px] border-[var(--border)] bg-[var(--seal-soft)] text-[var(--cinnabar)] shadow-[3px_3px_0_var(--shadow-color)]",
  success: "border-[3px] border-[var(--border)] bg-[var(--green-soft)] text-[var(--celadon)] shadow-[3px_3px_0_var(--shadow-color)]"
};

export function InlineAlert({
  children,
  className,
  tone = "error"
}: {
  children: ReactNode;
  className?: string;
  tone?: InlineAlertTone;
}) {
  return (
    <p
      role="alert"
      aria-live="polite"
      className={cn("rounded-none p-3 text-sm font-bold leading-6", toneClasses[tone], className)}
    >
      {children}
    </p>
  );
}
