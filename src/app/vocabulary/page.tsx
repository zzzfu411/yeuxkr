"use client";

import { useMemo, useState } from "react";
import { LibraryPagination, useLibraryPage } from "@/components/ui/library-pagination";
import { Button } from "@/components/ui/button";
import { CheckboxFilter, EmptyState, FilterSummary, SearchField, SegmentedFilter } from "@/components/ui/filter-console";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LibraryGateNotice } from "@/components/learning/library-gate-notice";
import { OnboardingGateNotice } from "@/components/learning/onboarding-gate-notice";
import { needsOnboardingFunnel } from "@/lib/learning/compass";
import { MasteryGate } from "@/components/learning/mastery-gate";
import { RomanizationText } from "@/components/korean/romanization-text";
import { ModuleHero, PageHeader, SectionHeading, Surface } from "@/components/ui/section";
import { TrackRow } from "@/components/ui/track-row";
import { vocab, vocabCategories, vocabLevels, vocabPosLabels } from "@/data/lexicon";
import { useLearningWorkspace } from "@/lib/learning/use-learning-workspace";
import { speakKorean } from "@/lib/speech";

export default function VocabularyPage() {
  const { workspace, toggleVocab, ensureVocab } = useLearningWorkspace();
  const enrollBlocked = needsOnboardingFunnel(workspace.profile, workspace.progress);
  const learned = useMemo(() => new Set(workspace.progress.learnedVocab), [workspace.progress.learnedVocab]);
  const romanizationScaffold = workspace.progress.completedLessons.length < 6;
  const [query, setQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [onlyLearned, setOnlyLearned] = useState(false);
  const [srsErrorId, setSrsErrorId] = useState("");
  const [gateItemId, setGateItemId] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
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
  const pagination = useLibraryPage(filteredVocab, JSON.stringify([query, levelFilter, categoryFilter, onlyLearned]), 12);
  const visibleVocab = pagination.items;
  const byLevel = groupBy(visibleVocab, "level");
  const levelCounts = countBy(filteredVocab, "level");
  const categoryCounts = countBy(filteredVocab, "category");
  const activeFilters = [
    levelFilter !== "all" ? levelLabel(levelFilter) : null,
    categoryFilter !== "all" ? categoryLabel(categoryFilter) : null,
    onlyLearned ? "已加入复习" : null,
    query.trim() ? `搜索：${query.trim()}` : null
  ].filter(Boolean);
  const resetFilters = () => {
    setQuery("");
    setLevelFilter("all");
    setCategoryFilter("all");
    setOnlyLearned(false);
    pagination.setPage(0);
  };
  const toggleVocabSrs = (itemId: string) => {
    if (toggleVocab(itemId)) {
      setSrsErrorId((current) => (current === itemId ? "" : current));
      return true;
    }
    setSrsErrorId(itemId);
    return false;
  };
  const ensureVocabSrs = (itemId: string) => {
    if (ensureVocab(itemId)) {
      setSrsErrorId((current) => (current === itemId ? "" : current));
      return true;
    }
    setSrsErrorId(itemId);
    return false;
  };

  return (
    <div className="grid gap-6">
      <PageHeader
        kicker="장면 속 단어 · 场景词汇"
        title="学会放进句子里的词。"
        copy="每个词都有例句和使用提示。能自己造句后，再把它加入间隔复习。"
        compact
      />

      <OnboardingGateNotice copy="先完成三分钟入门，之后的词汇练习才会计入学习进度。" />
      <LibraryGateNotice focus="vocab" />



      <Surface>
        <SectionHeading
          kicker="골라 연습하기 · 选择练习"
          title="找到今天要练的词"
          copy="按阶段、场景或已学状态筛选。也可以搜索韩语、中文、罗马音和例句。"
          action={activeFilters.length ? (
            <Button type="button" variant="ghost" size="sm" onClick={resetFilters}>
              重置筛选
            </Button>
          ) : null}
        />
        <div className="grid gap-4">
          <SearchField label="搜索词汇" value={query} onChange={setQuery} placeholder="输入韩语、中文、罗马音或场景" />
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
            <CheckboxFilter label="只看已加入复习" checked={onlyLearned} onChange={setOnlyLearned} />
          </div>
          <FilterSummary count={filteredVocab.length} filters={activeFilters} />

        </div>
      </Surface>

      <div id="library-results" tabIndex={-1} className="focus-ring scroll-mt-40">
        <LibraryPagination {...pagination} onPage={(next) => { setGateItemId(""); pagination.setPage(next); }} label="词汇分页" resultsId="library-results" />
      </div>
      {!filteredVocab.length ? (
        <Surface>
          <EmptyState title="没有匹配的词" copy="换一个搜索词，或重置阶段、场景和复习筛选。" onAction={resetFilters} />
        </Surface>
      ) : null}

      {vocabLevels.map((level: any) => (
        <Surface key={level.id} variant="plain" className={(byLevel[level.id] ?? []).length ? "" : "hidden"}>
          <SectionHeading kicker={`显示 ${byLevel[level.id]?.length ?? 0} · 匹配 ${levelCounts[level.id] ?? 0} · 长期目标 ${level.target}`} title={level.label} copy={level.description} />
          <div>
            {(byLevel[level.id] ?? []).map((item: any, itemIndex: number) => (
              <TrackRow
                key={item.id}
                index={itemIndex + 1}
                glyph={item.korean}
                kicker={categoryLabel(item.category)}
                title={item.korean}
                detail={item.meaning}
                meta={item.pos ? (vocabPosLabels[item.pos] ?? item.pos) : undefined}
                completed={learned.has(item.id)}
                expanded={!collapsed[item.id]}
                onToggle={() => setCollapsed((current) => ({ ...current, [item.id]: !current[item.id] }))}
                onPlay={() => speakKorean(item.korean)}
                playLabel={`播放 ${item.korean}`}
              >
                <RomanizationText
                  text={item.romanization}
                  preference={workspace.profile.romanization}
                  scaffold={romanizationScaffold}
                  className="font-mono text-sm font-black text-[var(--ocean)]"
                />
                <p className="hangul-display mt-2 text-xl" lang="ko">{item.example}</p>
                <small className="block leading-5 text-[var(--muted)]">{item.exampleMeaning}</small>
                {item.soundChangeNote ? (
                  <p className="mt-2 rounded-none bg-[var(--green-soft)] p-2 text-xs font-bold leading-5 text-[var(--celadon)]">
                    发音提示：{item.soundChangeNote}
                  </p>
                ) : null}
                {item.collocations?.length ? (
                  <div className="mt-2 grid gap-1 text-sm leading-6">
                    {item.collocations.map((collocation: any) => (
                      <p key={collocation.ko}>
                        <span className="hangul-display font-black" lang="ko">{collocation.ko}</span>
                        <span className="ml-2 text-[var(--muted)]">{collocation.zh}</span>
                      </p>
                    ))}
                  </div>
                ) : null}
                <div className="mt-3 rounded-none border-l-4 border-[var(--ocean)] bg-[color-mix(in_srgb,var(--navy)_12%,transparent)] p-3 text-sm leading-6 text-[var(--muted)]">
                  {item.note}
                </div>
                {learned.has(item.id) ? (
                  <Button className="mt-3" type="button" variant="secondary" size="sm" onClick={() => toggleVocabSrs(item.id)}>
                    已加入复习 · 点击移出
                  </Button>
                ) : (
                  <Button
                    className="mt-3"
                    type="button"
                    variant="secondary"
                    size="sm"
                    aria-expanded={gateItemId === item.id}
                    disabled={enrollBlocked}
                    onClick={() => setGateItemId((current) => (current === item.id ? "" : item.id))}
                  >
                    测一测，再加入复习
                  </Button>
                )}
                {gateItemId === item.id && !learned.has(item.id) ? (
                  <MasteryGate
                    kind="vocab"
                    itemId={item.id}
                    title={item.korean}
                    onPassed={() => {
                      const saved = ensureVocabSrs(item.id);
                      if (saved) setGateItemId("");
                      return saved;
                    }}
                    onClose={() => setGateItemId("")}
                  />
                ) : null}
                {srsErrorId === item.id ? <SrsError /> : null}
              </TrackRow>
            ))}
          </div>
        </Surface>
      ))}
      <LibraryPagination {...pagination} onPage={(next) => { setGateItemId(""); pagination.setPage(next); }} label="词汇底部分页" resultsId="library-results" />
      <details className="library-about">
        <summary className="focus-ring min-h-11 cursor-pointer py-3 text-sm text-[var(--muted)]">了解词汇练习方法与内容规模</summary>
      <ModuleHero
        priority={false}
        kicker={`${filteredVocab.length}/${vocab.length} 条词汇`}
        title="按场景找词，比照着清单背更好用。"
        copy={`这里有 ${vocab.length} 个可练词条，按阶段和场景整理。更大的词汇量是长期目标，不会混进当前进度。`}
        asset="vocabulary"
        imageClassName="min-h-80 rounded-none border-0"
      >
        <div className="flex flex-wrap gap-2">
          {vocabCategories.map((item: any) => (
            <span key={item.id} className="rounded-none border border-[var(--line)] bg-[var(--card)] px-3 py-2 text-sm font-extrabold">
              {item.label} · {categoryCounts[item.id] ?? 0}
            </span>
          ))}
        </div>
      </ModuleHero>
      </details>
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
      这张词汇卡没有保存。请释放浏览器空间，或允许本站使用本地存储后重试。
    </InlineAlert>
  );
}
