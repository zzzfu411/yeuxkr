import test from "node:test";
import assert from "node:assert/strict";
import { firstActionableLesson, getLessonPrerequisites, getMilestoneProgress, isLessonUnlocked, lessons, milestones, UNLOCK_SCORE } from "../src/data/curriculum.js";

const orderedLessons = [...lessons].sort((a, b) => a.order - b.order);

test("core lesson prerequisites keep the ordered path and explicit edges", () => {
  for (let index = 1; index < orderedLessons.length; index += 1) {
    const lesson = orderedLessons[index];
    const previousLesson = orderedLessons[index - 1];
    const prerequisites = getLessonPrerequisites(lesson.id);
    const prerequisiteIds = prerequisites.map((item) => item.id);
    const explicitPrerequisiteIds = lessons
      .filter((item) => item.order < lesson.order && item.unlocks?.includes(lesson.id))
      .map((item) => item.id);

    assert.ok(prerequisiteIds.includes(previousLesson.id), `${lesson.id} should require ${previousLesson.id}`);
    assert.equal(new Set(prerequisiteIds).size, prerequisiteIds.length, `${lesson.id} prerequisites should be unique`);
    for (const explicitId of explicitPrerequisiteIds) {
      assert.ok(prerequisiteIds.includes(explicitId), `${lesson.id} should preserve explicit prerequisite ${explicitId}`);
    }
  }
});

test("historically skippable lessons block their immediate successors", () => {
  for (const skippedId of ["l40-requests", "l41-irregulars", "l42-ability-obligation", "l44-passive-causative"]) {
    const skippedLesson = orderedLessons.find((lesson) => lesson.id === skippedId);
    const successor = orderedLessons[skippedLesson.order];
    const earlierLessons = orderedLessons.slice(0, skippedLesson.order).filter((lesson) => lesson.id !== skippedLesson.id);
    const completedIds = new Set(earlierLessons.map((lesson) => lesson.id));
    const scores = Object.fromEntries(earlierLessons.map((lesson) => [lesson.id, UNLOCK_SCORE]));

    assert.equal(
      isLessonUnlocked(successor.id, completedIds, scores),
      false,
      `${successor.id} should stay locked until ${skippedLesson.id} is mastered`
    );
  }
});

test("the final lesson transitively requires mastery of every earlier core lesson", () => {
  const finalLesson = orderedLessons.at(-1);
  const prerequisiteClosure = new Set();
  const pending = [finalLesson];

  while (pending.length) {
    const lesson = pending.pop();
    for (const prerequisite of getLessonPrerequisites(lesson.id)) {
      if (prerequisiteClosure.has(prerequisite.id)) continue;
      prerequisiteClosure.add(prerequisite.id);
      pending.push(prerequisite);
    }
  }

  assert.deepEqual(
    prerequisiteClosure,
    new Set(orderedLessons.slice(0, -1).map((lesson) => lesson.id))
  );
});

test("first actionable missing lesson prefers an unlocked prereq then the next lesson", () => {
  const empty = new Set();
  const fallback = firstActionableLesson(
    ["l37-numbers-counters", "l06-cafe", "l11-shopping-price"],
    empty,
    {},
    "l01-hangul-map"
  );
  assert.equal(fallback.id, "l01-hangul-map");

  const numbersLesson = orderedLessons.find((lesson) => lesson.id === "l37-numbers-counters");
  const beforeNumbers = orderedLessons.filter((lesson) => lesson.order < numbersLesson.order);
  const completed = new Set(beforeNumbers.map((lesson) => lesson.id));
  const scores = Object.fromEntries(beforeNumbers.map((lesson) => [lesson.id, UNLOCK_SCORE]));
  const numbers = firstActionableLesson(
    ["l37-numbers-counters", "l06-cafe", "l11-shopping-price"],
    completed,
    scores
  );
  assert.equal(numbers.id, "l37-numbers-counters");
  assert.equal(isLessonUnlocked("l37-numbers-counters", completed, scores), true);
});

test("M1 and M2 outcomes match their actual lesson ownership", () => {
  const m1 = milestones.find((milestone) => milestone.id === "m1");
  const m2 = milestones.find((milestone) => milestone.id === "m2");
  const m1LessonIds = lessons.filter((lesson) => lesson.milestone === "m1").map((lesson) => lesson.id);
  const m2LessonIds = lessons.filter((lesson) => lesson.milestone === "m2").map((lesson) => lesson.id);

  assert.doesNotMatch(m1.outcome, /过去/);
  assert.match(m1.outcome, /数字时间/);
  assert.match(m2.outcome, /过去式/);
  assert.equal(m1LessonIds.includes("l08-past"), false);
  assert.equal(m2LessonIds.includes("l08-past"), true);
});

test("milestone progress keeps legacy completed-only course records compatible", () => {
  const m1LessonIds = lessons.filter((lesson) => lesson.milestone === "m1").map((lesson) => lesson.id);
  const legacyProgress = getMilestoneProgress("m1", m1LessonIds);

  assert.equal(legacyProgress.course.progress, 100);
  assert.equal(legacyProgress.course.complete, true);
  assert.equal(legacyProgress.acceptance.progress, 0);
  assert.equal(legacyProgress.complete, false);

  const explicitLowScore = getMilestoneProgress("m1", m1LessonIds, { [m1LessonIds[0]]: UNLOCK_SCORE - 1 });
  assert.equal(explicitLowScore.course.completed, m1LessonIds.length - 1);
  assert.equal(explicitLowScore.course.complete, false);
});

test("completed courses cannot hide missing material, output, or checkpoint evidence", () => {
  const m4LessonIds = lessons.filter((lesson) => lesson.milestone === "m4").map((lesson) => lesson.id);
  const scores = Object.fromEntries(m4LessonIds.map((lessonId) => [lessonId, 100]));
  const empty = getMilestoneProgress("m4", new Set(m4LessonIds), scores);
  const completeEvidence = Object.fromEntries(
    empty.acceptance.requirements.map((requirement) => [requirement.metric, requirement.target])
  );
  const insufficientEvidence = {
    ...completeEvidence,
    materials: 0,
    outputs: 0,
    checkpoints: 0
  };
  const pending = getMilestoneProgress("m4", new Set(m4LessonIds), scores, insufficientEvidence);

  assert.equal(pending.course.progress, 100);
  assert.equal(pending.acceptance.complete, false);
  assert.equal(pending.complete, false);
  for (const metric of ["materials", "outputs", "checkpoints"]) {
    assert.equal(pending.acceptance.requirements.find((requirement) => requirement.metric === metric)?.met, false);
  }

  const accepted = getMilestoneProgress("m4", new Set(m4LessonIds), scores, completeEvidence);
  assert.equal(accepted.acceptance.progress, 100);
  assert.equal(accepted.acceptance.complete, true);
  assert.equal(accepted.complete, true);
});

test("every milestone has a non-course capability acceptance gate", () => {
  for (const milestone of milestones) {
    const progress = getMilestoneProgress(milestone.id);
    assert.equal(progress.acceptance.levelId, milestone.acceptanceLevelId);
    assert.ok(progress.acceptance.requirements.length > 0, `${milestone.id} should have capability requirements`);
    assert.equal(progress.acceptance.requirements.some((requirement) => requirement.metric === "lessons"), false);
  }
});
