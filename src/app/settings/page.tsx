"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { LearningDataPanel } from "@/components/layout/learning-data-panel";
import { EmbeddedPage } from "@/components/layout/embedded-page";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { SpeechSettings } from "@/components/korean/speech-settings";
import { Button } from "@/components/ui/button";
import { InlineAlert } from "@/components/ui/inline-alert";
import { PageHeader, SectionHeading, Surface } from "@/components/ui/section";
import { useLearningWorkspace } from "@/lib/learning/use-learning-workspace";

const SelfStudyPage = dynamic(() => import("@/app/self-study/page"), { loading: () => <p role="status">正在打开学习计划…</p> });

const ROMANIZATION_OPTIONS = [
  { id: "fade", label: "起步后折叠", copy: "前 6 课直接显示，之后按需点开。" },
  { id: "always", label: "始终显示", copy: "词汇和课程里一直保留读音提示。" },
  { id: "hidden", label: "完全隐藏", copy: "只看韩文与 IPA，不显示罗马音。" }
] as const;

export default function SettingsPage() {
  const { workspace, saveProfile } = useLearningWorkspace();
  const profile = workspace.profile;
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [view, setView] = useState<"preferences" | "plan">("preferences");

  useEffect(() => {
    const syncFromUrl = () => {
      const requested = new URLSearchParams(window.location.search).get("view");
      if (requested === "plan" || requested === "preferences") setView(requested);
    };
    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, []);

  const switchView = (nextView: "preferences" | "plan") => {
    setView(nextView);
    try {
      const url = new URL(window.location.href);
      if (nextView === "plan") url.searchParams.set("view", "plan");
      else url.searchParams.delete("view");
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    } catch {
      // History updates are optional in restricted environments.
    }
  };

  const save = (input: Parameters<typeof saveProfile>[0]) => {
    setStatus(saveProfile(input) ? "saved" : "error");
  };

  return (
    <div className="grid gap-6">
      <PageHeader
        kicker="설정 · 设置"
        title="我的学习"
        copy="按自己的节奏，慢慢来。"
        compact
      >
        <div className="personal-tools"><ThemeToggle /><LearningDataPanel /></div>
      </PageHeader>

      <div className="studio-tabs" role="group" aria-label="个人空间">
        <button type="button" className="focus-ring" aria-pressed={view === "preferences"} onClick={() => switchView("preferences")}>偏好</button>
        <button type="button" className="focus-ring" aria-pressed={view === "plan"} onClick={() => switchView("plan")}>计划与记录</button>
      </div>

      {view === "plan" ? <div className="grid gap-6">
        <div className="personal-progress" aria-label="练习轨迹">
          <p><strong>{workspace.stats.practiceItems}</strong><span>练习记录</span></p>
          <p><strong>{workspace.stats.weakPracticeItems}</strong><span>待巩固</span></p>
          <p><strong>{workspace.stats.outputEntries}</strong><span>写作与复述</span></p>
          <p><strong>{workspace.proficiency.current.band}</strong><span>站内参考阶段</span></p>
        </div>
        <EmbeddedPage><SelfStudyPage /></EmbeddedPage>
      </div> : (

      <div className="grid gap-4 lg:grid-cols-2">
        <Surface>
          <SectionHeading kicker="공부 방식 · 学习方式" title="学习偏好" />
          <div className="grid gap-4">
            <label className="grid gap-1 text-sm font-extrabold">
              昵称
              <input
                key={`name-${profile.updatedAt}`}
                className="focus-ring min-h-11 rounded-none border border-[var(--line-strong)] bg-[var(--surface-solid)] px-3"
                defaultValue={profile.name}
                onBlur={(event) => {
                  const next = event.currentTarget.value.trim();
                  if (next && next !== profile.name) save({ name: next });
                }}
                autoComplete="off"
              />
            </label>
            <label className="grid gap-1 text-sm font-extrabold">
              每日学习分钟
              <input
                key={`minutes-${profile.updatedAt}`}
                type="number"
                min={5}
                max={120}
                className="focus-ring min-h-11 rounded-none border border-[var(--line-strong)] bg-[var(--surface-solid)] px-3"
                defaultValue={profile.minutesGoal}
                onBlur={(event) => {
                  const next = Number(event.currentTarget.value);
                  if (Number.isFinite(next) && next !== profile.minutesGoal) save({ minutesGoal: next });
                }}
              />
            </label>
            <div className="grid gap-1 text-sm font-extrabold">
              学习模式
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={profile.studyMode === "guided" ? "primary" : "secondary"}
                  size="sm"
                  aria-pressed={profile.studyMode === "guided"}
                  onClick={() => save({ studyMode: "guided" })}
                >
                  按路径
                </Button>
                <Button
                  type="button"
                  variant={profile.studyMode === "self" ? "primary" : "secondary"}
                  size="sm"
                  aria-pressed={profile.studyMode === "self"}
                  onClick={() => save({ studyMode: "self" })}
                >
                  自学
                </Button>
              </div>
            </div>
            <div className="grid gap-1 text-sm font-extrabold">
              罗马音显示
              <div className="grid gap-2 sm:grid-cols-3">
                {ROMANIZATION_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={profile.romanization === option.id}
                    className={`focus-ring rounded-none border p-3 text-left ${
                      profile.romanization === option.id
                        ? "border-[var(--green)] bg-[var(--green-soft)]"
                        : "border-[var(--line)] bg-[var(--card)]"
                    }`}
                    onClick={() => save({ romanization: option.id })}
                  >
                    <strong>{option.label}</strong>
                    <p className="mt-1 text-xs font-bold leading-5 text-[var(--muted)]">{option.copy}</p>
                  </button>
                ))}
              </div>
            </div>
            {status === "saved" ? <InlineAlert tone="success">设置已保存。</InlineAlert> : null}
            {status === "error" ? <InlineAlert>设置没有保存。请允许本站使用浏览器存储后重试。</InlineAlert> : null}
          </div>
        </Surface>

        <div className="grid content-start gap-4">
          <Surface>
            <SectionHeading kicker="한국어 소리 · 韩语语音" title="韩语语音" copy="课程优先播放配套录音。没有配套录音的动态文本使用这里选定的系统备用语音。" />
            <SpeechSettings />
          </Surface>
          <Surface>
            <SectionHeading kicker="내 기록 · 学习记录" title="备份与迁移" copy="学习数据保存在当前浏览器。换设备或清理缓存前，从本页上方的「学习数据」导出备份，在新设备导入。麦克风录音需要在新设备重新录制。" />
          </Surface>
        </div>
      </div>
      )}
    </div>
  );
}
