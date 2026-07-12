import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type InlineAlertTone = "error" | "success";

const toneClasses: Record<InlineAlertTone, string> = {
  error: "border-[rgba(185,78,60,0.45)] bg-[rgba(185,78,60,0.08)] text-[var(--cinnabar)]",
  success: "border-[rgba(79,140,118,0.45)] bg-[rgba(79,140,118,0.1)] text-[var(--celadon)]"
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
      className={cn("rounded-[8px] border p-3 text-sm font-bold leading-6", toneClasses[tone], className)}
    >
      {children}
    </p>
  );
}
