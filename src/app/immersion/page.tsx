"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowDownToLine, Check, CheckCircle2, Eye, EyeOff, LockKeyhole, PenLine, RotateCcw, UnlockKeyhole, Volume2 } from "lucide-react";
import { VisualPanel } from "@/components/assets/visual-panel";
import { LearningCompass } from "@/components/learning/learning-compass";
import { Button } from "@/components/ui/button";
import { InlineAlert } from "@/components/ui/inline-alert";
import { ModuleHero, PageHeader, SectionHeading, Surface } from "@/components/ui/section";
import { getMissingMaterialPrerequisiteIds, immersionMaterialHref, immersionMaterials, outputRubric, type ImmersionMaterial } from "@/data/materials";
import { getLessonById, isLessonMastered } from "@/data/curriculum";
import { clearImmersionMaterialDraft, getImmersionMaterialDraft, saveImmersionMaterialDraft } from "@/lib/learning/drafts";
import { hasKoreanDictationEvidence, hasKoreanRetellEvidence, hasMaterialOutputEvidence } from "@/lib/learning/evidence";
import { useLearningWorkspace } from "@/lib/learning/workspace";
import { speakKorean, speakSequence } from "@/lib/speech";

const levelLabels: Record<ImmersionMaterial["level"], string> = {
  foundation: "基础情境场景",
  growth: "连续理解",
  native: "母语者层"
};

const kindLabels: Record<ImmersionMaterial["kind"], string> = {
  dialogue: "对话",
  news: "新闻",
  social: "社交",
  essay: "短文"
};

export default function ImmersionPage() {
  return (
    <Suspense fallback={<ImmersionFallback />}>
      <ImmersionContent />
    </Suspense>
  );
}

function ImmersionContent() {
  const { workspace, outputEntries, completeMaterial, saveOutputArchive, clearMaterialArchive } = useLearningWorkspace();
  const searchParams = useSearchParams();
  const requestedMaterial = searchParams.get("material");
  const requestedMaterialId = requestedMaterial && immersionMaterials.some((material) => material.id === requestedMaterial) ? requestedMaterial : "";
  const [selectedMaterialId, setSelectedMaterialId] = useState("");
  const activeId = selectedMaterialId || requestedMaterialId || (immersionMaterials[0]?.id ?? "");
  const [showZh, setShowZh] = useState(false);
  const [dictationEvidence, setDictationEvidence] = useState("");
  const [retellEvidence, setRetellEvidence] = useState("");
  const [draft, setDraft] = useState("");
  const [weakPoint, setWeakPoint] = useState("");
  const [targetRewrite, setTargetRewrite] = useState("");
  const [saveError, setSaveError] = useState("");
  const [materialError, setMaterialError] = useState("");
  const [draftSaveError, setDraftSaveError] = useState("");
  const [draftRestoredFor, setDraftRestoredFor] = useState("");
  const [activeDraftReady, setActiveDraftReady] = useState(false);
  const [clearArchiveConfirmId, setClearArchiveConfirmId] = useState("");
  const [clearArchiveStatus, setClearArchiveStatus] = useState<"idle" | "confirm" | "cleared" | "error">("idle");
  const [checkedRubric, setCheckedRubric] = useState<string[]>([]);
  const [checkedSelfCheckByMaterial, setCheckedSelfCheckByMaterial] = useState<Record<string, string[]>>({});
  const [selectedOutputByMaterial, setSelectedOutputByMaterial] = useState<Record<string, string>>({});
  const suppressDraftSaveRef = useRef(false);
  const completed = new Set(workspace.evidence.validMaterialIds);
  const masteredLessons = useMemo(() => {
    const completedLessons = new Set(workspace.progress.completedLessons);
    return new Set([...completedLessons].filter((lessonId) => (
      isLessonMastered(lessonId, completedLessons, workspace.progress.lessonScores)
    )));
  }, [workspace.progress.completedLessons, workspace.progress.lessonScores]);
  const active = useMemo(
    () => immersionMaterials.find((item) => item.id === activeId) ?? immersionMaterials[0],
    [activeId]
  );
  const activePrerequisites = active.requiredLessons
    .map((lessonId) => getLessonById(lessonId))
    .filter(Boolean);
  const missingPrerequisiteIds = getMissingMaterialPrerequisiteIds(active, masteredLessons);
  const missingPrerequisites = missingPrerequisiteIds
    .map((lessonId) => getLessonById(lessonId))
    .filter(Boolean);
  const prerequisitesReady = missingPrerequisiteIds.length === 0;
  const savedEvidence = workspace.progress.materialEvidence[active.id];
  const materialOutputs = outputEntries.filter((entry) => entry.materialId === active.id);
  const savedOutputEntry = materialOutputs.find((entry) => entry.id === savedEvidence?.outputEntryId) ?? null;
  const recentOutputs = materialOutputs.slice(0, 4);
  const activeOutputs = savedOutputEntry
    ? [savedOutputEntry, ...recentOutputs.filter((entry) => entry.id !== savedOutputEntry.id)].slice(0, 4)
    : recentOutputs;
  const selectedOutputId = completed.has(active.id)
    ? savedEvidence?.outputEntryId ?? ""
    : selectedOutputByMaterial[active.id] ?? savedEvidence?.outputEntryId ?? activeOutputs[0]?.id ?? "";
  const selectedOutputEntry = activeOutputs.find((entry) => entry.id === selectedOutputId) ?? null;
  const sourceLines = active.lines.map((line) => line.ko);
  const savedKoreanOutput = hasMaterialOutputEvidence(selectedOutputEntry, active);
  const currentOutputReady = hasMaterialOutputEvidence({ draft, weakPoint, targetRewrite }, active);
  const effectiveDictation = dictationEvidence.trim() || savedEvidence?.dictation || "";
  const effectiveRetell = retellEvidence.trim() || savedEvidence?.retell || "";
  const effectiveSelfCheck = checkedSelfCheckByMaterial[active.id] ?? savedEvidence?.selfCheck ?? [];
  const selfCheckComplete = active.selfCheck.every((item) => effectiveSelfCheck.includes(item));
  const completionGates = [
    {
      id: "prerequisites",
      done: prerequisitesReady,
      label: "真实先修达标",
      detail: missingPrerequisites.length
        ? `尚缺：${missingPrerequisites.map((lesson) => `第 ${lesson.order} 课 ${lesson.title}`).join("、")}`
        : "材料实际用到的课程均已达到核心路径标准。"
    },
    {
      id: "dictation",
      done: hasKoreanDictationEvidence(effectiveDictation, active.dictation),
      label: "韩语听写证据",
      detail: "至少写下一句听到的韩语，再对照原文修正。"
    },
    {
      id: "retell",
      done: hasKoreanRetellEvidence(effectiveRetell, sourceLines),
      label: "韩语复述证据",
      detail: "用韩语复述人物、动作、原因或结果。"
    },
    {
      id: "self-check",
      done: selfCheckComplete,
      label: "完成自检清单",
      detail: "逐项确认这段材料的听辨、表达和语用目标。"
    },
    {
      id: "output",
      done: savedKoreanOutput,
      label: "输出改写已保存",
      detail: "先保存一条包含韩语的目标改写；材料完成时再正式进入 SRS。"
    }
  ];
  const missingGateLabels = completionGates.filter((gate) => !gate.done).map((gate) => gate.label);
  const hasCompletionEvidence = completionGates.every((gate) => gate.done);
  const activeGateIndex = Math.max(0, completionGates.findIndex((gate) => !gate.done));
  const completedGateCount = completionGates.filter((gate) => gate.done).length;
  const nextGateLabel = completionGates.find((gate) => !gate.done)?.label ?? "材料闭环完成";

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      suppressDraftSaveRef.current = false;
      setActiveDraftReady(false);
      const savedDraft = getImmersionMaterialDraft(active.id);
      setDictationEvidence(savedDraft?.dictationEvidence ?? "");
      setRetellEvidence(savedDraft?.retellEvidence ?? "");
      setDraft(savedDraft?.draft ?? "");
      setWeakPoint(savedDraft?.weakPoint ?? "");
      setTargetRewrite(savedDraft?.targetRewrite ?? "");
      setCheckedRubric(savedDraft?.checkedRubric ?? []);
      setCheckedSelfCheckByMaterial((items) => {
        const next = { ...items };
        if (savedDraft?.selfCheck.length) next[active.id] = savedDraft.selfCheck;
        else delete next[active.id];
        return next;
      });
      setSelectedOutputByMaterial((items) => {
        const next = { ...items };
        if (savedDraft?.selectedOutputId) next[active.id] = savedDraft.selectedOutputId;
        else delete next[active.id];
        return next;
      });
      setDraftSaveError("");
      setDraftRestoredFor(savedDraft ? active.id : "");
      setActiveDraftReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [active.id]);

  useEffect(() => {
    if (!activeDraftReady || suppressDraftSaveRef.current) return;
    const saved = saveImmersionMaterialDraft(active.id, {
      dictationEvidence,
      retellEvidence,
      draft,
      weakPoint,
      targetRewrite,
      checkedRubric,
      selfCheck: checkedSelfCheckByMaterial[active.id] ?? [],
      selectedOutputId: selectedOutputByMaterial[active.id] ?? ""
    });
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setDraftSaveError(saved ? "" : "材料草稿断点没有写入本地存储。当前输入还在页面里，但刷新或离开后可能无法恢复。");
    });
    return () => {
      cancelled = true;
    };
  }, [active.id, activeDraftReady, checkedRubric, checkedSelfCheckByMaterial, dictationEvidence, draft, retellEvidence, selectedOutputByMaterial, targetRewrite, weakPoint]);

  const toggleRubric = (id: string) => {
    setCheckedRubric((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]);
  };

  const toggleSelfCheck = (item: string) => {
    setCheckedSelfCheckByMaterial((drafts) => {
      const items = drafts[active.id] ?? savedEvidence?.selfCheck ?? [];
      return {
        ...drafts,
        [active.id]: items.includes(item) ? items.filter((value) => value !== item) : [...items, item]
      };
    });
  };

  const saveOutput = () => {
    const entry = saveOutputArchive({
      materialId: active.id,
      materialTitle: active.title,
      mission: active.outputMission,
      draft: draft.trim(),
      weakPoint: weakPoint.trim(),
      targetRewrite: targetRewrite.trim(),
      rubric: checkedRubric
    });
    if (!entry) {
      setSaveError("输出档案没有保存：请用自己的韩语写足够完整的草稿，避免复制原文或机械重复；弱点和目标改写也要具体且彼此不同。草稿已保留。");
      return;
    }
    setSelectedOutputByMaterial((items) => ({ ...items, [active.id]: entry.id }));
    setSaveError("");
    setDraft("");
    setWeakPoint("");
    setTargetRewrite("");
    setCheckedRubric([]);
  };

  const resetMaterialWork = () => {
    setShowZh(false);
    setDictationEvidence("");
    setRetellEvidence("");
    setDraft("");
    setWeakPoint("");
    setTargetRewrite("");
    setSaveError("");
    setMaterialError("");
    setDraftSaveError("");
    setDraftRestoredFor("");
    setClearArchiveConfirmId("");
    setClearArchiveStatus("idle");
    setCheckedRubric([]);
  };

  const selectMaterial = (materialId: string) => {
    setActiveDraftReady(false);
    setSelectedMaterialId(materialId);
    window.history.replaceState(null, "", immersionMaterialHref(materialId));
    resetMaterialWork();
  };

  const clearActiveArchive = () => {
    const needsConfirmation = completed.has(active.id);
    if (needsConfirmation && clearArchiveConfirmId !== active.id) {
      setClearArchiveConfirmId(active.id);
      setClearArchiveStatus("confirm");
      setMaterialError("");
      return;
    }
    if (!clearMaterialArchive(active.id)) {
      setClearArchiveStatus("error");
      setMaterialError("本段完成记录与输出档案没有清除成功，请释放浏览器存储空间后再试。");
      return;
    }
    const draftCleared = clearImmersionMaterialDraft(active.id);
    setSelectedOutputByMaterial((items) => {
      const next = { ...items };
      delete next[active.id];
      return next;
    });
    setMaterialError(draftCleared ? "" : "本段完成记录已清除，但草稿断点没有清理成功；请稍后重试或手动清空当前输入。");
    setClearArchiveStatus("cleared");
    setClearArchiveConfirmId("");
    setCheckedSelfCheckByMaterial((drafts) => {
      const next = { ...drafts };
      delete next[active.id];
      return next;
    });
  };

  const finishMaterial = () => {
    if (!prerequisitesReady) {
      setMaterialError(`材料完成仍锁定。请先完成：${missingPrerequisites.map((lesson) => `第 ${lesson.order} 课 ${lesson.title}`).join("、")}。当前草稿会继续保留。`);
      return;
    }
    const completedNow = completeMaterial(active.id, { dictation: effectiveDictation, retell: effectiveRetell, selfCheck: effectiveSelfCheck, outputEntryId: selectedOutputEntry?.id });
    if (!completedNow) {
      setMaterialError("还差一点：真实先修、听写、复述、目标改写和自检清单都需要完成；完成材料时，输出改写会和材料卡一起写入复习队列。");
      return;
    }
    suppressDraftSaveRef.current = true;
    setActiveDraftReady(false);
    const draftCleared = clearImmersionMaterialDraft(active.id);
    setMaterialError(draftCleared ? "" : "材料已完成，但本地草稿断点没有清理成功；正式证据已保存，可以稍后再清理草稿。");
    setDictationEvidence("");
    setRetellEvidence("");
    setDraft("");
    setWeakPoint("");
    setTargetRewrite("");
    setCheckedRubric([]);
    setDraftRestoredFor("");
  };

  const focusMaterialPractice = () => {
    const target = document.getElementById("material-listen-practice");
    if (!target) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    target.focus({ preventScroll: true });
  };

  return (
    <div className="grid gap-6">
      <PageHeader
        kicker="Immersion Lab"
        title="情境材料不是奖励，是推进器。"
        copy="当前站内材料是自编情境脚本，由设备韩语语音朗读，并非原生录音。每段按盲听、听写、复述和输出自评推进；完成后进入进度与 SRS。"
        compact
      />

      <ModuleHero
        kicker={`${workspace.stats.completedMaterials}/${workspace.stats.totalMaterials} materials`}
        title="先抓住一段情境，再把证据写实。"
        copy="沉浸页现在围绕当前材料推进：先听懂关键句，再补听写、复述、自检和目标改写。材料没有达成证据门槛时，只保留草稿，不会冒充学习完成。"
        asset="immersion"
        imageSize="20rem"
        imageClassName="min-h-60 rounded-none border-0 lg:min-h-full"
        overlay="bottom"
      >
        <div className="grid gap-3 md:grid-cols-3">
          <HeroMetric label="当前材料" value={active.title} detail={`${levelLabels[active.level]} · ${kindLabels[active.kind]} · ${active.minutes} min`} />
          <HeroMetric label="证据门槛" value={`${completedGateCount}/${completionGates.length}`} detail={`下一步：${nextGateLabel}`} />
          <HeroMetric label="先修状态" value={prerequisitesReady ? "已解锁" : `锁定 · 缺 ${missingPrerequisites.length} 课`} detail={prerequisitesReady ? "可以完成材料闭环" : "可预览并保存草稿，补齐后才能完成"} />
        </div>
        <Button
          className="mt-4"
          type="button"
          variant="secondary"
          onClick={focusMaterialPractice}
        >
          <ArrowDownToLine className="h-4 w-4" />
          进入听写练习
        </Button>
      </ModuleHero>

      <LearningCompass workspace={workspace} active="immersion" condensed />
      {draftRestoredFor === active.id ? (
        <InlineAlert tone="success">
          已恢复这段材料的未完成草稿。完成材料或保存输出后，相关草稿会自动清理。
        </InlineAlert>
      ) : null}
      {draftSaveError ? <InlineAlert>{draftSaveError}</InlineAlert> : null}

      <section id="material-workbench" className="scroll-mt-40 grid gap-5 lg:scroll-mt-28 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <Surface className="hidden h-fit xl:sticky xl:top-24 xl:block">
          <SectionHeading kicker="Queue" title="材料队列" />
          <div className="grid gap-2">
            {immersionMaterials.map((material) => {
              const missingIds = getMissingMaterialPrerequisiteIds(material, masteredLessons);
              const missingLessons = missingIds.map((lessonId) => getLessonById(lessonId)).filter(Boolean);
              const unlocked = missingIds.length === 0;
              return (
                <button
                  key={material.id}
                  type="button"
                  aria-pressed={active.id === material.id}
                  className={`focus-ring rounded-[8px] border p-3 text-left transition hover:-translate-y-0.5 ${
                    active.id === material.id
                      ? "border-[var(--ocean)] bg-[rgba(23,63,115,0.1)]"
                      : "border-[var(--line)] bg-[rgba(255,250,240,0.62)]"
                  }`}
                  onClick={() => {
                    selectMaterial(material.id);
                  }}
                >
                  <span className="font-mono text-xs font-black uppercase text-[var(--muted)]">
                    {levelLabels[material.level]} · {kindLabels[material.kind]}
                  </span>
                  <strong className="mt-1 block font-serif text-xl leading-tight">{material.title}</strong>
                  <span className={`mt-2 inline-flex items-center gap-1.5 text-xs font-black ${unlocked ? "text-[var(--celadon)]" : "text-[var(--brass)]"}`}>
                    {unlocked ? <UnlockKeyhole className="h-3.5 w-3.5" /> : <LockKeyhole className="h-3.5 w-3.5" />}
                    {unlocked ? "真实先修已完成" : `尚缺：${missingLessons.map((lesson) => `第 ${lesson.order} 课`).join(" / ")}`}
                  </span>
                  <span className="mt-2 flex items-center gap-2 text-xs font-bold text-[var(--ocean)]">
                    {completed.has(material.id) ? <Check className="h-3.5 w-3.5" /> : null}
                    {material.minutes} min
                  </span>
                </button>
              );
            })}
          </div>
        </Surface>

        <div className="grid gap-5">
          <Surface className="min-w-0 xl:hidden">
            <SectionHeading kicker="Material" title="切换材料" />
            <div className="-mx-4 grid max-w-[calc(100%+2rem)] auto-cols-[13rem] grid-flow-col gap-2 overflow-x-auto px-4 pb-1">
              {immersionMaterials.map((material) => {
                const missingIds = getMissingMaterialPrerequisiteIds(material, masteredLessons);
                const unlocked = missingIds.length === 0;
                return (
                  <button
                    key={material.id}
                    type="button"
                    aria-pressed={active.id === material.id}
                    className={`focus-ring min-w-0 rounded-[8px] border p-3 text-left transition ${
                      active.id === material.id
                        ? "border-[var(--ocean)] bg-[rgba(23,63,115,0.1)]"
                        : "border-[var(--line)] bg-[rgba(255,250,240,0.62)]"
                    }`}
                    onClick={() => {
                      selectMaterial(material.id);
                    }}
                  >
                    <span className="font-mono text-[0.68rem] font-black uppercase text-[var(--muted)]">
                      {levelLabels[material.level]} · {material.minutes} min
                    </span>
                    <strong className="mt-1 block font-serif text-lg leading-tight">{material.title}</strong>
                    <span className={`mt-2 flex items-center gap-1 text-xs font-bold ${unlocked ? "text-[var(--celadon)]" : "text-[var(--brass)]"}`}>
                      {unlocked ? <UnlockKeyhole className="h-3.5 w-3.5" /> : <LockKeyhole className="h-3.5 w-3.5" />}
                      {unlocked ? "已解锁" : `缺 ${missingIds.length} 课`}
                      {completed.has(material.id) ? <Check className="ml-auto h-3.5 w-3.5" /> : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </Surface>

          <section className="grid overflow-hidden rounded-[8px] border border-[var(--line)] lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="bg-[rgba(255,250,240,0.82)] p-5">
              <p className="eyebrow">{active.sourceLabel}</p>
              <h2 className="mt-2 font-serif text-4xl font-black leading-tight">{active.title}</h2>
              <p className="mt-3 leading-7 text-[var(--muted)]">{active.summary}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {active.focus.map((item) => (
                  <span key={item} className="rounded-[8px] bg-[rgba(23,63,115,0.08)] px-3 py-1 text-sm font-bold text-[var(--ocean)]">
                    {item}
                  </span>
                ))}
              </div>
              <div className="mt-4 grid gap-2 rounded-[8px] border border-[var(--line)] bg-[rgba(255,250,240,0.58)] p-3">
                <p className="font-mono text-xs font-black uppercase text-[var(--ocean)]">完成门槛</p>
                <div className="grid gap-2 sm:grid-cols-4">
                  {completionGates.map((gate, index) => (
                    <div
                      key={gate.id}
                      className={`rounded-[8px] border px-3 py-2 text-xs font-black leading-5 ${
                        gate.done
                          ? "border-[rgba(79,140,118,0.42)] bg-[rgba(79,140,118,0.12)] text-[var(--celadon)]"
                          : index === activeGateIndex
                            ? "border-[rgba(23,63,115,0.38)] bg-[rgba(23,63,115,0.1)] text-[var(--ocean)]"
                            : "border-[var(--line)] bg-[rgba(255,250,240,0.64)] text-[var(--muted)]"
                      }`}
                    >
                      <span className="block font-mono text-[0.66rem] uppercase opacity-70">
                        Step {index + 1}
                      </span>
                      {gate.label}
                    </div>
                  ))}
                </div>
              </div>
              <div className={`mt-4 rounded-[8px] border p-3 ${
                missingPrerequisites.length
                  ? "border-[rgba(183,135,63,0.42)] bg-[rgba(183,135,63,0.09)]"
                  : "border-[rgba(79,140,118,0.34)] bg-[rgba(79,140,118,0.1)]"
              }`}>
                <p className="font-mono text-xs font-black uppercase text-[var(--ocean)]">真实先修条件</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {activePrerequisites.map((lesson) => {
                    const ready = isLessonMastered(lesson.id, masteredLessons, workspace.progress.lessonScores);
                    return (
                      <span
                        key={lesson.id}
                        className={`rounded-[8px] border px-2.5 py-1 text-xs font-black ${
                          ready
                            ? "border-[rgba(79,140,118,0.38)] bg-[rgba(79,140,118,0.12)] text-[var(--celadon)]"
                            : "border-[rgba(183,135,63,0.36)] bg-[rgba(255,250,240,0.58)] text-[var(--brass)]"
                        }`}
                      >
                        第 {lesson.order} 课 · {lesson.title}
                      </span>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs font-bold leading-5 text-[var(--muted)]">
                  {missingPrerequisites.length
                    ? `尚缺：${missingPrerequisites.map((lesson) => `第 ${lesson.order} 课 ${lesson.title}`).join("、")}。可以预览并保存输出草稿；补齐前不能写入完成或能力护照。`
                    : "材料实际使用的前置知识均已达标，可以把注意力放在听写、复述和自然改写上。"}
                </p>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button type="button" onClick={() => speakSequence(active.lines.map((line) => line.ko), 1200)}>
                  <Volume2 className="h-4 w-4" />
                  连续播放
                </Button>
                <Button type="button" variant="secondary" onClick={() => setShowZh((value) => !value)}>
                  {showZh ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {showZh ? "隐藏译文" : "显示译文"}
                </Button>
              </div>
            </div>
            <div className="relative min-h-80">
              <VisualPanel asset="immersion" priority sizes="(max-width: 1024px) 100vw, 22rem" overlay="bottom" className="absolute inset-0 rounded-none border-0" />
              <div className="absolute bottom-4 left-4 right-4 rounded-[8px] border border-[rgba(255,250,240,0.62)] bg-[rgba(24,28,27,0.74)] p-4 text-[var(--surface-solid)] shadow-editorial backdrop-blur">
                <p className="font-mono text-xs font-black uppercase opacity-70">材料进度</p>
                <strong className="mt-2 block font-serif text-4xl">{workspace.stats.completedMaterials}/{workspace.stats.totalMaterials}</strong>
                <p className="mt-2 text-sm leading-6 opacity-80">完成后进入复习；输出改写会回到到期队列。</p>
              </div>
            </div>
          </section>

          <div id="material-listen-practice" className="scroll-mt-40 lg:scroll-mt-28" tabIndex={-1}>
          <Surface>
            <SectionHeading kicker="Listen" title="逐句听读" />
            <div className="grid gap-3">
              {active.lines.map((line, index) => (
                <article key={line.ko} className="grid gap-3 rounded-[8px] border border-[var(--line)] bg-[rgba(255,250,240,0.62)] p-4 md:grid-cols-[3rem_minmax(0,1fr)_auto]">
                  <span className="font-mono text-2xl font-black text-[var(--ocean)]">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <p className="hangul-display text-2xl font-black leading-relaxed" lang="ko">{line.ko}</p>
                    {showZh ? <p className="mt-1 leading-6 text-[var(--muted)]">{line.zh}</p> : null}
                    <small className="mt-2 block leading-5 text-[var(--muted)]">{line.note}</small>
                  </div>
                  <Button type="button" variant="secondary" size="icon" aria-label={`播放第 ${index + 1} 句`} onClick={() => speakKorean(line.ko)}>
                    <Volume2 className="h-4 w-4" />
                  </Button>
                </article>
              ))}
            </div>
          </Surface>
          </div>

          <section className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <Surface>
              <SectionHeading kicker="Step 1" title="遮译文听写" />
              <div className="grid gap-2">
                {active.dictation.map((item, index) => (
                  <div key={item} className="rounded-[8px] border border-[var(--line)] bg-[rgba(255,250,240,0.62)] p-3">
                    <Button type="button" variant="ghost" size="sm" className="w-full justify-start" onClick={() => speakKorean(item)}>
                      <Volume2 className="h-4 w-4" />
                      播放听写句 {String(index + 1).padStart(2, "0")}
                    </Button>
                    <details className="mt-2 border-t border-[var(--line)] pt-2">
                      <summary className="cursor-pointer text-xs font-black text-[var(--muted)]">写完后核对原句</summary>
                      <strong className="hangul-display mt-2 block text-xl" lang="ko">{item}</strong>
                    </details>
                  </div>
                ))}
              </div>
              <label className="mt-4 grid gap-2 text-sm font-extrabold">
                听写证据
                <textarea
                  className="focus-ring min-h-24 rounded-[8px] border border-[var(--line-strong)] bg-[var(--surface-solid)] p-3 leading-7"
                  value={dictationEvidence}
                  lang="ko"
                  spellCheck={false}
                  onChange={(event) => setDictationEvidence(event.target.value)}
                  placeholder="先盲听并写下一句，再展开原句核对和修正。"
                />
              </label>
            </Surface>

            <Surface>
              <SectionHeading kicker="Step 2" title="复述检查" />
              <div className="grid gap-2">
                {active.retellPrompts.map((item) => (
                  <div key={item} className="rounded-[8px] border-l-4 border-[var(--brass)] bg-[rgba(183,135,63,0.09)] p-3 text-sm font-bold leading-6">
                    {item}
                  </div>
                ))}
              </div>
              <label className="mt-4 grid gap-2 text-sm font-extrabold">
                韩语复述证据
                <textarea
                  className="focus-ring min-h-28 rounded-[8px] border border-[var(--line-strong)] bg-[var(--surface-solid)] p-3 leading-7"
                  value={retellEvidence}
                  onChange={(event) => setRetellEvidence(event.target.value)}
                  placeholder="用韩语写 1-2 句复述：谁做了什么、为什么、结果是什么。"
                />
              </label>
              {!hasCompletionEvidence && !completed.has(active.id) ? (
                <p className="mt-3 text-xs font-bold leading-5 text-[var(--muted)]">
                  还差：{missingGateLabels.join("、")}。
                </p>
              ) : null}
              {selectedOutputEntry ? (
                <p className="mt-3 rounded-[8px] border border-[rgba(79,140,118,0.36)] bg-[rgba(79,140,118,0.1)] p-3 text-xs font-bold leading-5 text-[var(--muted)]">
                  绑定输出：{selectedOutputEntry.targetRewrite}
                </p>
              ) : null}
              <Button
                className="mt-4"
                type="button"
                variant="secondary"
                onClick={finishMaterial}
                disabled={completed.has(active.id) || !hasCompletionEvidence}
              >
                {completed.has(active.id) ? "已完成并加入 SRS" : "完成材料并加入 SRS"}
              </Button>
              {materialError ? (
                <p className="mt-3 rounded-[8px] border border-[rgba(185,78,60,0.45)] bg-[rgba(185,78,60,0.08)] p-3 text-sm font-bold leading-6 text-[var(--cinnabar)]">
                  {materialError}
                </p>
              ) : null}
            </Surface>
          </section>

          <section className="grid gap-5 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
            <Surface>
              <SectionHeading kicker="Step 3" title="自检清单" />
              <div className="grid gap-2">
                {active.selfCheck.map((item, index) => {
                  const checked = effectiveSelfCheck.includes(item);
                  return (
                    <label
                      key={item}
                      className={`focus-ring grid min-h-14 cursor-pointer grid-cols-[1.75rem_minmax(0,1fr)] items-center gap-3 rounded-[8px] border p-3 transition focus-within:border-[var(--ocean)] focus-within:ring-2 focus-within:ring-[rgba(23,63,115,0.22)] ${
                        checked
                          ? "border-[rgba(79,140,118,0.55)] bg-[rgba(79,140,118,0.12)]"
                          : "border-[var(--line)] bg-[rgba(255,250,240,0.62)]"
                      }`}
                    >
                      <input
                        className="sr-only"
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSelfCheck(item)}
                      />
                      <span className={`grid h-7 w-7 place-items-center rounded-[8px] border text-xs font-black ${
                        checked
                          ? "border-[var(--celadon)] bg-[var(--celadon)] text-[var(--surface-solid)]"
                          : "border-[var(--line-strong)] text-[var(--muted)]"
                      }`}>
                        {checked ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                      </span>
                      <span className="text-sm font-extrabold leading-6">{item}</span>
                    </label>
                  );
                })}
              </div>
            </Surface>

            <Surface>
              <SectionHeading
                kicker="Gate"
                title="完成条件"
                copy="五个证据都成立后，材料和绑定输出才会进入能力护照和 SRS。"
              />
              <div className="grid gap-2">
                {completionGates.map((gate) => (
                  <GateRow key={gate.id} done={gate.done} label={gate.label} detail={gate.detail} />
                ))}
              </div>
            </Surface>
          </section>

          <Surface>
            <SectionHeading kicker="Step 4" title="输出任务与自评" copy={active.outputMission} />
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <label className="grid gap-2 text-sm font-extrabold">
                输出草稿
                <textarea
                  className="focus-ring min-h-44 rounded-[8px] border border-[var(--line-strong)] bg-[var(--surface-solid)] p-3 leading-7"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="在这里写韩语输出或复述稿..."
                />
              </label>
              <div className="grid gap-2">
                {outputRubric.map((item) => (
                  <label
                    key={item.id}
                    className={`focus-ring rounded-[8px] border p-3 text-left transition focus-within:border-[var(--ocean)] focus-within:ring-2 focus-within:ring-[rgba(23,63,115,0.22)] ${
                      checkedRubric.includes(item.id)
                        ? "border-[rgba(79,140,118,0.55)] bg-[rgba(79,140,118,0.12)]"
                        : "border-[var(--line)] bg-[rgba(255,250,240,0.62)]"
                    }`}
                  >
                    <input
                      className="sr-only"
                      type="checkbox"
                      checked={checkedRubric.includes(item.id)}
                      onChange={() => toggleRubric(item.id)}
                    />
                    <strong>{item.title}</strong>
                    <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{item.detail}</p>
                  </label>
                ))}
              </div>
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
              <div className="grid gap-3">
                <label className="grid gap-2 text-sm font-extrabold">
                  需要修正的弱点
                  <input
                    className="focus-ring min-h-11 rounded-[8px] border border-[var(--line-strong)] bg-[var(--surface-solid)] px-3"
                    value={weakPoint}
                    onChange={(event) => setWeakPoint(event.target.value)}
                    placeholder="例如：拒绝太直接 / 语序像中文 / 缺少缓冲"
                  />
                </label>
                <label className="grid gap-2 text-sm font-extrabold">
                  送回复习的目标改写
                  <input
                    className="focus-ring min-h-11 rounded-[8px] border border-[var(--line-strong)] bg-[var(--surface-solid)] px-3"
                    value={targetRewrite}
                    onChange={(event) => setTargetRewrite(event.target.value)}
                    placeholder="例如：좋긴 한데 조금 비싼 것 같아요."
                  />
                </label>
              </div>
              <div className="flex items-end gap-2">
                <Button
                  type="button"
                  disabled={!currentOutputReady}
                  onClick={saveOutput}
                >
                  <PenLine className="h-4 w-4" />
                  保存输出
                </Button>
                <Button type="button" variant="ghost" size="icon" aria-label="清空输出草稿" onClick={() => {
                  setDraft("");
                  setWeakPoint("");
                  setTargetRewrite("");
                }}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {saveError ? (
              <p className="mt-3 rounded-[8px] border border-[rgba(185,78,60,0.45)] bg-[rgba(185,78,60,0.08)] p-3 text-sm font-bold leading-6 text-[var(--cinnabar)]">
                {saveError}
              </p>
            ) : null}
          </Surface>

          <Surface>
            <SectionHeading
              kicker="Archive"
              title="输出档案"
              copy="这里先保存完整草稿、弱点、目标改写和自评；材料完成后，绑定的目标改写才会进入 SRS。"
              action={
                activeOutputs.length ? (
                  <Button
                    type="button"
                    variant={clearArchiveConfirmId === active.id ? "danger" : "ghost"}
                    size="sm"
                    onClick={clearActiveArchive}
                  >
                    {clearArchiveConfirmId === active.id ? "确认清除完成记录" : completed.has(active.id) ? "清除完成记录与档案" : "清空本段档案"}
                  </Button>
                ) : null
              }
            />
            {clearArchiveStatus === "confirm" && clearArchiveConfirmId === active.id ? (
              <InlineAlert className="mb-3">
                这段材料已经写入完成证据。再次点击会同时移除本段完成记录、听写/复述证据、绑定输出和相关复习卡。
              </InlineAlert>
            ) : null}
            {clearArchiveStatus === "cleared" ? (
              <InlineAlert tone="success" className="mb-3">
                本段完成记录与输出档案已清除，可以重新完成这段材料。
              </InlineAlert>
            ) : null}
            {clearArchiveStatus === "error" ? (
              <InlineAlert className="mb-3">
                本段记录没有清除成功，页面已保留当前档案状态。
              </InlineAlert>
            ) : null}
            {activeOutputs.length ? (
              <div className="grid gap-3">
                {activeOutputs.map((entry) => (
                  <article
                    key={entry.id}
                    className={`rounded-[8px] border p-4 ${
                      selectedOutputEntry?.id === entry.id
                        ? "border-[rgba(79,140,118,0.55)] bg-[rgba(79,140,118,0.1)]"
                        : "border-[var(--line)] bg-[rgba(255,250,240,0.62)]"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong className="font-serif text-xl">{entry.materialTitle}</strong>
                      <div className="flex flex-wrap items-center gap-2">
                        {selectedOutputEntry?.id === entry.id ? (
                          <span className="inline-flex items-center gap-1 rounded-[8px] bg-[rgba(79,140,118,0.12)] px-2 py-1 font-mono text-xs font-black uppercase text-[var(--celadon)]">
                            <Check className="h-3.5 w-3.5" />
                            绑定中
                          </span>
                        ) : completed.has(active.id) ? (
                          <span className="rounded-[8px] border border-[var(--line)] bg-[rgba(255,250,240,0.62)] px-2 py-1 font-mono text-xs font-black uppercase text-[var(--muted)]">
                            已完成后锁定
                          </span>
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedOutputByMaterial((items) => ({ ...items, [active.id]: entry.id }))}
                          >
                            设为绑定输出
                          </Button>
                        )}
                        <span className="font-mono text-xs font-black uppercase text-[var(--muted)]">
                          {new Date(entry.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-7">{entry.draft}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {entry.weakPoint ? (
                        <span className="rounded-[8px] bg-[rgba(185,78,60,0.1)] px-3 py-1 text-xs font-black text-[var(--cinnabar)]">
                          弱点：{entry.weakPoint}
                        </span>
                      ) : null}
                      {entry.targetRewrite ? (
                        <span className="rounded-[8px] bg-[rgba(79,140,118,0.12)] px-3 py-1 text-xs font-black text-[var(--celadon)]">
                          目标：{entry.targetRewrite}
                        </span>
                      ) : null}
                      {entry.rubric.map((item) => (
                        <span key={item} className="rounded-[8px] bg-[rgba(23,63,115,0.08)] px-3 py-1 text-xs font-black text-[var(--ocean)]">
                          {outputRubric.find((rubric) => rubric.id === item)?.title ?? item}
                        </span>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-[8px] border border-[var(--line)] bg-[rgba(255,250,240,0.62)] p-4">
                <h3 className="font-serif text-2xl font-black">还没有保存这段材料的输出</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">完成一段复述或观点短文后保存，下一次回来就能看到自己的表达轨迹。</p>
              </div>
            )}
          </Surface>
        </div>
      </section>
    </div>
  );
}

function HeroMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-[8px] border border-[var(--line)] bg-[rgba(255,250,240,0.62)] p-3">
      <span className="font-mono text-xs font-black uppercase text-[var(--muted)]">{label}</span>
      <strong className="mt-1 block leading-tight text-[var(--ink)]">{value}</strong>
      <span className="mt-2 block text-xs font-bold leading-5 text-[var(--muted)]">{detail}</span>
    </div>
  );
}

function ImmersionFallback() {
  return (
    <div className="grid gap-6">
      <PageHeader
        kicker="Immersion Lab"
        title="真实材料不是奖励，是推进器。"
        copy="正在整理材料队列、学习证据和输出档案。"
      />
      <Surface>
        <div className="grid min-h-48 place-items-center rounded-[8px] border border-[var(--line)] bg-[rgba(255,250,240,0.62)] p-6 text-center">
          <div>
            <p className="eyebrow">Loading</p>
            <p className="mt-2 font-serif text-3xl font-black">正在打开对应材料</p>
          </div>
        </div>
      </Surface>
    </div>
  );
}

function GateRow({ done, label, detail }: { done: boolean; label: string; detail: string }) {
  return (
    <div className={`flex min-h-14 items-start gap-3 rounded-[8px] border px-3 py-3 text-sm font-extrabold ${
      done
        ? "border-[rgba(79,140,118,0.45)] bg-[rgba(79,140,118,0.12)] text-[var(--ink)]"
        : "border-[var(--line)] bg-[rgba(255,250,240,0.62)] text-[var(--muted)]"
    }`}>
      <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${done ? "text-[var(--celadon)]" : "text-[var(--muted)]"}`} />
      <span>
        <strong className="block">{label}</strong>
        <span className="mt-1 block text-xs font-bold leading-5 opacity-80">{detail}</span>
      </span>
    </div>
  );
}
