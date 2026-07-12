import test from "node:test";
import assert from "node:assert/strict";
import { selectCompassPrimaryTask, selectCompassReviewTask } from "../src/lib/learning/compass.ts";

const baseTask = {
  title: "task",
  detail: "detail",
  href: "/",
  minutes: 10,
  ability: ["script"],
  source: "system",
  priority: 1
};

function task(patch) {
  return { ...baseTask, ...patch };
}

test("compass primary action follows the active page context", () => {
  const workspace = {
    recommended: [
      task({ id: "system:review", kind: "review", href: "/review", priority: 100 }),
      task({ id: "ability:native", kind: "native", href: "/native", source: "self", priority: 80 }),
      task({ id: "open:mistakes", kind: "review", href: "/mistakes", source: "system", priority: 78 }),
      task({ id: "system:immersion", kind: "immersion", href: "/immersion?material=im-cafe-real-speed", priority: 70 })
    ],
    openStudy: [
      task({ id: "open:next-lesson", kind: "lesson", href: "/learn/l02-vowels", source: "guided", priority: 70 }),
      task({ id: "open:self-plan", kind: "checkpoint", href: "/self-study", source: "self", priority: 60 }),
      task({ id: "open:immersion", kind: "immersion", href: "/immersion?material=im-cafe-real-speed", priority: 42 }),
      task({ id: "open:quiz", kind: "quiz", href: "/quiz", priority: 40 })
    ]
  };

  assert.equal(selectCompassPrimaryTask(workspace, "workspace").id, "system:review");
  assert.equal(selectCompassPrimaryTask(workspace, "path").id, "open:next-lesson");
  assert.equal(selectCompassPrimaryTask(workspace, "self").id, "ability:native");
  assert.equal(selectCompassPrimaryTask(workspace, "review").id, "system:review");
  assert.equal(selectCompassPrimaryTask(workspace, "mistakes").id, "open:mistakes");
  assert.equal(selectCompassPrimaryTask(workspace, "quiz").id, "open:quiz");
  assert.equal(selectCompassPrimaryTask(workspace, "immersion").id, "system:immersion");
  assert.equal(selectCompassPrimaryTask(workspace, "native").id, "ability:native");
});

test("compass review track separates real due review from self-study rhythm review", () => {
  const rhythmOnly = {
    recommended: [task({ id: "open:review-rhythm", kind: "review", href: "/review", source: "self" })],
    openStudy: []
  };
  const withDueReview = {
    recommended: [task({ id: "open:review-rhythm", kind: "review", href: "/review", source: "self" })],
    openStudy: [task({ id: "system:review", kind: "review", href: "/review", source: "system" })]
  };

  assert.equal(selectCompassReviewTask(rhythmOnly).id, "open:review-rhythm");
  assert.equal(selectCompassReviewTask(withDueReview).id, "system:review");
});
