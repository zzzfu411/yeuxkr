"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, LockKeyhole, Radio, RefreshCcw, Route } from "lucide-react";
import { VisualPanel } from "@/components/assets/visual-panel";
import { DrillRunner } from "@/components/learning/drill-runner";
import { RomanizationText } from "@/components/korean/romanization-text";
import { Button } from "@/components/ui/button";
import { SectionHeading, Surface } from "@/components/ui/section";
import { TrackRow } from "@/components/ui/track-row";
import { getLessonPrerequisites, getNextLesson, isLessonMastered, isLessonUnlocked, normalizeTeachEntry, UNLOCK_SCORE } from "@/data/curriculum-runtime";
import type { DisplayVisualAssetId } from "@/data/visuals/assets";
import { CAPSTONE_LESSON_ID, isValidCapstoneEvidence } from "@/lib/learning/capstone";
import { buildLessonBridge, type LessonBridge } from "@/lib/learning/lesson-bridge";
import { assessLessonAttempt } from "@/lib/learning/lesson-assessment";
import { checkLessonTaskEvidence, lessonCompletionTask } from "@/lib/learning/lesson-evidence";
import { clearLessonPracticeSession, getLessonPracticeSession, saveLessonPracticeSession } from "@/lib/learning/lesson-session";
import { lessonQuestions } from "@/lib/learning/quiz";

import { getLibraryGateForLesson, libraryRepairHref } from "@/lib/learning/path-gates";
import { ABILITY_LABELS, libraryCountsForWrite } from "@/lib/learning/workspace";
import { useLearningWorkspace } from "@/lib/learning/use-learning-workspace";

import { speakKorean } from "@/lib/speech";

import { LessonResultActions } from "@/components/learning/lesson-result-actions";
import { LessonTaskEvidencePanel, CapstoneEvidencePanel } from "@/components/learning/lesson-evidence-panels";

const focusLabels: Record<string, string> = {
  discourse: "篇章组织",
  grammar: "语法",
  listening: "听力",
  media: "媒体听读",
  native: "自然表达",
  pragmatics: "场景语用",
  script: "字形",
  sentence: "造句",
  sound: "发音",
  speaking: "口语",
  time: "时间表达",
  travel: "出行",
  vocab: "词汇"
};

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
    libraryMissing: libraryGate.missing,
    onboarded: !needsOnboarding
  });
  const savedCompletedIds = new Set(workspace.progress.completedLessons);
  const savedLessonScores = savedScore !== null && unlocked
    ? { ...workspace.progress.lessonScores, [lesson.id]: Math.max(workspace.progress.lessonScores[lesson.id] ?? 0, savedScore) }
    : workspace.progress.lessonScores;
  const task = lessonCompletionTask(lesson);
  const taskEvidence = workspace.progress.lessonTaskEvidence[lesson.id];
  const taskCheck = checkLessonTaskEvidence(task, taskEvidence);
  const isCapstone = lesson.id === CAPSTONE_LESSON_ID;
  const capstoneEvidence = workspace.progress.capstoneEvidence;
  const capstoneReady = !isCapstone || isValidCapstoneEvidence(capstoneEvidence);
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
      <section className="studio-panel relative grid lg:grid-cols-[minmax(0,1fr)_28rem]">
        <div className="paper-rail p-5 md:p-6">
          <Button asChild variant="ghost" size="sm">
            <Link href="/path">
              <ArrowLeft className="h-4 w-4" />
              返回路径
            </Link>
          </Button>
          <p className="eyebrow mt-5">
            第 {lesson.order} 课 · {lesson.duration} 分钟
          </p>
          <h1 className="inkline mt-2 max-w-4xl font-serif text-4xl font-normal leading-tight md:text-6xl">
            {lesson.title}
          </h1>
          <p className="mt-4 max-w-3xl leading-7 text-[var(--muted)]">{lesson.subtitle}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {lesson.focus.map((item: string) => (
              <span key={item} className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--wash-1)] px-3 py-1 text-sm font-medium">
                {focusLabels[item] ?? item}
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
            <div className="mt-5 w-fit rounded-[var(--radius)] border border-[var(--green)] bg-[var(--green-soft)] p-3 text-sm font-medium text-[var(--celadon)]">
              本课已完成，当前最高分 {workspace.progress.lessonScores[lesson.id] ?? 0}%。
            </div>
          ) : null}
          {needsOnboarding ? (
            <div className="mt-5 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--wash-2)] p-3 text-sm font-medium leading-6 text-[var(--ink-soft)]">
              还没完成三分钟入门。先确认目标和韩文输入，第一课才会计入学习进度。
              <Link href="/onboarding" className="ml-2 underline decoration-2 underline-offset-2">
                去入门
              </Link>
            </div>
          ) : !unlocked ? (
            <div className="mt-5 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--wash-2)] p-3 text-sm font-medium leading-6 text-[var(--ink-soft)]">
              当前是预览：
              {missingPrerequisites.length
                ? `建议先把 ${missingPrerequisites.map((item: any) => item.title).join("、")} 学到 ${UNLOCK_SCORE}%。`
                : null}
              {libraryGate.missing.length
                ? `先把${libraryGate.missing.map((gap) => `${gap.label} ${gap.current}/${gap.target}`).join("、")}补上。`
                : null}
              本页练习只会记录预览分数，不会提升能力、生成错题卡或解锁后续核心课。
            </div>
          ) : null}
        </div>
        <VisualPanel asset={getLessonVisualAsset(lesson.id)} priority sizes="(max-width: 1024px) 100vw, 28rem" className="min-h-56 border-0 md:min-h-80" />
      </section>

      <div id="lesson-content" className="grid scroll-mt-40 gap-5 lg:scroll-mt-28 lg:grid-cols-[24rem_minmax(0,1fr)]">
        <aside className="surface h-fit p-5 lg:sticky lg:top-24">
          <p className="eyebrow">这一课</p>
          <div className="mt-4 grid gap-2">
            {lesson.objectives.map((item: string) => (
              <span key={item} className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--wash-1)] p-3 text-sm font-medium leading-6">
                {item}
              </span>
            ))}
          </div>
          <div className="mt-5 rounded-[var(--radius)] border-l-2 border-[var(--seal)] bg-[var(--wash-2)] p-3">
            <p className="eyebrow">本课会练</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {bridge.abilities.map((ability) => (
                <span key={ability} className="border-b border-[var(--line)] px-2 py-1 text-xs font-medium text-[var(--ink-soft)]">
                  {ABILITY_LABELS[ability]}
                </span>
              ))}
            </div>
          </div>
        </aside>

        <div className="grid gap-5">
          <Surface>
            <SectionHeading kicker="先学一点" title="先建立直觉" />
            <div>
              {lesson.teach.map(normalizeTeachEntry).map((entry: ReturnType<typeof normalizeTeachEntry>, index: number) => (
                <TrackRow
                  key={`${index}-${entry.body}`}
                  index={index + 1}
                  glyph={String(index + 1)}
                  kicker="先学一点"
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
                      className="font-mono text-xs font-medium text-[var(--ink-soft)]"
                    />
                    {entry.examples?.length ? (
                      <div className="grid gap-1.5">
                        {entry.examples.map((example: { ko: string; zh: string; note?: string }) => (
                          <button
                            key={example.ko}
                            type="button"
                            className="focus-ring flex flex-wrap items-baseline gap-2 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--card)] p-2 text-left transition-colors hover:bg-[var(--wash-2)]"
                            onClick={() => speakKorean(example.ko)}
                            aria-label={`播放 ${example.ko}`}
                          >
                            <span className="hangul-display text-lg font-normal" lang="ko">{example.ko}</span>
                            <span className="text-sm text-[var(--muted)]">{example.zh}</span>
                            {example.note ? <span className="text-xs font-medium text-[var(--ink-mute)]">{example.note}</span> : null}
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
              evidence={capstoneEvidence}
              onSave={saveCapstoneEvidence}
              onInvalidateRecording={invalidateCapstoneRecording}
            />
          ) : null}

          {task ? (
            <LessonTaskEvidencePanel
              lessonId={lesson.id}
              task={task}
              evidence={taskEvidence}
              onSave={saveLessonTaskEvidence}
              onInvalidateRecording={invalidateLessonTaskRecording}
            />
          ) : null}

          <Surface>
            {needsOnboarding ? (
              <div className="grid gap-3 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--wash-2)] p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <div>
                  <strong className="font-serif text-2xl font-normal">先完成三分钟入门</strong>
                  <p className="mt-1 text-sm font-bold leading-6 text-[var(--muted)]">
                    确认目标和韩文输入后，第一课才会计入学习进度。
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
              <div className="mb-4 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--wash-2)] p-3 text-sm font-medium leading-6 text-[var(--muted)]">
                已恢复上次进度：第 {restoredSession.currentIndex + 1} 题，已保存 {restoredSession.answers.length}/{questions.length} 个回答。完成本课后会自动清除。
              </div>
            ) : null}
            {sessionSaveError ? (
              <div className="mb-4 rounded-[var(--radius)] border border-[var(--seal)] bg-[var(--seal-soft)] p-3 text-sm font-medium leading-6 text-[var(--seal-ink)]">
                练习进度没有保存。你可以继续完成本页，但刷新或离开后可能需要重做；请释放浏览器存储空间后再试。
              </div>
            ) : null}
            {sessionClearError ? (
              <div className="mb-4 grid gap-3 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--wash-2)] p-3 text-sm font-medium leading-6 text-[var(--ink-soft)] md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <span>成绩已保存，但上次练习状态没有清理成功。刷新后可能还会看到旧进度，请释放浏览器存储空间后重试。</span>
                <Button type="button" variant="secondary" size="sm" onClick={retryClearLessonSession}>
                  重试清理
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
                      return false;
                    }
                    const cleared = clearLessonPracticeSession(lesson.id);
                    setSessionClearError(!cleared);
                    if (cleared) setRestoredSession(null);
                    setSessionSaveError(false);
                    setSaveError(false);
                    setSavedAssessmentReady(assessment.corePassed);
                    setSavedScore(score);
                    return true;
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
        kicker="学完之后"
        title="完成本课后，接下来做什么"
        copy="本课完成后会计入主线进度，并生成复习卡。之后可以继续下一课，或到情境听读里再用一次。"
      />
      <div className="grid gap-3 xl:grid-cols-4">
        {bridge.steps.map((step) => (
          <Link
            key={step.id}
            href={step.href}
            className={`focus-ring grid min-h-36 rounded-[var(--radius)] border p-3 transition-colors hover:bg-[var(--wash-2)] ${
              step.done
                ? "border-[var(--green)] bg-[var(--green-soft)]"
                : "border-[var(--line)] bg-[var(--card)]"
            }`}
          >
            <span className="flex items-start justify-between gap-2">
              <span className="font-script text-sm font-normal text-[var(--ink-mute)]">{step.label}</span>
              {step.done ? <CheckCircle2 className="h-4 w-4 text-[var(--celadon)]" /> : step.id === "prerequisite" ? <LockKeyhole className="h-4 w-4 text-[var(--ink-mute)]" /> : <ArrowRight className="h-4 w-4 text-[var(--muted)]" />}
            </span>
            <strong className="mt-3 font-serif text-xl leading-tight">{step.title}</strong>
            <span className="mt-2 text-sm font-bold leading-6 text-[var(--muted)]">{step.detail}</span>
          </Link>
        ))}
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--wash-2)] p-4">
          <p className="eyebrow inline-flex items-center gap-2">
            <RefreshCcw className="h-4 w-4" />
            复习产物
          </p>
          <strong className="mt-2 block font-serif text-3xl">{bridge.reviewCards}</strong>
          <p className="mt-1 text-sm font-bold leading-6 text-[var(--muted)]">本课可加入间隔复习的题目数。答错会先进入错题本，完成课程后会生成整课复习卡。</p>
        </div>
        <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--wash-1)] p-4">
          <p className="eyebrow inline-flex items-center gap-2">
            <Radio className="h-4 w-4" />
            情境听读
          </p>
          {bridge.transferMaterials.length ? (
            <div className="mt-3 grid gap-2">
              {bridge.transferMaterials.slice(0, 3).map((material) => (
                bridge.mastered && material.available ? (
                  <Link
                    key={material.id}
                    href={material.href}
                    className="focus-ring rounded-[var(--radius)] border border-[var(--line)] bg-[var(--card)] px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--wash-2)]"
                  >
                    {material.completed ? "已完成 · " : ""}
                    {material.title}
                    <span className="ml-2 font-mono text-xs text-[var(--muted)]">{material.minutes} 分钟</span>
                  </Link>
                ) : (
                  <div
                    key={material.id}
                    aria-disabled="true"
                    className="grid gap-1 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--card)] px-3 py-2 text-sm font-medium text-[var(--muted)]"
                  >
                    <span className="inline-flex items-center gap-2 text-[var(--ink)]">
                      <LockKeyhole className="h-4 w-4 text-[var(--ink-mute)]" />
                      {material.title}
                      <span className="font-mono text-xs text-[var(--muted)]">{material.minutes} 分钟</span>
                    </span>
                    <span className="font-mono text-xs font-medium text-[var(--ink-mute)]">
                      {!bridge.mastered ? "完成本课后开放" : `还需 ${material.missingPrerequisiteIds.length} 节前置课`}
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
      <div className="mt-4 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--wash-1)] p-4">
        <p className="eyebrow inline-flex items-center gap-2">
          <Route className="h-4 w-4" />
          当前路径状态
        </p>
        <p className="mt-2 text-sm font-bold leading-6 text-[var(--muted)]">
          {needsOnboarding
            ? "先完成三分钟入门，本课才会计入主线进度。"
            : bridge.mastered
            ? dueCount > 0
              ? `本课已完成。现在有 ${dueCount} 张到期卡，先复习再继续${bridge.nextLesson ? `第 ${bridge.nextLesson.order} 课` : "后续课程"}。`
              : libraryLabel
                ? `本课已完成。先${libraryLabel}，再开始下一课。`
                : bridge.nextLesson
                  ? `本课已完成。下一课是第 ${bridge.nextLesson.order} 课：${bridge.nextLesson.title}。`
                  : "主线课程已完成。接下来保持复习，并逐步加入原生材料和长期作品练习。"
            : bridge.unlocked
              ? `本课可学习；达到 ${UNLOCK_SCORE}% 后会计入主线进度。`
              : bridge.missingPrerequisites.length
                ? `当前是预览；建议先学 ${bridge.missingPrerequisites.map((item) => `第 ${item.order} 课`).join("、")}。`
                : libraryLabel
                  ? `当前是预览；${libraryLabel}后才会计入主线进度。`
                  : "当前是预览。先完成前置课或补齐阶段基础内容。"}
        </p>
      </div>
    </Surface>
  );
}
