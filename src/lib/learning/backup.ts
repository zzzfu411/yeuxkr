"use client";

import { defaultProfile, defaultProgress, parseJson, STORAGE_KEYS } from "./storage.ts";
import { getOutputStateFromRaw } from "./output.ts";
import { getSrsStateFromRaw } from "./srs.ts";
import { getLessonPracticeStateFromRaw } from "./lesson-session.ts";
import { getLearningDraftStateFromRaw } from "./drafts.ts";
import { getNativePortfolioStateFromRaw } from "./native-portfolio.ts";
import { normalizeLearningProgress, normalizeUserProfile } from "./workspace.ts";
import { normalizeSpeechSettings } from "../speech.js";
import { clearLearningRecordings } from "./recordings.ts";
import { isPlainRecord, validateBackupEntry } from "./backup-schema.ts";

export const LEARNING_BACKUP_VERSION = 1;
export const LEARNING_BACKUP_KEYS = Object.values(STORAGE_KEYS);
/** Keep imports below the browser's typical local-storage quota and bound JSON parsing work. */
export const MAX_LEARNING_BACKUP_BYTES = 4 * 1024 * 1024;
export const MAX_LEARNING_BACKUP_TEXT_LENGTH = MAX_LEARNING_BACKUP_BYTES;

export interface LearningBackup {
  version: typeof LEARNING_BACKUP_VERSION;
  app: "kirina-korean";
  exportedAt: string;
  entries: Partial<Record<string, string>>;
}

export function createLearningBackup(now = Date.now()): LearningBackup | null {
  const entries: LearningBackup["entries"] = {};
  try {
    if (typeof window !== "undefined") {
      for (const key of LEARNING_BACKUP_KEYS) {
        const normalized = normalizeStoredEntry(key, readRawLearningStorage(key));
        if (normalized !== null) entries[key] = normalized;
      }
    }
  } catch {
    return null;
  }
  return {
    version: LEARNING_BACKUP_VERSION,
    app: "kirina-korean",
    exportedAt: safeIso(now),
    entries
  };
}

export function parseLearningBackupText(input: string): LearningBackup | null {
  return inspectLearningBackupText(input).backup;
}

export function inspectLearningBackupText(input: string): { backup: LearningBackup | null; error: string } {
  if (typeof input !== "string" || input.length > MAX_LEARNING_BACKUP_TEXT_LENGTH || new TextEncoder().encode(input).byteLength > MAX_LEARNING_BACKUP_BYTES) {
    return { backup: null, error: "备份超过 4 MB，无法导入。" };
  }
  let value: unknown;
  try { value = JSON.parse(input); } catch { return { backup: null, error: "文件不是有效的 JSON 备份。" }; }
  if (!isPlainRecord(value) || value.version !== LEARNING_BACKUP_VERSION || value.app !== "kirina-korean" || !isPlainRecord(value.entries)) {
    return { backup: null, error: "备份格式或版本不受支持，请选择 Kirina Korean 导出的文件。" };
  }
  for (const [key, raw] of Object.entries(value.entries)) {
    const error = validateBackupEntry(key, raw);
    if (error) return { backup: null, error: `文件无效：${error}。本机数据未更改。` };
  }
  return { backup: normalizeLearningBackup(value, { strictEntries: true }), error: "" };
}

export function summarizeLearningBackup(backup: LearningBackup) {
  const progress = parseJson<Partial<ReturnType<typeof defaultProgress>>>(backup.entries[STORAGE_KEYS.progress] ?? null, {});
  const srs = getSrsStateFromRaw(backup.entries[STORAGE_KEYS.srs] ?? null);
  return {
    lessons: progress.completedLessons?.length ?? 0,
    cards: Object.keys(srs.cards).length,
    outputs: getOutputStateFromRaw(backup.entries[STORAGE_KEYS.outputs] ?? null).entries.length + getNativePortfolioStateFromRaw(backup.entries[STORAGE_KEYS.nativePortfolio] ?? null).entries.length,
    missingKeys: LEARNING_BACKUP_KEYS.filter((key) => key !== STORAGE_KEYS.mistakes && !(key in backup.entries))
  };
}

/** Returns true only when both managed storage and recording blobs are replaced. */
export async function restoreLearningBackup(input: LearningBackup): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const backup = normalizeLearningBackup(input, { strictEntries: true });
  if (!backup) return false;
  return applyLearningEntriesAndClearRecordings(backup.entries);
}

/** Returns true only when both managed storage and recording blobs are cleared. */
export async function resetLearningData(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  return applyLearningEntriesAndClearRecordings({});
}

export function normalizeLearningBackup(input: Partial<LearningBackup> | null | undefined, options: { strictEntries?: boolean } = {}): LearningBackup | null {
  if (!input || input.version !== LEARNING_BACKUP_VERSION || input.app !== "kirina-korean" || !isPlainRecord(input.entries)) return null;
  if (options.strictEntries && Object.keys(input.entries).some((key) => !LEARNING_BACKUP_KEYS.includes(key))) return null;
  const entries: LearningBackup["entries"] = {};
  for (const key of LEARNING_BACKUP_KEYS) {
    const raw = input.entries[key];
    if (options.strictEntries && key in input.entries && validateBackupEntry(key, raw)) return null;
    if (typeof raw !== "string") continue;
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

async function applyLearningEntriesAndClearRecordings(entries: Partial<Record<string, string>>) {
  const snapshot = snapshotLearningStorage();
  if (!snapshot) return false;
  if (!applyLearningEntries(entries, snapshot)) return false;
  if (await clearLearningRecordings()) return true;

  rollbackLearningStorage(snapshot);
  return false;
}

function applyLearningEntries(entries: Partial<Record<string, string>>, snapshot: Record<string, string | null>) {
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

function normalizeStoredEntry(key: string, raw: string | null) {
  if (raw === null) return null;
  if (key === STORAGE_KEYS.profile) return JSON.stringify(normalizeUserProfile(parseJson(raw, defaultProfile())));
  if (key === STORAGE_KEYS.progress) {
    const progress = normalizeLearningProgress(parseJson(raw, defaultProgress()));
    return JSON.stringify(normalizeLearningProgress(withoutRecordingBlobs(progress), { enforceRecordingEvidence: true }));
  }
  if (key === STORAGE_KEYS.srs) return JSON.stringify(getSrsStateFromRaw(raw));
  if (key === STORAGE_KEYS.outputs) return JSON.stringify(getOutputStateFromRaw(raw));
  if (key === STORAGE_KEYS.nativePortfolio) return JSON.stringify(getNativePortfolioStateFromRaw(raw));
  if (key === STORAGE_KEYS.lessonSession) return JSON.stringify(getLessonPracticeStateFromRaw(raw));
  if (key === STORAGE_KEYS.drafts) return JSON.stringify(getLearningDraftStateFromRaw(raw));
  if (key === STORAGE_KEYS.speech) return JSON.stringify(normalizeSpeechSettings(parseJson(raw, {})));
  if (key === STORAGE_KEYS.mistakes) return null;
  return null;
}

function withoutRecordingBlobs(progress: ReturnType<typeof normalizeLearningProgress>) {
  return {
    ...progress,
    capstoneEvidence: progress.capstoneEvidence
      ? { ...progress.capstoneEvidence, recordedSeconds: 0, recordingId: "" }
      : null,
    lessonTaskEvidence: Object.fromEntries(Object.entries(progress.lessonTaskEvidence).map(([lessonId, evidence]) => [
      lessonId,
      evidence.kind === "shadowing" ? { ...evidence, recordedSeconds: 0, recordingId: undefined } : evidence
    ]))
  };
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
