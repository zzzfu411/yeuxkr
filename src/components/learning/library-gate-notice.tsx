"use client";

import Link from "next/link";
import { getLibraryGateForLesson, type LibraryCounts } from "@/lib/learning/path-gates";
import { libraryCountsForWrite, useLearningWorkspace } from "@/lib/learning/workspace";

export function LibraryGateNotice({ focus }: { focus?: keyof LibraryCounts } = {}) {
  const { workspace } = useLearningWorkspace();
  if (!workspace.nextLesson) return null;
  const gate = getLibraryGateForLesson(workspace.nextLesson, libraryCountsForWrite(workspace.progress));
  if (gate.ok || !gate.missing.length) return null;
  const ordered = focus
    ? [...gate.missing.filter((gap) => gap.key === focus), ...gate.missing.filter((gap) => gap.key !== focus)]
    : gate.missing;
  return (
    <div className="rounded-none border border-[var(--border)] bg-[var(--yellow-soft)] p-3 text-sm font-bold leading-6 text-[var(--brass)]">
      主线下一课「{workspace.nextLesson.title}」还差
      {ordered.map((gap) => `${gap.label} ${gap.current}/${gap.target}`).join("、")}
      。先补库，练习才写入核心路径。
      <span className="mt-2 flex flex-wrap gap-2">
        {ordered.map((gap) => (
          <Link key={gap.key} href={gap.href} className="underline decoration-2 underline-offset-2">
            去{gap.label}
          </Link>
        ))}
      </span>
    </div>
  );
}
