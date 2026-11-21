import type { Question } from "./quiz.ts";

/** Audio may be the stimulus or feedback; it must not supply a retrieval answer. */
export function canPlayQuestionAudio(question: Question, answered = false) {
  if (!question.speak) return false;
  if (answered || question.type === "listen" || question.type === "dictation") return true;
  if (["type", "translate", "cloze"].includes(question.type)) return false;
  return question.prompt.includes(question.speak);
}
