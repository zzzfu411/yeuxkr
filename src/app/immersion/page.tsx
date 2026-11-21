"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "@/components/learning/studio-link";
import { useSearchParams } from "next/navigation";
import { ArrowDownToLine, Check, CheckCircle2, Eye, EyeOff, PenLine, RotateCcw, Volume2 } from "lucide-react";
import { useEmbeddedPage } from "@/components/layout/embedded-page";
import { studioHref } from "@/lib/studio-navigation";
import { LearningCompass } from "@/components/learning/learning-compass";
import { LibraryGateNotice } from "@/components/learning/library-gate-notice";
import { Button } from "@/components/ui/button";
import { InlineAlert } from "@/components/ui/inline-alert";
import { PageHeader, SectionHeading, Surface } from "@/components/ui/section";
import { TrackRow } from "@/components/ui/track-row";
import { getMissingMaterialPrerequisiteIds, immersionMaterialHref, immersionMaterials, outputRubric, type ImmersionMaterial } from "@/data/materials";
import { firstActionableLesson, getLessonById, isLessonMastered } from "@/data/curriculum-runtime";
import { clearImmersionMaterialDraft, getImmersionMaterialDraft, saveImmersionMaterialDraft } from "@/lib/learning/drafts";
import { hasKoreanDictationEvidence, hasKoreanRetellEvidence, hasMaterialOutputEvidence, validateMaterialOutputEvidence } from "@/lib/learning/evidence";
import { notifyNowPlayingLocationChange } from "@/lib/learning/player";
import { useLearningWorkspace } from "@/lib/learning/use-learning-workspace";
import { abilityLabels } from "@/lib/learning/progress-normalization";
import { speakKorean, speakSequence } from "@/lib/speech";

const levelLabels: Record<ImmersionMaterial["level"], string> = {
  foundation: "基础情境",
  growth: "连续理解",
  native: "进阶表达"
};

const focusLabels: Readonly<Record<string, string>> = abilityLabels;

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
  const embedded = useEmbeddedPage();
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
  const displayedMaterialIdRef = useRef("");
  const defaultMaterialIdRef = useRef("");
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
    .filter((lesson): lesson is NonNullable<typeof lesson> => Boolean(lesson));
  const missingPrerequisiteIds = getMissingMaterialPrerequisiteIds(active, masteredLessons);
  const missingPrerequisites = missingPrerequisiteIds
    .map((lessonId) => getLessonById(lessonId))
    .filter((lesson): lesson is NonNullable<typeof lesson> => Boolean(lesson))
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
  const outputValidation = validateMaterialOutputEvidence({ draft, weakPoint, targetRewrite }, active);
  const currentOutputReady = outputValidation.valid;
  const effectiveDictation = dictationEvidence.trim() || savedEvidence?.dictation || "";
  const effectiveRetell = retellEvidence.trim() || savedEvidence?.retell || "";
  const effectiveSelfCheck = checkedSelfCheckByMaterial[active.id] ?? savedEvidence?.selfCheck ?? [];
  const selfCheckComplete = active.selfCheck.every((item) => effectiveSelfCheck.includes(item));
  const completionGates = [
    {
      id: "prerequisites",
      done: prerequisitesReady,
      label: "前置课程已完成",
      action: "完成前置课",
      shortLabel: "前置课",
      target: "material-prerequisites",
      detail: missingPrerequisites.length
        ? `尚缺：${missingPrerequisites.map((lesson) => `第 ${lesson.order} 课 ${lesson.title}`).join("、")}`
        : "这段听读需要的课程都已完成。"
    },
    {
      id: "dictation",
      done: hasKoreanDictationEvidence(effectiveDictation, active.dictation),
      label: "听写已完成",
      action: "写下一句听写",
      shortLabel: "听写",
      target: "material-dictation",
      detail: "至少写下一句听到的韩语，再对照原文修正。"
    },
    {
      id: "retell",
      done: hasKoreanRetellEvidence(effectiveRetell, sourceLines),
      label: "复述已完成",
      action: "用自己的话复述",
      shortLabel: "复述",
      target: "material-retell",
      detail: "用韩语复述人物、动作、原因或结果。"
    },
    {
      id: "self-check",
      done: selfCheckComplete,
      label: "自检已完成",
      action: "逐项自检",
      shortLabel: "自检",
      target: "material-self-check",
      detail: "逐项确认这段材料的听辨、表达和语用目标。"
    },
    {
      id: "output",
      done: savedKoreanOutput,
      label: "输出改写已保存",
      action: "保存自己的改写",
      shortLabel: "改写",
      target: "material-output",
      detail: "保存一条韩语改写；完成整段练习后，它会加入间隔复习。"
    }
  ];
  const missingGateLabels = completionGates.filter((gate) => !gate.done).map((gate) => gate.action);
  const hasCompletionEvidence = completionGates.every((gate) => gate.done);
  const completedGateCount = completionGates.filter((gate) => gate.done).length;
  const nextGate = completionGates.find((gate) => !gate.done);
  const hasWorkToContinue = prerequisitesReady && !completed.has(active.id) && Boolean(dictationEvidence || retellEvidence || draft || savedEvidence || materialOutputs.length);

  useEffect(() => {
    displayedMaterialIdRef.current = active.id;
    defaultMaterialIdRef.current = defaultMaterialId;
  }, [active.id, defaultMaterialId]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const nextMaterialId = requestedMaterialId || defaultMaterialIdRef.current;
      if (nextMaterialId !== displayedMaterialIdRef.current) {
        setActiveDraftReady(false);
      }
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
    const href = immersionMaterialHref(materialId);
    window.history.replaceState(null, "", embedded ? studioHref(href) : href);
    notifyNowPlayingLocationChange();
  };

  const selectMaterial = (materialId: string) => {
    if (materialId === active.id) {
      pinActiveMaterial(materialId);
      return;
    }
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

  const focusMaterialStep = (id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    if (target instanceof HTMLDetailsElement) target.open = true;
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

      <Surface>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 max-w-[64ch]">
            <p className="text-xs text-[var(--muted)]">{levelLabels[active.level]} · 自编{kindLabels[active.kind]} · 约 {active.minutes} 分钟</p>
            <h2 id="current-material-heading" tabIndex={-1} className="focus-ring scroll-mt-40 mt-2 font-serif text-[clamp(1.5rem,3vw,2rem)]">{active.title}</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{active.summary}</p>
          </div>
          <Button type="button" variant="secondary" onClick={() => focusMaterialStep(hasWorkToContinue ? nextGate?.target ?? "material-finish" : "material-listen-practice")}>
            <ArrowDownToLine className="h-4 w-4" />
            {hasWorkToContinue ? "继续练习" : prerequisitesReady ? "开始听读" : "先试听这段"}
          </Button>
        </div>
        <div className="mt-4 border-t border-[var(--line)] pt-4">
          <p className="text-sm leading-6">{completed.has(active.id) ? "本段已完成并加入复习。" : `已完成 ${completedGateCount}/${completionGates.length} 项 · ${nextGate ? `下一步：${nextGate.action}` : "可以完成练习并加入复习"}`}</p>
          <nav aria-label="本段听读步骤" className="mt-2 grid grid-cols-5 gap-1">
            {completionGates.map((gate) => (
              <button
                key={gate.id}
                type="button"
                className={`focus-ring flex min-h-11 items-center justify-center gap-1 rounded-[var(--radius)] px-1 py-2 text-xs leading-5 ${gate.done ? "bg-[var(--green-soft)] text-[var(--celadon)]" : nextGate?.id === gate.id ? "bg-[var(--seal-soft)] text-[var(--accent)]" : "bg-[var(--wash-1)] text-[var(--muted)]"}`}
                onClick={() => focusMaterialStep(gate.target)}
                aria-label={`${gate.done ? "已完成：" : "前往："}${gate.action}`}
              >
                {gate.done ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
                {gate.shortLabel}
              </button>
            ))}
          </nav>
        </div>
        <details id="material-prerequisites" tabIndex={-1} className="focus-ring mt-3 scroll-mt-40 border-t border-[var(--line)] pt-2">
          <summary className="min-h-11 cursor-pointer py-3 text-sm text-[var(--muted)]">{prerequisitesReady ? "前置课程已完成" : `还需 ${missingPrerequisites.length} 节前置课才能归档`} · 查看课程</summary>
          <p className="mb-3 text-xs leading-5 text-[var(--muted)]">自编情境 · {active.sourceLabel} · 预生成录音或设备语音，非原生节目。训练：{active.focus.map((item) => focusLabels[item] ?? item).join("、")}。</p>
          <div className="flex flex-wrap gap-2 pb-2">
            {activePrerequisites.map((lesson) => (
              <Link key={lesson.id} href={`/learn/${lesson.id}`} className="focus-ring inline-flex min-h-11 items-center gap-1 rounded-[var(--radius)] bg-[var(--wash-1)] px-3 text-xs text-[var(--ink-soft)]">
                {masteredLessons.has(lesson.id) ? <Check className="h-3.5 w-3.5" /> : null}
                第 {lesson.order} 课 · {lesson.title}
              </Link>
            ))}
          </div>
          {!prerequisitesReady ? <Button asChild variant="secondary" size="sm" className="mt-2"><Link href={lockedCtaLesson ? `/learn/${lockedCtaLesson.id}` : "/path"}>{lockedCtaLesson ? `先学第 ${lockedCtaLesson.order} 课` : "查看学习路线"}</Link></Button> : null}
        </details>
        {!prerequisitesReady ? <p className="mt-2 text-xs leading-5 text-[var(--muted)]">可以先看原文、试听和保留草稿；完成前置课后，才能保存输出、完成练习并计入进度。</p> : null}
      </Surface>

      <LearningCompass workspace={workspace} active="immersion" condensed />
      {draftRestoredFor === active.id && !completed.has(active.id) ? (
        <InlineAlert tone="success">
          已恢复上次的草稿。完成练习或保存输出后，草稿会自动清理。
        </InlineAlert>
      ) : null}
      {draftSaveError ? <InlineAlert>{draftSaveError}</InlineAlert> : null}

      <section id="material-workbench" className="scroll-mt-40 grid gap-5 lg:scroll-mt-28">
        <details id="material-directory" className="surface p-4"><summary className="focus-ring min-h-11 cursor-pointer py-3 font-semibold">更换听读材料 · 共 {queuedMaterials.length} 段</summary><div className="max-h-96 overflow-y-auto overscroll-contain">
          <SectionHeading kicker="자료 목록 · 场景列表" title="情境听读" />
          <div>
            {queuedMaterials.map((material, materialIndex) => {
              const missingIds = getMissingMaterialPrerequisiteIds(material, masteredLessons);
              const missingLessons = missingIds.map((lessonId) => getLessonById(lessonId)).filter((lesson): lesson is NonNullable<typeof lesson> => Boolean(lesson));
              const unlocked = missingIds.length === 0;
              return (
                <TrackRow
                  key={material.id}
                  index={materialIndex + 1}
                  glyph={material.title.slice(0, 1)}
                  kicker={`${levelLabels[material.level]} · ${kindLabels[material.kind]}${unlocked ? (completed.has(material.id) ? " · 已完成" : " · 可练习") : " · 可试听"}`}
                  title={material.title}
                  detail={unlocked ? "前置课程已完成" : `还需：${missingLessons.map((lesson) => `第 ${lesson.order} 课`).join(" / ")}`}
                  meta={`${material.minutes} 分钟`}
                  completed={completed.has(material.id)}
                  active={active.id === material.id}
                  onToggle={() => {
                    selectMaterial(material.id);
                    document.getElementById("material-directory")?.removeAttribute("open");
                    window.requestAnimationFrame(() => {
                      const heading = document.getElementById("current-material-heading");
                      heading?.scrollIntoView({ block: "start", behavior: "auto" });
                      heading?.focus({ preventScroll: true });
                    });
                  }}
                />
              );
            })}
          </div>
        </div></details>

        <div className="grid gap-5">
          <div id="material-listen-practice" className="scroll-mt-40 lg:scroll-mt-28" tabIndex={-1}>
            <Surface>
              <SectionHeading title="逐句听读" />
              <div className="mb-4 flex flex-wrap gap-2">
                <Button type="button" onClick={() => speakSequence(active.lines.map((line) => line.ko), 1200)}><Volume2 className="h-4 w-4" />连续播放</Button>
                <Button type="button" variant="secondary" onClick={() => setShowZh((value) => !value)}>{showZh ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}{showZh ? "隐藏译文" : "显示译文"}</Button>
              </div>
              <div className="grid gap-3">
                {active.lines.map((line, index) => (
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
                ))}
              </div>
            </Surface>
          </div>

          <section className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <Surface>
              <h3 id="material-dictation" tabIndex={-1} className="focus-ring mb-4 scroll-mt-40 text-xl font-semibold">遮译文听写</h3>
              <div className="grid gap-2">
                {active.dictation.map((item, index) => (
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
                ))}
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
              <h3 id="material-retell" tabIndex={-1} className="focus-ring mb-4 scroll-mt-40 text-xl font-semibold">复述检查</h3>
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
            </Surface>
          </section>

          <section>
            <Surface>
              <h3 id="material-self-check" tabIndex={-1} className="focus-ring mb-4 scroll-mt-40 text-xl font-semibold">自检清单</h3>
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

          </section>

          <Surface>
            <h3 id="material-output" tabIndex={-1} className="focus-ring scroll-mt-40 text-xl font-semibold">输出任务与自评</h3>
            <p className="mb-4 mt-2 text-sm leading-6 text-[var(--muted)]">{active.outputMission}</p>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <label className="grid gap-2 text-sm font-medium">
                输出草稿
                <textarea
                  className="focus-ring min-h-44 rounded-[var(--radius)] border border-[var(--line-strong)] bg-[color-mix(in_srgb,var(--paper-hi)_64%,transparent)] p-3 leading-7 shadow-[inset_0_1px_0_var(--shade)]"
                  value={draft}
                  aria-label="输出草稿"
                  aria-describedby="material-draft-feedback"
                  lang="ko"
                  spellCheck={false}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="在这里写韩语输出或复述稿..."
                />
                <span id="material-draft-feedback" className="text-xs font-normal leading-5 text-[var(--muted)]">{outputValidation.draftIssues.length ? outputValidation.draftIssues.join("；") : "草稿形式已齐全，请继续检查内容是否准确。"}</span>
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
                    aria-label="需要修正的弱点"
                    aria-describedby="material-weak-point-feedback"
                    onChange={(event) => setWeakPoint(event.target.value)}
                    placeholder="例如：拒绝太直接 / 语序像中文 / 缺少缓冲"
                  />
                  <span id="material-weak-point-feedback" className="text-xs font-normal leading-5 text-[var(--muted)]">{outputValidation.weakPointIssues.join("；") || "已记录具体弱点。"}</span>
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  送回复习的目标改写
                  <input
                    className="focus-ring min-h-11 rounded-[var(--radius)] border border-[var(--line-strong)] bg-[color-mix(in_srgb,var(--paper-hi)_64%,transparent)] px-3 shadow-[inset_0_1px_0_var(--shade)]"
                    value={targetRewrite}
                    aria-label="送回复习的目标改写"
                    aria-describedby="material-rewrite-feedback"
                    lang="ko"
                    spellCheck={false}
                    onChange={(event) => setTargetRewrite(event.target.value)}
                    placeholder="例如：좋긴 한데 조금 비싼 것 같아요."
                  />
                  <span id="material-rewrite-feedback" className="text-xs font-normal leading-5 text-[var(--muted)]">{outputValidation.rewriteIssues.join("；") || "改写形式已齐全，保存前请自己核对表达。"}</span>
                </label>
              </div>
              <div className="flex items-end gap-2">
                <Button
                  type="button"
                  disabled={!prerequisitesReady || !currentOutputReady}
                  aria-describedby="material-output-feedback"
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
            <p id="material-output-feedback" className="mt-3 text-xs leading-5 text-[var(--muted)]">{!prerequisitesReady ? "前置课程尚未完成，当前只能保留草稿。" : !currentOutputReady ? "请补齐上方提示的内容后保存。" : "内容已齐全，可以保存。"} 这里只检查提交形式，不判断韩语语法或自然度；词块按连续韩文计数。</p>
            {saveError ? (
              <p className="mt-3 border-l-2 border-[var(--seal)] bg-[var(--seal-soft)] p-3 text-sm leading-6 text-[var(--cinnabar)]" role="alert">
                {saveError}
              </p>
            ) : null}
          </Surface>

          <Surface>
            <h3 id="material-finish" tabIndex={-1} className="focus-ring scroll-mt-40 text-xl font-semibold">完成本段练习</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">听写、复述、自检与改写都完成后，再把本段加入间隔复习。</p>
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
            <details className="mt-4 border-t border-[var(--line)] pt-2">
              <summary className="focus-ring min-h-11 cursor-pointer py-3 text-sm text-[var(--muted)]">查看完成条件 · {completedGateCount}/{completionGates.length}</summary>
              <div className="grid gap-2">
                {completionGates.map((gate) => <GateRow key={gate.id} done={gate.done} label={gate.done ? gate.label : gate.action} detail={gate.detail} />)}
              </div>
            </details>
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
