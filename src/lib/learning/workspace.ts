"use client";

import { useCallback, useMemo } from "react";
import { lessons, getNextLesson, getLessonPrerequisites, isLessonMastered, UNLOCK_SCORE } from "../../data/curriculum.js";
import { hangulGroups, pronunciationPairs } from "../../data/hangul.js";
import { vocab } from "../../data/lexicon.js";
import { grammarPoints } from "../../data/grammar.js";
import { pragmaticScenarios } from "../../data/pragmatics.js";
import { nuanceSets } from "../../data/nuance.js";
import { soundChangeRules } from "../../data/sound-changes.js";
import { immersionMaterialHref, immersionMaterials } from "../../data/materials.ts";
import { buildSelfStudyPlan } from "../../data/self-study.js";
import { proficiencyLevels, proficiencyMetrics } from "../../data/proficiency.js";
import { hrefForStudyModule, moduleToAbility, studyModuleReadinessRequirement } from "./modules.js";
import { CAPSTONE_LESSON_ID, isValidCapstoneEvidence, normalizeCapstoneEvidence } from "./capstone.ts";
import { hasKoreanContentOverlap, hasKoreanDictationEvidence, hasKoreanOutputRewrite, hasKoreanRetellEvidence, hasKoreanText as hasKoreanEvidenceText, hasMaterialOutputEvidence, mapFocusToAbilities } from "./evidence.ts";
import { assessLessonAttempt } from "./lesson-assessment.ts";
import { checkLessonTaskEvidence, lessonCompletionTask, normalizeLessonTaskEvidence } from "./lesson-evidence.ts";
import { defaultProfile, defaultProgress, nowIso, parseJson, readJson, STORAGE_KEYS, todayKey, useClientNow, useStorageRaw, writeJson } from "./storage.ts";
import { addOutputEntry, clearOutputEntriesByMaterial, defaultOutputState, getOutputState, getOutputStateFromRaw, saveOutputState, type OutputEntry } from "./output.ts";
import { applyGradeToState, defaultSrsState, ensureCard, getDueCardsFromState, getSrsState, getSrsStateFromRaw, removeCard, saveSrsState, summarizeSrsState, type SrsCard, type SrsState } from "./srs.ts";
import { defaultLessonPracticeState, getLessonPracticeState, saveLessonPracticeState } from "./lesson-session.ts";
import { defaultLearningDraftState, getLearningDraftState, saveLearningDraftState } from "./drafts.ts";
import { defaultNativePortfolioState, normalizeNativePortfolioState } from "./native-portfolio.ts";
import { clearLearningRecordings } from "./recordings.ts";
import { summarizeMistakes } from "./mistakes.ts";
import {
  TASK_IDS,
  abilityTaskId,
  checkpointTaskId,
  grammarCardId,
  grammarQuestionId,
  hangulCardId,
  hangulQuestionId,
  hasCardPrefix,
  hasQuestionPrefix,
  lessonReviewCardId,
  lessonTaskId,
  materialCardId,
  materialEvidenceEventId,
  materialRetellQuestionId,
  mistakeCardId,
  nativeCardId,
  nativeNuanceQuestionId,
  nativePragmaticsQuestionId,
  outputCardId,
  outputEvidenceEventId,
  outputTransferQuestionId,
  parseLessonReviewCardId,
  pronunciationCardId,
  pronunciationQuestionId,
  quizQuestionEvidenceEventId,
  quizTransferEvidenceEventId,
  reviewEvidenceEventId,
  soundChangeCardId,
  soundChangeQuestionId,
  taskEventId,
  vocabCardId,
  vocabClozeQuestionId,
  vocabDictationQuestionId,
  vocabQuestionId
} from "./ids.ts";
import type { AbilityId, CapstoneEvidence, LearningProgress, LearningWorkspace, StudyTask, UserProfile } from "@/lib/learning/types";

const abilityLabels: Record<AbilityId, string> = {
  script: "韩文字母",
  listening: "听辨发音",
  vocabulary: "词汇搭配",
  grammar: "句型语法",
  pragmatics: "场景语用",
  native: "母语者表达"
};

export const ABILITY_LABELS = abilityLabels;

const abilityIds = Object.keys(abilityLabels) as AbilityId[];
const lessonIdSet: Set<string> = new Set(lessons.map((lesson: any) => String(lesson.id)));
const hangulIdSet = new Set(hangulGroups.flatMap((group: any) => group.items.map((item: any) => item.id)));
const vocabIdSet = new Set(vocab.map((item: any) => item.id));
const grammarIdSet = new Set(grammarPoints.map((item: any) => item.id));
const nativeIdSet = new Set([
  ...pragmaticScenarios.map((item: any) => `pragmatics:${item.id}`),
  ...nuanceSets.map((item: any) => `nuance:${item.id}`)
]);
const materialIdSet = new Set(immersionMaterials.map((item) => item.id));
const checkpointSignalPattern = /正确率|准确率|录音|听写|复述|造句|句子|输出|自评|错误|弱点|修正|score|check/i;
const checkpointMeasurementPattern = /\d+(?:\.\d+)?\s*(?:%|％|秒|分钟|分|题|个|句|词|次)/i;

type SrsCardSnapshot = { id: string; previous: SrsCard | null; history: SrsState["history"] };
type LessonReviewCardResult = string[] & { created: string[]; updated: string[]; previous: Record<string, SrsCard>; failed: boolean };
type OutputEvidenceInput = number | { outputs: OutputEntry[]; srs: SrsState };
type OutputArchiveInput = Omit<OutputEntry, "id" | "createdAt">;
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

export function useLearningWorkspace() {
  const profileRaw = useStorageRaw(STORAGE_KEYS.profile);
  const progressRaw = useStorageRaw(STORAGE_KEYS.progress);
  const srsRaw = useStorageRaw(STORAGE_KEYS.srs);
  const outputsRaw = useStorageRaw(STORAGE_KEYS.outputs);
  const now = useClientNow();
  const profile = useMemo(() => normalizeUserProfile(parseJson(profileRaw, defaultProfile())), [profileRaw]);
  const progress = useMemo(() => normalizeLearningProgress(parseJson(progressRaw, defaultProgress())), [progressRaw]);
  const srsState = useMemo(() => getSrsStateFromRaw(srsRaw), [srsRaw]);
  const outputState = useMemo(() => getOutputStateFromRaw(outputsRaw), [outputsRaw]);
  const srs = useMemo(() => summarizeSrsState(srsState, now), [srsState, now]);
  const outputEvidence = useMemo(() => ({ outputs: outputState.entries, srs: srsState }), [outputState.entries, srsState]);
  const validOutputEntries = useMemo(() => getValidOutputEntries(outputState.entries, srsState), [outputState.entries, srsState]);

  const saveProfile = useCallback((input: Partial<UserProfile>) => {
    return saveUserProfileAndProgress(input, profile, progress);
  }, [profile, progress]);

  const saveSelfStudyPlan = useCallback((input: Partial<UserProfile>) => {
    return saveSelfStudyPlanAndProgress(input, profile, progress);
  }, [profile, progress]);

  const saveSelfStudyCheckpoint = useCallback((input: Partial<UserProfile>, checkpointId: string, evidence: string, abilities: AbilityId[]) => {
    return saveSelfStudyCheckpointAndProgress(input, checkpointId, evidence, abilities, profile, progress);
  }, [profile, progress]);

  const saveProgress = useCallback((input: LearningProgress) => {
    return saveLearningProgress(input);
  }, []);

  const completeLesson = useCallback((lessonId: string, score = 0, answers: LessonAnswerCommitEntry[] = []) => {
    return commitLessonSession(lessonId, answers, score, progress);
  }, [progress]);

  const saveCapstoneEvidence = useCallback((input: Omit<CapstoneEvidence, "updatedAt">, expectedRecordingId: string) => {
    return saveCapstonePracticeEvidence(input, progress, expectedRecordingId);
  }, [progress]);

  const saveLessonTaskEvidence = useCallback((lessonId: string, input: unknown, expectedRecordingId: string) => {
    return saveLessonTaskPracticeEvidence(lessonId, input, progress, expectedRecordingId);
  }, [progress]);

  const invalidateLessonTaskRecording = useCallback((lessonId: string, recordingId: string) => {
    return invalidateLessonTaskRecordingEvidence(lessonId, recordingId, progress);
  }, [progress]);

  const invalidateCapstoneRecording = useCallback((recordingId: string) => {
    return invalidateCapstoneRecordingEvidence(recordingId, progress);
  }, [progress]);

  const toggleHangul = useCallback((itemId: string) => {
    return toggleHangulItem(itemId, progress);
  }, [progress]);

  const ensureHangul = useCallback((itemId: string) => {
    return ensureHangulItemMastered(itemId, progress);
  }, [progress]);

  const togglePronunciation = useCallback((itemId: string) => {
    return togglePronunciationPair(itemId, progress);
  }, [progress]);

  const ensurePronunciation = useCallback((itemId: string) => {
    return ensurePronunciationPairMastered(itemId, progress);
  }, [progress]);

  const toggleSoundChange = useCallback((ruleId: string) => {
    return toggleSoundChangeRule(ruleId, progress);
  }, [progress]);

  const ensureSoundChange = useCallback((ruleId: string) => {
    return ensureSoundChangeRuleMastered(ruleId, progress);
  }, [progress]);

  const toggleVocab = useCallback((itemId: string) => {
    return toggleVocabItem(itemId, progress);
  }, [progress]);

  const ensureVocab = useCallback((itemId: string) => {
    return ensureVocabItemMastered(itemId, progress);
  }, [progress]);

  const toggleGrammar = useCallback((itemId: string) => {
    return toggleGrammarPoint(itemId, progress);
  }, [progress]);

  const ensureGrammar = useCallback((itemId: string) => {
    return ensureGrammarPointMastered(itemId, progress);
  }, [progress]);

  const toggleNative = useCallback((itemId: string) => {
    return toggleNativeItem(itemId, progress);
  }, [progress]);

  const saveNativeEvidence = useCallback((itemId: string, evidence: NativeEvidenceInput) => {
    return saveNativePracticeEvidence(itemId, evidence, progress);
  }, [progress]);

  const completeMaterial = useCallback((itemId: string, evidence?: { dictation?: string; retell?: string; selfCheck?: string[]; outputEntryId?: string }) => {
    return completeMaterialEvidence(itemId, evidence, progress);
  }, [progress]);

  const recordOutput = useCallback((itemId: string, prompt: string, answer: string) => {
    const current = normalizeLearningProgress(readJson(STORAGE_KEYS.progress, progress));
    return persistOutputReview(current, itemId, prompt, answer);
  }, [progress]);

  const saveOutputArchive = useCallback((input: OutputArchiveInput) => {
    return saveOutputArchiveEntry(input, progress);
  }, [progress]);

  const completeTask = useCallback((taskId: string) => {
    const current = normalizeLearningProgress(readJson(STORAGE_KEYS.progress, progress));
    const task = findTaskById(buildLearningWorkspace(profile, current, 0), taskId);
    if (!task) return false;
    return saveProgress(applyTaskCompletion(current, task));
  }, [profile, progress, saveProgress]);

  const completeCheckpoint = useCallback((checkpointId: string, evidence: string, abilities: AbilityId[]) => {
    const current = normalizeLearningProgress(readJson(STORAGE_KEYS.progress, progress));
    const result = applyCheckpointCompletion(current, checkpointId, evidence, abilities);
    if (!result.completed) return false;
    return saveProgress(result.next);
  }, [progress, saveProgress]);

  const clearMaterialArchive = useCallback((itemId: string) => {
    return clearMaterialArchiveEvidence(itemId, progress);
  }, [progress]);

  const reset = useCallback(() => {
    return resetLearningWorkspace();
  }, []);

  const workspace = useMemo(() => buildLearningWorkspace(profile, progress, srs.due, outputEvidence), [profile, progress, srs.due, outputEvidence]);

  return {
    workspace,
    srs,
    srsState,
    outputEntries: outputState.entries,
    validOutputEntries,
    saveProfile,
    saveSelfStudyPlan,
    saveSelfStudyCheckpoint,
    completeLesson,
    saveCapstoneEvidence,
    saveLessonTaskEvidence,
    invalidateLessonTaskRecording,
    invalidateCapstoneRecording,
    toggleHangul,
    ensureHangul,
    togglePronunciation,
    ensurePronunciation,
    toggleSoundChange,
    ensureSoundChange,
    toggleVocab,
    ensureVocab,
    toggleGrammar,
    ensureGrammar,
    toggleNative,
    saveNativeEvidence,
    completeMaterial,
    recordOutput,
    saveOutputArchive,
    completeTask,
    completeCheckpoint,
    clearMaterialArchive,
    recordQuizProgress,
    reset
  };
}

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
  const recommended = taskPool
    .filter((task) => task.priority >= 55)
    .slice(0, 6);
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
  const evidence = buildProficiencyEvidence(progress, outputEvidence);
  const achievableLevels = proficiencyLevels.filter((level: any) => !level.expansionOnly);
  let current = achievableLevels[0];
  for (const level of achievableLevels) {
    if (levelRequirementsMet(level, evidence)) current = level;
    else break;
  }
  const next = proficiencyLevels[proficiencyLevels.findIndex((level: any) => level.id === current.id) + 1] ?? null;
  const nextRequirements = next?.requirements?.map((requirement: any) => {
    const currentValue = evidence[requirement.metric] ?? 0;
    return {
      metric: requirement.metric,
      label: proficiencyMetrics[requirement.metric] ?? requirement.metric,
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

export function applyCheckpointCompletion(progress: LearningProgress, checkpointId: string, evidence: string, abilities: AbilityId[]) {
  const current = normalizeLearningProgress(progress);
  const cleanCheckpointId = checkpointId.trim();
  const cleanEvidence = evidence.trim();
  const cleanAbilities = [...new Set(abilities)].filter(isAbilityId);
  if (!cleanCheckpointId || !validateCheckpointEvidence(cleanEvidence) || !cleanAbilities.length) {
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
  const removeIds = [cardId, mistakeCardId(soundChangeQuestionId(ruleId))];
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
  const snapshots = [snapshotSrsCard(grammarCardId(itemId)), snapshotSrsCard(mistakeCardId(grammarQuestionId(itemId)))];
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
  let added = false;
  const removeIds = nativeRemovalCardIds(itemId);
  const snapshots = removeIds.map(snapshotSrsCard);
  if (set.has(itemId)) {
    set.delete(itemId);
    if (!removeCardsAndDerivedMistakesOrRollback(removeIds, snapshots)) return false;
  }
  else {
    added = true;
    set.add(itemId);
    if (!ensureSrsCardOrRollback(nativeCardId(itemId), { kind: "native", itemId }, snapshots)) return false;
  }
  const next = mutableProgress(current, { learnedNative: [...set] });
  if (added) {
    next.updatedAt = nowIso();
  } else {
    removeAbilityEvent(next, `native:${itemId}`, itemId.startsWith("pragmatics:") ? ["pragmatics"] : ["native"]);
  }
  if (!saveLearningProgress(next)) {
    rollbackSrsCardSnapshots(snapshots);
    return false;
  }
  return true;
}

export type NativeEvidenceInput = { listened?: boolean; retell?: string; transfer?: string; updatedAt?: string };

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

export function materialPrerequisitesMet(material: { requiredLessons?: string[]; recommendedLessons?: string[] } | null | undefined, progress: LearningProgress) {
  const requiredLessons = material?.requiredLessons ?? material?.recommendedLessons ?? [];
  if (!requiredLessons.length) return true;
  const completedIds = new Set(progress.completedLessons);
  return requiredLessons.every((lessonId) => isLessonMastered(lessonId, completedIds, progress.lessonScores));
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

function buildProficiencyEvidence(progress: LearningProgress, outputEvidence: OutputEvidenceInput = { outputs: getOutputState().entries, srs: getSrsState() }) {
  const outputEntries = countValidOutputEvidence(outputEvidence);
  const materialEntries = countValidMaterialEvidence(progress, outputEvidence);
  const checkpointCredits = countCheckpointCredits(progress);
  const ability = buildEvidenceBackedAbility(progress, outputEvidence);
  return {
    lessons: progress.completedLessons.length,
    hangul: progress.masteredHangul.length,
    vocabulary: progress.learnedVocab.length,
    grammar: progress.learnedGrammar.length,
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

export function hasCompleteNativePracticeEvidence(evidence: NativeEvidenceInput | null | undefined, itemId = "") {
  const sources = nativeEvidenceSources(itemId);
  return Boolean(evidence?.listened) &&
    hasKoreanRetellEvidence(evidence?.retell ?? "", sources) &&
    hasKoreanOutputRewrite(evidence?.transfer ?? "") &&
    (!sources.length || hasKoreanContentOverlap(evidence?.transfer ?? "", sources));
}

function nativeEvidenceSources(itemId: string) {
  if (itemId.startsWith("pragmatics:")) {
    return pragmaticScenarios.find((item: any) => `pragmatics:${item.id}` === itemId)?.lines?.map((line: any) => line.ko) ?? [];
  }
  if (itemId.startsWith("nuance:")) {
    const item = nuanceSets.find((entry: any) => `nuance:${entry.id}` === itemId);
    return [...(item?.contrast ?? []), ...(item?.examples ?? []).map((example: any) => example.ko)];
  }
  return [];
}

export function findCompletedCheckpointCredit(progress: LearningProgress, checkpointId: string) {
  const clean = checkpointId.trim();
  if (!clean) return null;
  const hasValidEvidence = (id: string) => validateCheckpointEvidence(progress.checkpointEvidence[id] ?? "");
  if (progress.completedCheckpoints.includes(clean) && hasValidEvidence(clean)) return clean;
  const targetKey = checkpointCreditKey(clean);
  return progress.completedCheckpoints.find((id) => checkpointCreditKey(id) === targetKey && hasValidEvidence(id)) ?? null;
}

export function countValidOutputEvidence(input: OutputEvidenceInput = { outputs: getOutputState().entries, srs: getSrsState() }) {
  if (typeof input === "number") return Math.max(0, Math.trunc(input));
  return input.outputs.filter((entry) => hasValidOutputEvidence(entry, input.srs)).length;
}

function srsEvidenceFromInput(input: OutputEvidenceInput = { outputs: getOutputState().entries, srs: getSrsState() }) {
  return typeof input === "number" ? getSrsState() : input.srs;
}

export function getValidOutputEntries(outputs: OutputEntry[] = getOutputState().entries, srs: SrsState = getSrsState()) {
  return outputs.filter((entry) => hasValidOutputEvidence(entry, srs));
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

function findTaskById(workspace: LearningWorkspace, taskId: string) {
  return [...workspace.recommended, ...workspace.openStudy].find((task) => task.id === taskId);
}

function markTasksCompleted(
  tasks: StudyTask[],
  progress: LearningProgress,
  context: { dueCount?: number; outputEvidence?: OutputEvidenceInput } = {}
) {
  return tasks.map((task) => ({ ...task, completed: isTaskCompleted(task, progress, context) }));
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

export function applyLessonCompletion(progress: LearningProgress, lessonId: string, score = 0, assessmentReady = true) {
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
  const wasUnlocked = lessonIdSet.has(lessonId) && prerequisitesMet;
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

export function commitLessonSession(lessonId: string, answers: LessonAnswerCommitEntry[], score = 0, fallbackProgress: LearningProgress = defaultProgress()) {
  const current = normalizeLearningProgress(readJson(STORAGE_KEYS.progress, fallbackProgress));
  if (lessonId === CAPSTONE_LESSON_ID && score >= UNLOCK_SCORE && !isValidCapstoneEvidence(current.capstoneEvidence)) return false;
  const lesson = lessons.find((item: any) => item.id === lessonId);
  const task = lessonCompletionTask(lesson);
  if (score >= UNLOCK_SCORE && !checkLessonTaskEvidence(task, current.lessonTaskEvidence[lessonId]).ready) return false;
  const assessment = answers.length
    ? assessLessonAttempt(
        { ...lesson, drills: (lesson?.drills ?? []).map((question: any, index: number) => ({ ...question, id: question.id ?? lessonReviewCardId(lessonId, index) })) },
        answers as any,
        score
      )
    : null;
  const { next, previousScore, canMasterCorePath, wasUnlocked, knownLesson } = applyLessonCompletion(current, lessonId, score, assessment?.corePassed ?? true);
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

export function gradeReviewCardAndProgress(card: SrsCard, isCorrect: boolean) {
  const previousProgress = normalizeLearningProgress(readJson(STORAGE_KEYS.progress, defaultProgress()));
  const previousSrs = getSrsState();
  const current = previousSrs.cards[card.id];
  if (!current) return false;
  const at = Date.now();
  if (current.dueAt > at || !sameReviewCardSnapshot(current, card)) return false;
  const graded = applyGradeToState(previousSrs, card.id, isCorrect, at);
  if (!graded) return false;

  if (!saveSrsState(graded.state)) return false;
  const reviewQueueCleared = getDueCardsFromState(graded.state, 1, at).length === 0;
  const nextProgress = applyReviewProgress(previousProgress, current, isCorrect, reviewQueueCleared);
  if (!saveLearningProgress(nextProgress)) {
    saveSrsState(previousSrs);
    return false;
  }
  return true;
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
    current.lapses === submitted.lapses;
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

function taskForPracticeRepair(progress: LearningProgress, priority = 86): StudyTask | null {
  const weakItems = getWeakPracticeItems(progress);
  if (!weakItems.length) return null;
  const sourceLabels = [...new Set(weakItems.map((item) => item.lastSource))]
    .map((source) => source === "lesson" ? "课程" : source === "review" ? "复习" : "测验")
    .join(" / ");
  return {
    id: TASK_IDS.systemPracticeRepair,
    kind: "quiz",
    title: "修复最近错过的具体题",
    detail: `${weakItems.length} 个具体题最后一次没有答对，来自${sourceLabels || "练习"}记录；先用迁移测验把它们重新答对。`,
    href: "/quiz",
    minutes: Math.min(14, Math.max(6, weakItems.length * 2)),
    ability: abilitiesForPracticeItems(weakItems),
    source: "system",
    priority,
    lane: "bridge",
    reason: "逐题历史已经显示出具体断点，先修掉它们，再继续推新内容会更稳。",
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
  if (dueCount > 0) {
    tasks.push({
      id: TASK_IDS.systemReview,
      kind: "review",
      title: "处理到期复习",
      detail: `${dueCount} 张卡片已经到期，先把记忆债清掉。`,
      href: "/review",
      minutes: Math.min(12, Math.max(5, dueCount * 2)),
      ability: ["script", "vocabulary"],
      source: "system",
      priority: 100,
      lane: "core",
      reason: "先清掉到期队列，避免旧内容拖住新输入。"
    });
  }

  if (nextLesson) {
    tasks.push({
      id: lessonTaskId(nextLesson.id),
      kind: "lesson",
      title: nextLesson.title,
      detail: nextLesson.subtitle,
      href: `/learn/${nextLesson.id}`,
      minutes: nextLesson.duration ?? 15,
      ability: mapFocusToAbilities(nextLesson.focus),
      source: "guided",
      priority: profile.studyMode === "guided" ? 90 : 65,
      lane: "core",
      reason: profile.studyMode === "guided" ? "主线推进到下一课。" : "主线还没断，但优先级稍低于到期复习。"
    });
  }

  const practiceRepairTask = taskForPracticeRepair(progress);
  if (practiceRepairTask) tasks.push(practiceRepairTask);

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
        detail: reviewBlock?.detail ?? "先处理 SRS 到期卡片，只复习已经学过的内容。",
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
        title: studyModule.title,
        detail: studyModule.daily ?? template?.detail ?? "完成一个可记录的自学动作。",
        href: studyModule.href ?? hrefForStudyModule(studyModule.id),
        minutes: template?.minutes ?? Math.min(14, profile.minutesGoal),
        ability: [ability],
        source: "self",
        priority: 84 - index * 3,
        lane: "self",
        reason: `自学方案中优先照顾「${studyModule.title}」。`
      });
    }
  }

  const readyMaterial = nextReadyImmersionMaterial(progress, outputEvidence);
  if (readyMaterial) {
    tasks.push({
      id: TASK_IDS.systemImmersion,
      kind: "immersion",
      title: "真实材料输入与输出",
      detail: `${readyMaterial.title} 已满足先修：听写、复述，再把输出弱点送回复习。`,
      href: immersionMaterialHref(readyMaterial.id),
      minutes: Math.min(24, Math.max(14, readyMaterial.minutes)),
      ability: mapFocusToAbilities(readyMaterial.focus),
      source: "system",
      priority: profile.selfStudyGoal === "media" || profile.selfStudyGoal === "native" ? 82 : 58,
      lane: "bridge",
      reason: readyMaterial.recommendedLessons.length ? "真实材料已经满足先修，适合正式进入输入输出闭环。" : "先把材料加入观察队列，等待先修补齐。"
    });
  }

  const nativeTask = taskForNativeBridge(profile, progress, outputEvidence);
  if (nativeTask) tasks.push(nativeTask);

  return tasks
    .reduce(dedupeTasks, [] as StudyTask[])
    .map((task) => ({ ...task, completed: isTaskCompleted(task, progress, { dueCount, outputEvidence }) }))
    .sort((a, b) => Number(a.completed) - Number(b.completed) || b.priority - a.priority)
    .slice(0, 8);
}

function isTaskCompleted(
  task: StudyTask,
  progress: LearningProgress,
  context: { dueCount?: number; outputEvidence?: OutputEvidenceInput } = {}
) {
  if (task.id === TASK_IDS.systemReview) return (context.dueCount ?? 0) <= 0 && progress.completedTasks[task.id] === todayKey();
  if (task.id === TASK_IDS.systemPracticeRepair) return getWeakPracticeItems(progress).length === 0;
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

function buildOpenStudyTasks(profile: UserProfile, progress: LearningProgress, nextLesson: any | null, outputEvidence: OutputEvidenceInput = { outputs: getOutputState().entries, srs: getSrsState() }): StudyTask[] {
  const plan = buildSelfStudyPlan(profile as any);
  const abilityEvidence = buildEvidenceBackedAbility(progress, outputEvidence);
  const weak = (Object.entries(abilityEvidence) as Array<[AbilityId, number]>).sort((a, b) => a[1] - b[1])[0]?.[0] ?? "script";
  const readyMaterial = nextReadyImmersionMaterial(progress, outputEvidence);
  const validMaterialIds = new Set(getValidMaterialIds(progress, outputEvidence));
  const previewMaterial = immersionMaterials.find((material) => !validMaterialIds.has(material.id)) ?? immersionMaterials[0];
  const mistakeSummary = summarizeMistakes(srsEvidenceFromInput(outputEvidence));
  const practiceRepairTask = taskForPracticeRepair(progress, 59);
  const tasks: StudyTask[] = [
    nextLesson
      ? {
          id: TASK_IDS.openNextLesson,
          kind: "lesson",
          title: "继续课程线",
          detail: nextLesson.title,
          href: `/learn/${nextLesson.id}`,
          minutes: nextLesson.duration ?? 15,
          ability: mapFocusToAbilities(nextLesson.focus),
          source: "guided",
          priority: 70,
          lane: "core",
          reason: "先接上下一节核心课，学习链最稳。"
        }
      : {
          id: TASK_IDS.openReview,
          kind: "review",
          title: "核心路径已完成",
          detail: "进入复习、词汇扩展和母语者表达训练。",
          href: "/review",
          minutes: 12,
          ability: ["vocabulary"],
          source: "system",
          priority: 70,
          lane: "core",
          reason: "核心课已经跑通，先回到复习闭环。"
        },
    { ...taskForAbility(weak, profile, 68), lane: "bridge" as const, reason: "优先补当前最弱的一项能力。"},
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
      reason: "自学方案需要先被确认，之后首页才会按这个节奏重排。",
      completionLabel: "今日已确认",
      completionAsset: "selfStudy"
    },
    {
      id: TASK_IDS.openImmersion,
      kind: "immersion",
      title: readyMaterial ? "真实材料实验室" : "真实材料预览",
      detail: readyMaterial
        ? `${readyMaterial.title} 已满足先修，可以正式完成并加入 SRS。`
        : "可以自由试听和保存输出草稿；先修达标前不会写入能力护照。",
      href: readyMaterial ? immersionMaterialHref(readyMaterial.id) : previewMaterial ? immersionMaterialHref(previewMaterial.id) : "/immersion",
      minutes: readyMaterial?.minutes ?? 18,
      ability: readyMaterial ? mapFocusToAbilities(readyMaterial.focus) : ["listening", "pragmatics", "native"],
      source: "system",
      priority: readyMaterial ? 62 : 42,
      lane: readyMaterial ? "bridge" : "expansion",
      reason: readyMaterial ? "先修已达标，材料可以正式进闭环。" : "先把这段材料当预览池，不要把它当完成。"
    },
    ...(practiceRepairTask ? [practiceRepairTask] : []),
    ...(mistakeSummary.total ? [{
      id: TASK_IDS.openMistakes,
      kind: "review" as const,
      title: "薄弱项地图",
      detail: `${mistakeSummary.total} 张错题卡，其中 ${mistakeSummary.due} 张已经到期。先看错因分布，再决定回课程、词汇、语法还是材料。`,
      href: "/mistakes",
      minutes: Math.min(12, Math.max(5, mistakeSummary.total * 2)),
      ability: ["vocabulary", "grammar", "listening"] as AbilityId[],
      source: "system" as const,
      priority: 58,
      lane: "bridge" as const,
      reason: "把反复出错的点汇总成修复顺序，避免只刷到期卡却不知道弱在哪里。"
    }] : []),
    {
      id: TASK_IDS.openQuiz,
      kind: "quiz",
      title: "综合迁移测验",
      detail: "混合韩文、发音、词汇和语法，检查能不能跨模块调用。",
      href: "/quiz",
      minutes: 10,
      ability: ["script", "listening", "vocabulary", "grammar"],
      source: "system",
      priority: 55,
      lane: "bridge",
      reason: "把已学内容拉到同一张桌上，检查迁移是否成立。"
    }
  ];
  return tasks;
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
      title: "词汇带场景入册",
      detail: "只把能造句的词加入 SRS，避免背孤立中文释义。",
      href: "/vocabulary",
      minutes: 12
    },
    grammar: {
      kind: "grammar",
      title: "句型骨架工坊",
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
      title: "母语者缓冲表达",
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
    native: "先练语气缓冲和上下文动作，母语者层才不会悬空。"
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
  outputEvidence: OutputEvidenceInput = { outputs: getOutputState().entries, srs: getSrsState() }
): StudyTask | null {
  const moduleEvidence = selfStudyModuleEvidence(progress, outputEvidence);
  if (!selfStudyModuleGateMet("native", moduleEvidence)) return null;
  const nativeEvidence = countNativePracticeEvidence(progress) + countCheckpointCredits(progress) + countValidOutputEvidence(outputEvidence);
  return {
    id: "system:native-bridge",
    kind: "native",
    title: "母语者桥接",
    detail: nativeEvidence > 0
      ? `当前已累计 ${nativeEvidence} 条桥接证据，把关系、语气和材料输出接回同一条线。`
      : "如果目标是母语者级表达，现在开始把语用、材料和输出证据串起来。",
    href: "/native",
    minutes: 14,
    ability: ["pragmatics", "native"],
    source: profile.selfStudyGoal === "native" ? "self" : "system",
    priority: profile.selfStudyGoal === "native" ? 76 : 52,
    lane: "bridge",
    reason: "母语者层不再是单独专区，而是从真实材料和输出证据里长出来。"
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

function hangulRemovalCardIds(itemId: string) {
  return [hangulCardId(itemId), mistakeCardId(hangulQuestionId(itemId))];
}

function pronunciationRemovalCardIds(itemId: string) {
  return [pronunciationCardId(itemId), mistakeCardId(pronunciationQuestionId(itemId))];
}

function vocabRemovalCardIds(itemId: string) {
  return [
    vocabCardId(itemId),
    mistakeCardId(vocabQuestionId(itemId)),
    mistakeCardId(vocabDictationQuestionId(itemId)),
    mistakeCardId(vocabClozeQuestionId(itemId))
  ];
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

function hasListeningFocus(lessonId: string) {
  const lesson = lessons.find((item: any) => item.id === lessonId);
  return Boolean(lesson && mapFocusToAbilities(lesson.focus).includes("listening"));
}

function lessonAbilitiesWithEvidence(lesson: any, hasListeningEvidence: boolean) {
  const abilities = mapFocusToAbilities(lesson?.focus);
  return hasListeningEvidence ? abilities : abilities.filter((ability) => ability !== "listening");
}

function lessonAbilityDelta(score: number) {
  return score >= 85 ? 9 : score >= 65 ? 6 : score > 0 ? 3 : 0;
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

export function validateCheckpointEvidence(evidence: string) {
  const clean = evidence.trim();
  return clean.length >= 6 && checkpointSignalPattern.test(clean) && checkpointMeasurementPattern.test(clean);
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

function mapLessonCardToAbilities(itemId: string): AbilityId[] {
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

function mapMistakeCardToAbilities(itemId: string): AbilityId[] {
  return mapQuestionToAbilities(itemId);
}

function mapQuestionToAbilities(questionId: string): AbilityId[] {
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

function isAbilityId(value: unknown): value is AbilityId {
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

export function normalizeUserProfile(input: Partial<UserProfile> | null | undefined): UserProfile {
  const source = isRecord(input) ? input : {};
  return {
    ...defaultProfile(),
    ...source,
    name: typeof source.name === "string" && source.name.trim() ? source.name.trim() : "Learner",
    studyMode: source.studyMode === "guided" ? "guided" : "self",
    minutesGoal: clampNumber(source.minutesGoal, 5, 120, 30),
    selfStudyGoal: ["foundation", "travel", "media", "native"].includes(String(source.selfStudyGoal)) ? source.selfStudyGoal as UserProfile["selfStudyGoal"] : "foundation",
    selfStudyIntensity: ["light", "steady", "deep"].includes(String(source.selfStudyIntensity)) ? source.selfStudyIntensity as UserProfile["selfStudyIntensity"] : "steady",
    selfStudyFocus: ["balanced", "listening", "reading", "conversation"].includes(String(source.selfStudyFocus)) ? source.selfStudyFocus as UserProfile["selfStudyFocus"] : "balanced",
    romanization: ["fade", "always", "hidden"].includes(String(source.romanization)) ? source.romanization as UserProfile["romanization"] : "fade",
    onboardedAt: typeof source.onboardedAt === "string" && source.onboardedAt.trim() ? source.onboardedAt : undefined
  };
}

export function normalizeLearningProgress(
  input: Partial<LearningProgress> | null | undefined,
  options: { enforceRecordingEvidence?: boolean } = {}
): LearningProgress {
  const fallback = defaultProgress();
  const source = isRecord(input) ? input : {};
  const lessonScores = normalizeLessonScores(source.lessonScores, source.completedLessons);
  const lessonTaskEvidence = normalizeLessonTaskEvidenceRecord(source.lessonTaskEvidence);
  const capstoneEvidence = normalizeCapstoneEvidence(source.capstoneEvidence);
  const completedLessons = normalizeCompletedLessons(
    source.completedLessons,
    lessonScores,
    lessonTaskEvidence,
    capstoneEvidence,
    options.enforceRecordingEvidence === true
  );
  return {
    ...fallback,
    ...source,
    completedLessons,
    lessonScores,
    previewLessonScores: normalizeLessonScores(source.previewLessonScores),
    lessonListeningEvidence: normalizeLessonListeningEvidence(
      source.lessonListeningEvidence,
      completedLessons,
      !Object.prototype.hasOwnProperty.call(source, "lessonListeningEvidence")
    ),
    lessonProductionEvidence: normalizeLessonProductionEvidence(
      source.lessonProductionEvidence,
      completedLessons,
      !Object.prototype.hasOwnProperty.call(source, "lessonProductionEvidence")
    ),
    lessonTaskEvidence,
    masteredHangul: filterKnownIds(source.masteredHangul, hangulIdSet),
    learnedVocab: filterKnownIds(source.learnedVocab, vocabIdSet),
    learnedGrammar: filterKnownIds(source.learnedGrammar, grammarIdSet),
    learnedNative: filterKnownIds(source.learnedNative, nativeIdSet),
    nativeEvidence: normalizeNativeEvidence(source.nativeEvidence),
    completedMaterials: filterKnownIds(source.completedMaterials, materialIdSet),
    materialEvidence: normalizeMaterialEvidence(source.materialEvidence),
    capstoneEvidence,
    completedCheckpoints: normalizeStringIds(source.completedCheckpoints),
    checkpointEvidence: normalizeTextRecord(source.checkpointEvidence),
    completedTasks: normalizeCompletedTasks(source.completedTasks),
    ability: normalizeAbility(isRecord(source.ability) ? source.ability : undefined),
    abilityEvents: normalizeAbilityEvents(source.abilityEvents),
    practiceItems: normalizePracticeItems(source.practiceItems),
    streak: clampNumber(source.streak, 0, 3650, 0),
    lastStudyDate: typeof source.lastStudyDate === "string" ? source.lastStudyDate : fallback.lastStudyDate,
    minutesGoal: clampNumber(source.minutesGoal, 5, 120, fallback.minutesGoal),
    updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : fallback.updatedAt
  };
}

function normalizeNativeEvidence(input: unknown): LearningProgress["nativeEvidence"] {
  const source = isRecord(input) ? input : {};
  const result: LearningProgress["nativeEvidence"] = {};
  for (const [rawId, value] of Object.entries(source).slice(0, 240)) {
    const itemId = rawId.trim();
    if (!nativeIdSet.has(itemId) || !isRecord(value)) continue;
    const evidence = normalizeNativeEvidenceEntry(value);
    if (hasCompleteNativePracticeEvidence(evidence, itemId)) result[itemId] = evidence;
  }
  return result;
}

function normalizeNativeEvidenceEntry(input: NativeEvidenceInput | Record<string, unknown>): LearningProgress["nativeEvidence"][string] {
  return {
    listened: input.listened === true,
    retell: normalizeEvidenceText(input.retell, 1200),
    transfer: normalizeEvidenceText(input.transfer, 1200),
    updatedAt: typeof input.updatedAt === "string" && input.updatedAt.trim() ? input.updatedAt : nowIso()
  };
}

function normalizeEvidenceText(input: unknown, maxLength: number) {
  return typeof input === "string" ? input.trim().slice(0, maxLength) : "";
}

function filterKnownIds(input: unknown, known: Set<string>) {
  return Array.isArray(input) ? [...new Set(input.map(String).filter((id) => known.has(id)))] : [];
}

function normalizeCompletedLessons(
  input: unknown,
  lessonScores: Record<string, number>,
  lessonTaskEvidence: LearningProgress["lessonTaskEvidence"],
  capstoneEvidence: CapstoneEvidence | null,
  enforceRecordingEvidence: boolean
) {
  const requested = new Set(filterKnownIds(input, lessonIdSet));
  const valid: string[] = [];
  const validSet = new Set<string>();
  for (const lesson of lessons) {
    if (!requested.has(lesson.id)) continue;
    if (Number(lessonScores[lesson.id] ?? 0) < UNLOCK_SCORE) continue;
    if (enforceRecordingEvidence) {
      const completionTask = lessonCompletionTask(lesson);
      if (completionTask?.kind === "shadowing" && !checkLessonTaskEvidence(completionTask, lessonTaskEvidence[lesson.id]).ready) continue;
      if (lesson.id === CAPSTONE_LESSON_ID && !isValidCapstoneEvidence(capstoneEvidence)) continue;
    }
    const prerequisitesMet = getLessonPrerequisites(lesson.id).every((item: any) => {
      return validSet.has(item.id) && Number(lessonScores[item.id] ?? 0) >= UNLOCK_SCORE;
    });
    if (!prerequisitesMet) continue;
    valid.push(lesson.id);
    validSet.add(lesson.id);
  }
  return valid;
}

function normalizeLessonListeningEvidence(input: unknown, completedLessons: string[], assumeLegacyEvidence: boolean) {
  const source = isRecord(input) ? input : {};
  const result: Record<string, boolean> = {};
  for (const lessonId of completedLessons) {
    if (!hasListeningFocus(lessonId)) continue;
    if (typeof source[lessonId] === "boolean") result[lessonId] = source[lessonId] === true;
    else if (assumeLegacyEvidence) result[lessonId] = true;
  }
  return result;
}

function normalizeLessonProductionEvidence(input: unknown, completedLessons: string[], assumeLegacyEvidence: boolean) {
  const source = isRecord(input) ? input : {};
  const result: Record<string, boolean> = {};
  for (const lessonId of completedLessons) {
    if (typeof source[lessonId] === "boolean") result[lessonId] = source[lessonId] === true;
    else if (assumeLegacyEvidence) result[lessonId] = true;
  }
  return result;
}

function normalizeLessonTaskEvidenceRecord(input: unknown): LearningProgress["lessonTaskEvidence"] {
  const source = isRecord(input) ? input : {};
  const result: LearningProgress["lessonTaskEvidence"] = {};
  for (const [lessonId, value] of Object.entries(source)) {
    const lesson = lessons.find((item: any) => item.id === lessonId);
    const task = lessonCompletionTask(lesson);
    const evidence = normalizeLessonTaskEvidence(value);
    if (task && evidence && evidence.kind === task.kind && checkLessonTaskEvidence(task, evidence).ready) {
      result[lessonId] = evidence;
    }
  }
  return result;
}

function normalizeLessonScores(input: unknown, completedInput?: unknown) {
  const result: Record<string, number> = {};
  if (!input || typeof input !== "object") return result;
  for (const [lessonId, score] of Object.entries(input)) {
    if (lessonIdSet.has(lessonId)) result[lessonId] = clampNumber(score, 0, 100, 0);
  }
  for (const lessonId of filterKnownIds(completedInput, lessonIdSet)) {
    if (typeof result[lessonId] !== "number") result[lessonId] = UNLOCK_SCORE;
  }
  return result;
}

function normalizeCompletedTasks(input: unknown) {
  const result: Record<string, string> = {};
  if (!input || typeof input !== "object") return result;
  for (const [taskId, date] of Object.entries(input)) {
    if (typeof date === "string" && date) result[taskId] = date;
  }
  return result;
}

function normalizeStringIds(input: unknown) {
  return Array.isArray(input) ? [...new Set(input.map(String).filter((id) => id.trim()))] : [];
}

function normalizePracticeItemId(input: unknown) {
  const value = typeof input === "string" ? input.trim() : "";
  if (!value || value.length > 220) return "";
  return value.replace(/\s+/g, " ");
}

function practiceSeenAtMs(value: string) {
  const parsed = Date.parse(value || "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeCheckpointPart(input: string) {
  return input.trim().replace(/\s+/g, " ");
}

function normalizeTextRecord(input: unknown) {
  const result: Record<string, string> = {};
  if (!input || typeof input !== "object") return result;
  for (const [key, value] of Object.entries(input)) {
    if (typeof key === "string" && key.trim() && typeof value === "string" && value.trim()) result[key] = value.trim();
  }
  return result;
}

function normalizeMaterialEvidence(input: unknown) {
  const result: LearningProgress["materialEvidence"] = {};
  if (!input || typeof input !== "object") return result;
  for (const [materialId, value] of Object.entries(input)) {
    if (!materialIdSet.has(materialId) || !isRecord(value)) continue;
    const material = immersionMaterials.find((item) => item.id === materialId);
    const dictation = typeof value.dictation === "string" ? value.dictation.trim() : "";
    const retell = typeof value.retell === "string" ? value.retell.trim() : "";
    const selfCheck = normalizeMaterialSelfCheck(value.selfCheck, material);
    const outputEntryId = typeof value.outputEntryId === "string" && value.outputEntryId.trim() ? value.outputEntryId.trim() : undefined;
    const updatedAt = typeof value.updatedAt === "string" ? value.updatedAt : nowIso();
    if (dictation || retell || selfCheck.length || outputEntryId) {
      result[materialId] = outputEntryId
        ? { dictation, retell, selfCheck, outputEntryId, updatedAt }
        : { dictation, retell, selfCheck, updatedAt };
    }
  }
  return result;
}

function normalizeMaterialSelfCheck(input: unknown, material?: { selfCheck?: string[] } | null) {
  const allowed = new Set(material?.selfCheck ?? []);
  if (!Array.isArray(input)) return [];
  return [...new Set(input.map(String).filter((item) => item.trim() && allowed.has(item)))];
}

function normalizeAbilityEvents(input: unknown) {
  const result: LearningProgress["abilityEvents"] = {};
  if (!input || typeof input !== "object") return result;
  for (const [eventId, value] of Object.entries(input)) {
    if (!eventId.trim()) continue;
    if (isRecord(value)) {
      const eventValue: Partial<Record<AbilityId, number>> = {};
      for (const ability of abilityIds) {
        const applied = clampNumber(value[ability], 0, 100, 0);
        if (applied > 0) eventValue[ability] = applied;
      }
      result[eventId] = Object.keys(eventValue).length ? eventValue : 0;
    } else {
      result[eventId] = clampNumber(value, 0, 100, 0);
    }
  }
  return result;
}

function normalizePracticeItems(input: unknown) {
  const result: LearningProgress["practiceItems"] = {};
  if (!input || typeof input !== "object") return result;
  for (const [rawId, value] of Object.entries(input).slice(0, 1200)) {
    const itemId = normalizePracticeItemId(rawId);
    if (!itemId || !isRecord(value)) continue;
    const correct = clampNumber(value.correct, 0, 10000, 0);
    const wrong = clampNumber(value.wrong, 0, 10000, 0);
    const attempts = Math.max(clampNumber(value.attempts, 0, 20000, 0), correct + wrong);
    if (!attempts) continue;
    const lastSource = value.lastSource === "review" || value.lastSource === "quiz" ? value.lastSource : "lesson";
    result[itemId] = {
      attempts,
      correct,
      wrong,
      streak: clampNumber(value.streak, 0, attempts, 0),
      lastCorrect: Boolean(value.lastCorrect),
      lastSeenAt: typeof value.lastSeenAt === "string" && value.lastSeenAt.trim() ? value.lastSeenAt : nowIso(),
      lastSource
    };
  }
  return result;
}

function normalizeAbilityEventValue(value: unknown, abilities: AbilityId[]): Partial<Record<AbilityId, number>> {
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

function compactAbilityEventValue(value: Partial<Record<AbilityId, number>>, abilities: AbilityId[]) {
  const entries = abilities
    .map((ability) => [ability, clampNumber(value[ability], 0, 100, 0)] as const)
    .filter(([, applied]) => applied > 0);
  if (!entries.length) return 0;
  const first = entries[0][1];
  if (entries.length === abilities.length && entries.every(([, applied]) => applied === first)) return first;
  return Object.fromEntries(entries) as Partial<Record<AbilityId, number>>;
}

function normalizeAbility(input: Partial<Record<AbilityId, number>> | undefined) {
  const result = defaultProgress().ability;
  for (const ability of abilityIds) {
    result[ability] = clampNumber(input?.[ability], 0, 100, result[ability]);
  }
  return result;
}

function clampNumber(input: unknown, min: number, max: number, fallback: number) {
  const value = Number(input);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return Boolean(input) && typeof input === "object" && !Array.isArray(input);
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
