"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { LearningProgress, UserProfile } from "@/lib/learning/types";

export const STORAGE_KEYS = {
  profile: "kirina.profile.v2",
  progress: "kirina.progress.v2",
  srs: "kirina.srs.v2",
  outputs: "kirina.outputs.v1",
  mistakes: "kirina.mistakes.v1",
  lessonSession: "kirina.lesson-session.v1",
  drafts: "kirina.drafts.v1"
};

export function nowIso() {
  return new Date().toISOString();
}

export function todayKey(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

export function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  return parseJson(readRawStorage(key), fallback);
}

export function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJson<T>(key: string, value: T) {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent("kirina:learning", { detail: { key } }));
    return true;
  } catch {
    window.dispatchEvent(new CustomEvent("kirina:learning-error", { detail: { key } }));
    return false;
  }
}

export function useStorageRaw(key: string) {
  return useSyncExternalStore(subscribeStorage, () => readRawStorage(key), serverStorageSnapshot);
}

export function useStorageRawOnce(key: string, refreshKey: unknown = 0) {
  const subscribe = useCallback((onStoreChange: () => void) => {
    void refreshKey;
    return subscribeOnce(onStoreChange);
  }, [refreshKey]);
  const getSnapshot = useCallback(() => {
    return readRawStorage(key);
  }, [key]);
  return useSyncExternalStore(subscribe, getSnapshot, serverStorageSnapshot);
}

export function useClientNow() {
  return useSyncExternalStore(subscribeNow, getNowSnapshot, () => 0);
}

export function useClientNowOnce(refreshKey: unknown = 0) {
  const subscribe = useCallback((onStoreChange: () => void) => {
    void refreshKey;
    return subscribeNowOnce(onStoreChange);
  }, [refreshKey]);
  return useSyncExternalStore(subscribe, getNowOnceSnapshot, () => 0);
}

function readRawStorage(key: string) {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function subscribeStorage(onStoreChange: () => void) {
  if (typeof window === "undefined") return noop;
  window.addEventListener("kirina:learning", onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener("kirina:learning", onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function subscribeOnce(onStoreChange: () => void) {
  if (typeof window === "undefined") return noop;
  const timeout = window.setTimeout(onStoreChange, 0);
  return () => {
    window.clearTimeout(timeout);
  };
}

function serverStorageSnapshot() {
  return null;
}

let nowSnapshot = 0;
let nowOnceSnapshot = 0;

function subscribeNow(onStoreChange: () => void) {
  if (typeof window === "undefined") return noop;
  nowSnapshot = Date.now();
  const timeout = window.setTimeout(onStoreChange, 0);
  const interval = window.setInterval(() => {
    nowSnapshot = Date.now();
    onStoreChange();
  }, 60_000);
  return () => {
    window.clearTimeout(timeout);
    window.clearInterval(interval);
  };
}

function subscribeNowOnce(onStoreChange: () => void) {
  if (typeof window === "undefined") return noop;
  nowOnceSnapshot = Date.now();
  const timeout = window.setTimeout(onStoreChange, 0);
  return () => {
    window.clearTimeout(timeout);
  };
}

function getNowSnapshot() {
  return nowSnapshot;
}

function getNowOnceSnapshot() {
  return nowOnceSnapshot;
}

function noop() {}

export function defaultProfile(): UserProfile {
  return {
    name: "Learner",
    studyMode: "self",
    selfStudyGoal: "foundation",
    selfStudyIntensity: "steady",
    selfStudyFocus: "balanced",
    minutesGoal: 30,
    romanization: "fade",
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
}

export function defaultProgress(): LearningProgress {
  return {
    completedLessons: [],
    lessonScores: {},
    previewLessonScores: {},
    masteredHangul: [],
    learnedVocab: [],
    learnedGrammar: [],
    learnedNative: [],
    nativeEvidence: {},
    completedMaterials: [],
    materialEvidence: {},
    completedCheckpoints: [],
    checkpointEvidence: {},
    completedTasks: {},
    ability: {
      script: 0,
      listening: 0,
      vocabulary: 0,
      grammar: 0,
      pragmatics: 0,
      native: 0
    },
    abilityEvents: {},
    practiceItems: {},
    streak: 0,
    lastStudyDate: null,
    minutesGoal: 30,
    updatedAt: nowIso()
  };
}
