"use client";

import { useState } from "react";
import { Languages } from "lucide-react";
import type { UserProfile } from "@/lib/learning/types";

export function RomanizationText({
  text,
  preference,
  scaffold = false,
  className = ""
}: {
  text?: string;
  preference: UserProfile["romanization"];
  scaffold?: boolean;
  className?: string;
}) {
  const [revealed, setRevealed] = useState(false);

  if (!text || preference === "hidden") return null;
  if (preference === "always" || scaffold) return <span className={className}>{text}</span>;

  return (
    <span className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        className="focus-ring inline-flex min-h-9 items-center gap-1.5 rounded-none border border-[var(--line)] bg-[var(--surface-solid)] px-2.5 text-xs font-black text-[var(--ocean)]"
        aria-expanded={revealed}
        onClick={() => setRevealed((value) => !value)}
      >
        <Languages className="h-3.5 w-3.5" aria-hidden="true" />
        {revealed ? "收起读音提示" : "显示读音提示"}
      </button>
      {revealed ? <span className={className}>{text}</span> : null}
    </span>
  );
}
