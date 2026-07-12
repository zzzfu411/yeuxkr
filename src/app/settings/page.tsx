"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { SpeechSettings } from "@/components/korean/speech-settings";
import { Button } from "@/components/ui/button";
import { InlineAlert } from "@/components/ui/inline-alert";
import { PageHeader, SectionHeading, Surface } from "@/components/ui/section";
import { useLearningWorkspace } from "@/lib/learning/workspace";

const ROMANIZATION_OPTIONS = [
  { id: "fade", label: "先显示后淡出", copy: "帮你起步，但不长期依赖。" },
  { id: "always", label: "始终显示", copy: "刚开始学字母时最省力。" },
  { id: "hidden", label: "隐藏", copy: "逼自己直接读韩文。" }
] as const;

export default function SettingsPage() {
  const { workspace, saveProfile } = useLearningWorkspace();
  const profile = workspace.profile;
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  const save = (input: Parameters<typeof saveProfile>[0]) => {
    setStatus(saveProfile(input) ? "saved" : "error");
  };

  return (
    <div className="grid gap-6">
      <PageHeader
        kicker="Settings"
        title="学习设置"
        copy="学习模式、每日时长、罗马音显示和韩语语音都在这里调整。所有设置只保存在本地浏览器。"
        compact
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Surface>
          <SectionHeading kicker="Profile" title="学习偏好" />
          <div className="grid gap-4">
            <label className="grid gap-1 text-sm font-extrabold">
              昵称
              <input
                key={`name-${profile.updatedAt}`}
                className="focus-ring min-h-11 rounded-[8px] border border-[var(--line-strong)] bg-[var(--surface-solid)] px-3"
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
                className="focus-ring min-h-11 rounded-[8px] border border-[var(--line-strong)] bg-[var(--surface-solid)] px-3"
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
                  按路径引导
                </Button>
                <Button
                  type="button"
                  variant={profile.studyMode === "self" ? "primary" : "secondary"}
                  size="sm"
                  aria-pressed={profile.studyMode === "self"}
                  onClick={() => save({ studyMode: "self" })}
                >
                  自由自学
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
                    className={`focus-ring rounded-[8px] border p-3 text-left ${
                      profile.romanization === option.id
                        ? "border-[rgba(79,140,118,0.55)] bg-[rgba(79,140,118,0.12)]"
                        : "border-[var(--line)] bg-[rgba(255,250,240,0.62)]"
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
            {status === "error" ? <InlineAlert>设置没有写入本地存储，请检查浏览器存储权限。</InlineAlert> : null}
          </div>
        </Surface>

        <div className="grid content-start gap-4">
          <Surface>
            <SectionHeading kicker="Speech" title="韩语语音" copy="所有听力练习都用这里选定的语音朗读。" />
            <SpeechSettings />
          </Surface>
          <Surface>
            <SectionHeading kicker="Data" title="备份与迁移" copy="学习数据只存在本浏览器。换设备或清缓存前，用页面顶部的「导出」按钮保存备份文件，再用「导入」恢复。" />
            <p className="flex items-center gap-2 text-sm font-bold text-[var(--muted)]">
              <Save className="h-4 w-4" aria-hidden="true" />
              顶部工具栏：导出 / 导入 / 存储 / 重置
            </p>
          </Surface>
        </div>
      </div>
    </div>
  );
}
