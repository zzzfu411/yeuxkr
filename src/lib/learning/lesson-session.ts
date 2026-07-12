"use client";

import { lessons } from "../../data/curriculum.js";
import { lessonReviewCardId } from "./ids.ts";
import { nowIso, parseJson, readJson, STORAGE_KEYS, writeJson } from "./storage.ts";

export interface SerializedLessonAnswer {
  questionId: string;
  answer: string;
  correct: boolean;
}

export interface LessonPracticeSession {
  lessonId: string;
  currentIndex: number;
  answers: SerializedLessonAnswer[];
  finished: boolean;
  updatedAt: string;
}

export interface LessonPracticeState {
  sessions: Record<string, LessonPracticeSession>;
}

const lessonQuestionIds: Map<string, string[]> = new Map(
  lessons.map((lesson: any): [string, string[]] => [
    lesson.id,
    (lesson.drills ?? []).map((drill: any, index: number) => drill.id ?? lessonReviewCardId(lesson.id, index))
  ])
);

export function defaultLessonPracticeState(): LessonPracticeState {
  return { sessions: {} };
}

export function getLessonPracticeState() {
  return normalizeLessonPracticeState(readJson<Partial<LessonPracticeState>>(STORAGE_KEYS.lessonSession, defaultLessonPracticeState()));
}

export function getLessonPracticeStateFromRaw(raw: string | null) {
  return normalizeLessonPracticeState(parseJson<Partial<LessonPracticeState>>(raw, defaultLessonPracticeState()));
}

export function saveLessonPracticeState(state: LessonPracticeState) {
  return writeJson(STORAGE_KEYS.lessonSession, normalizeLessonPracticeState(state));
}

export function getLessonPracticeSession(lessonId: string) {
  return getLessonPracticeState().sessions[lessonId] ?? null;
}

export function saveLessonPracticeSession(lessonId: string, input: Partial<LessonPracticeSession>) {
  const state = getLessonPracticeState();
  const normalized = normalizeLessonPracticeSession({ ...input, lessonId }, lessonId);
  if (!normalized) return false;
  state.sessions[lessonId] = normalized;
  return saveLessonPracticeState(state);
}

export function clearLessonPracticeSession(lessonId: string) {
  const state = getLessonPracticeState();
  if (!state.sessions[lessonId]) return true;
  delete state.sessions[lessonId];
  return saveLessonPracticeState(state);
}

export function normalizeLessonPracticeState(input: Partial<LessonPracticeState> | null | undefined): LessonPracticeState {
  const sessions: Record<string, LessonPracticeSession> = {};
  if (input?.sessions && typeof input.sessions === "object") {
    for (const [lessonId, session] of Object.entries(input.sessions)) {
      const normalized = normalizeLessonPracticeSession(session, lessonId);
      if (normalized) sessions[lessonId] = normalized;
    }
  }
  return { sessions };
}

export function normalizeLessonPracticeSession(input: Partial<LessonPracticeSession> | null | undefined, lessonId: string): LessonPracticeSession | null {
  const questionIds = lessonQuestionIds.get(lessonId);
  if (!input || !questionIds?.length) return null;
  const validQuestionIds = new Set(questionIds);
  const answers = normalizeAnswers(input.answers, questionIds, validQuestionIds);
  const questionCount = questionIds.length;
  const maxResumeIndex = answers.length >= questionCount ? Math.max(0, questionCount - 1) : answers.length;
  const currentIndex = Math.min(clampIndex(input.currentIndex, questionCount), maxResumeIndex);
  const finished = Boolean(input.finished) && answers.length >= questionCount;
  return {
    lessonId,
    currentIndex: finished ? Math.max(0, questionCount - 1) : currentIndex,
    answers,
    finished,
    updatedAt: typeof input.updatedAt === "string" && input.updatedAt.trim() ? input.updatedAt : nowIso()
  };
}

function normalizeAnswers(input: unknown, questionIds: string[], validQuestionIds: Set<string>) {
  if (!Array.isArray(input)) return [];
  const byQuestion = new Map<string, SerializedLessonAnswer>();
  for (const item of input) {
    const questionId = typeof item?.questionId === "string" ? item.questionId : "";
    const answer = typeof item?.answer === "string" ? item.answer.trim() : "";
    if (!validQuestionIds.has(questionId) || !answer) continue;
    byQuestion.set(questionId, { questionId, answer, correct: Boolean(item.correct) });
  }
  const contiguous: SerializedLessonAnswer[] = [];
  for (const questionId of questionIds) {
    const answer = byQuestion.get(questionId);
    if (!answer) break;
    contiguous.push(answer);
  }
  return contiguous;
}

function clampIndex(input: unknown, questionCount: number) {
  const value = Number(input);
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(0, Math.trunc(value)), Math.max(0, questionCount - 1));
}
