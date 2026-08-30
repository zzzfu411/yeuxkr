import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type InlineAlertTone = "error" | "success";

const toneClasses: Record<InlineAlertTone, string> = {
  error: "border-[color-mix(in_srgb,var(--seal)_56%,var(--line))] bg-[color-mix(in_srgb,var(--seal)_9%,var(--paper-hi))] text-[var(--cinnabar)]",
  success: "border-[color-mix(in_srgb,var(--green)_42%,var(--line))] bg-[color-mix(in_srgb,var(--green)_8%,var(--paper-hi))] text-[var(--celadon-text)]"
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
      className={cn("rounded-[var(--radius)] border px-3 py-2.5 text-sm font-normal leading-6 shadow-paper-sm", toneClasses[tone], className)}
    >
      {children}
    </p>
  );
}
