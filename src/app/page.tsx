"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, MapPinned, RefreshCcw, Settings2 } from "lucide-react";
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
  const { workspace, saveProfile } = useLearningWorkspace();
  const isFirstVisit = needsOnboardingFunnel(workspace.profile, workspace.progress);
  const [resetStatus, setResetStatus] = useState<"idle" | "success" | "error">("idle");
  const [confirmReset, setConfirmReset] = useState(false);
  const [modeStatus, setModeStatus] = useState<"idle" | "saved" | "error">("idle");
  const profile = workspace.profile;
  const primary = workspace.recommended[0];
  const heroAction = isFirstVisit
    ? { href: "/onboarding", title: "完成三分钟入门设置", detail: "选目标、试听韩语并完成键盘检查。", minutes: 3 }
    : primary;
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
      <section className="relative w-full min-w-0 max-w-full overflow-hidden border-b border-[var(--line)]">
        <VisualPanel asset="hero" priority sizes="100vw" treatment="ambient" className="absolute inset-0 rounded-none border-0" />
        <div className="relative z-10 flex min-h-[34rem] items-end p-5 pb-10 md:min-h-[38rem] md:p-10 md:pb-12">
          <div className="relative flex w-full max-w-2xl flex-col justify-end">
            <p className="eyebrow">오늘의 한국어 · {profile.minutesGoal} min</p>
            <h1 className="inkline mt-3 w-fit max-w-full font-serif text-5xl font-normal leading-[1.04] tracking-normal md:text-6xl">
              Kirina Korean
            </h1>
            <p className="hangul-display mt-2 text-xl text-[var(--ink-soft)]" lang="ko">오늘, 한 장의 한국어.</p>
            {heroAction ? (
              <div className="mt-6 max-w-xl border-l border-[var(--seal)] pl-4">
                <p className="font-script text-sm text-[var(--muted)]">Next · {heroAction.minutes} min</p>
                <p className="mt-1 font-serif text-2xl leading-tight">{heroAction.title}</p>
                <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{heroAction.detail}</p>
              </div>
            ) : null}
            <div className="mt-6 flex w-full min-w-0 flex-wrap gap-3">
              {heroAction ? (
                <Button asChild size="lg">
                  <Link href={heroAction.href}>
                    开始今日一页
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
              ) : null}
              {isFirstVisit ? null : (
                <Button asChild variant="ghost" size="lg">
                  <Link href="/self-study">
                    <Settings2 className="h-5 w-5" />
                    调整节奏
                  </Link>
                </Button>
              )}
            </div>
          </div>
          <span className="seal-mark absolute bottom-8 right-6 hidden h-14 w-14 text-lg md:inline-grid" aria-hidden="true">한글</span>
        </div>
      </section>

      <LearningCompass workspace={workspace} active="workspace" condensed isFirstVisit={isFirstVisit} />

      <section>
        <SectionHeading
          kicker="오늘 · Today"
          title="今日一页"
          copy={isFirstVisit ? "先完成三分钟入门，确认目标和韩文输入后再进第一课。" : "从最该处理的一项开始；完成后，今日顺序会按复习、主线和短板重新整理。"}
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
          <div className="grid gap-3 rounded-none border border-[var(--line)] bg-[var(--wash-1)] p-4">
            <span className="eyebrow">{workspace.proficiency.current.band}</span>
            <h3 className="font-serif text-3xl leading-tight">{workspace.proficiency.current.title}</h3>
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
                  {isFirstVisit ? "学习模式已记下。完成入门后，首页会按这个节奏整理今日页。" : "学习模式已更新，首页推荐会按新的节奏重新排序。"}
                </p>
              ) : null}
              {confirmReset ? (
                <p className="rounded-none border border-[var(--seal)] bg-[var(--seal-soft)] p-3 text-sm font-bold leading-6 text-[var(--cinnabar)]">
                  再点一次将清空学习偏好、课程进度、SRS、错题、输出、草稿、录音引用和母语作品集；此操作无法撤销。
                </p>
              ) : null}
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-[var(--line)] p-3">
      <strong className="block font-serif text-2xl font-normal">{value}</strong>
      <span className="break-words font-script text-xs text-[var(--muted)]">{label}</span>
    </div>
  );
}
