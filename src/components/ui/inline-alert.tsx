import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type InlineAlertTone = "error" | "success";

const toneClasses: Record<InlineAlertTone, string> = {
  error: "border-[var(--danger-border)] bg-[var(--danger-soft)] text-[var(--danger-ink)]",
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
      role={tone === "error" ? "alert" : "status"}
      aria-live={tone === "error" ? "assertive" : "polite"}
      className={cn("rounded-[var(--radius)] border px-3 py-2.5 text-sm font-normal leading-6 shadow-paper-sm", toneClasses[tone], className)}
    >
      {children}
    </p>
  );
}
