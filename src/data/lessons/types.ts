import type { LessonCompletionTask } from "../../lib/learning/lesson-evidence";

export interface LessonDrill {
  id?: string;
  type: "choice" | "listen" | "type" | "dictation" | "cloze" | "translate";
  prompt: string;
  answer: string;
  choices?: string[];
  acceptable?: string[];
  explain?: string;
  speak?: string;
  clozeText?: string;
  hint?: string;
}

/** Shared assessment/directory contract. Teaching cards stay with the server-rendered lesson. */
export interface RuntimeLesson {
  id: string;
  order: number;
  milestone: string;
  title: string;
  subtitle: string;
  duration: number;
  focus: string[];
  objectives: string[];
  drills: LessonDrill[];
  unlocks: string[];
  completionTask?: LessonCompletionTask;
}
