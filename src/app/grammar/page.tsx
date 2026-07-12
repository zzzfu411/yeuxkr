"use client";

import { useMemo, useState } from "react";
import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CheckboxFilter, EmptyState, FilterSummary, SearchField, SegmentedFilter } from "@/components/ui/filter-console";
import { InlineAlert } from "@/components/ui/inline-alert";
import { MasteryGate } from "@/components/learning/mastery-gate";
import { ModuleHero, PageHeader, SectionHeading, Surface } from "@/components/ui/section";
import { grammarPoints } from "@/data/grammar";
import { speakKorean } from "@/lib/speech";
import { useLearningWorkspace } from "@/lib/learning/workspace";

const levelLabels: Record<string, string> = {
  foundation: "基础骨架",
  growth: "连续表达",
  native: "母语者语法"
};

export default function GrammarPage() {
  const { workspace, toggleGrammar } = useLearningWorkspace();
  const learned = useMemo(() => new Set(workspace.progress.learnedGrammar), [workspace.progress.learnedGrammar]);
  const [query, setQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [onlyLearned, setOnlyLearned] = useState(false);
  const [srsErrorId, setSrsErrorId] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [gateItemId, setGateItemId] = useState("");
  const filteredPoints = useMemo(() => {
    const normalizedQuery = normalizeSearch(query);
    return grammarPoints.filter((point: any) => {
      const matchesLevel = levelFilter === "all" || point.level === levelFilter;
      const matchesLearned = !onlyLearned || learned.has(point.id);
      const searchable = normalizeSearch([
        point.title,
        point.pattern,
        point.meaning,
        point.explanation,
        levelLabels[point.level],
        ...(point.examples ?? []).flatMap((example: any) => [example.ko, example.zh, example.note]),
        ...(point.pitfalls ?? [])
      ].join(" "));
      return matchesLevel && matchesLearned && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [learned, levelFilter, onlyLearned, query]);
  const focusedFilterActive = Boolean(query.trim()) || levelFilter !== "all" || onlyLearned;
  const visiblePoints = showAll || focusedFilterActive ? filteredPoints : filteredPoints.slice(0, 6);
  const hiddenPointCount = Math.max(0, filteredPoints.length - visiblePoints.length);
  const byLevel = groupBy(visiblePoints, "level");
  const levelCounts = countBy(filteredPoints, "level");
  const activeFilters = [
    levelFilter !== "all" ? levelLabels[levelFilter] ?? levelFilter : null,
    onlyLearned ? "已加入 SRS" : null,
    query.trim() ? `搜索：${query.trim()}` : null
  ].filter(Boolean);
  const resetFilters = () => {
    setQuery("");
    setLevelFilter("all");
    setOnlyLearned(false);
    setShowAll(false);
  };
  const toggleGrammarSrs = (pointId: string) => {
    if (toggleGrammar(pointId)) {
      setSrsErrorId((current) => (current === pointId ? "" : current));
      return;
    }
    setSrsErrorId(pointId);
  };

  return (
    <div className="grid gap-6">
      <PageHeader
        kicker="Sentence Workshop"
        title="语法以“能说什么”为单位。"
        copy="这里不是术语索引，而是句型工坊。每个结构都要能替换、扩展、改写，最后进入真实表达。"
        compact
      />

      <ModuleHero
        kicker={`${filteredPoints.length}/${grammarPoints.length} patterns`}
        title="从骨架到语气。"
        copy="韩语语法不该孤立背规则。新的学习模型会把语法点和课程、词汇、输出任务连接起来，让用户从理解走到调用。"
        asset="grammar"
        imageClassName="min-h-80 rounded-none border-0"
      >
        <div className="grid grid-cols-[repeat(auto-fit,minmax(8rem,1fr))] gap-2">
          {Object.entries(levelLabels).map(([id, label]) => (
            <div key={id} className="rounded-[8px] border border-[var(--line)] bg-[rgba(255,250,240,0.72)] p-3">
              <span className="font-mono text-xs font-black uppercase text-[var(--muted)]">{id}</span>
              <strong className="mt-1 block">{label}</strong>
              <span className="text-sm font-bold text-[var(--ocean)]">{levelCounts[id] ?? 0} shown</span>
            </div>
          ))}
        </div>
      </ModuleHero>

      <Surface>
        <SectionHeading
          kicker="Pattern Console"
          title="筛选要练的句型"
          copy="搜索会同时匹配结构、中文含义、韩语例句、坑点提示。先按层级缩小范围，再把能造句的结构加入 SRS。"
          action={activeFilters.length ? (
            <Button type="button" variant="ghost" size="sm" onClick={resetFilters}>
              重置筛选
            </Button>
          ) : null}
        />
        <div className="grid gap-4">
          <SearchField label="搜索语法" value={query} onChange={setQuery} placeholder="输入 结构 / 韩语例句 / 中文含义 / 坑点" />
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
            <SegmentedFilter
              label="语法层级"
              value={levelFilter}
              options={[{ id: "all", label: "全部" }, ...Object.entries(levelLabels).map(([id, label]) => ({ id, label: `${label} ${levelCounts[id] ?? 0}` }))]}
              onChange={setLevelFilter}
            />
            <CheckboxFilter label="只看已加入 SRS" checked={onlyLearned} onChange={setOnlyLearned} />
          </div>
          <FilterSummary count={filteredPoints.length} filters={activeFilters} />
          {!focusedFilterActive ? (
            <div className="grid gap-3 rounded-[8px] border border-[rgba(23,63,115,0.22)] bg-[rgba(23,63,115,0.07)] p-3 text-sm font-bold leading-6 text-[var(--muted)] md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <span>
                当前先显示 {visiblePoints.length} 个今日句型切片；每个句型都需要先听例句、替换成自己的句子，再加入 SRS。掌握后再展开剩余 {hiddenPointCount} 个句型。
              </span>
              {showAll || hiddenPointCount ? (
                <Button type="button" variant="secondary" size="sm" onClick={() => setShowAll((value) => !value)}>
                  {showAll ? "收起到今日切片" : "展开全部句型"}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </Surface>

      {!filteredPoints.length ? (
        <Surface>
          <EmptyState title="没有匹配的语法点" copy="换一个搜索词，或重置层级和 SRS 筛选。" onAction={resetFilters} />
        </Surface>
      ) : null}

      {Object.entries(byLevel).map(([level, points]) => (
        <Surface key={level} variant="plain">
          <SectionHeading kicker={`${level} · 当前 ${points.length} shown · 匹配 ${levelCounts[level] ?? 0}`} title={levelLabels[level] ?? level} />
          <div className="grid gap-4">
            {points.map((point: any) => (
              <article key={point.id} className={`grid gap-4 rounded-[8px] border p-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] ${learned.has(point.id) ? "border-[rgba(79,140,118,0.45)] bg-[rgba(79,140,118,0.1)]" : "border-[var(--line)] bg-[rgba(255,250,240,0.62)]"}`}>
                <div>
                  <span className="rounded-[8px] bg-[rgba(23,63,115,0.08)] px-3 py-1 font-mono text-xs font-black text-[var(--ocean)]">
                    {point.pattern}
                  </span>
                  <h3 className="mt-3 font-serif text-3xl font-black">{point.title}</h3>
                  <p className="mt-3 leading-7 text-[var(--muted)]">{point.explanation}</p>
                  {learned.has(point.id) ? (
                    <Button className="mt-4" type="button" variant="secondary" size="sm" onClick={() => toggleGrammarSrs(point.id)}>
                      已掌握 · 点击移出
                    </Button>
                  ) : (
                    <Button
                      className="mt-4"
                      type="button"
                      variant="secondary"
                      size="sm"
                      aria-expanded={gateItemId === point.id}
                      onClick={() => setGateItemId((current) => (current === point.id ? "" : point.id))}
                    >
                      测一测 · 加入语法复习
                    </Button>
                  )}
                  {gateItemId === point.id && !learned.has(point.id) ? (
                    <MasteryGate
                      kind="grammar"
                      itemId={point.id}
                      title={point.title}
                      onPassed={() => {
                        toggleGrammarSrs(point.id);
                        setGateItemId("");
                      }}
                      onClose={() => setGateItemId("")}
                    />
                  ) : null}
                  {srsErrorId === point.id ? <SrsError /> : null}
                  <div className="mt-4 grid gap-2">
                    {point.pitfalls.map((pitfall: string) => (
                      <p key={pitfall} className="rounded-[8px] border-l-4 border-[var(--cinnabar)] bg-[rgba(185,78,60,0.08)] p-3 text-sm leading-6 text-[var(--muted)]">
                        {pitfall}
                      </p>
                    ))}
                  </div>
                </div>
                <div className="grid gap-2">
                  {point.examples.map((example: any) => (
                    <button
                      key={example.ko}
                      type="button"
                      className="focus-ring rounded-[8px] border border-[var(--line)] bg-[rgba(255,250,240,0.76)] p-3 text-left transition hover:-translate-y-0.5"
                      onClick={() => speakKorean(example.ko)}
                    >
                      <span className="mb-2 inline-flex items-center gap-2 text-xs font-black text-[var(--ocean)]">
                        <Volume2 className="h-4 w-4" />
                        PLAY
                      </span>
                      <strong className="hangul-display block text-2xl">{example.ko}</strong>
                      <span className="mt-1 block text-sm text-[var(--muted)]">{example.zh}</span>
                      <small className="mt-1 block leading-5 text-[var(--muted)]">{example.note}</small>
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </Surface>
      ))}
    </div>
  );
}

function groupBy(items: any[], key: string) {
  return items.reduce<Record<string, any[]>>((acc, item) => {
    const value = item[key];
    acc[value] ??= [];
    acc[value].push(item);
    return acc;
  }, {});
}

function countBy(items: any[], key: string) {
  return items.reduce<Record<string, number>>((acc, item) => {
    const value = item[key];
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

function normalizeSearch(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function SrsError() {
  return (
    <InlineAlert className="mt-3">
      这张语法卡没有写入成功，请释放浏览器存储空间或关闭隐私限制后再试。
    </InlineAlert>
  );
}
