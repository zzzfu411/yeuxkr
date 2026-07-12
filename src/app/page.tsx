"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpenCheck, CircleAlert, Layers3, MapPinned, RefreshCcw, Settings2, TimerReset } from "lucide-react";
import { VisualPanel } from "@/components/assets/visual-panel";
import { LearningCompass } from "@/components/learning/learning-compass";
import { TaskCard } from "@/components/learning/task-card";
import { AbilityBars } from "@/components/learning/ability-bars";
import { Button } from "@/components/ui/button";
import { InlineAlert } from "@/components/ui/inline-alert";
import { SectionHeading, Surface } from "@/components/ui/section";
import { contentCounts, useLearningWorkspace } from "@/lib/learning/workspace";

export default function HomePage() {
  const { workspace, srs, saveProfile, reset } = useLearningWorkspace();
  const [resetStatus, setResetStatus] = useState<"idle" | "success" | "error">("idle");
  const [modeStatus, setModeStatus] = useState<"idle" | "saved" | "error">("idle");
  const profile = workspace.profile;
  const primary = workspace.recommended[0];
  const nextRequirements = workspace.proficiency.nextRequirements.slice(0, 4);
  const mistakeMetric = workspace.stats.mistakeCards ? `${workspace.stats.dueMistakes}/${workspace.stats.mistakeCards}` : "0";
  const handleStudyMode = (studyMode: "guided" | "self") => {
    if (profile.studyMode === studyMode) {
      setModeStatus("idle");
      return;
    }
    setModeStatus(saveProfile({ studyMode }) ? "saved" : "error");
  };
  const handleReset = () => {
    setResetStatus(reset() ? "success" : "error");
  };

  return (
    <div className="grid min-w-0 gap-5 md:gap-6">
      <section className="relative w-full min-w-0 max-w-full overflow-hidden rounded-[8px] border border-[var(--line)] bg-[rgba(255,250,240,0.78)]">
        <VisualPanel asset="hero" priority sizes="100vw" treatment="ambient" className="absolute inset-0 rounded-none border-0" />
        <div className="relative z-10 grid min-h-[31rem] min-w-0 gap-4 p-4 md:min-h-[35rem] md:p-6 lg:grid-cols-[minmax(0,1fr)_26rem] lg:items-end">
          <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-[linear-gradient(180deg,rgba(243,239,229,0.84),rgba(243,239,229,0.36),transparent)] md:hidden" />
          <div className="relative flex w-full min-w-0 max-w-5xl flex-col justify-end self-end">
            <p className="eyebrow">오늘의 한국어 · {profile.minutesGoal} min</p>
            <h1 className="mt-3 w-full max-w-4xl font-serif text-[2.6rem] font-black leading-[0.94] tracking-normal sm:text-5xl md:text-7xl">
              自由学习，但每一步都有依据。
            </h1>
            <p className="mt-4 w-full max-w-2xl text-base font-bold leading-7 text-[var(--muted)] md:text-lg md:leading-8">
              Kirina 把路径推荐、自学方案、复习队列和真实材料收进同一张学习驾驶舱。你可以自由切换入口，但所有动作都会回到证据、SRS 和能力护照。
            </p>
            <div className="mt-6 flex w-full min-w-0 flex-wrap gap-3">
              {primary ? (
                <Button asChild size="lg">
                  <Link href={primary.href}>
                    开始：{primary.title}
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
              ) : null}
              <Button asChild variant="secondary" size="lg">
                <Link href="/self-study">
                  <Settings2 className="h-5 w-5" />
                  调整学习方式
                </Link>
              </Button>
            </div>
            <div className="mt-4 grid w-full min-w-0 max-w-full grid-cols-4 gap-2 rounded-[8px] border border-[rgba(24,28,27,0.14)] bg-[rgba(255,250,240,0.82)] p-2 shadow-paper-sm backdrop-blur lg:hidden">
              <MobileHeroMetric icon={BookOpenCheck} label="课程" value={`${workspace.stats.completedLessons}/${workspace.stats.totalLessons}`} />
              <MobileHeroMetric icon={TimerReset} label="到期" value={String(srs.due)} />
              <MobileHeroMetric icon={CircleAlert} label="错题" value={mistakeMetric} />
              <MobileHeroMetric icon={Layers3} label="输出" value={String(workspace.stats.outputEntries)} />
            </div>
          </div>

          <aside className="hidden rounded-[8px] border border-[rgba(24,28,27,0.16)] bg-[rgba(255,250,240,0.88)] p-4 shadow-editorial backdrop-blur-xl lg:block">
            <p className="eyebrow">Workspace</p>
            <h2 className="mt-2 font-serif text-2xl font-black">{workspace.modeLabel}</h2>
            {primary ? (
              <Link
                href={primary.href}
                className="focus-ring mt-4 grid gap-2 rounded-[8px] border border-[rgba(23,63,115,0.22)] bg-[rgba(23,63,115,0.07)] p-3 transition hover:-translate-y-0.5"
              >
                <span className="font-mono text-xs font-black uppercase text-[var(--ocean)]">Next · {primary.minutes} min</span>
                <strong className="font-serif text-2xl leading-tight">{primary.title}</strong>
                <span className="text-xs font-bold leading-5 text-[var(--muted)]">{primary.detail}</span>
              </Link>
            ) : null}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <DashboardMetric icon={BookOpenCheck} label="课程" value={`${workspace.stats.completedLessons}/${workspace.stats.totalLessons}`} />
              <DashboardMetric icon={TimerReset} label="到期" value={String(srs.due)} />
              <DashboardMetric icon={CircleAlert} label="错题" value={mistakeMetric} />
              <DashboardMetric icon={Layers3} label="输出" value={String(workspace.stats.outputEntries)} />
            </div>
          </aside>
        </div>
      </section>

      <LearningCompass workspace={workspace} active="workspace" condensed />

      <section className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div>
          <SectionHeading
            kicker="Path Recommendation"
            title="路径推荐：现在最值得做的事"
            copy="推荐不是强制路线。它只是把复习、下一课、自学目标和能力短板排成一个温和的优先级。"
          />
          <div className="grid gap-3 lg:grid-cols-2">
            {workspace.recommended.map((task, index) => (
              <TaskCard key={task.id} task={task} featured={index === 0} />
            ))}
          </div>
        </div>

        <div className="grid gap-4 xl:sticky xl:top-24">
          <Surface>
            <SectionHeading kicker="Ability" title="能力雷达" copy="分数只代表站内练习覆盖，不等同真实语言等级。" />
            <AbilityBars ability={workspace.progress.ability} />
          </Surface>
          <Surface>
            <SectionHeading kicker="Next Evidence" title={workspace.proficiency.next ? workspace.proficiency.next.title : "阶段已完成"} />
            <div className="grid gap-2">
              {nextRequirements.map((item) => (
                <EvidenceRow key={item.metric} label={item.label} current={item.current} target={item.target} met={item.met} />
              ))}
            </div>
          </Surface>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
        <Surface>
          <SectionHeading
            kicker="Passport"
            title="能力护照"
            copy="护照只承认证据已经覆盖的能力。当前内容库能证明从零基础到真实材料入口和 C1 预备桥接，真正接近母语者还需要长期作品集扩容。"
          />
          <div className="grid gap-3 rounded-[8px] border border-[var(--line)] bg-[rgba(255,250,240,0.58)] p-4">
            <span className="font-mono text-xs font-black uppercase text-[var(--ocean)]">{workspace.proficiency.current.band}</span>
            <h3 className="font-serif text-3xl font-black leading-tight">{workspace.proficiency.current.title}</h3>
            <p className="text-sm font-bold leading-6 text-[var(--muted)]">{workspace.proficiency.current.summary}</p>
          </div>
        </Surface>

        <Surface>
          <SectionHeading kicker="Open Studio" title="自由学习入口" copy="你可以绕过推荐，直接进入任意模块。系统仍会记录进度和复习材料，所以探索不会把学习链打断。" />
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_14rem]">
            <div className="grid gap-2">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={profile.studyMode === "guided" ? "primary" : "secondary"}
                  size="sm"
                  aria-pressed={profile.studyMode === "guided"}
                  onClick={() => handleStudyMode("guided")}
                >
                  <MapPinned className="h-4 w-4" />
                  按路径
                </Button>
                <Button
                  type="button"
                  variant={profile.studyMode === "self" ? "primary" : "secondary"}
                  size="sm"
                  aria-pressed={profile.studyMode === "self"}
                  onClick={() => handleStudyMode("self")}
                >
                  <Settings2 className="h-4 w-4" />
                  自学
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button asChild variant="secondary" size="sm">
                  <Link href="/path">
                    <MapPinned className="h-4 w-4" />
                    查看完整路线
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  <RefreshCcw className="h-4 w-4" />
                  重置本机进度
                </Button>
              </div>
              {modeStatus === "error" ? (
                <p className="rounded-[8px] border border-[rgba(185,78,60,0.45)] bg-[rgba(185,78,60,0.08)] p-3 text-sm font-bold leading-6 text-[var(--cinnabar)]">
                  学习模式暂时无法写入本机进度，请释放浏览器存储空间后再试。
                </p>
              ) : null}
              {modeStatus === "saved" ? (
                <p className="rounded-[8px] border border-[rgba(79,140,118,0.45)] bg-[rgba(79,140,118,0.1)] p-3 text-sm font-bold leading-6 text-[var(--celadon)]">
                  学习模式已更新，首页推荐会按新的节奏重新排序。
                </p>
              ) : null}
              <div className="grid gap-2 rounded-[8px] border border-[rgba(24,28,27,0.1)] bg-[rgba(255,250,240,0.58)] p-3 text-sm font-bold leading-6 text-[var(--muted)]">
                <span>首页只保留一个主动作和一个总览，不再重复开三次场。</span>
                <span>路径、自学、复习、材料和母语者桥接共用同一组证据。</span>
              </div>
            </div>
            <VisualPanel asset="path" sizes="(max-width: 768px) 100vw, 14rem" treatment="inset" objectPosition="center" className="min-h-48 rounded-none border-0" />
          </div>
        </Surface>
      </section>

      {resetStatus === "success" ? (
        <InlineAlert tone="success">
          本机学习进度、复习卡片和输出档案已清空。
        </InlineAlert>
      ) : null}
      {resetStatus === "error" ? (
        <InlineAlert>
          本机学习数据没有完全重置，请释放浏览器存储空间或关闭隐私限制后再试。
        </InlineAlert>
      ) : null}

      <section>
        <SectionHeading
          kicker="All Entrances"
          title="模块入口"
          copy="每个入口都连接同一个本地进度、错题 SRS 和能力证据。"
        />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {workspace.openStudy.map((task) => (
            <TaskCard key={task.id} task={task} compact />
          ))}
        </div>
      </section>

      <section className="grid grid-cols-[repeat(auto-fit,minmax(8.75rem,1fr))] gap-3">
        <Metric label="核心课程" value={String(contentCounts.lessons)} />
        <Metric label="韩文字母/规则" value={String(contentCounts.hangul)} />
        <Metric label="词汇" value={String(contentCounts.vocab)} />
        <Metric label="语法点" value={String(contentCounts.grammar)} />
        <Metric label="语用场景" value={String(contentCounts.pragmatics)} />
        <Metric label="语义细差" value={String(contentCounts.nuance)} />
        <Metric label="真实材料" value={String(contentCounts.materials)} />
        <Metric label="输出档案" value={String(workspace.stats.outputEntries)} />
        <Metric label="练习轨迹" value={`${workspace.stats.weakPracticeItems}/${workspace.stats.practiceItems}`} />
      </section>
    </div>
  );
}

function MobileHeroMetric({ icon: Icon, label, value }: { icon: typeof BookOpenCheck; label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[8px] border border-[rgba(24,28,27,0.1)] bg-[rgba(255,250,240,0.58)] p-2">
      <Icon className="mb-2 h-3.5 w-3.5 text-[var(--ocean)]" aria-hidden="true" />
      <strong className="block truncate font-serif text-lg font-black leading-none">{value}</strong>
      <span className="mt-1 block truncate font-mono text-[0.62rem] font-black uppercase text-[var(--muted)]">{label}</span>
    </div>
  );
}

function DashboardMetric({ icon: Icon, label, value }: { icon: typeof BookOpenCheck; label: string; value: string }) {
  return (
    <div className="rounded-[8px] border border-[var(--line)] bg-[rgba(255,250,240,0.72)] p-3">
      <Icon className="mb-3 h-4 w-4 text-[var(--ocean)]" aria-hidden="true" />
      <strong className="block truncate font-serif text-2xl font-black leading-none">{value}</strong>
      <span className="mt-1 block font-mono text-xs font-black uppercase text-[var(--muted)]">{label}</span>
    </div>
  );
}

function EvidenceRow({ label, current, target, met }: { label: string; current: number; target: number; met: boolean }) {
  const value = target ? Math.min(100, Math.round((current / target) * 100)) : 100;
  return (
    <div className={`rounded-[8px] border p-3 ${met ? "border-[rgba(79,140,118,0.35)] bg-[rgba(79,140,118,0.1)]" : "border-[var(--line)] bg-[rgba(255,250,240,0.58)]"}`}>
      <div className="flex items-center justify-between gap-2 text-xs font-black">
        <span>{label}</span>
        <span className="font-mono text-[var(--muted)]">{current}/{target}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[rgba(24,28,27,0.1)]">
        <div className="h-full bg-[var(--brass)]" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface p-3">
      <strong className="block font-serif text-2xl font-black">{value}</strong>
      <span className="break-words font-mono text-xs font-black uppercase text-[var(--muted)]">{label}</span>
    </div>
  );
}
