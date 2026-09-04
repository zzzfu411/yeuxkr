"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowDownToLine, Check, CheckCircle2, Eye, EyeOff, PenLine, RotateCcw, Volume2 } from "lucide-react";
import { VisualPanel } from "@/components/assets/visual-panel";
import { LearningCompass } from "@/components/learning/learning-compass";
import { LibraryGateNotice } from "@/components/learning/library-gate-notice";
import { Button } from "@/components/ui/button";
import { InlineAlert } from "@/components/ui/inline-alert";
import { ModuleHero, PageHeader, SectionHeading, Surface } from "@/components/ui/section";
import { TrackRow } from "@/components/ui/track-row";
import { getMissingMaterialPrerequisiteIds, immersionMaterialHref, immersionMaterials, outputRubric, type ImmersionMaterial } from "@/data/materials";
import { firstActionableLesson, getLessonById, isLessonMastered } from "@/data/curriculum";
import { clearImmersionMaterialDraft, getImmersionMaterialDraft, saveImmersionMaterialDraft } from "@/lib/learning/drafts";
import { hasKoreanDictationEvidence, hasKoreanRetellEvidence, hasMaterialOutputEvidence } from "@/lib/learning/evidence";
import { notifyNowPlayingLocationChange } from "@/lib/learning/player";
import { useLearningWorkspace } from "@/lib/learning/workspace";
import { speakKorean, speakSequence } from "@/lib/speech";

const levelLabels: Record<ImmersionMaterial["level"], string> = {
  foundation: "基础情境",
  growth: "连续理解",
  native: "进阶表达"
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
  const hydratedMaterialRef = useRef("");
  const completed = new Set(workspace.evidence.validMaterialIds);
  const masteredLessons = useMemo(() => {
    const completedLessons = new Set(workspace.progress.completedLessons);
    return new Set([...completedLessons].filter((lessonId) => (
      isLessonMastered(lessonId, completedLessons, workspace.progress.lessonScores)
    )));
  }, [workspace.progress.completedLessons, workspace.progress.lessonScores]);
  const defaultMaterialId = useMemo(() => {
    const doneIds = new Set(workspace.evidence.validMaterialIds);
    const readyOpen = immersionMaterials.find((material) => (
      getMissingMaterialPrerequisiteIds(material, masteredLessons).length === 0
      && !doneIds.has(material.id)
    ));
    if (readyOpen) return readyOpen.id;
    const unlocked = immersionMaterials.find((material) => getMissingMaterialPrerequisiteIds(material, masteredLessons).length === 0);
    return unlocked?.id ?? immersionMaterials[0]?.id ?? "";
  }, [workspace.evidence.validMaterialIds, masteredLessons]);
  const activeId = selectedMaterialId || requestedMaterialId || defaultMaterialId;
  const queuedMaterials = useMemo(() => {
    const doneIds = new Set(workspace.evidence.validMaterialIds);
    const rank = (material: ImmersionMaterial) => {
      const done = doneIds.has(material.id);
      const unlocked = getMissingMaterialPrerequisiteIds(material, masteredLessons).length === 0;
      if (unlocked && !done) return 0;
      if (!unlocked) return 1;
      return 2;
    };
    return [...immersionMaterials].sort((a, b) => rank(a) - rank(b) || a.title.localeCompare(b.title, "zh"));
  }, [workspace.evidence.validMaterialIds, masteredLessons]);
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
    .filter(Boolean)
    .sort((a, b) => a.order - b.order);
  const completedLessonIds = new Set(workspace.progress.completedLessons);
  const lockedCtaLesson = firstActionableLesson(
    missingPrerequisiteIds,
    completedLessonIds,
    workspace.progress.lessonScores,
    workspace.nextLesson?.id
  );
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
      label: "前置课程已完成",
      detail: missingPrerequisites.length
        ? `尚缺：${missingPrerequisites.map((lesson) => `第 ${lesson.order} 课 ${lesson.title}`).join("、")}`
        : "这段听读需要的课程都已完成。"
    },
    {
      id: "dictation",
      done: hasKoreanDictationEvidence(effectiveDictation, active.dictation),
      label: "听写已完成",
      detail: "至少写下一句听到的韩语，再对照原文修正。"
    },
    {
      id: "retell",
      done: hasKoreanRetellEvidence(effectiveRetell, sourceLines),
      label: "复述已完成",
      detail: "用韩语复述人物、动作、原因或结果。"
    },
    {
      id: "self-check",
      done: selfCheckComplete,
      label: "自检已完成",
      detail: "逐项确认这段材料的听辨、表达和语用目标。"
    },
    {
      id: "output",
      done: savedKoreanOutput,
      label: "输出改写已保存",
      detail: "保存一条韩语改写；完成整段练习后，它会加入间隔复习。"
    }
  ];
  const missingGateLabels = completionGates.filter((gate) => !gate.done).map((gate) => gate.label);
  const hasCompletionEvidence = completionGates.every((gate) => gate.done);
  const activeGateIndex = Math.max(0, completionGates.findIndex((gate) => !gate.done));
  const completedGateCount = completionGates.filter((gate) => gate.done).length;
  const nextGateLabel = completionGates.find((gate) => !gate.done)?.label ?? "全部完成";

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setActiveDraftReady(false);
      setSelectedMaterialId(requestedMaterialId);
      notifyNowPlayingLocationChange();
    });
    return () => {
      cancelled = true;
    };
  }, [requestedMaterialId]);

  useEffect(() => {
    let cancelled = false;
    hydratedMaterialRef.current = "";
    queueMicrotask(() => {
      if (cancelled) return;
      suppressDraftSaveRef.current = false;
      setActiveDraftReady(false);
      const savedDraft = getImmersionMaterialDraft(active.id);
      hydratedMaterialRef.current = active.id;
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
    if (!activeDraftReady || suppressDraftSaveRef.current || hydratedMaterialRef.current !== active.id) return;
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
      setDraftSaveError(saved ? "" : "草稿没有保存。当前文字还在页面里，但刷新或离开后可能丢失。");
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
    if (!prerequisitesReady) {
      setSaveError("前置课程还没完成，暂时不能保存输出。");
      return;
    }
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
      setSaveError("没有保存。请用自己的韩语写完整草稿，并分别填写具体弱点和目标改写。当前草稿仍在页面里。");
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

  const pinActiveMaterial = (materialId: string) => {
    setSelectedMaterialId(materialId);
    window.history.replaceState(null, "", immersionMaterialHref(materialId));
    notifyNowPlayingLocationChange();
  };

  const selectMaterial = (materialId: string) => {
    setActiveDraftReady(false);
    pinActiveMaterial(materialId);
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
    suppressDraftSaveRef.current = true;
    setActiveDraftReady(false);
    pinActiveMaterial(active.id);
    if (!clearMaterialArchive(active.id)) {
      suppressDraftSaveRef.current = false;
      setActiveDraftReady(true);
      setClearArchiveStatus("error");
      setMaterialError("没有清除这段练习的记录。请释放浏览器空间后重试。");
      return;
    }
    const draftCleared = clearImmersionMaterialDraft(active.id);
    setSelectedOutputByMaterial((items) => {
      const next = { ...items };
      delete next[active.id];
      return next;
    });
    setClearArchiveStatus("cleared");
    setClearArchiveConfirmId("");
    if (draftCleared) {
      setDictationEvidence("");
      setRetellEvidence("");
      setDraft("");
      setWeakPoint("");
      setTargetRewrite("");
      setCheckedRubric([]);
      setDraftRestoredFor("");
      setSaveError("");
      setDraftSaveError("");
      setCheckedSelfCheckByMaterial((drafts) => {
        const next = { ...drafts };
        delete next[active.id];
        return next;
      });
    }
    setMaterialError(draftCleared ? "" : "完成记录已清除，但草稿仍留在本机。当前输入也保留在页面里。");
    queueMicrotask(() => {
      suppressDraftSaveRef.current = false;
      setActiveDraftReady(true);
    });
  };

  const finishMaterial = () => {
    if (!prerequisitesReady) {
      setMaterialError(`请先完成：${missingPrerequisites.map((lesson) => `第 ${lesson.order} 课 ${lesson.title}`).join("、")}。当前草稿会继续保留。`);
      return;
    }
    const completedNow = completeMaterial(active.id, { dictation: effectiveDictation, retell: effectiveRetell, selfCheck: effectiveSelfCheck, outputEntryId: selectedOutputEntry?.id });
    if (!completedNow) {
      setMaterialError("还没完成全部步骤。请检查前置课程、听写、复述、目标改写和自检清单。");
      return;
    }
    suppressDraftSaveRef.current = true;
    setActiveDraftReady(false);
    pinActiveMaterial(active.id);
    const draftCleared = clearImmersionMaterialDraft(active.id);
    setMaterialError(draftCleared ? "" : "练习已完成，但旧草稿没有清理成功。完成记录已经保存。");
    setDictationEvidence("");
    setRetellEvidence("");
    setDraft("");
    setWeakPoint("");
    setTargetRewrite("");
    setCheckedRubric([]);
    setDraftRestoredFor("");
    setCheckedSelfCheckByMaterial((drafts) => {
      const next = { ...drafts };
      delete next[active.id];
      return next;
    });
    setSelectedOutputByMaterial((items) => {
      const next = { ...items };
      delete next[active.id];
      return next;
    });
    queueMicrotask(() => {
      suppressDraftSaveRef.current = false;
      setActiveDraftReady(true);
    });
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
        kicker="몰입 · 情境听读"
        title="自编情境听读：先听，再写，再复述。"
        copy="站内内容是自编韩语脚本，由预生成录音或设备语音播放，不是原生节目。每段都要完成听写、复述和一次自己的改写。"
        compact
      />

      <LibraryGateNotice focus="materials" />

      <ModuleHero
        kicker={`자료 기록 · 已完成 ${workspace.stats.completedMaterials}/${workspace.stats.totalMaterials} 段`}
        title="一次只练一段。"
        copy="先听关键句，再完成听写、复述、自检和改写。步骤没做完时，内容只会保存为草稿，不计为完成。"
        asset="immersion"
        imageSize="20rem"
        imageClassName="min-h-60 rounded-none border-0 lg:min-h-full"
        overlay="bottom"
      >
        <div className="grid gap-3 md:grid-cols-3">
          <HeroMetric label="当前材料" value={active.title} detail={`${levelLabels[active.level]} · ${kindLabels[active.kind]} · ${active.minutes} 分钟`} />
          <HeroMetric label="完成步骤" value={`${completedGateCount}/${completionGates.length}`} detail={`下一步：${nextGateLabel}`} />
          <HeroMetric label="课程要求" value={prerequisitesReady ? "已满足" : `还差 ${missingPrerequisites.length} 课`} detail={prerequisitesReady ? "可以开始完整练习" : "可以看说明和留草稿；完成前置课后开放原文"} />
        </div>
        {prerequisitesReady ? (
          <Button
            className="mt-4"
            type="button"
            variant="secondary"
            onClick={focusMaterialPractice}
          >
            <ArrowDownToLine className="h-4 w-4" />
            开始听读
          </Button>
        ) : (
          <Button asChild className="mt-4" variant="secondary">
            <Link href={lockedCtaLesson ? `/learn/${lockedCtaLesson.id}` : "/path"}>
              <ArrowDownToLine className="h-4 w-4" />
              {lockedCtaLesson ? `先学第 ${lockedCtaLesson.order} 课` : "查看前置课程"}
            </Link>
          </Button>
        )}
      </ModuleHero>

      <LearningCompass workspace={workspace} active="immersion" condensed />
      {draftRestoredFor === active.id && !completed.has(active.id) ? (
        <InlineAlert tone="success">
          已恢复上次的草稿。完成练习或保存输出后，草稿会自动清理。
        </InlineAlert>
      ) : null}
      {draftSaveError ? <InlineAlert>{draftSaveError}</InlineAlert> : null}

      <section id="material-workbench" className="scroll-mt-40 grid gap-5 lg:scroll-mt-28 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <Surface className="h-fit xl:sticky xl:top-24">
          <SectionHeading kicker="자료 목록 · 场景列表" title="情境听读" />
          <div>
            {queuedMaterials.map((material, materialIndex) => {
              const missingIds = getMissingMaterialPrerequisiteIds(material, masteredLessons);
              const missingLessons = missingIds.map((lessonId) => getLessonById(lessonId)).filter(Boolean);
              const unlocked = missingIds.length === 0;
              return (
                <TrackRow
                  key={material.id}
                  index={materialIndex + 1}
                  glyph={material.title.slice(0, 1)}
                  kicker={`${levelLabels[material.level]} · ${kindLabels[material.kind]}${unlocked ? (completed.has(material.id) ? " · 已完成" : " · 可完成") : " · 尚未解锁"}`}
                  title={material.title}
                  detail={unlocked ? "前置课程已完成" : `还需：${missingLessons.map((lesson) => `第 ${lesson.order} 课`).join(" / ")}`}
                  meta={`${material.minutes} 分钟`}
                  completed={completed.has(material.id)}
                  active={active.id === material.id}
                  onToggle={() => selectMaterial(material.id)}
                />
              );
            })}
          </div>
        </Surface>

        <div className="grid gap-5">
          <section className="studio-panel relative grid lg:grid-cols-[minmax(0,1fr)_22rem]">
            <span className="paper-tape left-8 top-[-8px]" aria-hidden="true" />
            <div className="paper-rail p-5 pt-8">
              <p className="eyebrow">{active.sourceLabel}</p>
              <h2 className="inkline mt-2 font-serif text-4xl font-normal leading-tight">{active.title}</h2>
              <p className="mt-3 leading-7 text-[var(--muted)]">{active.summary}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {active.focus.map((item) => (
                  <span key={item} className="border border-[var(--line)] bg-[var(--wash-2)] px-3 py-1 font-[family-name:var(--font-script)] text-sm text-[var(--ink-soft)]">
                    {item}
                  </span>
                ))}
              </div>
              <div className="mt-4 grid gap-2 border-y border-[var(--line)] bg-[var(--wash-1)] p-3 shadow-[inset_0_1px_0_var(--sheen)]">
                <p className="eyebrow">완료 순서 · 完成步骤</p>
                <div className="grid gap-2 sm:grid-cols-4">
                  {completionGates.map((gate, index) => (
                    <div
                      key={gate.id}
                      className={`border px-3 py-2 text-xs leading-5 ${
                        gate.done
                          ? "border-[var(--green)] bg-[var(--green-soft)] text-[var(--celadon)]"
                          : index === activeGateIndex
                            ? "border-[color-mix(in_srgb,var(--seal)_58%,var(--line))] bg-[var(--seal-soft)] text-[var(--cinnabar)]"
                            : "border-[var(--line)] bg-[color-mix(in_srgb,var(--paper-hi)_44%,transparent)] text-[var(--muted)]"
                      }`}
                    >
                      <span className="block font-[family-name:var(--font-script)] text-xs opacity-70">
                        Step {index + 1}
                      </span>
                      {gate.label}
                    </div>
                  ))}
                </div>
              </div>
              <div className={`mt-4 border-l-2 p-3 ${
                missingPrerequisites.length
                  ? "border-[var(--seal)] bg-[var(--seal-soft)]"
                  : "border-[var(--green)] bg-[var(--green-soft)]"
              }`}>
                <p className="eyebrow">먼저 읽기 · 前置课程</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {activePrerequisites.map((lesson) => {
                    const ready = isLessonMastered(lesson.id, masteredLessons, workspace.progress.lessonScores);
                    return (
                      <span
                        key={lesson.id}
                        className={`border px-2.5 py-1 text-xs ${
                          ready
                            ? "border-[var(--green)] bg-[var(--green-soft)] text-[var(--celadon)]"
                            : "border-[color-mix(in_srgb,var(--seal)_48%,var(--line))] bg-[color-mix(in_srgb,var(--paper-hi)_55%,transparent)] text-[var(--cinnabar)]"
                        }`}
                      >
                        第 {lesson.order} 课 · {lesson.title}
                      </span>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                  {missingPrerequisites.length
                    ? `尚缺：${missingPrerequisites.map((lesson) => `第 ${lesson.order} 课 ${lesson.title}`).join("、")}。完成这些课程后，才会开放原文、朗读和输出存档。`
                    : "前置课程已完成，可以开始听写、复述和改写。"}
                </p>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                {prerequisitesReady ? (
                  <Button type="button" onClick={() => speakSequence(active.lines.map((line) => line.ko), 1200)}>
                    <Volume2 className="h-4 w-4" />
                    连续播放
                  </Button>
                ) : null}
                <Button type="button" variant="secondary" onClick={() => setShowZh((value) => !value)}>
                  {showZh ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {showZh ? "隐藏译文" : "显示译文"}
                </Button>
              </div>
            </div>
            <div className="relative min-h-80">
              <VisualPanel asset="immersion" priority sizes="(max-width: 1024px) 100vw, 22rem" treatment="paper" overlay="bottom" className="absolute inset-0 border-0 shadow-none" />
              <div className="absolute bottom-4 left-4 right-4 border border-[var(--line)] bg-[color-mix(in_srgb,var(--paper-hi)_88%,transparent)] p-4 text-[var(--ink)] shadow-editorial backdrop-blur-sm">
                <span className="paper-tape left-5 top-[-7px]" aria-hidden="true" />
                <p className="eyebrow">자료 진도 · 材料进度</p>
                <strong className="mt-2 block font-serif text-4xl font-normal">{workspace.stats.completedMaterials}/{workspace.stats.totalMaterials}</strong>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">完成后，这段内容和目标改写会加入间隔复习。</p>
              </div>
            </div>
          </section>

          <div id="material-listen-practice" className="scroll-mt-40 lg:scroll-mt-28" tabIndex={-1}>
            <Surface>
              <SectionHeading kicker="한 줄씩 · 一句一句听" title="逐句听读" />
              <div className="grid gap-3">
                {prerequisitesReady ? active.lines.map((line, index) => (
                  <article key={line.ko} className="paper-rail grid gap-3 border border-[var(--line)] p-4 shadow-[inset_0_1px_0_var(--sheen)] md:grid-cols-[3rem_minmax(0,1fr)_auto]">
                    <span className="font-[family-name:var(--font-script)] text-2xl text-[var(--seal)]">{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <p className="hangul-display text-2xl font-black leading-relaxed" lang="ko">{line.ko}</p>
                      {showZh ? <p className="mt-1 leading-6 text-[var(--muted)]">{line.zh}</p> : null}
                      <small className="mt-2 block leading-5 text-[var(--muted)]">{line.note}</small>
                    </div>
                    <Button type="button" variant="secondary" size="icon" aria-label={`播放第 ${index + 1} 句`} onClick={() => speakKorean(line.ko)}>
                      <Volume2 className="h-4 w-4" />
                    </Button>
                  </article>
                )) : (
                  <p className="border-l-2 border-[var(--seal)] bg-[var(--wash-2)] p-4 text-sm leading-6 text-[var(--ink-soft)]">
                    前置课程还没完成，暂时不显示原文和朗读。你仍可以先看内容说明：{active.summary}
                  </p>
                )}
              </div>
            </Surface>
          </div>

          <section className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <Surface>
              <SectionHeading kicker="첫 장면 · 第一步" title="遮译文听写" />
              <div className="grid gap-2">
                {prerequisitesReady ? active.dictation.map((item, index) => (
                  <div key={item} className="paper-rail border border-[var(--line)] p-3 shadow-[inset_0_1px_0_var(--sheen)]">
                    <Button type="button" variant="ghost" size="sm" className="w-full justify-start" onClick={() => speakKorean(item)}>
                      <Volume2 className="h-4 w-4" />
                      播放听写句 {String(index + 1).padStart(2, "0")}
                    </Button>
                    <details className="mt-2 border-t border-[var(--line)] pt-2">
                      <summary className="min-h-11 cursor-pointer py-3 font-[family-name:var(--font-script)] text-sm text-[var(--muted)]">写完后核对原句</summary>
                      <strong className="hangul-display mt-2 block text-xl" lang="ko">{item}</strong>
                    </details>
                  </div>
                )) : (
                  <p className="border-l-2 border-[var(--seal)] bg-[var(--wash-2)] p-3 text-sm leading-6 text-[var(--ink-soft)]">
                    完成前置课程后才能播放和核对原句。现在可以先在下方留草稿。
                  </p>
                )}
              </div>
              <label className="mt-4 grid gap-2 text-sm font-medium">
                听写完成
                <textarea
                  className="focus-ring min-h-24 rounded-[var(--radius)] border border-[var(--line-strong)] bg-[color-mix(in_srgb,var(--paper-hi)_64%,transparent)] p-3 leading-7 shadow-[inset_0_1px_0_var(--shade)]"
                  value={dictationEvidence}
                  lang="ko"
                  spellCheck={false}
                  onChange={(event) => setDictationEvidence(event.target.value)}
                  placeholder="先盲听并写下一句，再展开原句核对和修正。"
                />
              </label>
            </Surface>

            <Surface>
              <SectionHeading kicker="둘째 장면 · 第二步" title="复述检查" />
              <div className="grid gap-2">
                {active.retellPrompts.map((item) => (
                  <div key={item} className="border-l-2 border-[var(--seal)] bg-[var(--wash-2)] p-3 text-sm leading-6 text-[var(--ink-soft)]">
                    {item}
                  </div>
                ))}
              </div>
              <label className="mt-4 grid gap-2 text-sm font-medium">
                复述完成
                <textarea
                  className="focus-ring min-h-28 rounded-[var(--radius)] border border-[var(--line-strong)] bg-[color-mix(in_srgb,var(--paper-hi)_64%,transparent)] p-3 leading-7 shadow-[inset_0_1px_0_var(--shade)]"
                  value={retellEvidence}
                  onChange={(event) => setRetellEvidence(event.target.value)}
                  placeholder="用韩语写 1-2 句复述：谁做了什么、为什么、结果是什么。"
                />
              </label>
              {!hasCompletionEvidence && !completed.has(active.id) ? (
                <p className="mt-3 border-l border-[var(--line-strong)] pl-3 text-xs leading-5 text-[var(--muted)]">
                  还差：{missingGateLabels.join("、")}。
                </p>
              ) : null}
              {selectedOutputEntry ? (
                <p className="mt-3 border-l-2 border-[var(--green)] bg-[var(--green-soft)] p-3 text-xs leading-5 text-[var(--muted)]">
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
                {completed.has(active.id) ? "已完成并加入复习" : "完成练习并加入复习"}
              </Button>
              {materialError ? (
                <p className="mt-3 border-l-2 border-[var(--seal)] bg-[var(--seal-soft)] p-3 text-sm leading-6 text-[var(--cinnabar)]" role="alert">
                  {materialError}
                </p>
              ) : null}
            </Surface>
          </section>

          <section className="grid gap-5 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
            <Surface>
              <SectionHeading kicker="셋째 장면 · 第三步" title="自检清单" />
              <div className="grid gap-2">
                {active.selfCheck.map((item, index) => {
                  const checked = effectiveSelfCheck.includes(item);
                  return (
                    <label
                      key={item}
                      className={`focus-ring grid min-h-14 cursor-pointer grid-cols-[1.75rem_minmax(0,1fr)] items-center gap-3 rounded-[var(--radius)] border p-3 shadow-[inset_0_1px_0_var(--sheen)] transition ${
                        checked
                          ? "border-[var(--green)] bg-[var(--green-soft)]"
                          : "border-[var(--line)] bg-[var(--wash-1)] hover:border-[var(--line-strong)] hover:bg-[var(--wash-2)]"
                      }`}
                    >
                      <input
                        className="sr-only"
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSelfCheck(item)}
                      />
                      <span className={`grid h-7 w-7 place-items-center border text-xs ${
                        checked
                          ? "border-[var(--celadon)] bg-[var(--celadon)] text-[var(--surface-solid)]"
                          : "border-[var(--line-strong)] text-[var(--muted)]"
                      }`}>
                        {checked ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                      </span>
                      <span className="text-sm leading-6">{item}</span>
                    </label>
                  );
                })}
              </div>
            </Surface>

            <Surface>
              <SectionHeading
                kicker="마무리 · 收尾"
                title="完成条件"
                copy="五个步骤都完成后，这段听读和对应改写才会计入学习进度，并加入间隔复习。"
              />
              <div className="grid gap-2">
                {completionGates.map((gate) => (
                  <GateRow key={gate.id} done={gate.done} label={gate.label} detail={gate.detail} />
                ))}
              </div>
            </Surface>
          </section>

          <Surface>
            <SectionHeading kicker="넷째 장면 · 第四步" title="输出任务与自评" copy={active.outputMission} />
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <label className="grid gap-2 text-sm font-medium">
                输出草稿
                <textarea
                  className="focus-ring min-h-44 rounded-[var(--radius)] border border-[var(--line-strong)] bg-[color-mix(in_srgb,var(--paper-hi)_64%,transparent)] p-3 leading-7 shadow-[inset_0_1px_0_var(--shade)]"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="在这里写韩语输出或复述稿..."
                />
              </label>
              <div className="grid gap-2">
                {outputRubric.map((item) => (
                  <label
                    key={item.id}
                    className={`focus-ring rounded-[var(--radius)] border p-3 text-left shadow-[inset_0_1px_0_var(--sheen)] transition ${
                      checkedRubric.includes(item.id)
                        ? "border-[var(--green)] bg-[var(--green-soft)]"
                        : "border-[var(--line)] bg-[var(--wash-1)] hover:border-[var(--line-strong)] hover:bg-[var(--wash-2)]"
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
                <label className="grid gap-2 text-sm font-medium">
                  需要修正的弱点
                  <input
                    className="focus-ring min-h-11 rounded-[var(--radius)] border border-[var(--line-strong)] bg-[color-mix(in_srgb,var(--paper-hi)_64%,transparent)] px-3 shadow-[inset_0_1px_0_var(--shade)]"
                    value={weakPoint}
                    onChange={(event) => setWeakPoint(event.target.value)}
                    placeholder="例如：拒绝太直接 / 语序像中文 / 缺少缓冲"
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  送回复习的目标改写
                  <input
                    className="focus-ring min-h-11 rounded-[var(--radius)] border border-[var(--line-strong)] bg-[color-mix(in_srgb,var(--paper-hi)_64%,transparent)] px-3 shadow-[inset_0_1px_0_var(--shade)]"
                    value={targetRewrite}
                    onChange={(event) => setTargetRewrite(event.target.value)}
                    placeholder="例如：좋긴 한데 조금 비싼 것 같아요."
                  />
                </label>
              </div>
              <div className="flex items-end gap-2">
                <Button
                  type="button"
                  disabled={!prerequisitesReady || !currentOutputReady}
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
              <p className="mt-3 border-l-2 border-[var(--seal)] bg-[var(--seal-soft)] p-3 text-sm leading-6 text-[var(--cinnabar)]" role="alert">
                {saveError}
              </p>
            ) : null}
          </Surface>

          <Surface>
            <SectionHeading
              kicker="보관한 글 · 已保存"
              title="输出档案"
              copy="这里保存草稿、需要改进的地方、目标改写和自评。完成整段练习后，目标改写会加入间隔复习。"
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
                这段练习已经完成。再次点击会移除完成记录、听写、复述、绑定输出和相关复习卡。
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
                    className={`paper-rail border p-4 shadow-[inset_0_1px_0_var(--sheen)] ${
                      selectedOutputEntry?.id === entry.id
                        ? "border-[var(--green)] bg-[var(--green-soft)]"
                        : "border-[var(--line)]"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong className="font-serif text-xl">{entry.materialTitle}</strong>
                      <div className="flex flex-wrap items-center gap-2">
                        {selectedOutputEntry?.id === entry.id ? (
                          <span className="inline-flex items-center gap-1 border border-[var(--green)] bg-[var(--green-soft)] px-2 py-1 font-[family-name:var(--font-script)] text-xs text-[var(--celadon)]">
                            <Check className="h-3.5 w-3.5" />
                            绑定中
                          </span>
                        ) : completed.has(active.id) ? (
                          <span className="border border-[var(--line)] bg-[var(--wash-1)] px-2 py-1 font-[family-name:var(--font-script)] text-xs text-[var(--muted)]">
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
                        <span className="font-[family-name:var(--font-script)] text-xs text-[var(--muted)]">
                          {new Date(entry.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-7">{entry.draft}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {entry.weakPoint ? (
                        <span className="border border-[color-mix(in_srgb,var(--seal)_40%,var(--line))] bg-[var(--seal-soft)] px-3 py-1 text-xs text-[var(--cinnabar)]">
                          弱点：{entry.weakPoint}
                        </span>
                      ) : null}
                      {entry.targetRewrite ? (
                        <span className="border border-[var(--green)] bg-[var(--green-soft)] px-3 py-1 text-xs text-[var(--celadon)]">
                          目标：{entry.targetRewrite}
                        </span>
                      ) : null}
                      {entry.rubric.map((item) => (
                        <span key={item} className="border border-[var(--line)] bg-[var(--wash-2)] px-3 py-1 text-xs text-[var(--ink-soft)]">
                          {outputRubric.find((rubric) => rubric.id === item)?.title ?? item}
                        </span>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="paper-rail relative border border-[var(--line)] p-4 pt-7 shadow-[inset_0_1px_0_var(--sheen)]">
                <span className="paper-tape left-6 top-[-7px]" aria-hidden="true" />
                <p className="eyebrow">빈 기록 · 还没有保存</p>
                <h3 className="inkline mt-2 font-serif text-2xl font-normal">还没有保存这段材料的输出</h3>
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
    <div className="border-t border-[var(--line)] bg-[var(--wash-1)] p-3 shadow-[inset_0_1px_0_var(--sheen)]">
      <span className="font-[family-name:var(--font-script)] text-sm text-[var(--muted)]">{label}</span>
      <strong className="mt-1 block font-serif font-normal leading-tight text-[var(--ink)]">{value}</strong>
      <span className="mt-2 block text-xs leading-5 text-[var(--muted)]">{detail}</span>
    </div>
  );
}

function ImmersionFallback() {
  return (
    <div className="grid gap-6">
      <PageHeader
        kicker="몰입 · 情境听读"
        title="正在准备情境听读。"
        copy="正在读取听读内容、学习记录和已保存的输出。"
      />
      <Surface>
        <div className="paper-rail relative grid min-h-48 place-items-center border border-[var(--line)] p-6 pt-8 text-center shadow-[inset_0_1px_0_var(--sheen)]">
          <span className="paper-tape left-1/2 top-[-7px] -translate-x-1/2" aria-hidden="true" />
          <div>
            <p className="eyebrow">잠시 · 稍等一下</p>
            <p className="inkline mt-2 font-serif text-3xl font-normal">正在打开对应材料</p>
          </div>
        </div>
      </Surface>
    </div>
  );
}

function GateRow({ done, label, detail }: { done: boolean; label: string; detail: string }) {
  return (
    <div className={`flex min-h-14 items-start gap-3 rounded-[var(--radius)] border px-3 py-3 text-sm shadow-[inset_0_1px_0_var(--sheen)] ${
      done
        ? "border-[var(--green)] bg-[var(--green-soft)] text-[var(--ink)]"
        : "border-[var(--line)] bg-[var(--wash-1)] text-[var(--muted)]"
    }`}>
      <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${done ? "text-[var(--celadon)]" : "text-[var(--muted)]"}`} />
      <span>
        <strong className="block">{label}</strong>
        <span className="mt-1 block text-xs leading-5 opacity-80">{detail}</span>
      </span>
    </div>
  );
}
