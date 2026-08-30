import test from "node:test";
import assert from "node:assert/strict";
import { pathSpineDetail, selectCompassPrimaryTask, selectCompassReviewTask } from "../src/lib/learning/compass.ts";

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
  assert.equal(selectCompassPrimaryTask(workspace, "path").id, "system:review");
  assert.equal(selectCompassPrimaryTask(workspace, "self").id, "ability:native");
  assert.equal(selectCompassPrimaryTask(workspace, "review").id, "system:review");
  assert.equal(selectCompassPrimaryTask(workspace, "mistakes").id, "open:mistakes");
  assert.equal(selectCompassPrimaryTask(workspace, "quiz").id, "open:quiz");
  assert.equal(selectCompassPrimaryTask(workspace, "immersion").id, "system:immersion");
  assert.equal(selectCompassPrimaryTask(workspace, "native").id, "ability:native");
});

test("first-visit compass points at onboarding instead of the next lesson", () => {
  const workspace = {
    recommended: [
      task({ id: "lesson:l01-hangul-map", kind: "lesson", href: "/learn/l01-hangul-map", priority: 90 })
    ],
    openStudy: []
  };
  assert.equal(selectCompassPrimaryTask(workspace, "workspace", { isFirstVisit: true }).href, "/onboarding");
  assert.equal(selectCompassPrimaryTask(workspace, "workspace").href, "/learn/l01-hangul-map");
});

test("path compass prefers due review over the next lesson", () => {
  const workspace = {
    recommended: [
      task({ id: "system:review", kind: "review", href: "/review", priority: 100 }),
      task({ id: "lesson:l02-vowels", kind: "lesson", href: "/learn/l02-vowels", priority: 70 })
    ],
    openStudy: [
      task({ id: "open:next-lesson", kind: "lesson", href: "/learn/l02-vowels", source: "guided", priority: 70 })
    ]
  };
  assert.equal(selectCompassPrimaryTask(workspace, "path").id, "system:review");
});

test("path compass prefers library repair over the next lesson", () => {
  const workspace = {
    recommended: [
      task({ id: "system:library-hangul", kind: "hangul", href: "/hangul", priority: 96 }),
      task({ id: "lesson:l04-first-sentences", kind: "lesson", href: "/learn/l04-first-sentences", priority: 64 })
    ],
    openStudy: [
      task({ id: "open:next-lesson", kind: "lesson", href: "/learn/l04-first-sentences", source: "guided", priority: 48 })
    ]
  };

  assert.equal(selectCompassPrimaryTask(workspace, "path").id, "system:library-hangul");
  assert.equal(selectCompassPrimaryTask(workspace, "workspace").id, "system:library-hangul");
});

test("path compass prefers due review over library repair", () => {
  const workspace = {
    recommended: [
      task({ id: "system:review", kind: "review", href: "/review", priority: 100 }),
      task({ id: "system:library-hangul", kind: "hangul", href: "/hangul", priority: 96 }),
      task({ id: "lesson:l04-first-sentences", kind: "lesson", href: "/learn/l04-first-sentences", priority: 64 })
    ],
    openStudy: []
  };
  assert.equal(selectCompassPrimaryTask(workspace, "path").id, "system:review");
  assert.equal(selectCompassPrimaryTask(workspace, "workspace").id, "system:review");
});

test("path compass prefers retrain over the next lesson", () => {
  const workspace = {
    recommended: [
      task({ id: "system:retrain-l01-hangul-map", kind: "lesson", href: "/learn/l01-hangul-map", priority: 92 }),
      task({ id: "lesson:l02-vowels", kind: "lesson", href: "/learn/l02-vowels", priority: 90 })
    ],
    openStudy: [
      task({ id: "open:next-lesson", kind: "lesson", href: "/learn/l02-vowels", source: "guided", priority: 70 })
    ]
  };
  assert.equal(selectCompassPrimaryTask(workspace, "path").id, "system:retrain-l01-hangul-map");
});

test("path spine copy follows review, library, and retrain before the next lesson", () => {
  const nextLesson = { order: 4, title: "第一批完整句子" };
  assert.equal(pathSpineDetail({ recommended: [], openStudy: [], nextLesson }, true), "先完成三分钟入门，再进入第一课。");
  assert.equal(pathSpineDetail({
    recommended: [task({ id: "system:review", kind: "review", href: "/review", title: "处理到期复习" })],
    openStudy: [],
    nextLesson
  }), "处理到期复习");
  assert.equal(pathSpineDetail({
    recommended: [task({ id: "system:library-hangul", kind: "hangul", href: "/hangul", title: "先补韩文掌握" })],
    openStudy: [],
    nextLesson
  }), "先补韩文掌握");
  assert.equal(pathSpineDetail({
    recommended: [],
    openStudy: [],
    nextLesson
  }), "下一课 4 · 第一批完整句子");
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
