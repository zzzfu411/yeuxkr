import test from "node:test";
import assert from "node:assert/strict";
import { clearLessonPracticeSession, getLessonPracticeSession, getLessonPracticeStateFromRaw, saveLessonPracticeSession } from "../src/lib/learning/lesson-session.ts";
import { STORAGE_KEYS } from "../src/lib/learning/storage.ts";

const store = new Map();
global.window = {
  localStorage: {
    getItem(key) {
      return store.get(key) ?? null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
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

test("lesson practice session saves and restores current step answers", () => {
  store.clear();

  assert.equal(saveLessonPracticeSession("l01-hangul-map", {
    currentIndex: 1,
    answers: [{ questionId: "lesson:l01-hangul-map:1", answer: "ㄱ + ㅏ!", correct: false }],
    finished: false
  }), true);

  const session = getLessonPracticeSession("l01-hangul-map");
  assert.equal(session.currentIndex, 1);
  assert.equal(session.answers.length, 1);
  assert.equal(session.answers[0].questionId, "lesson:l01-hangul-map:1");
  assert.equal(session.answers[0].correct, true);
  assert.equal(session.finished, false);
});

test("lesson practice session rechecks stale persisted correct flags against current questions", () => {
  const state = getLessonPracticeStateFromRaw(JSON.stringify({
    sessions: {
      "l01-hangul-map": {
        lessonId: "l01-hangul-map",
        currentIndex: 5,
        answers: [
          { questionId: "lesson:l01-hangul-map:1", answer: "ㄱ + ㅗ", correct: true },
          { questionId: "lesson:l01-hangul-map:2", answer: "ㅎ", correct: true },
          { questionId: "lesson:l01-hangul-map:3", answer: "가", correct: true },
          { questionId: "lesson:l01-hangul-map:4", answer: "한", correct: true },
          { questionId: "lesson:l01-hangul-map:5", answer: "ㄱ", correct: true },
          { questionId: "lesson:l01-hangul-map:6", answer: "고", correct: true }
        ],
        finished: true,
        updatedAt: "2026-07-06T00:00:00.000Z"
      }
    }
  }));

  const session = state.sessions["l01-hangul-map"];
  assert.equal(session.finished, true);
  assert.equal(session.answers.length, 6);
  assert.equal(session.answers.every((answer) => answer.correct === false), true);
});

test("lesson practice session preserves a skipped audio step without inventing an answer", () => {
  store.clear();

  assert.equal(saveLessonPracticeSession("l01-hangul-map", {
    currentIndex: 0,
    answers: [{ questionId: "lesson:l01-hangul-map:1", answer: "", correct: false, skipped: true }],
    finished: false
  }), true);

  const session = getLessonPracticeSession("l01-hangul-map");
  assert.deepEqual(session.answers[0], {
    questionId: "lesson:l01-hangul-map:1",
    answer: "",
    correct: false,
    skipped: true
  });
});

test("lesson practice session normalization keeps only contiguous answers", () => {
  const state = getLessonPracticeStateFromRaw(JSON.stringify({
    sessions: {
      "l01-hangul-map": {
        lessonId: "l01-hangul-map",
        currentIndex: 99,
        answers: [
          { questionId: "lesson:l01-hangul-map:2", answer: "ㄴ", correct: true },
          { questionId: "missing", answer: "stale", correct: true }
        ],
        finished: true,
        updatedAt: "2026-07-06T00:00:00.000Z"
      },
      "missing-lesson": {
        lessonId: "missing-lesson",
        answers: [{ questionId: "x", answer: "x", correct: true }]
      }
    }
  }));

  assert.equal(Object.keys(state.sessions).length, 1);
  assert.equal(state.sessions["l01-hangul-map"].currentIndex, 0);
  assert.equal(state.sessions["l01-hangul-map"].answers.length, 0);
  assert.equal(state.sessions["l01-hangul-map"].finished, false);
});

test("lesson practice session clamps resume index to the next unanswered step", () => {
  const state = getLessonPracticeStateFromRaw(JSON.stringify({
    sessions: {
      "l01-hangul-map": {
        lessonId: "l01-hangul-map",
        currentIndex: 99,
        answers: [
          { questionId: "lesson:l01-hangul-map:1", answer: "answer-1", correct: true },
          { questionId: "lesson:l01-hangul-map:2", answer: "answer-2", correct: false }
        ],
        finished: false,
        updatedAt: "2026-07-06T00:00:00.000Z"
      }
    }
  }));

  assert.equal(state.sessions["l01-hangul-map"].currentIndex, 2);
  assert.equal(state.sessions["l01-hangul-map"].answers.length, 2);
  assert.equal(state.sessions["l01-hangul-map"].finished, false);
});

test("lesson practice session clears one lesson without touching another", () => {
  store.clear();
  saveLessonPracticeSession("l01-hangul-map", {
    currentIndex: 0,
    answers: [{ questionId: "lesson:l01-hangul-map:1", answer: "ㄱ + ㅏ", correct: true }]
  });
  saveLessonPracticeSession("l02-vowels", {
    currentIndex: 0,
    answers: [{ questionId: "lesson:l02-vowels:1", answer: "ㅗ", correct: true }]
  });

  assert.equal(clearLessonPracticeSession("l01-hangul-map"), true);
  const stored = JSON.parse(store.get(STORAGE_KEYS.lessonSession));
  assert.equal(stored.sessions["l01-hangul-map"], undefined);
  assert.ok(stored.sessions["l02-vowels"]);
});
