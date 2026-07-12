"use client";

import { parseJson, readJson, writeJson, STORAGE_KEYS } from "./storage.ts";
import { lessons } from "../../data/curriculum.js";
import { grammarPoints } from "../../data/grammar.js";
import { hangulGroups, pronunciationPairs } from "../../data/hangul.js";
import { vocab } from "../../data/lexicon.js";
import { immersionMaterials } from "../../data/materials.ts";
import { nuanceSets } from "../../data/nuance.js";
import { pragmaticScenarios } from "../../data/pragmatics.js";
import { lessonReviewCardId } from "./ids.ts";

export const BOX_INTERVALS = [
  0,
  1000 * 60 * 10,
  1000 * 60 * 60 * 8,
  1000 * 60 * 60 * 24,
  1000 * 60 * 60 * 24 * 3,
  1000 * 60 * 60 * 24 * 7,
  1000 * 60 * 60 * 24 * 21
];

const FALLBACK_TIME = 0;
const hangulIdSet = new Set(hangulGroups.flatMap((group: any) => group.items.map((item: any) => item.id)));
const pronunciationIdSet = new Set(pronunciationPairs.map((pair: any) => pair.id));
const vocabIdSet = new Set(vocab.map((item: any) => item.id));
const grammarIdSet = new Set(grammarPoints.map((item: any) => item.id));
const materialIdSet = new Set(immersionMaterials.map((item) => item.id));
const nativeIdSet = new Set([
  ...pragmaticScenarios.map((item: any) => `pragmatics:${item.id}`),
  ...nuanceSets.map((item: any) => `nuance:${item.id}`)
]);

export type SrsKind = "hangul" | "pronunciation" | "vocab" | "grammar" | "native" | "material" | "output" | "mistake" | "lesson";

export interface SrsCard {
  id: string;
  box: number;
  dueAt: number;
  correct: number;
  wrong: number;
  lastSeenAt: number | null;
  payload: {
    kind: SrsKind;
    itemId: string;
    type?: "choice" | "listen" | "type";
    prompt?: string;
    answer?: string;
    acceptable?: string[];
    choices?: string[];
    explain?: string;
    speak?: string;
  };
}

export interface SrsState {
  cards: Record<string, SrsCard>;
  history: Array<{ id: string; isCorrect: boolean; at: number; box: number }>;
}

export function defaultSrsState(): SrsState {
  return { cards: {}, history: [] };
}

export function getSrsState() {
  return normalizeSrsState(readJson<Partial<SrsState>>(STORAGE_KEYS.srs, defaultSrsState()));
}

export function getSrsStateFromRaw(raw: string | null) {
  return normalizeSrsState(parseJson<Partial<SrsState>>(raw, defaultSrsState()));
}

export function saveSrsState(state: SrsState) {
  return writeJson(STORAGE_KEYS.srs, normalizeSrsState(state));
}

export function removeCard(id: string) {
  const state = getSrsState();
  if (!state.cards[id]) return false;
  delete state.cards[id];
  state.history = state.history.filter((item) => item.id !== id);
  return saveSrsState(state);
}

export function removeCardsByKind(kind: SrsKind) {
  const state = getSrsState();
  const removed = new Set<string>();
  for (const [id, card] of Object.entries(state.cards)) {
    if (card.payload.kind === kind) {
      delete state.cards[id];
      removed.add(id);
    }
  }
  if (!removed.size) return 0;
  state.history = state.history.filter((item) => !removed.has(item.id));
  return saveSrsState(state) ? removed.size : 0;
}

export function ensureCard(id: string, payload: SrsCard["payload"]) {
  const state = getSrsState();
  let nextCard: SrsCard;
  if (!state.cards[id]) {
    nextCard = {
      id,
      box: 0,
      dueAt: Date.now(),
      correct: 0,
      wrong: 0,
      lastSeenAt: null,
      payload
    };
  } else {
    nextCard = {
      ...state.cards[id],
      payload: { ...state.cards[id].payload, ...payload }
    };
  }
  state.cards[id] = nextCard;
  return saveSrsState(state) ? nextCard : null;
}

export function recordMistake(id: string, payload: SrsCard["payload"]) {
  if (!ensureCard(id, payload)) return null;
  return gradeCard(id, false, payload);
}

export function gradeCard(id: string, isCorrect: boolean, payload?: Partial<SrsCard["payload"]>) {
  const state = getSrsState();
  const current = state.cards[id];
  if (!current) return null;
  const nextBox = isCorrect ? Math.min(BOX_INTERVALS.length - 1, current.box + 1) : 0;
  const dueAt = Date.now() + BOX_INTERVALS[nextBox];
  state.cards[id] = {
    ...current,
    payload: { ...current.payload, ...payload },
    box: nextBox,
    dueAt,
    correct: current.correct + (isCorrect ? 1 : 0),
    wrong: current.wrong + (isCorrect ? 0 : 1),
    lastSeenAt: Date.now()
  };
  state.history = [{ id, isCorrect, at: Date.now(), box: nextBox }, ...(state.history ?? [])].slice(0, 400);
  return saveSrsState(state) ? state.cards[id] : null;
}

export function getDueCards(limit = 30) {
  return getDueCardsFromState(getSrsState(), limit, Date.now());
}

export function getDueCardsFromState(state: SrsState, limit = 30, now = Date.now()) {
  return Object.values(state.cards)
    .filter((card) => card.dueAt <= now)
    .sort((a, b) => a.dueAt - b.dueAt || a.box - b.box)
    .slice(0, limit);
}

export function summarizeSrs() {
  return summarizeSrsState(getSrsState());
}

export function summarizeSrsState(state: SrsState, now = Date.now()) {
  const cards = Object.values(state.cards);
  return {
    total: cards.length,
    due: cards.filter((card) => card.dueAt <= now).length,
    mature: cards.filter((card) => card.box >= 5).length,
    shaky: cards.filter((card) => card.wrong > card.correct).length
  };
}

function normalizeSrsState(input: Partial<SrsState> | null | undefined): SrsState {
  const cards: Record<string, SrsCard> = {};
  if (input?.cards && typeof input.cards === "object") {
    for (const [id, card] of Object.entries(input.cards)) {
      if (!id.trim() || !card?.payload?.kind || !card.payload.itemId) continue;
      const payload = normalizePayload(card.payload);
      if (!payload || !isReviewablePayload(payload)) continue;
      cards[id] = {
        id,
        box: clampBox(card.box),
        dueAt: Number.isFinite(card.dueAt) ? card.dueAt : FALLBACK_TIME,
        correct: clampCount(card.correct),
        wrong: clampCount(card.wrong),
        lastSeenAt: typeof card.lastSeenAt === "number" ? card.lastSeenAt : null,
        payload
      };
    }
  }

  return {
    cards,
    history: normalizeHistory(input?.history, new Set(Object.keys(cards)))
  };
}

function normalizePayload(payload: Partial<SrsCard["payload"]>): SrsCard["payload"] | null {
  if (!payload.kind || !payload.itemId) return null;
  return {
    kind: payload.kind,
    itemId: String(payload.itemId).trim(),
    type: normalizeQuestionType(payload.type),
    prompt: normalizeOptionalText(payload.prompt),
    answer: normalizeOptionalText(payload.answer),
    acceptable: normalizeStringList(payload.acceptable),
    choices: normalizeStringList(payload.choices),
    explain: normalizeOptionalText(payload.explain),
    speak: normalizeOptionalText(payload.speak)
  };
}

function isReviewablePayload(payload: Partial<SrsCard["payload"]>) {
  if (payload.kind === "hangul") return hangulIdSet.has(String(payload.itemId));
  if (payload.kind === "pronunciation") return pronunciationIdSet.has(String(payload.itemId));
  if (payload.kind === "vocab") return vocabIdSet.has(String(payload.itemId));
  if (payload.kind === "grammar") return grammarIdSet.has(String(payload.itemId));
  if (payload.kind === "native") return nativeIdSet.has(String(payload.itemId));
  if (payload.kind === "material") return materialIdSet.has(String(payload.itemId)) && Boolean(payload.prompt && payload.answer);
  if (payload.kind === "lesson") {
    return Boolean(findLessonDrillByReviewItemId(String(payload.itemId)) && payload.prompt && payload.answer);
  }
  if (payload.kind === "output" || payload.kind === "mistake") return Boolean(payload.prompt && payload.answer);
  return false;
}

function findLessonDrillByReviewItemId(itemId: string) {
  return lessons.some((lesson: any) => {
    return (lesson.drills ?? []).some((drill: any, index: number) => {
      return (drill.id ?? lessonReviewCardId(lesson.id, index)) === itemId;
    });
  });
}

function clampBox(box: unknown) {
  const value = Number(box);
  if (!Number.isFinite(value)) return 0;
  return Math.min(BOX_INTERVALS.length - 1, Math.max(0, Math.trunc(value)));
}

function clampCount(input: unknown) {
  const value = Number(input);
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.trunc(value));
}

function normalizeQuestionType(input: unknown): SrsCard["payload"]["type"] {
  return input === "choice" || input === "listen" || input === "type" ? input : undefined;
}

function normalizeStringList(input: unknown) {
  if (!Array.isArray(input)) return undefined;
  const result = [...new Set(input.map(String).filter((item) => item.trim()))];
  return result.length ? result : undefined;
}

function normalizeOptionalText(input: unknown) {
  return typeof input === "string" && input.trim() ? input.trim() : undefined;
}

function normalizeHistory(input: unknown, cardIds: Set<string>): SrsState["history"] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((item) => {
      return typeof item?.id === "string" && cardIds.has(item.id) && typeof item?.isCorrect === "boolean" && Number.isFinite(item?.at);
    })
    .map((item) => ({
      id: item.id,
      isCorrect: item.isCorrect,
      at: item.at,
      box: clampBox(item.box)
    }))
    .slice(0, 400);
}
