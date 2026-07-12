import type { AbilityId } from "./types.ts";

export const TASK_IDS = {
  systemReview: "system:review",
  systemImmersion: "system:immersion",
  systemPracticeRepair: "system:practice-repair",
  quizMixed: "quiz:mixed",
  openNextLesson: "open:next-lesson",
  openReview: "open:review",
  openReviewRhythm: "open:review-rhythm",
  openMistakes: "open:mistakes",
  openSelfPlan: "open:self-plan",
  openImmersion: "open:immersion",
  openQuiz: "open:quiz"
} as const;

export const QUESTION_PREFIXES = {
  lesson: "lesson:",
  hangul: "hq:",
  pronunciation: "pq:",
  vocab: "vq:",
  grammar: "gq:",
  nativePragmatics: "nq:pragmatics:",
  nativeNuance: "nq:nuance:",
  materialRetell: "mq:",
  outputTransfer: "oq:",
  soundChange: "scq:"
} as const;

export const CARD_PREFIXES = {
  hangul: "hangul:",
  pronunciation: "pronunciation:",
  vocab: "vocab:",
  grammar: "grammar:",
  native: "native:",
  material: "material:",
  output: "output:",
  mistake: "mistake:",
  lesson: "lesson:",
  soundChange: "soundChange:"
} as const;

export function lessonTaskId(lessonId: string) {
  return `${QUESTION_PREFIXES.lesson}${cleanId(lessonId)}`;
}

export function abilityTaskId(ability: AbilityId) {
  return `ability:${ability}`;
}

export function checkpointTaskId(checkpointId: string) {
  return `checkpoint:${cleanId(checkpointId)}`;
}

export function taskEventId(taskId: string, dateKey: string) {
  return `task:${cleanId(taskId)}:${cleanId(dateKey)}`;
}

export function checkpointEvidenceEventId(checkpointId: string) {
  return checkpointTaskId(checkpointId);
}

export function materialEvidenceEventId(materialId: string) {
  return materialCardId(materialId);
}

export function outputEvidenceEventId(outputId: string) {
  return outputCardId(outputId);
}

export function reviewEvidenceEventId(cardId: string, attempt: number) {
  return `review:${cleanId(cardId)}:${Math.max(1, Math.trunc(attempt))}`;
}

export function quizQuestionEvidenceEventId(quizId: string, index: number, questionId: string) {
  return `quiz:${cleanId(quizId)}:${Math.max(0, Math.trunc(index))}:${cleanId(questionId)}`;
}

export function quizTransferEvidenceEventId(quizId: string) {
  return `quiz:${cleanId(quizId)}:transfer`;
}

export function hangulCardId(itemId: string) {
  return `${CARD_PREFIXES.hangul}${cleanId(itemId)}`;
}

export function pronunciationCardId(itemId: string) {
  return `${CARD_PREFIXES.pronunciation}${cleanId(itemId)}`;
}

export function vocabCardId(itemId: string) {
  return `${CARD_PREFIXES.vocab}${cleanId(itemId)}`;
}

export function grammarCardId(itemId: string) {
  return `${CARD_PREFIXES.grammar}${cleanId(itemId)}`;
}

export function nativeCardId(itemId: string) {
  return `${CARD_PREFIXES.native}${cleanId(itemId)}`;
}

export function materialCardId(materialId: string) {
  return `${CARD_PREFIXES.material}${cleanId(materialId)}`;
}

export function outputCardId(outputId: string) {
  return `${CARD_PREFIXES.output}${cleanId(outputId)}`;
}

export function mistakeCardId(questionId: string) {
  return `${CARD_PREFIXES.mistake}${cleanId(questionId)}`;
}

export function soundChangeCardId(ruleId: string) {
  return `${CARD_PREFIXES.soundChange}${cleanId(ruleId)}`;
}

export function soundChangeQuestionId(ruleId: string) {
  return `${QUESTION_PREFIXES.soundChange}${cleanId(ruleId)}`;
}

export function lessonReviewCardId(lessonId: string, zeroBasedIndex: number) {
  return `${QUESTION_PREFIXES.lesson}${cleanId(lessonId)}:${Math.max(0, Math.trunc(zeroBasedIndex)) + 1}`;
}

export function hangulQuestionId(itemId: string) {
  return `${QUESTION_PREFIXES.hangul}${cleanId(itemId)}`;
}

export function pronunciationQuestionId(itemId: string) {
  return `${QUESTION_PREFIXES.pronunciation}${cleanId(itemId)}`;
}

export function vocabQuestionId(itemId: string) {
  return `${QUESTION_PREFIXES.vocab}${cleanId(itemId)}`;
}

export function vocabDictationQuestionId(itemId: string) {
  return `${QUESTION_PREFIXES.vocab}dict:${cleanId(itemId)}`;
}

export function vocabClozeQuestionId(itemId: string) {
  return `${QUESTION_PREFIXES.vocab}cloze:${cleanId(itemId)}`;
}

export function grammarQuestionId(itemId: string) {
  return `${QUESTION_PREFIXES.grammar}${cleanId(itemId)}`;
}

export function nativePragmaticsQuestionId(sceneId: string) {
  return `${QUESTION_PREFIXES.nativePragmatics}${cleanId(sceneId)}`;
}

export function nativeNuanceQuestionId(setId: string) {
  return `${QUESTION_PREFIXES.nativeNuance}${cleanId(setId)}`;
}

export function materialRetellQuestionId(materialId: string) {
  return `${QUESTION_PREFIXES.materialRetell}${cleanId(materialId)}`;
}

export function outputTransferQuestionId(outputId: string) {
  return `${QUESTION_PREFIXES.outputTransfer}${cleanId(outputId)}`;
}

export function parseLessonReviewCardId(id: string) {
  if (!id.startsWith(QUESTION_PREFIXES.lesson)) return null;
  const parts = id.split(":");
  if (parts.length < 3) return null;
  const ordinal = Number(parts.at(-1));
  const lessonId = parts.slice(1, -1).join(":");
  if (!lessonId || !Number.isInteger(ordinal) || ordinal < 1) return null;
  return { lessonId, ordinal };
}

export function hasQuestionPrefix(questionId: string, prefix: keyof typeof QUESTION_PREFIXES) {
  return questionId.startsWith(QUESTION_PREFIXES[prefix]);
}

export function hasCardPrefix(cardId: string, prefix: keyof typeof CARD_PREFIXES) {
  return cardId.startsWith(CARD_PREFIXES[prefix]);
}

function cleanId(value: string) {
  return String(value ?? "").trim();
}
