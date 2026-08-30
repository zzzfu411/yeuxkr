"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpenCheck, CircleAlert, Layers3, MapPinned, RefreshCcw, Settings2, TimerReset } from "lucide-react";
import { VisualPanel } from "@/components/assets/visual-panel";
import { LearningCompass } from "@/components/learning/learning-compass";
import { TaskCard } from "@/components/learning/task-card";
import { Button } from "@/components/ui/button";
import { InlineAlert } from "@/components/ui/inline-alert";
import { SectionHeading, Surface } from "@/components/ui/section";
import { resetLearningData } from "@/lib/learning/backup";
import { needsOnboardingFunnel, ONBOARDING_TASK } from "@/lib/learning/compass";
import { contentCounts, useLearningWorkspace } from "@/lib/learning/workspace";

export default function HomePage() {
  const { workspace, srs, saveProfile } = useLearningWorkspace();
  const isFirstVisit = needsOnboardingFunnel(workspace.profile, workspace.progress);
  const [resetStatus, setResetStatus] = useState<"idle" | "success" | "error">("idle");
  const [confirmReset, setConfirmReset] = useState(false);
  const [modeStatus, setModeStatus] = useState<"idle" | "saved" | "error">("idle");
  const profile = workspace.profile;
  const primary = workspace.recommended[0];
  const heroAction = isFirstVisit
    ? { href: "/onboarding", title: "完成三分钟入门设置", detail: "选目标、试听韩语并完成键盘检查。", minutes: 3 }
    : primary;
  const mistakeMetric = workspace.stats.mistakeCards ? `${workspace.stats.dueMistakes}/${workspace.stats.mistakeCards}` : "0";
  const handleStudyMode = (studyMode: "guided" | "self") => {
    setConfirmReset(false);
    if (profile.studyMode === studyMode) {
      setModeStatus("idle");
      return;
    }
    setModeStatus(saveProfile({ studyMode }) ? "saved" : "error");
  };
  const handleReset = async () => {
    if (!confirmReset) {
      setConfirmReset(true);
      setResetStatus("idle");
      return;
    }
    setResetStatus(await resetLearningData() ? "success" : "error");
    setConfirmReset(false);
  };

  return (
    <div className="grid min-w-0 gap-5 md:gap-6">
      <section className="relative w-full min-w-0 max-w-full overflow-hidden rounded-none border-[3px] border-[var(--border)] bg-[var(--card)] shadow-brutal">
        <VisualPanel asset="hero" priority sizes="100vw" treatment="ambient" className="absolute inset-0 rounded-none border-0" />
        <div className="relative z-10 grid min-h-[24rem] min-w-0 gap-4 p-4 md:min-h-[28rem] md:p-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end">
          <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--paper)_92%,transparent),color-mix(in_srgb,var(--paper)_40%,transparent),transparent)] md:hidden" />
          <div className="relative flex w-full min-w-0 max-w-5xl flex-col justify-end self-end">
            <p className="eyebrow">오늘의 한국어 · {profile.minutesGoal} min</p>
            <h1 className="mt-3 w-full max-w-4xl font-serif text-[2.4rem] font-black leading-[1.08] tracking-normal sm:text-5xl md:text-6xl">
              {isFirstVisit ? "从韩文字块开始，今天读出第一句。" : "把今天最值得的那一首按下去。"}
            </h1>
            <p className="mt-4 w-full max-w-2xl text-base font-bold leading-7 text-[var(--muted)] md:text-lg md:leading-8">
              {isFirstVisit
                ? "先确认发音与韩文输入，再进入第一课。路径和自学共用同一条播放队列、复习和能力证据。"
                : "到期复习、下一课、短板和真实材料已经排进歌单；听完一首，下一首自动顶上。"}
            </p>
            <div className="mt-6 flex w-full min-w-0 flex-wrap gap-3">
              {heroAction ? (
                <Button asChild size="lg">
                  <Link href={heroAction.href}>
                    ▶ 播放：{heroAction.title}
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
              ) : null}
              {isFirstVisit ? null : (
                <Button asChild variant="secondary" size="lg">
                  <Link href="/self-study">
                    <Settings2 className="h-5 w-5" />
                    调整学习方式
                  </Link>
                </Button>
              )}
            </div>
            <div className="mt-4 grid w-full min-w-0 max-w-full grid-cols-2 gap-2 rounded-none border-[3px] border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_90%,transparent)] p-2 shadow-paper-sm backdrop-blur sm:grid-cols-4 lg:hidden">
              <MobileHeroMetric icon={BookOpenCheck} label="课程" value={`${workspace.stats.completedLessons}/${workspace.stats.totalLessons}`} />
              <MobileHeroMetric icon={TimerReset} label="到期" value={String(srs.due)} />
              <MobileHeroMetric icon={CircleAlert} label="错题" value={mistakeMetric} />
              <MobileHeroMetric icon={Layers3} label="输出" value={String(workspace.stats.outputEntries)} />
            </div>
          </div>

          <aside className="hidden rounded-none border-[3px] border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_92%,transparent)] p-4 shadow-editorial backdrop-blur-xl lg:block">
            <p className="eyebrow">Now Playing</p>
            <h2 className="mt-2 font-serif text-2xl font-black">{workspace.modeLabel}</h2>
            {heroAction ? (
              <Link
                href={heroAction.href}
                className="focus-ring mt-4 grid gap-2 rounded-none border-[3px] border-[var(--border)] bg-[var(--yellow-soft)] p-3 transition hover:-translate-x-px hover:-translate-y-px"
              >
                <span className="font-mono text-xs font-black uppercase text-[var(--ocean)]">Next · {heroAction.minutes} min</span>
                <strong className="font-serif text-2xl leading-tight">{heroAction.title}</strong>
                <span className="text-xs font-bold leading-5 text-[var(--muted)]">{heroAction.detail}</span>
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

      <LearningCompass workspace={workspace} active="workspace" condensed isFirstVisit={isFirstVisit} />

      <section>
        <SectionHeading
          kicker="Queue"
          title="今日歌单"
          copy={isFirstVisit ? "先完成三分钟入门，确认目标和韩文输入后再进第一课。" : "先播第一首；播完后，推荐会根据到期复习、主线位置和真实弱点重新排队。"}
        />
        <div className="grid gap-0">
          {(isFirstVisit ? [ONBOARDING_TASK] : workspace.recommended).map((task, index) => (
            <TaskCard key={task.id} task={task} featured={index === 0} index={index + 1} />
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
        <Surface>
          <SectionHeading
            kicker="Passport"
            title="能力护照"
            copy="护照只承认证据已经覆盖的能力。当前内容库能证明从零基础到真实材料入口和 C1 预备桥接，真正接近母语者还需要长期作品集扩容。"
          />
          <div className="grid gap-3 rounded-none border-[3px] border-[var(--border)] bg-[var(--yellow-soft)] p-4">
            <span className="font-mono text-xs font-black uppercase text-[var(--ocean)]">{workspace.proficiency.current.band}</span>
            <h3 className="font-serif text-3xl font-black leading-tight">{workspace.proficiency.current.title}</h3>
            <p className="text-sm font-bold leading-6 text-[var(--muted)]">{workspace.proficiency.current.summary}</p>
          </div>
        </Surface>

        <Surface>
          <SectionHeading kicker="Open Studio" title="自由学习入口" copy="你可以绕过推荐，直接进入任意模块。系统仍会记录进度和复习材料，所以探索不会把学习链打断。" />
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_14rem]">
            <div className="grid gap-2">
              {isFirstVisit ? null : (
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
              )}
              <div className="grid grid-cols-2 gap-2">
                <Button asChild variant="secondary" size="sm">
                  <Link href={isFirstVisit ? "/onboarding" : "/path"}>
                    <MapPinned className="h-4 w-4" />
                    {isFirstVisit ? "先完成入门" : "查看完整路线"}
                  </Link>
                </Button>
                <Button variant={confirmReset ? "primary" : "ghost"} size="sm" onClick={() => void handleReset()}>
                  <RefreshCcw className="h-4 w-4" />
                  {confirmReset ? "确认清空全部数据" : "重置本机进度"}
                </Button>
              </div>
              {modeStatus === "error" ? (
                <p className="rounded-none border border-[var(--seal)] bg-[var(--seal-soft)] p-3 text-sm font-bold leading-6 text-[var(--cinnabar)]">
                  学习模式暂时无法写入本机进度，请释放浏览器存储空间后再试。
                </p>
              ) : null}
              {modeStatus === "saved" ? (
                <p className="rounded-none border border-[var(--green)] bg-[var(--green-soft)] p-3 text-sm font-bold leading-6 text-[var(--celadon)]">
                  {isFirstVisit ? "学习模式已记下。完成入门后，首页会按这个节奏排歌单。" : "学习模式已更新，首页推荐会按新的节奏重新排序。"}
                </p>
              ) : null}
              {confirmReset ? (
                <p className="rounded-none border border-[var(--seal)] bg-[var(--seal-soft)] p-3 text-sm font-bold leading-6 text-[var(--cinnabar)]">
                  再点一次将清空学习偏好、课程进度、SRS、错题、输出、草稿、录音引用和母语作品集；此操作无法撤销。
                </p>
              ) : null}
              <div className="grid gap-2 rounded-none border border-[var(--line)] bg-[var(--card)] p-3 text-sm font-bold leading-6 text-[var(--muted)]">
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
          本机学习偏好、进度、复习卡片、输出、草稿和作品集已清空。
        </InlineAlert>
      ) : null}
      {resetStatus === "error" ? (
        <InlineAlert>
          本机学习数据没有完全重置，请释放浏览器存储空间或关闭隐私限制后再试。
        </InlineAlert>
      ) : null}

      {isFirstVisit ? null : (
      <section>
        <SectionHeading
          kicker="All Entrances"
          title="模块入口"
          copy="每个入口都连接同一个本地进度、错题 SRS 和能力证据。"
        />
        <div className="grid gap-0">
          {workspace.openStudy.map((task, index) => (
            <TaskCard key={task.id} task={task} compact index={index + 1} />
          ))}
        </div>
      </section>
      )}

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
    <div className="min-w-0 rounded-none border-2 border-[var(--border)] bg-[var(--card)] p-2">
      <Icon className="mb-2 h-3.5 w-3.5 text-[var(--ocean)]" aria-hidden="true" />
      <strong className="block truncate font-serif text-lg font-black leading-none">{value}</strong>
      <span className="mt-1 block truncate font-mono text-[0.62rem] font-black uppercase text-[var(--muted)]">{label}</span>
    </div>
  );
}

function DashboardMetric({ icon: Icon, label, value }: { icon: typeof BookOpenCheck; label: string; value: string }) {
  return (
    <div className="rounded-none border-2 border-[var(--border)] bg-[var(--card)] p-3">
      <Icon className="mb-3 h-4 w-4 text-[var(--ocean)]" aria-hidden="true" />
      <strong className="block truncate font-serif text-2xl font-black leading-none">{value}</strong>
      <span className="mt-1 block font-mono text-xs font-black uppercase text-[var(--muted)]">{label}</span>
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
