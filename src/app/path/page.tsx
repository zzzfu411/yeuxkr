"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpenCheck, Check, ChevronsDown, ClipboardCheck, Layers3, LockKeyhole, MapPinned } from "lucide-react";
import { LearningCompass } from "@/components/learning/learning-compass";
import { Button } from "@/components/ui/button";
import { ModuleHero, PageHeader, SectionHeading, Surface } from "@/components/ui/section";
import { getLessonPrerequisites, getMilestoneProgress, isLessonMastered, isLessonUnlocked, lessons, milestones, UNLOCK_SCORE } from "@/data/curriculum";
import { nativeRoadmapPrinciples, nativeRoadmapStages } from "@/data/native-roadmap";
import { proficiencyLevels, proficiencyMetrics } from "@/data/proficiency";
import { useLearningWorkspace } from "@/lib/learning/workspace";

export default function PathPage() {
  const { workspace } = useLearningWorkspace();
  const [showAllStages, setShowAllStages] = useState(false);
  const [focusedMilestoneId, setFocusedMilestoneId] = useState<string | null>(null);
  const completedIds = new Set(workspace.progress.completedLessons);
  const scores = workspace.progress.lessonScores;
  const milestoneProgressById = new Map(milestones.map((milestone: any) => [
    milestone.id,
    getMilestoneProgress(milestone.id, completedIds, scores, workspace.proficiency.evidence)
  ]));
  const nextLessonId = workspace.nextLesson?.id;
  const currentMilestoneId = workspace.nextLesson?.milestone ?? milestones.find((milestone: any) => {
    return lessons
      .filter((lesson: any) => lesson.milestone === milestone.id)
      .some((lesson: any) => !isLessonMastered(lesson.id, completedIds, scores));
  })?.id ?? milestones.at(-1)?.id;
  const currentMilestoneIndex = Math.max(0, milestones.findIndex((milestone: any) => milestone.id === currentMilestoneId));
  const focusedMilestone = milestones.find((milestone: any) => milestone.id === focusedMilestoneId) ?? null;
  const visibleMilestones = useMemo(() => {
    if (focusedMilestoneId) return milestones.filter((milestone: any) => milestone.id === focusedMilestoneId);
    if (showAllStages) return milestones;
    const ids = new Set([
      milestones[Math.max(0, currentMilestoneIndex - 1)]?.id,
      milestones[currentMilestoneIndex]?.id,
      milestones[Math.min(milestones.length - 1, currentMilestoneIndex + 1)]?.id
    ].filter(Boolean));
    return milestones.filter((milestone: any) => ids.has(milestone.id));
  }, [currentMilestoneIndex, focusedMilestoneId, showAllStages]);

  const focusMilestone = (milestoneId: string) => {
    setFocusedMilestoneId(milestoneId);
    setShowAllStages(false);
    window.setTimeout(() => {
      const target = document.getElementById("core-queue");
      if (!target) return;
      target.focus({ preventScroll: true });
      const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
      target.scrollIntoView({ block: "start", behavior: reduceMotion ? "auto" : "smooth" });
    }, 0);
  };

  const showFullRoute = () => {
    setFocusedMilestoneId(null);
    setShowAllStages((value) => !value);
  };

  const showCurrentWindow = () => {
    setFocusedMilestoneId(null);
    setShowAllStages(false);
  };

  const coreQueueTitle = focusedMilestone ? `${focusedMilestone.title}课程窗口` : showAllStages ? `${lessons.length} 节核心课轨道` : "当前路线窗口";
  const coreQueueCopy = focusedMilestone
    ? "正在只显示这一阶段的核心课程，适合从阶段概览直接落到可执行课表。需要重新看当前位置或全路线时，可以随时切换。"
    : showAllStages
      ? "课程按阶段串成一条可推进的路线。节点会显示当前建议、已达标和建议先修状态。"
      : "默认只展示当前阶段和相邻阶段，让学习者先看清下一步；需要全局盘点时再展开完整路线。";

  return (
    <div className="grid gap-6">
      <PageHeader
        kicker="Learning Path"
        title="路径不是目录，而是能力迁移地图。"
        copy={`这条路线从韩文字母、声音、基础句型，逐步走向真实材料、语气距离和母语者表达。课程需要上一课达到 ${UNLOCK_SCORE}% 才建议推进；自由学习时也会保留先修提示。`}
        compact
      />

      <ModuleHero
        kicker="From 0 to Native Layer"
        title="五阶段能力路线。"
        copy={`当前路径包含 ${lessons.length} 节核心课。课程完成记录学习投入，能力验收则检查材料、输出和关卡证据；两者都达标，阶段才算真正通过。`}
        asset="path"
      >
        {workspace.nextLesson ? (
          <Button asChild>
            <Link href={`/learn/${workspace.nextLesson.id}`}>
              <MapPinned className="h-4 w-4" />
              继续当前建议课
            </Link>
          </Button>
        ) : null}
      </ModuleHero>

      <section className="grid gap-3" aria-labelledby="stage-progress-title">
        <h2 id="stage-progress-title" className="sr-only">阶段课程与能力验收进度</h2>
        <div className="nav-scroll -mx-4 grid auto-cols-[17rem] grid-flow-col gap-3 overflow-x-auto px-4 pb-2 lg:mx-0 lg:grid-flow-row lg:grid-cols-5 lg:px-0">
        {milestones.map((milestone: any, index: number) => {
          const stageProgress = milestoneProgressById.get(milestone.id);
          if (!stageProgress) return null;
          const isCurrentStage = milestone.id === currentMilestoneId;
          const isFocusedStage = milestone.id === focusedMilestoneId;
          const stageStatus = stageProgress.complete
            ? "阶段已验收"
            : stageProgress.course.complete
              ? "课程完成，待验收"
              : "课程推进中";
          return (
            <article
              key={milestone.id}
              aria-labelledby={`stage-${milestone.id}-title`}
              className={`relative overflow-hidden rounded-[8px] border p-4 ${
                isFocusedStage
                  ? "border-[rgba(23,63,115,0.62)] bg-[rgba(23,63,115,0.1)]"
                  : isCurrentStage
                  ? "border-[rgba(183,135,63,0.58)] bg-[rgba(183,135,63,0.11)]"
                  : stageProgress.complete
                    ? "border-[rgba(79,140,118,0.38)] bg-[rgba(79,140,118,0.1)]"
                    : "border-[var(--line)] bg-[rgba(255,250,240,0.64)]"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <span className="font-mono text-xs font-black uppercase text-[var(--muted)]">Stage {String(index + 1).padStart(2, "0")}</span>
                <span className={`rounded-[8px] px-2 py-1 text-xs font-black ${
                  stageProgress.complete
                    ? "bg-[rgba(79,140,118,0.14)] text-[var(--celadon)]"
                    : stageProgress.course.complete
                      ? "bg-[rgba(183,135,63,0.16)] text-[var(--brass)]"
                      : "bg-[rgba(23,63,115,0.08)] text-[var(--ocean)]"
                }`}>{stageStatus}</span>
              </div>
              <span className="mt-2 block font-mono text-xs font-black uppercase text-[var(--ocean)]">{milestone.range}</span>
              <h3 id={`stage-${milestone.id}-title`} className="mt-1 font-serif text-2xl font-black leading-tight">{milestone.title}</h3>
              <p className="mt-2 text-sm font-bold leading-6 text-[var(--muted)]">{milestone.outcome}</p>
              <StageProgressSummary progress={stageProgress} />
              <div className="mt-3 flex flex-wrap gap-1.5">
                {milestone.modules.slice(0, 3).map((item: string) => (
                  <span key={item} className="rounded-[8px] bg-[rgba(23,63,115,0.08)] px-2 py-1 text-xs font-bold text-[var(--ocean)]">
                    {item}
                  </span>
                ))}
              </div>
              {isCurrentStage ? (
                <div className="mt-3 rounded-[8px] border border-[rgba(183,135,63,0.34)] bg-[rgba(255,250,240,0.58)] px-2 py-1 font-mono text-xs font-black uppercase text-[var(--brass)]">
                  当前路线窗口
                </div>
              ) : null}
              <Button
                type="button"
                variant={isFocusedStage ? "primary" : "secondary"}
                size="sm"
                className="mt-3 w-full"
                aria-controls="core-queue"
                aria-pressed={isFocusedStage}
                aria-label={isFocusedStage ? `正在查看${milestone.title}课程` : `查看${milestone.title}课程`}
                onClick={() => focusMilestone(milestone.id)}
              >
                <MapPinned className="h-4 w-4" />
                {isFocusedStage ? "正在查看本阶段" : "查看本阶段课程"}
              </Button>
            </article>
          );
        })}
        </div>
      </section>

      <div id="core-queue" className="scroll-mt-40 lg:scroll-mt-28" tabIndex={-1}>
      <Surface variant="plain">
        <SectionHeading
          kicker="Core Queue"
          title={coreQueueTitle}
          copy={coreQueueCopy}
          action={
            <div className="flex flex-wrap gap-2">
              {focusedMilestone ? (
                <Button type="button" variant="ghost" size="sm" onClick={showCurrentWindow}>
                  当前窗口
                </Button>
              ) : null}
              <Button type="button" variant="secondary" size="sm" onClick={showFullRoute}>
                <ChevronsDown className="h-4 w-4" />
                {showAllStages && !focusedMilestone ? "收起路线窗口" : "展开全部课程"}
              </Button>
            </div>
          }
        />
        <div className="grid gap-5">
          {visibleMilestones.map((milestone: any) => {
            const milestoneIndex = milestones.findIndex((item: any) => item.id === milestone.id);
            const milestoneLessons = lessons.filter((lesson: any) => lesson.milestone === milestone.id);
            const stageProgress = milestoneProgressById.get(milestone.id);
            if (!stageProgress) return null;
            return (
              <article
                key={milestone.id}
                className="grid gap-4 border-t border-[var(--line)] py-5 first:border-t-0 first:pt-0 lg:grid-cols-[13rem_minmax(0,1fr)]"
              >
                <div className="lg:sticky lg:top-24 lg:self-start">
                  <span className="font-mono text-xs font-black uppercase text-[var(--ocean)]">
                    Stage {String(milestoneIndex + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-2 font-serif text-2xl font-black leading-tight">{milestone.title}</h3>
                  <p className="mt-2 text-sm font-bold leading-6 text-[var(--muted)]">{milestone.range}</p>
                  <StageProgressSummary progress={stageProgress} expanded />
                </div>

                <div className="relative grid gap-3">
                  <div className="absolute bottom-6 left-5 top-6 hidden w-px bg-[rgba(23,63,115,0.18)] md:block" />
                  {milestoneLessons.map((lesson: any) => {
                    const mastered = isLessonMastered(lesson.id, completedIds, scores);
                    const unlocked = isLessonUnlocked(lesson.id, completedIds, scores);
                    const prerequisites = getLessonPrerequisites(lesson.id);
                    const missing = prerequisites.filter((item: any) => !isLessonMastered(item.id, completedIds, scores));
                    const isCurrent = nextLessonId === lesson.id;
                    return (
                      <Link
                        key={lesson.id}
                        href={`/learn/${lesson.id}`}
                        className={`focus-ring relative grid gap-3 rounded-[8px] border p-3 transition motion-reduce:transform-none md:grid-cols-[3.5rem_minmax(0,1fr)_9rem] md:items-center ${
                          isCurrent
                            ? "border-[rgba(183,135,63,0.75)] bg-[rgba(183,135,63,0.1)] shadow-paper-sm"
                            : mastered
                              ? "border-[rgba(79,140,118,0.45)] bg-[rgba(79,140,118,0.1)]"
                              : unlocked
                                ? "border-[var(--line)] bg-[rgba(255,250,240,0.68)] hover:-translate-y-0.5 hover:shadow-paper-sm"
                                : "border-[var(--line)] bg-[rgba(255,250,240,0.42)] opacity-80"
                        }`}
                      >
                        <span className={`z-10 grid h-10 w-10 place-items-center rounded-[8px] border font-mono text-xs font-black ${
                          isCurrent
                            ? "border-[rgba(183,135,63,0.56)] bg-[var(--surface-solid)] text-[var(--brass)]"
                            : mastered
                              ? "border-[rgba(79,140,118,0.45)] bg-[var(--surface-solid)] text-[var(--celadon)]"
                              : "border-[rgba(23,63,115,0.16)] bg-[var(--surface-solid)] text-[var(--ocean)]"
                        }`}>
                          {lesson.order}
                        </span>
                        <span className="min-w-0">
                          <span className="block font-serif text-xl font-black leading-tight">{lesson.title}</span>
                          <span className="mt-1 block text-sm leading-6 text-[var(--muted)]">{lesson.subtitle}</span>
                          {!unlocked && missing.length ? (
                            <span className="mt-1 block text-xs font-bold leading-5 text-[var(--muted)]">
                              建议先修：{missing.map((item: any) => item.title).join("、")}
                            </span>
                          ) : null}
                        </span>
                        <span className="flex flex-wrap items-center gap-2 md:justify-end">
                          <StatusBadge mastered={mastered} unlocked={unlocked} current={isCurrent} />
                          <span className="font-mono text-xs font-black uppercase text-[var(--muted)]">{lesson.duration} min</span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
        <div className="mt-4">
          <Button asChild variant="secondary">
            <Link href="/">
              回到工作台
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </Surface>
      </div>

      <LearningCompass workspace={workspace} active="path" condensed />

      <Surface variant="plain">
        <SectionHeading
          kicker="Passport Gates"
          title="阶段验收证据"
          copy={`每个阶段都需要课程、材料、输出和检查点共同证明。最后的母语者作品集是长期扩容方向，不会被 ${lessons.length} 节课伪装成终点。`}
        />
        <div className="grid gap-3 lg:grid-cols-2">
          {proficiencyLevels.map((level: any) => {
            const isCurrent = workspace.proficiency.current.id === level.id;
            const isNext = workspace.proficiency.next?.id === level.id;
            return (
              <article key={level.id} className={`rounded-[8px] border p-4 ${isCurrent ? "border-[rgba(79,140,118,0.55)] bg-[rgba(79,140,118,0.1)]" : isNext ? "border-[rgba(183,135,63,0.6)] bg-[rgba(183,135,63,0.08)]" : "border-[var(--line)] bg-[rgba(255,250,240,0.58)]"}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-xs font-black uppercase text-[var(--ocean)]">{level.band}</span>
                  {isCurrent ? <span className="rounded-[8px] bg-[rgba(79,140,118,0.14)] px-2 py-1 text-xs font-black text-[var(--celadon)]">当前证据</span> : null}
                  {isNext ? <span className="rounded-[8px] bg-[rgba(183,135,63,0.16)] px-2 py-1 text-xs font-black text-[var(--brass)]">下一关</span> : null}
                </div>
                <h3 className="mt-2 font-serif text-2xl font-black">{level.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{level.summary}</p>
                {level.roadmapTargets ? (
                  <div className="mt-3 grid gap-1">
                    {level.roadmapTargets.slice(0, 3).map((item: string) => (
                      <span key={item} className="rounded-[8px] bg-[rgba(23,63,115,0.08)] px-2 py-1 text-xs font-bold text-[var(--ocean)]">{item}</span>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(level.requirements ?? []).slice(0, 5).map((requirement: any) => (
                      <span key={`${level.id}:${requirement.metric}`} className="rounded-[8px] border border-[var(--line)] px-2 py-1 text-xs font-bold">
                        {proficiencyMetrics[requirement.metric] ?? requirement.metric} {requirement.target}
                      </span>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </Surface>

      <Surface variant="plain">
        <SectionHeading
          kicker="Native Roadmap"
          title="母语者路线扩容蓝图"
          copy="当前核心课负责把学习者带到 C1 预备桥接。真正接近母语者需要继续扩充词汇搭配、真实材料、输出作品集和检查点，这里把后续工程拆成可验收的阶段。"
        />
        <div className="grid gap-3 xl:grid-cols-3">
          {nativeRoadmapStages.map((stage, index) => (
            <article key={stage.id} className="grid gap-3 rounded-[8px] border border-[var(--line)] bg-[rgba(255,250,240,0.58)] p-4">
              <div className="flex items-start justify-between gap-3">
                <span className="font-mono text-xs font-black uppercase text-[var(--ocean)]">{stage.band}</span>
                <span className="grid h-9 w-9 place-items-center rounded-[8px] bg-[rgba(23,63,115,0.08)] font-mono text-xs font-black text-[var(--ocean)]">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="font-serif text-2xl font-black leading-tight">{stage.title}</h3>
              <p className="text-sm leading-6 text-[var(--muted)]">{stage.target}</p>
              <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                <RoadmapMetric label="词汇" value={stage.deliverables.vocabulary} />
                <RoadmapMetric label="搭配" value={stage.deliverables.collocations} />
                <RoadmapMetric label="材料" value={stage.deliverables.materials} />
                <RoadmapMetric label="输出" value={stage.deliverables.outputTasks} />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {stage.domains.slice(0, 4).map((domain) => (
                  <span key={domain} className="rounded-[8px] bg-[rgba(23,63,115,0.08)] px-2 py-1 text-xs font-bold text-[var(--ocean)]">
                    {domain}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
        <div className="mt-4 grid gap-2 rounded-[8px] border border-[rgba(183,135,63,0.34)] bg-[rgba(183,135,63,0.08)] p-4 md:grid-cols-[auto_minmax(0,1fr)]">
          <Layers3 className="mt-1 h-5 w-5 text-[var(--brass)]" aria-hidden="true" />
          <div className="grid gap-2">
            {nativeRoadmapPrinciples.map((principle) => (
              <p key={principle} className="text-sm font-bold leading-6 text-[var(--muted)]">{principle}</p>
            ))}
          </div>
        </div>
      </Surface>
    </div>
  );
}

function RoadmapMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[8px] border border-[var(--line)] bg-[var(--surface-solid)] p-2">
      <strong className="block font-mono text-sm font-black">{value.toLocaleString()}</strong>
      <span className="text-[var(--muted)]">{label}</span>
    </div>
  );
}

type StageProgress = {
  course: { completed: number; total: number; progress: number; complete: boolean };
  acceptance: {
    band: string;
    met: number;
    total: number;
    progress: number;
    complete: boolean;
    requirements: Array<{ metric: string; label: string; current: number; target: number; met: boolean }>;
  };
  complete: boolean;
};

const proofMetrics = new Set(["materials", "outputs", "checkpoints", "capstone"]);

function StageProgressSummary({ progress, expanded = false }: { progress: StageProgress; expanded?: boolean }) {
  const proofRequirements = progress.acceptance.requirements.filter((requirement) => proofMetrics.has(requirement.metric));
  const visibleRequirements = expanded
    ? progress.acceptance.requirements
    : proofRequirements.length
      ? proofRequirements
      : progress.acceptance.requirements.slice(0, 2);

  return (
    <div className="mt-4 grid gap-3">
      <StageProgressBar
        icon={<BookOpenCheck className="h-3.5 w-3.5" aria-hidden="true" />}
        label="课程完成"
        value={progress.course.progress}
        detail={`${progress.course.completed}/${progress.course.total} 节达标`}
        color="bg-[var(--ocean)]"
      />
      <StageProgressBar
        icon={<ClipboardCheck className="h-3.5 w-3.5" aria-hidden="true" />}
        label="能力验收"
        value={progress.acceptance.progress}
        detail={`${progress.acceptance.met}/${progress.acceptance.total} 项通过${progress.acceptance.band ? ` · ${progress.acceptance.band}` : ""}`}
        color="bg-[var(--celadon)]"
      />
      {visibleRequirements.length ? (
        <div>
          <span className="block text-xs font-black text-[var(--muted)]">{expanded ? "验收明细" : "关键证据"}</span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {visibleRequirements.map((requirement) => (
              <span
                key={requirement.metric}
                className={`rounded-[8px] border px-2 py-1 text-xs font-bold ${
                  requirement.met
                    ? "border-[rgba(79,140,118,0.34)] bg-[rgba(79,140,118,0.1)] text-[var(--celadon)]"
                    : "border-[rgba(183,135,63,0.34)] bg-[rgba(183,135,63,0.08)] text-[var(--brass)]"
                }`}
              >
                {requirement.label} {requirement.current}/{requirement.target}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StageProgressBar({ icon, label, value, detail, color }: { icon: React.ReactNode; label: string; value: number; detail: string; color: string }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2 text-xs font-black">
        <span className="inline-flex min-w-0 items-center gap-1.5">{icon}{label}</span>
        <span className="shrink-0 font-mono">{value}%</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-[rgba(24,28,27,0.1)]"
        role="progressbar"
        aria-label={`${label}：${detail}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
      >
        <div className={`h-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="mt-1 block text-xs font-bold text-[var(--muted)]">{detail}</span>
    </div>
  );
}

function StatusBadge({ mastered, unlocked, current }: { mastered: boolean; unlocked: boolean; current: boolean }) {
  if (mastered) {
    return (
      <span className="inline-flex items-center gap-1 rounded-[8px] bg-[rgba(79,140,118,0.14)] px-2 py-1 text-xs font-black text-[var(--celadon)]">
        <Check className="h-3.5 w-3.5" />
        已达标
      </span>
    );
  }
  if (current) {
    return <span className="rounded-[8px] bg-[rgba(183,135,63,0.16)] px-2 py-1 text-xs font-black text-[var(--brass)]">当前建议</span>;
  }
  if (!unlocked) {
    return (
      <span className="inline-flex items-center gap-1 rounded-[8px] bg-[rgba(23,63,115,0.08)] px-2 py-1 text-xs font-black text-[var(--muted)]">
        <LockKeyhole className="h-3.5 w-3.5" />
        建议先修
      </span>
    );
  }
  return <span className="rounded-[8px] bg-[rgba(23,63,115,0.08)] px-2 py-1 text-xs font-black text-[var(--ocean)]">可学习</span>;
}
