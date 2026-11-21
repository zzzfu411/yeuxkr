import { UNLOCK_SCORE } from "../../data/curriculum-runtime.js";
import type { Question } from "./quiz.ts";

export const LESSON_MODALITY_PASS_RATIO = 0.6;

export interface LessonAssessmentAnswer {
  question: Pick<Question, "id">;
  correct: boolean;
  skipped?: boolean;
}

export interface LessonAssessmentResult {
  complete: boolean;
  score: number;
  overallPassed: boolean;
  productionRequired: boolean;
  productionPassed: boolean;
  productionCorrect: number;
  productionTotal: number;
  listeningRequired: boolean;
  listeningPassed: boolean;
  listeningDeferred: boolean;
  listeningSkipped: boolean;
  listeningCorrect: number;
  listeningTotal: number;
  corePassed: boolean;
}

export function assessLessonAttempt(
  lesson: { focus?: string[]; drills?: Question[] } | null | undefined,
  answers: LessonAssessmentAnswer[] = [],
  score = 0
): LessonAssessmentResult {
  const knownAnswers = answersForKnownQuestions(lesson?.drills ?? [], answers);
  const questionCount = lesson?.drills?.length ?? 0;
  const complete = questionCount > 0 && knownAnswers.length === questionCount && answers.length === questionCount;
  const scoredAnswers = knownAnswers.filter((entry) => !entry.skipped);
  const measuredScore = scoredAnswers.length ? Math.round(scoredAnswers.filter((entry) => entry.correct).length / scoredAnswers.length * 100) : 0;
  const verifiedScore = complete && Number.isFinite(score) ? Math.max(0, Math.min(score, measuredScore)) : 0;
  const productive = knownAnswers.filter((entry) => isProductiveQuestion(entry.question) && !entry.skipped);
  const auditory = knownAnswers.filter((entry) => isAuditoryQuestion(entry.question));
  const attemptedAuditory = auditory.filter((entry) => !entry.skipped);
  const productiveQuestions = (lesson?.drills ?? []).filter(isProductiveQuestion);
  const auditoryQuestions = (lesson?.drills ?? []).filter(isAuditoryQuestion);
  const productionRequired = productiveQuestions.some((question) => !isAuditoryQuestion(question)) || productiveQuestions.length > 0;
  const productionCorrect = productive.filter((entry) => entry.correct).length;
  const productionTotal = productive.length;
  const productionPassed = complete && (!productionRequired || (
    productionTotal > 0 && productionCorrect >= requiredCorrectCount(productionTotal)
  ));
  const listeningRequired = hasListeningFocus(lesson?.focus) && auditoryQuestions.length > 0;
  const listeningCorrect = attemptedAuditory.filter((entry) => entry.correct).length;
  const listeningTotal = attemptedAuditory.length;
  const listeningSkipped = auditory.some((entry) => entry.skipped);
  const listeningDeferred = listeningRequired && auditory.length > 0 && auditory.every((entry) => entry.skipped);
  const listeningPassed = complete && (!listeningRequired || (
    !listeningSkipped &&
    listeningTotal > 0 &&
    listeningCorrect >= requiredCorrectCount(listeningTotal)
  ));
  const overallPassed = complete && verifiedScore >= UNLOCK_SCORE;

  return {
    complete,
    score: verifiedScore,
    overallPassed,
    productionRequired,
    productionPassed,
    productionCorrect,
    productionTotal,
    listeningRequired,
    listeningPassed,
    listeningDeferred,
    listeningSkipped,
    listeningCorrect,
    listeningTotal,
    corePassed: overallPassed && productionPassed && listeningPassed
  };
}

function answersForKnownQuestions(questions: Question[], answers: LessonAssessmentAnswer[]) {
  const known = new Map(questions.map((question) => [question.id, question]));
  const seen = new Set<string>();
  return answers.flatMap((entry) => {
    const question = known.get(entry.question.id);
    if (!question || seen.has(question.id)) return [];
    seen.add(question.id);
    return [{ ...entry, question }];
  });
}

function requiredCorrectCount(total: number) {
  return Math.max(1, Math.ceil(total * LESSON_MODALITY_PASS_RATIO));
}

function isProductiveQuestion(question: Question) {
  return question.type === "type" || question.type === "translate" || question.type === "dictation" || (
    question.type === "cloze" && !(question.choices?.length)
  );
}

function isAuditoryQuestion(question: Question) {
  return Boolean(question.speak && (question.type === "listen" || question.type === "dictation"));
}

function hasListeningFocus(focus: string[] = []) {
  return focus.includes("sound") || focus.includes("listening") || focus.includes("speaking");
}
