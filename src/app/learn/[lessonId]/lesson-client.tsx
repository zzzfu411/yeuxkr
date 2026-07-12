"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, LockKeyhole, Radio, RefreshCcw, Route, Volume2 } from "lucide-react";
import { VisualPanel } from "@/components/assets/visual-panel";
import { DrillRunner } from "@/components/learning/drill-runner";
import { Button } from "@/components/ui/button";
import { SectionHeading, Surface } from "@/components/ui/section";
import { getLessonPrerequisites, getNextLesson, isLessonMastered, isLessonUnlocked, normalizeTeachEntry, UNLOCK_SCORE } from "@/data/curriculum";
import { buildLessonBridge, type LessonBridge } from "@/lib/learning/lesson-bridge";
import { clearLessonPracticeSession, getLessonPracticeSession, saveLessonPracticeSession } from "@/lib/learning/lesson-session";
import { lessonQuestions } from "@/lib/learning/quiz";
import { ABILITY_LABELS, useLearningWorkspace } from "@/lib/learning/workspace";
import { speakKorean } from "@/lib/speech";

export function LessonClient({ lesson }: { lesson: any }) {
  const { workspace, completeLesson } = useLearningWorkspace();
  const questions = lessonQuestions(lesson.id);
  const [restoredSession, setRestoredSession] = useState<ReturnType<typeof getLessonPracticeSession>>(null);
  const [sessionSaveError, setSessionSaveError] = useState(false);
  const [sessionClearError, setSessionClearError] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [savedScore, setSavedScore] = useState<number | null>(null);
  const [attemptKey, setAttemptKey] = useState(0);
  const completedIds = new Set(workspace.progress.completedLessons);
  const completed = isLessonMastered(lesson.id, completedIds, workspace.progress.lessonScores);
  const unlocked = isLessonUnlocked(lesson.id, completedIds, workspace.progress.lessonScores);
  const missingPrerequisites = getLessonPrerequisites(lesson.id).filter((item: any) => !isLessonMastered(item.id, completedIds, workspace.progress.lessonScores));
  const bridge = buildLessonBridge(lesson, workspace.progress, { validMaterialIds: workspace.evidence.validMaterialIds });
  const savedCompletedIds = new Set(workspace.progress.completedLessons);
  if (savedScore !== null && unlocked && savedScore >= UNLOCK_SCORE) savedCompletedIds.add(lesson.id);
  const savedLessonScores = savedScore !== null && unlocked
    ? { ...workspace.progress.lessonScores, [lesson.id]: Math.max(workspace.progress.lessonScores[lesson.id] ?? 0, savedScore) }
    : workspace.progress.lessonScores;
  const savedCorePass = savedScore !== null && unlocked && (completed || savedScore >= UNLOCK_SCORE);
  const nextAfterSave = savedCorePass ? getNextLesson(savedCompletedIds, savedLessonScores) : workspace.nextLesson;

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setSessionSaveError(false);
      setSessionClearError(false);
      const session = getLessonPracticeSession(lesson.id);
      if (!session || (!session.answers.length && !session.finished)) {
        setRestoredSession(null);
        return;
      }
      setRestoredSession(session);
      setAttemptKey((value) => value + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [lesson.id]);

  const retryClearLessonSession = () => {
    const cleared = clearLessonPracticeSession(lesson.id);
    setSessionClearError(!cleared);
    if (cleared) {
      setRestoredSession(null);
      setSessionSaveError(false);
    }
    return cleared;
  };

  return (
    <div className="grid gap-5">
      <section className="grid overflow-hidden rounded-[8px] border border-[var(--line)] lg:grid-cols-[minmax(0,1fr)_28rem]">
        <div className="bg-[rgba(255,250,240,0.82)] p-5 md:p-6">
          <Button asChild variant="ghost" size="sm">
            <Link href="/path">
              <ArrowLeft className="h-4 w-4" />
              返回路径
            </Link>
          </Button>
          <p className="eyebrow mt-5">
            Lesson {lesson.order} · {lesson.duration} min
          </p>
          <h1 className="mt-2 max-w-4xl font-serif text-4xl font-black leading-tight md:text-6xl">
            {lesson.title}
          </h1>
          <p className="mt-4 max-w-3xl leading-7 text-[var(--muted)]">{lesson.subtitle}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {lesson.focus.map((item: string) => (
              <span key={item} className="rounded-[8px] border border-[var(--line)] bg-[rgba(255,250,240,0.72)] px-3 py-1 text-sm font-bold">
                {item}
              </span>
            ))}
          </div>
          {completed ? (
            <div className="mt-5 w-fit rounded-[8px] border border-[rgba(79,140,118,0.45)] bg-[rgba(79,140,118,0.1)] p-3 text-sm font-bold text-[var(--celadon)]">
              本课已完成，当前最高分 {workspace.progress.lessonScores[lesson.id] ?? 0}%。
            </div>
          ) : null}
          {!unlocked ? (
            <div className="mt-5 rounded-[8px] border border-[rgba(183,135,63,0.55)] bg-[rgba(183,135,63,0.1)] p-3 text-sm font-bold leading-6 text-[var(--brass)]">
              这是旁路预览：核心路径建议先把 {missingPrerequisites.map((item: any) => item.title).join("、")} 达到 {UNLOCK_SCORE}%。
              本页练习只会记录预览分数，不会提升能力、生成错题卡或解锁后续核心课。
            </div>
          ) : null}
        </div>
        <VisualPanel asset="lesson" priority sizes="(max-width: 1024px) 100vw, 28rem" className="min-h-80 rounded-none border-0" />
      </section>

      <div className="grid gap-5 lg:grid-cols-[24rem_minmax(0,1fr)]">
        <aside className="surface h-fit p-5 lg:sticky lg:top-24">
          <p className="eyebrow">Objectives</p>
          <div className="mt-4 grid gap-2">
            {lesson.objectives.map((item: string) => (
              <span key={item} className="rounded-[8px] border border-[var(--line)] bg-[rgba(255,250,240,0.64)] p-3 text-sm font-bold leading-6">
                {item}
              </span>
            ))}
          </div>
          <div className="mt-5 rounded-[8px] border border-[rgba(23,63,115,0.16)] bg-[rgba(23,63,115,0.06)] p-3">
            <p className="font-mono text-xs font-black uppercase text-[var(--ocean)]">能力证据</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {bridge.abilities.map((ability) => (
                <span key={ability} className="rounded-[8px] bg-[rgba(23,63,115,0.08)] px-2 py-1 text-xs font-black text-[var(--ocean)]">
                  {ABILITY_LABELS[ability]}
                </span>
              ))}
            </div>
          </div>
        </aside>

        <div className="grid gap-5">
          <LessonBridgePanel bridge={bridge} />

          <Surface>
            <SectionHeading kicker="Teach" title="先建立直觉" />
            <div className="grid gap-3">
              {lesson.teach.map(normalizeTeachEntry).map((entry: ReturnType<typeof normalizeTeachEntry>, index: number) => (
                <div key={`${index}-${entry.body}`} className="grid gap-3 rounded-[8px] border border-[var(--line)] bg-[rgba(255,250,240,0.64)] p-4 md:grid-cols-[2.4rem_minmax(0,1fr)]">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--celadon)] font-mono text-sm font-black text-white">
                    {index + 1}
                  </span>
                  <div className="grid gap-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="leading-8">
                        {entry.title ? <strong className="mr-2 font-serif">{entry.title}</strong> : null}
                        {entry.body}
                      </p>
                      {entry.speak ? (
                        <Button type="button" variant="secondary" size="sm" onClick={() => speakKorean(entry.speak!)} aria-label={`播放 ${entry.speak}`}>
                          <Volume2 className="h-4 w-4" aria-hidden="true" />
                          听
                        </Button>
                      ) : null}
                    </div>
                    {entry.romanization ? (
                      <p className="font-mono text-xs font-black text-[var(--ocean)]">{entry.romanization}</p>
                    ) : null}
                    {entry.examples?.length ? (
                      <div className="grid gap-1.5">
                        {entry.examples.map((example: { ko: string; zh: string; note?: string }) => (
                          <button
                            key={example.ko}
                            type="button"
                            className="focus-ring flex flex-wrap items-baseline gap-2 rounded-[8px] border border-[var(--line)] bg-[var(--surface-solid)] p-2 text-left transition hover:-translate-y-0.5"
                            onClick={() => speakKorean(example.ko)}
                            aria-label={`播放 ${example.ko}`}
                          >
                            <span className="hangul-display text-lg font-black">{example.ko}</span>
                            <span className="text-sm text-[var(--muted)]">{example.zh}</span>
                            {example.note ? <span className="text-xs font-bold text-[var(--brass)]">{example.note}</span> : null}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </Surface>

          <Surface>
            {restoredSession && restoredSession.answers.length ? (
              <div className="mb-4 rounded-[8px] border border-[rgba(23,63,115,0.24)] bg-[rgba(23,63,115,0.07)] p-3 text-sm font-bold leading-6 text-[var(--muted)]">
                已恢复上次练习：第 {restoredSession.currentIndex + 1} 题，已保存 {restoredSession.answers.length}/{questions.length} 个回答。完成保存后会自动清除这个断点。
              </div>
            ) : null}
            {sessionSaveError ? (
              <div className="mb-4 rounded-[8px] border border-[rgba(185,78,60,0.45)] bg-[rgba(185,78,60,0.08)] p-3 text-sm font-bold leading-6 text-[var(--cinnabar)]">
                本次练习断点没有写入本地存储。你可以继续完成本页，但刷新或离开后可能无法恢复到当前题；请释放浏览器存储空间后再继续长期学习。
              </div>
            ) : null}
            {sessionClearError ? (
              <div className="mb-4 grid gap-3 rounded-[8px] border border-[rgba(183,135,63,0.48)] bg-[rgba(183,135,63,0.1)] p-3 text-sm font-bold leading-6 text-[var(--brass)] md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <span>成绩已经写入进度，但本课断点没有清理成功。刷新后可能还会恢复旧练习，请释放浏览器存储空间后重试清理。</span>
                <Button type="button" variant="secondary" size="sm" onClick={retryClearLessonSession}>
                  重试清理断点
                </Button>
              </div>
            ) : null}
            <DrillRunner
              key={`${lesson.id}:${attemptKey}`}
              questions={questions}
              finishLabel={completed ? "重新记录成绩" : "完成课程"}
              recordMistakes={false}
              initialAnswers={restoredSession?.answers}
              initialIndex={restoredSession?.currentIndex}
              initialFinished={restoredSession?.finished}
              onProgress={(progress) => {
                const saved = saveLessonPracticeSession(lesson.id, {
                  currentIndex: progress.index,
                  answers: progress.answers,
                  finished: progress.finished
                });
                if (saved) {
                  setSessionSaveError(false);
                  setSessionClearError(false);
                  setRestoredSession({
                    lessonId: lesson.id,
                    currentIndex: progress.index,
                    answers: progress.answers,
                    finished: progress.finished,
                    updatedAt: new Date().toISOString()
                  });
                } else {
                  setSessionSaveError(true);
                }
              }}
              resultAddon={({ score, answers }) => (
                <LessonResultActions
                  savedScore={savedScore}
                  saveError={saveError}
                  score={score}
                  unlocked={unlocked}
                  corePathSaved={savedCorePass}
                  bridge={bridge}
                  nextLessonId={savedCorePass ? nextAfterSave?.id : undefined}
                  onRetry={() => {
                    retryClearLessonSession();
                    setRestoredSession(null);
                    setSessionSaveError(false);
                    setSaveError(false);
                    setSavedScore(null);
                    setAttemptKey((value) => value + 1);
                  }}
                  onSave={(score) => {
                    const saved = completeLesson(lesson.id, score, answers);
                    if (!saved) {
                      setSaveError(true);
                      return;
                    }
                    const cleared = clearLessonPracticeSession(lesson.id);
                    setSessionClearError(!cleared);
                    if (cleared) setRestoredSession(null);
                    setSessionSaveError(false);
                    setSaveError(false);
                    setSavedScore(score);
                  }}
                />
              )}
            />
          </Surface>
        </div>
      </div>
    </div>
  );
}

function LessonResultActions({
  savedScore,
  saveError,
  score,
  unlocked,
  corePathSaved,
  bridge,
  nextLessonId,
  onRetry,
  onSave
}: {
  savedScore: number | null;
  saveError: boolean;
  score: number;
  unlocked: boolean;
  corePathSaved: boolean;
  bridge: LessonBridge;
  nextLessonId?: string;
  onRetry: () => void;
  onSave: (score: number) => void;
}) {
  if (saveError) {
    return (
      <div className="grid gap-3 rounded-[8px] border border-[rgba(185,78,60,0.45)] bg-[rgba(185,78,60,0.08)] p-4">
        <strong className="font-serif text-2xl font-black text-[var(--cinnabar)]">成绩没有写入本地进度</strong>
        <p className="text-sm font-bold leading-6 text-[var(--muted)]">
          请释放浏览器存储空间或关闭隐私限制后再试。页面不会离开，避免误以为已经完成。
        </p>
        <Button type="button" size="sm" onClick={() => onSave(score)}>
          重新保存
        </Button>
      </div>
    );
  }

  if (savedScore === null) {
    return (
      <Button type="button" onClick={() => onSave(score)}>
        继续
      </Button>
    );
  }

  if (!corePathSaved) {
    return (
      <div className="grid gap-3 rounded-[8px] border border-[rgba(183,135,63,0.48)] bg-[rgba(183,135,63,0.1)] p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div>
          <strong className="font-serif text-2xl font-black">{unlocked ? "成绩已保存，但还未达标" : "预览成绩已保存"}</strong>
          <p className="mt-1 text-sm font-bold leading-6 text-[var(--muted)]">
            {unlocked
              ? `这次是 ${savedScore}%，核心路径需要 ${UNLOCK_SCORE}% 才会生成整课复习卡、解锁下一课和迁移到材料。先重做本课或回路径补稳更划算。`
              : "这次只记录预览分数；核心路径仍建议先补齐前置课。"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={onRetry}>
            <RefreshCcw className="h-4 w-4" />
            重做本课
          </Button>
          <Button asChild variant="secondary" size="sm">
            <Link href="/path">
              <Route className="h-4 w-4" />
              回路径
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/review">
              <RefreshCcw className="h-4 w-4" />
              先复习
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3 rounded-[8px] border border-[rgba(79,140,118,0.45)] bg-[rgba(79,140,118,0.1)] p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
      <div>
        <strong className="font-serif text-2xl font-black">{unlocked ? "课程成绩已保存" : "预览成绩已保存"}</strong>
        <p className="mt-1 text-sm font-bold leading-6 text-[var(--muted)]">
          {unlocked
            ? `继续下一课、回路径查看解锁，或把 ${bridge.reviewCards} 张复习卡送回长期记忆。`
            : "这次只记录预览分数；核心路径仍建议先补齐前置课。"}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {nextLessonId ? (
          <Button asChild size="sm">
            <Link href={`/learn/${nextLessonId}`}>下一课</Link>
          </Button>
        ) : null}
        <Button asChild variant="secondary" size="sm">
          <Link href="/path">回路径</Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href="/review">去复习</Link>
        </Button>
        {bridge.transferMaterials[0] ? (
          <Button asChild variant="ghost" size="sm">
            <Link href={bridge.transferMaterials.find((material) => !material.completed)?.href ?? bridge.transferMaterials[0].href}>练真实材料</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function LessonBridgePanel({ bridge }: { bridge: LessonBridge }) {
  return (
    <Surface>
      <SectionHeading
        kicker="Lesson Bridge"
        title="做完这一课后，知识要流向哪里"
        copy="课程不是孤立题组。达标后会进入核心路径、复习卡、真实材料和能力护照；未达标时先回到前置课或重做本课。"
      />
      <div className="grid gap-3 xl:grid-cols-4">
        {bridge.steps.map((step) => (
          <Link
            key={step.id}
            href={step.href}
            className={`focus-ring grid min-h-36 rounded-[8px] border p-3 transition hover:-translate-y-0.5 hover:shadow-paper-sm ${
              step.done
                ? "border-[rgba(79,140,118,0.42)] bg-[rgba(79,140,118,0.1)]"
                : "border-[var(--line)] bg-[rgba(255,250,240,0.62)]"
            }`}
          >
            <span className="flex items-start justify-between gap-2">
              <span className="font-mono text-xs font-black uppercase text-[var(--ocean)]">{step.label}</span>
              {step.done ? <CheckCircle2 className="h-4 w-4 text-[var(--celadon)]" /> : step.id === "prerequisite" ? <LockKeyhole className="h-4 w-4 text-[var(--brass)]" /> : <ArrowRight className="h-4 w-4 text-[var(--muted)]" />}
            </span>
            <strong className="mt-3 font-serif text-xl leading-tight">{step.title}</strong>
            <span className="mt-2 text-sm font-bold leading-6 text-[var(--muted)]">{step.detail}</span>
          </Link>
        ))}
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="rounded-[8px] border border-[rgba(23,63,115,0.18)] bg-[rgba(23,63,115,0.06)] p-4">
          <p className="inline-flex items-center gap-2 font-mono text-xs font-black uppercase text-[var(--ocean)]">
            <RefreshCcw className="h-4 w-4" />
            复习产物
          </p>
          <strong className="mt-2 block font-serif text-3xl">{bridge.reviewCards}</strong>
          <p className="mt-1 text-sm font-bold leading-6 text-[var(--muted)]">本课可进入 SRS 的题目数。错题会先进入错题卡，达标课程会生成整课复习卡。</p>
        </div>
        <div className="rounded-[8px] border border-[rgba(183,135,63,0.28)] bg-[rgba(183,135,63,0.08)] p-4">
          <p className="inline-flex items-center gap-2 font-mono text-xs font-black uppercase text-[var(--brass)]">
            <Radio className="h-4 w-4" />
            真实材料迁移
          </p>
          {bridge.transferMaterials.length ? (
            <div className="mt-3 grid gap-2">
              {bridge.transferMaterials.slice(0, 3).map((material) => (
                bridge.mastered ? (
                  <Link
                    key={material.id}
                    href={material.href}
                    className="focus-ring rounded-[8px] border border-[rgba(24,28,27,0.1)] bg-[rgba(255,250,240,0.58)] px-3 py-2 text-sm font-bold transition hover:bg-[var(--surface-solid)]"
                  >
                    {material.completed ? "已完成 · " : ""}
                    {material.title}
                    <span className="ml-2 font-mono text-xs text-[var(--muted)]">{material.minutes} min</span>
                  </Link>
                ) : (
                  <div
                    key={material.id}
                    aria-disabled="true"
                    className="grid gap-1 rounded-[8px] border border-[rgba(24,28,27,0.08)] bg-[rgba(255,250,240,0.38)] px-3 py-2 text-sm font-bold text-[var(--muted)]"
                  >
                    <span className="inline-flex items-center gap-2 text-[var(--ink)]">
                      <LockKeyhole className="h-4 w-4 text-[var(--brass)]" />
                      {material.title}
                      <span className="font-mono text-xs text-[var(--muted)]">{material.minutes} min</span>
                    </span>
                    <span className="font-mono text-xs font-black uppercase text-[var(--brass)]">达标后解锁材料迁移</span>
                  </div>
                )
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm font-bold leading-6 text-[var(--muted)]">
              {bridge.mastered
                ? "这节课暂时没有直接绑定材料，适合回到路径查看后续路线，或做综合测验检查跨模块调用。"
                : "这节课暂时没有直接绑定材料；先把本课达标，再进入后续路线或综合测验。"}
            </p>
          )}
        </div>
      </div>
      <div className="mt-4 rounded-[8px] border border-[var(--line)] bg-[rgba(255,250,240,0.58)] p-4">
        <p className="inline-flex items-center gap-2 font-mono text-xs font-black uppercase text-[var(--ocean)]">
          <Route className="h-4 w-4" />
          当前路径状态
        </p>
        <p className="mt-2 text-sm font-bold leading-6 text-[var(--muted)]">
          {bridge.mastered
            ? bridge.nextLesson
              ? `已达标，下一课是第 ${bridge.nextLesson.order} 课：${bridge.nextLesson.title}。`
              : "核心课程已达标，下一步应转向真实材料、输出档案和母语者作品集。"
            : bridge.unlocked
              ? `本课可学习；达到 ${UNLOCK_SCORE}% 后会正式写入核心路径。`
              : `旁路预览中；先补 ${bridge.missingPrerequisites.map((item) => `第 ${item.order} 课`).join("、")} 更稳。`}
        </p>
      </div>
    </Surface>
  );
}
