import test from "node:test";
import assert from "node:assert/strict";
import { defaultProfile, defaultProgress, STORAGE_KEYS } from "../src/lib/learning/storage.ts";
import { createLearningBackup, parseLearningBackupText, resetLearningData, restoreLearningBackup } from "../src/lib/learning/backup.ts";

const store = new Map();
let failOnSetKey = "";
let failOnRemoveKey = "";
const events = [];

global.CustomEvent = class CustomEvent {
  constructor(type, init = {}) {
    this.type = type;
    this.detail = init.detail;
  }
};

global.window = {
  localStorage: {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      if (key === failOnSetKey) throw new Error("set failed");
      store.set(key, String(value));
    },
    removeItem(key) {
      if (key === failOnRemoveKey) throw new Error("remove failed");
      store.delete(key);
    }
  },
  dispatchEvent(event) {
    events.push(event);
  }
};

test("learning backup exports normalized managed learning entries", () => {
  resetMockStorage();
  store.set(STORAGE_KEYS.profile, JSON.stringify({ ...defaultProfile(), minutesGoal: 500 }));
  store.set(STORAGE_KEYS.progress, JSON.stringify({ ...defaultProgress(), completedLessons: ["missing", "l01-hangul-map"] }));
  store.set(STORAGE_KEYS.srs, "{bad json");
  store.set(STORAGE_KEYS.drafts, JSON.stringify({
    immersion: {
      "im-cafe-real-speed": {
        draft: "  아메리카노 주세요.  ",
        weakPoint: "포장"
      }
    },
    selfStudyCheckpoints: {
      "foundation:1": { evidence: " 录音 75 秒 " }
    }
  }));
  store.set(STORAGE_KEYS.mistakes, JSON.stringify({ legacy: true }));

  const backup = createLearningBackup(Date.UTC(2026, 6, 6, 0, 0, 0));
  const profile = JSON.parse(backup.entries[STORAGE_KEYS.profile]);
  const progress = JSON.parse(backup.entries[STORAGE_KEYS.progress]);
  const srs = JSON.parse(backup.entries[STORAGE_KEYS.srs]);
  const drafts = JSON.parse(backup.entries[STORAGE_KEYS.drafts]);

  assert.equal(backup.app, "kirina-korean");
  assert.equal(backup.exportedAt, "2026-07-06T00:00:00.000Z");
  assert.equal(profile.minutesGoal, 120);
  assert.deepEqual(progress.completedLessons, ["l01-hangul-map"]);
  assert.deepEqual(srs.cards, {});
  assert.equal(drafts.immersion["im-cafe-real-speed"].draft, "아메리카노 주세요.");
  assert.equal(drafts.selfStudyCheckpoints["foundation:1"].evidence, "录音 75 秒");
  assert.equal(backup.entries[STORAGE_KEYS.mistakes], undefined);
});

test("learning backup restore replaces only managed Kirina learning keys", () => {
  resetMockStorage();
  store.set("unmanaged", "keep");
  const profile = { ...defaultProfile(), name: "Restored", minutesGoal: 45 };
  const backup = parseLearningBackupText(JSON.stringify({
    version: 1,
    app: "kirina-korean",
    exportedAt: "2026-07-06T00:00:00.000Z",
    entries: {
      [STORAGE_KEYS.profile]: JSON.stringify(profile),
      [STORAGE_KEYS.progress]: JSON.stringify(defaultProgress())
    }
  }));

  assert.ok(backup);
  assert.equal(restoreLearningBackup(backup), true);
  assert.equal(JSON.parse(store.get(STORAGE_KEYS.profile)).name, "Restored");
  assert.equal(JSON.parse(store.get(STORAGE_KEYS.profile)).minutesGoal, 45);
  assert.equal(store.get("unmanaged"), "keep");
  assert.equal(store.has(STORAGE_KEYS.srs), false);
});

test("learning backup restore rolls back managed keys on storage failure", () => {
  resetMockStorage();
  const previousProfile = JSON.stringify({ ...defaultProfile(), name: "Before" });
  const previousSrs = JSON.stringify({ cards: {}, history: [] });
  store.set(STORAGE_KEYS.profile, previousProfile);
  store.set(STORAGE_KEYS.srs, previousSrs);
  failOnSetKey = STORAGE_KEYS.srs;
  const backup = {
    version: 1,
    app: "kirina-korean",
    exportedAt: "2026-07-06T00:00:00.000Z",
    entries: {
      [STORAGE_KEYS.profile]: JSON.stringify({ ...defaultProfile(), name: "After" }),
      [STORAGE_KEYS.srs]: JSON.stringify({ cards: {}, history: [] })
    }
  };

  assert.equal(restoreLearningBackup(backup), false);
  assert.equal(store.get(STORAGE_KEYS.profile), previousProfile);
  assert.equal(store.get(STORAGE_KEYS.srs), previousSrs);
});

test("learning data reset clears managed keys and leaves unrelated storage", () => {
  resetMockStorage();
  store.set(STORAGE_KEYS.profile, JSON.stringify(defaultProfile()));
  store.set(STORAGE_KEYS.progress, JSON.stringify(defaultProgress()));
  store.set(STORAGE_KEYS.drafts, JSON.stringify({ immersion: { "im-cafe-real-speed": { draft: "draft" } } }));
  store.set(STORAGE_KEYS.mistakes, JSON.stringify({ legacy: true }));
  store.set("unmanaged", "keep");

  assert.equal(resetLearningData(), true);
  assert.equal(store.has(STORAGE_KEYS.profile), false);
  assert.equal(store.has(STORAGE_KEYS.progress), false);
  assert.equal(store.has(STORAGE_KEYS.drafts), false);
  assert.equal(store.has(STORAGE_KEYS.mistakes), false);
  assert.equal(store.get("unmanaged"), "keep");
});

test("learning backup parser rejects invalid backup payloads", () => {
  assert.equal(parseLearningBackupText("{bad"), null);
  assert.equal(parseLearningBackupText(JSON.stringify({ version: 2, app: "kirina-korean", entries: {} })), null);
  assert.equal(parseLearningBackupText(JSON.stringify({ version: 1, app: "other", entries: {} })), null);
  assert.equal(parseLearningBackupText(JSON.stringify({
    version: 1,
    app: "kirina-korean",
    entries: {
      [STORAGE_KEYS.progress]: "{bad json"
    }
  })), null);
  assert.equal(parseLearningBackupText(JSON.stringify({
    version: 1,
    app: "kirina-korean",
    entries: {
      [STORAGE_KEYS.srs]: "{bad json"
    }
  })), null);
});

function resetMockStorage() {
  store.clear();
  events.length = 0;
  failOnSetKey = "";
  failOnRemoveKey = "";
}
