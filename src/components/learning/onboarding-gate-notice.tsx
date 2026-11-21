"use client";

import Link from "@/components/learning/studio-link";
import { needsOnboardingFunnel } from "@/lib/learning/compass";
import { useLearningWorkspace } from "@/lib/learning/use-learning-workspace";

export function OnboardingGateNotice({ copy }: { copy?: string } = {}) {
  const { workspace } = useLearningWorkspace();
  if (!needsOnboardingFunnel(workspace.profile, workspace.progress)) return null;
  return (
    <div className="flex items-center gap-3 rounded-none border border-[var(--border)] bg-[var(--yellow-soft)] p-3 text-sm leading-6 text-[var(--brass)]">
      <span className="min-w-0 flex-1">{copy ?? "先完成三分钟入门。确认发音和韩文输入后，练习才会计入学习进度。"}</span>
      <Link href="/onboarding" className="focus-ring inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center underline decoration-2 underline-offset-2">
        去入门
      </Link>
    </div>
  );
}
