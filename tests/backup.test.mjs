import test from "node:test";
import assert from "node:assert/strict";
import { defaultProfile, defaultProgress, STORAGE_KEYS } from "../src/lib/learning/storage.ts";
import { createLearningBackup, inspectLearningBackupText, MAX_LEARNING_BACKUP_TEXT_LENGTH, parseLearningBackupText, resetLearningData, restoreLearningBackup } from "../src/lib/learning/backup.ts";

const store = new Map();
const recordingBlobs = new Map();
let failOnSetKey = "";
let failOnRemoveKey = "";
let failOnGetKey = "";
let indexedDbClearOutcome = "complete";
const events = [];

test("backup entry names inherited from Object.prototype are rejected without throwing", () => {
  for (const key of ["__proto__", "constructor", "toString"]) {
    const input = JSON.stringify({ app: "kirina-korean", version: 1, entries: { [key]: "{}" } });
    const result = inspectLearningBackupText(input);
    assert.equal(result.backup, null);
    assert.match(result.error, /不支持的数据项/);
  }
});

const recordingDatabase = {
  close() {},
  transaction() {
    const transaction = {
      objectStore() {
        return {
          clear() {
            const request = {};
            queueMicrotask(() => {
              if (indexedDbClearOutcome === "complete") {
                recordingBlobs.clear();
                transaction.oncomplete?.();
              } else {
                transaction.onabort?.();
              }
            });
            return request;
          }
        };
      }
    };
    return transaction;
  }
};

global.CustomEvent = class CustomEvent {
  constructor(type, init = {}) {
    this.type = type;
    this.detail = init.detail;
  }
};

global.window = {
  indexedDB: {
    open() {
      const request = {};
      queueMicrotask(() => {
        request.result = recordingDatabase;
        request.onsuccess?.();
      });
      return request;
    }
  },
  localStorage: {
    getItem(key) {
      if (key === failOnGetKey) throw new Error("get failed");
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
  store.set(STORAGE_KEYS.progress, JSON.stringify({
    ...defaultProgress(),
    completedLessons: ["missing", "l01-hangul-map"],
    lessonTaskEvidence: {
      "l22-media-shadowing": {
        kind: "shadowing",
        text: "",
        recordedSeconds: 4.2,
        recordingId: "shadowing:backup-test",
        updatedAt: "2026-07-06T00:00:00.000Z"
      }
    }
  }));
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
  store.set(STORAGE_KEYS.nativePortfolio, JSON.stringify([{
    name: "新闻评论",
    materialSource: "KBS 뉴스",
    studyMinutes: "45",
    content: "이 문제를 더 자세히 살펴봐야 합니다."
  }]));
  store.set(STORAGE_KEYS.mistakes, JSON.stringify({ legacy: true }));

  const backup = createLearningBackup(Date.UTC(2026, 6, 6, 0, 0, 0));
  const profile = JSON.parse(backup.entries[STORAGE_KEYS.profile]);
  const progress = JSON.parse(backup.entries[STORAGE_KEYS.progress]);
  const srs = JSON.parse(backup.entries[STORAGE_KEYS.srs]);
  const drafts = JSON.parse(backup.entries[STORAGE_KEYS.drafts]);
  const nativePortfolio = JSON.parse(backup.entries[STORAGE_KEYS.nativePortfolio]);

  assert.equal(backup.app, "kirina-korean");
  assert.equal(backup.exportedAt, "2026-07-06T00:00:00.000Z");
  assert.equal(profile.minutesGoal, 120);
  assert.deepEqual(progress.completedLessons, ["l01-hangul-map"]);
  assert.equal(progress.lessonTaskEvidence["l22-media-shadowing"], undefined);
  assert.deepEqual(srs.cards, {});
  assert.equal(drafts.immersion["im-cafe-real-speed"].draft, "아메리카노 주세요.");
  assert.equal(drafts.selfStudyCheckpoints["foundation:1"].evidence, "录音 75 秒");
  assert.equal(nativePortfolio.entries[0].title, "新闻评论");
  assert.equal(nativePortfolio.entries[0].learningMinutes, 45);
  assert.equal(backup.entries[STORAGE_KEYS.mistakes], undefined);
  assert.ok(parseLearningBackupText(JSON.stringify(backup)), "an exported normalized backup must be importable");
});

test("invalid backup structures are rejected without writing progress or recordings", async () => {
  resetMockStorage();
  const previous = JSON.stringify(defaultProgress());
  store.set(STORAGE_KEYS.progress, previous);
  recordingBlobs.set("shadowing:keep", new Blob(["original audio"]));
  const invalid = [null, 42, "unexpected", [], { completedLessons: "l01-hangul-map" }, { ability: { script: "100" } }, { lessonTaskEvidence: { l01: { recordedSeconds: "4" } } }];
  for (const value of invalid) {
    const input = { version: 1, app: "kirina-korean", entries: { [STORAGE_KEYS.progress]: JSON.stringify(value) } };
    const inspection = inspectLearningBackupText(JSON.stringify(input));
    assert.equal(inspection.backup, null);
    assert.match(inspection.error, /kirina.progress.v2/);
    assert.equal(await restoreLearningBackup(input), false, "direct restore must enforce the same validation boundary");
    assert.equal(store.get(STORAGE_KEYS.progress), previous);
    assert.equal(recordingBlobs.has("shadowing:keep"), true);
  }
});

test("backup validation checks each container and retains supported partial legacy records", () => {
  const invalid = [
    [STORAGE_KEYS.srs, { cards: [] }],
    [STORAGE_KEYS.srs, { cards: { bad: { payload: { kind: "vocab", itemId: [] } } } }],
    [STORAGE_KEYS.outputs, { entries: [{ id: "o", rubric: {} }] }],
    [STORAGE_KEYS.lessonSession, { sessions: { l01: { answers: {} } } }],
    [STORAGE_KEYS.nativePortfolio, { version: 2, entries: [] }],
    [STORAGE_KEYS.drafts, { immersion: { m: { selfCheck: "done" } } }],
    [STORAGE_KEYS.speech, { rate: "fast" }]
  ];
  for (const [key, value] of invalid) assert.equal(parseLearningBackupText(JSON.stringify({ version: 1, app: "kirina-korean", entries: { [key]: JSON.stringify(value) } })), null);
  assert.ok(parseLearningBackupText(JSON.stringify({ version: 1, app: "kirina-korean", entries: { [STORAGE_KEYS.progress]: JSON.stringify({ completedLessons: [], lessonScores: {} }) } })));
  assert.ok(parseLearningBackupText(JSON.stringify({ version: 1, app: "kirina-korean", entries: {} })), "an explicitly empty backup is previewed as replacement with zero counts");
});

test("backup export revokes recording-backed course completion that cannot migrate", () => {
  resetMockStorage();
  const completedLessons = [
    "l01-hangul-map", "l02-vowels", "l03-consonants", "l04-batchim", "l31-complex-vowels", "l33-batchim",
    "l34-copula", "l05-topic-subject", "l35-object-particle", "l36-native-numbers", "l37-numbers-counters", "l06-cafe",
    "l07-location", "l38-time-date", "l11-shopping-price", "l08-past", "l41-future", "l39-hamnida", "l40-requests", "l09-connectors",
    "l12-time-plans", "l14-negation", "l13-permission", "l42-ability-obligation", "l44-experience", "l15-comparison", "l45-desire-intent",
    "l16-because", "l43-adnominal", "l17-phone-message", "l18-health", "l19-family-honorific", "l20-invitation", "l21-slow-news",
    "l22-media-shadowing", "l23-social-posts"
  ];
  store.set(STORAGE_KEYS.progress, JSON.stringify({
    ...defaultProgress(),
    completedLessons,
    lessonScores: Object.fromEntries(completedLessons.map((id) => [id, 90])),
    lessonTaskEvidence: {
      "l22-media-shadowing": {
        kind: "shadowing",
        text: "",
        recordedSeconds: 4.2,
        recordingId: "shadowing:backup-only",
        updatedAt: "2026-07-15T00:00:00.000Z"
      }
    }
  }));

  const progress = JSON.parse(createLearningBackup().entries[STORAGE_KEYS.progress]);
  assert.equal(progress.completedLessons.includes("l22-media-shadowing"), false);
  assert.equal(progress.completedLessons.includes("l23-social-posts"), false);
  assert.equal(progress.lessonScores["l22-media-shadowing"], 90);
  assert.equal(progress.lessonTaskEvidence["l22-media-shadowing"], undefined);
});

test("learning backup restore replaces only managed Kirina learning keys", async () => {
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
  assert.equal(await restoreLearningBackup(backup), true);
  assert.equal(JSON.parse(store.get(STORAGE_KEYS.profile)).name, "Restored");
  assert.equal(JSON.parse(store.get(STORAGE_KEYS.profile)).minutesGoal, 45);
  assert.equal(store.get("unmanaged"), "keep");
  assert.equal(store.has(STORAGE_KEYS.srs), false);
});

test("learning backup export reports storage read failures", () => {
  resetMockStorage();
  failOnGetKey = STORAGE_KEYS.progress;

  assert.equal(createLearningBackup(), null);
});

test("learning backup restore rolls back managed keys on storage failure", async () => {
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

  assert.equal(await restoreLearningBackup(backup), false);
  assert.equal(store.get(STORAGE_KEYS.profile), previousProfile);
  assert.equal(store.get(STORAGE_KEYS.srs), previousSrs);
});

test("learning backup restore reports recording clear failure and restores local storage", async () => {
  resetMockStorage();
  const previousProfile = JSON.stringify({ ...defaultProfile(), name: "Before" });
  store.set(STORAGE_KEYS.profile, previousProfile);
  recordingBlobs.set("shadowing:restore-failure", new Blob(["audio"]));
  indexedDbClearOutcome = "abort";
  const backup = {
    version: 1,
    app: "kirina-korean",
    exportedAt: "2026-07-06T00:00:00.000Z",
    entries: {
      [STORAGE_KEYS.profile]: JSON.stringify({ ...defaultProfile(), name: "After" })
    }
  };

  assert.equal(await restoreLearningBackup(backup), false);
  assert.equal(store.get(STORAGE_KEYS.profile), previousProfile);
  assert.equal(recordingBlobs.has("shadowing:restore-failure"), true);
});

test("learning data reset clears managed keys and leaves unrelated storage", async () => {
  resetMockStorage();
  store.set(STORAGE_KEYS.profile, JSON.stringify(defaultProfile()));
  store.set(STORAGE_KEYS.progress, JSON.stringify(defaultProgress()));
  store.set(STORAGE_KEYS.drafts, JSON.stringify({ immersion: { "im-cafe-real-speed": { draft: "draft" } } }));
  store.set(STORAGE_KEYS.nativePortfolio, JSON.stringify({ entries: [{ id: "work-1", title: "长期作品", source: "뉴스", body: "한국어 작품입니다." }] }));
  store.set(STORAGE_KEYS.mistakes, JSON.stringify({ legacy: true }));
  store.set("unmanaged", "keep");

  assert.equal(await resetLearningData(), true);
  assert.equal(store.has(STORAGE_KEYS.profile), false);
  assert.equal(store.has(STORAGE_KEYS.progress), false);
  assert.equal(store.has(STORAGE_KEYS.drafts), false);
  assert.equal(store.has(STORAGE_KEYS.nativePortfolio), false);
  assert.equal(store.has(STORAGE_KEYS.mistakes), false);
  assert.equal(store.get("unmanaged"), "keep");
});

test("learning data reset succeeds when IndexedDB is unsupported", async () => {
  resetMockStorage();
  store.set(STORAGE_KEYS.progress, JSON.stringify(defaultProgress()));
  const indexedDB = window.indexedDB;
  delete window.indexedDB;
  try {
    assert.equal(await resetLearningData(), true);
    assert.equal(store.has(STORAGE_KEYS.progress), false);
  } finally {
    window.indexedDB = indexedDB;
  }
});

test("learning data reset reports recording clear failure and restores local storage", async () => {
  resetMockStorage();
  const previousProgress = JSON.stringify(defaultProgress());
  store.set(STORAGE_KEYS.progress, previousProgress);
  store.set("unmanaged", "keep");
  recordingBlobs.set("capstone:reset-failure", new Blob(["audio"]));
  indexedDbClearOutcome = "abort";

  assert.equal(await resetLearningData(), false);
  assert.equal(store.get(STORAGE_KEYS.progress), previousProgress);
  assert.equal(store.get("unmanaged"), "keep");
  assert.equal(recordingBlobs.has("capstone:reset-failure"), true);
});

test("learning backup parser rejects invalid backup payloads", () => {
  assert.equal(parseLearningBackupText("{bad"), null);
  assert.equal(parseLearningBackupText(JSON.stringify({ version: 2, app: "kirina-korean", entries: {} })), null);
  assert.equal(parseLearningBackupText(JSON.stringify({ version: 1, app: "other", entries: {} })), null);
  assert.equal(parseLearningBackupText(JSON.stringify({ version: 1, app: "kirina-korean", entries: [] })), null);
  assert.equal(parseLearningBackupText(JSON.stringify({
    version: 1,
    app: "kirina-korean",
    entries: { "kirina.progress.typo": JSON.stringify(defaultProgress()) }
  })), null);
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
  assert.equal(parseLearningBackupText("{".padEnd(MAX_LEARNING_BACKUP_TEXT_LENGTH + 1, "x")), null);
});

function resetMockStorage() {
  store.clear();
  recordingBlobs.clear();
  events.length = 0;
  failOnSetKey = "";
  failOnRemoveKey = "";
  failOnGetKey = "";
  indexedDbClearOutcome = "complete";
}
