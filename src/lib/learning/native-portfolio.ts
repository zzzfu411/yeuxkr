"use client";

import { vocab } from "../../data/lexicon.js";
import { normalizePortfolioText } from "./native-portfolio-store.ts";

export {
  NATIVE_PORTFOLIO_STORAGE_KEY,
  NATIVE_PORTFOLIO_SCHEMA_VERSION,
  defaultNativePortfolioState,
  getNativePortfolioStateFromRaw,
  normalizeNativePortfolioState,
  addNativePortfolioEntry,
  reviseNativePortfolioEntry,
  deleteNativePortfolioEntry,
  getNativePortfolioSummary,
  useNativePortfolio,
  type NativePortfolioDraft,
  type NativePortfolioRevision,
  type NativePortfolioEntry,
  type NativePortfolioState
} from "./native-portfolio-store.ts";

export interface SavedCollocationEvidence {
  ko: string;
  zh: string;
  vocabIds: string[];
}

interface VocabEvidenceItem {
  id?: unknown;
  collocations?: unknown;
}

export function getSavedCollocationEvidence(
  learnedVocabIds: unknown,
  catalog: VocabEvidenceItem[] = vocab
): SavedCollocationEvidence[] {
  const learnedIds = new Set(Array.isArray(learnedVocabIds) ? learnedVocabIds.map(String) : []);
  const evidence = new Map<string, SavedCollocationEvidence>();

  for (const item of catalog) {
    const vocabId = normalizePortfolioText(item?.id, 180);
    if (!vocabId || !learnedIds.has(vocabId) || !Array.isArray(item.collocations)) continue;
    for (const rawCollocation of item.collocations) {
      if (!isRecord(rawCollocation)) continue;
      const ko = normalizePortfolioText(rawCollocation.ko, 240);
      if (!ko) continue;
      const key = normalizeCollocationKey(ko);
      const existing = evidence.get(key);
      if (existing) {
        if (!existing.vocabIds.includes(vocabId)) existing.vocabIds.push(vocabId);
        continue;
      }
      evidence.set(key, {
        ko,
        zh: normalizePortfolioText(rawCollocation.zh, 400),
        vocabIds: [vocabId]
      });
    }
  }

  return [...evidence.values()];
}

export function countSavedCollocationEvidence(learnedVocabIds: unknown, catalog: VocabEvidenceItem[] = vocab) {
  return getSavedCollocationEvidence(learnedVocabIds, catalog).length;
}

function normalizeCollocationKey(input: string) {
  return input.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return Boolean(input) && typeof input === "object" && !Array.isArray(input);
}
