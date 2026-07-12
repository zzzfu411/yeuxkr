"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, CircleAlert, Clock, Play, RefreshCcw, Trash2 } from "lucide-react";
import { VisualPanel } from "@/components/assets/visual-panel";
import { DrillRunner } from "@/components/learning/drill-runner";
import { LearningCompass } from "@/components/learning/learning-compass";
import { Button } from "@/components/ui/button";
import { InlineAlert } from "@/components/ui/inline-alert";
import { ModuleHero, PageHeader, SectionHeading, Surface } from "@/components/ui/section";
import { buildMistakeInsights, buildRetrainQuestions, summarizeMistakes, type MistakeInsight } from "@/lib/learning/mistakes";
import type { Question } from "@/lib/learning/quiz";
import { getSrsStateFromRaw } from "@/lib/learning/srs";
import { STORAGE_KEYS, useClientNow, useStorageRaw } from "@/lib/learning/storage";
import { gradeReviewCardAndProgress, removeMistakeCardAndPracticeItem, useLearningWorkspace } from "@/lib/learning/workspace";

export default function MistakesPage() {
  const { workspace } = useLearningWorkspace();
  const srsRaw = useStorageRaw(STORAGE_KEYS.srs);
  const now = useClientNow();
  const [status, setStatus] = useState<"idle" | "removed" | "error">("idle");
  const [retrainQuestions, setRetrainQuestions] = useState<Question[] | null>(null);
  const [retrainError, setRetrainError] = useState("");
  const srsState = useMemo(() => getSrsStateFromRaw(srsRaw), [srsRaw]);
  const insights = useMemo(() => buildMistakeInsights(srsState, now), [srsState, now]);
  const summary = useMemo(() => summarizeMistakes(srsState, now), [srsState, now]);
  const urgent = insights.slice(0, 4);
  const dueIds = useMemo(() => insights.filter((item) => item.due).map((item) => item.id), [insights]);

  const handleRemove = (id: string) => {
    setStatus(removeMistakeCardAndPracticeItem(id) ? "removed" : "error");
  };

  const startRetrain = (ids: string[] | null) => {
    const questions = buildRetrainQuestions(srsState, ids);
    setRetrainError(questions.length ? "" : "这些错题缺少可重练的题面。");
    setRetrainQuestions(questions.length ? questions : null);
  };

  return (
    <div className="grid gap-6">
      <PageHeader
        kicker="Mistake Notebook"
        title="把反复出错的地方变成下一次的学习路线。"
        copy="错题本直接读取 SRS 里的错题卡：先处理到期和反复错的，再回到来源模块补结构。这里不是惩罚清单，而是把复习、测验和自学重新接起来的弱项地图。"
        compact
      >
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/review">
              <RefreshCcw className="h-4 w-4" />
              处理到期复习
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/quiz">
              <ArrowRight className="h-4 w-4" />
              重新测一组
            </Link>
          </Button>
        </div>
      </PageHeader>

      <ModuleHero
        kicker="Weak Point Loop"
        title={summary.total ? `${summary.due} 个到期，${summary.repeated} 个反复错。` : "暂时没有错题债。"}
        copy="每张错题都保留原题、正确答案、错误次数和间隔复习盒子。清掉到期项以后，再把反复错的知识点送回课程、词汇、语法或材料输入。"
        asset="review"
        imageSize="22rem"
        imageClassName="min-h-64 rounded-none border-0"
      >
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <MistakeMetric label="总错题" value={summary.total} />
          <MistakeMetric label="到期" value={summary.due} />
          <MistakeMetric label="反复错" value={summary.repeated} />
          <MistakeMetric label="已稳住" value={summary.mastered} />
        </div>
      </ModuleHero>

      {status === "removed" ? <InlineAlert tone="success">这张错题已经移出本地 SRS；如果以后再次答错，它会重新回来。</InlineAlert> : null}
      {status === "error" ? <InlineAlert>这张错题没有成功移出，请释放浏览器存储空间后再试。</InlineAlert> : null}
      {retrainError ? <InlineAlert>{retrainError}</InlineAlert> : null}
      <LearningCompass workspace={workspace} active="mistakes" condensed />

      {retrainQuestions ? (
        <Surface>
          <SectionHeading
            kicker="Retrain"
            title="错题定向重练"
            copy="做对会按间隔延后这张卡，做错会立即回到队首。练完这组再回到优先队列。"
            action={
              <Button type="button" variant="secondary" size="sm" onClick={() => setRetrainQuestions(null)}>
                退出重练
              </Button>
            }
          />
          <DrillRunner
            questions={retrainQuestions}
            finishLabel="结束重练"
            recordMistakes={false}
            onAnswer={(entry) => {
              const card = srsState.cards[entry.question.id];
              if (card && !gradeReviewCardAndProgress(card, entry.correct)) {
                setRetrainError("这张卡片没有成功写入复习进度，请释放浏览器存储空间后再继续。");
                return false;
              }
              setRetrainError("");
            }}
            onFinish={() => setRetrainQuestions(null)}
          />
        </Surface>
      ) : null}

      {insights.length ? (
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <Surface>
            <SectionHeading
              kicker="Priority Queue"
              title="优先处理队列"
              copy="排序会优先看是否到期、错误次数、正确次数和盒子位置。越靠前，越值得今天先处理。"
              action={
                <Button type="button" size="sm" disabled={!dueIds.length} onClick={() => startRetrain(dueIds)}>
                  <Play className="h-4 w-4" />
                  重练全部到期（{dueIds.length}）
                </Button>
              }
            />
            <div className="grid gap-3">
              {insights.map((item) => (
                <MistakeCard key={item.id} item={item} now={now} onRemove={handleRemove} onRetrain={(id) => startRetrain([id])} />
              ))}
            </div>
          </Surface>

          <aside className="grid h-fit gap-4 xl:sticky xl:top-24">
            <Surface>
              <SectionHeading kicker="Repair Plan" title="三步修复方案" />
              <div className="grid gap-3">
                <PlanStep index={1} title="先清到期" detail="进入复习页，把已经到期的错题先重新写对，避免它们拖住新课输入。" href="/review" />
                <PlanStep index={2} title="回到来源" detail="反复错的题不要只背答案，按来源回到词汇、语法、韩文结构或真实材料页补原理。" href="/path" />
                <PlanStep index={3} title="再做迁移" detail="清完一轮后做综合测验，检查能不能在不同题型和语境里调用。" href="/quiz" />
              </div>
            </Surface>

            <Surface>
              <SectionHeading kicker="Hot Four" title="今天最该照看的 4 个点" />
              <div className="grid gap-2">
                {urgent.map((item) => (
                  <Link
                    key={item.id}
                    href="/review"
                    className="focus-ring rounded-[8px] border border-[rgba(185,78,60,0.24)] bg-[rgba(185,78,60,0.07)] p-3 transition hover:-translate-y-0.5 hover:shadow-paper-sm"
                  >
                    <span className="font-mono text-xs font-black uppercase text-[var(--cinnabar)]">{item.sourceLabel}</span>
                    <strong className="mt-1 line-clamp-2 block text-sm leading-5">{item.prompt}</strong>
                  </Link>
                ))}
              </div>
            </Surface>
          </aside>
        </section>
      ) : (
        <Surface>
          <div className="grid overflow-hidden rounded-[8px] border border-[var(--line)] bg-[rgba(255,250,240,0.62)] md:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="p-5">
              <p className="eyebrow">Clean Slate</p>
              <h2 className="mt-2 font-serif text-3xl font-black">当前没有可追踪错题。</h2>
              <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-[var(--muted)]">
                继续做课程、测验或到期复习。答错的题会自动回收到这里，并按 SRS 的间隔规则安排下一次见面。
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild>
                  <Link href="/path">
                    <ArrowRight className="h-4 w-4" />
                    继续课程
                  </Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href="/quiz">
                    <CircleAlert className="h-4 w-4" />
                    做迁移测验
                  </Link>
                </Button>
              </div>
            </div>
            <VisualPanel asset="empty" className="min-h-56 rounded-none border-0" />
          </div>
        </Surface>
      )}
    </div>
  );
}

function MistakeMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[8px] border border-[var(--line)] bg-[rgba(255,250,240,0.66)] p-3">
      <strong className="block font-serif text-3xl font-black leading-none">{value}</strong>
      <span className="mt-1 block font-mono text-xs font-black uppercase text-[var(--muted)]">{label}</span>
    </div>
  );
}

function MistakeCard({ item, now, onRemove, onRetrain }: { item: MistakeInsight; now: number; onRemove: (id: string) => void; onRetrain: (id: string) => void }) {
  return (
    <article className="grid gap-3 rounded-[8px] border border-[rgba(24,28,27,0.12)] bg-[rgba(255,250,240,0.7)] p-4 md:grid-cols-[minmax(0,1fr)_12rem]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-[0.68rem] font-black uppercase ${item.due ? "bg-[rgba(185,78,60,0.12)] text-[var(--cinnabar)]" : "bg-[rgba(23,63,115,0.08)] text-[var(--ocean)]"}`}>
            {item.due ? <CircleAlert className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
            {item.statusLabel}
          </span>
          <span className="rounded-full bg-[rgba(24,28,27,0.06)] px-2.5 py-1 font-mono text-[0.68rem] font-black uppercase text-[var(--muted)]">
            {item.sourceLabel}
          </span>
        </div>
        <h2 className="mt-3 break-words font-serif text-2xl font-black leading-tight">{item.prompt}</h2>
        <p className="mt-2 break-words text-sm font-bold leading-6 text-[var(--muted)]">
          正确答案：<span className="text-[var(--ink)]">{item.answer}</span>
        </p>
      </div>
      <div className="grid content-between gap-3 rounded-[8px] border border-[rgba(24,28,27,0.08)] bg-[rgba(255,250,240,0.58)] p-3">
        <div className="grid grid-cols-3 gap-2 text-center">
          <SmallStat label="错" value={item.wrong} />
          <SmallStat label="对" value={item.correct} />
          <SmallStat label="盒" value={item.box} />
        </div>
        <p className="text-xs font-bold leading-5 text-[var(--muted)]">{dueLabel(item, now)}</p>
        <div className="grid gap-2">
          <Button type="button" size="sm" onClick={() => onRetrain(item.id)}>
            <Play className="h-4 w-4" />
            重练这题
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button asChild size="sm" variant="secondary">
              <Link href="/review">
                <RefreshCcw className="h-4 w-4" />
                复习
              </Link>
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => onRemove(item.id)}>
              <Trash2 className="h-4 w-4" />
              移出
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

function SmallStat({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-[8px] border border-[rgba(24,28,27,0.08)] bg-[rgba(255,250,240,0.62)] px-2 py-1">
      <strong className="block font-serif text-lg leading-none">{value}</strong>
      <span className="font-mono text-[0.62rem] font-black uppercase text-[var(--muted)]">{label}</span>
    </span>
  );
}

function PlanStep({ index, title, detail, href }: { index: number; title: string; detail: string; href: string }) {
  return (
    <Link href={href} className="focus-ring grid gap-2 rounded-[8px] border border-[var(--line)] bg-[rgba(255,250,240,0.58)] p-3 transition hover:-translate-y-0.5 hover:shadow-paper-sm">
      <span className="flex items-center gap-2 font-mono text-xs font-black uppercase text-[var(--ocean)]">
        <CheckCircle2 className="h-4 w-4" />
        Step {index}
      </span>
      <strong className="font-serif text-xl leading-tight">{title}</strong>
      <span className="text-xs font-bold leading-5 text-[var(--muted)]">{detail}</span>
    </Link>
  );
}

function dueLabel(item: MistakeInsight, now: number) {
  if (item.due) return "已经到期，进入复习页会优先出现。";
  const minutes = Math.max(1, Math.round((item.dueAt - now) / 60_000));
  if (minutes < 90) return `约 ${minutes} 分钟后到期。`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `约 ${hours} 小时后到期。`;
  return `下次复习：${new Date(item.dueAt).toLocaleDateString("zh-CN")}`;
}
