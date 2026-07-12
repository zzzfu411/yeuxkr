import test from "node:test";
import assert from "node:assert/strict";

const { buildMistakeInsights, buildRetrainQuestions, summarizeMistakes } = await import("../src/lib/learning/mistakes.ts");

function card(id, overrides = {}) {
  return {
    id,
    box: 0,
    dueAt: 0,
    correct: 0,
    wrong: 1,
    lastSeenAt: null,
    payload: {
      kind: "mistake",
      itemId: id.replace("mistake:", ""),
      prompt: "prompt",
      answer: "answer"
    },
    ...overrides,
    payload: {
      kind: "mistake",
      itemId: id.replace("mistake:", ""),
      prompt: "prompt",
      answer: "answer",
      ...(overrides.payload ?? {})
    }
  };
}

test("mistake insights sort due and repeated weak items first", () => {
  const now = 10_000;
  const state = {
    cards: {
      "mistake:vq:a": card("mistake:vq:a", { wrong: 1, correct: 3, box: 3, dueAt: now - 1 }),
      "mistake:gq:b": card("mistake:gq:b", { wrong: 3, correct: 0, box: 0, dueAt: now - 1 }),
      "mistake:future": card("mistake:future", { wrong: 9, correct: 0, box: 0, dueAt: now + 60_000 }),
      "vocab:v-annyeonghaseyo": {
        id: "vocab:v-annyeonghaseyo",
        box: 0,
        dueAt: 0,
        correct: 0,
        wrong: 0,
        lastSeenAt: null,
        payload: { kind: "vocab", itemId: "v-annyeonghaseyo" }
      }
    },
    history: []
  };

  const insights = buildMistakeInsights(state, now);

  assert.deepEqual(insights.map((item) => item.id), ["mistake:gq:b", "mistake:vq:a", "mistake:future"]);
  assert.equal(insights[0].sourceLabel, "语法题");
  assert.equal(insights[0].statusLabel, "现在该处理");
  assert.equal(insights[2].due, false);
});

test("mistake summary separates due, repeated, stabilizing, and mastered cards", () => {
  const now = 50_000;
  const state = {
    cards: {
      "mistake:due": card("mistake:due", { dueAt: now - 1, wrong: 1, correct: 0, box: 0 }),
      "mistake:repeat": card("mistake:repeat", { dueAt: now + 1, wrong: 3, correct: 1, box: 0 }),
      "mistake:stable": card("mistake:stable", { dueAt: now + 1, wrong: 1, correct: 2, box: 3 }),
      "mistake:mastered": card("mistake:mastered", { dueAt: now + 1, wrong: 1, correct: 5, box: 5 })
    },
    history: []
  };

  assert.deepEqual(summarizeMistakes(state, now), {
    total: 4,
    due: 1,
    repeated: 1,
    stabilizing: 1,
    mastered: 1
  });
});

test("buildRetrainQuestions turns mistake payloads into full drill questions", () => {
  const state = {
    cards: {
      "mistake:choice-one": card("mistake:choice-one", {
        wrong: 4,
        payload: {
          type: "choice",
          prompt: "选正确的助词",
          answer: "이",
          choices: ["이", "가", "은", "는"],
          explain: "收音后用 이。",
          speak: "책이"
        }
      }),
      "mistake:cloze-one": card("mistake:cloze-one", {
        wrong: 1,
        payload: {
          type: "cloze",
          prompt: "补全句子",
          answer: "와서",
          clozeText: "비가 ___ 집에 있었어요.",
          hint: "오다 + -아서"
        }
      }),
      "mistake:broken": card("mistake:broken", { payload: { prompt: "", answer: "" } })
    },
    history: []
  };

  const all = buildRetrainQuestions(state);
  assert.equal(all.length, 2);
  assert.equal(all[0].id, "mistake:choice-one");
  assert.equal(all[0].type, "choice");
  assert.deepEqual(all[0].choices, ["이", "가", "은", "는"]);
  assert.equal(all[0].speak, "책이");
  const cloze = all.find((question) => question.id === "mistake:cloze-one");
  assert.equal(cloze.type, "cloze");
  assert.equal(cloze.clozeText, "비가 ___ 집에 있었어요.");
  assert.equal(cloze.hint, "오다 + -아서");

  const selected = buildRetrainQuestions(state, ["mistake:cloze-one"]);
  assert.deepEqual(selected.map((question) => question.id), ["mistake:cloze-one"]);

  const limited = buildRetrainQuestions(state, null, 1);
  assert.equal(limited.length, 1);
});
