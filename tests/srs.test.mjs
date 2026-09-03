import test from "node:test";
import assert from "node:assert/strict";
import { BOX_INTERVALS } from "./helpers/srs-core.mjs";
import { todayKey } from "../src/lib/learning/storage.ts";

const { applyDeferToState, applyGradeToState, AUDIO_SKIP_DEFER_MS, boxForIntervalDays, cardIntervalDays, computeNextReview, getSrsStateFromRaw, MAX_INTERVAL_DAYS } = await import("../src/lib/learning/srs.ts");

const DAY_MS = 24 * 60 * 60 * 1000;

function vocabCard(overrides = {}) {
  return {
    id: "vocab:v-annyeonghaseyo",
    box: 0,
    dueAt: 0,
    correct: 0,
    wrong: 0,
    lastSeenAt: null,
    payload: { kind: "vocab", itemId: "v-annyeonghaseyo" },
    ...overrides
  };
}

test("SRS intervals are non-decreasing", () => {
  for (let index = 1; index < BOX_INTERVALS.length; index += 1) {
    assert.equal(BOX_INTERVALS[index] >= BOX_INTERVALS[index - 1], true);
  }
});

test("SRS has enough boxes for long-term memory", () => {
  assert.equal(BOX_INTERVALS.length >= 6, true);
  assert.equal(BOX_INTERVALS.at(-1) >= 1000 * 60 * 60 * 24 * 14, true);
});

test("mature intervals can now grow far beyond the old 21-day ceiling", () => {
  assert.equal(MAX_INTERVAL_DAYS >= 180, true);
});

test("todayKey uses the local calendar date", () => {
  const date = new Date(2026, 5, 8, 0, 30, 0);
  assert.equal(todayKey(date), "2026-06-08");
});

test("audio skip defers a card without changing box or grade counts", () => {
  const now = 1_000_000;
  const result = applyDeferToState({
    cards: { "mistake:listen": vocabCard({ id: "mistake:listen", box: 2, correct: 4, wrong: 1, dueAt: now - 1 }) },
    history: [{ id: "mistake:listen", isCorrect: true, at: now - 10, box: 2 }]
  }, "mistake:listen", now);

  assert.equal(result?.card.box, 2);
  assert.equal(result?.card.correct, 4);
  assert.equal(result?.card.wrong, 1);
  assert.equal(result?.card.dueAt, now + AUDIO_SKIP_DEFER_MS);
  assert.equal(result?.card.lastSeenAt, now);
  assert.equal(result?.state.history.length, 1);
});

test("learning cards climb the Leitner ladder and reset to box 0 on a miss", () => {
  const now = 1_000_000;
  const climb = computeNextReview(vocabCard({ box: 2 }), true, now);
  assert.equal(climb.box, 3);
  assert.equal(climb.dueAt, now + BOX_INTERVALS[3]);

  const miss = computeNextReview(vocabCard({ box: 2 }), false, now);
  assert.equal(miss.box, 0);
  assert.equal(miss.intervalDays, 0);
  assert.equal(miss.dueAt, now);
});

test("mature cards grow multiplicatively by ease up to the interval cap", () => {
  const now = 1_000_000;
  const first = computeNextReview(vocabCard({ box: 4, intervalDays: 3, ease: 2.2 }), true, now);
  assert.equal(first.intervalDays > 6 && first.intervalDays < 7, true);
  assert.equal(first.ease > 2.2, true);
  assert.equal(first.dueAt, now + Math.round(first.intervalDays * DAY_MS));

  const capped = computeNextReview(vocabCard({ box: 6, intervalDays: 170, ease: 2.6 }), true, now);
  assert.equal(capped.intervalDays, MAX_INTERVAL_DAYS);
  assert.equal(capped.box, 6);
});

test("a mature lapse demotes softly instead of resetting to zero", () => {
  const now = 1_000_000;
  const lapse = computeNextReview(vocabCard({ box: 6, intervalDays: 100, ease: 2.4, lapses: 0 }), false, now);
  assert.equal(lapse.box >= 1, true);
  assert.equal(lapse.box, 4);
  assert.equal(lapse.intervalDays, 25);
  assert.equal(lapse.lapses, 1);
  assert.equal(lapse.ease < 2.4, true);
  assert.equal(lapse.dueAt, now + Math.round(25 * DAY_MS));
});

test("ease stays inside its runtime band under repeated grading", () => {
  let card = vocabCard({ box: 4, intervalDays: 3, ease: 2.55 });
  for (let round = 0; round < 12; round += 1) {
    const next = computeNextReview(card, true, 0);
    card = { ...card, ...next };
    assert.equal(next.ease <= 2.6, true);
  }
  let weak = vocabCard({ box: 6, intervalDays: 60, ease: 1.7 });
  for (let round = 0; round < 12; round += 1) {
    const next = computeNextReview(weak, false, 0);
    weak = { ...weak, ...next, intervalDays: 60 };
    assert.equal(next.ease >= 1.6, true);
  }
});

test("cardIntervalDays falls back to the box ladder for legacy cards", () => {
  assert.equal(cardIntervalDays(vocabCard({ box: 4 })), 3);
  assert.equal(cardIntervalDays(vocabCard({ box: 6 })), 21);
  assert.equal(cardIntervalDays(vocabCard({ box: 6, intervalDays: 90 })), 90);
});

test("boxForIntervalDays keeps the mature threshold semantics", () => {
  assert.equal(boxForIntervalDays(0), 0);
  assert.equal(boxForIntervalDays(1), 3);
  assert.equal(boxForIntervalDays(6.9), 4);
  assert.equal(boxForIntervalDays(7), 5);
  assert.equal(boxForIntervalDays(180), 6);
});

test("applyGradeToState is pure and caps history", () => {
  const state = {
    cards: { "vocab:v-annyeonghaseyo": vocabCard() },
    history: Array.from({ length: 400 }, (_, index) => ({ id: "vocab:v-annyeonghaseyo", isCorrect: true, at: index, box: 1 }))
  };
  const result = applyGradeToState(state, "vocab:v-annyeonghaseyo", true, 5_000);
  assert.notEqual(result, null);
  assert.equal(result.card.correct, 1);
  assert.equal(result.card.lastSeenAt, 5_000);
  assert.equal(result.state.history.length, 400);
  assert.equal(result.state.history[0].id, "vocab:v-annyeonghaseyo");
  assert.equal(state.cards["vocab:v-annyeonghaseyo"].correct, 0);
  assert.equal(state.history.length, 400);
  assert.equal(applyGradeToState(state, "missing-card", true, 5_000), null);
});

test("normalization clamps v2 fields and keeps the six question types", () => {
  const raw = JSON.stringify({
    cards: {
      "vocab:v-annyeonghaseyo": vocabCard({
        ease: 99,
        intervalDays: 9_999,
        lapses: -3,
        payload: {
          kind: "vocab",
          itemId: "v-annyeonghaseyo",
          type: "cloze",
          prompt: "补全",
          answer: "안녕하세요",
          clozeText: "___? 처음 뵙겠습니다.",
          hint: "打招呼"
        }
      }),
      "mistake:dictation-card": {
        id: "mistake:dictation-card",
        box: 1,
        dueAt: 0,
        correct: 0,
        wrong: 1,
        lastSeenAt: null,
        payload: { kind: "mistake", itemId: "q1", type: "dictation", prompt: "听写", answer: "네", speak: "네" }
      },
      "mistake:junk-type": {
        id: "mistake:junk-type",
        box: 0,
        dueAt: 0,
        correct: 0,
        wrong: 1,
        lastSeenAt: null,
        payload: { kind: "mistake", itemId: "q2", type: "essay", prompt: "写作", answer: "答案" }
      }
    },
    history: []
  });
  const state = getSrsStateFromRaw(raw);
  const card = state.cards["vocab:v-annyeonghaseyo"];
  assert.equal(card.ease, 2.8);
  assert.equal(card.intervalDays, MAX_INTERVAL_DAYS);
  assert.equal(card.lapses, undefined);
  assert.equal(card.payload.type, "cloze");
  assert.equal(card.payload.clozeText, "___? 처음 뵙겠습니다.");
  assert.equal(card.payload.hint, "打招呼");
  assert.equal(state.cards["mistake:dictation-card"].payload.type, "dictation");
  assert.equal(state.cards["mistake:junk-type"].payload.type, undefined);
});
