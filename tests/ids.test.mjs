import test from "node:test";
import assert from "node:assert/strict";
import {
  TASK_IDS,
  abilityTaskId,
  checkpointEvidenceEventId,
  checkpointTaskId,
  grammarCardId,
  grammarQuestionId,
  hangulCardId,
  hangulQuestionId,
  hasCardPrefix,
  hasQuestionPrefix,
  lessonTaskId,
  materialCardId,
  materialEvidenceEventId,
  materialRetellQuestionId,
  mistakeCardId,
  nativeCardId,
  nativeNuanceQuestionId,
  nativePragmaticsQuestionId,
  outputCardId,
  outputEvidenceEventId,
  outputTransferQuestionId,
  parseLessonReviewCardId,
  pronunciationQuestionId,
  quizQuestionEvidenceEventId,
  quizTransferEvidenceEventId,
  reviewEvidenceEventId,
  taskEventId,
  vocabCardId,
  vocabQuestionId
} from "../src/lib/learning/ids.ts";

test("learning id builders preserve existing persisted ids", () => {
  assert.equal(TASK_IDS.systemReview, "system:review");
  assert.equal(TASK_IDS.systemImmersion, "system:immersion");
  assert.equal(TASK_IDS.systemPracticeRepair, "system:practice-repair");
  assert.equal(TASK_IDS.quizMixed, "quiz:mixed");
  assert.equal(TASK_IDS.openReviewRhythm, "open:review-rhythm");
  assert.equal(TASK_IDS.openMistakes, "open:mistakes");
  assert.equal(TASK_IDS.openSelfPlan, "open:self-plan");
  assert.equal(TASK_IDS.openQuiz, "open:quiz");

  assert.equal(lessonTaskId("l01-hangul-map"), "lesson:l01-hangul-map");
  assert.equal(abilityTaskId("grammar"), "ability:grammar");
  assert.equal(checkpointTaskId("native:1"), "checkpoint:native:1");
  assert.equal(checkpointEvidenceEventId("native:1"), "checkpoint:native:1");
  assert.equal(taskEventId("ability:grammar", "2026-06-09"), "task:ability:grammar:2026-06-09");
  assert.equal(reviewEvidenceEventId("mistake:q1", 2), "review:mistake:q1:2");
  assert.equal(quizQuestionEvidenceEventId("mixed:1", 0, "gq:g-topic-subject"), "quiz:mixed:1:0:gq:g-topic-subject");
  assert.equal(quizTransferEvidenceEventId("mixed:1"), "quiz:mixed:1:transfer");

  assert.equal(hangulCardId("v-a"), "hangul:v-a");
  assert.equal(vocabCardId("v-annyeonghaseyo"), "vocab:v-annyeonghaseyo");
  assert.equal(grammarCardId("g-topic-subject"), "grammar:g-topic-subject");
  assert.equal(nativeCardId("pragmatics:p-first-meeting"), "native:pragmatics:p-first-meeting");
  assert.equal(materialCardId("im-cafe-real-speed"), "material:im-cafe-real-speed");
  assert.equal(outputCardId("output-a"), "output:output-a");
  assert.equal(outputEvidenceEventId("output-a"), "output:output-a");
  assert.equal(materialEvidenceEventId("im-cafe-real-speed"), "material:im-cafe-real-speed");
  assert.equal(mistakeCardId("vq:v-annyeonghaseyo"), "mistake:vq:v-annyeonghaseyo");

  assert.equal(hangulQuestionId("v-a"), "hq:v-a");
  assert.equal(pronunciationQuestionId("p-eo-o"), "pq:p-eo-o");
  assert.equal(vocabQuestionId("v-annyeonghaseyo"), "vq:v-annyeonghaseyo");
  assert.equal(grammarQuestionId("g-topic-subject"), "gq:g-topic-subject");
  assert.equal(nativePragmaticsQuestionId("p-first-meeting"), "nq:pragmatics:p-first-meeting");
  assert.equal(nativeNuanceQuestionId("n-thanks"), "nq:nuance:n-thanks");
  assert.equal(materialRetellQuestionId("im-cafe-real-speed"), "mq:im-cafe-real-speed");
  assert.equal(outputTransferQuestionId("output-a"), "oq:output-a");
});

test("learning id parsers and prefix guards classify review ids", () => {
  assert.deepEqual(parseLessonReviewCardId("lesson:l01-hangul-map:3"), {
    lessonId: "l01-hangul-map",
    ordinal: 3
  });
  assert.equal(parseLessonReviewCardId("lesson:bad"), null);
  assert.equal(parseLessonReviewCardId("vq:v-annyeonghaseyo"), null);

  assert.equal(hasQuestionPrefix("lesson:l01-hangul-map:1", "lesson"), true);
  assert.equal(hasQuestionPrefix("oq:output-a", "outputTransfer"), true);
  assert.equal(hasQuestionPrefix("nq:pragmatics:p-first-meeting", "nativePragmatics"), true);
  assert.equal(hasQuestionPrefix("nq:nuance:n-thanks", "nativeNuance"), true);
  assert.equal(hasQuestionPrefix("output:output-a", "outputTransfer"), false);

  assert.equal(hasCardPrefix("output:output-a", "output"), true);
  assert.equal(hasCardPrefix("material:im-cafe-real-speed", "material"), true);
  assert.equal(hasCardPrefix("nq:nuance:n-thanks", "native"), false);
});
