"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CircleAlert, Clock, Play, RefreshCcw, Trash2 } from "lucide-react";
import { VisualPanel } from "@/components/assets/visual-panel";
import { DrillRunner } from "@/components/learning/drill-runner";
import { LearningCompass } from "@/components/learning/learning-compass";
import { Button } from "@/components/ui/button";
import { InlineAlert } from "@/components/ui/inline-alert";
import { ModuleHero, PageHeader, SectionHeading, Surface } from "@/components/ui/section";
import { TrackRow } from "@/components/ui/track-row";
import { firstHangul } from "@/lib/learning/player";
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
  const [retrainSession, setRetrainSession] = useState(0);
  const [retrainError, setRetrainError] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const srsState = useMemo(() => getSrsStateFromRaw(srsRaw), [srsRaw]);
  const insights = useMemo(() => buildMistakeInsights(srsState, now), [srsState, now]);
  const summary = useMemo(() => summarizeMistakes(srsState, now), [srsState, now]);
  const urgent = insights.slice(0, 4);
  const dueIds = useMemo(() => insights.filter((item) => item.due).map((item) => item.id), [insights]);

  const handleRemove = (id: string) => {
    setStatus(removeMistakeCardAndPracticeItem(id) ? "removed" : "error");
  };

  const startRetrain = (ids: string[] | null) => {
    const questions = buildRetrainQuestions(srsState, ids, ids?.length ?? 8);
    setRetrainError(questions.length ? "" : "这些错题缺少可重练的题面。");
    setRetrainSession((value) => value + 1);
    setRetrainQuestions(questions.length ? questions : null);
  };

  return (
    <div className="grid gap-6">
      <PageHeader
        kicker="오답 노트 · Mistake notebook"
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
        kicker="다시 보는 자리 · Return & repair"
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
            kicker="다시 쓰기 · Retrain"
            title="错题定向重练"
            copy="做对会按间隔延后这张卡，做错会缩短间隔并提前再现。练完这组再回到优先队列。"
            action={
              <Button type="button" variant="secondary" size="sm" onClick={() => setRetrainQuestions(null)}>
                退出重练
              </Button>
            }
          />
          <DrillRunner
            key={retrainSession}
            questions={retrainQuestions}
            finishLabel="结束重练"
            recordMistakes={false}
            onAnswer={(entry) => {
              const card = srsState.cards[entry.question.id];
              if (!card || !gradeReviewCardAndProgress(card, entry.correct, { allowEarly: true, skipped: Boolean(entry.skipped) })) {
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
              kicker="오늘의 순서 · Today's order"
              title="优先处理队列"
              copy="排序会优先看是否到期、错误次数、正确次数和盒子位置。越靠前，越值得今天先处理。"
              action={
                <Button type="button" size="sm" disabled={!dueIds.length} onClick={() => startRetrain(dueIds)}>
                  <Play className="h-4 w-4" />
                  重练全部到期（{dueIds.length}）
                </Button>
              }
            />
            <div>
              {insights.map((item, index) => (
                <MistakeCard
                  key={item.id}
                  index={index + 1}
                  item={item}
                  now={now}
                  expanded={!collapsed[item.id]}
                  onExpand={() => setCollapsed((current) => ({ ...current, [item.id]: !current[item.id] }))}
                  onRemove={handleRemove}
                  onRetrain={(id) => startRetrain([id])}
                />
              ))}
            </div>
          </Surface>

          <aside className="grid h-fit gap-4 xl:sticky xl:top-24">
            <Surface>
              <SectionHeading kicker="세 장 · Three leaves" title="三步修复方案" />
              <div className="grid gap-3">
                <PlanStep index={1} title="先清到期" detail="进入复习页，把已经到期的错题先重新写对，避免它们拖住新课输入。" href="/review" />
                <PlanStep index={2} title="回到来源" detail="反复错的题不要只背答案，按来源回到词汇、语法、韩文结构或真实材料页补原理。" href="/path" />
                <PlanStep index={3} title="再做迁移" detail="清完一轮后做综合测验，检查能不能在不同题型和语境里调用。" href="/quiz" />
              </div>
            </Surface>

            <Surface>
              <SectionHeading kicker="오늘의 네 점 · Four marks" title="今天最该照看的 4 个点" />
              <div>
                {urgent.map((item, index) => (
                  <TrackRow
                    key={item.id}
                    index={index + 1}
                    glyph={firstHangul(item.prompt, "오")}
                    kicker={item.sourceLabel}
                    title={item.prompt}
                    href={item.due ? "/review" : undefined}
                    onToggle={item.due ? undefined : () => startRetrain([item.id])}
                    onPlay={item.due ? undefined : () => startRetrain([item.id])}
                    playLabel={item.due ? `去复习：${item.prompt}` : `重练：${item.prompt}`}
                  />
                ))}
              </div>
            </Surface>
          </aside>
        </section>
      ) : (
        <Surface variant="plain">
          <div className="studio-panel relative grid md:grid-cols-[minmax(0,1fr)_18rem]">
            <span className="paper-tape left-8 top-[-8px]" aria-hidden="true" />
            <div className="paper-rail p-5 pt-8">
              <p className="eyebrow">빈 장 · Clean leaf</p>
              <h2 className="inkline mt-2 font-serif text-3xl font-normal">当前没有可追踪错题。</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
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
            <VisualPanel asset="empty" priority treatment="inset" className="min-h-56 border-0 shadow-none" />
          </div>
        </Surface>
      )}
    </div>
  );
}

function MistakeMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-t border-[var(--line)] bg-[var(--wash-1)] px-3 py-3 shadow-[inset_0_1px_0_var(--sheen)]">
      <strong className="block font-serif text-3xl font-normal leading-none">{value}</strong>
      <span className="mt-1 block font-[family-name:var(--font-script)] text-sm text-[var(--muted)]">{label}</span>
    </div>
  );
}

function MistakeCard({
  index,
  item,
  now,
  expanded,
  onExpand,
  onRemove,
  onRetrain
}: {
  index: number;
  item: MistakeInsight;
  now: number;
  expanded: boolean;
  onExpand: () => void;
  onRemove: (id: string) => void;
  onRetrain: (id: string) => void;
}) {
  return (
    <TrackRow
      index={index}
      glyph={firstHangul(item.prompt, "오")}
      kicker={item.sourceLabel}
      title={item.prompt}
      detail={`正确答案：${item.answer}`}
      meta={item.statusLabel}
      expanded={expanded}
      onToggle={onExpand}
      onPlay={() => onRetrain(item.id)}
      playLabel={`重练 ${item.prompt}`}
    >
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1 border px-2.5 py-1 font-[family-name:var(--font-script)] text-xs ${item.due ? "border-[color-mix(in_srgb,var(--seal)_45%,var(--line))] bg-[var(--seal-soft)] text-[var(--cinnabar)]" : "border-[var(--line)] bg-[var(--wash-2)] text-[var(--ink-soft)]"}`}>
            {item.due ? <CircleAlert className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
            {item.statusLabel}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <SmallStat label="错" value={item.wrong} />
          <SmallStat label="对" value={item.correct} />
          <SmallStat label="盒" value={item.box} />
        </div>
        <p className="border-l border-[var(--line-strong)] pl-3 text-xs leading-5 text-[var(--muted)]">{dueLabel(item, now)}</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <Button type="button" size="sm" onClick={() => onRetrain(item.id)}>
            <Play className="h-4 w-4" />
            重练这题
          </Button>
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
    </TrackRow>
  );
}

function SmallStat({ label, value }: { label: string; value: number }) {
  return (
    <span className="border border-[var(--line)] bg-[var(--wash-1)] px-2 py-1 shadow-[inset_0_1px_0_var(--sheen)]">
      <strong className="block font-serif text-lg font-normal leading-none">{value}</strong>
      <span className="font-[family-name:var(--font-script)] text-xs text-[var(--muted)]">{label}</span>
    </span>
  );
}

function PlanStep({ index, title, detail, href }: { index: number; title: string; detail: string; href: string }) {
  return (
    <TrackRow
      index={index}
      glyph={String(index)}
      kicker={`Step ${index}`}
      title={title}
      detail={detail}
      href={href}
    />
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
