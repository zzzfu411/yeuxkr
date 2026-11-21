import { lessons } from "../../data/curriculum-runtime.js";
import { lessonReviewCardId } from "./ids.ts";
import type { QuestionType } from "./types.ts";

export interface Question {
  id: string;
  type: QuestionType;
  prompt: string;
  answer: string;
  acceptable?: string[];
  choices?: string[];
  explain?: string;
  speak?: string;
  clozeText?: string;
  hint?: string;
}

export function normalizeAnswer(value: unknown) {
  return String(value ?? "")
    .normalize("NFC")
    .trim()
    .replace(/[.。?？!！…~〜]+$/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

export function checkAnswer(question: Question, answer: string) {
  const normalized = normalizeAnswer(answer);
  const accepted = [question.answer, ...(question.acceptable ?? [])].map(normalizeAnswer);
  return accepted.includes(normalized);
}

export function lessonQuestions(lessonId: string): Question[] {
  return lessonReviewQuestions(lessonId);
}

export function lessonReviewQuestions(lessonId: string): Question[] {
  const lesson = lessons.find((item: any) => item.id === lessonId);
  return ((lesson?.drills ?? []) as Question[]).map((question, index) => ({
    ...question,
    id: question.id ?? lessonReviewCardId(lessonId, index)
  }));
}

export function lessonQuestionId(lessonId: string, index: number) {
  return lessonReviewCardId(lessonId, index);
}
