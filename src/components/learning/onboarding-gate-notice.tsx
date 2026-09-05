"use client";

import Link from "next/link";
import { needsOnboardingFunnel } from "@/lib/learning/compass";
import { useLearningWorkspace } from "@/lib/learning/use-learning-workspace";

export function OnboardingGateNotice({ copy }: { copy?: string } = {}) {
  const { workspace } = useLearningWorkspace();
  if (!needsOnboardingFunnel(workspace.profile, workspace.progress)) return null;
  return (
    <div className="rounded-none border border-[var(--border)] bg-[var(--yellow-soft)] p-3 text-sm font-bold leading-6 text-[var(--brass)]">
      {copy ?? "先完成三分钟入门。确认发音和韩文输入后，练习才会计入学习进度。"}
      <Link href="/onboarding" className="ml-2 underline decoration-2 underline-offset-2">
        去入门
      </Link>
    </div>
  );
}
