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
    ? { href: "/onboarding", title: "完成三分钟入门", detail: "选好目标，试听韩语，再打出一个韩文字。", minutes: 3 }
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
    <div className="home-flow">
      <section className="home-hero">
        <VisualPanel asset="hero" priority sizes="100vw" treatment="ambient" className="absolute inset-0 border-0" />
        <div className="home-hero__meta" aria-hidden="true">
          <span>EP. TODAY</span>
          <span>봄비 · 春雨</span>
        </div>
        <div className="home-hero__inner">
          <div className="home-hero__copy">
            <p className="eyebrow">오늘의 장면 · {profile.minutesGoal} 分钟</p>
            <h1>今天，只学这一小段。</h1>
            <p className="hangul-display" lang="ko">오늘은, 여기까지 함께.</p>
            {heroAction ? (
              <div className="home-hero__next">
                <p>下一幕 · {heroAction.minutes} 分钟</p>
                <strong>{heroAction.title}</strong>
                <span>{heroAction.detail}</span>
              </div>
            ) : null}
            <div className="home-hero__actions">
              {heroAction ? (
                <Button asChild size="lg">
                  <Link href={heroAction.href}>
                    开始这一集
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
        </div>
      </section>

      <LearningCompass workspace={workspace} active="workspace" condensed isFirstVisit={isFirstVisit} />

      <section>
        <SectionHeading
          kicker={isFirstVisit ? "프롤로그 · 序幕" : "오늘의 세 장면 · 今天"}
          title={isFirstVisit ? "先从序幕开始" : "今天的三幕"}
          copy={isFirstVisit ? "先用三分钟选好目标、听一句韩语，再进入第一课。" : "先从第一幕开始。每完成一项，后面的顺序会按你的进度重新整理。"}
        />
        <div className="episode-list">
          {(isFirstVisit ? [ONBOARDING_TASK] : workspace.recommended.slice(0, 3)).map((task, index) => (
            <TaskCard key={task.id} task={task} featured={index === 0} index={index + 1} />
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
        <Surface>
          <SectionHeading
            kicker="이번 계절 · 这一季"
            title="你已经走到这里"
            copy="这里只根据你完成的课程、复习和输出更新。等级是站内学习参考，不是 CEFR 证书。"
          />
          <div className="season-progress">
            <span className="eyebrow">{workspace.proficiency.current.band}</span>
            <h3>{workspace.proficiency.current.title}</h3>
            <p>{workspace.proficiency.current.summary}</p>
          </div>
        </Surface>

        <Surface>
          <SectionHeading kicker="다른 장면 · 换个场景" title="今天想自己选，也可以。" copy="直接打开任意模块，课程进度和复习安排仍会照常保存。" />
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
                  学习方式没有保存。请释放浏览器空间后再试。
                </p>
              ) : null}
              {modeStatus === "saved" ? (
                <p className="rounded-none border border-[var(--green)] bg-[var(--green-soft)] p-3 text-sm font-bold leading-6 text-[var(--celadon)]">
                  {isFirstVisit ? "学习方式已保存。完成入门后，首页会按这个节奏安排今天的内容。" : "学习方式已更新，今天的推荐也已重新排序。"}
                </p>
              ) : null}
              {confirmReset ? (
                <p className="rounded-none border border-[var(--seal)] bg-[var(--seal-soft)] p-3 text-sm font-bold leading-6 text-[var(--cinnabar)]">
                  再点一次会清空学习偏好、课程进度、复习卡、错题、草稿、录音记录和作品集。此操作无法撤销。
                </p>
              ) : null}
            </div>
            <VisualPanel asset="path" sizes="(max-width: 768px) 100vw, 14rem" treatment="inset" objectPosition="center" className="min-h-48 border-0" />
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
          kicker="모든 장면 · 全部"
          title="想练哪一段，就从哪里进去"
          copy="无论从哪里开始，学习记录、错题和复习安排都会保存在同一份本地进度里。"
        />
        <div className="open-scenes-grid">
          {workspace.openStudy.map((task, index) => (
            <TaskCard key={task.id} task={task} compact index={index + 1} />
          ))}
        </div>
      </section>
      )}

      <section className="season-credits" aria-label="学习内容规模">
        <Metric label="核心课程" value={String(contentCounts.lessons)} />
        <Metric label="韩文字母/规则" value={String(contentCounts.hangul)} />
        <Metric label="词汇" value={String(contentCounts.vocab)} />
        <Metric label="语法点" value={String(contentCounts.grammar)} />
        <Metric label="语用场景" value={String(contentCounts.pragmatics)} />
        <Metric label="语义细差" value={String(contentCounts.nuance)} />
        <Metric label="情境听读" value={String(contentCounts.materials)} />
        <Metric label="写作与复述" value={String(workspace.stats.outputEntries)} />
        <Metric label="练习轨迹" value={`${workspace.stats.weakPracticeItems}/${workspace.stats.practiceItems}`} />
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
