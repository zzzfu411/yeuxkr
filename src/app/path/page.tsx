"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpenCheck, ChevronsDown, ClipboardCheck, Layers3, MapPinned } from "lucide-react";
import { LearningCompass } from "@/components/learning/learning-compass";
import { Button } from "@/components/ui/button";
import { ModuleHero, PageHeader, SectionHeading, Surface } from "@/components/ui/section";
import { TrackRow } from "@/components/ui/track-row";
import { needsOnboardingFunnel } from "@/lib/learning/compass";
import { TASK_IDS } from "@/lib/learning/ids";
import { firstHangul } from "@/lib/learning/player";
import { firstActionableLesson, getLessonPrerequisites, getMilestoneProgress, isLessonMastered, isLessonUnlocked, lessons, milestones, UNLOCK_SCORE } from "@/data/curriculum";
import { nativeRoadmapPrinciples, nativeRoadmapStages } from "@/data/native-roadmap";
import { proficiencyLevels, proficiencyMetrics } from "@/data/proficiency";
import { getLibraryGateForLesson, libraryRepairHref } from "@/lib/learning/path-gates";
import { libraryCountsForWrite, useLearningWorkspace } from "@/lib/learning/workspace";

const moduleLabels: Record<string, string> = {
  hangul: "韩文",
  pronunciation: "发音",
  "starter-vocab": "起步词汇",
  particles: "助词",
  "yo-style": "礼貌敬体",
  "survival-dialogues": "生活对话",
  connectors: "连接表达",
  "daily-vocab": "日常词汇",
  "listening-shadowing": "听力跟读",
  media: "媒体听读",
  nuance: "语气细差",
  paragraph: "段落表达",
  register: "语域",
  discourse: "篇章组织",
  "native-collocations": "自然搭配"
};

function rangeLabel(range: string) {
  if (range.startsWith("Week ")) return `第 ${range.slice(5).replace("-", "–")} 周`;
  if (range.startsWith("Month ")) return `第 ${range.slice(6).replace("-", "–")} 个月`;
  return range;
}

export default function PathPage() {
  const { workspace } = useLearningWorkspace();
  const [showAllStages, setShowAllStages] = useState(false);
  const [focusedMilestoneId, setFocusedMilestoneId] = useState<string | null>(null);
  const completedIds = new Set(workspace.progress.completedLessons);
  const libraryCounts = libraryCountsForWrite(workspace.progress);
  const nextLibraryGate = getLibraryGateForLesson(workspace.nextLesson, libraryCounts);
  const dueReview = workspace.recommended.find((task) => task.id === TASK_IDS.systemReview);
  const retrain = workspace.recommended.find((task) => String(task.id).startsWith("system:retrain-"))
    ?? workspace.openStudy.find((task) => String(task.id).startsWith("system:retrain-"));
  const needsOnboarding = needsOnboardingFunnel(workspace.profile, workspace.progress);
  const continueHref = needsOnboarding
    ? "/onboarding"
    : dueReview?.href
      ?? libraryRepairHref(nextLibraryGate)
      ?? retrain?.href
      ?? (workspace.nextLesson ? `/learn/${workspace.nextLesson.id}` : "/path");
  const continueLabel = needsOnboarding
    ? "先完成入门"
    : dueReview
      ? "先清到期复习"
      : !nextLibraryGate.ok
        ? `先补${nextLibraryGate.missing[0]?.label ?? "基础内容"}`
        : retrain
          ? "先复习旧课"
          : "继续当前建议课";
  const scores = workspace.progress.lessonScores;
  const milestoneProgressById = new Map(milestones.map((milestone: any) => [
    milestone.id,
    getMilestoneProgress(milestone.id, completedIds, scores, workspace.proficiency.evidence)
  ]));
  const nextLessonId = workspace.nextLesson?.id;
  const recommendNextLessonNow = !needsOnboarding && nextLibraryGate.ok && !dueReview && !retrain;
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

  const coreQueueTitle = focusedMilestone ? `${focusedMilestone.title}课程` : showAllStages ? `${lessons.length} 节主线课程` : "当前阶段";
  const coreQueueCopy = focusedMilestone
    ? "这里只显示所选阶段。可以随时回到当前阶段，或展开全部课程。"
    : showAllStages
      ? "课程按阶段排列，并标出当前建议、已完成内容和前置要求。"
      : "先看当前阶段和相邻阶段。想查看全貌时，再展开全部课程。";

  return (
    <div className="grid gap-6">
      <PageHeader
        kicker="배우는 길 · 学习路线"
        title="按顺序学，也能随时回看。"
        copy={`课程从韩文和发音开始，逐步进入日常对话、叙述和语气。上一课达到 ${UNLOCK_SCORE}%，并补齐本阶段所需内容后，下一课才会解锁。`}
        compact
      />

      <ModuleHero
        kicker="다섯 단계 · 五个阶段"
        title="五个阶段，60 节主线课程。"
        copy={`每个阶段都有课程和练习要求。完成课程，并通过对应的听读、输出和阶段检查，才会进入下一阶段。`}
        asset="path"
      >
        {workspace.nextLesson ? (
          <Button asChild>
            <Link href={continueHref}>
              <MapPinned className="h-4 w-4" />
              {continueLabel}
            </Link>
          </Button>
        ) : null}
      </ModuleHero>

      <section className="grid gap-3" aria-labelledby="stage-progress-title">
        <h2 id="stage-progress-title" className="sr-only">阶段课程与能力检查进度</h2>
        <div className="nav-scroll -mx-4 grid auto-cols-[17rem] grid-flow-col gap-3 overflow-x-auto px-4 pb-2 lg:mx-0 lg:grid-flow-row lg:grid-cols-3 lg:px-0 xl:grid-cols-5">
        {milestones.map((milestone: any, index: number) => {
          const stageProgress = milestoneProgressById.get(milestone.id);
          if (!stageProgress) return null;
          const isCurrentStage = milestone.id === currentMilestoneId;
          const isFocusedStage = milestone.id === focusedMilestoneId;
          const stageStatus = stageProgress.complete
            ? "阶段检查已完成"
            : stageProgress.course.complete
              ? "课程完成，待阶段检查"
              : "课程推进中";
          return (
            <article
              key={milestone.id}
              aria-labelledby={`stage-${milestone.id}-title`}
              className={`relative overflow-hidden rounded-none border p-4 ${
                isFocusedStage
                  ? "border-[var(--border)] bg-[color-mix(in_srgb,var(--navy)_12%,transparent)]"
                  : isCurrentStage
                  ? "border-[var(--border)] bg-[var(--yellow-soft)]"
                  : stageProgress.complete
                    ? "border-[var(--green)] bg-[var(--green-soft)]"
                    : "border-[var(--line)] bg-[var(--card)]"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <span className="font-mono text-xs font-black uppercase text-[var(--muted)]">第 {String(index + 1).padStart(2, "0")} 阶段</span>
                <span className={`rounded-none px-2 py-1 text-xs font-black ${
                  stageProgress.complete
                    ? "bg-[var(--green-soft)] text-[var(--celadon)]"
                    : stageProgress.course.complete
                      ? "bg-[var(--yellow-soft)] text-[var(--brass)]"
                      : "bg-[color-mix(in_srgb,var(--navy)_12%,transparent)] text-[var(--ocean)]"
                }`}>{stageStatus}</span>
              </div>
              <span className="mt-2 block font-mono text-xs font-black uppercase text-[var(--ocean)]">{rangeLabel(milestone.range)}</span>
              <h3 id={`stage-${milestone.id}-title`} className="mt-1 font-serif text-2xl font-black leading-tight">{milestone.title}</h3>
              <p className="mt-2 text-sm font-bold leading-6 text-[var(--muted)]">{milestone.outcome}</p>
              <StageProgressSummary progress={stageProgress} />
              <div className="mt-3 flex flex-wrap gap-1.5">
                {milestone.modules.slice(0, 3).map((item: string) => (
                  <span key={item} className="rounded-none bg-[color-mix(in_srgb,var(--navy)_12%,transparent)] px-2 py-1 text-xs font-bold text-[var(--ocean)]">
                    {moduleLabels[item] ?? item}
                  </span>
                ))}
              </div>
              {isCurrentStage ? (
                <div className="mt-3 rounded-none border border-[var(--border)] bg-[var(--card)] px-2 py-1 font-mono text-xs font-black uppercase text-[var(--brass)]">
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
          kicker="지금 배울 것 · 当前课程"
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

                <div>
                  {milestoneLessons.map((lesson: any) => {
                    const mastered = isLessonMastered(lesson.id, completedIds, scores);
                    const unlocked = isLessonUnlocked(lesson.id, completedIds, scores);
                    const prerequisites = getLessonPrerequisites(lesson.id);
                    const missing = prerequisites.filter((item: any) => !isLessonMastered(item.id, completedIds, scores));
                    const isCurrent = recommendNextLessonNow && nextLessonId === lesson.id;
                    const libraryGate = getLibraryGateForLesson(lesson, libraryCounts);
                    const enterable = unlocked && libraryGate.ok && !(needsOnboarding && !mastered);
                    const actionable = firstActionableLesson(
                      missing.map((item: any) => item.id),
                      completedIds,
                      scores,
                      workspace.nextLesson?.id
                    );
                    const kicker = needsOnboarding && !mastered
                      ? "先入门"
                      : isCurrent ? "当前建议" : mastered ? "已完成" : enterable ? "可学习" : unlocked ? "还需补基础" : "先学前置课";
                    const detail = !enterable
                      ? `${lesson.subtitle}${missing.length ? ` 建议先学：${missing.map((item: any) => item.title).join("、")}` : ""}${libraryGate.missing.length ? ` 先补${libraryGate.missing.map((gap) => `${gap.label} ${gap.current}/${gap.target}`).join("、")}` : ""}`
                      : lesson.subtitle;
                    const rowHref = needsOnboarding && !mastered
                      ? "/onboarding"
                      : mastered || enterable
                        ? `/learn/${lesson.id}`
                        : !unlocked
                          ? (actionable ? `/learn/${actionable.id}` : "/path")
                          : libraryRepairHref(libraryGate) ?? (actionable ? `/learn/${actionable.id}` : `/learn/${lesson.id}`);
                    const rowPlayLabel = needsOnboarding && !mastered
                      ? "先完成入门"
                      : mastered || enterable
                        ? `打开 ${lesson.title}`
                        : !unlocked
                          ? `先去 ${actionable?.title ?? "当前可上课"}`
                          : `先补${libraryGate.missing[0]?.label ?? "基础内容"}`;
                    return (
                      <TrackRow
                        key={lesson.id}
                        index={lesson.order}
                        glyph={firstHangul(lesson.title, "한")}
                        kicker={kicker}
                        title={lesson.title}
                        detail={detail}
                        meta={`${lesson.duration} 分钟`}
                        completed={mastered}
                        active={isCurrent}
                        href={rowHref}
                        playLabel={rowPlayLabel}
                      />
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

      <LearningCompass workspace={workspace} active="path" condensed isFirstVisit={needsOnboarding} />

      <Surface variant="plain">
        <SectionHeading
          kicker="지금까지 · 学到哪里"
          title="阶段进度"
          copy={`课程、情境听读、输出和阶段检查会共同更新这里。等级只表示站内学习进度，不是 CEFR 认证。`}
        />
        <div className="grid gap-3 lg:grid-cols-2">
          {proficiencyLevels.map((level: any) => {
            const isCurrent = workspace.proficiency.current.id === level.id;
            const isNext = workspace.proficiency.next?.id === level.id;
            return (
              <article key={level.id} className={`rounded-none border p-4 ${isCurrent ? "border-[var(--green)] bg-[var(--green-soft)]" : isNext ? "border-[var(--border)] bg-[var(--yellow-soft)]" : "border-[var(--line)] bg-[var(--card)]"}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-xs font-black uppercase text-[var(--ocean)]">{level.band}</span>
                  {isCurrent ? <span className="rounded-none bg-[var(--green-soft)] px-2 py-1 text-xs font-black text-[var(--celadon)]">当前阶段</span> : null}
                  {isNext ? <span className="rounded-none bg-[var(--yellow-soft)] px-2 py-1 text-xs font-black text-[var(--brass)]">下一阶段</span> : null}
                </div>
                <h3 className="mt-2 font-serif text-2xl font-black">{level.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{level.summary}</p>
                {level.roadmapTargets ? (
                  <div className="mt-3 grid gap-1">
                    {level.roadmapTargets.slice(0, 3).map((item: string) => (
                      <span key={item} className="rounded-none bg-[color-mix(in_srgb,var(--navy)_12%,transparent)] px-2 py-1 text-xs font-bold text-[var(--ocean)]">{item}</span>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(level.requirements ?? []).slice(0, 5).map((requirement: any) => (
                      <span key={`${level.id}:${requirement.metric}`} className="rounded-none border border-[var(--line)] px-2 py-1 text-xs font-bold">
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
          kicker="그다음 · 之后怎么学"
          title="长期进阶路线"
          copy="站内课程结束后，还需要大量原生材料、词汇搭配、反复修改的口语与写作，以及来自真实交流的反馈。这里列出后续练习方向，不把它算进当前等级。"
        />
        <div className="grid gap-3 xl:grid-cols-3">
          {nativeRoadmapStages.map((stage, index) => (
            <article key={stage.id} className="grid gap-3 rounded-none border border-[var(--line)] bg-[var(--card)] p-4">
              <div className="flex items-start justify-between gap-3">
                <span className="font-mono text-xs font-black uppercase text-[var(--ocean)]">{stage.band}</span>
                <span className="grid h-9 w-9 place-items-center rounded-none bg-[color-mix(in_srgb,var(--navy)_12%,transparent)] font-mono text-xs font-black text-[var(--ocean)]">
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
                  <span key={domain} className="rounded-none bg-[color-mix(in_srgb,var(--navy)_12%,transparent)] px-2 py-1 text-xs font-bold text-[var(--ocean)]">
                    {domain}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
        <div className="mt-4 grid gap-2 rounded-none border border-[var(--border)] bg-[var(--yellow-soft)] p-4 md:grid-cols-[auto_minmax(0,1fr)]">
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
    <div className="rounded-none border border-[var(--line)] bg-[var(--surface-solid)] p-2">
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
        label="阶段检查"
        value={progress.acceptance.progress}
        detail={`${progress.acceptance.met}/${progress.acceptance.total} 项通过${progress.acceptance.band ? ` · ${progress.acceptance.band}` : ""}`}
        color="bg-[var(--celadon)]"
      />
      {visibleRequirements.length ? (
        <div>
          <span className="block text-xs font-black text-[var(--muted)]">{expanded ? "进度明细" : "主要要求"}</span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {visibleRequirements.map((requirement) => (
              <span
                key={requirement.metric}
                className={`rounded-none border px-2 py-1 text-xs font-bold ${
                  requirement.met
                    ? "border-[var(--green)] bg-[var(--green-soft)] text-[var(--celadon)]"
                    : "border-[var(--border)] bg-[var(--yellow-soft)] text-[var(--brass)]"
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
        className="h-2 overflow-hidden rounded-full bg-[var(--track)]"
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
