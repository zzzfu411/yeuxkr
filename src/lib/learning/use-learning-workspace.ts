"use client";

import { createContext, createElement, useCallback, useContext, useMemo, type ReactNode } from "react";

import { defaultProfile, defaultProgress, parseJson, readJson, STORAGE_KEYS, useClientNow, useStorageRaw } from "./storage.ts";
import { getOutputStateFromRaw } from "./output.ts";
import { getSrsStateFromRaw, summarizeSrsState } from "./srs.ts";

import type { AbilityId, CapstoneEvidence, LearningProgress, UserProfile } from "@/lib/learning/types";

import { type OutputArchiveInput, type LessonAnswerCommitEntry, buildLearningWorkspace, applyCheckpointCompletion, toggleHangulItem, togglePronunciationPair, toggleSoundChangeRule, toggleVocabItem, toggleGrammarPoint, ensureHangulItemMastered, ensurePronunciationPairMastered, ensureSoundChangeRuleMastered, ensureVocabItemMastered, ensureGrammarPointMastered, toggleNativeItem, type NativeEvidenceInput, saveNativePracticeEvidence, persistOutputReview, saveOutputArchiveEntry, completeMaterialEvidence, saveCapstonePracticeEvidence, saveLessonTaskPracticeEvidence, invalidateLessonTaskRecordingEvidence, invalidateCapstoneRecordingEvidence, clearMaterialArchiveEvidence, getValidOutputEntries, saveLearningProgress, saveUserProfileAndProgress, saveSelfStudyPlanAndProgress, saveSelfStudyCheckpointAndProgress, resetLearningWorkspace, commitLessonSession, recordQuizProgress, normalizeUserProfile, normalizeLearningProgress } from "./workspace.ts";

const LearningWorkspaceContext = createContext<ReturnType<typeof useLearningWorkspaceState> | null>(null);

export function LearningWorkspaceProvider({ children }: { children: ReactNode }) {
  const state = useLearningWorkspaceState();
  return createElement(LearningWorkspaceContext.Provider, { value: state }, children);
}

/** One storage subscription and derived workspace per application tree. */
export function useLearningWorkspace() {
  const state = useContext(LearningWorkspaceContext);
  if (!state) throw new Error("LearningWorkspaceProvider is required");
  return state;
}

function useLearningWorkspaceState() {
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
    completeCheckpoint,
    clearMaterialArchive,
    recordQuizProgress,
    reset
  };
}
