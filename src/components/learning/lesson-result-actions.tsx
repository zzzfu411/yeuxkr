"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { RefreshCcw, Route } from "lucide-react";

import { Button } from "@/components/ui/button";

import { UNLOCK_SCORE } from "@/data/curriculum-runtime";

import { type LessonBridge } from "@/lib/learning/lesson-bridge";
import { type LessonAssessmentResult } from "@/lib/learning/lesson-assessment";

export function LessonResultActions({
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
  onSave: (score: number, assessment: LessonAssessmentResult) => boolean | void;
}) {
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  const handleSave = () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    const saved = onSave(score, assessment);
    if (saved === false) {
      savingRef.current = false;
      setSaving(false);
    }
  };

  if (saveError) {
    return (
      <div className="grid gap-3 rounded-[var(--radius)] border border-[var(--seal)] bg-[var(--seal-soft)] p-4">
        <strong className="font-serif text-2xl font-normal text-[var(--seal-ink)]">成绩没有保存</strong>
        <p className="text-sm font-bold leading-6 text-[var(--muted)]">
          请释放浏览器存储空间或关闭隐私限制后再试。当前页面会保留，方便你重新保存。
        </p>
        <Button type="button" size="sm" disabled={saving} onClick={handleSave}>
          重新保存
        </Button>
      </div>
    );
  }

  if (savedScore === null) {
    if (score >= UNLOCK_SCORE && !completionGateReady) {
      return (
        <div className="grid gap-3 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--wash-2)] p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div>
            <strong className="font-serif text-2xl font-normal">课程题目已通过，还差{completionGateLabel ?? "本课作品"}</strong>
            <p className="mt-1 text-sm font-bold leading-6 text-[var(--muted)]">先完成并保存本课作品，课程才会计入主线进度。</p>
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
        <div className="grid gap-3 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--wash-2)] p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div>
            <strong className="font-serif text-2xl font-normal">总分达到要求，听力或输出还没过</strong>
            <p className="mt-1 text-sm font-bold leading-6 text-[var(--muted)]">{lessonAssessmentMessage(assessment)}</p>
          </div>
          <Button type="button" size="sm" disabled={saving} onClick={handleSave}>保存本次结果</Button>
        </div>
      );
    }
    return (
      <Button type="button" disabled={saving} onClick={handleSave}>
        继续
      </Button>
    );
  }

  if (!corePathSaved) {
    return (
      <div className="grid gap-3 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--wash-2)] p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div>
          <strong className="font-serif text-2xl font-normal">{unlocked ? "成绩已保存，但还未达标" : "预览成绩已保存"}</strong>
          <p className="mt-1 text-sm font-bold leading-6 text-[var(--muted)]">
            {unlocked
              ? `${lessonAssessmentMessage(assessment)} 总分和各项要求都达到后，才会生成整课复习卡并解锁下一课。`
              : "这次只保存预览分数；建议先完成前置课。"}
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
    <div className="grid gap-3 rounded-[var(--radius)] border border-[var(--green)] bg-[var(--green-soft)] p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
      <div>
        <strong className="font-serif text-2xl font-normal">{unlocked ? "课程成绩已保存" : "预览成绩已保存"}</strong>
        <p className="mt-1 text-sm font-bold leading-6 text-[var(--muted)]">
          {unlocked
            ? reviewFirst
              ? `本课已完成。现在有 ${dueCount} 张到期卡，先复习再继续下一课。`
              : libraryFirst
                ? "本课已完成。下一课还需要补齐阶段基础内容。"
                : `本课已完成。可以继续下一课，或稍后复习这 ${bridge.reviewCards} 张卡。`
            : "这次只保存预览分数；建议先完成前置课。"}
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
            <Link href={bridge.transferMaterials.find((material) => material.available && !material.completed)?.href ?? bridge.transferMaterials.find((material) => material.available)!.href}>去做情境听读</Link>
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
    missing.push(assessment.listeningDeferred || assessment.listeningSkipped ? "至少答对一题听辨或听写；跳过音频时，本课不能计入主线进度" : "听辨题需达到 60%");
  }
  return missing.length ? missing.join("；") : "各项要求都已达到。";
}
