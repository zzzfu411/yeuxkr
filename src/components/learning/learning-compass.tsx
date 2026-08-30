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
    kicker: "Study Compass",
    title: "路径、自学、复习和真实材料共用同一套证据。",
    copy: "不管今天从哪个入口开始，系统都会把动作回收到课程掌握、能力短板、SRS 和输出档案里。",
    asset: "workspace"
  },
  path: {
    kicker: "Route Spine",
    title: "主线负责先后顺序，自学负责个人节奏。",
    copy: "核心课按先修推进；自由入口仍会显示下一课、弱项和真实材料，不会把你从主线里切出去。",
    asset: "path"
  },
  self: {
    kicker: "Self Study Contract",
    title: "自学计划会回写到首页推荐和能力护照。",
    copy: "目标、强度和重点不是孤立设置；它们会改变今天的推荐顺序，并通过检查点留下证据。",
    asset: "selfStudy"
  },
  review: {
    kicker: "Review Loop",
    title: "复习不是单独刷卡，而是在修补整条学习链。",
    copy: "课程错题、词汇、语法、真实材料输出都会回到这里。清空到期队列后，首页才会更放心地把你推向新输入。",
    asset: "review"
  },
  mistakes: {
    kicker: "Weak Point Map",
    title: "错题本把复习债变成可执行的修复路线。",
    copy: "薄弱项来自同一套 SRS 卡片，不另开一套记录。先看反复错和到期错题，再回到课程、词汇、语法或材料页补结构。",
    asset: "review"
  },
  quiz: {
    kicker: "Transfer Lab",
    title: "测验把分散模块拉到同一次迁移里。",
    copy: "题目只来自已学内容和已验证输出。答错会进入错题 SRS，答对会作为能力证据写回护照。",
    asset: "quiz"
  },
  immersion: {
    kicker: "Input Output Loop",
    title: "真实材料必须连到听写、复述、输出和复习。",
    copy: "材料完成不只点亮进度，还要绑定韩语输出改写，避免输入和表达训练分家。",
    asset: "immersion"
  },
  native: {
    kicker: "Native Bridge",
    title: "母语者层从语用证据和作品集里长出来。",
    copy: "关系、场合、直接度和语气动作会进入复习；长期母语者目标保留为作品集路线。",
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
      label: "复习闭环",
      icon: RefreshCcw,
      stat: reviewTask ? `${reviewTask.minutes} min` : "SRS",
      detail: reviewTask?.detail ?? "把课程、词汇、语法、材料输出送回长期记忆",
      active: active === "review"
    },
    {
      id: "mistakes",
      href: funnel ? "/onboarding" : "/mistakes",
      label: "薄弱项地图",
      icon: CircleAlert,
      stat: mistakeStat,
      detail: workspace.stats.mistakeCards
        ? `${workspace.stats.mistakeCards} 张错题卡，先处理 ${workspace.stats.dueMistakes} 张到期项，再回来源模块补结构`
        : "暂无错题债；测验或课程答错后会自动回收到这里",
      active: active === "mistakes"
    },
    {
      id: "quiz",
      href: funnel ? "/onboarding" : "/quiz",
      label: "迁移测验",
      icon: BookOpenCheck,
      stat: "Mix",
      detail: "只抽已学内容、有效材料复述和已绑定输出改写",
      active: active === "quiz"
    },
    {
      id: "immersion",
      href: funnel ? "/onboarding" : "/immersion",
      label: "真实材料",
      icon: Radio,
      stat: `${workspace.stats.completedMaterials}/${workspace.stats.totalMaterials}`,
      detail: `完成度 ${materialPercent}% · 输出档案 ${workspace.stats.outputEntries}`,
      active: active === "immersion"
    },
    {
      id: "native",
      href: funnel ? "/onboarding" : "/native",
      label: "母语者桥接",
      icon: Sparkles,
      stat: String(nativeEvidence),
      detail: `${workspace.proficiency.current.band} · ${workspace.proficiency.current.title}`,
      active: active === "native"
    }
  ];

  if (condensed) {
    return (
      <section className={cn("border-[3px] border-[var(--border)] bg-[var(--card)] p-3 shadow-brutal-sm md:p-4", className)}>
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.5fr)] lg:items-center">
            <div className="min-w-0">
              <p className="eyebrow">{config.kicker}</p>
              <h2 className="mt-2 font-serif text-xl font-black leading-tight md:text-2xl">
                {primary?.title ?? config.title}
              </h2>
              <p className="mt-1 max-w-3xl text-sm font-bold leading-6 text-[var(--muted)]">
                {primary?.reason ?? primary?.detail ?? config.copy}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
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
        <div className="mt-3 min-w-0 overflow-hidden">
          <div className="nav-scroll flex w-full max-w-full snap-x gap-2 overflow-x-auto px-1 pb-1 md:grid md:grid-cols-4 md:overflow-visible md:px-0 md:pb-0 xl:grid-cols-7">
            {tracks.map((track) => {
              const Icon = track.icon;
              return (
                <Link
                  key={track.id}
                  href={track.href}
                  aria-label={`打开${track.label}`}
                  aria-current={track.active ? "page" : undefined}
                  className={cn(
                    "focus-ring grid min-h-20 min-w-[11.5rem] snap-start rounded-none border-[3px] p-2.5 transition hover:-translate-x-px hover:-translate-y-px md:min-w-0",
                    track.active
                      ? "border-[var(--border)] bg-[var(--ink)] text-[var(--ink-inv)]"
                      : "border-[var(--border)] bg-[var(--card)]"
                  )}
                >
                  <span className="flex min-w-0 items-start justify-between gap-2">
                    <span className={cn(
                      "inline-flex min-w-0 items-center gap-1.5 font-mono text-[0.66rem] font-black uppercase leading-4",
                      track.active ? "text-[var(--ink-inv)]" : "text-[var(--ocean)]"
                    )}>
                      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span className="break-words">{track.label}</span>
                    </span>
                    <strong className="shrink-0 font-serif text-lg leading-none">{track.stat}</strong>
                  </span>
                  <span className={cn(
                    "mt-2 line-clamp-2 text-[0.72rem] font-bold leading-5",
                    track.active ? "text-[var(--ink-inv)] opacity-80" : "text-[var(--muted)]"
                  )}>{track.detail}</span>
                </Link>
              );
            })}
          </div>
        </div>
        {nextRequirements.length ? (
          <div className="mt-3 grid gap-2 rounded-none border-[3px] border-[var(--border)] bg-[var(--yellow-soft)] p-3 md:grid-cols-[auto_minmax(0,1fr)] md:items-center">
            <span className="inline-flex items-center gap-2 font-mono text-xs font-black uppercase text-[var(--brass)]">
              <BookOpenCheck className="h-4 w-4" aria-hidden="true" />
              下一阶段证据
            </span>
            <div className="grid gap-2 md:grid-cols-4">
              {nextRequirements.map((item) => (
                <div key={item.metric} className="rounded-none border-2 border-[var(--border)] bg-[var(--card)] px-3 py-2">
                  <div className="flex items-center justify-between gap-2 text-xs font-black">
                    <span>{item.label}</span>
                    <span className="font-mono text-[var(--muted)]">{item.current}/{item.target}</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--track)]">
                    <div className="h-full bg-[var(--brass)]" style={{ width: `${Math.min(100, Math.round((item.current / item.target) * 100))}%` }} />
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
    <section className={cn("grid gap-3", className)}>
      <div className="grid overflow-hidden rounded-none border-[3px] border-[var(--border)] bg-[var(--card)] shadow-brutal lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.38fr)]">
        <div className="p-4 md:p-5">
          <p className="eyebrow">{config.kicker}</p>
          <h2 className="mt-2 max-w-4xl font-serif text-3xl font-black leading-tight md:text-4xl">{config.title}</h2>
          <p className="mt-3 max-w-3xl text-sm font-bold leading-6 text-[var(--muted)] md:text-base md:leading-7">{config.copy}</p>
          <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="rounded-none border-[3px] border-[var(--border)] bg-[var(--yellow-soft)] p-3">
              <span className="font-mono text-xs font-black uppercase text-[var(--ocean)]">当前证据</span>
              <strong className="mt-1 block font-serif text-2xl leading-tight">{workspace.proficiency.current.band} · {workspace.proficiency.current.title}</strong>
              <p className="mt-2 text-xs font-bold leading-5 text-[var(--muted)]">弱项优先：{weakLabels}</p>
            </div>
            <div className="rounded-none border-[3px] border-[var(--border)] bg-[var(--green-soft)] p-3">
              <span className="font-mono text-xs font-black uppercase text-[var(--celadon)]">下一动作</span>
              <strong className="mt-1 block font-serif text-2xl leading-tight">{primary?.title ?? "进入自由练习"}</strong>
              <p className="mt-2 text-xs font-bold leading-5 text-[var(--muted)]">{primary?.detail ?? "从复习、真实材料或母语者表达继续积累证据。"}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
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
        <div className="relative min-h-64">
          <VisualPanel asset={config.asset} priority={active === "workspace"} sizes="(max-width: 1024px) 100vw, 28rem" overlay="bottom" className="absolute inset-0 rounded-none border-0" />
          <div className="absolute bottom-3 left-3 right-3 grid grid-cols-2 gap-2 rounded-none border-[3px] border-[var(--border)] bg-[var(--ink)] p-3 text-[var(--ink-inv)] shadow-brutal sm:grid-cols-4">
            <CompassMetric label="课程" value={`${pathPercent}%`} />
            <CompassMetric label="材料" value={`${materialPercent}%`} />
            <CompassMetric label="输出" value={String(workspace.stats.outputEntries)} />
            <CompassMetric label="错题" value={mistakeStat} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(13.5rem,1fr))] gap-2">
        {tracks.map((track) => {
          const Icon = track.icon;
          return (
            <Link
              key={track.id}
              href={track.href}
              aria-label={`打开${track.label}`}
              aria-current={track.active ? "page" : undefined}
              className={cn(
                "focus-ring grid min-h-32 min-w-0 rounded-none border-[3px] p-3 transition hover:-translate-x-px hover:-translate-y-px",
                track.active
                  ? "border-[var(--border)] bg-[var(--ink)] text-[var(--ink-inv)]"
                  : "border-[var(--border)] bg-[var(--card)]"
              )}
            >
              <span className="flex min-w-0 items-start justify-between gap-2">
                <span className={cn(
                  "inline-flex min-w-0 items-center gap-2 break-words font-mono text-xs font-black uppercase",
                  track.active ? "text-[var(--ink-inv)]" : "text-[var(--ocean)]"
                )}>
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {track.label}
                </span>
                <strong className="shrink-0 font-serif text-xl leading-none">{track.stat}</strong>
              </span>
              <span className={cn(
                "mt-3 text-sm font-bold leading-6",
                track.active ? "text-[var(--ink-inv)] opacity-80" : "text-[var(--muted)]"
              )}>{track.detail}</span>
            </Link>
          );
        })}
      </div>

      {nextRequirements.length ? (
        <div className="grid gap-2 rounded-none border-[3px] border-[var(--border)] bg-[var(--yellow-soft)] p-3 md:grid-cols-[auto_minmax(0,1fr)] md:items-center">
          <span className="inline-flex items-center gap-2 font-mono text-xs font-black uppercase text-[var(--brass)]">
            <BookOpenCheck className="h-4 w-4" aria-hidden="true" />
            下一阶段证据
          </span>
          <div className="grid gap-2 md:grid-cols-4">
            {nextRequirements.map((item) => (
              <div key={item.metric} className="rounded-none border-2 border-[var(--border)] bg-[var(--card)] px-3 py-2">
                <div className="flex items-center justify-between gap-2 text-xs font-black">
                  <span>{item.label}</span>
                  <span className="font-mono text-[var(--muted)]">{item.current}/{item.target}</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--track)]">
                  <div className="h-full bg-[var(--brass)]" style={{ width: `${Math.min(100, Math.round((item.current / item.target) * 100))}%` }} />
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
    <div className="min-w-0 rounded-none border-2 border-[var(--border)] bg-[var(--card)] px-3 py-2">
      <strong className="block truncate font-serif text-xl font-black leading-none">{value}</strong>
      <span className="mt-1 block font-mono text-[0.66rem] font-black uppercase text-[var(--muted)]">{label}</span>
    </div>
  );
}

function CompassMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <strong className="block truncate font-serif text-2xl font-black">{value}</strong>
      <span className="font-mono text-[0.66rem] font-black uppercase opacity-75">{label}</span>
    </div>
  );
}
