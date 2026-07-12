"use client";

import { useMemo, useState } from "react";
import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CheckboxFilter, EmptyState, FilterSummary, SearchField, SegmentedFilter } from "@/components/ui/filter-console";
import { InlineAlert } from "@/components/ui/inline-alert";
import { MasteryGate } from "@/components/learning/mastery-gate";
import { ModuleHero, PageHeader, SectionHeading, Surface } from "@/components/ui/section";
import { vocab, vocabCategories, vocabLevels, vocabPosLabels } from "@/data/lexicon";
import { useLearningWorkspace } from "@/lib/learning/workspace";
import { speakKorean } from "@/lib/speech";

export default function VocabularyPage() {
  const { workspace, toggleVocab } = useLearningWorkspace();
  const learned = useMemo(() => new Set(workspace.progress.learnedVocab), [workspace.progress.learnedVocab]);
  const [query, setQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [onlyLearned, setOnlyLearned] = useState(false);
  const [srsErrorId, setSrsErrorId] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [gateItemId, setGateItemId] = useState("");
  const filteredVocab = useMemo(() => {
    const normalizedQuery = normalizeSearch(query);
    return vocab.filter((item: any) => {
      const matchesLevel = levelFilter === "all" || item.level === levelFilter;
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
      const matchesLearned = !onlyLearned || learned.has(item.id);
      const searchable = normalizeSearch([
        item.korean,
        item.romanization,
        item.meaning,
        item.register,
        item.example,
        item.exampleMeaning,
        item.note,
        categoryLabel(item.category)
      ].join(" "));
      return matchesLevel && matchesCategory && matchesLearned && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [categoryFilter, learned, levelFilter, onlyLearned, query]);
  const focusedFilterActive = Boolean(query.trim()) || levelFilter !== "all" || categoryFilter !== "all" || onlyLearned;
  const visibleVocab = showAll || focusedFilterActive ? filteredVocab : filteredVocab.slice(0, 12);
  const hiddenVocabCount = Math.max(0, filteredVocab.length - visibleVocab.length);
  const byLevel = groupBy(visibleVocab, "level");
  const levelCounts = countBy(filteredVocab, "level");
  const categoryCounts = countBy(filteredVocab, "category");
  const activeFilters = [
    levelFilter !== "all" ? levelLabel(levelFilter) : null,
    categoryFilter !== "all" ? categoryLabel(categoryFilter) : null,
    onlyLearned ? "已加入 SRS" : null,
    query.trim() ? `搜索：${query.trim()}` : null
  ].filter(Boolean);
  const resetFilters = () => {
    setQuery("");
    setLevelFilter("all");
    setCategoryFilter("all");
    setOnlyLearned(false);
    setShowAll(false);
  };
  const toggleVocabSrs = (itemId: string) => {
    if (toggleVocab(itemId)) {
      setSrsErrorId((current) => (current === itemId ? "" : current));
      return;
    }
    setSrsErrorId(itemId);
  };

  return (
    <div className="grid gap-6">
      <PageHeader
        kicker="Lexicon Atlas"
        title="词汇不是清单，是可调用的场景库存。"
        copy="每个词都带例句、语气和场景。只把能造句的词加入 SRS，系统会把它们带回复习。"
        compact
      />

      <ModuleHero
        kicker={`${filteredVocab.length}/${vocab.length} entries`}
        title="按场景取词，而不是背一列中文释义。"
        copy={`当前站内样例库有 ${vocab.length} 个可练词条，按 level/category/场景组织，覆盖生存、日常和母语者表达入口。800、2500、5000 词是后续扩容目标层级，不会被当前词条数冒充。`}
        asset="vocabulary"
        imageClassName="min-h-80 rounded-none border-0"
      >
        <div className="flex flex-wrap gap-2">
          {vocabCategories.map((item: any) => (
            <span key={item.id} className="rounded-[8px] border border-[var(--line)] bg-[rgba(255,250,240,0.72)] px-3 py-2 text-sm font-extrabold">
              {item.label} · {categoryCounts[item.id] ?? 0}
            </span>
          ))}
        </div>
      </ModuleHero>

      <Surface>
        <SectionHeading
          kicker="Lexicon Console"
          title="先练一小组，再展开整座词库"
          copy="按目标场景、阶段和自己已经入册的词切换。搜索会同时匹配韩语、中文、罗马音、例句和提示。"
          action={activeFilters.length ? (
            <Button type="button" variant="ghost" size="sm" onClick={resetFilters}>
              重置筛选
            </Button>
          ) : null}
        />
        <div className="grid gap-4">
          <SearchField label="搜索词汇" value={query} onChange={setQuery} placeholder="输入 韩语 / 中文 / romanization / 场景提示" />
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto]">
            <SegmentedFilter
              label="层级"
              value={levelFilter}
              options={[{ id: "all", label: "全部" }, ...vocabLevels.map((level: any) => ({ id: level.id, label: `${level.label} ${levelCounts[level.id] ?? 0}` }))]}
              onChange={setLevelFilter}
            />
            <SegmentedFilter
              label="场景"
              value={categoryFilter}
              options={[{ id: "all", label: "全部" }, ...vocabCategories.map((category: any) => ({ id: category.id, label: `${category.label} ${categoryCounts[category.id] ?? 0}` }))]}
              onChange={setCategoryFilter}
            />
            <CheckboxFilter label="只看已加入 SRS" checked={onlyLearned} onChange={setOnlyLearned} />
          </div>
          <FilterSummary count={filteredVocab.length} filters={activeFilters} />
          {!focusedFilterActive ? (
            <div className="grid gap-3 rounded-[8px] border border-[rgba(183,135,63,0.32)] bg-[rgba(183,135,63,0.08)] p-3 text-sm font-bold leading-6 text-[var(--muted)] md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <span>
                当前先显示 {visibleVocab.length} 个今日词汇切片；每个词都可以播放、造句、加入 SRS。熟悉后再展开剩余 {hiddenVocabCount} 个词。
              </span>
              {showAll || hiddenVocabCount ? (
                <Button type="button" variant="secondary" size="sm" onClick={() => setShowAll((value) => !value)}>
                  {showAll ? "收起到今日切片" : "展开全部词汇"}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </Surface>

      {!filteredVocab.length ? (
        <Surface>
          <EmptyState title="没有匹配的词" copy="换一个搜索词，或先重置层级、场景和 SRS 筛选。" onAction={resetFilters} />
        </Surface>
      ) : null}

      {vocabLevels.map((level: any) => (
        <Surface key={level.id} variant="plain" className={(byLevel[level.id] ?? []).length ? "" : "hidden"}>
          <SectionHeading kicker={`当前 ${byLevel[level.id]?.length ?? 0} shown · 匹配 ${levelCounts[level.id] ?? 0} · 扩容目标 ${level.target}`} title={level.label} copy={level.description} />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(byLevel[level.id] ?? []).map((item: any) => (
              <article key={item.id} className={`relative grid min-h-60 gap-2 rounded-[8px] border p-4 pr-16 md:min-h-72 ${learned.has(item.id) ? "border-[rgba(79,140,118,0.45)] bg-[rgba(79,140,118,0.11)]" : "border-[var(--line)] bg-[rgba(255,250,240,0.62)]"}`}>
                <button
                  type="button"
                  className="focus-ring absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-[8px] border border-[var(--line)] bg-[var(--surface-solid)]"
                  onClick={() => speakKorean(item.korean)}
                  aria-label={`播放 ${item.korean}`}
                >
                  <Volume2 className="h-4 w-4" />
                </button>
                <span className="flex w-fit flex-wrap items-center gap-1.5">
                  <span className="rounded-[8px] bg-[rgba(23,63,115,0.08)] px-2.5 py-1 text-xs font-bold text-[var(--ocean)]">
                    {categoryLabel(item.category)}
                  </span>
                  {item.pos ? (
                    <span className="rounded-[8px] bg-[rgba(183,135,63,0.12)] px-2.5 py-1 font-mono text-[0.65rem] font-black uppercase text-[var(--brass)]">
                      {vocabPosLabels[item.pos] ?? item.pos}
                    </span>
                  ) : null}
                </span>
                <h3 className="hangul-display text-3xl font-black md:text-4xl">{item.korean}</h3>
                <p className="font-mono text-sm font-black text-[var(--ocean)]">{item.romanization}</p>
                <strong>{item.meaning}</strong>
                <p className="hangul-display text-xl">{item.example}</p>
                <small className="leading-5 text-[var(--muted)]">{item.exampleMeaning}</small>
                {item.soundChangeNote ? (
                  <p className="rounded-[8px] bg-[rgba(79,140,118,0.08)] p-2 text-xs font-bold leading-5 text-[var(--celadon)]">
                    发音提示：{item.soundChangeNote}
                  </p>
                ) : null}
                {item.collocations?.length ? (
                  <div className="grid gap-1 text-sm leading-6">
                    {item.collocations.map((collocation: any) => (
                      <p key={collocation.ko}>
                        <span className="hangul-display font-black">{collocation.ko}</span>
                        <span className="ml-2 text-[var(--muted)]">{collocation.zh}</span>
                      </p>
                    ))}
                  </div>
                ) : null}
                <div className="rounded-[8px] border-l-4 border-[var(--ocean)] bg-[rgba(23,63,115,0.06)] p-3 text-sm leading-6 text-[var(--muted)]">
                  {item.note}
                </div>
                {learned.has(item.id) ? (
                  <Button type="button" variant="secondary" size="sm" onClick={() => toggleVocabSrs(item.id)}>
                    已掌握 · 点击移出
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    aria-expanded={gateItemId === item.id}
                    onClick={() => setGateItemId((current) => (current === item.id ? "" : item.id))}
                  >
                    测一测 · 加入掌握
                  </Button>
                )}
                {gateItemId === item.id && !learned.has(item.id) ? (
                  <MasteryGate
                    kind="vocab"
                    itemId={item.id}
                    title={item.korean}
                    onPassed={() => {
                      toggleVocabSrs(item.id);
                      setGateItemId("");
                    }}
                    onClose={() => setGateItemId("")}
                  />
                ) : null}
                {srsErrorId === item.id ? <SrsError /> : null}
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

function categoryLabel(id: string) {
  return vocabCategories.find((item: any) => item.id === id)?.label ?? id;
}

function levelLabel(id: string) {
  return vocabLevels.find((item: any) => item.id === id)?.label ?? id;
}

function normalizeSearch(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function SrsError() {
  return (
    <InlineAlert>
      这张词汇卡没有写入成功，请释放浏览器存储空间或关闭隐私限制后再试。
    </InlineAlert>
  );
}
