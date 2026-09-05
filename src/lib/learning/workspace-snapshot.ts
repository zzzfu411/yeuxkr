// Read-side evidence, proficiency, and task recommendations. No progress writes.
import { normalizeLearningProgress, hangulIdSet, vocabIdSet, grammarIdSet, hasCompleteNativePracticeEvidence, normalizeMaterialSelfCheck, isRecord, abilityIds, lessonIdSet, clampNumber } from "./progress-normalization.ts";
import { lessons, getNextLesson, isLessonMastered, UNLOCK_SCORE } from "../../data/curriculum-runtime.js";
import { hangulGroups } from "../../data/hangul.js";
import { vocab } from "../../data/lexicon.js";

import { immersionMaterialHref, immersionMaterials } from "../../data/materials.ts";
import { buildSelfStudyPlan } from "../../data/self-study.js";
import { proficiencyLevels, proficiencyMetrics } from "../../data/proficiency.js";
import { hrefForStudyModule, moduleToAbility, studyModuleReadinessRequirement } from "./modules.js";

import { countHangulSyllables, hasKoreanDictationEvidence, hasKoreanRetellEvidence, hasMaterialOutputEvidence, mapFocusToAbilities } from "./evidence.ts";

import { defaultProgress, todayKey } from "./storage.ts";
import { getOutputState, type OutputEntry } from "./output.ts";
import { getSrsState, type SrsState } from "./srs.ts";

import { summarizeMistakes } from "./mistakes.ts";
import { getLibraryGateForLesson, type LibraryCounts } from "./path-gates.ts";
import { TASK_IDS, abilityTaskId, hasCardPrefix, hasQuestionPrefix, lessonReviewCardId, lessonTaskId, materialCardId, outputCardId, parseLessonReviewCardId } from "./ids.ts";
import type { AbilityId, LearningProgress, LearningWorkspace, StudyTask, UserProfile } from "@/lib/learning/types";

const checkpointSignalPattern = /正确率|准确率|录音|听写|复述|造句|句子|输出|自评|错误|弱点|修正|score|check/i;

const checkpointMeasurementPattern = /\d+(?:\.\d+)?\s*(?:%|％|秒|分钟|分|题|个|句|词|次)/i;

export type OutputEvidenceInput = number | { outputs: OutputEntry[]; srs: SrsState };

export function buildLearningWorkspace(profile: UserProfile, progress: LearningProgress, dueCount = 0, outputEvidence: OutputEvidenceInput = { outputs: getOutputState().entries, srs: getSrsState() }): LearningWorkspace {
  const validOutputEntries = countValidOutputEvidence(outputEvidence);
  const validMaterialIds = getValidMaterialIds(progress, outputEvidence);
  const validMaterialEntries = validMaterialIds.length;
  const mistakeSummary = summarizeMistakes(srsEvidenceFromInput(outputEvidence));
  const completedIds = new Set(progress.completedLessons);
  const nextLesson = getNextLesson(completedIds, progress.lessonScores);
  const allHangul = hangulGroups.flatMap((group: any) => group.items);
  const abilityEvidence = buildEvidenceBackedAbility(progress, outputEvidence);
  const abilityGaps = (Object.entries(abilityEvidence) as Array<[AbilityId, number]>)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 2)
    .map(([id]) => id);
  const weakPracticeItems = getWeakPracticeItems(progress);
  const proficiency = buildProficiencySnapshot(progress, outputEvidence);
  const taskPool = buildTaskPool(profile, progress, nextLesson, abilityGaps, dueCount, outputEvidence);
  const taskContext = { dueCount, outputEvidence };
  const recommended = takeRecommendedTasks(taskPool);
  const openStudy = markTasksCompleted(
    buildOpenStudyTasks(profile, progress, nextLesson, outputEvidence),
    progress,
    taskContext
  );

  return {
    profile,
    progress,
    modeLabel: profile.studyMode === "self" ? "自由自学" : "路径推荐",
    nextLesson,
    recommended,
    openStudy,
    abilityGaps,
    proficiency,
    stats: {
      completedLessons: completedIds.size,
      totalLessons: lessons.length,
      masteredHangul: allHangul.filter((item: any) => progress.masteredHangul.includes(item.id)).length,
      totalHangul: allHangul.length,
      learnedVocab: vocab.filter((item: any) => progress.learnedVocab.includes(item.id)).length,
      totalVocab: vocab.length,
      completedMaterials: validMaterialEntries,
      totalMaterials: immersionMaterials.length,
      outputEntries: validOutputEntries,
      mistakeCards: mistakeSummary.total,
      dueMistakes: mistakeSummary.due,
      practiceItems: Object.keys(progress.practiceItems).length,
      weakPracticeItems: weakPracticeItems.length
    },
    evidence: {
      validMaterialIds
    }
  };
}

export function buildProficiencySnapshot(progress: LearningProgress, outputEvidence: OutputEvidenceInput = { outputs: getOutputState().entries, srs: getSrsState() }) {
  const evidence: Record<string, number> = buildProficiencyEvidence(progress, outputEvidence);
  const metricLabels: Record<string, string> = proficiencyMetrics;
  const achievableLevels = proficiencyLevels.filter((level: any) => !level.expansionOnly);
  let current = achievableLevels[0];
  for (const level of achievableLevels) {
    if (levelRequirementsMet(level, evidence)) current = level;
    else break;
  }
  const next = proficiencyLevels[proficiencyLevels.findIndex((level: any) => level.id === current.id) + 1] ?? null;
  const nextRequirements = next?.requirements?.map((requirement: { metric: string; target: number }) => {
    const currentValue = evidence[requirement.metric] ?? 0;
    return {
      metric: requirement.metric,
      label: metricLabels[requirement.metric] ?? requirement.metric,
      current: currentValue,
      target: requirement.target,
      met: currentValue >= requirement.target
    };
  }) ?? [];
  const progressRatio = nextRequirements.length
    ? nextRequirements.filter((item: any) => item.met).length / nextRequirements.length
    : 1;
  return {
    current,
    next,
    progress: Math.round(progressRatio * 100),
    evidence,
    nextRequirements
  };
}

export function materialPrerequisitesMet(material: { requiredLessons?: string[]; recommendedLessons?: string[] } | null | undefined, progress: LearningProgress) {
  const requiredLessons = material?.requiredLessons ?? material?.recommendedLessons ?? [];
  if (!requiredLessons.length) return true;
  const completedIds = new Set(progress.completedLessons);
  return requiredLessons.every((lessonId) => isLessonMastered(lessonId, completedIds, progress.lessonScores));
}

function buildProficiencyEvidence(progress: LearningProgress, outputEvidence: OutputEvidenceInput = { outputs: getOutputState().entries, srs: getSrsState() }) {
  const outputEntries = countValidOutputEvidence(outputEvidence);
  const materialEntries = countValidMaterialEvidence(progress, outputEvidence);
  const checkpointCredits = countCheckpointCredits(progress);
  const ability = buildEvidenceBackedAbility(progress, outputEvidence);
  return {
    lessons: progress.completedLessons.length,
    hangul: progress.masteredHangul.filter((id) => hangulIdSet.has(id)).length,
    vocabulary: progress.learnedVocab.filter((id) => vocabIdSet.has(id)).length,
    grammar: progress.learnedGrammar.filter((id) => grammarIdSet.has(id)).length,
    native: countNativePracticeEvidence(progress),
    materials: materialEntries,
    outputs: outputEntries,
    checkpoints: checkpointCredits,
    capstone: progress.completedLessons.includes("l30-native-capstone") ? 1 : 0,
    scriptAbility: ability.script,
    listeningAbility: ability.listening,
    vocabularyAbility: ability.vocabulary,
    grammarAbility: ability.grammar,
    pragmaticsAbility: ability.pragmatics,
    nativeAbility: ability.native
  };
}

export function checkpointCreditKey(checkpointId: string) {
  const clean = normalizeCheckpointPart(checkpointId);
  if (!clean) return "";
  const parts = clean.split(":").map(normalizeCheckpointPart);
  if (parts.length >= 5 && /^\d+$/.test(parts[3]) && parts.slice(4).join(":")) {
    return `checkpoint:${parts[0]}:${parts[2]}:${parts[3]}:${parts.slice(4).join(":")}`;
  }
  if (parts.length >= 3 && /^\d+$/.test(parts[1]) && parts.slice(2).join(":")) {
    return `checkpoint:${parts[1]}:${parts.slice(2).join(":")}`;
  }
  return `checkpoint:${clean}`;
}

export function countCheckpointCredits(input: LearningProgress | string[]) {
  const ids = Array.isArray(input)
    ? input
    : input.completedCheckpoints.filter((id) => validateCheckpointEvidence(input.checkpointEvidence[id] ?? ""));
  return new Set(ids.map(checkpointCreditKey).filter(Boolean)).size;
}

export function countNativePracticeEvidence(progress: LearningProgress, scope: "all" | "pragmatics" | "nuance" = "all") {
  const normalized = normalizeLearningProgress(progress);
  return Object.entries(normalized.nativeEvidence).filter(([itemId, evidence]) => {
    if (scope === "pragmatics" && !itemId.startsWith("pragmatics:")) return false;
    if (scope === "nuance" && !itemId.startsWith("nuance:")) return false;
    return hasCompleteNativePracticeEvidence(evidence, itemId);
  }).length;
}

export function countValidOutputEvidence(input: OutputEvidenceInput = { outputs: getOutputState().entries, srs: getSrsState() }) {
  if (typeof input === "number") return Math.max(0, Math.trunc(input));
  return input.outputs.filter((entry) => hasValidOutputEvidence(entry, input.srs)).length;
}

function srsEvidenceFromInput(input: OutputEvidenceInput = { outputs: getOutputState().entries, srs: getSrsState() }) {
  return typeof input === "number" ? getSrsState() : input.srs;
}

export function hasValidOutputEvidence(entry: OutputEntry, srs: SrsState = getSrsState()) {
  const target = entry.targetRewrite || "";
  const card = srs.cards[outputCardId(entry.id)];
  const material = immersionMaterials.find((item) => item.id === entry.materialId);
  return Boolean(material && hasMaterialOutputEvidence(entry, material) && card?.payload.kind === "output" && card.payload.answer === target);
}

export function countValidMaterialEvidence(progress: LearningProgress, outputEvidence: OutputEvidenceInput = { outputs: getOutputState().entries, srs: getSrsState() }) {
  return getValidMaterialIds(progress, outputEvidence).length;
}

export function getValidMaterialIds(progress: LearningProgress, outputEvidence: OutputEvidenceInput = { outputs: getOutputState().entries, srs: getSrsState() }) {
  const evidence = typeof outputEvidence === "number" ? { outputs: getOutputState().entries, srs: getSrsState() } : outputEvidence;
  return immersionMaterials
    .filter((material) => hasValidMaterialEvidence(progress, material.id, evidence.outputs, evidence.srs))
    .map((material) => material.id);
}

export function hasValidMaterialEvidence(progress: LearningProgress, materialId: string, outputs: OutputEntry[] = getOutputState().entries, srs: SrsState = getSrsState()) {
  const evidence = progress.materialEvidence[materialId];
  const material = immersionMaterials.find((item) => item.id === materialId);
  if (!material || !progress.completedMaterials.includes(materialId) || !evidence) return false;
  if (!materialPrerequisitesMet(material, progress)) return false;
  if (!hasKoreanDictationEvidence(evidence.dictation, material.dictation) || !hasKoreanRetellEvidence(evidence.retell, material.lines.map((line) => line.ko))) return false;
  if (normalizeMaterialSelfCheck(evidence.selfCheck, material).length < material.selfCheck.length) return false;
  if (!srs.cards[materialCardId(materialId)] || srs.cards[materialCardId(materialId)].payload.kind !== "material") return false;
  const selectedOutput = outputs.find((entry) => entry.materialId === materialId && entry.id === evidence.outputEntryId);
  return Boolean(selectedOutput && hasValidOutputEvidence(selectedOutput, srs));
}

function levelRequirementsMet(level: any, evidence: Record<string, number>) {
  return (level.requirements ?? []).every((requirement: any) => {
    return Number(evidence[requirement.metric] ?? 0) >= Number(requirement.target ?? 0);
  });
}

function markTasksCompleted(
  tasks: StudyTask[],
  progress: LearningProgress,
  context: { dueCount?: number; outputEvidence?: OutputEvidenceInput } = {}
) {
  return tasks.map((task) => ({ ...task, completed: isTaskCompleted(task, progress, context) }));
}

type WeakPracticeItem = LearningProgress["practiceItems"][string] & { id: string };

export function getWeakPracticeItems(progress: LearningProgress, limit = 12): WeakPracticeItem[] {
  return Object.entries(progress.practiceItems ?? {})
    .filter(([id, item]) => Boolean(id.trim()) && item.wrong > 0 && !item.lastCorrect)
    .map(([id, item]) => ({ id, ...item }))
    .sort((a, b) => {
      const wrongDelta = b.wrong - a.wrong;
      if (wrongDelta) return wrongDelta;
      const attemptDelta = b.attempts - a.attempts;
      if (attemptDelta) return attemptDelta;
      return practiceSeenAtMs(b.lastSeenAt) - practiceSeenAtMs(a.lastSeenAt);
    })
    .slice(0, Math.max(0, Math.trunc(limit)));
}

function abilitiesForPracticeItems(items: WeakPracticeItem[], fallback: AbilityId[] = ["grammar"]) {
  const abilities = [...new Set(items.flatMap((item) => mapQuestionToAbilities(item.id)))].filter(isAbilityId);
  return abilities.length ? abilities : fallback;
}

function repairHrefForWeakItems(items: WeakPracticeItem[], progress: LearningProgress) {
  const lessonIds = items.map((item) => parseLessonReviewCardId(item.id)?.lessonId).filter(Boolean) as string[];
  if (!lessonIds.length) return "/quiz";
  const primary = lessonIds[0];
  const concentrated = lessonIds.filter((id) => id === primary).length >= Math.ceil(items.length / 2);
  const completed = new Set(progress.completedLessons);
  if (concentrated && primary && !completed.has(primary) && lessonIdSet.has(primary)) return `/learn/${primary}`;
  return "/quiz";
}

function taskForMasteredLessonRetrain(progress: LearningProgress): StudyTask | null {
  const counts = new Map<string, number>();
  for (const item of getWeakPracticeItems(progress, 12)) {
    const lessonId = parseLessonReviewCardId(item.id)?.lessonId;
    if (!lessonId || !progress.completedLessons.includes(lessonId) || !lessonIdSet.has(lessonId)) continue;
    counts.set(lessonId, (counts.get(lessonId) ?? 0) + 1);
  }
  const hit = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  if (!hit || hit[1] < 3) return null;
  const lesson = lessons.find((item: any) => item.id === hit[0]);
  if (!lesson) return null;
  return {
    id: `system:retrain-${lesson.id}`,
    kind: "lesson",
    title: `回头复习“${lesson.title}”`,
    detail: `这节课最近有 ${hit[1]} 道题再次答错。先复习一遍，再继续新课。`,
    href: `/learn/${lesson.id}`,
    minutes: lesson.duration ?? 12,
    ability: mapFocusToAbilities(lesson.focus),
    source: "system",
    priority: 92,
    lane: "bridge",
    reason: "学过的内容开始变模糊，趁现在补回来。"
  };
}

function taskForPracticeRepair(progress: LearningProgress, priority = 86): StudyTask | null {
  const weakItems = getWeakPracticeItems(progress);
  if (!weakItems.length) return null;
  const href = repairHrefForWeakItems(weakItems, progress);
  const backToLesson = href.startsWith("/learn/");
  const sourceLabels = [...new Set(weakItems.map((item) => item.lastSource))]
    .map((source) => source === "lesson" ? "课程" : source === "review" ? "复习" : "测验")
    .join(" / ");
  return {
    id: TASK_IDS.systemPracticeRepair,
    kind: backToLesson ? "lesson" : "quiz",
    title: backToLesson ? "回到还没掌握的课程" : "重练最近答错的题",
    detail: `${weakItems.length} 道题上次没有答对，来自${sourceLabels || "练习"}。${backToLesson ? "先回到对应课程看讲解。" : "先做一组综合测验，把它们重新答对。"}`,
    href,
    minutes: Math.min(14, Math.max(6, weakItems.length * 2)),
    ability: abilitiesForPracticeItems(weakItems),
    source: "system",
    priority,
    lane: "bridge",
    reason: "先处理明确的错题，再学新内容会更稳。",
    completionLabel: "薄弱已修复"
  };
}

function buildTaskPool(
  profile: UserProfile,
  progress: LearningProgress,
  nextLesson: any | null,
  abilityGaps: AbilityId[],
  dueCount: number,
  outputEvidence: OutputEvidenceInput = { outputs: getOutputState().entries, srs: getSrsState() }
): StudyTask[] {
  const plan = buildSelfStudyPlan(profile as any);
  const moduleEvidence = selfStudyModuleEvidence(progress, outputEvidence);
  const tasks: StudyTask[] = [];
  const libraryCounts = libraryCountsForWrite(progress);
  if (dueCount > 0) {
    tasks.push({
      id: TASK_IDS.systemReview,
      kind: "review",
      title: "处理到期复习",
      detail: `${dueCount} 张卡片已经到期，先复习这些内容。`,
      href: "/review",
      minutes: Math.min(12, Math.max(5, dueCount * 2)),
      ability: ["script", "vocabulary"],
      source: "system",
      priority: 100,
      lane: "core",
      reason: "先复习到期内容，再学新课。"
    });
  }

  if (nextLesson) {
    const libraryGate = getLibraryGateForLesson(nextLesson, libraryCounts);
    for (const [index, gap] of libraryGate.missing.entries()) {
      tasks.push({
        id: `system:library-${gap.key}`,
        kind: gap.key === "hangul" ? "hangul" : gap.key === "vocab" ? "vocabulary" : gap.key === "grammar" ? "grammar" : gap.key === "materials" ? "immersion" : "native",
        title: `先补${gap.label}`,
        detail: `目前 ${gap.current}/${gap.target}。补到目标后，主线下一课“${nextLesson.title}”才会计入进度。`,
        href: gap.href,
        minutes: 12,
        ability: [gap.ability],
        source: "system",
        priority: 96 - index,
        lane: "core",
        reason: "先补齐这一阶段需要的基础内容。"
      });
    }
    tasks.push({
      id: lessonTaskId(nextLesson.id),
      kind: "lesson",
      title: nextLesson.title,
      detail: nextLesson.subtitle,
      href: `/learn/${nextLesson.id}`,
      minutes: nextLesson.duration ?? 15,
      ability: mapFocusToAbilities(nextLesson.focus),
      source: "guided",
      priority: !libraryGate.ok ? 64 : dueCount >= 8 ? 50 : dueCount > 0 ? 70 : profile.studyMode === "guided" ? 90 : 65,
      lane: "core",
      reason: !libraryGate.ok
        ? "前置课已完成，但这一阶段所需的韩文、词汇、语法或听读数量还不够。"
        : dueCount > 0
          ? "先完成到期复习，再开始新课。"
          : (profile.studyMode === "guided" ? "继续下一节主线课程。" : "可以继续主线，但先做已到期的复习更合适。")
    });
  }

  const practiceRepairTask = taskForPracticeRepair(progress);
  if (practiceRepairTask) tasks.push(practiceRepairTask);
  const retrainTask = taskForMasteredLessonRetrain(progress);
  if (retrainTask) tasks.push(retrainTask);

  for (const [index, ability] of abilityGaps.entries()) {
    if (!selfStudyModuleGateMet(ability, moduleEvidence)) continue;
    tasks.push(taskForAbility(ability, profile, 80 - index * 8));
  }

  if (profile.studyMode === "self") {
    const reviewBlock = plan.dailyTemplate[0];
    if (dueCount > 0) {
      tasks.push({
        id: TASK_IDS.openReviewRhythm,
        kind: "review",
        title: reviewBlock?.title ?? "复习",
        detail: reviewBlock?.detail ?? "先处理今天到期的内容。",
        href: "/review",
        minutes: reviewBlock?.minutes ?? Math.min(10, profile.minutesGoal),
        ability: plan.modules.slice(0, 2).map((module: any) => moduleToAbility(module.id)).filter(isAbilityId),
        source: "self",
        priority: 74,
        lane: "self",
        reason: "自学模式下，先把已经到期的复习放回今天。"
      });
    }
    const selectedModules = selectSelfStudyModules(plan.modules, progress, 2, outputEvidence);
    for (const [index, studyModule] of selectedModules.entries()) {
      const ability = moduleToAbility(studyModule.id);
      if (!ability) continue;
      const template = plan.dailyTemplate[index + 1] ?? plan.dailyTemplate[1];
      tasks.push({
        id: abilityTaskId(ability),
        kind: taskKindForAbility(ability),
        title: studyModule.title ?? "继续韩语自学",
        detail: studyModule.daily ?? template?.detail ?? "完成一个可记录的自学动作。",
        href: studyModule.href ?? hrefForStudyModule(studyModule.id),
        minutes: template?.minutes ?? Math.min(14, profile.minutesGoal),
        ability: [ability],
        source: "self",
        priority: 84 - index * 3,
        lane: "self",
        reason: `你的自学计划把“${studyModule.title}”排在前面。`
      });
    }
  }

  const readyMaterial = nextReadyImmersionMaterial(progress, outputEvidence);
  if (readyMaterial) {
    tasks.push({
      id: TASK_IDS.systemImmersion,
      kind: "immersion",
      title: "情境听读与复述",
      detail: `“${readyMaterial.title}”已经解锁。听写一句，再用韩语复述并保存改写。`,
      href: immersionMaterialHref(readyMaterial.id),
      minutes: Math.min(24, Math.max(14, readyMaterial.minutes)),
      ability: mapFocusToAbilities(readyMaterial.focus),
      source: "system",
      priority: profile.selfStudyGoal === "media" || profile.selfStudyGoal === "native" || ["m2", "m3", "m4"].includes(String(nextLesson?.milestone ?? "")) ? 88 : 66,
      lane: "bridge",
      reason: readyMaterial.recommendedLessons.length ? "前置课程已完成，可以开始这段听读。" : "先看看内容说明，前置课程完成后再正式练习。"
    });
  }

  const nativeTask = taskForNativeBridge(profile, progress, outputEvidence, nextLesson);
  if (nativeTask) tasks.push(nativeTask);

  return tasks
    .reduce(dedupeTasks, [] as StudyTask[])
    .map((task) => ({ ...task, completed: isTaskCompleted(task, progress, { dueCount, outputEvidence }) }))
    .sort((a, b) => Number(a.completed) - Number(b.completed) || b.priority - a.priority)
    .slice(0, 8);
}

function takeRecommendedTasks(taskPool: StudyTask[], limit = 6) {
  const eligible = taskPool.filter((task) => task.priority >= 55);
  const pinnedRetrain = eligible.filter((task) => String(task.id).startsWith("system:retrain-"));
  const rest = eligible.filter((task) => !String(task.id).startsWith("system:retrain-"));
  const room = Math.max(0, limit - pinnedRetrain.length);
  return [...rest.slice(0, room), ...pinnedRetrain].sort(
    (a, b) => Number(a.completed) - Number(b.completed) || b.priority - a.priority
  );
}

function isTaskCompleted(
  task: StudyTask,
  progress: LearningProgress,
  context: { dueCount?: number; outputEvidence?: OutputEvidenceInput } = {}
) {
  if (task.id === TASK_IDS.systemReview) return (context.dueCount ?? 0) <= 0 && progress.completedTasks[task.id] === todayKey();
  if (task.id === "system:native-bridge") return countNativePracticeEvidence(progress) >= 1;
  if (task.id.startsWith("system:library-")) {
    const nextLesson = getNextLesson(new Set(progress.completedLessons), progress.lessonScores);
    const gate = getLibraryGateForLesson(nextLesson, libraryCountsForWrite(progress));
    const key = task.id.slice("system:library-".length);
    return !gate.missing.some((gap) => gap.key === key);
  }
  if (task.id === TASK_IDS.systemPracticeRepair) return getWeakPracticeItems(progress).length === 0;
  if (task.id.startsWith("system:retrain-")) {
    const lessonId = task.id.slice("system:retrain-".length);
    const weak = getWeakPracticeItems(progress, 12).filter((item) => parseLessonReviewCardId(item.id)?.lessonId === lessonId);
    return weak.length < 3;
  }
  if (task.id === TASK_IDS.systemImmersion || task.id === TASK_IDS.openImmersion) {
    const materialId = materialIdFromImmersionHref(task.href);
    if (!materialId) return false;
    return getValidMaterialIds(progress, context.outputEvidence).includes(materialId);
  }
  if (task.id === TASK_IDS.openNextLesson) {
    const lessonId = lessonIdFromLearnHref(task.href);
    if (!lessonId) return false;
    return isLessonMastered(lessonId, new Set(progress.completedLessons), progress.lessonScores);
  }
  return progress.completedTasks[task.id] === todayKey();
}

function materialIdFromImmersionHref(href: string) {
  const match = href.match(/[?&]material=([^&]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

function lessonIdFromLearnHref(href: string) {
  const match = href.match(/\/learn\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

export function buildOpenStudyTasks(profile: UserProfile, progress: LearningProgress, nextLesson: any | null, outputEvidence: OutputEvidenceInput = { outputs: getOutputState().entries, srs: getSrsState() }): StudyTask[] {
  const plan = buildSelfStudyPlan(profile as any);
  const abilityEvidence = buildEvidenceBackedAbility(progress, outputEvidence);
  const weak = (Object.entries(abilityEvidence) as Array<[AbilityId, number]>).sort((a, b) => a[1] - b[1])[0]?.[0] ?? "script";
  const readyMaterial = nextReadyImmersionMaterial(progress, outputEvidence);
  const validMaterialIds = new Set(getValidMaterialIds(progress, outputEvidence));
  const previewMaterial = immersionMaterials.find((material) => !validMaterialIds.has(material.id)) ?? immersionMaterials[0];
  const mistakeSummary = summarizeMistakes(srsEvidenceFromInput(outputEvidence));
  const practiceRepairTask = taskForPracticeRepair(progress, 59);
  const retrainTask = taskForMasteredLessonRetrain(progress);
  const libraryCounts = libraryCountsForWrite(progress);
  const libraryGate = getLibraryGateForLesson(nextLesson, libraryCounts);
  const tasks: StudyTask[] = [
    nextLesson
      ? {
          id: TASK_IDS.openNextLesson,
          kind: "lesson",
          title: libraryGate.ok ? "继续主线课程" : "先补基础内容",
          detail: libraryGate.ok
            ? nextLesson.title
            : `「${nextLesson.title}」还差${libraryGate.missing.map((gap) => `${gap.label} ${gap.current}/${gap.target}`).join("、")}`,
          href: libraryGate.ok ? `/learn/${nextLesson.id}` : libraryGate.missing[0]?.href ?? `/learn/${nextLesson.id}`,
          minutes: nextLesson.duration ?? 15,
          ability: libraryGate.ok ? mapFocusToAbilities(nextLesson.focus) : [libraryGate.missing[0]?.ability ?? "script"],
          source: "guided",
          priority: libraryGate.ok ? 70 : 48,
          lane: "core",
          reason: libraryGate.ok ? "接着学习下一课。" : "补齐这一阶段所需内容后，再开始下一课。"
        }
      : {
          id: TASK_IDS.openReview,
          kind: "review",
          title: "主线课程已完成",
          detail: "继续复习、扩充词汇，并练习更自然的表达。",
          href: "/review",
          minutes: 12,
          ability: ["vocabulary"],
          source: "system",
          priority: 70,
          lane: "core",
          reason: "主线已完成，先保持复习节奏。"
        },
    { ...taskForAbility(weak, profile, 68), lane: "bridge" as const, reason: "先练当前最薄弱的一项。"},
    {
      id: TASK_IDS.openSelfPlan,
      kind: "checkpoint",
      title: `${plan.goal.title}规划`,
      detail: `${plan.durationWeeks} 周，${plan.intensity.title}强度，每周约 ${plan.weeklyHours} 小时。`,
      href: "/self-study",
      minutes: 5,
      ability: plan.modules.slice(0, 2).map((module: any) => moduleToAbility(module.id)).filter(isAbilityId),
      source: "self",
      priority: 60,
      lane: "self",
      reason: "保存方案后，首页会按这个节奏安排任务。",
      completionLabel: "今日已确认",
      completionAsset: "selfStudy"
    },
    {
      id: TASK_IDS.openImmersion,
      kind: "immersion",
      title: readyMaterial ? "开始情境听读" : "预览情境听读",
      detail: readyMaterial
        ? `“${readyMaterial.title}”已经解锁，可以开始听写、复述和改写。`
        : "前置课未完成时，可以看说明和留草稿；原文、朗读和保存功能会暂时关闭。",
      href: readyMaterial ? immersionMaterialHref(readyMaterial.id) : previewMaterial ? immersionMaterialHref(previewMaterial.id) : "/immersion",
      minutes: readyMaterial?.minutes ?? 18,
      ability: readyMaterial ? mapFocusToAbilities(readyMaterial.focus) : ["listening", "pragmatics", "native"],
      source: "system",
      priority: readyMaterial ? 62 : 42,
      lane: readyMaterial ? "bridge" : "expansion",
      reason: readyMaterial ? "前置课已完成，可以正式练习。" : "现在只作预览，不会计为完成。"
    },
    ...(practiceRepairTask ? [practiceRepairTask] : []),
    ...(retrainTask ? [retrainTask] : []),
    ...(mistakeSummary.total ? [{
      id: TASK_IDS.openMistakes,
      kind: "review" as const,
      title: "整理错题",
      detail: `共有 ${mistakeSummary.total} 张错题卡，其中 ${mistakeSummary.due} 张已经到期。先重练，再回到对应内容看讲解。`,
      href: "/mistakes",
      minutes: Math.min(12, Math.max(5, mistakeSummary.total * 2)),
      ability: ["vocabulary", "grammar", "listening"] as AbilityId[],
      source: "system" as const,
      priority: 58,
      lane: "bridge" as const,
      reason: "把反复出错的内容集中处理。"
    }] : []),
    {
      id: TASK_IDS.openQuiz,
      kind: "quiz",
      title: "综合测验",
      detail: "混合韩文、发音、词汇和语法，看看换个题型还能不能答对。",
      href: "/quiz",
      minutes: 10,
      ability: ["script", "listening", "vocabulary", "grammar"],
      source: "system",
      priority: 55,
      lane: "bridge",
      reason: "用一组混合题检查已经学过的内容。"
    }
  ];
  return tasks;
}

export function libraryCountsForWrite(progress: LearningProgress, outputEvidence: OutputEvidenceInput = { outputs: getOutputState().entries, srs: getSrsState() }): LibraryCounts {
  return {
    hangul: progress.masteredHangul.filter((id) => hangulIdSet.has(id)).length,
    vocab: progress.learnedVocab.filter((id) => vocabIdSet.has(id)).length,
    grammar: progress.learnedGrammar.filter((id) => grammarIdSet.has(id)).length,
    materials: getValidMaterialIds(progress, outputEvidence).length,
    native: countNativePracticeEvidence(progress)
  };
}

function nextReadyImmersionMaterial(progress: LearningProgress, outputEvidence: OutputEvidenceInput = { outputs: getOutputState().entries, srs: getSrsState() }) {
  const validMaterialIds = new Set(getValidMaterialIds(progress, outputEvidence));
  return immersionMaterials.find((material) => {
    return !validMaterialIds.has(material.id) && materialPrerequisitesMet(material, progress);
  }) ?? null;
}

function taskForAbility(ability: AbilityId, profile: UserProfile, priority: number): StudyTask {
  const map: Record<AbilityId, Omit<StudyTask, "id" | "ability" | "source" | "priority" | "completed">> = {
    script: {
      kind: "hangul",
      title: "韩文结构实验",
      detail: "用音节块和收音卡片把字形、口型、声音重新对齐。",
      href: "/hangul",
      minutes: Math.min(profile.minutesGoal, 12)
    },
    listening: {
      kind: "hangul",
      title: "最小对立听辨",
      detail: "集中处理 ㅓ/ㅗ、ㅡ/ㅜ、松音/紧音/送气音。",
      href: "/hangul#pairs",
      minutes: 10
    },
    vocabulary: {
      kind: "vocabulary",
      title: "用场景记词",
      detail: "听发音、看例句，再用这个词造一个自己的句子。",
      href: "/vocabulary",
      minutes: 12
    },
    grammar: {
      kind: "grammar",
      title: "用一个新句型",
      detail: "选一个语法骨架，替换主语、宾语、时间，造 3 个自己的句子。",
      href: "/grammar",
      minutes: 12
    },
    pragmatics: {
      kind: "native",
      title: "场景语用排练",
      detail: "按陌生人、朋友、前辈三种关系改写同一个意图。",
      href: "/native",
      minutes: 14
    },
    native: {
      kind: "native",
      title: "让表达更自然",
      detail: "把直接判断改成柔和、留余地、有上下文的韩语表达。",
      href: "/native#nuance",
      minutes: 14
    }
  };
  const reasonMap: Record<AbilityId, string> = {
    script: "先把字形、拼块和收音读稳，后面的输入才不发虚。",
    listening: "先补发音对立和听辨，避免之后只会看不会听。",
    vocabulary: "先积累能造句的词，减少孤立背词带来的断裂。",
    grammar: "先补句型骨架，后面的输出和复述才更顺。",
    pragmatics: "先把关系和场景带进表达，不然对话会显得机械。",
    native: "先练语气和关系距离，让表达更自然。"
  };
  return {
    id: abilityTaskId(ability),
    ability: [ability],
    source: "system",
    priority,
    lane: ability === "pragmatics" || ability === "native" ? "bridge" : "core",
    reason: reasonMap[ability],
    ...map[ability]
  };
}

function taskForNativeBridge(
  profile: UserProfile,
  progress: LearningProgress,
  outputEvidence: OutputEvidenceInput = { outputs: getOutputState().entries, srs: getSrsState() },
  nextLesson: { milestone?: string } | null = null
): StudyTask | null {
  const moduleEvidence = selfStudyModuleEvidence(progress, outputEvidence);
  if (!selfStudyModuleGateMet("native", moduleEvidence)) return null;
  const nativeEvidence = countNativePracticeEvidence(progress) + countCheckpointCredits(progress) + countValidOutputEvidence(outputEvidence);
  const milestone = String(nextLesson?.milestone ?? "");
  const priority = profile.selfStudyGoal === "native"
    ? 76
    : milestone === "m4" || milestone === "m3"
      ? 70
      : milestone === "m2"
        ? 60
        : 52;
  return {
    id: "system:native-bridge",
    kind: "native",
    title: "自然表达练习",
    detail: nativeEvidence > 0
      ? `已经保存 ${nativeEvidence} 条练习记录。继续换关系、换场景说同一个意思。`
      : "从一个常用场景开始，练习礼貌距离、语气和自然接话。",
    href: "/native",
    minutes: 14,
    ability: ["pragmatics", "native"],
    source: profile.selfStudyGoal === "native" ? "self" : "system",
    priority,
    lane: "bridge",
    reason: "自然表达需要在听读、复述和真实交流中反复练习。"
  };
}

type SelfStudyModule = { id: string; title?: string; daily?: string; href?: string };

function selectSelfStudyModules(modules: SelfStudyModule[], progress: LearningProgress, count = 2, outputEvidence: OutputEvidenceInput = { outputs: getOutputState().entries, srs: getSrsState() }) {
  const evidence = selfStudyModuleEvidence(progress, outputEvidence);
  const selected: SelfStudyModule[] = [];
  for (const studyModule of modules) {
    if (!selfStudyModuleGateMet(studyModule.id, evidence)) continue;
    const needed = studyModuleReadinessRequirement(studyModule.id);
    if ((evidence[studyModule.id] ?? 0) < needed) {
      selected.push(studyModule);
      if (selected.length >= count) return selected;
    }
  }
  const eligibleModules = modules.filter((studyModule) => selfStudyModuleGateMet(studyModule.id, evidence));
  const continuationPool = eligibleModules.filter((studyModule) => !["script", "listening"].includes(studyModule.id));
  const pool = continuationPool.length ? continuationPool : eligibleModules.length ? eligibleModules : modules;
  const ranked = [...pool].sort((a, b) => {
    const evidenceDelta = (evidence[a.id] ?? 0) - (evidence[b.id] ?? 0);
    if (evidenceDelta) return evidenceDelta;
    return modules.findIndex((item) => item.id === a.id) - modules.findIndex((item) => item.id === b.id);
  });
  return ranked.slice(0, count);
}

function selfStudyModuleEvidence(progress: LearningProgress, outputEvidence: OutputEvidenceInput = { outputs: getOutputState().entries, srs: getSrsState() }): Record<string, number> {
  const ability = buildEvidenceBackedAbility(progress, outputEvidence);
  const validMaterialEntries = countValidMaterialEvidence(progress, outputEvidence);
  const validOutputEntries = countValidOutputEvidence(outputEvidence);
  return {
    lessons: progress.completedLessons.length,
    script: ability.script,
    listening: ability.listening,
    vocabulary: ability.vocabulary,
    grammar: ability.grammar,
    pragmatics: ability.pragmatics,
    native: ability.native,
    media: validMaterialEntries * 3,
    materials: validMaterialEntries,
    outputs: validOutputEntries,
    checkpoints: countCheckpointCredits(progress)
  };
}

function selfStudyModuleGateMet(moduleId: string, evidence: Record<string, number>) {
  if (moduleId === "pragmatics") {
    return (evidence.lessons ?? 0) >= 6 && (evidence.vocabulary ?? 0) >= 12 && (evidence.grammar ?? 0) >= 6;
  }
  if (moduleId === "native") {
    const formalBridgeEvidence =
      (evidence.materials ?? 0) >= 1 ||
      (evidence.outputs ?? 0) >= 1 ||
      (evidence.checkpoints ?? 0) >= 2 ||
      (evidence.native ?? 0) > 0;
    return (
      (evidence.lessons ?? 0) >= 10 &&
      (evidence.vocabulary ?? 0) >= 18 &&
      (evidence.grammar ?? 0) >= 12 &&
      (evidence.pragmatics ?? 0) >= 6 &&
      formalBridgeEvidence
    );
  }
  return true;
}

function taskKindForAbility(ability: AbilityId): StudyTask["kind"] {
  if (ability === "script" || ability === "listening") return "hangul";
  if (ability === "vocabulary") return "vocabulary";
  if (ability === "grammar") return "grammar";
  if (ability === "pragmatics" || ability === "native") return "native";
  return "checkpoint";
}

export function lessonAbilitiesWithEvidence(lesson: any, hasListeningEvidence: boolean) {
  const abilities = mapFocusToAbilities(lesson?.focus);
  return hasListeningEvidence ? abilities : abilities.filter((ability) => ability !== "listening");
}

export function lessonAbilityDelta(score: number) {
  return score >= 85 ? 9 : score >= 65 ? 6 : score > 0 ? 3 : 0;
}

export function hasCheckpointStudyBasis(progress: LearningProgress) {
  return progress.completedLessons.length > 0
    || progress.masteredHangul.length > 0
    || progress.learnedVocab.length > 0
    || progress.learnedGrammar.length > 0
    || Object.keys(progress.practiceItems ?? {}).length > 0;
}

export function validateCheckpointEvidence(evidence: string, progress?: LearningProgress) {
  const clean = evidence.trim();
  if (clean.length < 6 || !checkpointSignalPattern.test(clean) || !checkpointMeasurementPattern.test(clean)) return false;
  if (!progress) return true;
  return countHangulSyllables(clean) >= 2 && hasCheckpointStudyBasis(progress);
}

export function mapLessonCardToAbilities(itemId: string): AbilityId[] {
  const lesson = findLessonByReviewItemId(itemId);
  return mapFocusToAbilities(lesson?.focus);
}

function findLessonByReviewItemId(itemId: string) {
  const parsed = parseLessonReviewCardId(itemId);
  const parsedLesson = parsed ? lessons.find((item: any) => item.id === parsed.lessonId) : null;
  if (parsedLesson) return parsedLesson;
  return lessons.find((lesson: any) => {
    return (lesson.drills ?? []).some((drill: any, index: number) => {
      return (drill.id ?? lessonReviewCardId(lesson.id, index)) === itemId;
    });
  });
}

export function mapQuestionToAbilities(questionId: string): AbilityId[] {
  if (hasQuestionPrefix(questionId, "lesson")) return mapLessonCardToAbilities(questionId);
  if (hasQuestionPrefix(questionId, "hangul")) return ["script"];
  if (hasQuestionPrefix(questionId, "pronunciation")) return ["listening"];
  if (hasQuestionPrefix(questionId, "soundChange")) return ["listening"];
  if (hasQuestionPrefix(questionId, "vocab")) return ["vocabulary"];
  if (hasQuestionPrefix(questionId, "grammar")) return ["grammar"];
  if (hasQuestionPrefix(questionId, "nativePragmatics")) return ["pragmatics"];
  if (hasQuestionPrefix(questionId, "nativeNuance")) return ["native"];
  if (hasQuestionPrefix(questionId, "materialRetell")) return ["listening", "pragmatics", "native"];
  if (hasQuestionPrefix(questionId, "outputTransfer")) return ["grammar", "pragmatics", "native"];
  if (hasCardPrefix(questionId, "hangul")) return ["script"];
  if (hasCardPrefix(questionId, "pronunciation")) return ["listening"];
  if (hasCardPrefix(questionId, "vocab")) return ["vocabulary"];
  if (hasCardPrefix(questionId, "grammar")) return ["grammar"];
  if (hasCardPrefix(questionId, "output")) return ["grammar", "pragmatics", "native"];
  if (hasCardPrefix(questionId, "material")) return ["listening", "pragmatics", "native"];
  if (hasCardPrefix(questionId, "soundChange")) return ["listening"];
  if (hasCardPrefix(questionId, "native") && questionId.includes(":pragmatics:")) return ["pragmatics"];
  if (hasCardPrefix(questionId, "native") && questionId.includes(":nuance:")) return ["native"];
  return ["grammar"];
}

function buildEvidenceBackedAbility(progress: LearningProgress, outputEvidence: OutputEvidenceInput = { outputs: getOutputState().entries, srs: getSrsState() }): Record<AbilityId, number> {
  const ability = defaultProgress().ability;
  addAbilityEvidence(ability, {
    script: progress.masteredHangul.length,
    vocabulary: progress.learnedVocab.length,
    grammar: progress.learnedGrammar.length * 3,
    pragmatics: countNativePracticeEvidence(progress, "pragmatics") * 4,
    native: countNativePracticeEvidence(progress, "nuance") * 4
  });
  for (const lessonId of progress.completedLessons) {
    const lesson = lessons.find((item: any) => item.id === lessonId);
    if (!lesson) continue;
    addAbilityEvidenceForIds(
      ability,
      lessonAbilitiesWithEvidence(lesson, progress.lessonListeningEvidence[lessonId] === true),
      lessonAbilityDelta(progress.lessonScores[lessonId] ?? UNLOCK_SCORE)
    );
  }
  const validMaterialEntries = countValidMaterialEvidence(progress, outputEvidence);
  addAbilityEvidence(ability, {
    listening: validMaterialEntries * 2,
    pragmatics: validMaterialEntries * 2,
    native: validMaterialEntries * 2
  });
  const validOutputEntries = countValidOutputEvidence(outputEvidence);
  addAbilityEvidence(ability, {
    grammar: validOutputEntries * 2,
    pragmatics: validOutputEntries * 2,
    native: validOutputEntries * 2
  });
  addAbilityEvidence(ability, abilityFromEvents(progress.abilityEvents));
  return ability;
}

function abilityFromEvents(events: LearningProgress["abilityEvents"] = {}) {
  const result: Partial<Record<AbilityId, number>> = {};
  for (const [eventId, value] of Object.entries(events)) {
    if (isEntityBackedAbilityEvent(eventId) || eventId.startsWith("checkpoint:")) continue;
    const explicitAbilities = isRecord(value)
      ? abilityIds.filter((ability) => Number(value[ability] ?? 0) > 0)
      : [];
    const abilities = explicitAbilities.length ? explicitAbilities : abilitiesForEventId(eventId);
    if (!abilities.length) continue;
    const applied = normalizeAbilityEventValue(value, abilities);
    for (const ability of abilities) {
      result[ability] = (result[ability] ?? 0) + (applied[ability] ?? 0);
    }
  }
  return result;
}

function abilitiesForEventId(eventId: string): AbilityId[] {
  if (eventId.startsWith("pronunciation:")) return ["listening"];
  if (eventId.startsWith("soundChange:")) return ["listening"];
  if (eventId.startsWith("review:")) {
    const cardId = eventId.slice("review:".length).split(":").slice(0, -1).join(":");
    return mapQuestionToAbilities(cardId.startsWith("mistake:") ? cardId.slice("mistake:".length) : cardId);
  }
  if (eventId.startsWith("quiz:") && !eventId.endsWith(":transfer")) {
    const questionId = questionIdFromQuizEvent(eventId);
    return questionId ? mapQuestionToAbilities(questionId) : [];
  }
  return [];
}

function isEntityBackedAbilityEvent(eventId: string) {
  return eventId.startsWith("hangul:") ||
    eventId.startsWith("vocab:") ||
    eventId.startsWith("grammar:") ||
    eventId.startsWith("nativeEvidence:") ||
    eventId.startsWith("material:") ||
    eventId.startsWith("output:") ||
    eventId.startsWith("lesson:");
}

function questionIdFromQuizEvent(eventId: string) {
  const prefixes = ["lesson:", "hq:", "pq:", "vq:", "gq:", "nq:", "mq:", "oq:", "scq:"];
  const markerIndex = Math.max(...prefixes.map((prefix) => eventId.lastIndexOf(`:${prefix}`)));
  return markerIndex >= 0 ? eventId.slice(markerIndex + 1) : "";
}

function addAbilityEvidence(ability: Record<AbilityId, number>, values: Partial<Record<AbilityId, number>>) {
  for (const id of abilityIds) {
    ability[id] = Math.min(100, ability[id] + Math.max(0, Number(values[id] ?? 0)));
  }
}

function addAbilityEvidenceForIds(ability: Record<AbilityId, number>, ids: AbilityId[], delta: number) {
  for (const id of [...new Set(ids)].filter(isAbilityId)) {
    ability[id] = Math.min(100, ability[id] + Math.max(0, delta));
  }
}

export function isAbilityId(value: unknown): value is AbilityId {
  return abilityIds.includes(value as AbilityId);
}

function dedupeTasks(tasks: StudyTask[], task: StudyTask) {
  const existingIndex = tasks.findIndex((item) => item.id === task.id);
  if (existingIndex === -1) return [...tasks, task];
  if (task.priority > tasks[existingIndex].priority) {
    const next = [...tasks];
    next[existingIndex] = task;
    return next;
  }
  return tasks;
}

function practiceSeenAtMs(value: string) {
  const parsed = Date.parse(value || "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeCheckpointPart(input: string) {
  return input.trim().replace(/\s+/g, " ");
}

export function normalizeAbilityEventValue(value: unknown, abilities: AbilityId[]): Partial<Record<AbilityId, number>> {
  if (isRecord(value)) {
    const result: Partial<Record<AbilityId, number>> = {};
    for (const ability of abilities) {
      const applied = clampNumber(value[ability], 0, 100, 0);
      if (applied > 0) result[ability] = applied;
    }
    return result;
  }
  const legacyValue = clampNumber(value, 0, 100, 0);
  return Object.fromEntries(abilities.map((ability) => [ability, legacyValue])) as Partial<Record<AbilityId, number>>;
}
