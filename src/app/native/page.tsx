"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Gauge, MessagesSquare, ShieldCheck, Sparkles, Volume2 } from "lucide-react";
import { LearningCompass } from "@/components/learning/learning-compass";
import { Button } from "@/components/ui/button";
import { CheckboxFilter, EmptyState, FilterSummary, SearchField, SegmentedFilter } from "@/components/ui/filter-console";
import { InlineAlert } from "@/components/ui/inline-alert";
import { ModuleHero, PageHeader, SectionHeading, Surface } from "@/components/ui/section";
import { getCurrentInAppNativeStage, nativeRoadmapTotals } from "@/data/native-roadmap";
import { nuanceSets } from "@/data/nuance";
import { pragmaticScenarios } from "@/data/pragmatics";
import { hasKoreanOutputRewrite, hasKoreanRetellEvidence } from "@/lib/learning/evidence";
import { speakKorean } from "@/lib/speech";
import { countCheckpointCredits, countNativePracticeEvidence, useLearningWorkspace, type NativeEvidenceInput } from "@/lib/learning/workspace";

const trackOptions = [
  { id: "all", label: "全部" },
  { id: "pragmatics", label: "场景语用" },
  { id: "nuance", label: "语气细差" }
];

export default function NativePage() {
  const { workspace, toggleNative, saveNativeEvidence } = useLearningWorkspace();
  const learned = useMemo(() => new Set(workspace.progress.learnedNative), [workspace.progress.learnedNative]);
  const [query, setQuery] = useState("");
  const [trackFilter, setTrackFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [onlyLearned, setOnlyLearned] = useState(false);
  const [srsErrorId, setSrsErrorId] = useState("");
  const [evidenceErrorId, setEvidenceErrorId] = useState("");
  const [showAll, setShowAll] = useState(false);
  const portfolioEvidence = {
    vocabulary: workspace.progress.learnedVocab.length,
    materials: workspace.stats.completedMaterials,
    outputTasks: workspace.stats.outputEntries,
    checkpoints: countCheckpointCredits(workspace.progress),
    native: countNativePracticeEvidence(workspace.progress)
  };
  const { currentStage, longTermStage, inAppPortfolioComplete } = getCurrentInAppNativeStage(portfolioEvidence);
  const stageTargets = currentStage.deliverables;
  const nativeItems = useMemo(() => buildNativeItems(), []);
  const filteredItems = useMemo(() => {
    const normalizedQuery = normalizeSearch(query);
    return nativeItems.filter((item) => {
      const matchesTrack = trackFilter === "all" || item.track === trackFilter;
      const matchesLevel = levelFilter === "all" || item.level === levelFilter;
      const matchesLearned = !onlyLearned || learned.has(item.srsId);
      const searchable = normalizeSearch(item.searchText);
      return matchesTrack && matchesLevel && matchesLearned && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [learned, levelFilter, nativeItems, onlyLearned, query, trackFilter]);
  const trackCounts = countBy(filteredItems, "track");
  const levelOptions = useMemo(() => {
    const levels = [...new Set(nativeItems.map((item) => item.level))];
    return [{ id: "all", label: "全部" }, ...levels.map((level) => ({ id: level, label: `${level} ${countBy(filteredItems, "level")[level] ?? 0}` }))];
  }, [filteredItems, nativeItems]);
  const focusedFilterActive = Boolean(query.trim()) || trackFilter !== "all" || levelFilter !== "all" || onlyLearned;
  const visibleItems = showAll || focusedFilterActive ? filteredItems : buildDailyNativeSlice(filteredItems, 6);
  const hiddenItemCount = Math.max(0, filteredItems.length - visibleItems.length);
  const pragmaticItems = visibleItems.filter((item) => item.track === "pragmatics");
  const nuanceItems = visibleItems.filter((item) => item.track === "nuance");
  const portfolioRows = [
    { label: "词汇入册", value: portfolioEvidence.vocabulary, target: stageTargets.vocabulary, href: "/vocabulary" },
    { label: "母语者表达", value: portfolioEvidence.native, target: stageTargets.native, href: "/native" },
    { label: "材料完成", value: portfolioEvidence.materials, target: stageTargets.materials, href: "/immersion" },
    { label: "输出档案", value: portfolioEvidence.outputTasks, target: stageTargets.outputTasks, href: "/immersion" },
    { label: "检查点", value: portfolioEvidence.checkpoints, target: stageTargets.checkpoints, href: "/self-study" }
  ];
  const stageProgress = Math.round(
    portfolioRows.reduce((sum, row) => sum + Math.min(1, row.value / Math.max(1, row.target)), 0) / portfolioRows.length * 100
  );
  const activeFilters = [
    trackFilter !== "all" ? trackOptions.find((item) => item.id === trackFilter)?.label ?? trackFilter : null,
    levelFilter !== "all" ? levelFilter : null,
    onlyLearned ? "已加入 SRS" : null,
    query.trim() ? `搜索：${query.trim()}` : null
  ];
  const resetFilters = () => {
    setQuery("");
    setTrackFilter("all");
    setLevelFilter("all");
    setOnlyLearned(false);
    setShowAll(false);
  };
  const toggleNativeSrs = (itemId: string) => {
    if (toggleNative(itemId)) {
      setSrsErrorId((current) => (current === itemId ? "" : current));
      return;
    }
    setSrsErrorId(itemId);
  };
  const saveNativeCardEvidence = (itemId: string, evidence: NativeEvidenceInput) => {
    if (saveNativeEvidence(itemId, evidence)) {
      setEvidenceErrorId((current) => (current === itemId ? "" : current));
      setSrsErrorId((current) => (current === itemId ? "" : current));
      return;
    }
    setEvidenceErrorId(itemId);
  };

  return (
    <div className="grid gap-6">
      <PageHeader
        kicker="Native Layer"
        title="最后拉开差距的是关系、语气和上下文。"
        copy="同一句中文，在陌生人、朋友、前辈面前会变成不同韩语。母语者层不是炫技，而是知道什么时候留余地。"
        compact
      />

      <ModuleHero
        kicker="Dialogue Theater"
        title="从“正确”到“合适”。"
        copy="这里训练缓冲、转折、评价、复述和距离感。之后的课程扩展会把真实材料和输出反馈接进这层。"
        asset="native"
        imageClassName="min-h-80 rounded-none border-0"
      />

      <LearningCompass workspace={workspace} active="native" condensed />

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="dark-slab grid gap-4 p-5 md:grid-cols-[auto_minmax(0,1fr)]">
          <div className="hidden h-full w-12 place-items-center rounded-[8px] border border-[rgba(255,250,240,0.18)] bg-[rgba(255,250,240,0.06)] font-mono text-xs font-black uppercase text-[rgba(255,250,240,0.74)] md:grid">
            <span className="vertical-text">Portfolio</span>
          </div>
          <div className="grid gap-4">
            <div>
              <p className="eyebrow text-[rgba(255,250,240,0.74)]">{currentStage.band}</p>
              <h2 className="mt-2 font-serif text-3xl font-black leading-tight md:text-4xl">{currentStage.title}</h2>
              <p className="mt-3 max-w-3xl text-sm font-bold leading-6 text-[rgba(255,250,240,0.72)]">{currentStage.target}</p>
            </div>
            <div className="grid gap-3 md:grid-cols-5">
              {portfolioRows.map((row) => (
                <Link key={row.label} href={row.href} className="focus-ring rounded-[8px] border border-[rgba(255,250,240,0.16)] bg-[rgba(255,250,240,0.07)] p-3 transition hover:-translate-y-0.5">
                  <span className="font-mono text-[0.66rem] font-black uppercase text-[rgba(255,250,240,0.6)]">{row.label}</span>
                  <strong className="mt-2 block font-serif text-3xl leading-none">{row.value}</strong>
                  <span className="mt-2 flex items-center justify-between gap-2 text-xs font-bold text-[rgba(255,250,240,0.68)]">
                    /{row.target}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <Surface className="grid content-between gap-4">
          <div>
            <p className="eyebrow">Gate Meter</p>
            <div className="mt-3 flex items-end justify-between gap-3">
              <strong className="font-serif text-5xl leading-none">{stageProgress}%</strong>
              <span className="rounded-[8px] border border-[rgba(79,140,118,0.35)] bg-[rgba(79,140,118,0.1)] px-3 py-1 font-mono text-xs font-black uppercase text-[var(--celadon)]">
                {inAppPortfolioComplete ? "站内阶段已跑通" : "证据收集中"}
              </span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-[rgba(24,28,27,0.1)]">
              <div className="h-full bg-[var(--celadon)]" style={{ width: `${stageProgress}%` }} />
            </div>
          </div>
          <div className="grid gap-2">
            {currentStage.gates.map((gate) => (
              <div key={gate} className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-2 rounded-[8px] border border-[var(--line)] bg-[rgba(255,250,240,0.58)] p-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 text-[var(--ocean)]" />
                <span className="text-sm font-bold leading-6 text-[var(--muted)]">{gate}</span>
              </div>
            ))}
          </div>
        </Surface>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <Surface>
          <SectionHeading
            kicker="Rehearsal Console"
            title="今日母语者切片：先排练一句真的会用的表达"
            copy="搜索、筛选、播放、加入 SRS 都在这里完成。默认只给 6 张卡，是为了让你把每张都听、复述、换关系，而不是把高级表达当词条浏览。"
            action={activeFilters.filter(Boolean).length ? (
              <Button type="button" variant="ghost" size="sm" onClick={resetFilters}>
                重置筛选
              </Button>
            ) : null}
          />
          <div className="grid gap-4">
            <SearchField label="搜索表达" value={query} onChange={setQuery} placeholder="输入 韩语 / 中文 / 语气 / 场景 / 关系" />
            <div className="grid gap-3 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_auto]">
              <SegmentedFilter
                label="训练轨道"
                value={trackFilter}
                options={trackOptions.map((item) => ({ ...item, label: item.id === "all" ? item.label : `${item.label} ${trackCounts[item.id] ?? 0}` }))}
                onChange={setTrackFilter}
              />
              <SegmentedFilter
                label="层级"
                value={levelFilter}
                options={levelOptions}
                onChange={setLevelFilter}
              />
              <CheckboxFilter label="只看已加入 SRS" checked={onlyLearned} onChange={setOnlyLearned} />
            </div>
            <FilterSummary count={filteredItems.length} filters={activeFilters} unit="expressions" />
            {!focusedFilterActive ? (
              <div className="grid gap-3 rounded-[8px] border border-[rgba(185,78,60,0.22)] bg-[rgba(185,78,60,0.07)] p-3 text-sm font-bold leading-6 text-[var(--muted)] md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <span>
                  当前先显示 {visibleItems.length} 个今日母语者切片，混合场景语用和语气细差；每张卡都要听、复述、换一个关系场景再加入 SRS。熟悉后再展开剩余 {hiddenItemCount} 个表达。
                </span>
                {showAll || hiddenItemCount ? (
                  <Button type="button" variant="secondary" size="sm" onClick={() => setShowAll((value) => !value)}>
                    {showAll ? "收起到今日切片" : "展开全部表达"}
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        </Surface>

        <Surface className="h-fit xl:sticky xl:top-24">
          <SectionHeading
            kicker="Today"
            title="今天让语气更自然"
            copy="不要只收藏表达。每个动作都要回到材料、输出或复习。"
          />
          <div className="grid gap-2">
            {currentStage.todayActions.map((action, index) => (
              <Link
                key={`${currentStage.id}:${action.title}`}
                href={action.href}
                className="focus-ring rounded-[8px] border border-[var(--line)] bg-[rgba(255,250,240,0.62)] p-3 transition hover:-translate-y-0.5 hover:shadow-paper-sm"
              >
                <span className="mb-2 inline-flex items-center gap-2 font-mono text-xs font-black uppercase text-[var(--ocean)]">
                  <Gauge className="h-4 w-4" />
                  Step {index + 1}
                </span>
                <strong className="block font-serif text-xl leading-tight">{action.title}</strong>
                <span className="mt-2 block text-sm font-bold leading-6 text-[var(--muted)]">{action.task}</span>
              </Link>
            ))}
          </div>
        </Surface>
      </section>

      {!filteredItems.length ? (
        <Surface>
          <EmptyState title="没有匹配的母语者表达" copy="换一个搜索词，或重置轨道、层级和 SRS 筛选。" onAction={resetFilters} />
        </Surface>
      ) : null}

      {pragmaticItems.length ? (
        <Surface>
          <SectionHeading kicker="Pragmatics" title="场景语用" copy="先看关系和场合，再听每一句如何留余地、确认信息或缓和请求。" />
          <div className="grid gap-4 xl:grid-cols-2">
            {pragmaticItems.map((item) => (
              <NativeCard
                key={item.id}
                item={item}
                learned={learned.has(item.srsId)}
                evidence={workspace.progress.nativeEvidence[item.srsId]}
                hasError={srsErrorId === item.srsId}
                hasEvidenceError={evidenceErrorId === item.srsId}
                onToggle={() => toggleNativeSrs(item.srsId)}
                onSaveEvidence={(evidence) => saveNativeCardEvidence(item.srsId, evidence)}
              />
            ))}
          </div>
        </Surface>
      ) : null}

      {nuanceItems.length ? (
        <Surface>
          <SectionHeading kicker="Nuance" title="语义细微差别" copy="同一个中文意思在韩语里会因为语气、语域和关系距离发生偏移。" />
          <div id="nuance" className="grid gap-4 xl:grid-cols-2">
            {nuanceItems.map((item) => (
              <NativeCard
                key={item.id}
                item={item}
                learned={learned.has(item.srsId)}
                evidence={workspace.progress.nativeEvidence[item.srsId]}
                hasError={srsErrorId === item.srsId}
                hasEvidenceError={evidenceErrorId === item.srsId}
                onToggle={() => toggleNativeSrs(item.srsId)}
                onSaveEvidence={(evidence) => saveNativeCardEvidence(item.srsId, evidence)}
              />
            ))}
          </div>
        </Surface>
      ) : null}

      <Surface>
        <SectionHeading
          kicker="Native Portfolio"
          title="练习之后，再把证据收进作品集。"
          copy={`${inAppPortfolioComplete ? "站内阶段已跑通" : "当前站内阶段"}：${currentStage.band} · ${currentStage.title}。站内先完成可执行证据闭环；真正接近母语者的长期作品集会作为扩容目标单独保留。`}
        />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {portfolioRows.map((row) => (
            <PortfolioMetric key={row.label} label={row.label} value={row.value} target={row.target} />
          ))}
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="grid gap-2 rounded-[8px] border border-[rgba(183,135,63,0.36)] bg-[rgba(183,135,63,0.08)] p-4">
            <p className="font-mono text-xs font-black uppercase text-[var(--brass)]">Quality Gates</p>
            {currentStage.gates.map((gate) => (
              <p key={gate} className="text-sm font-bold leading-6 text-[var(--muted)]">{gate}</p>
            ))}
          </div>
          <div className="grid gap-2 rounded-[8px] border border-[rgba(23,63,115,0.22)] bg-[rgba(23,63,115,0.06)] p-4">
            <p className="font-mono text-xs font-black uppercase text-[var(--ocean)]">Long-term portfolio target</p>
            <p className="text-sm font-bold leading-6 text-[var(--muted)]">
              下一轮站外扩容从 {longTermStage.band} 开始，长期路线仍保留 {nativeRoadmapTotals.vocabulary.toLocaleString()}+ 词、{nativeRoadmapTotals.native.toLocaleString()}+ 母语者表达、{nativeRoadmapTotals.materials.toLocaleString()}+ 材料、{nativeRoadmapTotals.outputTasks.toLocaleString()}+ 输出档案和 {nativeRoadmapTotals.checkpoints.toLocaleString()} 个检查点；这些属于站外扩容，不会冒充当前站内完成条件。
            </p>
          </div>
        </div>
      </Surface>
    </div>
  );
}

function NativeCard({
  item,
  learned,
  evidence,
  hasError,
  hasEvidenceError,
  onToggle,
  onSaveEvidence
}: {
  item: NativeItem;
  learned: boolean;
  evidence?: NativeEvidenceInput;
  hasError: boolean;
  hasEvidenceError: boolean;
  onToggle: () => void;
  onSaveEvidence: (evidence: NativeEvidenceInput) => void;
}) {
  const Icon = item.track === "pragmatics" ? MessagesSquare : Sparkles;
  const relationProfile = buildRelationProfile(item);
  const [showAllLines, setShowAllLines] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [listened, setListened] = useState(Boolean(evidence?.listened));
  const [retell, setRetell] = useState(evidence?.retell ?? "");
  const [transfer, setTransfer] = useState(evidence?.transfer ?? "");
  const visibleLines = showAllLines ? item.lines : item.lines.slice(0, 1);
  const hiddenLineCount = Math.max(0, item.lines.length - visibleLines.length);
  const evidenceComplete = listened && hasKoreanRetellEvidence(retell) && hasKoreanOutputRewrite(transfer);
  const evidenceSaved = Boolean(evidence && evidenceComplete);
  const handleToggle = () => {
    if (learned && !confirmRemove) {
      setConfirmRemove(true);
      return;
    }
    onToggle();
    setConfirmRemove(false);
  };
  return (
    <article className={`grid gap-4 rounded-[8px] border p-4 ${learned ? "border-[rgba(79,140,118,0.45)] bg-[rgba(79,140,118,0.1)]" : "border-[var(--line)] bg-[rgba(255,250,240,0.62)]"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-2 rounded-[8px] bg-[rgba(23,63,115,0.08)] px-3 py-1 font-mono text-xs font-black uppercase text-[var(--ocean)]">
            <Icon className="h-3.5 w-3.5" />
            {item.level}
          </span>
          <h3 className="mt-3 font-serif text-2xl font-black leading-tight">{item.title}</h3>
        </div>
        <Button type="button" variant={confirmRemove ? "ghost" : "secondary"} size="sm" onClick={handleToggle}>
          {learned ? confirmRemove ? "确认移出复习" : "已加入 SRS" : item.track === "pragmatics" ? "加入场景复习" : "加入语气复习"}
        </Button>
      </div>
      {confirmRemove ? (
        <p className="rounded-[8px] border border-[rgba(185,78,60,0.32)] bg-[rgba(185,78,60,0.08)] p-3 text-xs font-bold leading-5 text-[var(--cinnabar)]">
          再点一次才会移出 SRS；已经提交的护照证据会保留。
        </p>
      ) : null}
      {hasError ? <SrsError /> : null}
      <p className="text-sm leading-6 text-[var(--muted)]">{item.summary}</p>
      <div className="grid gap-2 rounded-[8px] border border-[var(--line)] bg-[rgba(255,250,240,0.58)] p-3 sm:grid-cols-4">
        {relationProfile.map((slot) => (
          <div key={slot.label} className="rounded-[8px] bg-[rgba(23,63,115,0.06)] px-3 py-2">
            <span className="font-mono text-[0.66rem] font-black uppercase text-[var(--muted)]">{slot.label}</span>
            <strong className="mt-1 block text-sm leading-5 text-[var(--ink)]">{slot.value}</strong>
          </div>
        ))}
      </div>
      <div className="grid gap-2 rounded-[8px] border border-[rgba(183,135,63,0.28)] bg-[rgba(183,135,63,0.08)] p-3 text-xs font-black leading-5 text-[var(--muted)] sm:grid-cols-3">
        <span className="inline-flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-[var(--brass)]" />
          先听一句
        </span>
        <span className="inline-flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-[var(--brass)]" />
          换关系复述
        </span>
        <span className="inline-flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-[var(--brass)]" />
          再加入 SRS
        </span>
      </div>
      {item.contrast.length ? (
        <div className="flex flex-wrap gap-2">
          {item.contrast.map((part) => (
            <b key={part} className="hangul-display rounded-[8px] bg-[rgba(23,63,115,0.08)] px-3 py-1">
              {part}
            </b>
          ))}
        </div>
      ) : null}
      <div className="grid gap-2">
        {visibleLines.map((line) => (
          <button
            key={line.ko}
            type="button"
            className="focus-ring rounded-[8px] border border-[var(--line)] bg-[rgba(255,250,240,0.76)] p-3 text-left transition hover:-translate-y-0.5"
            onClick={() => speakKorean(line.ko)}
          >
            <span className="mb-2 inline-flex items-center gap-2 text-xs font-black text-[var(--ocean)]">
              <Volume2 className="h-4 w-4" />
              PLAY
            </span>
            <strong className="hangul-display block text-xl">{line.ko}</strong>
            <span className="mt-1 block text-sm text-[var(--muted)]">{line.zh}</span>
            <small className="mt-1 block leading-5 text-[var(--muted)]">{line.note}</small>
          </button>
        ))}
        {item.lines.length > 1 ? (
          <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={() => setShowAllLines((value) => !value)}>
            {showAllLines ? "收起到关键台词" : `展开完整排练 · 还有 ${hiddenLineCount} 句`}
          </Button>
        ) : null}
      </div>
      <div className="rounded-[8px] border-l-4 border-[var(--ocean)] bg-[rgba(23,63,115,0.07)] p-3 text-sm leading-6 text-[var(--muted)]">
        {item.nativeMove}
      </div>
      <div className="grid gap-3 rounded-[8px] border border-[rgba(23,63,115,0.18)] bg-[rgba(23,63,115,0.055)] p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="inline-flex items-center gap-2 text-sm font-black text-[var(--ink)]">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[var(--ocean)]"
              checked={listened}
              onChange={(event) => setListened(event.target.checked)}
            />
            已完整听过关键台词
          </label>
          <span className={`rounded-[8px] border px-2 py-1 font-mono text-[0.68rem] font-black uppercase ${evidenceSaved ? "border-[rgba(79,140,118,0.38)] bg-[rgba(79,140,118,0.1)] text-[var(--celadon)]" : "border-[rgba(183,135,63,0.36)] bg-[rgba(183,135,63,0.08)] text-[var(--brass)]"}`}>
            {evidenceSaved ? "证据已入护照" : "证据未完成"}
          </span>
        </div>
        <label className="grid gap-1 text-sm font-bold text-[var(--muted)]">
          韩语复述
          <textarea
            className="min-h-20 resize-y rounded-[8px] border border-[var(--line)] bg-[rgba(255,250,240,0.82)] p-3 font-bold text-[var(--ink)] outline-none focus:border-[var(--ocean)]"
            value={retell}
            placeholder="用韩语复述这张卡的关系、场合或语气动作。"
            onChange={(event) => setRetell(event.target.value)}
          />
        </label>
        <label className="grid gap-1 text-sm font-bold text-[var(--muted)]">
          关系迁移
          <textarea
            className="min-h-20 resize-y rounded-[8px] border border-[var(--line)] bg-[rgba(255,250,240,0.82)] p-3 font-bold text-[var(--ink)] outline-none focus:border-[var(--ocean)]"
            value={transfer}
            placeholder="换成朋友/前辈/店员/同事等另一种关系，用韩语改写一句。"
            onChange={(event) => setTransfer(event.target.value)}
          />
        </label>
        {hasEvidenceError ? (
          <InlineAlert>
            母语者证据没有保存：需要勾选听辨，并填写两段可复查的韩语复述与关系迁移。
          </InlineAlert>
        ) : null}
        <Button type="button" variant={evidenceSaved ? "secondary" : "primary"} size="sm" className="w-fit" disabled={!evidenceComplete} onClick={() => onSaveEvidence({ listened, retell, transfer })}>
          {evidenceSaved ? "更新护照证据" : "保存证据并加入 SRS"}
        </Button>
      </div>
    </article>
  );
}

function SrsError() {
  return (
    <InlineAlert>
      这张母语者表达卡没有写入成功，请释放浏览器存储空间或关闭隐私限制后再试。
    </InlineAlert>
  );
}

interface NativeItem {
  id: string;
  srsId: string;
  track: "pragmatics" | "nuance";
  level: string;
  title: string;
  context: string;
  goal: string;
  summary: string;
  nativeMove: string;
  contrast: string[];
  lines: Array<{ ko: string; zh: string; note: string }>;
  searchText: string;
}

function buildNativeItems(): NativeItem[] {
  const pragmatics = pragmaticScenarios.map((scene: any) => ({
    id: `pragmatics:${scene.id}`,
    srsId: `pragmatics:${scene.id}`,
    track: "pragmatics" as const,
    level: scene.level,
    title: scene.title,
    context: scene.context,
    goal: scene.goal,
    summary: `${scene.goal} ${scene.context}`,
    nativeMove: scene.nativeMove,
    contrast: [],
    lines: scene.lines,
    searchText: [
      scene.level,
      scene.title,
      scene.goal,
      scene.context,
      scene.nativeMove,
      ...scene.lines.flatMap((line: any) => [line.ko, line.zh, line.note])
    ].join(" ")
  }));
  const nuances = nuanceSets.map((set: any) => ({
    id: `nuance:${set.id}`,
    srsId: `nuance:${set.id}`,
    track: "nuance" as const,
    level: set.level,
    title: set.title,
    context: set.explanation,
    goal: set.title,
    summary: set.explanation,
    nativeMove: set.explanation,
    contrast: set.contrast,
    lines: set.examples.map((example: any) => ({
      ko: example.ko,
      zh: example.zh,
      note: example.register
    })),
    searchText: [
      set.level,
      set.title,
      set.explanation,
      ...set.contrast,
      ...set.examples.flatMap((example: any) => [example.ko, example.zh, example.register])
    ].join(" ")
  }));
  return [...pragmatics, ...nuances];
}

function buildDailyNativeSlice(items: NativeItem[], limit: number) {
  const tracks: Array<NativeItem["track"]> = ["pragmatics", "nuance"];
  const selected: NativeItem[] = [];
  const used = new Set<string>();

  for (const track of tracks) {
    for (const item of items) {
      if (selected.length >= limit) return selected;
      if (item.track !== track || used.has(item.id)) continue;
      selected.push(item);
      used.add(item.id);
      if (selected.filter((entry) => entry.track === track).length >= Math.ceil(limit / tracks.length)) break;
    }
  }

  for (const item of items) {
    if (selected.length >= limit) break;
    if (used.has(item.id)) continue;
    selected.push(item);
    used.add(item.id);
  }

  return selected;
}

function PortfolioMetric({ label, value, target }: { label: string; value: number; target: number }) {
  const safeTarget = Math.max(1, target);
  const percent = Math.min(100, Math.round((value / safeTarget) * 100));
  return (
    <div className="rounded-[8px] border border-[var(--line)] bg-[rgba(255,250,240,0.62)] p-3">
      <div className="flex items-end justify-between gap-2">
        <strong className="font-serif text-2xl font-black">{value.toLocaleString()}</strong>
        <span className="font-mono text-xs font-black text-[var(--muted)]">/{target.toLocaleString()}</span>
      </div>
      <p className="mt-1 font-mono text-xs font-black uppercase text-[var(--muted)]">{label}</p>
      <div
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-[rgba(24,28,27,0.1)]"
        role="progressbar"
        aria-label={`${label} 长期作品集进度`}
        aria-valuemin={0}
        aria-valuemax={target}
        aria-valuenow={Math.min(value, target)}
      >
        <div className="h-full bg-[var(--celadon)]" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function buildRelationProfile(item: NativeItem) {
  const text = `${item.context} ${item.goal} ${item.nativeMove} ${item.lines.map((line) => `${line.zh} ${line.note}`).join(" ")}`;
  return [
    { label: "关系", value: inferRelation(text, item) },
    { label: "场合", value: inferSetting(text, item) },
    { label: "直接度", value: inferDirectness(text, item) },
    { label: "语气动作", value: inferMove(text, item) }
  ];
}

function inferRelation(text: string, item: NativeItem) {
  if (/朋友|亲近/.test(text)) return "亲近关系";
  if (/前辈|老师|同事|工作|正式|陌生人|店员/.test(text)) return "保持礼貌距离";
  if (item.track === "nuance") return "按语域切换";
  return "默认礼貌";
}

function inferSetting(text: string, item: NativeItem) {
  if (/咖啡|店员|点单/.test(text)) return "服务场景";
  if (/媒体|看剧|综艺|评价/.test(text)) return "内容讨论";
  if (/工作|学习|会议|方法|确认/.test(text)) return "协作讨论";
  if (/问路|地铁|方向/.test(text)) return "陌生求助";
  return item.track === "nuance" ? "同义表达选择" : "日常对话";
}

function inferDirectness(text: string, item: NativeItem) {
  if (/拒绝|不同意|缓冲|留余地|것 같아요|아마|좀|약간/.test(text)) return "低直接度";
  if (/正式|감사합니다|죄송합니다/.test(text)) return "正式克制";
  if (item.level === "native") return "语气微调";
  return "安全直接";
}

function inferMove(text: string, item: NativeItem) {
  if (/确认|한번 더|다시|천천히/.test(text)) return "确认/请求";
  if (/感谢|고마|감사/.test(text)) return "感谢";
  if (/道歉|미안|죄송/.test(text)) return "道歉";
  if (/不同意|다르게|그럴 수도/.test(text)) return "先承认再转向";
  if (/评价|아쉽|좋|어려운/.test(text)) return "评价降调";
  return item.track === "nuance" ? "语域选择" : "自然接话";
}

function countBy(items: NativeItem[], key: "track" | "level") {
  return items.reduce<Record<string, number>>((acc, item) => {
    acc[item[key]] = (acc[item[key]] ?? 0) + 1;
    return acc;
  }, {});
}

function normalizeSearch(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}
