import test from "node:test";
import assert from "node:assert/strict";
import { lessons } from "../src/data/curriculum.js";
import { assessLessonAttempt, LESSON_MODALITY_PASS_RATIO } from "../src/lib/learning/lesson-assessment.ts";
import { lessonReviewCardId } from "../src/lib/learning/ids.ts";

function questionsFor(lesson) {
  return lesson.drills.map((question, index) => ({
    ...question,
    id: question.id ?? lessonReviewCardId(lesson.id, index)
  }));
}

test("lesson modality threshold is stricter than a token attempt", () => {
  assert.equal(LESSON_MODALITY_PASS_RATIO, 0.6);
});

test("a passing total cannot hide failed active production", () => {
  const lesson = lessons.find((item) => item.id === "l09-connectors");
  const questions = questionsFor(lesson);
  const answers = questions.map((question) => ({
    question,
    answer: question.answer,
    correct: !["type", "translate", "dictation"].includes(question.type)
  }));
  const result = assessLessonAttempt({ ...lesson, drills: questions }, answers, 72);

  assert.equal(result.overallPassed, true);
  assert.equal(result.productionPassed, false);
  assert.equal(result.corePassed, false);
});

test("failed listening blocks an attempted listening lesson independently", () => {
  const lesson = lessons.find((item) => item.id === "l22-media-shadowing");
  const questions = questionsFor(lesson);
  const answers = questions.map((question) => ({
    question,
    answer: question.answer,
    correct: !(question.speak && ["listen", "dictation"].includes(question.type))
  }));
  const result = assessLessonAttempt({ ...lesson, drills: questions }, answers, 80);

  assert.equal(result.listeningRequired, true);
  assert.equal(result.listeningPassed, false);
  assert.equal(result.corePassed, false);
});

test("missing device audio defers listening without forging its evidence", () => {
  const lesson = lessons.find((item) => item.id === "l01-hangul-map");
  const questions = questionsFor(lesson);
  const answers = questions.map((question) => {
    const auditory = question.speak && ["listen", "dictation"].includes(question.type);
    return auditory
      ? { question, answer: "", correct: false, skipped: true }
      : { question, answer: question.answer, correct: true };
  });
  const result = assessLessonAttempt({ ...lesson, drills: questions }, answers, 100);

  assert.equal(result.listeningDeferred, true);
  assert.equal(result.listeningPassed, false);
  assert.equal(result.productionPassed, true);
  assert.equal(result.corePassed, true);
});
