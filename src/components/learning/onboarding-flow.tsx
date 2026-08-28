"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, GraduationCap, Volume2 } from "lucide-react";
import { KoreanInput } from "@/components/korean/korean-input";
import { SpeechSettings } from "@/components/korean/speech-settings";
import { useKoreanVoiceStatus } from "@/components/korean/speech-status";
import { Button } from "@/components/ui/button";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Surface } from "@/components/ui/section";
import { nowIso } from "@/lib/learning/storage";
import type { StudyGoal } from "@/lib/learning/types";
import { useLearningWorkspace } from "@/lib/learning/workspace";
import { speakKorean } from "@/lib/speech";

const GOAL_OPTIONS: Array<{ id: StudyGoal; title: string; copy: string }> = [
  { id: "foundation", title: "系统入门", copy: "从字母到日常对话，按路径稳步推进。" },
  { id: "travel", title: "旅行应急", copy: "先掌握点餐、问路、购物这些马上要用的场景。" },
  { id: "media", title: "追剧看内容", copy: "以听力和真实材料为核心，更快接触原声内容。" }
];

const MINUTES_OPTIONS = [15, 30, 45];

const STEP_TITLES = ["欢迎", "目标", "语音", "键盘"];

export function OnboardingFlow() {
  const router = useRouter();
  const { saveProfile } = useLearningWorkspace();
  const { status: voiceStatus } = useKoreanVoiceStatus();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<StudyGoal>("foundation");
  const [minutes, setMinutes] = useState(30);
  const [typed, setTyped] = useState("");
  const [saveError, setSaveError] = useState(false);

  const typedTarget = typed.trim() === "가";

  const finish = (target: string, input: Parameters<typeof saveProfile>[0]) => {
    if (!saveProfile({ ...input, onboardedAt: nowIso() })) {
      setSaveError(true);
      return;
    }
    router.replace(target);
  };

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-5">
      <div className="flex items-center justify-between">
        <p className="eyebrow">Onboarding · 入门设置</p>
        <ol className="flex gap-2" aria-label="设置进度">
          {STEP_TITLES.map((title, index) => (
            <li
              key={title}
              aria-current={index === step ? "step" : undefined}
              className={`rounded-full px-3 py-1 font-mono text-[0.65rem] font-black uppercase ${
                index === step
                  ? "bg-[var(--ink)] text-[var(--surface-solid)]"
                  : index < step
                    ? "bg-[rgba(79,140,118,0.16)] text-[var(--celadon)]"
                    : "bg-[rgba(24,28,27,0.06)] text-[var(--muted)]"
              }`}
            >
              {title}
            </li>
          ))}
        </ol>
      </div>

      {step === 0 ? (
        <Surface>
          <GraduationCap className="h-8 w-8 text-[var(--celadon)]" aria-hidden="true" />
          <h1 className="mt-3 font-serif text-4xl font-black leading-tight">你好，欢迎来学韩语。</h1>
          <p className="mt-3 max-w-xl leading-7 text-[var(--muted)]">
            接下来的三步会把学习目标、发音和韩文输入都准备好，大概需要三分钟。之后你会直接进入第一课：认识韩文的拼块系统。
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button type="button" size="lg" onClick={() => setStep(1)}>
              我是零基础，从头开始
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={() => finish("/", { studyMode: "self" })}
            >
              我已有基础，直接进工作台
            </Button>
          </div>
        </Surface>
      ) : null}

      {step === 1 ? (
        <Surface>
          <h1 className="font-serif text-3xl font-black leading-tight">这次学韩语，最想先做到什么？</h1>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {GOAL_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={goal === option.id}
                className={`focus-ring rounded-[8px] border p-4 text-left transition hover:-translate-y-0.5 ${
                  goal === option.id
                    ? "border-[rgba(79,140,118,0.55)] bg-[rgba(79,140,118,0.12)]"
                    : "border-[var(--line)] bg-[rgba(255,250,240,0.62)]"
                }`}
                onClick={() => setGoal(option.id)}
              >
                <strong className="font-serif text-xl font-black">{option.title}</strong>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{option.copy}</p>
              </button>
            ))}
          </div>
          <h2 className="mt-6 font-serif text-2xl font-black">每天大概能学多久？</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {MINUTES_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={minutes === option}
                className={`focus-ring min-h-11 rounded-[8px] border px-5 font-mono text-sm font-black ${
                  minutes === option
                    ? "border-[rgba(23,63,115,0.4)] bg-[rgba(23,63,115,0.1)] text-[var(--ocean)]"
                    : "border-[var(--line)] bg-[rgba(255,250,240,0.62)] text-[var(--muted)]"
                }`}
                onClick={() => setMinutes(option)}
              >
                {option} 分钟
              </button>
            ))}
          </div>
          <div className="mt-6 flex justify-between gap-3">
            <Button type="button" variant="secondary" onClick={() => setStep(0)}>
              上一步
            </Button>
            <Button type="button" onClick={() => setStep(2)}>
              下一步：检查发音
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </Surface>
      ) : null}

      {step === 2 ? (
        <Surface>
          <h1 className="font-serif text-3xl font-black leading-tight">先确认你能听到韩语。</h1>
          <p className="mt-3 max-w-xl leading-7 text-[var(--muted)]">
            听力练习靠系统的韩语语音朗读。点一下试听，如果听到自然的“<span lang="ko">안녕하세요</span>”（你好）就没问题。
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button type="button" size="lg" onClick={() => speakKorean("안녕하세요")}>
              <Volume2 className="h-5 w-5" aria-hidden="true" />
              试听 <span lang="ko">안녕하세요</span>
            </Button>
            {voiceStatus === "ready" ? (
              <span className="flex items-center gap-1 text-sm font-bold text-[var(--celadon)]">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                已检测到韩语语音
              </span>
            ) : null}
          </div>
          {voiceStatus === "missing" || voiceStatus === "unsupported" ? (
            <InlineAlert className="mt-4">
              {voiceStatus === "unsupported"
                ? "当前浏览器不支持语音朗读，建议换用 Chrome / Edge / Safari。没有语音也可以先学，之后再补。"
                : "没有检测到韩语语音包。可以先继续学习，之后按提示在系统里安装韩语语音（Windows：设置 → 时间和语言 → 语音 → 添加 한국어）。"}
            </InlineAlert>
          ) : null}
          <details className="mt-4 text-sm text-[var(--muted)]">
            <summary className="cursor-pointer font-bold">调整语音和语速</summary>
            <SpeechSettings className="mt-3" />
          </details>
          <div className="mt-6 flex justify-between gap-3">
            <Button type="button" variant="secondary" onClick={() => setStep(1)}>
              上一步
            </Button>
            <Button type="button" onClick={() => setStep(3)}>
              下一步：试打韩文
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </Surface>
      ) : null}

      {step === 3 ? (
        <Surface>
          <h1 className="font-serif text-3xl font-black leading-tight">用屏幕键盘打出第一个韩文字。</h1>
          <p className="mt-3 max-w-xl leading-7 text-[var(--muted)]">
            练习里会有输入题，不需要安装韩语输入法。点开“韩文键盘”，先按 <strong className="hangul-display" lang="ko">ㄱ</strong>，再按{" "}
            <strong className="hangul-display" lang="ko">ㅏ</strong>，它们会自动拼成 <strong className="hangul-display" lang="ko">가</strong>。完成这一步后才能进入第一课。
          </p>
          <div className="mt-5">
            <KoreanInput value={typed} onChange={setTyped} placeholder="目标：가" ariaLabel="试打韩文" />
          </div>
          {typedTarget ? (
            <p className="mt-3 flex items-center gap-2 font-bold text-[var(--celadon)]">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
              成功！你已经拼出了第一个韩文音节。
            </p>
          ) : null}
          {saveError ? (
            <InlineAlert className="mt-4">设置没有写入本地存储，请检查浏览器存储权限后重试。</InlineAlert>
          ) : null}
          <div className="mt-6 flex flex-wrap justify-between gap-3">
            <Button type="button" variant="secondary" onClick={() => setStep(2)}>
              上一步
            </Button>
            <Button
              type="button"
              size="lg"
              disabled={!typedTarget}
              onClick={() => finish("/learn/l01-hangul-map", { studyMode: "guided", selfStudyGoal: goal, minutesGoal: minutes })}
            >
              完成设置，开始第一课
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Button>
          </div>
        </Surface>
      ) : null}

      <p className="text-center text-xs font-bold text-[var(--muted)]">
        所有设置都保存在本地，之后可以随时在 <Link className="underline" href="/settings">设置</Link> 里修改。
      </p>
    </div>
  );
}
