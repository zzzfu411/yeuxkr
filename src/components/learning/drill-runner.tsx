"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Volume2 } from "lucide-react";
import { VisualPanel } from "@/components/assets/visual-panel";
import { Button } from "@/components/ui/button";
import { KoreanInput } from "@/components/korean/korean-input";
import { hasKoreanText } from "@/lib/learning/evidence";
import { mistakeCardId } from "@/lib/learning/ids";
import { checkAnswer, type Question } from "@/lib/learning/quiz";
import { recordMistake } from "@/lib/learning/srs";
import { speakKorean } from "@/lib/speech";

export interface AnswerEntry {
  question: Question;
  answer: string;
  correct: boolean;
}

export interface DrillRunnerSavedAnswer {
  questionId: string;
  answer: string;
  correct: boolean;
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
  const initialState = useMemo(() => buildInitialState(questions, initialAnswers, initialIndex, initialFinished), [initialAnswers, initialFinished, initialIndex, questions]);
  const [index, setIndex] = useState(initialState.index);
  const [answers, setAnswers] = useState<AnswerEntry[]>(initialState.answers);
  const [value, setValue] = useState(initialState.value);
  const [finished, setFinished] = useState(initialState.finished);
  const [srsError, setSrsError] = useState("");
  const emittedResultRef = useRef("");
  const playedListenRef = useRef("");
  const submitRef = useRef<() => void>(() => {});
  const question = questions[index];
  const existing = answers[index];
  const answeredCount = useMemo(() => answers.filter(Boolean).length, [answers]);
  const score = useMemo(() => {
    if (!answers.length) return 0;
    return Math.round((answers.filter((item) => item.correct).length / answers.length) * 100);
  }, [answers]);
  const resultSignature = useMemo(() => {
    if (!finished || !answers.length) return "";
    return answers.map((entry) => `${entry.question.id}:${entry.correct ? "1" : "0"}:${entry.answer}`).join("|");
  }, [answers, finished]);

  useEffect(() => {
    if (!finished || !onResult || !resultSignature) return;
    if (emittedResultRef.current === resultSignature) return;
    emittedResultRef.current = resultSignature;
    onResult(score, answers);
  }, [answers, finished, onResult, resultSignature, score]);

  useEffect(() => {
    if (finished || !question || question.type !== "listen" || !question.speak) return;
    if (answers[index]) return;
    if (playedListenRef.current === question.id) return;
    playedListenRef.current = question.id;
    speakKorean(question.speak);
  }, [answers, finished, index, question]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (finished || !question) return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      const isTextEntry =
        tag === "TEXTAREA" ||
        Boolean(target?.isContentEditable) ||
        (tag === "INPUT" && !["radio", "checkbox", "button"].includes((target as HTMLInputElement).type));
      if (isTextEntry) return;
      if (event.key === "Enter") {
        event.preventDefault();
        submitRef.current();
        return;
      }
      if (question.type !== "type" && !answers[index]) {
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
        prompt: question.prompt,
        answer: question.answer
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
        correct: item.correct
      })),
      finished: nextFinished
    });
  };

  useEffect(() => {
    submitRef.current = submit;
  });

  if (!questions.length) {
    return (
      <div className="grid overflow-hidden rounded-[8px] border border-[var(--line)] bg-[rgba(255,250,240,0.64)] md:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="p-5">
          <p className="eyebrow">Empty Queue</p>
          <h2 className="mt-2 font-serif text-3xl font-black leading-tight">{emptyState?.title ?? "这里暂时没有题目。"}</h2>
          <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-[var(--muted)]">
            {emptyState?.detail ?? "先完成一些课程、复习卡片或真实材料，系统会自动把可练习内容放到这里。"}
          </p>
          {emptyState?.action ? <div className="mt-4 flex flex-wrap gap-2">{emptyState.action}</div> : null}
        </div>
        <VisualPanel asset="empty" decorative className="min-h-52 rounded-none border-0" />
      </div>
    );
  }

  if (finished) {
    return (
      <article className="overflow-hidden rounded-[8px] border border-[var(--line)] bg-[rgba(255,250,240,0.72)]">
        <div className="grid md:grid-cols-[minmax(0,1fr)_16rem]">
          <div className="p-5">
            <p className="eyebrow">Result</p>
            <h2 className="mt-2 font-serif text-5xl font-black">{score}%</h2>
            <p className="mt-3 leading-7 text-[var(--muted)]">{score >= 85 ? "这组很稳，可以进入下一步。" : score >= 65 ? "已经有骨架了，把错题再听一遍会更扎实。" : "先不要急着推进，重做这一组更划算。"}</p>
          </div>
          <VisualPanel asset={score >= 65 ? "complete" : "review"} className="min-h-48 rounded-none border-0" />
        </div>
        <div className="mt-5 grid gap-2">
          {answers.map((entry) => (
            <div key={entry.question.id} className={`rounded-[8px] border-l-4 bg-[rgba(255,250,240,0.8)] p-3 text-sm ${entry.correct ? "border-[var(--celadon)]" : "border-[var(--cinnabar)]"}`}>
              <strong>{entry.correct ? "对" : "错"}</strong> · {entry.question.prompt}
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

  return (
    <article className={`rounded-[8px] border p-5 ${existing?.correct ? "border-[rgba(79,140,118,0.45)] bg-[rgba(79,140,118,0.1)]" : existing ? "border-[rgba(185,78,60,0.45)] bg-[rgba(185,78,60,0.08)]" : "border-[var(--line)] bg-[rgba(255,250,240,0.72)]"}`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Practice</p>
          <h2 className="mt-1 font-serif text-2xl font-black">练习 {index + 1} / {questions.length}</h2>
        </div>
        <div className="rounded-full bg-[rgba(23,63,115,0.08)] px-4 py-2 font-mono text-sm font-black text-[var(--ocean)]">{score}%</div>
      </div>
      <div
        className="mb-5 h-1.5 overflow-hidden rounded-full bg-[rgba(24,28,27,0.08)]"
        role="progressbar"
        aria-label="练习进度"
        aria-valuemin={0}
        aria-valuemax={questions.length}
        aria-valuenow={answeredCount}
      >
        <div
          className="h-full rounded-full bg-[var(--brass)] transition-all duration-300"
          style={{ width: `${Math.round((answeredCount / Math.max(1, questions.length)) * 100)}%` }}
        />
      </div>

      <div className="min-h-72">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h3 className="font-serif text-3xl font-black leading-tight">{question.prompt}</h3>
          {question.speak ? (
            <Button type="button" variant="secondary" size="sm" onClick={() => speakKorean(question.speak!)}>
              <Volume2 className="h-4 w-4" />
              听
            </Button>
          ) : null}
        </div>

        {question.type === "type" ? (
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
                className="focus-ring min-h-12 rounded-[8px] border border-[var(--line-strong)] bg-[var(--surface-solid)] px-3"
                value={existing?.answer ?? value}
                disabled={!!existing}
                onChange={(event) => setValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    submit();
                  }
                }}
                autoComplete="off"
              />
            </label>
          )
        ) : (
          <div className="mt-6 grid gap-2">
            {(question.choices ?? []).map((choice, choiceIndex) => (
              <label
                key={choice}
                className={`grid min-h-12 cursor-pointer grid-cols-[1rem_minmax(0,1fr)_auto] items-center gap-3 rounded-[8px] border p-3 ${
                  existing && choice === question.answer
                    ? "border-[rgba(79,140,118,0.55)] bg-[rgba(79,140,118,0.12)]"
                    : existing && choice === existing.answer
                      ? "border-[rgba(185,78,60,0.55)] bg-[rgba(185,78,60,0.1)]"
                      : "border-[var(--line)] bg-[var(--surface-solid)]"
                }`}
              >
                <input type="radio" name="answer" value={choice} checked={(existing?.answer ?? value) === choice} disabled={!!existing} onChange={() => setValue(choice)} />
                <span>{choice}</span>
                {choiceIndex < 9 ? (
                  <kbd className="hidden rounded border border-[var(--line)] bg-[rgba(24,28,27,0.04)] px-1.5 font-mono text-[0.65rem] font-black text-[var(--muted)] sm:inline-block" aria-hidden="true">
                    {choiceIndex + 1}
                  </kbd>
                ) : null}
              </label>
            ))}
          </div>
        )}

        {existing ? (
          <div className="mt-5 rounded-[8px] border border-[var(--line)] bg-[rgba(255,250,240,0.78)] p-3">
            <strong>{existing.correct ? "答对了" : `正确答案：${question.answer}`}</strong>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{question.explain}</p>
          </div>
        ) : null}
        {srsError ? (
          <p className="mt-3 rounded-[8px] border border-[rgba(185,78,60,0.45)] bg-[rgba(185,78,60,0.08)] p-3 text-sm font-bold leading-6 text-[var(--cinnabar)]">
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
        <Button type="button" onClick={submit} disabled={!existing && !value.trim()}>
          {existing ? (index === questions.length - 1 ? finishLabel : "下一题") : "提交"}
        </Button>
      </div>
    </article>
  );
}

function buildInitialState(questions: Question[], savedAnswers: DrillRunnerSavedAnswer[], initialIndex: number, initialFinished: boolean) {
  const byId = new Map(savedAnswers.map((item) => [item.questionId, item]));
  const answers = questions
    .map((question) => {
      const saved = byId.get(question.id);
      if (!saved?.answer) return undefined;
      return { question, answer: saved.answer, correct: Boolean(saved.correct) };
    })
    .filter(Boolean) as AnswerEntry[];
  const index = Math.min(Math.max(0, Math.trunc(Number(initialIndex) || 0)), Math.max(0, questions.length - 1));
  const finished = Boolean(initialFinished) && answers.length >= questions.length;
  return {
    index,
    answers,
    value: answers[index]?.answer ?? "",
    finished
  };
}
