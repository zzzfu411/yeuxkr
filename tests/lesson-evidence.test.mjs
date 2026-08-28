import test from "node:test";
import assert from "node:assert/strict";
import { lessons } from "../src/data/curriculum.js";
import { checkLessonTaskEvidence, lessonCompletionTask, normalizeLessonTaskEvidence } from "../src/lib/learning/lesson-evidence.ts";

function taskFor(lessonId) {
  return lessonCompletionTask(lessons.find((lesson) => lesson.id === lessonId));
}

test("connector lesson requires an original three-part paragraph", () => {
  const task = taskFor("l09-connectors");
  const weak = checkLessonTaskEvidence(task, { kind: "paragraph", text: "그래서 좋아요.", recordedSeconds: 0 });
  const ready = checkLessonTaskEvidence(task, {
    kind: "paragraph",
    text: "어제 비가 와서 집에 있었어요. 그래서 한국어 책을 오래 읽었어요. 근데 저녁에는 조금 심심했어요.",
    recordedSeconds: 0
  });

  assert.equal(weak.ready, false);
  assert.equal(ready.ready, true);
});

test("opinion paragraph requires all four discourse moves", () => {
  const task = taskFor("l24-opinion-paragraph");
  const ready = checkLessonTaskEvidence(task, {
    kind: "paragraph",
    text: "제 생각에는 매일 조금씩 공부하는 방법이 가장 좋아요. 왜냐하면 짧게 공부하면 피곤하지 않기 때문이에요. 예를 들면 저는 아침마다 단어를 열 개씩 복습해요. 그래서 꾸준한 연습이 실력을 높인다고 생각해요.",
    recordedSeconds: 0
  });
  const missingExample = checkLessonTaskEvidence(task, {
    kind: "paragraph",
    text: "제 생각에는 매일 공부하는 방법이 좋아요. 왜냐하면 연습이 중요하기 때문이에요. 저는 아침마다 공부해요. 그래서 계속 연습하려고 해요.",
    recordedSeconds: 0
  });

  assert.equal(ready.ready, true);
  assert.equal(missingExample.ready, false);
});

test("retelling rejects a direct source copy", () => {
  const task = taskFor("l25-retelling");
  const copied = checkLessonTaskEvidence(task, { kind: "retell", text: task.source, recordedSeconds: 0 });
  const retold = checkLessonTaskEvidence(task, {
    kind: "retell",
    text: "먼저 지수가 친구를 보려고 역에 갔어요. 그다음에 승차권과 음료를 준비했어요. 그런데 기차가 늦어서 바로 떠나지 못했어요. 결국 친구에게 소식을 전하고 역에서 계속 기다렸어요.",
    recordedSeconds: 0
  });

  assert.equal(copied.ready, false);
  assert.equal(retold.ready, true);
});

test("shadowing accepts a real recording duration or a Korean memory fallback", () => {
  const task = taskFor("l22-media-shadowing");
  assert.equal(checkLessonTaskEvidence(task, { kind: "shadowing", text: "", recordedSeconds: 2 }).ready, false);
  assert.equal(checkLessonTaskEvidence(task, { kind: "shadowing", text: "", recordedSeconds: 4.2 }).ready, false);
  assert.equal(checkLessonTaskEvidence(task, { kind: "shadowing", text: "", recordedSeconds: 4.2, recordingId: "shadowing:test-recording" }).ready, true);
  assert.equal(checkLessonTaskEvidence(task, {
    kind: "shadowing",
    text: "그 카페 커피가 진짜 맛있더라고요",
    recordedSeconds: 0
  }).ready, true);
});

test("lesson evidence normalization bounds untrusted persisted values", () => {
  const evidence = normalizeLessonTaskEvidence({
    kind: "shadowing",
    text: `  ${"가".repeat(5000)}  `,
    recordedSeconds: 9999,
    updatedAt: "2026-07-15T00:00:00.000Z"
  });

  assert.equal(evidence.text.length, 4000);
  assert.equal(evidence.recordedSeconds, 600);
  assert.equal(normalizeLessonTaskEvidence({ kind: "bad" }), null);
});
