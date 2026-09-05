// Pure normalization and evidence validation for persisted profile/progress data.
import { lessons, getLessonPrerequisites, UNLOCK_SCORE } from "../../data/curriculum-runtime.js";
import { hangulGroups } from "../../data/hangul.js";
import { vocab } from "../../data/lexicon.js";
import { grammarPoints } from "../../data/grammar.js";
import { pragmaticScenarios } from "../../data/pragmatics.js";
import { nuanceSets } from "../../data/nuance.js";

import { immersionMaterials } from "../../data/materials.ts";

import { CAPSTONE_LESSON_ID, isValidCapstoneEvidence, normalizeCapstoneEvidence } from "./capstone.ts";
import { hasKoreanContentOverlap, hasKoreanOutputRewrite, hasKoreanRetellEvidence, mapFocusToAbilities } from "./evidence.ts";

import { checkLessonTaskEvidence, lessonCompletionTask, normalizeLessonTaskEvidence } from "./lesson-evidence.ts";
import { defaultProfile, defaultProgress, nowIso } from "./storage.ts";

import type { AbilityId, CapstoneEvidence, LearningProgress, UserProfile } from "@/lib/learning/types";

export const abilityLabels: Record<AbilityId, string> = {
  script: "韩文字母",
  listening: "听辨发音",
  vocabulary: "词汇搭配",
  grammar: "句型语法",
  pragmatics: "场景语用",
  native: "自然表达"
};

export const abilityIds = Object.keys(abilityLabels) as AbilityId[];

export const lessonIdSet: Set<string> = new Set(lessons.map((lesson: any) => String(lesson.id)));

export const hangulIdSet = new Set(hangulGroups.flatMap((group: any) => group.items.map((item: any) => item.id)));

export const vocabIdSet = new Set(vocab.map((item: any) => item.id));

export const grammarIdSet = new Set(grammarPoints.map((item: any) => item.id));

export const nativeIdSet = new Set([
  ...pragmaticScenarios.map((item: any) => `pragmatics:${item.id}`),
  ...nuanceSets.map((item: any) => `nuance:${item.id}`)
]);

export const materialIdSet = new Set(immersionMaterials.map((item) => item.id));

export type NativeEvidenceInput = { listened?: boolean; retell?: string; transfer?: string; updatedAt?: string };

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

export function hasListeningFocus(lessonId: string) {
  const lesson = lessons.find((item: any) => item.id === lessonId);
  return Boolean(lesson && mapFocusToAbilities(lesson.focus).includes("listening"));
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
    source.lessonTaskEvidence,
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

export function normalizeNativeEvidenceEntry(input: NativeEvidenceInput | Record<string, unknown>): LearningProgress["nativeEvidence"][string] {
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

function completionTaskBlocksMastery(lesson: unknown, rawTaskEvidence: unknown, enforceRecordingEvidence: boolean) {
  const task = lessonCompletionTask(lesson);
  if (!task) return false;
  const rawEntry = isRecord(rawTaskEvidence) ? rawTaskEvidence[(lesson as { id?: string }).id ?? ""] : undefined;
  const ready = checkLessonTaskEvidence(task, rawEntry).ready;
  if (ready) return false;
  if (enforceRecordingEvidence) return true;
  return isRecord(rawEntry);
}

function normalizeCompletedLessons(
  input: unknown,
  lessonScores: Record<string, number>,
  lessonTaskEvidence: unknown,
  capstoneEvidence: CapstoneEvidence | null,
  enforceRecordingEvidence: boolean
) {
  const requested = new Set(filterKnownIds(input, lessonIdSet));
  const valid: string[] = [];
  const validSet = new Set<string>();
  for (const lesson of lessons) {
    if (!requested.has(lesson.id)) continue;
    if (Number(lessonScores[lesson.id] ?? 0) < UNLOCK_SCORE) continue;
    if (completionTaskBlocksMastery(lesson, lessonTaskEvidence, enforceRecordingEvidence)) continue;
    if (enforceRecordingEvidence && lesson.id === CAPSTONE_LESSON_ID && !isValidCapstoneEvidence(capstoneEvidence)) continue;
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

export function normalizePracticeItemId(input: unknown) {
  const value = typeof input === "string" ? input.trim() : "";
  if (!value || value.length > 220) return "";
  return value.replace(/\s+/g, " ");
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

export function normalizeMaterialSelfCheck(input: unknown, material?: { selfCheck?: string[] } | null) {
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

function normalizeAbility(input: Partial<Record<AbilityId, number>> | undefined) {
  const result = defaultProgress().ability;
  for (const ability of abilityIds) {
    result[ability] = clampNumber(input?.[ability], 0, 100, result[ability]);
  }
  return result;
}

export function clampNumber(input: unknown, min: number, max: number, fallback: number) {
  const value = Number(input);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

export function isRecord(input: unknown): input is Record<string, unknown> {
  return Boolean(input) && typeof input === "object" && !Array.isArray(input);
}
