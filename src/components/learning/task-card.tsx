import Link from "next/link";
import { ArrowRight, Check, Clock3 } from "lucide-react";
import { VisualPanel } from "@/components/assets/visual-panel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ABILITY_LABELS } from "@/lib/learning/workspace";
import type { DisplayVisualAssetId } from "@/data/visuals/assets";
import type { StudyTask } from "@/lib/learning/types";

const kindLabel: Record<StudyTask["kind"], string> = {
  review: "复习",
  lesson: "课程",
  hangul: "韩文",
  vocabulary: "词汇",
  grammar: "语法",
  native: "表达",
  quiz: "测验",
  checkpoint: "规划",
  immersion: "材料"
};

const kindAsset: Record<StudyTask["kind"], DisplayVisualAssetId> = {
  review: "review",
  lesson: "lesson",
  hangul: "hangul",
  vocabulary: "vocabulary",
  grammar: "grammar",
  native: "native",
  quiz: "quiz",
  checkpoint: "selfStudy",
  immersion: "immersion"
};

const compactObjectPosition: Record<StudyTask["kind"], string> = {
  review: "center",
  lesson: "58% 46%",
  hangul: "58% 48%",
  vocabulary: "56% 48%",
  grammar: "58% 48%",
  native: "60% 48%",
  quiz: "62% 52%",
  checkpoint: "72% 48%",
  immersion: "64% 52%"
};

export function TaskCard({
  task,
  featured = false,
  compact = false
}: {
  task: StudyTask;
  featured?: boolean;
  compact?: boolean;
}) {
  const asset = task.completed ? task.completionAsset ?? "complete" : kindAsset[task.kind];
  if (compact) {
    return (
      <article
        className={cn(
          "group grid min-h-36 min-w-0 overflow-hidden rounded-[8px] border transition hover:-translate-y-0.5 hover:shadow-paper-sm md:grid-cols-[minmax(0,1fr)_6.75rem]",
          task.completed
            ? "border-[rgba(79,140,118,0.42)] bg-[rgba(79,140,118,0.11)]"
            : "border-[var(--line)] bg-[rgba(255,250,240,0.62)]"
        )}
      >
        <div className="flex min-w-0 flex-col p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-[8px] border border-[var(--line)] bg-[rgba(255,250,240,0.78)] px-2 py-1 font-mono text-[0.66rem] font-black uppercase text-[var(--muted)]">
              {kindLabel[task.kind]}
            </span>
            {task.lane ? (
              <span className="rounded-[8px] bg-[rgba(23,63,115,0.08)] px-2 py-1 font-mono text-[0.66rem] font-black uppercase text-[var(--ocean)]">
                {task.lane}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1 font-mono text-xs font-black text-[var(--muted)]">
              <Clock3 className="h-3.5 w-3.5" />
              {task.minutes} min
            </span>
            {task.completed ? (
              <span className="inline-flex items-center gap-1 font-mono text-xs font-black text-[var(--celadon)]">
                <Check className="h-3.5 w-3.5" />
                {task.completionLabel ?? "今日已完成"}
              </span>
            ) : null}
          </div>
          <h3 className="mt-2 font-serif text-xl font-black leading-tight">{task.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm font-bold leading-6 text-[var(--muted)]">{task.detail}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {task.ability.slice(0, 3).map((ability) => (
              <span key={ability} className="rounded-[8px] bg-[rgba(23,63,115,0.08)] px-2 py-1 text-[0.7rem] font-bold text-[var(--ocean)]">
                {ABILITY_LABELS[ability]}
              </span>
            ))}
          </div>
          <Button asChild variant="primary" size="icon" className="mt-auto self-end">
            <Link href={task.href} aria-label={`打开${task.title}`}>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <VisualPanel
          asset={asset}
          treatment="inset"
          decorative
          objectPosition={compactObjectPosition[task.kind]}
          sizes="(max-width: 768px) 100vw, 7rem"
          className="order-first min-h-24 rounded-none border-0 md:order-none md:min-h-full"
        />
      </article>
    );
  }

  return (
    <article
      className={cn(
        "surface grid min-h-48 overflow-hidden transition hover:-translate-y-0.5 hover:shadow-editorial",
        task.completed && "border-[rgba(79,140,118,0.42)] bg-[rgba(79,140,118,0.11)]",
        featured ? "md:grid-cols-[minmax(0,1fr)_13rem]" : "sm:grid-cols-[minmax(0,1fr)_8.5rem]"
      )}
    >
      <div className="relative z-10 flex min-h-48 flex-col p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-[8px] border border-[var(--line)] bg-[rgba(255,250,240,0.78)] px-2.5 py-1 font-mono text-[0.68rem] font-black uppercase text-[var(--muted)]">
            {kindLabel[task.kind]}
          </span>
          {task.lane ? (
            <span className="rounded-[8px] bg-[rgba(23,63,115,0.08)] px-2.5 py-1 font-mono text-[0.68rem] font-black uppercase text-[var(--ocean)]">
              {task.lane}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1 font-mono text-xs font-black text-[var(--muted)]">
            <Clock3 className="h-3.5 w-3.5" />
            {task.minutes} min
          </span>
          {task.completed ? (
            <span className="inline-flex items-center gap-1 font-mono text-xs font-black text-[var(--celadon)]">
              <Check className="h-3.5 w-3.5" />
              {task.completionLabel ?? "今日已完成"}
            </span>
          ) : null}
        </div>
        <h3 className="mt-3 font-serif text-2xl font-black leading-tight">{task.title}</h3>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{task.detail}</p>
        {task.reason ? <p className="mt-2 text-xs font-bold leading-5 text-[var(--muted)]">{task.reason}</p> : null}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {task.ability.map((ability) => (
            <span key={ability} className="rounded-[8px] bg-[rgba(23,63,115,0.08)] px-2 py-1 text-xs font-bold text-[var(--ocean)]">
              {ABILITY_LABELS[ability]}
            </span>
          ))}
        </div>
        <Button asChild variant="primary" size="sm" className="mt-auto w-fit self-end">
          <Link href={task.href}>
            打开
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
      <VisualPanel
        asset={asset}
        treatment="inset"
        decorative
        overlay={featured ? "bottom" : "left"}
        sizes={featured ? "(max-width: 768px) 100vw, 13rem" : "(max-width: 640px) 100vw, 8.5rem"}
        className={cn("order-first min-h-28 rounded-none border-0 sm:order-none sm:min-h-full", featured && "md:min-h-full")}
      />
    </article>
  );
}
