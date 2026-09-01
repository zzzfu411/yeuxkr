"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock, ExternalLink, FilePenLine, History, MessagesSquare, Mic2, Plus, ShieldCheck, Sparkles, Trash2, Volume2 } from "lucide-react";
import { LearningCompass } from "@/components/learning/learning-compass";
import { LibraryGateNotice } from "@/components/learning/library-gate-notice";
import { OnboardingGateNotice } from "@/components/learning/onboarding-gate-notice";
import { Button } from "@/components/ui/button";
import { TrackRow } from "@/components/ui/track-row";
import { CheckboxFilter, EmptyState, FilterSummary, SearchField, SegmentedFilter } from "@/components/ui/filter-console";
import { InlineAlert } from "@/components/ui/inline-alert";
import { ModuleHero, PageHeader, SectionHeading, Surface } from "@/components/ui/section";
import { getCurrentInAppNativeStage, nativeRoadmapTotals } from "@/data/native-roadmap";
import { nuanceSets } from "@/data/nuance";
import { pragmaticScenarios } from "@/data/pragmatics";
import { countSavedCollocationEvidence, useNativePortfolio, type NativePortfolioDraft, type NativePortfolioEntry } from "@/lib/learning/native-portfolio";
import { firstHangul } from "@/lib/learning/player";
import { speakKorean } from "@/lib/speech";
import { needsOnboardingFunnel } from "@/lib/learning/compass";
import { countCheckpointCredits, countNativePracticeEvidence, hasCompleteNativePracticeEvidence, useLearningWorkspace, type NativeEvidenceInput } from "@/lib/learning/workspace";

const trackOptions = [
  { id: "all", label: "全部" },
  { id: "pragmatics", label: "场景语用" },
  { id: "nuance", label: "语气细差" }
];

export default function NativePage() {
  const { workspace, toggleNative, saveNativeEvidence } = useLearningWorkspace();
  const enrollBlocked = needsOnboardingFunnel(workspace.profile, workspace.progress);
  const learned = useMemo(() => new Set(workspace.progress.learnedNative), [workspace.progress.learnedNative]);
  const [query, setQuery] = useState("");
  const [trackFilter, setTrackFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [onlyLearned, setOnlyLearned] = useState(false);
  const [srsErrorId, setSrsErrorId] = useState("");
  const [evidenceErrorId, setEvidenceErrorId] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const portfolioEvidence = {
    vocabulary: workspace.progress.learnedVocab.length,
    collocations: countSavedCollocationEvidence(workspace.progress.learnedVocab),
    materials: workspace.stats.completedMaterials,
    outputTasks: workspace.stats.outputEntries,
    checkpoints: countCheckpointCredits(workspace.progress),
    native: countNativePracticeEvidence(workspace.progress)
  };
  const { currentStage, inAppPortfolioComplete } = getCurrentInAppNativeStage(portfolioEvidence);
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
    { label: "已入册搭配", value: portfolioEvidence.collocations, target: stageTargets.collocations, href: "/vocabulary" },
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
    if (enrollBlocked) return;
    if (toggleNative(itemId)) {
      setSrsErrorId((current) => (current === itemId ? "" : current));
      return;
    }
    setSrsErrorId(itemId);
  };
  const saveNativeCardEvidence = (itemId: string, evidence: NativeEvidenceInput) => {
    if (enrollBlocked) return;
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

      <OnboardingGateNotice copy="先完成三分钟入门，再把母语者表达写入核心路径。" />
      <LibraryGateNotice focus="native" />

      <section className="grid gap-4 border-y border-[var(--line)] py-5">
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
            <div className="grid gap-3 rounded-none border border-[var(--seal)] bg-[var(--seal-soft)] p-3 text-sm font-bold leading-6 text-[var(--muted)] md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
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
      </section>

      {!filteredItems.length ? (
        <Surface>
          <EmptyState title="没有匹配的母语者表达" copy="换一个搜索词，或重置轨道、层级和 SRS 筛选。" onAction={resetFilters} />
        </Surface>
      ) : null}

      {pragmaticItems.length ? (
        <section className="grid gap-4">
          <SectionHeading kicker="Pragmatics" title="场景语用" copy="先看关系和场合，再听每一句如何留余地、确认信息或缓和请求。" />
          <div>
            {pragmaticItems.map((item, index) => (
              <NativeCard
                key={item.id}
                index={index + 1}
                item={item}
                learned={learned.has(item.srsId)}
                evidence={workspace.progress.nativeEvidence[item.srsId]}
                hasError={srsErrorId === item.srsId}
                hasEvidenceError={evidenceErrorId === item.srsId}
                expanded={!collapsed[item.id]}
                onExpand={() => setCollapsed((current) => ({ ...current, [item.id]: !current[item.id] }))}
                onToggle={() => toggleNativeSrs(item.srsId)}
                onSaveEvidence={(evidence) => saveNativeCardEvidence(item.srsId, evidence)}
                enrollBlocked={enrollBlocked}
              />
            ))}
          </div>
        </section>
      ) : null}

      {nuanceItems.length ? (
        <section className="grid gap-4">
          <SectionHeading kicker="Nuance" title="语义细微差别" copy="同一个中文意思在韩语里会因为语气、语域和关系距离发生偏移。" />
          <div id="nuance">
            {nuanceItems.map((item, index) => (
              <NativeCard
                key={item.id}
                index={index + 1}
                item={item}
                learned={learned.has(item.srsId)}
                evidence={workspace.progress.nativeEvidence[item.srsId]}
                hasError={srsErrorId === item.srsId}
                hasEvidenceError={evidenceErrorId === item.srsId}
                expanded={!collapsed[item.id]}
                onExpand={() => setCollapsed((current) => ({ ...current, [item.id]: !current[item.id] }))}
                onToggle={() => toggleNativeSrs(item.srsId)}
                onSaveEvidence={(evidence) => saveNativeCardEvidence(item.srsId, evidence)}
                enrollBlocked={enrollBlocked}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid gap-4">
        <SectionHeading
          kicker="Today"
          title="今天让语气更自然"
          copy="不要只收藏表达。每个动作都要回到材料、输出或复习。"
        />
        <div>
          {currentStage.todayActions.map((action, index) => (
            <TrackRow
              key={`${currentStage.id}:${action.title}`}
              index={index + 1}
              glyph={String(index + 1)}
              kicker={`Step ${index + 1}`}
              title={action.title}
              detail={action.task}
              href={action.href}
            />
          ))}
        </div>
      </section>

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
          <div className="hidden h-full w-12 place-items-center rounded-none border border-[var(--line)] bg-[var(--wash-1)] font-mono text-xs font-black uppercase text-[var(--ink-soft)] md:grid">
            <span className="vertical-text">Portfolio</span>
          </div>
          <div className="grid gap-4">
            <div>
              <p className="eyebrow text-[var(--ink-soft)]">{currentStage.band}</p>
              <h2 className="mt-2 font-serif text-3xl font-black leading-tight md:text-4xl">{currentStage.title}</h2>
              <p className="mt-3 max-w-3xl text-sm font-bold leading-6 text-[var(--muted)]">{currentStage.target}</p>
            </div>
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
              {portfolioRows.map((row) => (
                <Link key={row.label} href={row.href} className="focus-ring rounded-none border border-[var(--line)] bg-[var(--wash-1)] p-3 transition hover:-translate-y-0.5">
                  <span className="font-mono text-[0.66rem] font-black uppercase text-[var(--muted)]">{row.label}</span>
                  <strong className="mt-2 block font-serif text-3xl leading-none">{row.value}</strong>
                  <span className="mt-2 flex items-center justify-between gap-2 text-xs font-bold text-[var(--muted)]">
                    /{row.target}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="grid content-between gap-4 border-y border-[var(--line)] py-4">
          <div>
            <p className="eyebrow">Gate Meter</p>
            <div className="mt-3 flex items-end justify-between gap-3">
              <strong className="font-serif text-5xl leading-none">{stageProgress}%</strong>
              <span className="rounded-none border border-[var(--green)] bg-[var(--green-soft)] px-3 py-1 font-mono text-xs font-black uppercase text-[var(--celadon)]">
                {inAppPortfolioComplete ? "站内阶段已跑通" : "证据收集中"}
              </span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--track)]">
              <div className="h-full bg-[var(--celadon)]" style={{ width: `${stageProgress}%` }} />
            </div>
          </div>
          <div className="grid gap-2">
            {currentStage.gates.map((gate) => (
              <div key={gate} className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-2 border-t border-[var(--line)] pt-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 text-[var(--ocean)]" />
                <span className="text-sm font-bold leading-6 text-[var(--muted)]">{gate}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <LongTermNativePortfolio />
    </div>
  );
}

function LongTermNativePortfolio() {
  const { state, summary, addEntry, reviseEntry, deleteEntry } = useNativePortfolio();
  const [formKey, setFormKey] = useState(0);
  const [showComposer, setShowComposer] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const metrics = [
    { label: "外部作品", value: summary.entries, icon: FilePenLine },
    { label: "学习时长", value: `${summary.learningMinutes} 分`, icon: Clock },
    { label: "录音时长", value: `${summary.recordingMinutes} 分`, icon: Mic2 },
    { label: "版本快照", value: summary.revisions, icon: History }
  ];
  const handleAdd = (draft: NativePortfolioDraft) => {
    const saved = addEntry(draft);
    setNotice(saved
      ? { tone: "success", text: "作品集证据已保存在本机。" }
      : { tone: "error", text: "作品没有保存，请检查必填内容或浏览器存储空间。" });
    if (saved) {
      setFormKey((value) => value + 1);
      setShowComposer(false);
    }
    return saved;
  };
  const handleRevise = (entryId: string, draft: NativePortfolioDraft, note: string) => {
    const saved = reviseEntry(entryId, draft, note);
    setNotice(saved
      ? { tone: "success", text: "修订已保存，上一版仍保留在版本记录中。" }
      : { tone: "error", text: "修订没有保存，请检查内容或浏览器存储空间。" });
    return saved;
  };
  const handleDelete = (entryId: string) => {
    const deleted = deleteEntry(entryId);
    setNotice(deleted
      ? { tone: "success", text: "这条作品集证据及其修订记录已删除。" }
      : { tone: "error", text: "删除没有完成，请检查浏览器存储状态。" });
    return deleted;
  };

  return (
    <section id="long-term-portfolio" className="grid gap-5 border-t border-[var(--line)] pt-6">
      <SectionHeading
        kicker="External Evidence Studio"
        title="长期母语者路线作品集"
        copy={`把站外材料、练习投入、导师反馈和作品版本留在同一条可复查记录里。长期扩容目标保留 ${nativeRoadmapTotals.vocabulary.toLocaleString()}+ 词、${nativeRoadmapTotals.collocations.toLocaleString()}+ 搭配、${nativeRoadmapTotals.materials.toLocaleString()}+ 材料和 ${nativeRoadmapTotals.outputTasks.toLocaleString()}+ 输出；这些不会冒充站内分数。`}
        action={(
          <Button type="button" variant={showComposer ? "ghost" : "primary"} size="sm" onClick={() => setShowComposer((value) => !value)}>
            <Plus className="h-4 w-4" />
            {showComposer ? "收起编辑器" : "录入新作品"}
          </Button>
        )}
      />
      <div className="grid border-y border-[var(--line)] md:grid-cols-4 md:divide-x md:divide-[var(--line)]">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 border-b border-[var(--line)] px-3 py-4 last:border-b-0 md:border-b-0">
              <Icon className="h-5 w-5 text-[var(--ocean)]" />
              <div>
                <strong className="block font-serif text-2xl leading-none">{metric.value}</strong>
                <span className="mt-1 block font-mono text-xs font-black uppercase text-[var(--muted)]">{metric.label}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-3 border-l-4 border-[var(--brass)] bg-[var(--yellow-soft)] p-4">
        <ShieldCheck className="mt-0.5 h-5 w-5 text-[var(--brass)]" />
        <p className="text-sm font-bold leading-6 text-[var(--muted)]">
          独立证据仓：这里保存的是长期作品集证据，不会写入上方站内能力分、C1 阶段进度或 SRS 完成数。
        </p>
      </div>
      {notice?.tone === "error" ? <InlineAlert>{notice.text}</InlineAlert> : null}
      {notice?.tone === "success" ? (
        <p role="status" className="border-l-4 border-[var(--celadon)] bg-[var(--green-soft)] p-3 text-sm font-bold leading-6 text-[var(--muted)]">
          {notice.text}
        </p>
      ) : null}
      {showComposer ? <NativePortfolioForm key={formKey} onSubmit={handleAdd} onCancel={() => setShowComposer(false)} /> : null}
      <div className="grid gap-3">
        <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <p className="eyebrow">Saved works</p>
            <h3 className="mt-1 font-serif text-2xl font-black">本地作品与修订记录</h3>
          </div>
          <span className="font-mono text-xs font-black text-[var(--muted)]">{state.entries.length} ITEMS</span>
        </div>
        {state.entries.length ? state.entries.map((entry) => (
          <NativePortfolioRecord
            key={entry.id}
            entry={entry}
            onRevise={handleRevise}
            onDelete={handleDelete}
          />
        )) : (
          <div className="border-y border-dashed border-[var(--line)] py-8 text-center">
            <strong className="font-serif text-xl">还没有站外作品证据</strong>
            <p className="mt-2 text-sm font-bold leading-6 text-[var(--muted)]">第一条记录会从外部材料来源和作品正文开始。</p>
          </div>
        )}
      </div>
    </section>
  );
}

function NativePortfolioForm({
  entry,
  onSubmit,
  onCancel
}: {
  entry?: NativePortfolioEntry;
  onSubmit: (draft: NativePortfolioDraft, revisionNote: string) => boolean;
  onCancel?: () => void;
}) {
  const [draft, setDraft] = useState<NativePortfolioDraft>(() => entry ? draftFromEntry(entry) : emptyPortfolioDraft());
  const [revisionNote, setRevisionNote] = useState("");
  const [error, setError] = useState("");
  const isRevision = Boolean(entry);
  function updateDraft<Key extends keyof NativePortfolioDraft>(key: Key, value: NativePortfolioDraft[Key]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.title.trim() || !draft.source.trim() || !draft.body.trim()) {
      setError("请填写作品标题、外部材料来源和作品正文。");
      return;
    }
    const saved = onSubmit(draft, revisionNote);
    setError(saved ? "" : "本地写入失败，内容仍保留在表单中。");
  };
  const fieldClass = "focus-ring min-h-11 rounded-none border border-[var(--line)] bg-[var(--surface-solid)] px-3 py-2 font-bold text-[var(--ink)] focus:border-[var(--ocean)]";

  return (
    <form className="grid gap-4 border-y border-[var(--line)] py-5" onSubmit={handleSubmit}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">{isRevision ? "Revision" : "New evidence"}</p>
          <h3 className="mt-1 font-serif text-2xl font-black">{isRevision ? "保存一个新版本" : "录入一条站外作品证据"}</h3>
        </div>
        {onCancel ? (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>取消修订</Button>
        ) : null}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1 text-sm font-bold text-[var(--muted)]">
          作品标题 <span className="sr-only">必填</span>
          <input className={fieldClass} value={draft.title} maxLength={240} required onChange={(event) => updateDraft("title", event.target.value)} />
        </label>
        <label className="grid gap-1 text-sm font-bold text-[var(--muted)]">
          外部材料来源 <span className="sr-only">必填</span>
          <input className={fieldClass} value={draft.source} maxLength={800} required placeholder="节目、文章、课程或导师任务" onChange={(event) => updateDraft("source", event.target.value)} />
        </label>
        <label className="grid gap-1 text-sm font-bold text-[var(--muted)] md:col-span-2">
          来源链接（可选）
          <input className={fieldClass} type="url" value={draft.sourceUrl} maxLength={1600} placeholder="https://" onChange={(event) => updateDraft("sourceUrl", event.target.value)} />
        </label>
        <label className="grid gap-1 text-sm font-bold text-[var(--muted)]">
          学习时长（分钟）
          <input className={fieldClass} type="number" inputMode="numeric" min={0} max={100000} value={draft.learningMinutes} onChange={(event) => updateDraft("learningMinutes", Number(event.target.value))} />
        </label>
        <label className="grid gap-1 text-sm font-bold text-[var(--muted)]">
          录音时长（分钟）
          <input className={fieldClass} type="number" inputMode="numeric" min={0} max={100000} value={draft.recordingMinutes} onChange={(event) => updateDraft("recordingMinutes", Number(event.target.value))} />
        </label>
      </div>
      <label className="grid gap-1 text-sm font-bold text-[var(--muted)]">
        导师反馈
        <textarea className={`${fieldClass} min-h-24 resize-y`} value={draft.mentorFeedback} maxLength={8000} onChange={(event) => updateDraft("mentorFeedback", event.target.value)} />
      </label>
      <label className="grid gap-1 text-sm font-bold text-[var(--muted)]">
        作品正文 <span className="sr-only">必填</span>
        <textarea className={`${fieldClass} min-h-48 resize-y`} value={draft.body} lang="ko" spellCheck={false} maxLength={40000} required onChange={(event) => updateDraft("body", event.target.value)} />
      </label>
      {isRevision ? (
        <label className="grid gap-1 text-sm font-bold text-[var(--muted)]">
          本次修订说明
          <input className={fieldClass} value={revisionNote} maxLength={600} placeholder="例如：根据导师反馈重写结尾" onChange={(event) => setRevisionNote(event.target.value)} />
        </label>
      ) : null}
      {error ? <InlineAlert>{error}</InlineAlert> : null}
      <Button type="submit" variant="primary" size="sm" className="w-fit">
        {isRevision ? <FilePenLine className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        {isRevision ? "保存新版本" : "保存作品证据"}
      </Button>
    </form>
  );
}

function NativePortfolioRecord({
  entry,
  onRevise,
  onDelete
}: {
  entry: NativePortfolioEntry;
  onRevise: (entryId: string, draft: NativePortfolioDraft, revisionNote: string) => boolean;
  onDelete: (entryId: string) => boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const safeSourceUrl = safeExternalUrl(entry.sourceUrl);
  const handleRevise = (draft: NativePortfolioDraft, revisionNote: string) => {
    const saved = onRevise(entry.id, draft, revisionNote);
    if (saved) setEditing(false);
    return saved;
  };
  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    if (onDelete(entry.id)) setConfirmDelete(false);
  };

  return (
    <article className="grid gap-4 rounded-none border border-[var(--line)] bg-[var(--card)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs font-black uppercase text-[var(--ocean)]">Updated {displayPortfolioDate(entry.updatedAt)}</p>
          <h4 className="mt-2 break-words font-serif text-2xl font-black leading-tight">{entry.title}</h4>
          {safeSourceUrl ? (
            <a className="focus-ring mt-2 inline-flex max-w-full items-center gap-2 break-all text-sm font-bold text-[var(--ocean)] underline-offset-4 hover:underline" href={safeSourceUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4 shrink-0" />
              {entry.source}
            </a>
          ) : (
            <p className="mt-2 break-words text-sm font-bold text-[var(--muted)]">来源：{entry.source}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => { setEditing((value) => !value); setConfirmDelete(false); }}>
            <FilePenLine className="h-4 w-4" />
            修订
          </Button>
          <Button type="button" variant={confirmDelete ? "primary" : "ghost"} size="sm" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
            {confirmDelete ? "确认删除" : "删除"}
          </Button>
        </div>
      </div>
      {confirmDelete ? (
        <p className="border-l-4 border-[var(--cinnabar)] bg-[var(--seal-soft)] p-3 text-xs font-bold leading-5 text-[var(--cinnabar)]">
          再点一次会删除当前作品及全部版本记录。
        </p>
      ) : null}
      <div className="flex flex-wrap gap-x-5 gap-y-2 border-y border-[var(--line)] py-3 text-sm font-bold text-[var(--muted)]">
        <span className="inline-flex items-center gap-2"><Clock className="h-4 w-4 text-[var(--brass)]" />学习 {entry.learningMinutes} 分钟</span>
        <span className="inline-flex items-center gap-2"><Mic2 className="h-4 w-4 text-[var(--cinnabar)]" />录音 {entry.recordingMinutes} 分钟</span>
        <span className="inline-flex items-center gap-2"><History className="h-4 w-4 text-[var(--ocean)]" />{entry.revisions.length} 个版本</span>
      </div>
      {entry.mentorFeedback ? (
        <div className="border-l-4 border-[var(--brass)] pl-3">
          <span className="font-mono text-xs font-black uppercase text-[var(--brass)]">Mentor feedback</span>
          <p className="mt-1 whitespace-pre-wrap text-sm font-bold leading-6 text-[var(--muted)]">{entry.mentorFeedback}</p>
        </div>
      ) : null}
      <div>
        <span className="font-mono text-xs font-black uppercase text-[var(--muted)]">Current work</span>
        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-[var(--ink)]" lang="ko">{entry.body}</p>
      </div>
      {editing ? (
        <NativePortfolioForm entry={entry} onSubmit={handleRevise} onCancel={() => setEditing(false)} />
      ) : null}
      <div className="border-t border-[var(--line)] pt-3">
        <Button type="button" variant="ghost" size="sm" onClick={() => setShowHistory((value) => !value)}>
          <History className="h-4 w-4" />
          {showHistory ? "收起版本记录" : `查看版本记录 ${entry.revisions.length}`}
        </Button>
        {showHistory ? (
          <ol className="mt-3 grid gap-3">
            {[...entry.revisions].reverse().map((revision) => (
              <li key={revision.id} className="grid gap-2 border-t border-dashed border-[var(--line)] pt-3">
                <div className="flex flex-wrap justify-between gap-2">
                  <strong className="text-sm">{revision.note}</strong>
                  <span className="font-mono text-xs font-black text-[var(--muted)]">{displayPortfolioDate(revision.createdAt)}</span>
                </div>
                <p className="whitespace-pre-wrap break-words text-sm leading-6 text-[var(--muted)]" lang="ko">{revision.body}</p>
                {revision.mentorFeedback ? <p className="text-xs font-bold leading-5 text-[var(--brass)]">导师反馈：{revision.mentorFeedback}</p> : null}
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </article>
  );
}

function emptyPortfolioDraft(): NativePortfolioDraft {
  return {
    title: "",
    source: "",
    sourceUrl: "",
    learningMinutes: 0,
    recordingMinutes: 0,
    mentorFeedback: "",
    body: ""
  };
}

function draftFromEntry(entry: NativePortfolioEntry): NativePortfolioDraft {
  return {
    title: entry.title,
    source: entry.source,
    sourceUrl: entry.sourceUrl,
    learningMinutes: entry.learningMinutes,
    recordingMinutes: entry.recordingMinutes,
    mentorFeedback: entry.mentorFeedback,
    body: entry.body
  };
}

function safeExternalUrl(input: string) {
  if (!input) return "";
  try {
    const url = new URL(input);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function displayPortfolioDate(input: string) {
  return Number.isFinite(Date.parse(input)) ? input.slice(0, 10) : "unknown";
}

function NativeCard({
  index,
  item,
  learned,
  evidence,
  hasError,
  hasEvidenceError,
  expanded,
  onExpand,
  onToggle,
  onSaveEvidence,
  enrollBlocked = false
}: {
  index: number;
  item: NativeItem;
  learned: boolean;
  evidence?: NativeEvidenceInput;
  hasError: boolean;
  hasEvidenceError: boolean;
  expanded: boolean;
  onExpand: () => void;
  onToggle: () => void;
  onSaveEvidence: (evidence: NativeEvidenceInput) => void;
  enrollBlocked?: boolean;
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
  const evidenceComplete = hasCompleteNativePracticeEvidence({ listened, retell, transfer }, item.srsId);
  const evidenceSaved = Boolean(
    evidence &&
    evidenceComplete &&
    evidence.listened === listened &&
    evidence.retell.trim() === retell.trim() &&
    evidence.transfer.trim() === transfer.trim()
  );
  const evidenceDirty = Boolean(evidence && evidenceComplete && !evidenceSaved);
  const handleToggle = () => {
    if (!learned) return;
    if (!confirmRemove) {
      setConfirmRemove(true);
      return;
    }
    onToggle();
    setConfirmRemove(false);
  };
  const firstLine = item.lines[0];
  return (
    <TrackRow
      index={index}
      glyph={firstHangul(firstLine?.ko ?? item.title, "말")}
      kicker={item.level}
      title={item.title}
      detail={item.summary}
      completed={learned}
      expanded={expanded}
      onToggle={onExpand}
      onPlay={firstLine ? () => speakKorean(firstLine.ko, { onstart: () => setListened(true) }) : undefined}
      playLabel={firstLine ? `播放 ${firstLine.ko}` : undefined}
    >
      <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 font-mono text-xs font-black uppercase text-[var(--ocean)]">
          <Icon className="h-3.5 w-3.5" />
          {item.track === "pragmatics" ? "场景语用" : "语气细差"}
        </span>
        {learned ? (
          <Button type="button" variant={confirmRemove ? "ghost" : "secondary"} size="sm" onClick={handleToggle}>
            {confirmRemove ? "确认移出复习" : "已加入 SRS"}
          </Button>
        ) : (
          <p className="text-xs font-black leading-5 text-[var(--muted)]">先听、复述并做关系迁移，再用下方按钮加入 SRS。</p>
        )}
      </div>
      {confirmRemove ? (
        <p className="rounded-none border border-[var(--seal)] bg-[var(--seal-soft)] p-3 text-xs font-bold leading-5 text-[var(--cinnabar)]">
          再点一次才会移出 SRS；已经提交的护照证据会保留。
        </p>
      ) : null}
      {hasError ? <SrsError /> : null}
      <p className="text-sm leading-6 text-[var(--muted)]">{item.summary}</p>
      <div className="grid gap-2 rounded-none border border-[var(--line)] bg-[var(--card)] p-3 sm:grid-cols-4">
        {relationProfile.map((slot) => (
          <div key={slot.label} className="rounded-none bg-[color-mix(in_srgb,var(--navy)_12%,transparent)] px-3 py-2">
            <span className="font-mono text-[0.66rem] font-black uppercase text-[var(--muted)]">{slot.label}</span>
            <strong className="mt-1 block text-sm leading-5 text-[var(--ink)]">{slot.value}</strong>
          </div>
        ))}
      </div>
      <div className="grid gap-2 rounded-none border border-[var(--border)] bg-[var(--yellow-soft)] p-3 text-xs font-black leading-5 text-[var(--muted)] sm:grid-cols-3">
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
            <b key={part} className="hangul-display rounded-none bg-[color-mix(in_srgb,var(--navy)_12%,transparent)] px-3 py-1" lang="ko">
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
            className="focus-ring rounded-none border border-[var(--line)] bg-[var(--card)] p-3 text-left transition hover:-translate-y-0.5"
            onClick={() => speakKorean(line.ko, { onstart: () => setListened(true) })}
          >
            <span className="mb-2 inline-flex items-center gap-2 text-xs font-black text-[var(--ocean)]">
              <Volume2 className="h-4 w-4" />
              PLAY
            </span>
            <strong className="hangul-display block text-xl" lang="ko">{line.ko}</strong>
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
      <div className="rounded-none border-l-4 border-[var(--ocean)] bg-[color-mix(in_srgb,var(--navy)_12%,transparent)] p-3 text-sm leading-6 text-[var(--muted)]">
        {item.nativeMove}
      </div>
      <div className="grid gap-3 rounded-none border border-[var(--border)] bg-[color-mix(in_srgb,var(--navy)_12%,transparent)] p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="inline-flex items-center gap-2 text-sm font-black text-[var(--ink)]">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[var(--ocean)]"
              checked={listened}
              readOnly
              aria-describedby={`native-listening-note-${item.id}`}
            />
            已实际播放关键台词
          </label>
          <span className={`rounded-none border px-2 py-1 font-mono text-[0.68rem] font-black uppercase ${evidenceSaved ? "border-[var(--green)] bg-[var(--green-soft)] text-[var(--celadon)]" : "border-[var(--border)] bg-[var(--yellow-soft)] text-[var(--brass)]"}`}>
            {evidenceSaved ? "证据已入护照" : evidenceDirty ? "有未保存修改" : "证据未完成"}
          </span>
        </div>
        <p id={`native-listening-note-${item.id}`} className="text-xs font-bold leading-5 text-[var(--muted)]">
          点击上方任一句播放，语音真正开始后才会记录听辨步骤；手动勾选不计入证据。
        </p>
        <label className="grid gap-1 text-sm font-bold text-[var(--muted)]">
          韩语复述
          <textarea
            className="focus-ring min-h-20 resize-y rounded-none border border-[var(--line)] bg-[var(--card)] p-3 font-bold text-[var(--ink)] focus:border-[var(--ocean)]"
            value={retell}
            placeholder="用韩语复述这张卡的关系、场合或语气动作。"
            onChange={(event) => setRetell(event.target.value)}
          />
        </label>
        <label className="grid gap-1 text-sm font-bold text-[var(--muted)]">
          关系迁移
          <textarea
            className="focus-ring min-h-20 resize-y rounded-none border border-[var(--line)] bg-[var(--card)] p-3 font-bold text-[var(--ink)] focus:border-[var(--ocean)]"
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
        <Button type="button" variant={evidenceSaved ? "secondary" : "primary"} size="sm" className="w-fit" disabled={enrollBlocked || !evidenceComplete || evidenceSaved} onClick={() => onSaveEvidence({ listened, retell, transfer })}>
          {enrollBlocked ? "先完成入门" : evidenceSaved ? "已保存" : evidenceDirty ? "保存修改" : "保存证据并加入 SRS"}
        </Button>
      </div>
      </div>
    </TrackRow>
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
