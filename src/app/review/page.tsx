"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpenCheck, CircleAlert, ScrollText } from "lucide-react";
import { VisualPanel } from "@/components/assets/visual-panel";
import { DrillRunner } from "@/components/learning/drill-runner";
import { LearningCompass } from "@/components/learning/learning-compass";
import { Button } from "@/components/ui/button";
import { ModuleHero, PageHeader, SectionHeading, Surface } from "@/components/ui/section";
import { buildReviewQuestions } from "@/lib/learning/quiz";
import { getDueCardsFromState, getSrsStateFromRaw, summarizeSrsState } from "@/lib/learning/srs";
import { defaultProfile, defaultProgress, parseJson, STORAGE_KEYS, useClientNowOnce, useStorageRawOnce } from "@/lib/learning/storage";
import { needsOnboardingFunnel } from "@/lib/learning/compass";
import { buildLearningWorkspace, submitReviewCardAndProgress, normalizeLearningProgress, normalizeUserProfile } from "@/lib/learning/workspace";

const REVIEW_STORAGE_REFRESH_KEYS = new Set([STORAGE_KEYS.profile, STORAGE_KEYS.progress, STORAGE_KEYS.srs]);
const LEARNING_REFRESH_EVENT_TYPES = new Set(["kirina:learning", "kirina:learning-batch", "storage"]);

export default function ReviewPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const timeout = window.setTimeout(() => setMounted(true), 0);
    return () => {
      window.clearTimeout(timeout);
    };
  }, []);

  if (!mounted) return <ReviewLoading />;

  return <ReviewContent />;
}

function ReviewContent() {
  const [sessionKey, setSessionKey] = useState(0);
  const [reviewError, setReviewError] = useState("");
  const [queueChanged, setQueueChanged] = useState(false);
  const profileRaw = useStorageRawOnce(STORAGE_KEYS.profile, sessionKey);
  const progressRaw = useStorageRawOnce(STORAGE_KEYS.progress, sessionKey);
  const srsRaw = useStorageRawOnce(STORAGE_KEYS.srs, sessionKey);
  const now = useClientNowOnce(sessionKey);
  const profile = useMemo(() => normalizeUserProfile(parseJson(profileRaw, defaultProfile())), [profileRaw]);
  const progress = useMemo(() => normalizeLearningProgress(parseJson(progressRaw, defaultProgress())), [progressRaw]);
  const srsState = useMemo(() => getSrsStateFromRaw(srsRaw), [srsRaw]);
  const srs = useMemo(() => summarizeSrsState(srsState, now), [srsState, now]);
  const workspace = useMemo(() => buildLearningWorkspace(profile, progress, srs.due), [profile, progress, srs.due]);
  const dueCards = useMemo(() => getDueCardsFromState(srsState, 30, now), [srsState, now]);
  const questions = useMemo(() => {
    return buildReviewQuestions(dueCards);
  }, [dueCards]);

  useEffect(() => {
    const refreshQueue = (event: Event) => {
      if (!reviewRefreshEventMatches(event)) return;
      if (questions.length && LEARNING_REFRESH_EVENT_TYPES.has(event.type)) {
        if (event.type === "storage") setQueueChanged(true);
        return;
      }
      setReviewError("");
      setSessionKey((value) => value + 1);
    };
    window.addEventListener("kirina:learning", refreshQueue);
    window.addEventListener("kirina:learning-batch", refreshQueue);
    window.addEventListener("storage", refreshQueue);
    return () => {
      window.removeEventListener("kirina:learning", refreshQueue);
      window.removeEventListener("kirina:learning-batch", refreshQueue);
      window.removeEventListener("storage", refreshQueue);
    };
  }, [questions.length]);

  useEffect(() => {
    if (questions.length) return;
    const nextDueAt = Object.values(srsState.cards)
      .map((card) => Number(card.dueAt))
      .filter((dueAt) => Number.isFinite(dueAt) && dueAt > now)
      .sort((a, b) => a - b)[0];
    if (!nextDueAt) return;
    const delay = Math.min(Math.max(1000, nextDueAt - now + 250), 60_000);
    const timeout = window.setTimeout(() => {
      setReviewError("");
      setSessionKey((value) => value + 1);
    }, delay);
    return () => window.clearTimeout(timeout);
  }, [now, questions.length, srsState]);

  return (
    <div className="grid gap-6">
      <ReviewHeader />

      <Surface>
        <SectionHeading kicker="오늘의 복습 · 今天复习" title="到期队列" />
        {queueChanged ? (
          <div className="mb-4 grid gap-3 border-l-2 border-[var(--seal)] bg-[var(--seal-soft)] p-4" role="status">
            <p>其他页面已更新学习数据。已保存的答案会保留，请读取最新队列后继续。</p>
            <Button variant="secondary" onClick={() => {
              setQueueChanged(false);
              setReviewError("");
              setSessionKey((value) => value + 1);
            }}>读取更新后的队列</Button>
          </div>
        ) : null}
        {questions.length ? (
          <DrillRunner
            key={sessionKey}
            questions={questions}
            finishLabel="结束复习"
            recordMistakes={false}
            onAnswer={(entry) => {
              const card = dueCards.find((item) => item.id === entry.question.id);
              const result = card ? submitReviewCardAndProgress(card, entry.correct, { skipped: Boolean(entry.skipped) }) : { ok: false as const, reason: "missing" as const };
              if (result.ok === false) {
                if (result.reason === "storage") {
                  setReviewError("这张卡片没有保存到复习进度。请检查浏览器存储权限和剩余空间，再重试。");
                } else {
                  setQueueChanged(true);
                  setReviewError("这张卡片已被更新、移除或推迟，本次答案未重复计分。");
                }
                return false;
              } else {
                setReviewError("");
              }
            }}
            onFinish={() => {
              setQueueChanged(false);
              setSessionKey((value) => value + 1);
            }}
          />
        ) : (
          <div className="studio-panel relative grid gap-4 md:grid-cols-[minmax(0,1fr)_16rem]">
            <span className="paper-tape left-8 top-[-8px]" aria-hidden="true" />
            <div className="paper-rail p-5 pt-8">
              <p className="eyebrow">오늘은 맑음 · 今天没有到期项</p>
              <h2 className="inkline mt-2 font-serif text-3xl font-normal">现在没有到期复习</h2>
              <p className="mt-2 leading-7 text-[var(--muted)]">
                {needsOnboardingFunnel(profile, progress)
                  ? "先完成入门，再把卡片送进复习队列。"
                  : "先学一课或加入几个词。综合测验只会抽取你已经学过的内容。"}
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <Button asChild>
                  <Link href={needsOnboardingFunnel(profile, progress) ? "/onboarding" : "/path"}>
                    <ArrowRight className="h-4 w-4" />
                    {needsOnboardingFunnel(profile, progress) ? "先去入门" : "继续路径"}
                  </Link>
                </Button>
                {needsOnboardingFunnel(profile, progress) ? null : (
                  <>
                    <Button asChild variant="secondary">
                      <Link href="/mistakes">
                        <CircleAlert className="h-4 w-4" />
                        查看错题
                      </Link>
                    </Button>
                    <Button asChild variant="secondary">
                      <Link href="/vocabulary">
                        <ScrollText className="h-4 w-4" />
                        积累词汇
                      </Link>
                    </Button>
                    <Button asChild variant="secondary">
                      <Link href="/hangul">
                        <BookOpenCheck className="h-4 w-4" />
                        先补韩文
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
            <VisualPanel asset="empty" priority treatment="inset" className="min-h-52 border-0 shadow-none" />
          </div>
        )}
        {reviewError ? (
          <p className="mt-4 border-l-2 border-[var(--seal)] bg-[var(--seal-soft)] px-4 py-3 text-sm leading-6 text-[var(--cinnabar)]" role="alert">
            {reviewError}
          </p>
        ) : null}
      </Surface>

      <ReviewStatusHero srs={srs} />
      <LearningCompass workspace={workspace} active="review" condensed />
    </div>
  );
}

function reviewRefreshEventMatches(event: Event) {
  if (event instanceof StorageEvent) {
    return !event.key || REVIEW_STORAGE_REFRESH_KEYS.has(event.key);
  }
  if (event instanceof CustomEvent) {
    const detail = event.detail as { key?: string; keys?: string[] } | undefined;
    if (typeof detail?.key === "string") return REVIEW_STORAGE_REFRESH_KEYS.has(detail.key);
    if (Array.isArray(detail?.keys)) return detail.keys.some((key) => REVIEW_STORAGE_REFRESH_KEYS.has(key));
    return true;
  }
  return event.type === "kirina:learning-batch";
}

function ReviewLoading() {
  return (
    <div className="grid gap-6">
      <ReviewHeader />
      <Surface>
        <SectionHeading kicker="오늘의 복습 · 今天复习" title="到期队列" />
        <div className="studio-panel relative grid gap-4 md:grid-cols-[minmax(0,1fr)_16rem]">
          <span className="paper-tape left-8 top-[-8px]" aria-hidden="true" />
          <div className="paper-rail p-5 pt-8">
            <p className="eyebrow">잠시 · 正在读取</p>
            <h2 className="inkline mt-2 font-serif text-3xl font-normal">正在读取本机复习队列</h2>
            <p className="mt-2 leading-7 text-[var(--muted)]">复习卡片保存在本机浏览器里，页面会在挂载后读取到期状态。</p>
          </div>
          <VisualPanel asset="review" priority decorative treatment="inset" className="min-h-52 border-0 shadow-none" />
        </div>
      </Surface>
      <ReviewStatusHero srs={{ total: 0, due: 0, mature: 0, shaky: 0 }} />
    </div>
  );
}

function ReviewHeader() {
  return (
    <PageHeader
      kicker="복습 · 复习"
      title="先复习到期内容，再学新课。"
      copy="间隔复习（SRS）会根据你的答案安排下次出现时间。答得稳，间隔会变长；答错了，很快会再见到它。"
      compact
    >
      <Button asChild variant="secondary">
        <Link href="/mistakes">
          <CircleAlert className="h-4 w-4" />
          查看错题本
        </Link>
      </Button>
    </PageHeader>
  );
}

function ReviewStatusHero({ srs }: { srs: { total: number; due: number; mature: number; shaky: number } }) {
  return (
    <ModuleHero
      kicker="다시 만날 때 · 下次再见"
      title="今天该复习什么？"
      copy="这里都是你已经学过的内容。先做已到期和薄弱的卡片，其余会按计划稍后出现。"
      asset="review"
    >
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Metric label="总卡片" value={String(srs.total)} />
        <Metric label="到期" value={String(srs.due)} />
        <Metric label="成熟" value={String(srs.mature)} />
        <Metric label="薄弱" value={String(srs.shaky)} />
      </div>
    </ModuleHero>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-[var(--line)] bg-[var(--wash-1)] px-3 py-3 shadow-[inset_0_1px_0_var(--sheen)]">
      <strong className="block font-serif text-2xl font-normal">{value}</strong>
      <span className="font-[family-name:var(--font-script)] text-sm text-[var(--muted)]">{label}</span>
    </div>
  );
}
