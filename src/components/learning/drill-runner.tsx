"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CircleSlash2, Volume2 } from "lucide-react";
import { VisualPanel } from "@/components/assets/visual-panel";
import { Button } from "@/components/ui/button";
import { KoreanInput } from "@/components/korean/korean-input";
import { useKoreanVoiceStatus } from "@/components/korean/speech-status";
import { hasKoreanText } from "@/lib/learning/evidence";
import { mistakeCardId } from "@/lib/learning/ids";
import { checkAnswer, type Question } from "@/lib/learning/quiz";
import { recordMistake } from "@/lib/learning/srs";
import {
  isGestureBlockedPlaybackError,
  speakKorean,
  stopSpeech
} from "@/lib/speech";

const INTERACTIVE_TARGET_SELECTOR = [
  "button",
  "a",
  "summary",
  "select",
  'input[type="button"]',
  'input[type="submit"]',
  'input[type="reset"]',
  'input[type="file"]',
  '[role="button"]',
  '[role="checkbox"]',
  '[role="combobox"]',
  '[role="grid"]',
  '[role="gridcell"]',
  '[role="link"]',
  '[role="listbox"]',
  '[role="menu"]',
  '[role="menubar"]',
  '[role="menuitem"]',
  '[role="menuitemcheckbox"]',
  '[role="menuitemradio"]',
  '[role="option"]',
  '[role="radio"]',
  '[role="radiogroup"]',
  '[role="scrollbar"]',
  '[role="searchbox"]',
  '[role="separator"]',
  '[role="slider"]',
  '[role="spinbutton"]',
  '[role="switch"]',
  '[role="tab"]',
  '[role="tablist"]',
  '[role="textbox"]',
  '[role="toolbar"]',
  '[role="tree"]',
  '[role="treegrid"]',
  '[role="treeitem"]',
  '[role][tabindex]:not([tabindex="-1"])'
].join(", ");

export interface AnswerEntry {
  question: Question;
  answer: string;
  correct: boolean;
  skipped?: boolean;
}

export interface DrillRunnerSavedAnswer {
  questionId: string;
  answer: string;
  correct: boolean;
  skipped?: boolean;
}

interface RunnerProgress {
  index: number;
  answers: DrillRunnerSavedAnswer[];
  finished: boolean;
}

interface ResultContext {
  score: number;
  answers: AnswerEntry[];
  finish: () => void;
}

type AudioPlaybackStatus = "pending" | "started" | "failed" | "needs-gesture";
type AudioPlaybackState = { questionId: string; status: AudioPlaybackStatus };

function playQuestionAudio(
  question: Pick<Question, "id" | "speak">,
  setAudioPlayback: (next: AudioPlaybackState | ((current: AudioPlaybackState) => AudioPlaybackState)) => void,
  rate?: number
) {
  if (!question.speak) return false;
  const questionId = question.id;
  return speakKorean(question.speak, {
    ...(rate === undefined ? {} : { rate }),
    onstart: () => setAudioPlayback((current) => current.questionId === questionId
      ? { questionId, status: "started" }
      : current),
    onerror: (event: unknown) => setAudioPlayback((current) => current.questionId === questionId
      ? { questionId, status: isGestureBlockedPlaybackError(event) ? "needs-gesture" : "failed" }
      : current)
  });
}

export function DrillRunner({
  questions,
  finishLabel,
  recordMistakes = true,
  emptyState,
  resultAddon,
  onAnswer,
  onProgress,
  initialAnswers = [],
  initialIndex = 0,
  initialFinished = false,
  onResult,
  onFinish
}: {
  questions: Question[];
  finishLabel: string;
  recordMistakes?: boolean;
  emptyState?: {
    title?: string;
    detail?: string;
    action?: ReactNode;
  };
  resultAddon?: (context: ResultContext) => ReactNode;
  onAnswer?: (answer: AnswerEntry) => boolean | void;
  onProgress?: (progress: RunnerProgress) => void;
  initialAnswers?: DrillRunnerSavedAnswer[];
  initialIndex?: number;
  initialFinished?: boolean;
  onResult?: (score: number, answers: AnswerEntry[]) => void;
  onFinish?: (score: number, answers: AnswerEntry[]) => void;
}) {
  const { status: voiceStatus } = useKoreanVoiceStatus();
  const initialState = useMemo(() => buildInitialState(questions, initialAnswers, initialIndex, initialFinished), [initialAnswers, initialFinished, initialIndex, questions]);
  const [index, setIndex] = useState(initialState.index);
  const [answers, setAnswers] = useState<AnswerEntry[]>(initialState.answers);
  const [value, setValue] = useState(initialState.value);
  const [finished, setFinished] = useState(initialState.finished);
  const [srsError, setSrsError] = useState("");
  const [audioPlayback, setAudioPlayback] = useState<AudioPlaybackState>({
    questionId: "",
    status: "pending"
  });
  const emittedResultRef = useRef("");
  const playedListenRef = useRef("");
  const submitRef = useRef<() => void>(() => {});
  const questionHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const feedbackRef = useRef<HTMLDivElement | null>(null);
  const resultHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const question = questions[index];
  const existing = answers[index];
  const hasExistingAnswer = Boolean(existing);
  const questionId = question?.id;
  const questionSpeak = question?.speak;
  const questionType = question?.type;
  const audioQuestion = isAudioQuestion(question);
  const currentPlaybackStatus = audioPlayback.questionId === question?.id ? audioPlayback.status : "pending";
  const audioCheckPending = audioQuestion && !existing && (voiceStatus === "loading" || (voiceStatus === "ready" && currentPlaybackStatus === "pending"));
  const audioNeedsGesture = audioQuestion && !existing && currentPlaybackStatus === "needs-gesture";
  const audioUnavailable = audioQuestion && (
    voiceStatus === "missing" || voiceStatus === "unsupported" || currentPlaybackStatus === "failed"
  );
  const previousViewRef = useRef({
    questionId: question?.id ?? "",
    answered: Boolean(existing),
    finished
  });
  const answeredCount = useMemo(() => answers.filter(Boolean).length, [answers]);
  const scoredAnswers = useMemo(() => answers.filter((item) => !item.skipped), [answers]);
  const skippedCount = answers.length - scoredAnswers.length;
  const score = useMemo(() => {
    if (!scoredAnswers.length) return 0;
    return Math.round((scoredAnswers.filter((item) => item.correct).length / scoredAnswers.length) * 100);
  }, [scoredAnswers]);
  const resultSignature = useMemo(() => {
    if (!finished || !answers.length) return "";
    return answers.map((entry) => `${entry.question.id}:${entry.skipped ? "skip" : entry.correct ? "1" : "0"}:${entry.answer}`).join("|");
  }, [answers, finished]);

  useEffect(() => {
    if (!finished || !onResult || !resultSignature) return;
    if (emittedResultRef.current === resultSignature) return;
    emittedResultRef.current = resultSignature;
    onResult(score, answers);
  }, [answers, finished, onResult, resultSignature, score]);

  useEffect(() => {
    if (finished || !questionId || !questionSpeak || voiceStatus !== "ready") return;
    if (questionType !== "listen" && questionType !== "dictation") return;
    if (hasExistingAnswer) return;
    if (playedListenRef.current === questionId) return;
    let active = true;
    let playbackStarted = false;
    let playbackTimeout: number | undefined;
    setAudioPlayback({ questionId, status: "pending" });
    queueMicrotask(() => {
      if (!active || playedListenRef.current === questionId) return;
      playedListenRef.current = questionId;
      playbackStarted = true;
      const started = playQuestionAudio({ id: questionId, speak: questionSpeak }, setAudioPlayback);
      if (!active) return;
      if (!started) {
        setAudioPlayback({ questionId, status: "failed" });
        return;
      }
      playbackTimeout = window.setTimeout(() => {
        if (!active) return;
        setAudioPlayback((current) => {
          if (current.questionId !== questionId || current.status !== "pending") {
            return current;
          }
          return { questionId, status: started ? "started" : "failed" };
        });
      }, 5000);
    });
    return () => {
      active = false;
      if (playbackTimeout !== undefined) window.clearTimeout(playbackTimeout);
      if (playbackStarted) {
        stopSpeech();
        if (playedListenRef.current === questionId) playedListenRef.current = "";
      }
    };
  }, [finished, hasExistingAnswer, index, questionId, questionSpeak, questionType, voiceStatus]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (finished || !question) return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      const isInteractiveControl = Boolean(target?.closest(INTERACTIVE_TARGET_SELECTOR));
      const isTextEntry =
        tag === "TEXTAREA" ||
        Boolean(target?.isContentEditable) ||
        (tag === "INPUT" && !["radio", "checkbox", "button"].includes((target as HTMLInputElement).type));
      if (event.defaultPrevented || isTextEntry || isInteractiveControl) return;
      if (event.key === "Enter") {
        event.preventDefault();
        submitRef.current();
        return;
      }
      if ((question.choices?.length ?? 0) > 0 && !answers[index]) {
        const choiceIndex = Number(event.key);
        const choices = question.choices ?? [];
        if (Number.isInteger(choiceIndex) && choiceIndex >= 1 && choiceIndex <= choices.length) {
          event.preventDefault();
          setValue(choices[choiceIndex - 1]);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [answers, finished, index, question]);

  const submit = () => {
    if (!question) return;
    if (existing) {
      if (index < questions.length - 1) {
        moveToIndex(index + 1, answers, false);
      } else {
        setFinished(true);
        emitProgress(index, answers, true);
      }
      return;
    }
    if (!value.trim()) return;
    const answer = value;
    const correct = checkAnswer(question, answer);
    const next = [...answers];
    const entry = { question, answer, correct };
    next[index] = entry;
    if (!correct && recordMistakes) {
      const mistakeCard = recordMistake(mistakeCardId(question.id), {
        kind: "mistake",
        itemId: question.id,
        type: question.type,
        prompt: question.prompt,
        answer: question.answer,
        acceptable: question.acceptable,
        choices: question.choices,
        explain: question.explain,
        speak: question.speak,
        clozeText: question.clozeText,
        hint: question.hint
      });
      if (!mistakeCard) {
        setSrsError("错题没有写入本地复习队列，请释放浏览器存储空间后再继续。");
        return;
      }
      setSrsError("");
    }
    if (onAnswer?.(entry) === false) return;
    setAnswers(next);
    emitProgress(index, next, false);
  };

  const skipAudioQuestion = () => {
    if (!question || existing || !audioUnavailable) return;
    const entry = { question, answer: "", correct: false, skipped: true };
    if (onAnswer?.(entry) === false) return;
    const next = [...answers];
    next[index] = entry;
    setAnswers(next);
    setSrsError("");
    emitProgress(index, next, false);
  };

  const moveToIndex = (nextIndex: number, nextAnswers = answers, nextFinished = finished) => {
    const clamped = Math.min(Math.max(0, nextIndex), Math.max(0, questions.length - 1));
    setIndex(clamped);
    setValue(nextAnswers[clamped]?.answer ?? "");
    setFinished(nextFinished);
    emitProgress(clamped, nextAnswers, nextFinished);
  };

  const emitProgress = (nextIndex: number, nextAnswers: AnswerEntry[], nextFinished: boolean) => {
    onProgress?.({
      index: nextIndex,
        answers: nextAnswers.filter(Boolean).map((item) => ({
          questionId: item.question.id,
          answer: item.answer,
          correct: item.correct,
          skipped: item.skipped
      })),
      finished: nextFinished
    });
  };

  useEffect(() => {
    submitRef.current = submit;
  });

  useEffect(() => {
    const previous = previousViewRef.current;
    const questionId = question?.id ?? "";

    if (finished && !previous.finished) {
      resultHeadingRef.current?.focus();
    } else if (!finished && questionId !== previous.questionId) {
      questionHeadingRef.current?.focus();
    } else if (!finished && existing && !previous.answered) {
      feedbackRef.current?.focus();
    }

    previousViewRef.current = {
      questionId,
      answered: Boolean(existing),
      finished
    };
  }, [existing, finished, question?.id]);

  if (!questions.length) {
    return (
      <div className="grid rounded-none border border-[var(--line)] bg-[var(--card)] md:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="p-5">
          <p className="eyebrow">Empty Queue</p>
          <h2 className="mt-2 font-serif text-3xl font-black leading-tight">{emptyState?.title ?? "这里暂时没有题目。"}</h2>
          <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-[var(--muted)]">
            {emptyState?.detail ?? "先完成一些课程、复习卡片或真实材料，系统会自动把可练习内容放到这里。"}
          </p>
          {emptyState?.action ? <div className="mt-4 flex flex-wrap gap-2">{emptyState.action}</div> : null}
        </div>
        <VisualPanel asset="empty" priority decorative className="min-h-52 rounded-none border-0" />
      </div>
    );
  }

  if (finished) {
    return (
      <article className="rounded-none border border-[var(--line)] bg-[var(--card)]">
        <div className="grid md:grid-cols-[minmax(0,1fr)_16rem]">
          <div className="p-5" role="status" aria-live="polite" aria-atomic="true">
            <p className="eyebrow">Result</p>
            <h2 ref={resultHeadingRef} className="focus-ring mt-2 font-serif text-5xl font-black" tabIndex={-1}>{score}%</h2>
            <p className="mt-3 leading-7 text-[var(--muted)]">{score >= 85 ? "这组很稳，可以进入下一步。" : score >= 65 ? "已经有骨架了，把错题再听一遍会更扎实。" : "先不要急着推进，重做这一组更划算。"}</p>
            {skippedCount ? (
              <p className="mt-2 text-sm font-bold leading-6 text-[var(--brass-text)]">
                {skippedCount} 道音频题因设备缺少韩语语音而跳过，未计入分数或听力证据。
              </p>
            ) : null}
          </div>
          <VisualPanel asset={score >= 65 ? "complete" : "review"} className="min-h-48 rounded-none border-0" />
        </div>
        <div className="mt-5 grid gap-2">
          {answers.map((entry) => (
            <div key={entry.question.id} className={`rounded-none border-l-4 bg-[var(--card)] p-3 text-sm ${entry.correct ? "border-[var(--celadon)]" : "border-[var(--cinnabar)]"}`}>
              <strong>{entry.skipped ? "已跳过" : entry.correct ? "对" : "错"}</strong> · {entry.question.prompt}
            </div>
          ))}
        </div>
        {resultAddon ? (
          <div className="m-5">{resultAddon({ score, answers, finish: () => onFinish?.(score, answers) })}</div>
        ) : (
          <Button className="m-5" type="button" onClick={() => onFinish?.(score, answers)}>
            继续
          </Button>
        )}
      </article>
    );
  }

  const usesTextEntry =
    question &&
    (question.type === "type" ||
      question.type === "dictation" ||
      question.type === "translate" ||
      (question.type === "cloze" && !(question.choices?.length)));

  return (
    <article className={`rounded-none border p-5 ${existing?.correct ? "border-[var(--green)] bg-[var(--green-soft)]" : existing ? "border-[var(--seal)] bg-[var(--seal-soft)]" : "border-[var(--line)] bg-[var(--card)]"}`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Practice</p>
          <h2 className="mt-1 font-serif text-2xl font-black">练习 {index + 1} / {questions.length}</h2>
        </div>
        <div className="border border-[var(--line)] bg-[var(--paper-hi)] px-4 py-2 font-script text-sm text-[var(--ink-soft)]">{score}%</div>
      </div>
      <div
        className="mb-5 h-2 overflow-hidden border border-[var(--line)] bg-[var(--track)]"
        role="progressbar"
        aria-label="练习进度"
        aria-valuemin={0}
        aria-valuemax={questions.length}
        aria-valuenow={answeredCount}
      >
        <div
          className="h-full bg-[var(--seal)] transition-all duration-300"
          style={{ width: `${Math.round((answeredCount / Math.max(1, questions.length)) * 100)}%` }}
        />
      </div>

      <div className="min-h-72">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h3 ref={questionHeadingRef} className="focus-ring font-serif text-3xl font-black leading-tight" tabIndex={-1}>{question.prompt}</h3>
          {question.speak && question.type !== "dictation" && voiceStatus === "ready" ? (
            <Button type="button" variant="secondary" size="sm" onClick={() => playQuestionAudio(question, setAudioPlayback)}>
              <Volume2 className="h-4 w-4" />
              听
            </Button>
          ) : null}
        </div>

        {question.type === "dictation" && question.speak && voiceStatus === "ready" ? (
          <div className="mt-6 flex flex-wrap gap-2">
            <Button type="button" onClick={() => playQuestionAudio(question, setAudioPlayback)}>
              <Volume2 className="h-4 w-4" />
              播放
            </Button>
            <Button type="button" variant="secondary" onClick={() => playQuestionAudio(question, setAudioPlayback, 0.62)}>
              慢速重播
            </Button>
          </div>
        ) : null}

        {audioCheckPending ? (
          <div className="mt-5 rounded-none border border-[var(--line)] bg-[color-mix(in_srgb,var(--navy)_12%,transparent)] p-3 text-sm font-bold leading-6 text-[var(--ocean)]" role="status">
            正在检查这台设备的韩语语音，确认后再开放作答。
          </div>
        ) : null}

        {audioNeedsGesture ? (
          <div className="mt-5 rounded-none border border-[var(--line)] bg-[color-mix(in_srgb,var(--navy)_12%,transparent)] p-3 text-sm font-bold leading-6 text-[var(--ocean)]" role="status">
            浏览器拦截了自动播放。点「听」或「播放」后即可继续作答；这不代表设备无法播放韩语。
          </div>
        ) : null}

        {audioUnavailable && !existing ? (
          <div className="mt-5 rounded-none border border-[var(--border)] bg-[var(--yellow-soft)] p-3 text-sm font-bold leading-6 text-[var(--brass-text)]" role="note">
            <p>当前设备无法播放韩语，这道音频题可以跳过继续学习；它不会计分，也不会被记录成听力能力。</p>
            <p className="mt-1 text-[var(--muted)]">安装韩语语音包后重新完成本课，即可补回这项证据。</p>
          </div>
        ) : null}

        {question.type === "cloze" && question.clozeText ? (
          <p className="hangul-display mt-6 rounded-none border border-[var(--line)] bg-[var(--surface-solid)] p-4 text-2xl leading-relaxed" lang="ko">
            {question.clozeText.split("___").map((segment, segmentIndex, segments) => (
              <span key={segmentIndex}>
                {segment}
                {segmentIndex < segments.length - 1 ? (
                  <span className="mx-1 inline-block min-w-16 border-b-2 border-[var(--brass)] text-center text-[var(--ocean)]">
                    {(existing?.answer ?? value) || "   "}
                  </span>
                ) : null}
              </span>
            ))}
          </p>
        ) : null}

        {question.type === "translate" && question.hint ? (
          <details className="mt-4 text-sm font-bold text-[var(--muted)]">
            <summary className="cursor-pointer">需要提示？</summary>
            <p className="mt-1 leading-6">{question.hint}</p>
          </details>
        ) : null}

        {!audioUnavailable && !audioCheckPending && usesTextEntry ? (
          hasKoreanText(question.answer) ? (
            <div className="mt-6 grid gap-2 font-extrabold">
              输入答案（可用屏幕韩文键盘）
              <KoreanInput
                value={existing?.answer ?? value}
                onChange={setValue}
                onSubmit={submit}
                disabled={!!existing}
                ariaLabel="输入答案"
              />
            </div>
          ) : (
            <label className="mt-6 grid gap-2 font-extrabold">
              输入答案
              <input
                className="focus-ring min-h-12 rounded-none border border-[var(--line-strong)] bg-[var(--surface-solid)] px-3"
                value={existing?.answer ?? value}
                disabled={!!existing}
                onChange={(event) => setValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    submit();
                  }
                }}
                autoComplete="off"
              />
            </label>
          )
        ) : !audioUnavailable && !audioCheckPending ? (
          <fieldset className="mt-6 grid gap-2">
            <legend className="sr-only">{question.prompt}</legend>
            {(question.choices ?? []).map((choice, choiceIndex) => (
              <label
                key={choice}
                className={`grid min-h-12 cursor-pointer grid-cols-[1rem_minmax(0,1fr)_auto] items-center gap-3 rounded-none border p-3 ${
                  existing && choice === question.answer
                    ? "border-[var(--green)] bg-[var(--green-soft)]"
                    : existing && choice === existing.answer
                      ? "border-[var(--seal)] bg-[var(--seal-soft)]"
                      : "border-[var(--line)] bg-[var(--surface-solid)]"
                }`}
              >
                <input type="radio" name="answer" value={choice} checked={(existing?.answer ?? value) === choice} disabled={!!existing} onChange={() => setValue(choice)} />
                <span lang={hasKoreanText(choice) ? "ko" : undefined}>{choice}</span>
                {choiceIndex < 9 ? (
                  <kbd className="hidden rounded border border-[var(--line)] bg-[var(--wash-1)] px-1.5 font-mono text-[0.65rem] font-black text-[var(--muted)] sm:inline-block" aria-hidden="true">
                    {choiceIndex + 1}
                  </kbd>
                ) : null}
              </label>
            ))}
          </fieldset>
        ) : null}

        {existing ? (
          <div
            ref={feedbackRef}
            className="focus-ring mt-5 rounded-none border border-[var(--line)] bg-[var(--card)] p-3"
            role="status"
            aria-live="polite"
            aria-atomic="true"
            tabIndex={-1}
          >
            <strong>{existing.skipped ? "已跳过：本题不计分，也不产生听力证据。" : existing.correct ? "答对了" : `正确答案：${question.answer}`}</strong>
            {question.type === "dictation" && !existing.correct && !existing.skipped ? (
              <DictationDiff expected={question.answer} actual={existing.answer} />
            ) : null}
            {question.type === "translate" && question.acceptable?.length ? (
              <p className="mt-1 text-sm font-bold leading-6 text-[var(--celadon-text)]">
                可接受的表达：{[...new Set([question.answer, ...question.acceptable])].join(" / ")}
              </p>
            ) : null}
            {!existing.skipped ? <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{question.explain}</p> : null}
          </div>
        ) : null}
        {srsError ? (
          <p className="mt-3 rounded-none border border-[var(--seal)] bg-[var(--seal-soft)] p-3 text-sm font-bold leading-6 text-[var(--cinnabar)]" role="alert">
            {srsError}
          </p>
        ) : null}
      </div>

      <div className="mt-5 flex justify-between gap-3">
        <Button type="button" variant="secondary" disabled={index === 0} onClick={() => {
          moveToIndex(index - 1);
        }}>
          上一题
        </Button>
        <Button
          type="button"
          onClick={audioUnavailable && !existing ? skipAudioQuestion : submit}
          disabled={audioCheckPending || (!audioUnavailable && !existing && !value.trim())}
        >
          {existing ? (index === questions.length - 1 ? finishLabel : "下一题") : audioUnavailable ? (
            <>
              <CircleSlash2 className="h-4 w-4" aria-hidden="true" />
              跳过音频题
            </>
          ) : "提交"}
        </Button>
      </div>
    </article>
  );
}

function DictationDiff({ expected, actual }: { expected: string; actual: string }) {
  const expectedChars = [...expected];
  const actualChars = [...actual];
  return (
    <p className="hangul-display mt-2 text-2xl" aria-label="逐字对照" lang="ko">
      {expectedChars.map((char, charIndex) => (
        <span
          key={`${charIndex}-${char}`}
          className={actualChars[charIndex] === char ? "text-[var(--celadon)]" : "text-[var(--cinnabar)]"}
        >
          {char}
        </span>
      ))}
    </p>
  );
}

function buildInitialState(questions: Question[], savedAnswers: DrillRunnerSavedAnswer[], initialIndex: number, initialFinished: boolean) {
  const byId = new Map(savedAnswers.map((item) => [item.questionId, item]));
  const answers: AnswerEntry[] = [];
  for (const question of questions) {
    const saved = byId.get(question.id);
    if (!saved || (!saved.answer && !saved.skipped)) break;
    answers.push({ question, answer: saved.answer, correct: Boolean(saved.correct), skipped: Boolean(saved.skipped) });
  }
  const lastQuestionIndex = Math.max(0, questions.length - 1);
  const furthestResumableIndex = initialFinished ? lastQuestionIndex : Math.min(answers.length, lastQuestionIndex);
  const index = Math.min(Math.max(0, Math.trunc(Number(initialIndex) || 0)), furthestResumableIndex);
  const finished = Boolean(initialFinished) && answers.length >= questions.length;
  return {
    index,
    answers,
    value: answers[index]?.answer ?? "",
    finished
  };
}

function isAudioQuestion(question?: Question) {
  return Boolean(question?.speak && (question.type === "listen" || question.type === "dictation"));
}
