"use client";

import Link from "next/link";
import { ArrowRight, BookOpenCheck, CircleAlert, Compass, MapPinned, NotebookTabs, Radio, RefreshCcw, Sparkles } from "lucide-react";
import { VisualPanel } from "@/components/assets/visual-panel";
import { Button } from "@/components/ui/button";
import { buildSelfStudyPlan } from "@/data/self-study";
import type { DisplayVisualAssetId } from "@/data/visuals/assets";
import { needsOnboardingFunnel, pathSpineDetail, selectCompassPrimaryTask, selectCompassReviewTask, type CompassContext } from "@/lib/learning/compass";
import { ABILITY_LABELS, countCheckpointCredits, countNativePracticeEvidence } from "@/lib/learning/workspace";
import type { LearningWorkspace } from "@/lib/learning/types";
import { cn } from "@/lib/utils";

const contextConfig: Record<CompassContext, { kicker: string; title: string; copy: string; asset: DisplayVisualAssetId }> = {
  workspace: {
    kicker: "학습 안내 · 学习安排",
    title: "从哪里开始，进度都记在一起。",
    copy: "课程、自学、复习和情境听读共用同一份学习记录。",
    asset: "workspace"
  },
  path: {
    kicker: "배우는 순서 · 学习顺序",
    title: "主线安排顺序，自学保留你的节奏。",
    copy: "课程按前后关系解锁；想自由练习时，也随时能看到下一课和需要补的内容。",
    asset: "path"
  },
  self: {
    kicker: "나의 계획 · 我的计划",
    title: "自学计划会改变今天的推荐顺序。",
    copy: "选好目标、强度和重点后，首页会按这个节奏安排任务。阶段检查会保存你的复盘。",
    asset: "selfStudy"
  },
  review: {
    kicker: "다시 볼 때 · 到期复习",
    title: "到期内容先复习，记忆会更稳。",
    copy: "课程错题、词汇、语法和听读改写都会来到这里。做完后，再继续学新内容。",
    asset: "review"
  },
  mistakes: {
    kicker: "다시 배우기 · 错题重练",
    title: "反复错的题，回到原处补一遍。",
    copy: "先做已到期和反复出错的题，再回课程、词汇、语法或听读页查看讲解。",
    asset: "review"
  },
  quiz: {
    kicker: "실력 확인 · 换题检查",
    title: "换个题型，检查是不是真的会了。",
    copy: "题目只来自你学过的内容。答错会加入错题复习，之后可以再练。",
    asset: "quiz"
  },
  immersion: {
    kicker: "듣고 말하기 · 听读复述",
    title: "听一段，写一句，再用韩语复述。",
    copy: "站内内容是自编情境脚本，由录音或设备语音播放。完成听写和改写后，内容会加入复习。",
    asset: "immersion"
  },
  native: {
    kicker: "말투와 거리 · 语气与距离",
    title: "同一句话，换个关系就要换种说法。",
    copy: "这里练场合、礼貌距离和语气。自然表达需要长期练习，不由站内分数决定。",
    asset: "native"
  }
};

const contextRoutes: Record<CompassContext, string> = {
  workspace: "/",
  path: "/path",
  self: "/self-study",
  review: "/review",
  mistakes: "/mistakes",
  quiz: "/quiz",
  immersion: "/immersion",
  native: "/native"
};

export function LearningCompass({
  workspace,
  active = "workspace",
  className,
  condensed = false,
  isFirstVisit = false
}: {
  workspace: LearningWorkspace;
  active?: CompassContext;
  className?: string;
  condensed?: boolean;
  isFirstVisit?: boolean;
}) {
  const config = contextConfig[active];
  const plan = buildSelfStudyPlan(workspace.profile as any);
  const funnel = isFirstVisit || needsOnboardingFunnel(workspace.profile, workspace.progress);
  const primary = selectCompassPrimaryTask(workspace, active, { isFirstVisit: funnel });
  const reviewTask = selectCompassReviewTask(workspace);
  const routeHref = funnel ? "/onboarding" : "/path";
  const primaryHref = primary?.href.replace(/\/$/, "") || "";
  const activeHref = contextRoutes[active].replace(/\/$/, "") || "/";
  const showPrimaryCta = Boolean(primary && primaryHref !== activeHref);
  const pathPercent = Math.round((workspace.stats.completedLessons / Math.max(1, workspace.stats.totalLessons)) * 100);
  const materialPercent = Math.round((workspace.stats.completedMaterials / Math.max(1, workspace.stats.totalMaterials)) * 100);
  const mistakeStat = workspace.stats.mistakeCards ? `${workspace.stats.dueMistakes}/${workspace.stats.mistakeCards}` : "0";
  const weakLabels = workspace.abilityGaps.map((ability) => ABILITY_LABELS[ability]).join(" / ") || "暂无明显短板";
  const nextRequirements = workspace.proficiency.nextRequirements.slice(0, 4);
  const nativeEvidence = countNativePracticeEvidence(workspace.progress) + countCheckpointCredits(workspace.progress) + workspace.stats.outputEntries;

  const tracks = [
    {
      id: "path",
      href: funnel ? "/onboarding" : "/path",
      label: "课程主线",
      icon: MapPinned,
      stat: `${workspace.stats.completedLessons}/${workspace.stats.totalLessons}`,
      detail: pathSpineDetail(workspace, funnel),
      active: active === "path"
    },
    {
      id: "self",
      href: funnel ? "/onboarding" : "/self-study",
      label: "自学方案",
      icon: NotebookTabs,
      stat: `${plan.durationWeeks} 周`,
      detail: `${plan.goal.title} · ${plan.intensity.title} · ${plan.focus.title}`,
      active: active === "self"
    },
    {
      id: "review",
      href: funnel ? "/onboarding" : "/review",
      label: "间隔复习",
      icon: RefreshCcw,
      stat: reviewTask ? `${reviewTask.minutes} 分钟` : "待复习",
      detail: reviewTask?.detail ?? "按到期时间复习课程、词汇、语法和听读内容",
      active: active === "review"
    },
    {
      id: "mistakes",
      href: funnel ? "/onboarding" : "/mistakes",
      label: "错题整理",
      icon: CircleAlert,
      stat: mistakeStat,
      detail: workspace.stats.mistakeCards
        ? `${workspace.stats.mistakeCards} 张错题，其中 ${workspace.stats.dueMistakes} 张已经到期`
        : "暂无错题；课程或测验答错后会自动出现在这里",
      active: active === "mistakes"
    },
    {
      id: "quiz",
      href: funnel ? "/onboarding" : "/quiz",
      label: "综合测验",
      icon: BookOpenCheck,
      stat: "混合",
      detail: "只考学过的课程、词句、听读和已保存的改写",
      active: active === "quiz"
    },
    {
      id: "immersion",
      href: funnel ? "/onboarding" : "/immersion",
      label: "情境听读",
      icon: Radio,
      stat: `${workspace.stats.completedMaterials}/${workspace.stats.totalMaterials}`,
      detail: `完成 ${materialPercent}% · 已保存 ${workspace.stats.outputEntries} 段输出`,
      active: active === "immersion"
    },
    {
      id: "native",
      href: funnel ? "/onboarding" : "/native",
      label: "自然表达",
      icon: Sparkles,
      stat: String(nativeEvidence),
      detail: `${workspace.proficiency.current.band} · ${workspace.proficiency.current.title}`,
      active: active === "native"
    }
  ];

  if (condensed) {
    return (
      <section className={cn("surface paper-rail relative p-4 pt-7 md:p-5 md:pt-8", className)}>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.48fr)] lg:items-end">
            <div className="min-w-0">
              <p className="eyebrow">{config.kicker}</p>
              <h2 className="inkline mt-2 w-fit max-w-full font-serif text-2xl font-normal leading-tight md:text-3xl">
                {primary?.title ?? config.title}
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
                {primary?.reason ?? primary?.detail ?? config.copy}
              </p>
            </div>
            <div className="grid grid-cols-2 border-y border-[var(--line)] sm:grid-cols-4">
              <CompactMetric label="阶段" value={workspace.proficiency.current.band} />
              <CompactMetric label="课程" value={`${pathPercent}%`} />
              <CompactMetric label="材料" value={`${materialPercent}%`} />
              <CompactMetric label="错题" value={mistakeStat} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 xl:justify-end">
            {showPrimaryCta && primary ? (
              <Button asChild size="sm">
                <Link href={primary.href}>
                  继续
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : null}
            {active !== "path" ? (
              <Button asChild variant="secondary" size="sm">
                <Link href={routeHref}>
                  <Compass className="h-4 w-4" />
                  路线
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
        <div className="mt-5 min-w-0 overflow-hidden border-y border-[var(--line)] bg-[color-mix(in_srgb,var(--paper-hi)_48%,transparent)]">
          <nav className="nav-scroll flex w-full max-w-full snap-x overflow-x-auto md:grid md:grid-cols-4 md:overflow-visible xl:grid-cols-7" aria-label="学习路线">
            {tracks.map((track) => {
              const Icon = track.icon;
              return (
                <Link
                  key={track.id}
                  href={track.href}
                  aria-label={`打开${track.label}`}
                  aria-current={track.active ? "page" : undefined}
                  className={cn(
                    "focus-ring group relative grid min-h-[4.75rem] min-w-[11.5rem] snap-start content-between border-r border-[var(--line)] px-3 py-2.5 transition-colors last:border-r-0 hover:bg-[var(--wash-2)] md:min-w-0",
                    track.active
                      ? "bg-[var(--wash-2)] before:absolute before:inset-y-2 before:left-0 before:w-px before:bg-[var(--seal)]"
                      : "bg-transparent"
                  )}
                >
                  <span className="flex min-w-0 items-start justify-between gap-2">
                    <span className={cn(
                      "inline-flex min-w-0 items-center gap-1.5 text-xs leading-4",
                      track.active ? "text-[var(--seal)]" : "text-[var(--ink-soft)]"
                    )}>
                      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span className="break-words">{track.label}</span>
                    </span>
                    <strong className="shrink-0 font-serif text-lg font-normal leading-none">{track.stat}</strong>
                  </span>
                  <span className="mt-2 line-clamp-2 text-[0.72rem] leading-5 text-[var(--muted)]">{track.detail}</span>
                </Link>
              );
            })}
          </nav>
        </div>
        {nextRequirements.length ? (
          <div className="mt-5 grid gap-3 border-t border-[var(--line)] pt-4 md:grid-cols-[auto_minmax(0,1fr)] md:items-start md:gap-5">
            <span className="inline-flex items-center gap-2 text-xs text-[var(--seal)]">
              <BookOpenCheck className="h-4 w-4" aria-hidden="true" />
              下一阶段还需
            </span>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-4">
              {nextRequirements.map((item) => (
                <div key={item.metric} className="min-w-0">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span>{item.label}</span>
                    <span className="text-[var(--muted)]">{item.current}/{item.target}</span>
                  </div>
                  <div className="mt-2 h-px bg-[var(--line)]">
                    <div className="h-px bg-[var(--seal)]" style={{ width: `${Math.min(100, Math.round((item.current / item.target) * 100))}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <section className={cn("grid gap-5", className)}>
      <div className="studio-panel relative grid lg:grid-cols-[minmax(0,1fr)_minmax(19rem,0.4fr)]">
        <span className="paper-tape left-8 top-[-8px]" aria-hidden="true" />
        <div className="paper-rail relative p-5 pt-8 md:p-7 md:pt-9">
          <p className="eyebrow">{config.kicker}</p>
          <h2 className="inkline mt-3 max-w-4xl font-serif text-3xl font-normal leading-tight md:text-5xl">{config.title}</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--muted)] md:text-base">{config.copy}</p>
          <div className="mt-6 grid border-y border-[var(--line)] md:grid-cols-2">
            <div className="py-4 pr-4 md:border-r md:border-[var(--line)]">
              <span className="text-xs text-[var(--seal)]">当前进度</span>
              <strong className="mt-1 block font-serif text-xl font-normal leading-tight md:text-2xl">{workspace.proficiency.current.band} · {workspace.proficiency.current.title}</strong>
              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">弱项优先：{weakLabels}</p>
            </div>
            <div className="border-t border-[var(--line)] py-4 md:border-t-0 md:pl-4">
              <span className="text-xs text-[var(--ink-soft)]">下一动作</span>
              <strong className="mt-1 block font-serif text-xl font-normal leading-tight md:text-2xl">{primary?.title ?? "进入自由练习"}</strong>
              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{primary?.detail ?? "可以继续复习、情境听读或自然表达练习。"}</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {showPrimaryCta && primary ? (
              <Button asChild size="sm">
                <Link href={primary.href}>
                  继续下一步
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : null}
            {active !== "path" ? (
              <Button asChild variant="secondary" size="sm">
                <Link href={routeHref}>
                  <Compass className="h-4 w-4" />
                  查看全路线
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
        <div className="relative border-t border-[var(--line)] p-4 pt-7 lg:border-l lg:border-t-0 lg:p-5 lg:pt-8">
          <VisualPanel asset={config.asset} priority={active === "workspace"} sizes="(max-width: 1024px) 100vw, 28rem" treatment="inset" className="min-h-64" />
          <div className="mt-4 grid grid-cols-4 border-y border-[var(--line)] py-3">
            <CompassMetric label="课程" value={`${pathPercent}%`} />
            <CompassMetric label="材料" value={`${materialPercent}%`} />
            <CompassMetric label="输出" value={String(workspace.stats.outputEntries)} />
            <CompassMetric label="错题" value={mistakeStat} />
          </div>
        </div>
      </div>

      <nav className="surface relative grid md:grid-cols-2" aria-label="学习路线">
        {tracks.map((track) => {
          const Icon = track.icon;
          return (
            <Link
              key={track.id}
              href={track.href}
              aria-label={`打开${track.label}`}
              aria-current={track.active ? "page" : undefined}
              className={cn(
                "focus-ring group relative grid min-h-[6.5rem] min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] content-center gap-x-3 border-b border-[var(--line)] p-4 transition-colors hover:bg-[var(--wash-2)] md:odd:border-r md:odd:border-[var(--line)]",
                track.active
                  ? "bg-[var(--wash-2)] before:absolute before:inset-y-3 before:left-0 before:w-px before:bg-[var(--seal)]"
                  : "bg-transparent"
              )}
            >
              <Icon className={cn("mt-0.5 h-4 w-4", track.active ? "text-[var(--seal)]" : "text-[var(--ink-mute)]")} aria-hidden="true" />
              <span className="min-w-0">
                <span className={cn("block text-sm", track.active ? "text-[var(--seal)]" : "text-[var(--ink)]")}>{track.label}</span>
                <span className="mt-1 block text-sm leading-6 text-[var(--muted)]">{track.detail}</span>
              </span>
              <strong className="shrink-0 font-serif text-xl font-normal leading-none">{track.stat}</strong>
            </Link>
          );
        })}
      </nav>

      {nextRequirements.length ? (
        <div className="surface paper-rail relative grid gap-4 p-4 pt-7 md:grid-cols-[auto_minmax(0,1fr)] md:items-start md:gap-6 md:p-5 md:pt-8">
          <span className="inline-flex items-center gap-2 text-xs text-[var(--seal)]">
            <BookOpenCheck className="h-4 w-4" aria-hidden="true" />
            下一阶段还需
          </span>
          <div className="grid grid-cols-2 gap-x-5 gap-y-4 md:grid-cols-4">
            {nextRequirements.map((item) => (
              <div key={item.metric} className="min-w-0">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span>{item.label}</span>
                  <span className="text-[var(--muted)]">{item.current}/{item.target}</span>
                </div>
                <div className="mt-3 h-px bg-[var(--line)]">
                  <div className="h-px bg-[var(--seal)]" style={{ width: `${Math.min(100, Math.round((item.current / item.target) * 100))}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function CompactMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-r border-[var(--line)] px-3 py-2.5 last:border-r-0">
      <strong className="block truncate font-serif text-xl font-normal leading-none">{value}</strong>
      <span className="mt-1 block text-[0.66rem] text-[var(--muted)]">{label}</span>
    </div>
  );
}

function CompassMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-r border-[var(--line)] px-2 text-center last:border-r-0">
      <strong className="block truncate font-serif text-xl font-normal md:text-2xl">{value}</strong>
      <span className="text-[0.66rem] text-[var(--muted)]">{label}</span>
    </div>
  );
}
