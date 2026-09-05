import test from "node:test";
import assert from "node:assert/strict";

const store = new Map();
let blockWrites = false;
const blockedWriteKeys = new Set();
let srsWriteCount = 0;

global.window = {
  localStorage: {
    getItem(key) {
      if (key === "throw.read") throw new Error("blocked read");
      return store.get(key) ?? null;
    },
    setItem(key, value) {
      if (key === "throw.write" || blockWrites || blockedWriteKeys.has(key)) throw new Error("blocked write");
      if (key === "kirina.srs.v2") srsWriteCount += 1;
      store.set(key, value);
    }
  },
  dispatchEvent() {}
};
global.CustomEvent = class CustomEvent {
  constructor(type, init = {}) {
    this.type = type;
    this.detail = init.detail;
  }
};

const { readJson, writeJson } = await import("../src/lib/learning/storage.ts");
const { ensureCard, getSrsState, gradeCard, recordMistake, removeCard, removeCardsByKind, saveSrsState, summarizeSrs } = await import("../src/lib/learning/srs.ts");
const { commitLessonSession, ensureLessonReviewCards, gradeReviewCardAndProgress, submitReviewCardAndProgress, persistOutputReview, rollbackLessonReviewCards } = await import("../src/lib/learning/workspace.ts");
const { defaultProgress, STORAGE_KEYS } = await import("../src/lib/learning/storage.ts");
const { lessonQuestions } = await import("../src/lib/learning/quiz.ts");

test("review conflicts identify stale, missing, not-due and storage failures without double grading", () => {
  store.clear();
  ensureCard("mistake:conflict", { kind: "mistake", itemId: "conflict", prompt: "p", answer: "a" });
  const card = getSrsState().cards["mistake:conflict"];
  assert.deepEqual(submitReviewCardAndProgress(card, true), { ok: true });
  const saved = store.get(STORAGE_KEYS.srs);
  assert.deepEqual(submitReviewCardAndProgress(card, true), { ok: false, reason: "stale" });
  assert.equal(store.get(STORAGE_KEYS.srs), saved);
  const updated = getSrsState().cards[card.id];
  assert.deepEqual(submitReviewCardAndProgress(updated, true), { ok: false, reason: "not-due" });
  try {
    blockWrites = true;
    assert.deepEqual(submitReviewCardAndProgress(updated, true, { allowEarly: true }), { ok: false, reason: "storage" });
  } finally { blockWrites = false; }
  removeCard(card.id);
  assert.deepEqual(submitReviewCardAndProgress(updated, true), { ok: false, reason: "missing" });
});

test("recordMistake increments repeated wrong answers and keeps card due", () => {
  store.clear();
  srsWriteCount = 0;
  recordMistake("mistake:q1", { kind: "mistake", itemId: "q1", prompt: "p", answer: "a" });
  assert.equal(srsWriteCount, 1);
  recordMistake("mistake:q1", { kind: "mistake", itemId: "q1", prompt: "p2", answer: "a2" });
  assert.equal(srsWriteCount, 2);

  const card = getSrsState().cards["mistake:q1"];
  assert.equal(card.wrong, 2);
  assert.equal(card.box, 0);
  assert.equal(card.payload.prompt, "p2");
  assert.equal(card.payload.answer, "a2");
  assert.equal(card.dueAt <= Date.now(), true);
});

test("SRS reads old or damaged localStorage without crashing", () => {
  store.clear();
  store.set("kirina.srs.v2", JSON.stringify({}));

  assert.deepEqual(getSrsState(), { cards: {}, history: [] });
  assert.deepEqual(summarizeSrs(), { total: 0, due: 0, mature: 0, shaky: 0 });
});

test("storage helpers tolerate localStorage read and write failures", () => {
  assert.deepEqual(readJson("throw.read", { ok: true }), { ok: true });
  assert.equal(writeJson("throw.write", { ok: false }), false);
  try {
    blockWrites = true;
    assert.equal(saveSrsState({ cards: {}, history: [] }), false);
    assert.doesNotThrow(() => recordMistake("mistake:q-blocked", { kind: "mistake", itemId: "q-blocked", prompt: "p", answer: "a" }));
  } finally {
    blockWrites = false;
  }
});

test("SRS normalization clamps damaged counters and filters history", () => {
  store.clear();
  store.set("kirina.srs.v2", JSON.stringify({
    cards: {
      "vocab:v-annyeonghaseyo": {
        id: "vocab:v-annyeonghaseyo",
        box: 99,
        dueAt: Number.NaN,
        correct: -3,
        wrong: -8,
        lastSeenAt: "bad",
        payload: { kind: "vocab", itemId: "v-annyeonghaseyo" }
      }
    },
    history: [
      { id: "vocab:v-annyeonghaseyo", isCorrect: false, at: 123, box: -2 },
      { id: "", isCorrect: true, at: 123, box: 1 },
      { id: "bad", isCorrect: "yes", at: 123, box: 1 },
      { id: "bad-time", isCorrect: true, at: "soon", box: 1 }
    ]
  }));

  const state = getSrsState();
  assert.equal(state.cards["vocab:v-annyeonghaseyo"].box, 6);
  assert.equal(state.cards["vocab:v-annyeonghaseyo"].id, "vocab:v-annyeonghaseyo");
  assert.equal(state.cards["vocab:v-annyeonghaseyo"].dueAt, 0);
  assert.equal(state.cards["vocab:v-annyeonghaseyo"].correct, 0);
  assert.equal(state.cards["vocab:v-annyeonghaseyo"].wrong, 0);
  assert.equal(state.cards["vocab:v-annyeonghaseyo"].lastSeenAt, null);
  assert.deepEqual(state.history, [{ id: "vocab:v-annyeonghaseyo", isCorrect: false, at: 123, box: 0 }]);
});

test("SRS normalization repairs stale internal card ids so review can submit", () => {
  store.clear();
  store.set("kirina.srs.v2", JSON.stringify({
    cards: {
      "vocab:v-annyeonghaseyo": {
        id: "stale-id",
        box: 0,
        dueAt: 0,
        correct: 0,
        wrong: 0,
        lastSeenAt: null,
        payload: { kind: "vocab", itemId: "v-annyeonghaseyo" }
      }
    },
    history: [
      { id: "stale-id", isCorrect: false, at: 10, box: 0 },
      { id: "vocab:v-annyeonghaseyo", isCorrect: true, at: 11, box: 1 }
    ]
  }));

  const card = getSrsState().cards["vocab:v-annyeonghaseyo"];
  assert.equal(card.id, "vocab:v-annyeonghaseyo");
  assert.deepEqual(getSrsState().history, [{ id: "vocab:v-annyeonghaseyo", isCorrect: true, at: 11, box: 1 }]);
  assert.equal(gradeReviewCardAndProgress(card, true), true);
  assert.equal(getSrsState().cards["vocab:v-annyeonghaseyo"].correct, 1);
});

test("SRS normalization drops non-string review text payloads", () => {
  store.clear();
  store.set("kirina.srs.v2", JSON.stringify({
    cards: {
      "mistake:bad-object": {
        id: "mistake:bad-object",
        box: 0,
        dueAt: 0,
        correct: 0,
        wrong: 0,
        lastSeenAt: null,
        payload: { kind: "mistake", itemId: "bad-object", prompt: { text: "object" }, answer: ["안녕"] }
      },
      "mistake:good": {
        id: "mistake:good",
        box: 0,
        dueAt: 0,
        correct: 0,
        wrong: 0,
        lastSeenAt: null,
        payload: { kind: "mistake", itemId: "good", prompt: " 다시 쓰기 ", answer: " 안녕하세요 " }
      }
    },
    history: []
  }));

  const state = getSrsState();
  assert.equal(state.cards["mistake:bad-object"], undefined);
  assert.equal(state.cards["mistake:good"].payload.prompt, "다시 쓰기");
  assert.equal(state.cards["mistake:good"].payload.answer, "안녕하세요");
});

test("SRS normalization drops stale content cards that cannot become review questions", () => {
  store.clear();
  store.set("kirina.srs.v2", JSON.stringify({
    cards: {
      "vocab:missing": {
        id: "vocab:missing",
        box: 0,
        dueAt: 0,
        correct: 0,
        wrong: 0,
        lastSeenAt: null,
        payload: { kind: "vocab", itemId: "missing-vocab" }
      },
      "lesson:missing:1": {
        id: "lesson:missing:1",
        box: 0,
        dueAt: 0,
        correct: 0,
        wrong: 0,
        lastSeenAt: null,
        payload: { kind: "lesson", itemId: "lesson:missing:1", prompt: "p", answer: "a" }
      },
      "output:kept": {
        id: "output:kept",
        box: 0,
        dueAt: 0,
        correct: 0,
        wrong: 0,
        lastSeenAt: null,
        payload: { kind: "output", itemId: "kept", prompt: "rewrite", answer: "좋아요" }
      }
    },
    history: []
  }));

  const state = getSrsState();
  assert.equal(state.cards["vocab:missing"], undefined);
  assert.equal(state.cards["lesson:missing:1"], undefined);
  assert.equal(state.cards["output:kept"].payload.kind, "output");
  assert.deepEqual(summarizeSrs(), { total: 1, due: 1, mature: 0, shaky: 0 });
});

test("grading an existing review card does not create a derived mistake card", () => {
  store.clear();
  recordMistake("mistake:q1", { kind: "mistake", itemId: "q1", prompt: "p", answer: "a" });
  gradeCard("mistake:q1", false);

  const state = getSrsState();
  assert.equal(Object.keys(state.cards).length, 1);
  assert.equal(state.cards["mistake:q1"].wrong, 2);
  assert.equal(state.cards["mistake:mistake:q1"], undefined);
});

test("completed lessons create idempotent lesson review cards", () => {
  store.clear();
  const expectedIds = lessonQuestions("l01-hangul-map").map((question) => question.id);

  const firstResult = ensureLessonReviewCards("l01-hangul-map");
  const secondResult = ensureLessonReviewCards("l01-hangul-map");

  assert.equal(firstResult.length, expectedIds.length);
  assert.deepEqual(firstResult.created, expectedIds);
  assert.deepEqual(firstResult.updated, []);
  assert.equal(secondResult.length, expectedIds.length);
  assert.deepEqual(secondResult.created, []);
  assert.deepEqual(secondResult.updated, expectedIds);
  assert.deepEqual(Object.keys(secondResult.previous).sort(), [...expectedIds].sort());
  rollbackLessonReviewCards(secondResult);

  const state = getSrsState();
  const cards = Object.values(state.cards).filter((card) => card.payload.kind === "lesson");
  const mistakeCards = Object.values(state.cards).filter((card) => card.payload.kind === "mistake");
  assert.equal(cards.length, expectedIds.length);
  assert.equal(mistakeCards.length, 0);
  assert.equal(state.cards["lesson:l01-hangul-map:1"].payload.prompt, "가 的结构是什么？");
  assert.equal(state.cards["lesson:l01-hangul-map:1"].payload.type, "choice");
  assert.deepEqual(state.cards["lesson:l01-hangul-map:1"].payload.choices, ["ㄱ + ㅏ", "ㄱ + ㅗ", "ㅇ + ㅏ", "ㅎ + ㅏ + ㄴ"]);
  assert.equal(state.cards["lesson:l01-hangul-map:3"].payload.answer, "고");
  assert.deepEqual(state.cards["lesson:l01-hangul-map:3"].payload.acceptable, ["고"]);
  assert.equal(state.cards["lesson:l01-hangul-map:5"].payload.type, "cloze");
  assert.equal(state.cards["lesson:l01-hangul-map:5"].payload.clozeText.includes("___"), true);
  assert.equal(state.cards["lesson:l01-hangul-map:6"].payload.type, "dictation");
  assert.equal(Boolean(state.cards["lesson:l01-hangul-map:6"].payload.speak), true);
});

test("repeating a completed lesson preserves mature scheduling fields", () => {
  store.clear();
  const cardId = "lesson:l01-hangul-map:1";
  saveSrsState({
    cards: {
      [cardId]: {
        id: cardId,
        box: 6,
        dueAt: Date.now() + 1000,
        correct: 8,
        wrong: 2,
        lastSeenAt: Date.now(),
        ease: 2.55,
        intervalDays: 100,
        lapses: 2,
        payload: { kind: "lesson", itemId: cardId, prompt: "old", answer: "old" }
      }
    },
    history: []
  });
  const progress = { ...defaultProgress(), completedLessons: ["l01-hangul-map"], lessonScores: { "l01-hangul-map": 90 } };
  store.set(STORAGE_KEYS.progress, JSON.stringify(progress));

  assert.equal(commitLessonSession("l01-hangul-map", [], 90, progress), true);
  const card = getSrsState().cards[cardId];
  assert.equal(card.ease, 2.55);
  assert.equal(card.intervalDays, 100);
  assert.equal(card.lapses, 2);
});

test("lesson review rollback removes only cards created in the failed attempt", () => {
  store.clear();

  const existingCards = ensureLessonReviewCards("l01-hangul-map");
  rollbackLessonReviewCards(ensureLessonReviewCards("l01-hangul-map"));

  let state = getSrsState();
  for (const id of existingCards) {
    assert.equal(state.cards[id].payload.kind, "lesson");
  }

  const newCards = ensureLessonReviewCards("l02-vowels");
  assert.equal(newCards.created.length, lessonQuestions("l02-vowels").length);
  rollbackLessonReviewCards(newCards);

  state = getSrsState();
  for (const id of existingCards) {
    assert.equal(state.cards[id].payload.kind, "lesson");
  }
  for (const id of newCards) {
    assert.equal(state.cards[id], undefined);
  }
});

test("lesson review rollback restores existing card payloads after an update", () => {
  store.clear();
  const existingId = "lesson:l01-hangul-map:1";
  ensureCard(existingId, {
    kind: "lesson",
    itemId: existingId,
    type: "type",
    prompt: "old prompt",
    answer: "old answer",
    acceptable: ["old answer"]
  });
  gradeCard(existingId, true);

  const before = getSrsState().cards[existingId];
  const updated = ensureLessonReviewCards("l01-hangul-map");
  assert.equal(getSrsState().cards[existingId].payload.prompt, "가 的结构是什么？");

  rollbackLessonReviewCards(updated);

  const after = getSrsState().cards[existingId];
  assert.equal(after.payload.prompt, "old prompt");
  assert.equal(after.payload.answer, "old answer");
  assert.deepEqual(after.payload.acceptable, ["old answer"]);
  assert.equal(after.correct, before.correct);
  assert.equal(after.box, before.box);
});

test("separate output archive entries can create separate SRS cards", () => {
  store.clear();
  ensureCard("output:entry-1", { kind: "output", itemId: "entry-1", prompt: "rewrite", answer: "포장해 주세요" });
  ensureCard("output:entry-2", { kind: "output", itemId: "entry-2", prompt: "rewrite", answer: "힘들 것 같아요" });

  const state = getSrsState();
  assert.equal(Object.keys(state.cards).length, 2);
  assert.equal(state.cards["output:entry-1"].payload.answer, "포장해 주세요");
  assert.equal(state.cards["output:entry-2"].payload.answer, "힘들 것 같아요");
});

test("clearing output cards does not remove other review cards", () => {
  store.clear();
  ensureCard("output:entry-1", { kind: "output", itemId: "entry-1", prompt: "rewrite", answer: "포장해 주세요" });
  ensureCard("vocab:v-annyeonghaseyo", { kind: "vocab", itemId: "v-annyeonghaseyo" });
  recordMistake("mistake:q1", { kind: "mistake", itemId: "q1", prompt: "p", answer: "a" });

  assert.equal(removeCardsByKind("output"), 1);

  const state = getSrsState();
  assert.equal(state.cards["output:entry-1"], undefined);
  assert.equal(state.cards["vocab:v-annyeonghaseyo"].payload.kind, "vocab");
  assert.equal(state.cards["mistake:q1"].payload.kind, "mistake");
});

test("failed output progress save rolls back the new output SRS card", () => {
  store.clear();
  try {
    blockWrites = true;
    assert.equal(persistOutputReview(defaultProgress(), "entry-blocked", "rewrite prompt", "안녕하세요"), false);
  } finally {
    blockWrites = false;
  }

  assert.equal(getSrsState().cards["output:entry-blocked"], undefined);
});

test("failed output progress save restores an existing output SRS card", () => {
  store.clear();
  ensureCard("output:entry-existing", {
    kind: "output",
    itemId: "entry-existing",
    prompt: "old prompt",
    answer: "좋아요"
  });
  gradeCard("output:entry-existing", true);
  const before = getSrsState().cards["output:entry-existing"];

  try {
    blockWrites = true;
    assert.equal(persistOutputReview(defaultProgress(), "entry-existing", "new prompt", "괜찮아요"), false);
  } finally {
    blockWrites = false;
  }

  const after = getSrsState().cards["output:entry-existing"];
  assert.equal(after.payload.prompt, "old prompt");
  assert.equal(after.payload.answer, "좋아요");
  assert.equal(after.correct, before.correct);
  assert.equal(after.box, before.box);
});

test("failed output SRS save does not advance progress", () => {
  store.clear();
  blockedWriteKeys.add("kirina.srs.v2");
  try {
    assert.equal(persistOutputReview(defaultProgress(), "entry-srs-blocked", "rewrite prompt", "안녕하세요"), false);
  } finally {
    blockedWriteKeys.delete("kirina.srs.v2");
  }

  assert.equal(getSrsState().cards["output:entry-srs-blocked"], undefined);
  assert.equal(store.has("kirina.progress.v2"), false);
});

test("failed review progress save rolls back graded SRS card", () => {
  store.clear();
  ensureCard("vocab:v-annyeonghaseyo", { kind: "vocab", itemId: "v-annyeonghaseyo" });
  const before = getSrsState().cards["vocab:v-annyeonghaseyo"];
  blockedWriteKeys.add(STORAGE_KEYS.progress);
  try {
    assert.equal(gradeReviewCardAndProgress(before, true), false);
  } finally {
    blockedWriteKeys.delete(STORAGE_KEYS.progress);
  }

  const after = getSrsState().cards["vocab:v-annyeonghaseyo"];
  assert.equal(after.box, before.box);
  assert.equal(after.correct, before.correct);
  assert.equal(after.dueAt, before.dueAt);
  assert.equal(store.has(STORAGE_KEYS.progress), false);
});

test("failed review SRS save does not advance progress", () => {
  store.clear();
  ensureCard("vocab:v-annyeonghaseyo", { kind: "vocab", itemId: "v-annyeonghaseyo" });
  const before = getSrsState().cards["vocab:v-annyeonghaseyo"];
  blockedWriteKeys.add(STORAGE_KEYS.srs);
  try {
    assert.equal(gradeReviewCardAndProgress(before, true), false);
  } finally {
    blockedWriteKeys.delete(STORAGE_KEYS.srs);
  }

  const after = getSrsState().cards["vocab:v-annyeonghaseyo"];
  assert.equal(after.box, before.box);
  assert.equal(after.correct, before.correct);
  assert.equal(store.has(STORAGE_KEYS.progress), false);
});

test("removing one SRS card leaves unrelated cards intact", () => {
  store.clear();
  ensureCard("hangul:v-a", { kind: "hangul", itemId: "v-a" });
  ensureCard("vocab:v-annyeonghaseyo", { kind: "vocab", itemId: "v-annyeonghaseyo" });

  assert.equal(removeCard("hangul:v-a"), true);
  assert.equal(removeCard("hangul:v-a"), false);

  const state = getSrsState();
  assert.equal(state.cards["hangul:v-a"], undefined);
  assert.equal(state.cards["vocab:v-annyeonghaseyo"].payload.kind, "vocab");
});
