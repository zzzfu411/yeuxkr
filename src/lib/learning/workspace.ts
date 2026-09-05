import { isAbilityId, validateCheckpointEvidence, materialPrerequisitesMet, checkpointCreditKey, hasValidOutputEvidence, buildOpenStudyTasks, libraryCountsForWrite, mapQuestionToAbilities, type OutputEvidenceInput, getValidMaterialIds, countNativePracticeEvidence, lessonAbilitiesWithEvidence, lessonAbilityDelta, normalizeAbilityEventValue, mapLessonCardToAbilities } from "./workspace-snapshot.ts";
import { abilityLabels, normalizeLearningProgress, hangulIdSet, vocabIdSet, grammarIdSet, nativeIdSet, type NativeEvidenceInput, normalizeNativeEvidenceEntry, hasCompleteNativePracticeEvidence, normalizeMaterialSelfCheck, isRecord, abilityIds, materialIdSet, normalizeUserProfile, lessonIdSet, hasListeningFocus, normalizePracticeItemId, clampNumber } from "./progress-normalization.ts";

import { lessons, getNextLesson, getLessonPrerequisites, UNLOCK_SCORE } from "../../data/curriculum-runtime.js";
import { hangulGroups, pronunciationPairs } from "../../data/hangul.js";
import { vocab } from "../../data/lexicon.js";
import { grammarPoints } from "../../data/grammar.js";
import { pragmaticScenarios } from "../../data/pragmatics.js";
import { nuanceSets } from "../../data/nuance.js";
import { soundChangeRules } from "../../data/sound-changes.js";
import { immersionMaterials } from "../../data/materials.ts";

import { CAPSTONE_LESSON_ID, isValidCapstoneEvidence, normalizeCapstoneEvidence } from "./capstone.ts";
import { hasKoreanDictationEvidence, hasKoreanOutputRewrite, hasKoreanRetellEvidence, hasKoreanText as hasKoreanEvidenceText, hasMaterialOutputEvidence, mapFocusToAbilities } from "./evidence.ts";
import { assessLessonAttempt } from "./lesson-assessment.ts";
import { checkLessonTaskEvidence, lessonCompletionTask, normalizeLessonTaskEvidence } from "./lesson-evidence.ts";
import { defaultProfile, defaultProgress, nowIso, readJson, STORAGE_KEYS, todayKey, writeJson } from "./storage.ts";
import { addOutputEntry, clearOutputEntriesByMaterial, defaultOutputState, getOutputState, saveOutputState, type OutputEntry } from "./output.ts";
import { applyDeferToState, applyGradeToState, defaultSrsState, ensureCard, getDueCardsFromState, getSrsState, removeCard, saveSrsState, type SrsCard, type SrsState } from "./srs.ts";
import { defaultLessonPracticeState, getLessonPracticeState, saveLessonPracticeState } from "./lesson-session.ts";
import { defaultLearningDraftState, getLearningDraftState, saveLearningDraftState } from "./drafts.ts";
import { defaultNativePortfolioState, normalizeNativePortfolioState } from "./native-portfolio.ts";
import { clearLearningRecordings } from "./recordings.ts";

import { getLibraryGateForLesson, type LibraryCounts } from "./path-gates.ts";
import { TASK_IDS, checkpointTaskId, grammarCardId, grammarQuestionId, hangulCardId, hangulQuestionId, lessonReviewCardId, lessonTaskId, materialCardId, materialEvidenceEventId, materialRetellQuestionId, mistakeCardId, nativeCardId, nativeNuanceQuestionId, nativePragmaticsQuestionId, outputCardId, outputEvidenceEventId, outputTransferQuestionId, parseLessonReviewCardId, pronunciationCardId, pronunciationQuestionId, quizQuestionEvidenceEventId, quizTransferEvidenceEventId, reviewEvidenceEventId, soundChangeCardId, soundChangeQuestionId, taskEventId, vocabCardId, vocabClozeQuestionId, vocabDictationQuestionId, vocabQuestionId } from "./ids.ts";
import type { AbilityId, CapstoneEvidence, LearningProgress, StudyTask, UserProfile } from "@/lib/learning/types";

export const ABILITY_LABELS = abilityLabels;

type SrsCardSnapshot = { id: string; previous: SrsCard | null; history: SrsState["history"] };
type LessonReviewCardResult = string[] & { created: string[]; updated: string[]; previous: Record<string, SrsCard>; failed: boolean };
export type OutputArchiveInput = Omit<OutputEntry, "id" | "createdAt">;
export type LessonAnswerCommitEntry = {
  question: {
    id: string;
    type?: "choice" | "listen" | "type" | "dictation" | "cloze" | "translate";
    prompt?: string;
    answer?: string;
    acceptable?: string[];
    choices?: string[];
    explain?: string;
    speak?: string;
    clozeText?: string;
    hint?: string;
  };
  correct: boolean;
  skipped?: boolean;
};

export function applyCheckpointCompletion(progress: LearningProgress, checkpointId: string, evidence: string, abilities: AbilityId[]) {
  const current = normalizeLearningProgress(progress);
  const cleanCheckpointId = checkpointId.trim();
  const cleanEvidence = evidence.trim();
  const cleanAbilities = [...new Set(abilities)].filter(isAbilityId);
  if (!cleanCheckpointId || !validateCheckpointEvidence(cleanEvidence, current) || !cleanAbilities.length) {
    return { next: current, completed: false };
  }
  const evidenceFingerprint = checkpointEvidenceFingerprint(cleanEvidence);
  const reusesAnotherCheckpoint = Object.entries(current.checkpointEvidence).some(([id, previousEvidence]) => (
    id !== cleanCheckpointId && checkpointEvidenceFingerprint(previousEvidence) === evidenceFingerprint
  ));
  if (reusesAnotherCheckpoint) return { next: current, completed: false };
  const set = new Set(current.completedCheckpoints);
  set.add(cleanCheckpointId);
  const next = {
    ...current,
    completedCheckpoints: [...set],
    checkpointEvidence: { ...current.checkpointEvidence, [cleanCheckpointId]: cleanEvidence },
    completedTasks: { ...current.completedTasks, [checkpointTaskId(cleanCheckpointId)]: todayKey() }
  };
  markTaskDone(next, TASK_IDS.openSelfPlan);
  bumpStreak(next);
  return { next, completed: true };
}

export function toggleHangulItem(itemId: string, fallbackProgress: LearningProgress = defaultProgress()) {
  if (!hangulIdSet.has(itemId)) return false;
  const current = normalizeLearningProgress(readJson(STORAGE_KEYS.progress, fallbackProgress));
  const set = new Set(current.masteredHangul);
  let added = false;
  const removeIds = hangulRemovalCardIds(itemId);
  const snapshots = removeIds.map(snapshotSrsCard);
  if (set.has(itemId)) {
    set.delete(itemId);
    if (!removeCardsAndDerivedMistakesOrRollback(removeIds, snapshots)) return false;
  }
  else {
    added = true;
    set.add(itemId);
    if (!ensureSrsCardOrRollback(hangulCardId(itemId), { kind: "hangul", itemId }, snapshots)) return false;
  }
  const next = mutableProgress(current, { masteredHangul: [...set] });
  if (added) {
    bumpStreak(next);
    markTaskDone(next, "ability:script");
    recordAbilityEvent(next, `hangul:${itemId}`, ["script"], 1);
  } else {
    removeAbilityEvent(next, `hangul:${itemId}`, ["script"]);
    clearTaskDoneIfNoRemainingEvidence(next, "ability:script");
  }
  if (!saveLearningProgress(next)) {
    rollbackSrsCardSnapshots(snapshots);
    return false;
  }
  return true;
}

export function togglePronunciationPair(itemId: string, fallbackProgress: LearningProgress = defaultProgress()) {
  const pair = pronunciationPairs.find((item: any) => item.id === itemId);
  if (!pair) return false;
  const current = normalizeLearningProgress(readJson(STORAGE_KEYS.progress, fallbackProgress));
  const cardId = pronunciationCardId(itemId);
  const removeIds = pronunciationRemovalCardIds(itemId);
  const snapshots = removeIds.map(snapshotSrsCard);
  if (snapshots[0]?.previous) {
    if (!removeCardsAndDerivedMistakesOrRollback(removeIds, snapshots)) return false;
  } else if (!ensureSrsCardOrRollback(cardId, {
    kind: "pronunciation",
    itemId,
    type: "choice",
    prompt: `${pair.a} vs ${pair.b}: 训练重点是什么？`,
    answer: pair.focus,
    choices: pronunciationPairs.map((item: any) => item.focus),
    explain: pair.tip,
    speak: `${pair.a}. ${pair.b}`
  }, snapshots)) return false;

  const next = mutableProgress(current);
  if (snapshots[0]?.previous) {
    removeAbilityEvent(next, `pronunciation:${itemId}`, ["listening"]);
    clearTaskDoneIfNoRemainingEvidence(next, "ability:listening");
  } else {
    bumpStreak(next);
    markTaskDone(next, "ability:listening");
    recordAbilityEvent(next, `pronunciation:${itemId}`, ["listening"], 2);
  }
  if (!saveLearningProgress(next)) {
    rollbackSrsCardSnapshots(snapshots);
    return false;
  }
  return true;
}

export function toggleSoundChangeRule(ruleId: string, fallbackProgress: LearningProgress = defaultProgress()) {
  const rule = soundChangeRules.find((item: any) => item.id === ruleId);
  if (!rule) return false;
  const current = normalizeLearningProgress(readJson(STORAGE_KEYS.progress, fallbackProgress));
  const cardId = soundChangeCardId(ruleId);
  const removeIds = soundChangeRemovalCardIds(ruleId);
  const snapshots = removeIds.map(snapshotSrsCard);
  const example = rule.examples[0];
  if (snapshots[0]?.previous) {
    if (!removeCardsAndDerivedMistakesOrRollback(removeIds, snapshots)) return false;
  } else if (!ensureSrsCardOrRollback(cardId, {
    kind: "soundChange",
    itemId: ruleId,
    type: "choice",
    prompt: `${rule.title}（${rule.korean}）：${example.written} 实际读作哪一个？`,
    answer: example.spoken,
    choices: rule.examples.map((item: any) => item.spoken),
    explain: `${rule.rule}。`,
    speak: example.speak
  }, snapshots)) return false;

  const next = mutableProgress(current);
  if (snapshots[0]?.previous) {
    removeAbilityEvent(next, `soundChange:${ruleId}`, ["listening"]);
    clearTaskDoneIfNoRemainingEvidence(next, "ability:listening");
  } else {
    bumpStreak(next);
    markTaskDone(next, "ability:listening");
    recordAbilityEvent(next, `soundChange:${ruleId}`, ["listening"], 2);
  }
  if (!saveLearningProgress(next)) {
    rollbackSrsCardSnapshots(snapshots);
    return false;
  }
  return true;
}

export function toggleVocabItem(itemId: string, fallbackProgress: LearningProgress = defaultProgress()) {
  if (!vocabIdSet.has(itemId)) return false;
  const current = normalizeLearningProgress(readJson(STORAGE_KEYS.progress, fallbackProgress));
  const set = new Set(current.learnedVocab);
  let added = false;
  const removeIds = vocabRemovalCardIds(itemId);
  const snapshots = removeIds.map(snapshotSrsCard);
  if (set.has(itemId)) {
    set.delete(itemId);
    if (!removeCardsAndDerivedMistakesOrRollback(removeIds, snapshots)) return false;
  }
  else {
    added = true;
    set.add(itemId);
    if (!ensureSrsCardOrRollback(vocabCardId(itemId), { kind: "vocab", itemId }, snapshots)) return false;
  }
  const next = mutableProgress(current, { learnedVocab: [...set] });
  if (added) {
    bumpStreak(next);
    markTaskDone(next, "ability:vocabulary");
    recordAbilityEvent(next, `vocab:${itemId}`, ["vocabulary"], 1);
  } else {
    removeAbilityEvent(next, `vocab:${itemId}`, ["vocabulary"]);
    clearTaskDoneIfNoRemainingEvidence(next, "ability:vocabulary");
  }
  if (!saveLearningProgress(next)) {
    rollbackSrsCardSnapshots(snapshots);
    return false;
  }
  return true;
}

export function toggleGrammarPoint(itemId: string, fallbackProgress: LearningProgress = defaultProgress()) {
  if (!grammarIdSet.has(itemId)) return false;
  const current = normalizeLearningProgress(readJson(STORAGE_KEYS.progress, fallbackProgress));
  const set = new Set(current.learnedGrammar);
  let added = false;
  const snapshots = grammarRemovalCardIds(itemId).map(snapshotSrsCard);
  if (set.has(itemId)) {
    set.delete(itemId);
    if (!removeExistingSrsCardsOrRollback(snapshots)) return false;
  }
  else {
    added = true;
    set.add(itemId);
    if (!ensureSrsCardOrRollback(grammarCardId(itemId), { kind: "grammar", itemId }, snapshots)) return false;
  }
  const next = mutableProgress(current, { learnedGrammar: [...set] });
  if (added) {
    bumpStreak(next);
    markTaskDone(next, "ability:grammar");
    recordAbilityEvent(next, `grammar:${itemId}`, ["grammar"], 2);
  } else {
    removeAbilityEvent(next, `grammar:${itemId}`, ["grammar"]);
    clearTaskDoneIfNoRemainingEvidence(next, "ability:grammar");
  }
  if (!saveLearningProgress(next)) {
    rollbackSrsCardSnapshots(snapshots);
    return false;
  }
  return true;
}

export function ensureHangulItemMastered(itemId: string, fallbackProgress: LearningProgress = defaultProgress()) {
  if (!hangulIdSet.has(itemId)) return false;
  const current = normalizeLearningProgress(readJson(STORAGE_KEYS.progress, fallbackProgress));
  const cardId = hangulCardId(itemId);
  if (!current.masteredHangul.includes(itemId)) return toggleHangulItem(itemId, current);
  if (getSrsState().cards[cardId]) return true;
  return Boolean(ensureCard(cardId, { kind: "hangul", itemId }));
}

export function ensurePronunciationPairMastered(itemId: string, fallbackProgress: LearningProgress = defaultProgress()) {
  if (!pronunciationPairs.some((item: any) => item.id === itemId)) return false;
  if (getSrsState().cards[pronunciationCardId(itemId)]) return true;
  return togglePronunciationPair(itemId, fallbackProgress);
}

export function ensureSoundChangeRuleMastered(ruleId: string, fallbackProgress: LearningProgress = defaultProgress()) {
  if (!soundChangeRules.some((item: any) => item.id === ruleId)) return false;
  if (getSrsState().cards[soundChangeCardId(ruleId)]) return true;
  return toggleSoundChangeRule(ruleId, fallbackProgress);
}

export function ensureVocabItemMastered(itemId: string, fallbackProgress: LearningProgress = defaultProgress()) {
  if (!vocabIdSet.has(itemId)) return false;
  const current = normalizeLearningProgress(readJson(STORAGE_KEYS.progress, fallbackProgress));
  const cardId = vocabCardId(itemId);
  if (!current.learnedVocab.includes(itemId)) return toggleVocabItem(itemId, current);
  if (getSrsState().cards[cardId]) return true;
  return Boolean(ensureCard(cardId, { kind: "vocab", itemId }));
}

export function ensureGrammarPointMastered(itemId: string, fallbackProgress: LearningProgress = defaultProgress()) {
  if (!grammarIdSet.has(itemId)) return false;
  const current = normalizeLearningProgress(readJson(STORAGE_KEYS.progress, fallbackProgress));
  const cardId = grammarCardId(itemId);
  if (!current.learnedGrammar.includes(itemId)) return toggleGrammarPoint(itemId, current);
  if (getSrsState().cards[cardId]) return true;
  return Boolean(ensureCard(cardId, { kind: "grammar", itemId }));
}

export function toggleNativeItem(itemId: string, fallbackProgress: LearningProgress = defaultProgress()) {
  if (!nativeIdSet.has(itemId)) return false;
  const current = normalizeLearningProgress(readJson(STORAGE_KEYS.progress, fallbackProgress));
  const set = new Set(current.learnedNative);
  if (!set.has(itemId)) return false;
  const removeIds = nativeRemovalCardIds(itemId);
  const snapshots = removeIds.map(snapshotSrsCard);
  set.delete(itemId);
  if (!removeCardsAndDerivedMistakesOrRollback(removeIds, snapshots)) return false;
  const next = mutableProgress(current, { learnedNative: [...set] });
  removeAbilityEvent(next, `native:${itemId}`, itemId.startsWith("pragmatics:") ? ["pragmatics"] : ["native"]);
  if (!saveLearningProgress(next)) {
    rollbackSrsCardSnapshots(snapshots);
    return false;
  }
  return true;
}

export function saveNativePracticeEvidence(itemId: string, evidence: NativeEvidenceInput, fallbackProgress: LearningProgress = defaultProgress()) {
  if (!nativeIdSet.has(itemId)) return false;
  const normalized = normalizeNativeEvidenceEntry(evidence);
  if (!hasCompleteNativePracticeEvidence(normalized, itemId)) return false;
  const current = normalizeLearningProgress(readJson(STORAGE_KEYS.progress, fallbackProgress));
  const learned = new Set(current.learnedNative);
  learned.add(itemId);
  const snapshots = [snapshotSrsCard(nativeCardId(itemId))];
  if (!ensureSrsCardOrRollback(nativeCardId(itemId), { kind: "native", itemId }, snapshots)) return false;
  const abilities: AbilityId[] = itemId.startsWith("pragmatics:") ? ["pragmatics"] : ["native"];
  const taskId = itemId.startsWith("pragmatics:") ? "ability:pragmatics" : "ability:native";
  const next = mutableProgress(current, {
    learnedNative: [...learned],
    nativeEvidence: {
      ...current.nativeEvidence,
      [itemId]: normalized
    }
  });
  bumpStreak(next);
  markTaskDone(next, taskId);
  recordAbilityEvent(next, `nativeEvidence:${itemId}`, abilities, 3);
  if (!saveLearningProgress(next)) {
    rollbackSrsCardSnapshots(snapshots);
    return false;
  }
  return true;
}

export function persistOutputReview(progress: LearningProgress, itemId: string, prompt: string, answer: string) {
  const cleanId = itemId.trim();
  const cleanPrompt = prompt.trim();
  const cleanAnswer = answer.trim();
  if (!cleanId || cleanPrompt.length < 4 || !hasKoreanOutputRewrite(cleanAnswer)) return false;
  const current = normalizeLearningProgress(progress);
  const cardId = outputCardId(cleanId);
  const outputCardSnapshot = snapshotSrsCard(cardId);
  if (!ensureCard(cardId, { kind: "output", itemId: cleanId, prompt: cleanPrompt, answer: cleanAnswer })) {
    rollbackSrsCardSnapshot(outputCardSnapshot);
    return false;
  }
  if (!getSrsState().cards[cardId]) {
    rollbackSrsCardSnapshot(outputCardSnapshot);
    return false;
  }
  const next = { ...current };
  bumpStreak(next);
  recordAbilityEvent(next, outputEvidenceEventId(cleanId), ["grammar", "pragmatics", "native"], 2);
  if (!saveLearningProgress(next)) {
    rollbackSrsCardSnapshot(outputCardSnapshot);
    return false;
  }
  return true;
}

export function saveOutputArchiveEntry(input: OutputArchiveInput, fallbackProgress: LearningProgress = defaultProgress()) {
  const material = immersionMaterials.find((item) => item.id === input.materialId);
  const draft = input.draft.trim();
  const weakPoint = input.weakPoint.trim();
  const targetRewrite = input.targetRewrite.trim();
  if (!material || !hasMaterialOutputEvidence({ ...input, draft, weakPoint, targetRewrite }, material)) return null;

  const entry = addOutputEntry({
    ...input,
    materialTitle: input.materialTitle.trim() || material.title,
    mission: input.mission.trim() || material.outputMission,
    draft,
    weakPoint,
    targetRewrite,
    rubric: [...new Set(input.rubric.map(String).filter((item) => item.trim()))]
  });
  if (!entry) return null;

  void fallbackProgress;
  return entry;
}

export function completeMaterialEvidence(itemId: string, evidence?: { dictation?: string; retell?: string; selfCheck?: string[]; outputEntryId?: string }, fallbackProgress: LearningProgress = defaultProgress()) {
  const current = normalizeLearningProgress(readJson(STORAGE_KEYS.progress, fallbackProgress));
  const material = immersionMaterials.find((item) => item.id === itemId);
  const dictation = evidence?.dictation?.trim() ?? current.materialEvidence[itemId]?.dictation ?? "";
  const retell = evidence?.retell?.trim() ?? current.materialEvidence[itemId]?.retell ?? "";
  const selfCheck = normalizeMaterialSelfCheck(evidence?.selfCheck ?? current.materialEvidence[itemId]?.selfCheck, material);
  const outputEntryId = evidence?.outputEntryId?.trim() ?? current.materialEvidence[itemId]?.outputEntryId ?? "";
  const outputState = getOutputState();
  const selectedOutput = outputState.entries.find((entry) => entry.materialId === itemId && entry.id === outputEntryId && hasMaterialOutputEvidence(entry, material));
  const sourceLines = material?.lines?.map((line) => line.ko) ?? [];
  if (!material || !materialPrerequisitesMet(material, current) || !hasKoreanDictationEvidence(dictation, material.dictation) || !hasKoreanRetellEvidence(retell, sourceLines) || selfCheck.length < material.selfCheck.length || !selectedOutput) return false;
  const set = new Set(current.completedMaterials);
  set.add(itemId);
  const next = { ...current, completedMaterials: [...set], materialEvidence: { ...current.materialEvidence } };
  next.materialEvidence[itemId] = { dictation, retell, selfCheck, outputEntryId: selectedOutput.id, updatedAt: nowIso() };
  const materialReviewCardId = materialCardId(itemId);
  const materialCardSnapshot = snapshotSrsCard(materialReviewCardId);
  const outputReviewCardId = outputCardId(selectedOutput.id);
  const outputCardSnapshot = snapshotSrsCard(outputReviewCardId);
  if (!ensureCard(materialReviewCardId, {
    kind: "material",
    itemId,
    type: "type",
    prompt: material?.retellPrompts?.[0] ? `${material.title}: ${material.retellPrompts[0]}` : "用韩语复述这段材料的核心信息。",
    answer: retell || material?.lines?.[0]?.ko || material?.title || itemId,
    acceptable: [retell, ...(material?.lines?.map((line) => line.ko) ?? [])].filter(Boolean),
    explain: material ? `复述重点：${material.summary}` : undefined,
    speak: material?.lines?.map((line) => line.ko).join(" ")
  })) {
    rollbackSrsCardSnapshot(materialCardSnapshot);
    return false;
  }
  if (!ensureCard(outputReviewCardId, {
    kind: "output",
    itemId: selectedOutput.id,
    prompt: `根据弱点重写一句更自然的韩语：${selectedOutput.weakPoint}`,
    answer: selectedOutput.targetRewrite
  })) {
    rollbackSrsCardSnapshots([materialCardSnapshot, outputCardSnapshot]);
    return false;
  }
  if (getSrsState().cards[materialReviewCardId]?.payload.kind !== "material") {
    rollbackSrsCardSnapshots([materialCardSnapshot, outputCardSnapshot]);
    return false;
  }
  if (getSrsState().cards[outputReviewCardId]?.payload.kind !== "output") {
    rollbackSrsCardSnapshots([materialCardSnapshot, outputCardSnapshot]);
    return false;
  }
  bumpStreak(next);
  markTaskDone(next, TASK_IDS.systemImmersion);
  markTaskDone(next, TASK_IDS.openImmersion);
  recordAbilityEvent(next, materialEvidenceEventId(itemId), mapFocusToAbilities(material?.focus), 3);
  recordAbilityEvent(next, outputEvidenceEventId(selectedOutput.id), ["grammar", "pragmatics", "native"], 2);
  if (!saveLearningProgress(next)) {
    rollbackSrsCardSnapshots([materialCardSnapshot, outputCardSnapshot]);
    return false;
  }
  return true;
}

export function saveCapstonePracticeEvidence(input: Omit<CapstoneEvidence, "updatedAt">, fallbackProgress: LearningProgress = defaultProgress(), expectedRecordingId?: string) {
  const current = normalizeLearningProgress(readJson(STORAGE_KEYS.progress, fallbackProgress));
  if (expectedRecordingId !== undefined && (current.capstoneEvidence?.recordingId ?? "") !== expectedRecordingId.trim()) return false;
  const evidence = normalizeCapstoneEvidence({ ...input, updatedAt: nowIso() });
  if (!evidence || !isValidCapstoneEvidence(evidence)) return false;
  return saveLearningProgress({ ...current, capstoneEvidence: evidence });
}

export function saveLessonTaskPracticeEvidence(lessonId: string, input: unknown, fallbackProgress: LearningProgress = defaultProgress(), expectedRecordingId?: string) {
  const lesson = lessons.find((item: any) => item.id === lessonId);
  const task = lessonCompletionTask(lesson);
  const evidence = normalizeLessonTaskEvidence({ ...(isRecord(input) ? input : {}), updatedAt: nowIso() });
  if (!task || !evidence || evidence.kind !== task.kind || !checkLessonTaskEvidence(task, evidence).ready) return false;
  const current = normalizeLearningProgress(readJson(STORAGE_KEYS.progress, fallbackProgress));
  if (expectedRecordingId !== undefined && (current.lessonTaskEvidence[lessonId]?.recordingId ?? "") !== expectedRecordingId.trim()) return false;
  return saveLearningProgress({
    ...current,
    lessonTaskEvidence: { ...current.lessonTaskEvidence, [lessonId]: evidence }
  });
}

export function invalidateLessonTaskRecordingEvidence(lessonId: string, expectedRecordingId: string, fallbackProgress: LearningProgress = defaultProgress()) {
  const recordingId = expectedRecordingId.trim();
  if (!recordingId) return false;
  const current = normalizeLearningProgress(readJson(STORAGE_KEYS.progress, fallbackProgress));
  const evidence = current.lessonTaskEvidence[lessonId];
  if (evidence?.kind !== "shadowing" || evidence.recordingId !== recordingId) return false;
  const lessonTaskEvidence = { ...current.lessonTaskEvidence };
  delete lessonTaskEvidence[lessonId];
  return revokeLessonMasteryAfterEvidenceLoss({ ...current, lessonTaskEvidence }, lessonId);
}

export function invalidateCapstoneRecordingEvidence(expectedRecordingId: string, fallbackProgress: LearningProgress = defaultProgress()) {
  const recordingId = expectedRecordingId.trim();
  if (!recordingId) return false;
  const current = normalizeLearningProgress(readJson(STORAGE_KEYS.progress, fallbackProgress));
  if (current.capstoneEvidence?.recordingId !== recordingId) return false;
  return revokeLessonMasteryAfterEvidenceLoss({ ...current, capstoneEvidence: null }, CAPSTONE_LESSON_ID);
}

function revokeLessonMasteryAfterEvidenceLoss(progress: LearningProgress, lessonId: string) {
  const current = normalizeLearningProgress(progress);
  const retained = new Set(current.completedLessons);
  retained.delete(lessonId);
  let changed = true;
  while (changed) {
    changed = false;
    for (const completedLessonId of [...retained]) {
      const prerequisitesMet = getLessonPrerequisites(completedLessonId).every((item: any) => (
        retained.has(item.id) && Number(current.lessonScores[item.id] ?? 0) >= UNLOCK_SCORE
      ));
      if (!prerequisitesMet) {
        retained.delete(completedLessonId);
        changed = true;
      }
    }
  }

  const invalidatedIds = current.completedLessons.filter((id) => !retained.has(id));
  if (!invalidatedIds.length) return saveLearningProgress(current);
  const next: LearningProgress = {
    ...current,
    completedLessons: current.completedLessons.filter((id) => retained.has(id)),
    lessonScores: { ...current.lessonScores },
    previewLessonScores: { ...current.previewLessonScores },
    completedTasks: { ...current.completedTasks },
    ability: { ...current.ability },
    abilityEvents: { ...current.abilityEvents }
  };
  for (const invalidatedId of invalidatedIds) {
    const previousScore = next.lessonScores[invalidatedId];
    if (Number.isFinite(previousScore)) {
      next.previewLessonScores[invalidatedId] = Math.max(next.previewLessonScores[invalidatedId] ?? 0, previousScore);
    }
    delete next.lessonScores[invalidatedId];
    delete next.completedTasks[lessonTaskId(invalidatedId)];
    removeAbilityEvent(next, lessonTaskId(invalidatedId), abilityIds);
  }

  const previousSrs = getSrsState();
  const workingSrs = cloneSrsState(previousSrs);
  const invalidatedSet = new Set(invalidatedIds);
  const removedCardIds = new Set(Object.entries(workingSrs.cards)
    .filter(([id, card]) => card.payload.kind === "lesson" && invalidatedSet.has(parseLessonReviewCardId(id)?.lessonId ?? ""))
    .map(([id]) => id));
  for (const cardId of removedCardIds) delete workingSrs.cards[cardId];
  if (removedCardIds.size) workingSrs.history = workingSrs.history.filter((item) => !removedCardIds.has(item.id));

  if (removedCardIds.size && !saveSrsState(workingSrs)) return false;
  if (!saveLearningProgress(next)) {
    if (removedCardIds.size) saveSrsState(previousSrs);
    return false;
  }
  return true;
}

export function clearMaterialArchiveEvidence(itemId: string, fallbackProgress: LearningProgress = defaultProgress()) {
  if (!materialIdSet.has(itemId)) return false;
  const current = normalizeLearningProgress(readJson(STORAGE_KEYS.progress, fallbackProgress));
  const hasProgressEvidence = current.completedMaterials.includes(itemId) || Boolean(current.materialEvidence[itemId]);
  const previousOutputs = getOutputState();
  const previousSrs = getSrsState();
  const removedEntries = previousOutputs.entries.filter((entry) => entry.materialId === itemId);
  const shouldUpdateProgress = hasProgressEvidence || removedEntries.length > 0;
  if (shouldUpdateProgress) {
    const materialEvidence = { ...current.materialEvidence };
    if (hasProgressEvidence) delete materialEvidence[itemId];
    const next = mutableProgress(current, hasProgressEvidence ? {
      completedMaterials: current.completedMaterials.filter((id) => id !== itemId),
      materialEvidence
    } : {});
    if (hasProgressEvidence) {
      removeAbilityEvent(next, materialEvidenceEventId(itemId), mapFocusToAbilities(immersionMaterials.find((item) => item.id === itemId)?.focus));
    }
    for (const entry of removedEntries) removeAbilityEvent(next, outputEvidenceEventId(entry.id), ["grammar", "pragmatics", "native"]);
    if (!next.completedMaterials.length) {
      delete next.completedTasks[TASK_IDS.systemImmersion];
      delete next.completedTasks[TASK_IDS.openImmersion];
    }
    if (!saveLearningProgress(next)) return false;
  }
  const removedIds = clearOutputEntriesByMaterial(itemId);
  if (previousOutputs.entries.some((entry) => entry.materialId === itemId) && !removedIds.length) {
    if (shouldUpdateProgress) saveLearningProgress(current);
    return false;
  }
  const removedCardIds = materialArchiveRemovalCardIds(itemId, removedIds);
  const snapshots = removedCardIds.map(snapshotSrsCard);
  if (!removeCardsAndDerivedMistakesOrRollback(removedCardIds, snapshots)) {
    saveOutputState(previousOutputs);
    saveSrsState(previousSrs);
    if (shouldUpdateProgress) saveLearningProgress(current);
    return false;
  }
  const srsAfterClear = getSrsState();
  if (removedCardIds.some((id) => Boolean(srsAfterClear.cards[id]))) {
    saveOutputState(previousOutputs);
    saveSrsState(previousSrs);
    if (shouldUpdateProgress) saveLearningProgress(current);
    return false;
  }
  return hasProgressEvidence || removedIds.length > 0;
}

export function findCompletedCheckpointCredit(progress: LearningProgress, checkpointId: string) {
  const clean = checkpointId.trim();
  if (!clean) return null;
  const hasValidEvidence = (id: string) => validateCheckpointEvidence(progress.checkpointEvidence[id] ?? "");
  if (progress.completedCheckpoints.includes(clean) && hasValidEvidence(clean)) return clean;
  const targetKey = checkpointCreditKey(clean);
  return progress.completedCheckpoints.find((id) => checkpointCreditKey(id) === targetKey && hasValidEvidence(id)) ?? null;
}

export function getValidOutputEntries(outputs: OutputEntry[] = getOutputState().entries, srs: SrsState = getSrsState()) {
  return outputs.filter((entry) => hasValidOutputEvidence(entry, srs));
}

export function saveLearningProgress(input: LearningProgress) {
  const next = normalizeLearningProgress({ ...input, updatedAt: nowIso() });
  return writeJson(STORAGE_KEYS.progress, next);
}

export function saveUserProfileAndProgress(input: Partial<UserProfile>, fallbackProfile: UserProfile = defaultProfile(), fallbackProgress: LearningProgress = defaultProgress()) {
  const currentProfile = normalizeUserProfile(readJson(STORAGE_KEYS.profile, fallbackProfile));
  const currentProgress = normalizeLearningProgress(readJson(STORAGE_KEYS.progress, fallbackProgress));
  const nextProfile = normalizeUserProfile({ ...currentProfile, ...input, updatedAt: nowIso() });
  const nextProgress = { ...currentProgress, minutesGoal: nextProfile.minutesGoal, updatedAt: nowIso() };
  if (!writeJson(STORAGE_KEYS.profile, nextProfile)) return false;
  if (writeJson(STORAGE_KEYS.progress, nextProgress)) return true;
  writeJson(STORAGE_KEYS.profile, currentProfile);
  return false;
}

export function saveSelfStudyPlanAndProgress(input: Partial<UserProfile>, fallbackProfile: UserProfile = defaultProfile(), fallbackProgress: LearningProgress = defaultProgress()) {
  const currentProfile = normalizeUserProfile(readJson(STORAGE_KEYS.profile, fallbackProfile));
  const currentProgress = normalizeLearningProgress(readJson(STORAGE_KEYS.progress, fallbackProgress));
  const nextProfile = normalizeUserProfile({ ...currentProfile, ...input, updatedAt: nowIso() });
  const nextLesson = getNextLesson(new Set(currentProgress.completedLessons), currentProgress.lessonScores);
  const planTask = buildOpenStudyTasks(nextProfile, currentProgress, nextLesson).find((task) => task.id === TASK_IDS.openSelfPlan);
  const nextProgress = planTask
    ? applyTaskCompletion({ ...currentProgress, minutesGoal: nextProfile.minutesGoal }, planTask)
    : { ...currentProgress, minutesGoal: nextProfile.minutesGoal };
  nextProgress.updatedAt = nowIso();
  if (!writeJson(STORAGE_KEYS.profile, nextProfile)) return false;
  if (writeJson(STORAGE_KEYS.progress, nextProgress)) return true;
  writeJson(STORAGE_KEYS.profile, currentProfile);
  return false;
}

export function saveSelfStudyCheckpointAndProgress(input: Partial<UserProfile>, checkpointId: string, evidence: string, abilities: AbilityId[], fallbackProfile: UserProfile = defaultProfile(), fallbackProgress: LearningProgress = defaultProgress()) {
  const currentProfile = normalizeUserProfile(readJson(STORAGE_KEYS.profile, fallbackProfile));
  const currentProgress = normalizeLearningProgress(readJson(STORAGE_KEYS.progress, fallbackProgress));
  const nextProfile = normalizeUserProfile({ ...currentProfile, ...input, updatedAt: nowIso() });
  const currentWithMinutes = { ...currentProgress, minutesGoal: nextProfile.minutesGoal };
  const result = applyCheckpointCompletion(currentWithMinutes, checkpointId, evidence, abilities);
  if (!result.completed) return false;
  result.next.updatedAt = nowIso();
  if (!writeJson(STORAGE_KEYS.profile, nextProfile)) return false;
  if (writeJson(STORAGE_KEYS.progress, result.next)) return true;
  writeJson(STORAGE_KEYS.profile, currentProfile);
  return false;
}

export function resetLearningWorkspace() {
  const previousProfile = normalizeUserProfile(readJson(STORAGE_KEYS.profile, defaultProfile()));
  const previousProgress = normalizeLearningProgress(readJson(STORAGE_KEYS.progress, defaultProgress()));
  const previousSrs = getSrsState();
  const previousOutputState = getOutputState();
  const previousLessonPractice = getLessonPracticeState();
  const previousDraftState = getLearningDraftState();
  const previousNativePortfolio = normalizeNativePortfolioState(readJson(STORAGE_KEYS.nativePortfolio, defaultNativePortfolioState()));
  const rollbacks: Array<() => boolean> = [];

  if (!writeJson(STORAGE_KEYS.profile, defaultProfile())) return false;
  rollbacks.push(() => writeJson(STORAGE_KEYS.profile, previousProfile));

  if (!writeJson(STORAGE_KEYS.progress, defaultProgress())) {
    rollbackStorageWrites(rollbacks);
    return false;
  }
  rollbacks.push(() => writeJson(STORAGE_KEYS.progress, previousProgress));

  if (!saveSrsState(defaultSrsState())) {
    rollbackStorageWrites(rollbacks);
    return false;
  }
  rollbacks.push(() => saveSrsState(previousSrs));

  if (!saveOutputState(defaultOutputState())) {
    rollbackStorageWrites(rollbacks);
    return false;
  }
  rollbacks.push(() => saveOutputState(previousOutputState));

  if (!saveLessonPracticeState(defaultLessonPracticeState())) {
    rollbackStorageWrites(rollbacks);
    return false;
  }
  rollbacks.push(() => saveLessonPracticeState(previousLessonPractice));

  if (!saveLearningDraftState(defaultLearningDraftState())) {
    rollbackStorageWrites(rollbacks);
    return false;
  }
  rollbacks.push(() => saveLearningDraftState(previousDraftState));

  if (!writeJson(STORAGE_KEYS.nativePortfolio, defaultNativePortfolioState())) {
    rollbackStorageWrites(rollbacks);
    return false;
  }
  rollbacks.push(() => writeJson(STORAGE_KEYS.nativePortfolio, previousNativePortfolio));

  void clearLearningRecordings();
  return true;
}

export function applyTaskCompletion(progress: LearningProgress, task: StudyTask) {
  const current = normalizeLearningProgress(progress);
  const next = { ...current, completedTasks: { ...current.completedTasks, [task.id]: todayKey() } };
  if (task.id === TASK_IDS.openSelfPlan) return next;
  bumpStreak(next);
  recordAbilityEvent(next, taskEventId(task.id, todayKey()), task.ability, task.kind === "checkpoint" ? 0.5 : 0);
  return next;
}

export function applyLessonCompletion(progress: LearningProgress, lessonId: string, score = 0, assessmentReady = true, onboarded = true) {
  const current = normalizeLearningProgress(progress);
  const next = {
    ...current,
    completedLessons: [...current.completedLessons],
    lessonScores: { ...current.lessonScores },
    previewLessonScores: { ...current.previewLessonScores },
    lessonListeningEvidence: { ...current.lessonListeningEvidence },
    lessonProductionEvidence: { ...current.lessonProductionEvidence },
    lessonTaskEvidence: { ...current.lessonTaskEvidence }
  };
  if (!lessonIdSet.has(lessonId)) {
    return { next, previousScore: 0, canMasterCorePath: false, wasUnlocked: false, knownLesson: false };
  }
  const previousScore = next.lessonScores[lessonId] ?? 0;
  const masteredIds = new Set(current.completedLessons);
  const prerequisitesMet = getLessonPrerequisites(lessonId).every((item: any) => masteredIds.has(item.id) && Number(current.lessonScores[item.id] ?? 0) >= UNLOCK_SCORE);
  const lesson = lessons.find((item: any) => item.id === lessonId);
  const libraryOk = getLibraryGateForLesson(lesson, libraryCountsForWrite(current)).ok;
  const alreadyOnPath = current.completedLessons.includes(lessonId);
  const onboardingBlocked = Number(lesson?.order) === 1 && !alreadyOnPath && !onboarded;
  const wasUnlocked = lessonIdSet.has(lessonId) && prerequisitesMet && (libraryOk || alreadyOnPath) && !onboardingBlocked;
  if (wasUnlocked) next.lessonScores[lessonId] = Math.max(previousScore, score);
  else next.previewLessonScores[lessonId] = Math.max(next.previewLessonScores[lessonId] ?? 0, score);
  const canMasterCorePath = wasUnlocked && ((score >= UNLOCK_SCORE && assessmentReady) || current.completedLessons.includes(lessonId));
  if (canMasterCorePath) {
    if (!next.completedLessons.includes(lessonId)) next.completedLessons.push(lessonId);
  } else {
    next.completedLessons = next.completedLessons.filter((id) => id !== lessonId);
  }
  return { next, previousScore, canMasterCorePath, wasUnlocked, knownLesson: true };
}

export function completeLessonProgress(lessonId: string, score = 0, fallbackProgress: LearningProgress = defaultProgress()) {
  return commitLessonSession(lessonId, [], score, fallbackProgress);
}

function hasOnboardedProfile() {
  return Boolean(normalizeUserProfile(readJson(STORAGE_KEYS.profile, defaultProfile())).onboardedAt);
}

function isCorePathOpen(progress: LearningProgress, lessonId: string) {
  if (!lessonIdSet.has(lessonId)) return false;
  if (progress.completedLessons.includes(lessonId)) return true;
  const lesson = lessons.find((item: any) => item.id === lessonId);
  if (Number(lesson?.order) === 1 && !hasOnboardedProfile()) return false;
  const masteredIds = new Set(progress.completedLessons);
  const prerequisitesMet = getLessonPrerequisites(lessonId).every((item: any) => masteredIds.has(item.id) && Number(progress.lessonScores[item.id] ?? 0) >= UNLOCK_SCORE);
  return prerequisitesMet && getLibraryGateForLesson(lesson, libraryCountsForWrite(progress)).ok;
}

export function commitLessonSession(lessonId: string, answers: LessonAnswerCommitEntry[], score = 0, fallbackProgress: LearningProgress = defaultProgress()) {
  const current = normalizeLearningProgress(readJson(STORAGE_KEYS.progress, fallbackProgress));
  const coreOpen = isCorePathOpen(current, lessonId);
  if (coreOpen && lessonId === CAPSTONE_LESSON_ID && score >= UNLOCK_SCORE && !isValidCapstoneEvidence(current.capstoneEvidence)) return false;
  const lesson = lessons.find((item: any) => item.id === lessonId);
  const task = lessonCompletionTask(lesson);
  if (coreOpen && score >= UNLOCK_SCORE && !checkLessonTaskEvidence(task, current.lessonTaskEvidence[lessonId]).ready) return false;
  const assessment = answers.length
    ? assessLessonAttempt(
        { ...lesson, drills: (lesson?.drills ?? []).map((question: any, index: number) => ({ ...question, id: question.id ?? lessonReviewCardId(lessonId, index) })) },
        answers as any,
        score
      )
    : null;
  const { next, previousScore, canMasterCorePath, wasUnlocked, knownLesson } = applyLessonCompletion(current, lessonId, score, assessment?.corePassed ?? true, hasOnboardedProfile());
  if (!knownLesson) return false;
  const previousListeningEvidence = current.lessonListeningEvidence[lessonId] === true;
  const hasListeningEvidence = answers.some((entry) => isAuditoryQuestion(entry.question) && !entry.skipped && entry.correct);
  if (wasUnlocked && hasListeningFocus(lessonId)) {
    next.lessonListeningEvidence[lessonId] = previousListeningEvidence || hasListeningEvidence;
  }
  if (wasUnlocked && assessment?.productionPassed) {
    next.lessonProductionEvidence[lessonId] = true;
  }
  if (wasUnlocked) bumpStreak(next);
  if (wasUnlocked) bumpAbilityFromLesson(next, lessonId, previousScore, next.lessonScores[lessonId], previousListeningEvidence);
  if (wasUnlocked) {
    for (const entry of answers) {
      if (entry.skipped) continue;
      recordPracticeItem(next, entry.question.id, entry.correct, "lesson");
    }
  }
  if (canMasterCorePath) markTaskDone(next, lessonTaskId(lessonId));

  const previousSrs = getSrsState();
  const workingSrs = cloneSrsState(previousSrs);
  let srsChanged = false;
  if (canMasterCorePath) {
    srsChanged = addLessonReviewCardsToState(workingSrs, lessonId) || srsChanged;
  }
  if (wasUnlocked) {
    srsChanged = addLessonMistakeCardsToState(workingSrs, lessonId, answers) || srsChanged;
  }

  if (srsChanged && !saveSrsState(workingSrs)) return false;
  if (!saveLearningProgress(next)) {
    if (srsChanged) saveSrsState(previousSrs);
    return false;
  }
  return true;
}

export function recordReviewProgress(card: SrsCard, isCorrect: boolean) {
  const current = normalizeLearningProgress(readJson(STORAGE_KEYS.progress, defaultProgress()));
  const next = { ...current, abilityEvents: { ...current.abilityEvents } };
  bumpStreak(next);
  recordAbilityEvent(next, reviewEvidenceEventId(card.id, card.correct + card.wrong + 1), mapCardToAbilities(card), isCorrect ? 1 : 0);
  recordPracticeItem(next, practiceItemIdForCard(card), isCorrect, "review");
  return saveLearningProgress(next);
}

export function applyReviewProgress(progress: LearningProgress, card: SrsCard, isCorrect: boolean, reviewQueueCleared = false) {
  const current = normalizeLearningProgress(progress);
  const next = { ...current, abilityEvents: { ...current.abilityEvents }, completedTasks: { ...current.completedTasks } };
  bumpStreak(next);
  markTaskDone(next, TASK_IDS.openReviewRhythm);
  if (reviewQueueCleared) markTaskDone(next, TASK_IDS.systemReview);
  recordAbilityEvent(next, reviewEvidenceEventId(card.id, card.correct + card.wrong + 1), mapCardToAbilities(card), isCorrect ? 1 : 0);
  recordPracticeItem(next, practiceItemIdForCard(card), isCorrect, "review");
  return next;
}

export type ReviewCommitResult = { ok: true } | { ok: false; reason: "missing" | "stale" | "not-due" | "storage" };

export function gradeReviewCardAndProgress(card: SrsCard, isCorrect: boolean, options?: { allowEarly?: boolean; skipped?: boolean }) {
  return submitReviewCardAndProgress(card, isCorrect, options).ok;
}

export function submitReviewCardAndProgress(card: SrsCard, isCorrect: boolean, options?: { allowEarly?: boolean; skipped?: boolean }): ReviewCommitResult {
  const previousProgress = normalizeLearningProgress(readJson(STORAGE_KEYS.progress, defaultProgress()));
  const previousSrs = getSrsState();
  const current = previousSrs.cards[card.id];
  if (!current) return { ok: false, reason: "missing" };
  const at = Date.now();
  if (!sameReviewCardSnapshot(current, card)) return { ok: false, reason: "stale" };
  if (current.dueAt > at && !options?.allowEarly) return { ok: false, reason: "not-due" };
  if (options?.skipped) {
    const deferred = applyDeferToState(previousSrs, card.id, at);
    return deferred && saveSrsState(deferred.state) ? { ok: true } : { ok: false, reason: "storage" };
  }
  const graded = applyGradeToState(previousSrs, card.id, isCorrect, at);
  if (!graded) return { ok: false, reason: "missing" };

  if (!saveSrsState(graded.state)) return { ok: false, reason: "storage" };
  const reviewQueueCleared = current.dueAt <= at && getDueCardsFromState(graded.state, 1, at).length === 0;
  const nextProgress = applyReviewProgress(previousProgress, current, isCorrect, reviewQueueCleared);
  if (!saveLearningProgress(nextProgress)) {
    saveSrsState(previousSrs);
    return { ok: false, reason: "storage" };
  }
  return { ok: true };
}

function sameReviewCardSnapshot(current: SrsCard, submitted: SrsCard) {
  return current.id === submitted.id &&
    current.box === submitted.box &&
    current.dueAt === submitted.dueAt &&
    current.correct === submitted.correct &&
    current.wrong === submitted.wrong &&
    current.lastSeenAt === submitted.lastSeenAt &&
    current.ease === submitted.ease &&
    current.intervalDays === submitted.intervalDays &&
    current.lapses === submitted.lapses &&
    sameReviewCardPayload(current.payload, submitted.payload);
}

function sameReviewCardPayload(current: SrsCard["payload"], submitted: SrsCard["payload"]) {
  return current.kind === submitted.kind &&
    current.itemId === submitted.itemId &&
    current.type === submitted.type &&
    current.prompt === submitted.prompt &&
    current.answer === submitted.answer &&
    sameStringList(current.acceptable, submitted.acceptable) &&
    sameStringList(current.choices, submitted.choices) &&
    current.explain === submitted.explain &&
    current.speak === submitted.speak &&
    current.clozeText === submitted.clozeText &&
    current.hint === submitted.hint;
}

function sameStringList(current?: string[], submitted?: string[]) {
  if (current === submitted) return true;
  if (!current || !submitted || current.length !== submitted.length) return false;
  return current.every((value, index) => value === submitted[index]);
}

type QuizAnswerCommitEntry = {
  question: {
    id: string;
    type?: "choice" | "listen" | "type" | "dictation" | "cloze" | "translate";
    prompt?: string;
    answer?: string;
    acceptable?: string[];
    choices?: string[];
    explain?: string;
    speak?: string;
    clozeText?: string;
    hint?: string;
  };
  correct: boolean;
  skipped?: boolean;
};

export function applyQuizProgress(progress: LearningProgress, quizId: string, answers: QuizAnswerCommitEntry[], score: number) {
  const next = mutableProgress(progress);
  bumpStreak(next);
  next.completedTasks[TASK_IDS.quizMixed] = todayKey();
  markTaskDone(next, TASK_IDS.openQuiz);
  const scoredAnswers = answers.filter((entry) => !entry.skipped);
  scoredAnswers.forEach((entry, index) => {
    recordAbilityEvent(next, quizQuestionEvidenceEventId(quizId, index, entry.question.id), mapQuestionToAbilities(entry.question.id), entry.correct ? 1 : 0);
    recordPracticeItem(next, entry.question.id, entry.correct, "quiz");
  });
  const computedScore = scoredAnswers.length ? Math.round((scoredAnswers.filter((entry) => entry.correct).length / scoredAnswers.length) * 100) : score;
  const transferAbilities = [...new Set(scoredAnswers.flatMap((entry) => mapQuestionToAbilities(entry.question.id)))];
  const transferDelta = computedScore >= 85 ? 2 : computedScore >= 65 ? 1 : 0;
  recordAbilityEvent(next, quizTransferEvidenceEventId(quizId), transferAbilities, transferDelta);
  return next;
}

export function recordQuizProgress(quizId: string, answers: QuizAnswerCommitEntry[], score: number) {
  return commitQuizSession(quizId, answers, score);
}

export function commitQuizSession(quizId: string, answers: QuizAnswerCommitEntry[], score: number) {
  if (!answers.length) return false;
  const previousProgress = normalizeLearningProgress(readJson(STORAGE_KEYS.progress, defaultProgress()));
  const previousSrs = getSrsState();
  const workingSrs = {
    ...previousSrs,
    cards: Object.fromEntries(Object.entries(previousSrs.cards).map(([id, card]) => [id, cloneSrsCard(card)])),
    history: [...previousSrs.history]
  };
  const at = Date.now();

  answers.forEach((entry) => {
    if (entry.correct || entry.skipped) return;
    const id = mistakeCardId(entry.question.id);
    const current = workingSrs.cards[id] ?? {
      id,
      box: 0,
      dueAt: at,
      correct: 0,
      wrong: 0,
      lastSeenAt: null,
      payload: {
        kind: "mistake" as const,
        itemId: entry.question.id,
        prompt: entry.question.prompt,
        answer: entry.question.answer
      }
    };
    workingSrs.cards[id] = {
      ...current,
      payload: {
        ...current.payload,
        kind: "mistake",
        itemId: entry.question.id,
        type: entry.question.type,
        prompt: entry.question.prompt,
        answer: entry.question.answer,
        acceptable: entry.question.acceptable,
        choices: entry.question.choices,
        explain: entry.question.explain,
        speak: entry.question.speak,
        clozeText: entry.question.clozeText,
        hint: entry.question.hint
      },
      box: 0,
      dueAt: at,
      ease: undefined,
      intervalDays: undefined,
      lapses: undefined,
      correct: current.correct,
      wrong: current.wrong + 1,
      lastSeenAt: at
    };
    workingSrs.history.unshift({ id, isCorrect: false, at, box: 0 });
  });
  workingSrs.history = workingSrs.history.slice(0, 400);

  if (!saveSrsState(workingSrs)) return false;
  const nextProgress = applyQuizProgress(previousProgress, quizId, answers, score);
  if (!saveLearningProgress(nextProgress)) {
    saveSrsState(previousSrs);
    return false;
  }
  return true;
}

export function rollbackLessonReviewCards(cards: { created?: string[]; previous?: Record<string, SrsCard> }) {
  const state = getSrsState();
  const created = new Set(cards.created ?? []);
  for (const id of created) {
    delete state.cards[id];
  }
  state.history = state.history.filter((item) => !created.has(item.id));
  for (const [id, card] of Object.entries(cards.previous ?? {})) {
    state.cards[id] = cloneSrsCard(card);
  }
  saveSrsState(state);
}

export function libraryCountsFromProgress(progress: LearningProgress, outputEvidence: OutputEvidenceInput = { outputs: getOutputState().entries, srs: getSrsState() }): LibraryCounts {
  return {
    hangul: progress.masteredHangul.filter((id) => hangulIdSet.has(id)).length,
    vocab: progress.learnedVocab.filter((id) => vocabIdSet.has(id)).length,
    grammar: progress.learnedGrammar.filter((id) => grammarIdSet.has(id)).length,
    materials: getValidMaterialIds(progress, outputEvidence).length,
    native: countNativePracticeEvidence(progress)
  };
}

export function ensureLessonReviewCards(lessonId: string): LessonReviewCardResult {
  const lesson = lessons.find((item: any) => item.id === lessonId);
  if (!lesson) return emptyLessonReviewCards();
  const previousCards = getSrsState().cards;
  const ids: string[] = [];
  const created: string[] = [];
  const updated: string[] = [];
  const previous: Record<string, SrsCard> = {};
  for (const [index, drill] of (lesson.drills ?? []).entries()) {
    if (!drill?.prompt || !drill?.answer) continue;
    const id = drill.id ?? lessonReviewCardId(lessonId, index);
    const existed = Boolean(previousCards[id]);
    const card = ensureCard(id, {
      kind: "lesson",
      itemId: id,
      type: normalizeLessonReviewQuestionType(drill.type),
      prompt: drill.prompt,
      answer: drill.answer,
      acceptable: Array.isArray(drill.acceptable) ? drill.acceptable : undefined,
      choices: Array.isArray(drill.choices) ? drill.choices : undefined,
      explain: drill.explain,
      speak: drill.speak,
      clozeText: drill.clozeText,
      hint: drill.hint
    });
    if (!card) {
      const partial = Object.assign(ids, { created, updated, previous, failed: true });
      rollbackLessonReviewCards(partial);
      return partial;
    }
    ids.push(id);
    if (existed) {
      updated.push(id);
      previous[id] = cloneSrsCard(previousCards[id]);
    }
    else created.push(id);
  }
  return Object.assign(ids, { created, updated, previous, failed: false });
}

function addLessonReviewCardsToState(state: SrsState, lessonId: string) {
  const lesson = lessons.find((item: any) => item.id === lessonId);
  if (!lesson) return false;
  let changed = false;
  const at = Date.now();
  for (const [index, drill] of (lesson.drills ?? []).entries()) {
    if (!drill?.prompt || !drill?.answer) continue;
    const id = drill.id ?? lessonReviewCardId(lessonId, index);
    const current = state.cards[id];
    state.cards[id] = {
      id,
      box: current?.box ?? 0,
      dueAt: current?.dueAt ?? at,
      correct: current?.correct ?? 0,
      wrong: current?.wrong ?? 0,
      lastSeenAt: current?.lastSeenAt ?? null,
      ease: current?.ease,
      intervalDays: current?.intervalDays,
      lapses: current?.lapses,
      payload: {
        ...current?.payload,
        kind: "lesson",
        itemId: id,
        type: normalizeLessonReviewQuestionType(drill.type),
        prompt: drill.prompt,
        answer: drill.answer,
        acceptable: Array.isArray(drill.acceptable) ? drill.acceptable : undefined,
        choices: Array.isArray(drill.choices) ? drill.choices : undefined,
        explain: drill.explain,
        speak: drill.speak,
        clozeText: drill.clozeText,
        hint: drill.hint
      }
    };
    changed = true;
  }
  return changed;
}

function addLessonMistakeCardsToState(state: SrsState, lessonId: string, answers: LessonAnswerCommitEntry[]) {
  if (!answers.length) return false;
  const validQuestionIds = new Set((lessons.find((item: any) => item.id === lessonId)?.drills ?? []).map((drill: any, index: number) => {
    return drill.id ?? lessonReviewCardId(lessonId, index);
  }));
  if (!validQuestionIds.size) return false;
  const at = Date.now();
  let changed = false;
  for (const entry of answers) {
    if (entry.correct || entry.skipped || !validQuestionIds.has(entry.question.id) || !entry.question.prompt || !entry.question.answer) continue;
    const id = mistakeCardId(entry.question.id);
    const current = state.cards[id];
    state.cards[id] = {
      id,
      box: 0,
      dueAt: at,
      ease: undefined,
      intervalDays: undefined,
      lapses: undefined,
      correct: current?.correct ?? 0,
      wrong: (current?.wrong ?? 0) + 1,
      lastSeenAt: at,
      payload: {
        ...current?.payload,
        kind: "mistake",
        itemId: entry.question.id,
        type: entry.question.type,
        prompt: entry.question.prompt,
        answer: entry.question.answer,
        acceptable: entry.question.acceptable,
        choices: entry.question.choices,
        explain: entry.question.explain,
        speak: entry.question.speak,
        clozeText: entry.question.clozeText,
        hint: entry.question.hint
      }
    };
    state.history.unshift({ id, isCorrect: false, at, box: 0 });
    changed = true;
  }
  if (changed) state.history = state.history.slice(0, 400);
  return changed;
}

function emptyLessonReviewCards(): LessonReviewCardResult {
  return Object.assign([] as string[], { created: [] as string[], updated: [] as string[], previous: {} as Record<string, SrsCard>, failed: false });
}

function snapshotSrsCard(id: string): SrsCardSnapshot {
  const state = getSrsState();
  const card = state.cards[id];
  return { id, previous: card ? cloneSrsCard(card) : null, history: [...state.history] };
}

function rollbackSrsCardSnapshot(snapshot: SrsCardSnapshot) {
  const state = getSrsState();
  if (snapshot.previous) state.cards[snapshot.id] = cloneSrsCard(snapshot.previous);
  else delete state.cards[snapshot.id];
  state.history = [...snapshot.history];
  saveSrsState(state);
}

function rollbackSrsCardSnapshots(snapshots: SrsCardSnapshot[]) {
  const state = getSrsState();
  for (const snapshot of snapshots) {
    if (snapshot.previous) state.cards[snapshot.id] = cloneSrsCard(snapshot.previous);
    else delete state.cards[snapshot.id];
  }
  if (snapshots[0]) state.history = [...snapshots[0].history];
  saveSrsState(state);
}

function ensureSrsCardOrRollback(id: string, payload: SrsCard["payload"], snapshots: SrsCardSnapshot[]) {
  if (ensureCard(id, payload)) return true;
  rollbackSrsCardSnapshots(snapshots);
  return false;
}

function removeExistingSrsCardsOrRollback(snapshots: SrsCardSnapshot[]) {
  for (const snapshot of snapshots) {
    if (snapshot.previous && !removeCard(snapshot.id)) {
      rollbackSrsCardSnapshots(snapshots);
      return false;
    }
  }
  return true;
}

function removeCardsAndDerivedMistakesOrRollback(ids: string[], snapshots: SrsCardSnapshot[]) {
  for (const id of ids) {
    if (getSrsState().cards[id] && !removeCard(id)) {
      rollbackSrsCardSnapshots(snapshots);
      return false;
    }
  }
  return true;
}

function materialArchiveRemovalCardIds(materialId: string, outputIds: string[]) {
  return [
    materialCardId(materialId),
    mistakeCardId(materialCardId(materialId)),
    mistakeCardId(materialRetellQuestionId(materialId)),
    ...outputIds.flatMap((id) => [
      outputCardId(id),
      mistakeCardId(outputCardId(id)),
      mistakeCardId(outputTransferQuestionId(id))
    ])
  ];
}

function questionMistakeCardIds(questionId: string, gateCount: number) {
  return [
    mistakeCardId(questionId),
    ...Array.from({ length: gateCount }, (_, index) => mistakeCardId(`${questionId}:gate${index + 1}`))
  ];
}

function hangulRemovalCardIds(itemId: string) {
  return [hangulCardId(itemId), ...questionMistakeCardIds(hangulQuestionId(itemId), 4)];
}

function pronunciationRemovalCardIds(itemId: string) {
  return [pronunciationCardId(itemId), ...questionMistakeCardIds(pronunciationQuestionId(itemId), 3)];
}

function soundChangeRemovalCardIds(itemId: string) {
  return [soundChangeCardId(itemId), ...questionMistakeCardIds(soundChangeQuestionId(itemId), 3)];
}

function vocabRemovalCardIds(itemId: string) {
  return [
    vocabCardId(itemId),
    ...questionMistakeCardIds(vocabQuestionId(itemId), 4),
    mistakeCardId(vocabDictationQuestionId(itemId)),
    mistakeCardId(vocabClozeQuestionId(itemId))
  ];
}

function grammarRemovalCardIds(itemId: string) {
  return [grammarCardId(itemId), ...questionMistakeCardIds(grammarQuestionId(itemId), 3)];
}

function normalizeLessonReviewQuestionType(input: unknown): SrsCard["payload"]["type"] {
  return input === "choice" || input === "listen" || input === "type" || input === "dictation" || input === "cloze" || input === "translate"
    ? input
    : "type";
}

function nativeRemovalCardIds(itemId: string) {
  const ids = [nativeCardId(itemId), mistakeCardId(nativeCardId(itemId))];
  const [scope, rawId] = itemId.split(":");
  if (scope === "pragmatics" && rawId) ids.push(mistakeCardId(nativePragmaticsQuestionId(rawId)));
  if (scope === "nuance" && rawId) ids.push(mistakeCardId(nativeNuanceQuestionId(rawId)));
  return ids;
}

function rollbackStorageWrites(rollbacks: Array<() => boolean>) {
  for (let index = rollbacks.length - 1; index >= 0; index -= 1) {
    rollbacks[index]();
  }
}

function cloneSrsCard(card: SrsCard): SrsCard {
  return {
    ...card,
    payload: {
      ...card.payload,
      acceptable: card.payload.acceptable ? [...card.payload.acceptable] : undefined,
      choices: card.payload.choices ? [...card.payload.choices] : undefined
    }
  };
}

function cloneSrsState(state: SrsState): SrsState {
  return {
    cards: Object.fromEntries(Object.entries(state.cards).map(([id, card]) => [id, cloneSrsCard(card)])),
    history: [...state.history]
  };
}

function bumpAbilityFromLesson(progress: LearningProgress, lessonId: string, previousScore: number, nextScore: number, previousListeningEvidence = false) {
  const lesson = lessons.find((item: any) => item.id === lessonId);
  if (!lesson) return;
  const abilities = lessonAbilitiesWithEvidence(lesson, progress.lessonListeningEvidence[lessonId] === true);
  if (nextScore > previousScore) {
    recordAbilityEvent(progress, lessonTaskId(lessonId), abilities, lessonAbilityDelta(nextScore));
    return;
  }
  if (!previousListeningEvidence && progress.lessonListeningEvidence[lessonId] === true) {
    recordAbilityEvent(progress, lessonTaskId(lessonId), ["listening"], lessonAbilityDelta(nextScore));
  }
}

function isAuditoryQuestion(question: LessonAnswerCommitEntry["question"]) {
  return Boolean(question.speak && (question.type === "listen" || question.type === "dictation"));
}

export function recordAbilityEvent(progress: LearningProgress, eventId: string, abilities: AbilityId[], delta: number) {
  if (!eventId || delta <= 0 || !abilities.length) return 0;
  progress.abilityEvents = { ...(progress.abilityEvents ?? {}) };
  const cleanAbilities = [...new Set(abilities)].filter(isAbilityId);
  const previous = normalizeAbilityEventValue(progress.abilityEvents[eventId], cleanAbilities);
  const nextEvent = { ...previous };
  let maxApplied = 0;
  for (const ability of cleanAbilities) {
    const targetDelta = Math.max(0, delta - (previous[ability] ?? 0));
    if (!targetDelta) continue;
    const previousAbility = progress.ability[ability];
    progress.ability[ability] = Math.min(100, previousAbility + targetDelta);
    const actualApplied = progress.ability[ability] - previousAbility;
    if (actualApplied > 0) {
      nextEvent[ability] = (nextEvent[ability] ?? 0) + actualApplied;
      maxApplied = Math.max(maxApplied, actualApplied);
    }
  }
  if (!maxApplied) return 0;
  progress.abilityEvents[eventId] = needsExplicitAbilityDimensions(eventId)
    ? nextEvent
    : compactAbilityEventValue(nextEvent, cleanAbilities);
  return maxApplied;
}

function needsExplicitAbilityDimensions(eventId: string) {
  return eventId.startsWith("lesson:") ||
    eventId.startsWith("checkpoint:") ||
    eventId.startsWith("task:") ||
    (eventId.startsWith("quiz:") && eventId.endsWith(":transfer"));
}

export function recordPracticeItem(progress: LearningProgress, itemId: string, isCorrect: boolean, source: LearningProgress["practiceItems"][string]["lastSource"]) {
  const cleanId = normalizePracticeItemId(itemId);
  if (!cleanId) return false;
  progress.practiceItems = { ...(progress.practiceItems ?? {}) };
  const previous = progress.practiceItems[cleanId];
  const correct = (previous?.correct ?? 0) + (isCorrect ? 1 : 0);
  const wrong = (previous?.wrong ?? 0) + (isCorrect ? 0 : 1);
  progress.practiceItems[cleanId] = {
    attempts: correct + wrong,
    correct,
    wrong,
    streak: isCorrect ? (previous?.lastCorrect ? previous.streak : 0) + 1 : 0,
    lastCorrect: isCorrect,
    lastSeenAt: nowIso(),
    lastSource: source
  };
  return true;
}

export function resolvePracticeItemWeakness(progress: LearningProgress, itemId: string) {
  const cleanId = normalizePracticeItemId(itemId);
  const previous = cleanId ? progress.practiceItems?.[cleanId] : null;
  if (!cleanId || !previous || previous.lastCorrect) return false;
  progress.practiceItems = { ...(progress.practiceItems ?? {}) };
  progress.practiceItems[cleanId] = {
    ...previous,
    streak: Math.max(1, previous.streak),
    lastCorrect: true,
    lastSeenAt: nowIso()
  };
  return true;
}

export function removeMistakeCardAndPracticeItem(cardId: string) {
  const previousSrs = getSrsState();
  const card = previousSrs.cards[cardId];
  if (!card || card.payload.kind !== "mistake") return false;

  const previousProgress = normalizeLearningProgress(readJson(STORAGE_KEYS.progress, defaultProgress()));
  const nextProgress = mutableProgress(previousProgress);
  const shouldSaveProgress = resolvePracticeItemWeakness(nextProgress, practiceItemIdForCard(card));

  if (!removeCard(cardId)) return false;
  if (!shouldSaveProgress) return true;
  if (saveLearningProgress(nextProgress)) return true;

  saveSrsState(previousSrs);
  return false;
}

export function removeAbilityEvent(progress: LearningProgress, eventId: string, abilities: AbilityId[]) {
  const cleanAbilities = [...new Set(abilities)].filter(isAbilityId);
  const previous = normalizeAbilityEventValue(progress.abilityEvents?.[eventId], cleanAbilities);
  const maxPrevious = Math.max(0, ...Object.values(previous));
  if (!eventId || maxPrevious <= 0) return 0;
  progress.abilityEvents = { ...(progress.abilityEvents ?? {}) };
  delete progress.abilityEvents[eventId];
  for (const ability of cleanAbilities) {
    progress.ability[ability] = Math.max(0, progress.ability[ability] - (previous[ability] ?? 0));
  }
  return maxPrevious;
}

function mutableProgress(progress: LearningProgress, patch: Partial<LearningProgress> = {}) {
  const current = normalizeLearningProgress(progress);
  return {
    ...current,
    ...patch,
    materialEvidence: patch.materialEvidence ?? { ...current.materialEvidence },
    checkpointEvidence: patch.checkpointEvidence ?? { ...current.checkpointEvidence },
    completedTasks: patch.completedTasks ?? { ...current.completedTasks },
    ability: patch.ability ?? { ...current.ability },
    abilityEvents: patch.abilityEvents ?? { ...current.abilityEvents },
    practiceItems: patch.practiceItems ?? { ...current.practiceItems }
  };
}

export function hasKoreanText(value: string) {
  return hasKoreanEvidenceText(value);
}

function checkpointEvidenceFingerprint(evidence: string) {
  return evidence.normalize("NFKC").toLowerCase().replace(/[\s，,。.!！?？；;：:]+/g, "");
}

export function mapCardToAbilities(card: SrsCard): AbilityId[] {
  if (card.payload.kind === "hangul") return ["script"];
  if (card.payload.kind === "pronunciation") return ["listening"];
  if (card.payload.kind === "soundChange") return ["listening"];
  if (card.payload.kind === "vocab") return ["vocabulary"];
  if (card.payload.kind === "grammar") return ["grammar"];
  if (card.payload.kind === "material") {
    const material = immersionMaterials.find((item) => item.id === card.payload.itemId);
    return mapFocusToAbilities(material?.focus);
  }
  if (card.payload.kind === "output") return ["grammar", "pragmatics", "native"];
  if (card.payload.kind === "native") return card.payload.itemId.startsWith("pragmatics:") ? ["pragmatics"] : ["native"];
  if (card.payload.kind === "lesson") return mapLessonCardToAbilities(card.payload.itemId);
  if (card.payload.kind === "mistake") return mapMistakeCardToAbilities(card.payload.itemId);
  return [];
}

function practiceItemIdForCard(card: SrsCard) {
  return normalizePracticeItemId(card.payload.itemId) || normalizePracticeItemId(card.id);
}

function mapMistakeCardToAbilities(itemId: string): AbilityId[] {
  return mapQuestionToAbilities(itemId);
}

function bumpStreak(progress: LearningProgress) {
  const today = todayKey();
  if (progress.lastStudyDate === today) return;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  progress.streak = progress.lastStudyDate === todayKey(yesterday) ? progress.streak + 1 : 1;
  progress.lastStudyDate = today;
}

function markTaskDone(progress: LearningProgress, taskId: string) {
  progress.completedTasks = { ...(progress.completedTasks ?? {}), [taskId]: todayKey() };
}

function clearTaskDone(progress: LearningProgress, taskId: string) {
  if (progress.completedTasks?.[taskId] !== todayKey()) return;
  progress.completedTasks = { ...(progress.completedTasks ?? {}) };
  delete progress.completedTasks[taskId];
}

function clearTaskDoneIfNoRemainingEvidence(progress: LearningProgress, taskId: string) {
  if (hasRemainingAbilityTaskEvidence(progress, taskId)) return;
  clearTaskDone(progress, taskId);
}

function hasRemainingAbilityTaskEvidence(progress: LearningProgress, taskId: string) {
  if (taskId === "ability:script") return progress.masteredHangul.length > 0;
  if (taskId === "ability:listening") {
    return Object.values(getSrsState().cards).some((card) => card.payload.kind === "pronunciation" || card.payload.kind === "soundChange");
  }
  if (taskId === "ability:vocabulary") return progress.learnedVocab.length > 0;
  if (taskId === "ability:grammar") return progress.learnedGrammar.length > 0;
  if (taskId === "ability:pragmatics") return countNativePracticeEvidence(progress, "pragmatics") > 0;
  if (taskId === "ability:native") return countNativePracticeEvidence(progress, "nuance") > 0;
  return false;
}

function compactAbilityEventValue(value: Partial<Record<AbilityId, number>>, abilities: AbilityId[]) {
  const entries = abilities
    .map((ability) => [ability, clampNumber(value[ability], 0, 100, 0)] as const)
    .filter(([, applied]) => applied > 0);
  if (!entries.length) return 0;
  const first = entries[0][1];
  if (entries.length === abilities.length && entries.every(([, applied]) => applied === first)) return first;
  return Object.fromEntries(entries) as Partial<Record<AbilityId, number>>;
}

export const contentCounts = {
  lessons: lessons.length,
  vocab: vocab.length,
  grammar: grammarPoints.length,
  hangul: hangulGroups.flatMap((group: any) => group.items).length,
  pragmatics: pragmaticScenarios.length,
  nuance: nuanceSets.length,
  materials: immersionMaterials.length
};

// Public command facade retains existing domain imports.
export { type NativeEvidenceInput, hasCompleteNativePracticeEvidence, normalizeUserProfile, normalizeLearningProgress } from "./progress-normalization.ts";

// Public command facade retains existing domain imports.
export { buildLearningWorkspace, buildProficiencySnapshot, materialPrerequisitesMet, checkpointCreditKey, countCheckpointCredits, countNativePracticeEvidence, countValidOutputEvidence, hasValidOutputEvidence, countValidMaterialEvidence, getValidMaterialIds, hasValidMaterialEvidence, getWeakPracticeItems, libraryCountsForWrite, hasCheckpointStudyBasis, validateCheckpointEvidence } from "./workspace-snapshot.ts";
