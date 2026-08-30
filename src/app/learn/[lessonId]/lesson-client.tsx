"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, LockKeyhole, Mic, Radio, RefreshCcw, Route, Square, Volume2 } from "lucide-react";
import { VisualPanel } from "@/components/assets/visual-panel";
import { DrillRunner } from "@/components/learning/drill-runner";
import { RomanizationText } from "@/components/korean/romanization-text";
import { Button } from "@/components/ui/button";
import { SectionHeading, Surface } from "@/components/ui/section";
import { TrackRow } from "@/components/ui/track-row";
import { getLessonPrerequisites, getNextLesson, isLessonMastered, isLessonUnlocked, normalizeTeachEntry, UNLOCK_SCORE } from "@/data/curriculum";
import type { DisplayVisualAssetId } from "@/data/visuals/assets";
import { CAPSTONE_LESSON_ID, CAPSTONE_MIN_HANGUL, CAPSTONE_MIN_RECORDED_SECONDS, capstoneRecordingCheck, capstoneRubric, capstoneSystemChecks, countHangulCharacters, isValidCapstoneEvidence } from "@/lib/learning/capstone";
import { buildLessonBridge, type LessonBridge } from "@/lib/learning/lesson-bridge";
import { assessLessonAttempt, type LessonAssessmentResult } from "@/lib/learning/lesson-assessment";
import { checkLessonTaskEvidence, lessonCompletionTask, type LessonCompletionTask } from "@/lib/learning/lesson-evidence";
import { clearLessonPracticeSession, getLessonPracticeSession, saveLessonPracticeSession } from "@/lib/learning/lesson-session";
import { lessonQuestions } from "@/lib/learning/quiz";
import { deleteLearningRecording, loadLearningRecording, saveLearningRecording } from "@/lib/learning/recordings";
import { getLibraryGateForLesson, libraryRepairHref } from "@/lib/learning/path-gates";
import { ABILITY_LABELS, libraryCountsForWrite, useLearningWorkspace } from "@/lib/learning/workspace";
import type { CapstoneEvidence } from "@/lib/learning/types";
import { speakKorean } from "@/lib/speech";

const lessonVisualMap: Partial<Record<string, DisplayVisualAssetId>> = Object.fromEntries([
  ...["l01-hangul-map", "l02-vowels", "l31-compound-vowels", "l03-consonants", "l32-tense-aspirated", "l33-batchim", "l34-sound-changes"].map((id) => [id, "lessonPronunciation"]),
  ...["l06-cafe", "l11-shopping-price"].map((id) => [id, "lessonCafe"]),
  ...["l07-location"].map((id) => [id, "lessonTransit"]),
  ...["l37-numbers-counters", "l38-time-date", "l12-time-plans"].map((id) => [id, "lessonTime"]),
  ...["l18-health"].map((id) => [id, "lessonHealth"]),
  ...["l21-slow-news", "l22-media-shadowing", "l23-social-posts"].map((id) => [id, "lessonMedia"]),
  ...["l19-family-honorific", "l27-honorific-register", "l10-native-softeners", "l28-soft-refusal", "l39-hamnida", "l40-requests"].map((id) => [id, "lessonHonorific"]),
  ...["l09-connectors", "l15-comparison", "l16-because", "l20-invitation", "l24-opinion-paragraph", "l25-retelling", "l26-indirect-speech", "l29-abstract-discussion", "l30-native-capstone"].map((id) => [id, "lessonOutput"])
] as Array<[string, DisplayVisualAssetId]>);

function getLessonVisualAsset(lessonId: string): DisplayVisualAssetId {
  return lessonVisualMap[lessonId] ?? "lesson";
}

export function LessonClient({ lesson }: { lesson: any }) {
  const {
    workspace,
    srs,
    completeLesson,
    saveCapstoneEvidence,
    saveLessonTaskEvidence,
    invalidateLessonTaskRecording,
    invalidateCapstoneRecording
  } = useLearningWorkspace();
  const questions = lessonQuestions(lesson.id);
  const [restoredSession, setRestoredSession] = useState<ReturnType<typeof getLessonPracticeSession>>(null);
  const [sessionSaveError, setSessionSaveError] = useState(false);
  const [sessionClearError, setSessionClearError] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [savedScore, setSavedScore] = useState<number | null>(null);
  const [savedAssessmentReady, setSavedAssessmentReady] = useState(false);
  const [attemptKey, setAttemptKey] = useState(0);
  const completedIds = new Set(workspace.progress.completedLessons);
  const completed = isLessonMastered(lesson.id, completedIds, workspace.progress.lessonScores);
  const pathUnlocked = isLessonUnlocked(lesson.id, completedIds, workspace.progress.lessonScores);
  const libraryGate = getLibraryGateForLesson(lesson, libraryCountsForWrite(workspace.progress));
  const needsOnboarding = lesson.order === 1 && !workspace.profile.onboardedAt && workspace.progress.completedLessons.length === 0;
  const unlocked = pathUnlocked && libraryGate.ok && !needsOnboarding;
  const missingPrerequisites = getLessonPrerequisites(lesson.id).filter((item: any) => !isLessonMastered(item.id, completedIds, workspace.progress.lessonScores));
  const bridge = buildLessonBridge(lesson, workspace.progress, {
    validMaterialIds: workspace.evidence.validMaterialIds,
    libraryOk: libraryGate.ok,
    libraryMissing: libraryGate.missing
  });
  const savedCompletedIds = new Set(workspace.progress.completedLessons);
  const savedLessonScores = savedScore !== null && unlocked
    ? { ...workspace.progress.lessonScores, [lesson.id]: Math.max(workspace.progress.lessonScores[lesson.id] ?? 0, savedScore) }
    : workspace.progress.lessonScores;
  const task = lessonCompletionTask(lesson);
  const taskCheck = checkLessonTaskEvidence(task, workspace.progress.lessonTaskEvidence[lesson.id]);
  const isCapstone = lesson.id === CAPSTONE_LESSON_ID;
  const capstoneReady = !isCapstone || isValidCapstoneEvidence(workspace.progress.capstoneEvidence);
  const completionGateReady = capstoneReady && taskCheck.ready;
  const savedCorePass = savedScore !== null && unlocked && (completed || (savedScore >= UNLOCK_SCORE && savedAssessmentReady && completionGateReady));
  if (savedCorePass) savedCompletedIds.add(lesson.id);
  const nextAfterSave = savedCorePass ? getNextLesson(savedCompletedIds, savedLessonScores) : workspace.nextLesson;
  const dueCount = srs.due;
  const nextLibraryGate = getLibraryGateForLesson(nextAfterSave, libraryCountsForWrite(workspace.progress));
  const nextLibraryHref = libraryRepairHref(nextLibraryGate);
  const nextLibraryLabel = nextLibraryGate.missing[0] ? `先补${nextLibraryGate.missing[0].label}` : "";
  const romanizationScaffold = lesson.order <= 6 && workspace.progress.completedLessons.length < 6;

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
      <section className="grid overflow-hidden rounded-none border border-[var(--line)] lg:grid-cols-[minmax(0,1fr)_28rem]">
        <div className="bg-[var(--card)] p-5 md:p-6">
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
              <span key={item} className="rounded-none border border-[var(--line)] bg-[var(--card)] px-3 py-1 text-sm font-bold">
                {item}
              </span>
            ))}
          </div>
          <Button asChild size="sm" className="mt-5 w-fit">
            {needsOnboarding ? (
              <Link href="/onboarding">
                先去入门
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <a href="#lesson-content">
                开始本课
                <ArrowRight className="h-4 w-4" />
              </a>
            )}
          </Button>
          {completed ? (
            <div className="mt-5 w-fit rounded-none border border-[var(--green)] bg-[var(--green-soft)] p-3 text-sm font-bold text-[var(--celadon)]">
              本课已完成，当前最高分 {workspace.progress.lessonScores[lesson.id] ?? 0}%。
            </div>
          ) : null}
          {needsOnboarding ? (
            <div className="mt-5 rounded-none border border-[var(--border)] bg-[var(--yellow-soft)] p-3 text-sm font-bold leading-6 text-[var(--brass)]">
              还没完成三分钟入门。先确认目标和韩文输入，第一课才会写入核心路径。
              <Link href="/onboarding" className="ml-2 underline decoration-2 underline-offset-2">
                去入门
              </Link>
            </div>
          ) : !unlocked ? (
            <div className="mt-5 rounded-none border border-[var(--border)] bg-[var(--yellow-soft)] p-3 text-sm font-bold leading-6 text-[var(--brass)]">
              这是旁路预览：
              {missingPrerequisites.length
                ? `核心路径建议先把 ${missingPrerequisites.map((item: any) => item.title).join("、")} 达到 ${UNLOCK_SCORE}%。`
                : null}
              {libraryGate.missing.length
                ? `先把${libraryGate.missing.map((gap) => `${gap.label} ${gap.current}/${gap.target}`).join("、")}补上。`
                : null}
              本页练习只会记录预览分数，不会提升能力、生成错题卡或解锁后续核心课。
            </div>
          ) : null}
        </div>
        <VisualPanel asset={getLessonVisualAsset(lesson.id)} priority sizes="(max-width: 1024px) 100vw, 28rem" className="min-h-56 rounded-none border-0 md:min-h-80" />
      </section>

      <div id="lesson-content" className="grid scroll-mt-40 gap-5 lg:scroll-mt-28 lg:grid-cols-[24rem_minmax(0,1fr)]">
        <aside className="surface h-fit p-5 lg:sticky lg:top-24">
          <p className="eyebrow">Objectives</p>
          <div className="mt-4 grid gap-2">
            {lesson.objectives.map((item: string) => (
              <span key={item} className="rounded-none border border-[var(--line)] bg-[var(--card)] p-3 text-sm font-bold leading-6">
                {item}
              </span>
            ))}
          </div>
          <div className="mt-5 rounded-none border border-[var(--border)] bg-[color-mix(in_srgb,var(--navy)_12%,transparent)] p-3">
            <p className="font-mono text-xs font-black uppercase text-[var(--ocean)]">能力证据</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {bridge.abilities.map((ability) => (
                <span key={ability} className="rounded-none bg-[color-mix(in_srgb,var(--navy)_12%,transparent)] px-2 py-1 text-xs font-black text-[var(--ocean)]">
                  {ABILITY_LABELS[ability]}
                </span>
              ))}
            </div>
          </div>
        </aside>

        <div className="grid gap-5">
          <Surface>
            <SectionHeading kicker="Teach" title="先建立直觉" />
            <div>
              {lesson.teach.map(normalizeTeachEntry).map((entry: ReturnType<typeof normalizeTeachEntry>, index: number) => (
                <TrackRow
                  key={`${index}-${entry.body}`}
                  index={index + 1}
                  glyph={String(index + 1)}
                  kicker="Teach"
                  title={entry.title || `步骤 ${index + 1}`}
                  detail={entry.body}
                  expanded
                  onPlay={entry.speak ? () => speakKorean(entry.speak!) : undefined}
                  playLabel={entry.speak ? `播放 ${entry.speak}` : undefined}
                >
                  <div className="grid gap-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="leading-8">{entry.body}</p>
                    </div>
                    <RomanizationText
                      text={entry.romanization}
                      preference={workspace.profile.romanization}
                      scaffold={romanizationScaffold}
                      className="font-mono text-xs font-black text-[var(--ocean)]"
                    />
                    {entry.examples?.length ? (
                      <div className="grid gap-1.5">
                        {entry.examples.map((example: { ko: string; zh: string; note?: string }) => (
                          <button
                            key={example.ko}
                            type="button"
                            className="focus-ring flex flex-wrap items-baseline gap-2 rounded-none border border-[var(--line)] bg-[var(--surface-solid)] p-2 text-left transition hover:-translate-y-0.5"
                            onClick={() => speakKorean(example.ko)}
                            aria-label={`播放 ${example.ko}`}
                          >
                            <span className="hangul-display text-lg font-black" lang="ko">{example.ko}</span>
                            <span className="text-sm text-[var(--muted)]">{example.zh}</span>
                            {example.note ? <span className="text-xs font-bold text-[var(--brass)]">{example.note}</span> : null}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </TrackRow>
              ))}
            </div>
          </Surface>

          {isCapstone ? (
            <CapstoneEvidencePanel
              evidence={workspace.progress.capstoneEvidence}
              onSave={saveCapstoneEvidence}
              onInvalidateRecording={invalidateCapstoneRecording}
            />
          ) : null}

          {task ? (
            <LessonTaskEvidencePanel
              lessonId={lesson.id}
              task={task}
              evidence={workspace.progress.lessonTaskEvidence[lesson.id]}
              onSave={saveLessonTaskEvidence}
              onInvalidateRecording={invalidateLessonTaskRecording}
            />
          ) : null}

          <Surface>
            {needsOnboarding ? (
              <div className="grid gap-3 rounded-none border border-[var(--border)] bg-[var(--yellow-soft)] p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <div>
                  <strong className="font-serif text-2xl font-black">先完成三分钟入门</strong>
                  <p className="mt-1 text-sm font-bold leading-6 text-[var(--muted)]">
                    确认目标和韩文输入后，第一课才会写入核心路径。
                  </p>
                </div>
                <Button asChild size="sm">
                  <Link href="/onboarding">
                    去入门
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ) : (
              <>
            {restoredSession && restoredSession.answers.length ? (
              <div className="mb-4 rounded-none border border-[var(--border)] bg-[color-mix(in_srgb,var(--navy)_12%,transparent)] p-3 text-sm font-bold leading-6 text-[var(--muted)]">
                已恢复上次练习：第 {restoredSession.currentIndex + 1} 题，已保存 {restoredSession.answers.length}/{questions.length} 个回答。完成保存后会自动清除这个断点。
              </div>
            ) : null}
            {sessionSaveError ? (
              <div className="mb-4 rounded-none border border-[var(--seal)] bg-[var(--seal-soft)] p-3 text-sm font-bold leading-6 text-[var(--cinnabar)]">
                本次练习断点没有写入本地存储。你可以继续完成本页，但刷新或离开后可能无法恢复到当前题；请释放浏览器存储空间后再继续长期学习。
              </div>
            ) : null}
            {sessionClearError ? (
              <div className="mb-4 grid gap-3 rounded-none border border-[var(--border)] bg-[var(--yellow-soft)] p-3 text-sm font-bold leading-6 text-[var(--brass)] md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
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
                  assessment={assessLessonAttempt({ ...lesson, drills: questions }, answers, score)}
                  completionGateReady={completionGateReady}
                  completionGateLabel={isCapstone ? "终课作品" : task?.title}
                  completionGateHref={isCapstone ? "#capstone-evidence" : task ? "#lesson-task-evidence" : undefined}
                  nextLessonId={savedCorePass ? nextAfterSave?.id : undefined}
                  dueCount={dueCount}
                  libraryHref={savedCorePass ? nextLibraryHref ?? undefined : undefined}
                  libraryLabel={savedCorePass ? nextLibraryLabel : undefined}
                  onRetry={() => {
                    retryClearLessonSession();
                    setRestoredSession(null);
                    setSessionSaveError(false);
                    setSaveError(false);
                    setSavedScore(null);
                    setSavedAssessmentReady(false);
                    setAttemptKey((value) => value + 1);
                  }}
                  onSave={(score, assessment) => {
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
                    setSavedAssessmentReady(assessment.corePassed);
                    setSavedScore(score);
                  }}
                />
              )}
            />
              </>
            )}
          </Surface>

          <LessonBridgePanel
            bridge={bridge}
            dueCount={dueCount}
            libraryLabel={nextLibraryLabel}
            needsOnboarding={needsOnboarding}
          />
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
  assessment,
  completionGateReady,
  completionGateLabel,
  completionGateHref,
  nextLessonId,
  dueCount = 0,
  libraryHref,
  libraryLabel,
  onRetry,
  onSave
}: {
  savedScore: number | null;
  saveError: boolean;
  score: number;
  unlocked: boolean;
  corePathSaved: boolean;
  bridge: LessonBridge;
  assessment: LessonAssessmentResult;
  completionGateReady: boolean;
  completionGateLabel?: string;
  completionGateHref?: string;
  nextLessonId?: string;
  dueCount?: number;
  libraryHref?: string;
  libraryLabel?: string;
  onRetry: () => void;
  onSave: (score: number, assessment: LessonAssessmentResult) => void;
}) {
  if (saveError) {
    return (
      <div className="grid gap-3 rounded-none border border-[var(--seal)] bg-[var(--seal-soft)] p-4">
        <strong className="font-serif text-2xl font-black text-[var(--cinnabar)]">成绩没有写入本地进度</strong>
        <p className="text-sm font-bold leading-6 text-[var(--muted)]">
          请释放浏览器存储空间或关闭隐私限制后再试。页面不会离开，避免误以为已经完成。
        </p>
        <Button type="button" size="sm" onClick={() => onSave(score, assessment)}>
          重新保存
        </Button>
      </div>
    );
  }

  if (savedScore === null) {
    if (score >= UNLOCK_SCORE && !completionGateReady) {
      return (
        <div className="grid gap-3 rounded-none border border-[var(--border)] bg-[var(--yellow-soft)] p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div>
            <strong className="font-serif text-2xl font-black">固定题已达标，还差{completionGateLabel ?? "本课作品"}</strong>
            <p className="mt-1 text-sm font-bold leading-6 text-[var(--muted)]">先完成并保存作品证据，本课才会写入核心路径。</p>
          </div>
          {completionGateHref ? (
            <Button asChild size="sm">
              <a href={completionGateHref}>补作品</a>
            </Button>
          ) : null}
        </div>
      );
    }
    if (score >= UNLOCK_SCORE && !assessment.corePassed) {
      return (
        <div className="grid gap-3 rounded-none border border-[var(--border)] bg-[var(--yellow-soft)] p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div>
            <strong className="font-serif text-2xl font-black">总分达标，分项还没过</strong>
            <p className="mt-1 text-sm font-bold leading-6 text-[var(--muted)]">{lessonAssessmentMessage(assessment)}</p>
          </div>
          <Button type="button" size="sm" onClick={() => onSave(score, assessment)}>保存本次结果</Button>
        </div>
      );
    }
    return (
      <Button type="button" onClick={() => onSave(score, assessment)}>
        继续
      </Button>
    );
  }

  if (!corePathSaved) {
    return (
      <div className="grid gap-3 rounded-none border border-[var(--border)] bg-[var(--yellow-soft)] p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div>
          <strong className="font-serif text-2xl font-black">{unlocked ? "成绩已保存，但还未达标" : "预览成绩已保存"}</strong>
          <p className="mt-1 text-sm font-bold leading-6 text-[var(--muted)]">
            {unlocked
              ? `${lessonAssessmentMessage(assessment)} 核心路径需要总分与分项同时达标，才会生成整课复习卡并解锁下一课。`
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

  const reviewFirst = dueCount > 0;
  const libraryFirst = Boolean(libraryHref);
  return (
    <div className="grid gap-3 rounded-none border border-[var(--green)] bg-[var(--green-soft)] p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
      <div>
        <strong className="font-serif text-2xl font-black">{unlocked ? "课程成绩已保存" : "预览成绩已保存"}</strong>
        <p className="mt-1 text-sm font-bold leading-6 text-[var(--muted)]">
          {unlocked
            ? reviewFirst
              ? `总分、主动输出与听辨分项均已核验。现在有 ${dueCount} 张到期卡，先清复习再继续下一课。`
              : libraryFirst
                ? `总分、主动输出与听辨分项均已核验。下一课还差图书馆门槛，先补库再上课。`
                : `总分、主动输出与听辨分项均已核验。你可以继续下一课，或把 ${bridge.reviewCards} 张复习卡送回长期记忆。`
            : "这次只记录预览分数；核心路径仍建议先补齐前置课。"}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {reviewFirst ? (
          <Button asChild size="sm">
            <Link href="/review">先清到期复习</Link>
          </Button>
        ) : libraryFirst ? (
          <Button asChild size="sm">
            <Link href={libraryHref ?? "/path"}>{libraryLabel || "先补库"}</Link>
          </Button>
        ) : nextLessonId ? (
          <Button asChild size="sm">
            <Link href={`/learn/${nextLessonId}`}>下一课</Link>
          </Button>
        ) : null}
        {reviewFirst && libraryFirst ? (
          <Button asChild variant="secondary" size="sm">
            <Link href={libraryHref ?? "/path"}>{libraryLabel || "先补库"}</Link>
          </Button>
        ) : (reviewFirst || libraryFirst) && nextLessonId ? (
          <Button asChild variant="secondary" size="sm">
            <Link href={`/learn/${nextLessonId}`}>下一课</Link>
          </Button>
        ) : null}
        <Button asChild variant={reviewFirst || libraryFirst ? "ghost" : "secondary"} size="sm">
          <Link href="/path">回路径</Link>
        </Button>
        {reviewFirst ? null : (
          <Button asChild variant="ghost" size="sm">
            <Link href="/review">去复习</Link>
          </Button>
        )}
        {bridge.transferMaterials.some((material) => material.available) ? (
          <Button asChild variant="ghost" size="sm">
            <Link href={bridge.transferMaterials.find((material) => material.available && !material.completed)?.href ?? bridge.transferMaterials.find((material) => material.available)!.href}>练真实材料</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function lessonAssessmentMessage(assessment: LessonAssessmentResult) {
  const missing: string[] = [];
  if (!assessment.overallPassed) missing.push(`总分需达到 ${UNLOCK_SCORE}%`);
  if (!assessment.productionPassed) missing.push("主动输入、听写或翻译题需达到 60%");
  if (assessment.listeningRequired && !assessment.listeningPassed) {
    missing.push(assessment.listeningDeferred || assessment.listeningSkipped ? "至少需要答对一题听辨或听写，跳过音频不能写入核心路径" : "听辨题需达到 60%");
  }
  return missing.length ? missing.join("；") : "本次分项已达标。";
}

function LessonTaskEvidencePanel({
  lessonId,
  task,
  evidence,
  onSave,
  onInvalidateRecording
}: {
  lessonId: string;
  task: LessonCompletionTask;
  evidence?: { kind: "paragraph" | "retell" | "shadowing"; text: string; recordedSeconds: number; recordingId?: string; updatedAt: string };
  onSave: (lessonId: string, input: unknown, expectedRecordingId: string) => boolean;
  onInvalidateRecording: (lessonId: string, recordingId: string) => boolean;
}) {
  const [text, setText] = useState(evidence?.text ?? "");
  const [recordedSeconds, setRecordedSeconds] = useState(evidence?.recordedSeconds ?? 0);
  const [recordingId, setRecordingId] = useState(evidence?.recordingId ?? "");
  const [recording, setRecording] = useState(false);
  const [startingRecording, setStartingRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");
  const [message, setMessage] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const audioUrlRef = useRef("");
  const recordingIdRef = useRef(evidence?.recordingId ?? "");
  const savedRecordingIdRef = useRef(evidence?.recordingId ?? "");
  const draftBaseRecordingIdRef = useRef(evidence?.recordingId ?? "");
  const invalidateRecordingRef = useRef(onInvalidateRecording);
  const mountedRef = useRef(true);
  const startingRecordingRef = useRef(false);
  const recordingRequestRef = useRef(0);
  const draftEvidence = useMemo(() => ({ kind: task.kind, text, recordedSeconds, recordingId: recordingId || undefined, updatedAt: new Date(0).toISOString() }), [recordedSeconds, recordingId, task.kind, text]);
  const check = checkLessonTaskEvidence(task, draftEvidence);
  const saved = Boolean(
    evidence &&
    checkLessonTaskEvidence(task, evidence).ready &&
    evidence.kind === draftEvidence.kind &&
    evidence.text.trim() === draftEvidence.text.trim() &&
    evidence.recordedSeconds === draftEvidence.recordedSeconds &&
    (evidence.recordingId ?? "") === (draftEvidence.recordingId ?? "")
  );

  useEffect(() => {
    const nextSavedRecordingId = evidence?.recordingId ?? "";
    if (recordingIdRef.current === savedRecordingIdRef.current) {
      draftBaseRecordingIdRef.current = nextSavedRecordingId;
    }
    savedRecordingIdRef.current = nextSavedRecordingId;
    invalidateRecordingRef.current = onInvalidateRecording;
  }, [evidence?.recordingId, onInvalidateRecording]);

  useEffect(() => {
    let cancelled = false;
    recordingRequestRef.current += 1;
    startingRecordingRef.current = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setStartingRecording(false);
      setRecording(false);
      setAudioUrl("");
    });
    if (task.kind === "shadowing" && evidence?.recordingId) {
      void loadLearningRecording(evidence.recordingId).then((blob) => {
        if (cancelled) return;
        if (!blob) {
          if (!invalidateRecordingRef.current(lessonId, evidence.recordingId!)) {
            setMessage("录音实体不存在，但学习进度未能同步撤回；请释放存储空间后刷新重试。");
            return;
          }
          setRecordedSeconds(0);
          setRecordingId("");
          recordingIdRef.current = "";
          setMessage("已保存的录音实体不存在，需要重新录音或完成听后复现。");
          return;
        }
        const nextUrl = URL.createObjectURL(blob);
        if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = nextUrl;
        setAudioUrl(nextUrl);
      });
    }
    return () => {
      cancelled = true;
      recordingRequestRef.current += 1;
      startingRecordingRef.current = false;
      const recorder = recorderRef.current;
      if (recorder) {
        recorder.ondataavailable = null;
        recorder.onstop = null;
        if (recorder.state !== "inactive") {
          try {
            recorder.stop();
          } catch {
            // Stopping tracks below remains the final cleanup path.
          }
        }
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      recorderRef.current = null;
      streamRef.current = null;
      chunksRef.current = [];
      startedAtRef.current = 0;
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = "";
      }
    };
  }, [evidence?.recordingId, lessonId, task.kind]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      recordingRequestRef.current += 1;
      const draftRecordingId = recordingIdRef.current;
      if (draftRecordingId && draftRecordingId !== savedRecordingIdRef.current) void deleteLearningRecording(draftRecordingId);
    };
  }, []);

  const startRecording = async () => {
    if (recording || startingRecordingRef.current) return;
    startingRecordingRef.current = true;
    setStartingRecording(true);
    const requestId = ++recordingRequestRef.current;
    setMessage("");
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setMessage("当前浏览器不能录音，请使用下方听后复现作为替代验收。");
      startingRecordingRef.current = false;
      setStartingRecording(false);
      return;
    }
    let stream: MediaStream | null = null;
    let recorder: MediaRecorder | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mountedRef.current || requestId !== recordingRequestRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      const activeStream = stream;
      streamRef.current = activeStream;
      const activeRecorder = new MediaRecorder(activeStream);
      recorder = activeRecorder;
      recorderRef.current = activeRecorder;
      chunksRef.current = [];
      activeRecorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      activeRecorder.onstop = async () => {
        const previousRecordingId = recordingIdRef.current;
        const seconds = Math.max(0, (performance.now() - startedAtRef.current) / 1000);
        const blob = new Blob(chunksRef.current, { type: activeRecorder.mimeType || "audio/webm" });
        activeStream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        setRecording(false);
        if (!blob.size) {
          setRecordedSeconds(0);
          setRecordingId("");
          setMessage("没有取得有效音频数据，请重新录音或使用听后复现。");
          return;
        }
        const nextRecordingId = await saveLearningRecording(blob, "shadowing");
        if (!nextRecordingId) {
          setRecordedSeconds(0);
          setRecordingId("");
          setMessage("录音无法写入浏览器数据库，请使用听后复现作为替代验收。");
          return;
        }
        if (!mountedRef.current || requestId !== recordingRequestRef.current) {
          await deleteLearningRecording(nextRecordingId);
          return;
        }
        if (previousRecordingId && previousRecordingId !== savedRecordingIdRef.current) {
          void deleteLearningRecording(previousRecordingId);
        }
        recordingIdRef.current = nextRecordingId;
        setRecordingId(nextRecordingId);
        setRecordedSeconds(Math.round(seconds * 10) / 10);
        const nextUrl = URL.createObjectURL(blob);
        if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = nextUrl;
        setAudioUrl(nextUrl);
      };
      startedAtRef.current = performance.now();
      activeRecorder.start();
      if (recordingIdRef.current === savedRecordingIdRef.current) {
        draftBaseRecordingIdRef.current = savedRecordingIdRef.current;
      }
      recordingIdRef.current = "";
      setRecordedSeconds(0);
      setRecordingId("");
      setRecording(true);
    } catch {
      if (recorder) {
        recorder.ondataavailable = null;
        recorder.onstop = null;
        if (recorder.state !== "inactive") {
          try {
            recorder.stop();
          } catch {
            // Stopping tracks below remains the final cleanup path.
          }
        }
      }
      stream?.getTracks().forEach((track) => track.stop());
      if (recorderRef.current === recorder) recorderRef.current = null;
      if (streamRef.current === stream) streamRef.current = null;
      chunksRef.current = [];
      if (mountedRef.current && requestId === recordingRequestRef.current) {
        setRecording(false);
        setMessage("没有取得麦克风权限或录音启动失败，请使用下方听后复现作为替代验收。");
      }
    } finally {
      if (mountedRef.current && requestId === recordingRequestRef.current) {
        startingRecordingRef.current = false;
        setStartingRecording(false);
      }
    }
  };

  const stopRecording = () => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  };

  const save = () => {
    if (!check.ready) {
      setMessage("作品还未满足系统检查，请补齐未通过项。");
      return;
    }
    const expectedRecordingId = draftBaseRecordingIdRef.current;
    const ok = onSave(lessonId, draftEvidence, expectedRecordingId);
    if (ok && expectedRecordingId && expectedRecordingId !== recordingId) {
      void deleteLearningRecording(expectedRecordingId);
    }
    if (ok) {
      savedRecordingIdRef.current = recordingId;
      draftBaseRecordingIdRef.current = recordingId;
    }
    setMessage(ok ? "本课作品已保存，可以完成固定题验收。" : "作品没有写入本地进度，请释放存储空间后重试。");
  };

  return (
    <Surface id="lesson-task-evidence" className="scroll-mt-40 lg:scroll-mt-28">
      <SectionHeading kicker="Required Evidence" title={task.title} />
      <p className="max-w-3xl leading-7 text-[var(--muted)]">{task.prompt}</p>

      {task.source ? (
        <div className="mt-4 rounded-none border border-[var(--line)] bg-[color-mix(in_srgb,var(--navy)_12%,transparent)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <strong className="font-mono text-xs uppercase text-[var(--ocean)]">Practice Source</strong>
            <Button type="button" variant="secondary" size="sm" onClick={() => speakKorean(task.source!)}>
              <Volume2 className="h-4 w-4" aria-hidden="true" />
              播放
            </Button>
          </div>
          {task.kind === "retell" ? (
            <details className="mt-3">
              <summary className="cursor-pointer text-sm font-black">打开原文，听完后请合上</summary>
              <p className="hangul-display mt-3 text-lg font-bold leading-8" lang="ko">{task.source}</p>
            </details>
          ) : (
            <p className="hangul-display mt-3 text-xl font-black leading-8" lang="ko">{task.source}</p>
          )}
        </div>
      ) : null}

      {task.kind === "shadowing" ? (
        <div className="mt-4 grid gap-3 rounded-none border border-[var(--line)] p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div>
            <strong>最后一轮录音</strong>
            <p className="mt-1 text-sm font-bold text-[var(--muted)]">
              {recordedSeconds ? `已录 ${recordedSeconds.toFixed(1)} 秒。` : "录完后先回听，再保存验收。"}
            </p>
            {audioUrl ? <audio className="mt-3 w-full" controls src={audioUrl} /> : null}
          </div>
          {recording ? (
            <Button type="button" variant="secondary" onClick={stopRecording}>
              <Square className="h-4 w-4" aria-hidden="true" />
              停止
            </Button>
          ) : (
            <Button type="button" onClick={startRecording} disabled={startingRecording}>
              <Mic className="h-4 w-4" aria-hidden="true" />
              {startingRecording ? "请求麦克风" : "开始录音"}
            </Button>
          )}
        </div>
      ) : null}

      <label className="mt-4 grid gap-2 text-sm font-black">
        {task.kind === "shadowing" ? "无法录音时：听后凭记忆复现整句" : task.kind === "retell" ? "你的韩语复述" : "你的韩语段落"}
        <textarea
          className="focus-ring hangul-display min-h-40 w-full resize-y rounded-none border border-[var(--line-strong)] bg-[var(--surface-solid)] p-4 text-lg font-bold leading-8"
          value={text}
          lang="ko"
          spellCheck={false}
          onChange={(event) => setText(event.target.value)}
          placeholder="한국어로 직접 써 보세요."
        />
      </label>

      <div className="mt-4 grid gap-2 rounded-none border border-[var(--line)] bg-[var(--green-soft)] p-4">
        {check.checks.map((item) => (
          <span key={item.id} className={`flex items-center gap-2 text-sm font-bold ${item.passed ? "text-[var(--celadon-text)]" : "text-[var(--muted)]"}`}>
            {item.passed ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <span className="h-4 w-4 rounded-full border border-[var(--line-strong)]" aria-hidden="true" />}
            {item.label}
          </span>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="button" onClick={save} disabled={!check.ready}>保存作品</Button>
        {saved ? <span className="text-sm font-black text-[var(--celadon-text)]">已保存有效证据</span> : null}
        {message ? <span className="text-sm font-bold text-[var(--muted)]" role="status">{message}</span> : null}
      </div>
    </Surface>
  );
}

function CapstoneEvidencePanel({
  evidence,
  onSave,
  onInvalidateRecording
}: {
  evidence: CapstoneEvidence | null;
  onSave: (input: Omit<CapstoneEvidence, "updatedAt">, expectedRecordingId: string) => boolean;
  onInvalidateRecording: (recordingId: string) => boolean;
}) {
  const savedRecordingId = evidence?.recordingId ?? "";
  const [draft, setDraft] = useState<Omit<CapstoneEvidence, "updatedAt">>(() => ({
    transcript: evidence?.transcript ?? "",
    weakPoint: evidence?.weakPoint ?? "",
    targetRewrite: evidence?.targetRewrite ?? "",
    rubric: evidence?.rubric ?? [],
    recordedSeconds: evidence?.recordedSeconds ?? 0,
    recordingId: evidence?.recordingId ?? ""
  }));
  const [status, setStatus] = useState<"idle" | "saved" | "error">(() => isValidCapstoneEvidence(evidence) ? "saved" : "idle");
  const [recording, setRecording] = useState(false);
  const [startingRecording, setStartingRecording] = useState(false);
  const [recordingElapsed, setRecordingElapsed] = useState(0);
  const [audioUrl, setAudioUrl] = useState("");
  const [recordingMessage, setRecordingMessage] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const audioUrlRef = useRef("");
  const recordingIdRef = useRef(savedRecordingId);
  const savedRecordingIdRef = useRef(savedRecordingId);
  const draftBaseRecordingIdRef = useRef(savedRecordingId);
  const invalidateRecordingRef = useRef(onInvalidateRecording);
  const mountedRef = useRef(true);
  const startingRecordingRef = useRef(false);
  const recordingRequestRef = useRef(0);
  const hangulCount = countHangulCharacters(draft.transcript);
  const systemChecks = capstoneSystemChecks(draft.transcript);
  const recordingCheck = capstoneRecordingCheck(draft.recordedSeconds, draft.recordingId);
  const ready = !recording && isValidCapstoneEvidence({ ...draft, updatedAt: evidence?.updatedAt ?? "" });

  useEffect(() => {
    if (recordingIdRef.current === savedRecordingIdRef.current) {
      draftBaseRecordingIdRef.current = savedRecordingId;
    }
    savedRecordingIdRef.current = savedRecordingId;
    invalidateRecordingRef.current = onInvalidateRecording;
  }, [onInvalidateRecording, savedRecordingId]);

  useEffect(() => {
    let cancelled = false;
    recordingRequestRef.current += 1;
    startingRecordingRef.current = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setStartingRecording(false);
      setRecording(false);
      setRecordingElapsed(0);
      setAudioUrl("");
    });
    if (savedRecordingId) {
      void loadLearningRecording(savedRecordingId).then((blob) => {
        if (cancelled) return;
        if (!blob) {
          if (!invalidateRecordingRef.current(savedRecordingId)) {
            setRecordingMessage("录音实体不存在，但终课进度未能同步撤回；请释放存储空间后刷新重试。");
            return;
          }
          recordingIdRef.current = "";
          setDraft((current) => ({ ...current, recordedSeconds: 0, recordingId: "" }));
          setStatus("idle");
          setRecordingMessage("已保存的录音实体不存在，终课证据已撤回，请重新录制。");
          return;
        }
        const nextAudioUrl = URL.createObjectURL(blob);
        if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = nextAudioUrl;
        setAudioUrl(nextAudioUrl);
      });
    }
    return () => {
      cancelled = true;
      recordingRequestRef.current += 1;
      startingRecordingRef.current = false;
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      const recorder = recorderRef.current;
      if (recorder) {
        recorder.ondataavailable = null;
        recorder.onstop = null;
        if (recorder.state !== "inactive") {
          try {
            recorder.stop();
          } catch {
            // Stopping tracks below remains the final cleanup path.
          }
        }
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      recorderRef.current = null;
      streamRef.current = null;
      chunksRef.current = [];
      startedAtRef.current = 0;
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = "";
      }
    };
  }, [savedRecordingId]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      recordingRequestRef.current += 1;
      const draftRecordingId = recordingIdRef.current;
      if (draftRecordingId && draftRecordingId !== savedRecordingIdRef.current) void deleteLearningRecording(draftRecordingId);
    };
  }, []);

  const startRecording = async () => {
    if (recording || startingRecordingRef.current) return;
    startingRecordingRef.current = true;
    setStartingRecording(true);
    const requestId = ++recordingRequestRef.current;
    setRecordingMessage("");
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setRecordingMessage("当前浏览器不支持录音，终课作品需要换用支持麦克风录制的浏览器完成。");
      startingRecordingRef.current = false;
      setStartingRecording(false);
      return;
    }

    let stream: MediaStream | null = null;
    let recorder: MediaRecorder | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mountedRef.current || requestId !== recordingRequestRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      const activeStream = stream;
      streamRef.current = activeStream;
      const activeRecorder = new MediaRecorder(activeStream);
      recorder = activeRecorder;
      recorderRef.current = activeRecorder;
      chunksRef.current = [];
      activeRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      activeRecorder.onstop = async () => {
        const previousRecordingId = recordingIdRef.current;
        if (timerRef.current !== null) window.clearInterval(timerRef.current);
        timerRef.current = null;
        const seconds = Math.max(0, Math.floor((performance.now() - startedAtRef.current) / 100) / 10);
        const blob = new Blob(chunksRef.current, { type: activeRecorder.mimeType || "audio/webm" });
        chunksRef.current = [];
        activeStream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        setRecording(false);
        setRecordingElapsed(seconds);

        if (blob.size === 0) {
          setDraft((current) => ({ ...current, recordedSeconds: 0, recordingId: "" }));
          setRecordingMessage("没有取得有效音频数据，本次录音不计入终课证据，请重新录制。");
          return;
        }

        const nextRecordingId = await saveLearningRecording(blob, "capstone");
        if (!nextRecordingId) {
          recordingIdRef.current = "";
          setDraft((current) => ({ ...current, recordedSeconds: 0, recordingId: "" }));
          setRecordingMessage("录音无法写入浏览器数据库，本次录音不能作为终课证据，请释放存储空间后重试。");
          return;
        }
        if (!mountedRef.current || requestId !== recordingRequestRef.current) {
          await deleteLearningRecording(nextRecordingId);
          return;
        }
        if (previousRecordingId && previousRecordingId !== savedRecordingIdRef.current) {
          void deleteLearningRecording(previousRecordingId);
        }
        recordingIdRef.current = nextRecordingId;
        const nextAudioUrl = URL.createObjectURL(blob);
        if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = nextAudioUrl;
        setAudioUrl(nextAudioUrl);
        setDraft((current) => ({ ...current, recordedSeconds: seconds, recordingId: nextRecordingId }));
        setRecordingMessage(seconds >= CAPSTONE_MIN_RECORDED_SECONDS
          ? "录音时长已达标，请先回听，再保存终课作品。"
          : `本次录音 ${seconds.toFixed(1)} 秒，还需至少 ${(CAPSTONE_MIN_RECORDED_SECONDS - seconds).toFixed(1)} 秒。`);
      };

      startedAtRef.current = performance.now();
      activeRecorder.start(1000);
      if (recordingIdRef.current === savedRecordingIdRef.current) {
        draftBaseRecordingIdRef.current = savedRecordingIdRef.current;
      }
      recordingIdRef.current = "";
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = "";
      setAudioUrl("");
      setDraft((current) => ({ ...current, recordedSeconds: 0, recordingId: "" }));
      setStatus("idle");
      setRecordingElapsed(0);
      setRecording(true);
      timerRef.current = window.setInterval(() => {
        const seconds = Math.max(0, Math.floor((performance.now() - startedAtRef.current) / 100) / 10);
        setRecordingElapsed(seconds);
      }, 250);
    } catch {
      if (recorder) {
        recorder.ondataavailable = null;
        recorder.onstop = null;
        if (recorder.state !== "inactive") {
          try {
            recorder.stop();
          } catch {
            // Stopping tracks below remains the final cleanup path.
          }
        }
      }
      stream?.getTracks().forEach((track) => track.stop());
      if (recorderRef.current === recorder) recorderRef.current = null;
      if (streamRef.current === stream) streamRef.current = null;
      chunksRef.current = [];
      if (mountedRef.current && requestId === recordingRequestRef.current) {
        setRecording(false);
        setRecordingMessage("没有取得麦克风权限或录音启动失败，请允许麦克风后重试。");
      }
    } finally {
      if (mountedRef.current && requestId === recordingRequestRef.current) {
        startingRecordingRef.current = false;
        setStartingRecording(false);
      }
    }
  };

  const stopRecording = () => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  };

  const toggleRubric = (id: string) => {
    setStatus("idle");
    setDraft((current) => ({
      ...current,
      rubric: current.rubric.includes(id) ? current.rubric.filter((item) => item !== id) : [...current.rubric, id]
    }));
  };

  const saveCapstone = () => {
    const expectedRecordingId = draftBaseRecordingIdRef.current;
    const saved = onSave(draft, expectedRecordingId);
    if (saved && expectedRecordingId && draft.recordingId && expectedRecordingId !== draft.recordingId) {
      void deleteLearningRecording(expectedRecordingId);
    }
    if (saved) {
      savedRecordingIdRef.current = draft.recordingId;
      draftBaseRecordingIdRef.current = draft.recordingId;
    }
    setStatus(saved ? "saved" : "error");
  };

  return (
    <Surface className="border-[var(--border)]" >
      <div id="capstone-evidence" className="scroll-mt-40 lg:scroll-mt-28">
        <SectionHeading
          kicker="Capstone Evidence"
          title="保存终课作品，再确认达标"
          copy="固定题只能检查结构识别。终课还必须留下至少两分钟的真实口语录音、可复查的韩语输出稿、弱点和目标改写，才能成为作品证据。"
        />
        <div className="mb-4 grid gap-3 rounded-none border border-[var(--line-strong)] bg-[var(--seal-soft)] p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <strong>两分钟真实口语录音</strong>
              <span className={`flex items-center gap-1.5 text-xs font-black ${recordingCheck.passed ? "text-[var(--celadon-text)]" : "text-[var(--cinnabar)]"}`}>
                {recordingCheck.passed ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <Radio className="h-4 w-4" aria-hidden="true" />}
                {recordingCheck.passed ? "时长已达标" : `至少 ${CAPSTONE_MIN_RECORDED_SECONDS} 秒`}
              </span>
            </div>
            <p className="mt-1 text-sm font-bold text-[var(--muted)]">
              {recording
                ? `录音中 ${recordingElapsed.toFixed(1)} / ${CAPSTONE_MIN_RECORDED_SECONDS.toFixed(1)} 秒`
                : draft.recordedSeconds > 0
                  ? `有效录音 ${draft.recordedSeconds.toFixed(1)} 秒。`
                  : "尚未完成有效录音；文本与自检不能替代录音。"}
            </p>
            {audioUrl ? <audio className="mt-3 w-full" controls src={audioUrl} /> : null}
            {recordingMessage ? <p className="mt-2 text-sm font-bold text-[var(--muted)]" role="status">{recordingMessage}</p> : null}
          </div>
          {recording ? (
            <Button type="button" variant="secondary" onClick={stopRecording}>
              <Square className="h-4 w-4" aria-hidden="true" />
              停止录音
            </Button>
          ) : (
            <Button type="button" onClick={startRecording} disabled={startingRecording}>
              <Mic className="h-4 w-4" aria-hidden="true" />
              {startingRecording ? "请求麦克风" : draft.recordedSeconds > 0 ? "重新录音" : "开始录音"}
            </Button>
          )}
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
          <label className="grid gap-2 text-sm font-extrabold">
            两分钟结构化输出稿
            <textarea
              className="focus-ring min-h-72 rounded-none border border-[var(--line-strong)] bg-[var(--surface-solid)] p-3 leading-7"
              value={draft.transcript}
              lang="ko"
              spellCheck={false}
              onChange={(event) => {
                setStatus("idle");
                setDraft((current) => ({ ...current, transcript: event.target.value }));
              }}
              placeholder="用韩语写下立场、理由、例子、对比或让步，以及最终落点。"
            />
            <span className="text-xs font-bold text-[var(--muted)]">韩文字符 {hangulCount}/{CAPSTONE_MIN_HANGUL}，建议先口述录音，再把实际表达转写到这里。</span>
          </label>
          <div className="grid content-start gap-3">
            <div className="grid gap-1.5 rounded-none border border-[var(--line)] bg-[color-mix(in_srgb,var(--navy)_12%,transparent)] p-3">
              <strong className="font-mono text-xs uppercase text-[var(--ocean)]">系统结构检查</strong>
              {systemChecks.map((check) => (
                <span key={check.id} className={`flex items-center gap-2 text-xs font-bold ${check.passed ? "text-[var(--celadon-text)]" : "text-[var(--muted)]"}`}>
                  {check.passed ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <span className="h-4 w-4 rounded-full border border-[var(--line-strong)]" aria-hidden="true" />}
                  {check.label}
                </span>
              ))}
            </div>
            <div className="grid gap-2">
              {capstoneRubric.map((item) => {
                const checked = draft.rubric.includes(item.id);
                return (
                  <label key={item.id} className={`focus-ring grid cursor-pointer grid-cols-[1.5rem_minmax(0,1fr)] items-center gap-2 rounded-none border p-3 text-sm font-bold ${checked ? "border-[var(--green)] bg-[var(--green-soft)]" : "border-[var(--line)] bg-[var(--surface-solid)]"}`}>
                    <input className="sr-only" type="checkbox" checked={checked} onChange={() => toggleRubric(item.id)} />
                    <span className={`grid h-6 w-6 place-items-center rounded-[6px] border ${checked ? "border-[var(--celadon)] bg-[var(--celadon)] text-white" : "border-[var(--line-strong)]"}`}>
                      {checked ? <CheckCircle2 className="h-4 w-4" /> : null}
                    </span>
                    {item.label}
                  </label>
                );
              })}
            </div>
            <label className="grid gap-2 text-sm font-extrabold">
              当前最需要修正的弱点
              <input
                className="focus-ring min-h-11 rounded-none border border-[var(--line-strong)] bg-[var(--surface-solid)] px-3"
                value={draft.weakPoint}
                onChange={(event) => {
                  setStatus("idle");
                  setDraft((current) => ({ ...current, weakPoint: event.target.value }));
                }}
                placeholder="例如：理由展开太短，转折仍像中文"
              />
            </label>
            <label className="grid gap-2 text-sm font-extrabold">
              送回复习的目标改写
              <textarea
                className="focus-ring min-h-24 rounded-none border border-[var(--line-strong)] bg-[var(--surface-solid)] p-3 leading-7"
                value={draft.targetRewrite}
                lang="ko"
                spellCheck={false}
                onChange={(event) => {
                  setStatus("idle");
                  setDraft((current) => ({ ...current, targetRewrite: event.target.value }));
                }}
                placeholder="用更自然的韩语重写最不稳的一段。"
              />
            </label>
            <Button
              type="button"
              disabled={!ready}
              onClick={saveCapstone}
            >
              保存终课作品
            </Button>
            <p role="status" aria-live="polite" className="min-h-5 text-sm font-bold text-[var(--muted)]">
              {status === "saved" ? "终课作品已保存，可以完成固定题并确认达标。" : status === "error" ? "作品未能写入本地存储，请释放空间后重试。" : ready ? "作品证据已完整，可以保存。" : "完成至少 120 秒真实录音，并补齐系统结构检查、四项自检、弱点和韩语目标改写；文本或勾选不能替代录音。"}
            </p>
          </div>
        </div>
      </div>
    </Surface>
  );
}

function LessonBridgePanel({
  bridge,
  dueCount = 0,
  libraryLabel = "",
  needsOnboarding = false
}: {
  bridge: LessonBridge;
  dueCount?: number;
  libraryLabel?: string;
  needsOnboarding?: boolean;
}) {
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
            className={`focus-ring grid min-h-36 rounded-none border p-3 transition hover:-translate-y-0.5 hover:shadow-paper-sm ${
              step.done
                ? "border-[var(--green)] bg-[var(--green-soft)]"
                : "border-[var(--line)] bg-[var(--card)]"
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
        <div className="rounded-none border border-[var(--border)] bg-[color-mix(in_srgb,var(--navy)_12%,transparent)] p-4">
          <p className="inline-flex items-center gap-2 font-mono text-xs font-black uppercase text-[var(--ocean)]">
            <RefreshCcw className="h-4 w-4" />
            复习产物
          </p>
          <strong className="mt-2 block font-serif text-3xl">{bridge.reviewCards}</strong>
          <p className="mt-1 text-sm font-bold leading-6 text-[var(--muted)]">本课可进入 SRS 的题目数。错题会先进入错题卡，达标课程会生成整课复习卡。</p>
        </div>
        <div className="rounded-none border border-[var(--border)] bg-[var(--yellow-soft)] p-4">
          <p className="inline-flex items-center gap-2 font-mono text-xs font-black uppercase text-[var(--brass)]">
            <Radio className="h-4 w-4" />
            真实材料迁移
          </p>
          {bridge.transferMaterials.length ? (
            <div className="mt-3 grid gap-2">
              {bridge.transferMaterials.slice(0, 3).map((material) => (
                bridge.mastered && material.available ? (
                  <Link
                    key={material.id}
                    href={material.href}
                    className="focus-ring rounded-none border border-[var(--line)] bg-[var(--card)] px-3 py-2 text-sm font-bold transition hover:bg-[var(--surface-solid)]"
                  >
                    {material.completed ? "已完成 · " : ""}
                    {material.title}
                    <span className="ml-2 font-mono text-xs text-[var(--muted)]">{material.minutes} min</span>
                  </Link>
                ) : (
                  <div
                    key={material.id}
                    aria-disabled="true"
                    className="grid gap-1 rounded-none border border-[var(--line)] bg-[var(--card)] px-3 py-2 text-sm font-bold text-[var(--muted)]"
                  >
                    <span className="inline-flex items-center gap-2 text-[var(--ink)]">
                      <LockKeyhole className="h-4 w-4 text-[var(--brass)]" />
                      {material.title}
                      <span className="font-mono text-xs text-[var(--muted)]">{material.minutes} min</span>
                    </span>
                    <span className="font-mono text-xs font-black uppercase text-[var(--brass)]">
                      {!bridge.mastered ? "达标后解锁材料迁移" : `还需 ${material.missingPrerequisiteIds.length} 节材料前置课`}
                    </span>
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
      <div className="mt-4 rounded-none border border-[var(--line)] bg-[var(--card)] p-4">
        <p className="inline-flex items-center gap-2 font-mono text-xs font-black uppercase text-[var(--ocean)]">
          <Route className="h-4 w-4" />
          当前路径状态
        </p>
        <p className="mt-2 text-sm font-bold leading-6 text-[var(--muted)]">
          {needsOnboarding
            ? "先完成三分钟入门后，本课才会写入核心路径。"
            : bridge.mastered
            ? dueCount > 0
              ? `已达标。现在有 ${dueCount} 张到期卡，先清复习再继续${bridge.nextLesson ? `第 ${bridge.nextLesson.order} 课` : "后续路线"}。`
              : libraryLabel
                ? `已达标。下一课还差图书馆门槛，${libraryLabel}再上课。`
                : bridge.nextLesson
                  ? `已达标，下一课是第 ${bridge.nextLesson.order} 课：${bridge.nextLesson.title}。`
                  : "核心课程已达标，下一步应转向真实材料、输出档案和母语者作品集。"
            : bridge.unlocked
              ? `本课可学习；达到 ${UNLOCK_SCORE}% 后会正式写入核心路径。`
              : bridge.missingPrerequisites.length
                ? `旁路预览中；先补 ${bridge.missingPrerequisites.map((item) => `第 ${item.order} 课`).join("、")} 更稳。`
                : libraryLabel
                  ? `旁路预览中；${libraryLabel}后才会写入核心路径。`
                  : "旁路预览中；先补齐前置课或图书馆门槛更稳。"}
        </p>
      </div>
    </Surface>
  );
}
