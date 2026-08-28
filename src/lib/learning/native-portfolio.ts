"use client";

import { useCallback, useMemo } from "react";
import { vocab } from "../../data/lexicon.js";
import { nowIso, parseJson, readJson, useStorageRaw, writeJson } from "./storage.ts";

export const NATIVE_PORTFOLIO_STORAGE_KEY = "kirina.native-portfolio.v1";
export const NATIVE_PORTFOLIO_SCHEMA_VERSION = 1;

const MAX_ENTRIES = 240;
const MAX_REVISIONS = 240;

export interface NativePortfolioDraft {
  title: string;
  source: string;
  sourceUrl: string;
  learningMinutes: number;
  recordingMinutes: number;
  mentorFeedback: string;
  body: string;
}

export interface NativePortfolioRevision extends NativePortfolioDraft {
  id: string;
  note: string;
  createdAt: string;
}

export interface NativePortfolioEntry extends NativePortfolioDraft {
  id: string;
  revisions: NativePortfolioRevision[];
  createdAt: string;
  updatedAt: string;
}

export interface NativePortfolioState {
  version: typeof NATIVE_PORTFOLIO_SCHEMA_VERSION;
  entries: NativePortfolioEntry[];
}

export interface SavedCollocationEvidence {
  ko: string;
  zh: string;
  vocabIds: string[];
}

interface VocabEvidenceItem {
  id?: unknown;
  collocations?: unknown;
}

type NativePortfolioDraftInput = {
  [Key in keyof NativePortfolioDraft]?: unknown;
};

export function defaultNativePortfolioState(): NativePortfolioState {
  return { version: NATIVE_PORTFOLIO_SCHEMA_VERSION, entries: [] };
}

export function getNativePortfolioStateFromRaw(raw: string | null): NativePortfolioState {
  return normalizeNativePortfolioState(parseJson(raw, defaultNativePortfolioState()));
}

export function normalizeNativePortfolioState(input: unknown): NativePortfolioState {
  const source = Array.isArray(input) ? { entries: input } : isRecord(input) ? input : {};
  const rawEntries = Array.isArray(source.entries)
    ? source.entries
    : Array.isArray(source.items)
      ? source.items
      : [];
  const entries: NativePortfolioEntry[] = [];
  const usedIds = new Set<string>();

  for (const rawEntry of rawEntries.slice(0, MAX_ENTRIES)) {
    const entry = normalizePortfolioEntry(rawEntry);
    if (!entry) continue;
    if (usedIds.has(entry.id)) entry.id = makeId("portfolio");
    usedIds.add(entry.id);
    entries.push(entry);
  }

  return { version: NATIVE_PORTFOLIO_SCHEMA_VERSION, entries };
}

export function addNativePortfolioEntry(input: NativePortfolioDraft, fallback = defaultNativePortfolioState()) {
  const draft = normalizePortfolioDraft(input);
  if (!isCompleteDraft(draft)) return false;
  const state = readCurrentState(fallback);
  const timestamp = nowIso();
  const entryId = makeId("portfolio");
  const entry: NativePortfolioEntry = {
    id: entryId,
    ...draft,
    revisions: [buildRevision(entryId, draft, "初稿", timestamp)],
    createdAt: timestamp,
    updatedAt: timestamp
  };
  return writeJson(NATIVE_PORTFOLIO_STORAGE_KEY, {
    version: NATIVE_PORTFOLIO_SCHEMA_VERSION,
    entries: [entry, ...state.entries].slice(0, MAX_ENTRIES)
  } satisfies NativePortfolioState);
}

export function reviseNativePortfolioEntry(
  entryId: string,
  input: NativePortfolioDraft,
  revisionNote: string,
  fallback = defaultNativePortfolioState()
) {
  const cleanId = normalizeText(entryId, 180);
  const draft = normalizePortfolioDraft(input);
  if (!cleanId || !isCompleteDraft(draft)) return false;
  const state = readCurrentState(fallback);
  const entryIndex = state.entries.findIndex((entry) => entry.id === cleanId);
  if (entryIndex < 0) return false;
  const timestamp = nowIso();
  const current = state.entries[entryIndex];
  const revisions = capRevisions([
    ...current.revisions,
    buildRevision(cleanId, draft, normalizeText(revisionNote, 600) || "修订", timestamp)
  ]);
  const updated: NativePortfolioEntry = {
    ...current,
    ...draft,
    revisions,
    updatedAt: timestamp
  };
  const entries = [...state.entries];
  entries[entryIndex] = updated;
  return writeJson(NATIVE_PORTFOLIO_STORAGE_KEY, {
    version: NATIVE_PORTFOLIO_SCHEMA_VERSION,
    entries
  } satisfies NativePortfolioState);
}

export function deleteNativePortfolioEntry(entryId: string, fallback = defaultNativePortfolioState()) {
  const cleanId = normalizeText(entryId, 180);
  if (!cleanId) return false;
  const state = readCurrentState(fallback);
  const entries = state.entries.filter((entry) => entry.id !== cleanId);
  if (entries.length === state.entries.length) return false;
  return writeJson(NATIVE_PORTFOLIO_STORAGE_KEY, {
    version: NATIVE_PORTFOLIO_SCHEMA_VERSION,
    entries
  } satisfies NativePortfolioState);
}

export function getNativePortfolioSummary(state: NativePortfolioState) {
  return state.entries.reduce((summary, entry) => ({
    entries: summary.entries + 1,
    learningMinutes: summary.learningMinutes + entry.learningMinutes,
    recordingMinutes: summary.recordingMinutes + entry.recordingMinutes,
    revisions: summary.revisions + entry.revisions.length
  }), { entries: 0, learningMinutes: 0, recordingMinutes: 0, revisions: 0 });
}

export function getSavedCollocationEvidence(
  learnedVocabIds: unknown,
  catalog: VocabEvidenceItem[] = vocab
): SavedCollocationEvidence[] {
  const learnedIds = new Set(Array.isArray(learnedVocabIds) ? learnedVocabIds.map(String) : []);
  const evidence = new Map<string, SavedCollocationEvidence>();

  for (const item of catalog) {
    const vocabId = normalizeText(item?.id, 180);
    if (!vocabId || !learnedIds.has(vocabId) || !Array.isArray(item.collocations)) continue;
    for (const rawCollocation of item.collocations) {
      if (!isRecord(rawCollocation)) continue;
      const ko = normalizeText(rawCollocation.ko, 240);
      if (!ko) continue;
      const key = normalizeCollocationKey(ko);
      const existing = evidence.get(key);
      if (existing) {
        if (!existing.vocabIds.includes(vocabId)) existing.vocabIds.push(vocabId);
        continue;
      }
      evidence.set(key, {
        ko,
        zh: normalizeText(rawCollocation.zh, 400),
        vocabIds: [vocabId]
      });
    }
  }

  return [...evidence.values()];
}

export function countSavedCollocationEvidence(learnedVocabIds: unknown, catalog: VocabEvidenceItem[] = vocab) {
  return getSavedCollocationEvidence(learnedVocabIds, catalog).length;
}

export function useNativePortfolio() {
  const raw = useStorageRaw(NATIVE_PORTFOLIO_STORAGE_KEY);
  const state = useMemo(() => getNativePortfolioStateFromRaw(raw), [raw]);
  const summary = useMemo(() => getNativePortfolioSummary(state), [state]);
  const addEntry = useCallback((input: NativePortfolioDraft) => addNativePortfolioEntry(input, state), [state]);
  const reviseEntry = useCallback((entryId: string, input: NativePortfolioDraft, revisionNote: string) => {
    return reviseNativePortfolioEntry(entryId, input, revisionNote, state);
  }, [state]);
  const deleteEntry = useCallback((entryId: string) => deleteNativePortfolioEntry(entryId, state), [state]);

  return { state, summary, addEntry, reviseEntry, deleteEntry };
}

function normalizePortfolioEntry(input: unknown): NativePortfolioEntry | null {
  if (!isRecord(input)) return null;
  const timestamp = nowIso();
  const draft = normalizePortfolioDraft({
    title: firstText(input.title, input.name),
    source: firstText(input.source, input.materialSource, input.sourceTitle),
    sourceUrl: firstText(input.sourceUrl, input.url, input.link),
    learningMinutes: firstValue(input.learningMinutes, input.studyMinutes, input.durationMinutes),
    recordingMinutes: firstValue(input.recordingMinutes, input.audioMinutes, input.speakingMinutes),
    mentorFeedback: firstText(input.mentorFeedback, input.feedback, input.tutorFeedback),
    body: firstText(input.body, input.content, input.work)
  });
  if (!draft.title && !draft.source && !draft.body) return null;
  const createdAt = normalizeIso(input.createdAt, timestamp);
  const updatedAt = normalizeIso(input.updatedAt, createdAt);
  const id = normalizeText(input.id, 180) || makeId("portfolio");
  const rawRevisions = Array.isArray(input.revisions)
    ? input.revisions
    : Array.isArray(input.history)
      ? input.history
      : [];
  const revisions = rawRevisions
    .slice(0, MAX_REVISIONS)
    .map((revision, index) => normalizeRevision(revision, id, draft, createdAt, index))
    .filter((revision): revision is NativePortfolioRevision => Boolean(revision));

  return {
    id,
    ...draft,
    revisions: revisions.length ? capRevisions(revisions) : [buildRevision(id, draft, "导入的初稿", createdAt)],
    createdAt,
    updatedAt
  };
}

function normalizeRevision(
  input: unknown,
  entryId: string,
  fallback: NativePortfolioDraft,
  fallbackDate: string,
  index: number
): NativePortfolioRevision | null {
  if (!isRecord(input)) return null;
  const draft = normalizePortfolioDraft({
    title: firstText(input.title, fallback.title),
    source: firstText(input.source, input.materialSource, fallback.source),
    sourceUrl: firstText(input.sourceUrl, input.url, fallback.sourceUrl),
    learningMinutes: firstValue(input.learningMinutes, input.studyMinutes, fallback.learningMinutes),
    recordingMinutes: firstValue(input.recordingMinutes, input.audioMinutes, fallback.recordingMinutes),
    mentorFeedback: firstText(input.mentorFeedback, input.feedback, fallback.mentorFeedback),
    body: firstText(input.body, input.content, input.work, fallback.body)
  });
  return {
    id: normalizeText(input.id, 180) || `${entryId}:revision:${index + 1}`,
    ...draft,
    note: normalizeText(firstText(input.note, input.summary, input.changeNote), 600) || `修订 ${index + 1}`,
    createdAt: normalizeIso(input.createdAt, fallbackDate)
  };
}

function normalizePortfolioDraft(input: NativePortfolioDraftInput): NativePortfolioDraft {
  return {
    title: normalizeText(input.title, 240),
    source: normalizeText(input.source, 800),
    sourceUrl: normalizeText(input.sourceUrl, 1600),
    learningMinutes: normalizeMinutes(input.learningMinutes),
    recordingMinutes: normalizeMinutes(input.recordingMinutes),
    mentorFeedback: normalizeText(input.mentorFeedback, 8000),
    body: normalizeText(input.body, 40000)
  };
}

function buildRevision(entryId: string, draft: NativePortfolioDraft, note: string, createdAt: string): NativePortfolioRevision {
  return {
    id: `${entryId}:revision:${makeId("rev")}`,
    ...draft,
    note,
    createdAt
  };
}

function capRevisions(revisions: NativePortfolioRevision[]) {
  if (revisions.length <= MAX_REVISIONS) return revisions;
  return [revisions[0], ...revisions.slice(-(MAX_REVISIONS - 1))];
}

function isCompleteDraft(draft: NativePortfolioDraft) {
  return Boolean(draft.title && draft.source && draft.body);
}

function readCurrentState(fallback: NativePortfolioState) {
  return normalizeNativePortfolioState(readJson(NATIVE_PORTFOLIO_STORAGE_KEY, fallback));
}

function normalizeText(input: unknown, maxLength: number) {
  return typeof input === "string" ? input.trim().slice(0, maxLength) : "";
}

function normalizeMinutes(input: unknown) {
  const value = Number(input);
  if (!Number.isFinite(value)) return 0;
  return Math.min(100_000, Math.max(0, Math.round(value)));
}

function normalizeIso(input: unknown, fallback: string) {
  if (typeof input !== "string" || !Number.isFinite(Date.parse(input))) return fallback;
  return input;
}

function normalizeCollocationKey(input: string) {
  return input.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}

function firstText(...inputs: unknown[]): string {
  const value = inputs.find((input) => typeof input === "string" && input.trim());
  return typeof value === "string" ? value : "";
}

function firstValue(...inputs: unknown[]) {
  return inputs.find((input) => input !== undefined && input !== null) ?? 0;
}

let idSequence = 0;

function makeId(prefix: string) {
  const randomId = globalThis.crypto?.randomUUID?.();
  if (randomId) return `${prefix}-${randomId}`;
  idSequence += 1;
  return `${prefix}-${Date.now().toString(36)}-${idSequence.toString(36)}`;
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return Boolean(input) && typeof input === "object" && !Array.isArray(input);
}
