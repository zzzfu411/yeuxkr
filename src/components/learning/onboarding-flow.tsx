"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Volume2 } from "lucide-react";
import { VisualPanel } from "@/components/assets/visual-panel";
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
  const [heardSample, setHeardSample] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const canSkipVoice = voiceStatus === "missing" || voiceStatus === "unsupported";
  const voiceReadyToContinue = heardSample || canSkipVoice;

  const typedTarget = typed.trim() === "가";

  const finish = (target: string, input: Parameters<typeof saveProfile>[0]) => {
    if (!saveProfile({ ...input, onboardedAt: nowIso() })) {
      setSaveError(true);
      return;
    }
    router.replace(target);
  };

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-5">
      <div className="grid gap-3 border-b border-[var(--line)] pb-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <p className="eyebrow">Onboarding · 入门设置</p>
        <ol className="grid grid-cols-4 gap-px border-x border-[var(--line)]" aria-label="设置进度">
          {STEP_TITLES.map((title, index) => (
            <li
              key={title}
              aria-current={index === step ? "step" : undefined}
              className={`relative min-w-14 border-y border-[var(--line)] px-2 py-1.5 text-center text-xs transition-colors ${
                index === step
                  ? "bg-[color-mix(in_srgb,var(--seal)_7%,var(--paper-hi))] text-[var(--seal)]"
                  : index < step
                    ? "bg-[var(--wash-2)] text-[var(--ink)]"
                    : "bg-transparent text-[var(--muted)]"
              }`}
            >
              <span className="mr-1 font-[family-name:var(--font-script)] text-[0.7rem]" aria-hidden="true">
                0{index + 1}
              </span>
              {title}
              {index === step ? (
                <span className="absolute inset-x-2 -bottom-px h-px bg-[var(--seal)]" aria-hidden="true" />
              ) : null}
            </li>
          ))}
        </ol>
      </div>

      {step === 0 ? (
        <Surface className="p-0 md:p-0">
          <div className="grid lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
            <div className="paper-rail relative p-5 pt-8 md:p-8 md:pt-10">
              <p className="eyebrow">첫 장 · First leaf</p>
              <h1 className="inkline mt-3 font-serif text-4xl font-normal leading-tight md:text-5xl">你好，欢迎来学韩语。</h1>
              <p className="mt-4 max-w-xl leading-7 text-[var(--muted)]">
                接下来的三步会把学习目标、发音和韩文输入都准备好，大概需要三分钟。之后你会直接进入第一课：认识韩文的拼块系统。
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
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
                <span className="seal-mark ml-auto hidden h-12 w-12 text-sm sm:inline-grid" aria-hidden="true">
                  첫글
                </span>
              </div>
            </div>
            <VisualPanel
              asset="hangul"
              priority
              sizes="(max-width: 1024px) 100vw, 28rem"
              treatment="inset"
              className="min-h-64 rounded-none border-x-0 border-b-0 lg:min-h-full lg:border-l lg:border-t-0"
            />
          </div>
        </Surface>
      ) : null}

      {step === 1 ? (
        <Surface className="paper-rail p-5 pt-8 md:p-8 md:pt-10">
          <p className="eyebrow">둘째 장 · Intention</p>
          <h1 className="inkline mt-3 font-serif text-3xl font-normal leading-tight md:text-4xl">这次学韩语，最想先做到什么？</h1>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {GOAL_OPTIONS.map((option, index) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={goal === option.id}
                className={`focus-ring group relative min-h-40 rounded-none border bg-[color-mix(in_srgb,var(--paper-hi)_62%,transparent)] p-4 text-left shadow-none transition-colors ${
                  goal === option.id
                    ? "border-[var(--seal)] bg-[color-mix(in_srgb,var(--seal)_6%,var(--paper-hi))]"
                    : "border-[var(--line)] hover:border-[var(--ink-mute)] hover:bg-[var(--wash-2)]"
                }`}
                onClick={() => setGoal(option.id)}
              >
                <span className={`font-[family-name:var(--font-script)] text-sm ${goal === option.id ? "text-[var(--seal)]" : "text-[var(--muted)]"}`} aria-hidden="true">
                  note 0{index + 1}
                </span>
                <strong className="mt-2 block font-serif text-2xl font-normal">{option.title}</strong>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{option.copy}</p>
                {goal === option.id ? (
                  <span className="absolute bottom-3 right-3 h-3 w-3 border border-[var(--seal)]" aria-hidden="true" />
                ) : null}
              </button>
            ))}
          </div>
          <h2 className="mt-7 font-serif text-2xl font-normal">每天大概能学多久？</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {MINUTES_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={minutes === option}
                className={`focus-ring min-h-11 rounded-none border px-5 text-sm transition-colors ${
                  minutes === option
                    ? "border-[var(--seal)] bg-[color-mix(in_srgb,var(--seal)_6%,var(--paper-hi))] text-[var(--seal)]"
                    : "border-[var(--line)] bg-[color-mix(in_srgb,var(--paper-hi)_62%,transparent)] text-[var(--muted)] hover:border-[var(--ink-mute)]"
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
        <Surface className="paper-rail p-5 pt-8 md:p-8 md:pt-10">
          <p className="eyebrow">셋째 장 · Voice check</p>
          <h1 className="inkline mt-3 font-serif text-3xl font-normal leading-tight md:text-4xl">先确认你能听到韩语。</h1>
          <p className="mt-3 max-w-xl leading-7 text-[var(--muted)]">
            听力练习靠系统的韩语语音朗读。点一下试听，如果听到自然的“<span lang="ko">안녕하세요</span>”（你好）就没问题。
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button type="button" variant="secondary" size="lg" onClick={() => {
              setHeardSample(true);
              speakKorean("안녕하세요");
            }}>
              <Volume2 className="h-5 w-5" aria-hidden="true" />
              试听 <span lang="ko">안녕하세요</span>
            </Button>
            {voiceStatus === "ready" ? (
              <span className="flex items-center gap-1 text-sm text-[var(--ink-soft)]">
                <CheckCircle2 className="h-4 w-4 text-[var(--seal)]" aria-hidden="true" />
                已检测到韩语语音
              </span>
            ) : null}
          </div>
          {voiceStatus === "missing" || voiceStatus === "unsupported" ? (
            <InlineAlert className="mt-4 border border-[var(--line)] bg-[var(--wash-2)] text-[var(--ink-soft)] shadow-none">
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
            <Button type="button" disabled={!voiceReadyToContinue} onClick={() => setStep(3)}>
              {canSkipVoice ? "暂时没声音，先去打字" : heardSample ? "下一步：试打韩文" : "先点试听"}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </Surface>
      ) : null}

      {step === 3 ? (
        <Surface className="paper-rail p-5 pt-8 md:p-8 md:pt-10">
          <p className="eyebrow">넷째 장 · First syllable</p>
          <h1 className="inkline mt-3 font-serif text-3xl font-normal leading-tight md:text-4xl">用屏幕键盘打出第一个韩文字。</h1>
          <p className="mt-3 max-w-xl leading-7 text-[var(--muted)]">
            练习里会有输入题，不需要安装韩语输入法。点开“韩文键盘”，先按 <strong className="hangul-display" lang="ko">ㄱ</strong>，再按{" "}
            <strong className="hangul-display" lang="ko">ㅏ</strong>，它们会自动拼成 <strong className="hangul-display" lang="ko">가</strong>。完成这一步后才能进入第一课。
          </p>
          <div className="mt-5">
            <KoreanInput value={typed} onChange={setTyped} placeholder="目标：가" ariaLabel="试打韩文" />
          </div>
          {typedTarget ? (
            <p className="mt-3 flex items-center gap-2 text-[var(--ink-soft)]">
              <CheckCircle2 className="h-5 w-5 text-[var(--seal)]" aria-hidden="true" />
              成功！你已经拼出了第一个韩文音节。
            </p>
          ) : null}
          {saveError ? (
            <InlineAlert className="mt-4 border border-[var(--seal)] bg-[var(--seal-soft)] shadow-none">设置没有写入本地存储，请检查浏览器存储权限后重试。</InlineAlert>
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

      <p className="text-center text-xs leading-5 text-[var(--muted)]">
        所有设置都保存在本地，之后可以随时在 <Link className="underline decoration-[var(--line)] underline-offset-4 hover:text-[var(--ink)]" href="/settings">设置</Link> 里修改。
      </p>
    </div>
  );
}
