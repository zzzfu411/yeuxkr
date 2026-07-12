"use client";

import { defaultProfile, defaultProgress, parseJson, STORAGE_KEYS } from "./storage.ts";
import { getOutputStateFromRaw } from "./output.ts";
import { getSrsStateFromRaw } from "./srs.ts";
import { getLessonPracticeStateFromRaw } from "./lesson-session.ts";
import { getLearningDraftStateFromRaw } from "./drafts.ts";
import { normalizeLearningProgress, normalizeUserProfile } from "./workspace.ts";

export const LEARNING_BACKUP_VERSION = 1;
export const LEARNING_BACKUP_KEYS = Object.values(STORAGE_KEYS);

export interface LearningBackup {
  version: typeof LEARNING_BACKUP_VERSION;
  app: "kirina-korean";
  exportedAt: string;
  entries: Partial<Record<string, string>>;
}

export function createLearningBackup(now = Date.now()): LearningBackup {
  const entries: LearningBackup["entries"] = {};
  if (typeof window !== "undefined") {
    for (const key of LEARNING_BACKUP_KEYS) {
      const normalized = normalizeStoredEntry(key, readRawLearningStorage(key));
      if (normalized !== null) entries[key] = normalized;
    }
  }
  return {
    version: LEARNING_BACKUP_VERSION,
    app: "kirina-korean",
    exportedAt: safeIso(now),
    entries
  };
}

export function parseLearningBackupText(input: string): LearningBackup | null {
  return normalizeLearningBackup(parseJson<Partial<LearningBackup>>(input, {}), { strictEntries: true });
}

export function restoreLearningBackup(input: LearningBackup) {
  if (typeof window === "undefined") return false;
  const backup = normalizeLearningBackup(input);
  if (!backup) return false;
  return applyLearningEntries(backup.entries);
}

export function resetLearningData() {
  if (typeof window === "undefined") return false;
  return applyLearningEntries({});
}

export function normalizeLearningBackup(input: Partial<LearningBackup> | null | undefined, options: { strictEntries?: boolean } = {}): LearningBackup | null {
  if (!input || input.version !== LEARNING_BACKUP_VERSION || input.app !== "kirina-korean" || !input.entries || typeof input.entries !== "object") return null;
  const entries: LearningBackup["entries"] = {};
  for (const key of LEARNING_BACKUP_KEYS) {
    const raw = input.entries[key];
    if (typeof raw !== "string") continue;
    if (options.strictEntries && !isValidStoredEntry(key, raw)) return null;
    const normalized = normalizeStoredEntry(key, raw);
    if (normalized !== null) entries[key] = normalized;
  }
  return {
    version: LEARNING_BACKUP_VERSION,
    app: "kirina-korean",
    exportedAt: safeIso(input.exportedAt),
    entries
  };
}

function applyLearningEntries(entries: Partial<Record<string, string>>) {
  const snapshot = snapshotLearningStorage();
  if (!snapshot) return false;
  try {
    for (const key of LEARNING_BACKUP_KEYS) {
      const value = entries[key];
      writeRawLearningStorage(key, typeof value === "string" ? value : null);
    }
    notifyLearningKeys(LEARNING_BACKUP_KEYS);
    return true;
  } catch {
    rollbackLearningStorage(snapshot);
    return false;
  }
}

function isValidStoredEntry(key: string, raw: string) {
  if (key === STORAGE_KEYS.mistakes) return true;
  if (!LEARNING_BACKUP_KEYS.includes(key)) return false;
  try {
    JSON.parse(raw);
    return true;
  } catch {
    return false;
  }
}

function normalizeStoredEntry(key: string, raw: string | null) {
  if (raw === null) return null;
  if (key === STORAGE_KEYS.profile) return JSON.stringify(normalizeUserProfile(parseJson(raw, defaultProfile())));
  if (key === STORAGE_KEYS.progress) return JSON.stringify(normalizeLearningProgress(parseJson(raw, defaultProgress())));
  if (key === STORAGE_KEYS.srs) return JSON.stringify(getSrsStateFromRaw(raw));
  if (key === STORAGE_KEYS.outputs) return JSON.stringify(getOutputStateFromRaw(raw));
  if (key === STORAGE_KEYS.lessonSession) return JSON.stringify(getLessonPracticeStateFromRaw(raw));
  if (key === STORAGE_KEYS.drafts) return JSON.stringify(getLearningDraftStateFromRaw(raw));
  if (key === STORAGE_KEYS.mistakes) return null;
  return null;
}

function snapshotLearningStorage() {
  try {
    return Object.fromEntries(LEARNING_BACKUP_KEYS.map((key) => [key, readRawLearningStorage(key)])) as Record<string, string | null>;
  } catch {
    return null;
  }
}

function rollbackLearningStorage(snapshot: Record<string, string | null>) {
  try {
    for (const [key, value] of Object.entries(snapshot)) {
      writeRawLearningStorage(key, value);
    }
    notifyLearningKeys(Object.keys(snapshot));
  } catch {}
}

function readRawLearningStorage(key: string) {
  return window.localStorage.getItem(key);
}

function writeRawLearningStorage(key: string, value: string | null) {
  if (value === null) window.localStorage.removeItem(key);
  else window.localStorage.setItem(key, value);
}

function notifyLearningKeys(keys: readonly string[]) {
  for (const key of keys) {
    window.dispatchEvent(new CustomEvent("kirina:learning", { detail: { key } }));
  }
  window.dispatchEvent(new CustomEvent("kirina:learning-batch", { detail: { keys: [...keys] } }));
}

function safeIso(input: unknown) {
  const date = new Date(typeof input === "number" || typeof input === "string" ? input : Date.now());
  if (Number.isNaN(date.getTime())) return new Date(0).toISOString();
  return date.toISOString();
}
