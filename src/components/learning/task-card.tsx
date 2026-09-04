import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { KIND_LABEL, taskGlyph } from "@/lib/learning/player";
import type { StudyTask } from "@/lib/learning/types";

const laneLabels: Record<string, string> = {
  self: "自学",
  core: "主线",
  bridge: "衔接",
  expansion: "拓展"
};

export function TaskCard({
  task,
  featured = false,
  compact = false,
  index
}: {
  task: StudyTask;
  featured?: boolean;
  compact?: boolean;
  index?: number;
}) {
  const glyph = taskGlyph(task);
  const order = String(index ?? "").padStart(2, "0");

  return (
    <article className={cn("pl-item", task.completed && "is-done", featured && "is-featured")}>
      <span className="font-mono text-[0.7rem] font-black text-[var(--fade)]">{order || "·"}</span>
      <span className="pl-cover hangul-display" aria-hidden="true">{glyph}</span>
      <div className="min-w-0 py-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[0.66rem] font-black uppercase text-[var(--ocean)]">{KIND_LABEL[task.kind]}</span>
          {task.lane ? <span className="font-mono text-[0.66rem] font-black uppercase text-[var(--muted)]">{laneLabels[task.lane] ?? task.lane}</span> : null}
          {task.completed ? (
            <span className="inline-flex items-center gap-1 font-mono text-xs font-black text-[var(--celadon)]">
              <Check className="h-3.5 w-3.5" />
              {task.completionLabel ?? "今日已完成"}
            </span>
          ) : null}
        </div>
        <h3 className={cn("line-clamp-2 break-words font-serif font-black leading-tight", compact ? "text-lg" : "text-xl")}>{task.title}</h3>
        <p className={cn("line-clamp-2 font-bold text-[var(--muted)]", compact ? "text-xs leading-5" : "text-sm leading-5")}>{task.detail}</p>
        {featured && task.reason ? <p className="mt-1 line-clamp-2 text-xs font-bold leading-5 text-[var(--muted)]">{task.reason}</p> : null}
      </div>
      <span className="hidden font-mono text-xs font-black text-[var(--muted)] sm:inline">{task.minutes} 分钟</span>
      <Link href={task.href} className="pl-play" aria-label={`打开${task.title}`}>
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </article>
  );
}
