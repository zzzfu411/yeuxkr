import test from "node:test";
import assert from "node:assert/strict";
import { hangulGroups, pronunciationPairs } from "../src/data/hangul.js";
import { vocab } from "../src/data/lexicon.js";
import { grammarPoints } from "../src/data/grammar.js";
import { pragmaticScenarios } from "../src/data/pragmatics.js";
import { nuanceSets } from "../src/data/nuance.js";
import { immersionMaterialHref, immersionMaterials } from "../src/data/materials.ts";
import { defaultProfile, defaultProgress, todayKey } from "../src/lib/learning/storage.ts";
import { applyCheckpointCompletion, applyLessonCompletion, applyTaskCompletion, buildLearningWorkspace, buildProficiencySnapshot, checkpointCreditKey, clearMaterialArchiveEvidence, commitLessonSession, commitQuizSession, completeLessonProgress, completeMaterialEvidence, countCheckpointCredits, countNativePracticeEvidence, findCompletedCheckpointCredit, gradeReviewCardAndProgress, mapCardToAbilities, normalizeLearningProgress, normalizeUserProfile, recordAbilityEvent, removeAbilityEvent, removeMistakeCardAndPracticeItem, recordQuizProgress, resetLearningWorkspace, saveNativePracticeEvidence, saveOutputArchiveEntry, saveSelfStudyCheckpointAndProgress, saveSelfStudyPlanAndProgress, saveUserProfileAndProgress, toggleGrammarPoint, toggleHangulItem, toggleNativeItem, togglePronunciationPair, toggleVocabItem, validateCheckpointEvidence } from "../src/lib/learning/workspace.ts";
import { getNextLesson, lessons } from "../src/data/curriculum.js";
import { getCurrentInAppNativeStage, nativeRoadmapStages, nativeRoadmapTotals } from "../src/data/native-roadmap.js";
import { buildSelfStudyPlan } from "../src/data/self-study.js";
import { ensureCard, getSrsState, saveSrsState } from "../src/lib/learning/srs.ts";
import { buildLessonBridge, lessonReviewCardIds, lessonsWithoutTransferMaterials } from "../src/lib/learning/lesson-bridge.ts";
import { hangulQuestionId, lessonReviewCardId, materialCardId, materialRetellQuestionId, mistakeCardId, nativeCardId, outputCardId, outputTransferQuestionId, pronunciationCardId, pronunciationQuestionId, vocabCardId } from "../src/lib/learning/ids.ts";

const store = new Map();
const blockedWriteKeys = new Set();
global.window = {
  localStorage: {
    getItem(key) {
      return store.get(key) ?? null;
    },
    setItem(key, value) {
      if (blockedWriteKeys.has(key)) throw new Error("blocked write");
      store.set(key, value);
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

const firstHangulId = hangulGroups[0].items[0].id;
const firstVocabId = vocab[0].id;
const allHangulIds = hangulGroups.flatMap((group) => group.items.map((item) => item.id));
const allLessonIds = lessons.map((lesson) => lesson.id);
const allGrammarIds = grammarPoints.map((point) => point.id);
const allNativeIds = [
  ...pragmaticScenarios.map((item) => `pragmatics:${item.id}`),
  ...nuanceSets.map((item) => `nuance:${item.id}`)
];
const allMaterialIds = immersionMaterials.map((item) => item.id);
const outputStorageKey = "kirina.outputs.v1";
const profileStorageKey = "kirina.profile.v2";
const progressStorageKey = "kirina.progress.v2";
const srsStorageKey = "kirina.srs.v2";
const lessonSessionStorageKey = "kirina.lesson-session.v1";
const draftStorageKey = "kirina.drafts.v1";

function seedResetState() {
  store.clear();
  const profile = normalizeUserProfile({ studyMode: "guided", minutesGoal: 45, selfStudyGoal: "native" });
  const progress = normalizeLearningProgress({
    ...defaultProgress(),
    completedLessons: ["l01-hangul-map"],
    lessonScores: { "l01-hangul-map": 90 },
    masteredHangul: [firstHangulId],
    learnedVocab: [firstVocabId],
    ability: { ...defaultProgress().ability, script: 9, vocabulary: 2 },
    streak: 4,
    lastStudyDate: "2026-06-09"
  });
  const outputState = {
    entries: [{
      id: "output-reset-1",
      materialId: allMaterialIds[0],
      materialTitle: "重置测试材料",
      mission: "mission",
      draft: "안녕하세요.",
      weakPoint: "更自然",
      targetRewrite: "안녕하세요.",
      rubric: ["naturalness"],
      createdAt: "2026-06-09T00:00:00.000Z"
    }]
  };
  global.window.localStorage.setItem(profileStorageKey, JSON.stringify(profile));
  global.window.localStorage.setItem(progressStorageKey, JSON.stringify(progress));
  global.window.localStorage.setItem(outputStorageKey, JSON.stringify(outputState));
  global.window.localStorage.setItem(lessonSessionStorageKey, JSON.stringify({
    sessions: {
      "l01-hangul-map": {
        lessonId: "l01-hangul-map",
        currentIndex: 1,
        answers: [{ questionId: "lesson:l01-hangul-map:1", answer: "ㄱ + ㅏ", correct: true }],
        finished: false,
        updatedAt: "2026-07-06T00:00:00.000Z"
      }
    }
  }));
  global.window.localStorage.setItem(draftStorageKey, JSON.stringify({
    immersion: {
      [allMaterialIds[0]]: {
        draft: "안녕하세요.",
        weakPoint: "어순",
        updatedAt: "2026-07-06T00:00:00.000Z"
      }
    },
    selfStudyCheckpoints: {
      "foundation:steady:balanced:1:script": {
        evidence: "녹음 75초",
        updatedAt: "2026-07-06T00:00:00.000Z"
      }
    }
  }));
  ensureCard(vocabCardId(firstVocabId), { kind: "vocab", itemId: firstVocabId });
  return {
    profile,
    progress,
    outputState,
    lessonSession: JSON.parse(store.get(lessonSessionStorageKey)),
    draftState: JSON.parse(store.get(draftStorageKey)),
    srsState: getSrsState()
  };
}

function nativeEvidenceForIds(ids) {
  return Object.fromEntries(ids.filter(Boolean).map((id) => [id, {
    listened: true,
    retell: id.startsWith("pragmatics:")
      ? "상대와 관계를 생각해서 부드럽게 말하고 필요한 정보를 확인해요."
      : "표현의 격식과 거리감을 비교해서 상황에 맞게 설명해요.",
    transfer: id.startsWith("pragmatics:")
      ? "친구에게는 편하게 말하고 선생님께는 정중하게 다시 말해요."
      : "회사에서는 감사합니다라고 하고 친구에게는 고마워라고 말해요.",
    updatedAt: "2026-06-09T00:00:00.000Z"
  }]));
}

test("profile and progress normalization tolerate non-object persisted values", () => {
  assert.equal(normalizeUserProfile(null).name, "Learner");
  assert.equal(normalizeUserProfile("bad-value").studyMode, "self");
  assert.equal(normalizeUserProfile({ studyMode: "guided", minutesGoal: 999 }).minutesGoal, 120);
  assert.deepEqual(normalizeLearningProgress(null).completedLessons, []);
  assert.deepEqual(normalizeLearningProgress("bad-value").learnedVocab, []);
  assert.equal(normalizeLearningProgress([]).ability.script, 0);
  assert.deepEqual(normalizeLearningProgress({}).abilityEvents, {});
  assert.deepEqual(normalizeLearningProgress({}).practiceItems, {});
  assert.deepEqual(normalizeLearningProgress({}).completedCheckpoints, []);
  assert.deepEqual(normalizeLearningProgress({}).checkpointEvidence, {});
});

test("normalizeLearningProgress drops unknown content ids and clamps numeric state", () => {
  const progress = normalizeLearningProgress({
    ...defaultProgress(),
    completedLessons: ["l01-hangul-map", "missing-lesson", "l01-hangul-map"],
    lessonScores: { "l01-hangul-map": 150, "missing-lesson": 80 },
    masteredHangul: [firstHangulId, "missing-hangul"],
    learnedVocab: [firstVocabId, "missing-vocab"],
    learnedGrammar: ["g-topic-subject", "missing-grammar"],
    learnedNative: ["pragmatics:p-first-meeting", "nuance:n-thanks", "missing-native"],
    completedMaterials: ["im-cafe-real-speed", "missing-material"],
    materialEvidence: {
      "im-cafe-real-speed": {
        dictation: " 포장해 주세요. ",
        retell: "손님은 카드로 계산해요.",
        selfCheck: ["是否先说核心名词再说数量", "missing-check", "是否使用 주세요 或 드릴까요"],
        updatedAt: "2026-06-09T00:00:00.000Z"
      },
      "missing-material": {
        dictation: "안녕하세요.",
        retell: "안녕하세요.",
        selfCheck: ["ghost"],
        updatedAt: "2026-06-09T00:00:00.000Z"
      }
    },
    completedCheckpoints: ["foundation:1:第 2 周检查", "", "foundation:1:第 2 周检查"],
    checkpointEvidence: { "foundation:1:第 2 周检查": " 正确率 80% ", "empty": "" },
    abilityEvents: { "grammar:g-topic-subject": 2, "bad": -3 },
    practiceItems: {
      " lesson:l01-hangul-map:1 ": {
        attempts: 1,
        correct: 2,
        wrong: 1,
        streak: 99,
        lastCorrect: true,
        lastSeenAt: "",
        lastSource: "quiz"
      },
      "": { attempts: 10, correct: 10, wrong: 0 }
    },
    ability: {
      script: 999,
      listening: -4,
      vocabulary: Number.NaN,
      grammar: 42,
      pragmatics: 101,
      native: 12
    },
    streak: -10,
    minutesGoal: 999
  });

  assert.deepEqual(progress.completedLessons, ["l01-hangul-map"]);
  assert.deepEqual(progress.lessonScores, { "l01-hangul-map": 100 });
  assert.deepEqual(progress.previewLessonScores, {});
  assert.deepEqual(progress.masteredHangul, [firstHangulId]);
  assert.deepEqual(progress.learnedVocab, [firstVocabId]);
  assert.deepEqual(progress.learnedGrammar, ["g-topic-subject"]);
  assert.deepEqual(progress.learnedNative, ["pragmatics:p-first-meeting", "nuance:n-thanks"]);
  assert.deepEqual(progress.completedMaterials, ["im-cafe-real-speed"]);
  assert.deepEqual(progress.materialEvidence["im-cafe-real-speed"], {
    dictation: "포장해 주세요.",
    retell: "손님은 카드로 계산해요.",
    selfCheck: ["是否先说核心名词再说数量", "是否使用 주세요 或 드릴까요"],
    updatedAt: "2026-06-09T00:00:00.000Z"
  });
  assert.equal(progress.materialEvidence["missing-material"], undefined);
  assert.deepEqual(progress.completedCheckpoints, ["foundation:1:第 2 周检查"]);
  assert.deepEqual(progress.checkpointEvidence, { "foundation:1:第 2 周检查": "正确率 80%" });
  assert.deepEqual(progress.abilityEvents, { "grammar:g-topic-subject": 2, "bad": 0 });
  assert.equal(progress.practiceItems["lesson:l01-hangul-map:1"].attempts, 3);
  assert.equal(progress.practiceItems["lesson:l01-hangul-map:1"].streak, 3);
  assert.equal(progress.practiceItems["lesson:l01-hangul-map:1"].lastSource, "quiz");
  assert.equal(progress.practiceItems[""], undefined);
  assert.equal(progress.ability.script, 100);
  assert.equal(progress.ability.listening, 0);
  assert.equal(progress.ability.vocabulary, 0);
  assert.equal(progress.ability.grammar, 42);
  assert.equal(progress.ability.pragmatics, 100);
  assert.equal(progress.ability.native, 12);
  assert.equal(progress.streak, 0);
  assert.equal(progress.minutesGoal, 120);
});

test("normalizeLearningProgress repairs stale core-path completion state", () => {
  const jumped = normalizeLearningProgress({
    ...defaultProgress(),
    completedLessons: ["l10-native-softeners"],
    lessonScores: { "l10-native-softeners": 100 }
  });
  assert.deepEqual(jumped.completedLessons, []);
  assert.equal(jumped.lessonScores["l10-native-softeners"], 100);

  const legacyCompletedOnly = normalizeLearningProgress({
    ...defaultProgress(),
    completedLessons: ["l01-hangul-map", "l02-vowels"]
  });
  assert.deepEqual(legacyCompletedOnly.completedLessons, ["l01-hangul-map", "l02-vowels"]);
  assert.equal(legacyCompletedOnly.lessonScores["l01-hangul-map"], 65);
  assert.equal(legacyCompletedOnly.lessonScores["l02-vowels"], 65);

  const staleLowScore = normalizeLearningProgress({
    ...defaultProgress(),
    completedLessons: ["l01-hangul-map", "l02-vowels"],
    lessonScores: { "l01-hangul-map": 65, "l02-vowels": 64 }
  });
  assert.deepEqual(staleLowScore.completedLessons, ["l01-hangul-map"]);
});

test("recordAbilityEvent applies only new event delta", () => {
  const progress = normalizeLearningProgress(defaultProgress());

  assert.equal(recordAbilityEvent(progress, "grammar:g-topic-subject", ["grammar"], 2), 2);
  assert.equal(progress.ability.grammar, 2);
  assert.equal(recordAbilityEvent(progress, "grammar:g-topic-subject", ["grammar"], 2), 0);
  assert.equal(progress.ability.grammar, 2);
  assert.equal(recordAbilityEvent(progress, "grammar:g-topic-subject", ["grammar"], 4), 2);
  assert.equal(progress.ability.grammar, 4);
});

test("removeAbilityEvent retracts evidence-backed ability without touching other events", () => {
  const progress = normalizeLearningProgress(defaultProgress());
  recordAbilityEvent(progress, "grammar:g-topic-subject", ["grammar"], 2);
  recordAbilityEvent(progress, "quiz:mixed:transfer", ["grammar"], 3);

  assert.equal(removeAbilityEvent(progress, "grammar:g-topic-subject", ["grammar"]), 2);
  assert.equal(progress.ability.grammar, 3);
  assert.equal(progress.abilityEvents["grammar:g-topic-subject"], undefined);
  assert.equal(progress.abilityEvents["quiz:mixed:transfer"], 3);
});

test("ability event removal retracts only actually applied capped deltas", () => {
  const progress = normalizeLearningProgress({
    ...defaultProgress(),
    ability: { ...defaultProgress().ability, grammar: 98, pragmatics: 97, native: 40 }
  });

  assert.equal(recordAbilityEvent(progress, "output:capped", ["grammar", "pragmatics", "native"], 9), 9);
  assert.equal(progress.ability.grammar, 100);
  assert.equal(progress.ability.pragmatics, 100);
  assert.equal(progress.ability.native, 49);
  assert.deepEqual(progress.abilityEvents["output:capped"], { grammar: 2, pragmatics: 3, native: 9 });

  assert.equal(removeAbilityEvent(progress, "output:capped", ["grammar", "pragmatics", "native"]), 9);
  assert.equal(progress.ability.grammar, 98);
  assert.equal(progress.ability.pragmatics, 97);
  assert.equal(progress.ability.native, 40);
  assert.equal(progress.abilityEvents["output:capped"], undefined);
});

test("profile save rolls back when progress minutes cannot persist", () => {
  store.clear();
  const oldProfile = normalizeUserProfile({ studyMode: "guided", minutesGoal: 30 });
  const oldProgress = normalizeLearningProgress({ ...defaultProgress(), minutesGoal: 30 });
  global.window.localStorage.setItem("kirina.profile.v2", JSON.stringify(oldProfile));
  global.window.localStorage.setItem("kirina.progress.v2", JSON.stringify(oldProgress));

  blockedWriteKeys.add("kirina.progress.v2");
  try {
    assert.equal(saveUserProfileAndProgress({ studyMode: "self", minutesGoal: 45 }, defaultProfile(), defaultProgress()), false);
  } finally {
    blockedWriteKeys.delete("kirina.progress.v2");
  }

  const profile = JSON.parse(store.get("kirina.profile.v2"));
  const progress = JSON.parse(store.get("kirina.progress.v2"));
  assert.equal(profile.studyMode, "guided");
  assert.equal(profile.minutesGoal, 30);
  assert.equal(progress.minutesGoal, 30);
});

test("self-study plan save is atomic across profile and progress", () => {
  store.clear();
  const oldProfile = normalizeUserProfile({ studyMode: "guided", minutesGoal: 30, selfStudyGoal: "foundation" });
  const oldProgress = normalizeLearningProgress({ ...defaultProgress(), minutesGoal: 30 });
  global.window.localStorage.setItem("kirina.profile.v2", JSON.stringify(oldProfile));
  global.window.localStorage.setItem("kirina.progress.v2", JSON.stringify(oldProgress));

  blockedWriteKeys.add("kirina.progress.v2");
  try {
    assert.equal(saveSelfStudyPlanAndProgress({ studyMode: "self", selfStudyGoal: "native", minutesGoal: 45 }, defaultProfile(), defaultProgress()), false);
  } finally {
    blockedWriteKeys.delete("kirina.progress.v2");
  }

  let profile = JSON.parse(store.get("kirina.profile.v2"));
  let progress = JSON.parse(store.get("kirina.progress.v2"));
  assert.equal(profile.studyMode, "guided");
  assert.equal(profile.selfStudyGoal, "foundation");
  assert.equal(profile.minutesGoal, 30);
  assert.equal(progress.minutesGoal, 30);
  assert.equal(progress.completedTasks?.["open:self-plan"], undefined);

  assert.equal(saveSelfStudyPlanAndProgress({ studyMode: "self", selfStudyGoal: "native", minutesGoal: 45 }, defaultProfile(), defaultProgress()), true);
  profile = JSON.parse(store.get("kirina.profile.v2"));
  progress = JSON.parse(store.get("kirina.progress.v2"));
  assert.equal(profile.studyMode, "self");
  assert.equal(profile.selfStudyGoal, "native");
  assert.equal(profile.minutesGoal, 45);
  assert.equal(progress.minutesGoal, 45);
  assert.equal(typeof progress.completedTasks["open:self-plan"], "string");
  assert.equal(progress.streak, 0);
});

test("self-study checkpoint save is atomic across profile and progress", () => {
  store.clear();
  const oldProfile = normalizeUserProfile({ studyMode: "guided", minutesGoal: 30, selfStudyGoal: "foundation" });
  const oldProgress = normalizeLearningProgress({ ...defaultProgress(), minutesGoal: 30 });
  global.window.localStorage.setItem("kirina.profile.v2", JSON.stringify(oldProfile));
  global.window.localStorage.setItem("kirina.progress.v2", JSON.stringify(oldProgress));

  blockedWriteKeys.add("kirina.progress.v2");
  try {
    assert.equal(saveSelfStudyCheckpointAndProgress({ studyMode: "self", selfStudyGoal: "native", minutesGoal: 45 }, "native:steady:conversation:1:检查", "录音 75 秒，能说 안녕하세요。", ["script"]), false);
  } finally {
    blockedWriteKeys.delete("kirina.progress.v2");
  }

  let profile = JSON.parse(store.get("kirina.profile.v2"));
  let progress = JSON.parse(store.get("kirina.progress.v2"));
  assert.equal(profile.studyMode, "guided");
  assert.equal(profile.minutesGoal, 30);
  assert.equal(progress.completedCheckpoints?.length ?? 0, 0);

  assert.equal(saveSelfStudyCheckpointAndProgress({ studyMode: "self", selfStudyGoal: "native", minutesGoal: 45 }, "native:steady:conversation:1:检查", "录音 75 秒，能说 안녕하세요。", ["script"]), true);
  profile = JSON.parse(store.get("kirina.profile.v2"));
  progress = JSON.parse(store.get("kirina.progress.v2"));
  assert.equal(profile.studyMode, "self");
  assert.equal(profile.selfStudyGoal, "native");
  assert.equal(progress.completedCheckpoints.includes("native:steady:conversation:1:检查"), true);
  assert.equal(progress.checkpointEvidence["native:steady:conversation:1:检查"].includes("录音 75 秒"), true);
  assert.equal(progress.abilityEvents["checkpoint:native:steady:conversation:1:检查"], 3);
});

test("resetLearningWorkspace clears profile, progress, SRS, and outputs together", () => {
  const seeded = seedResetState();
  assert.equal(Object.keys(seeded.srsState.cards).length, 1);

  assert.equal(resetLearningWorkspace(), true);

  const profile = JSON.parse(store.get(profileStorageKey));
  const progress = JSON.parse(store.get(progressStorageKey));
  const srs = JSON.parse(store.get(srsStorageKey));
  const outputs = JSON.parse(store.get(outputStorageKey));
  const lessonSession = JSON.parse(store.get(lessonSessionStorageKey));
  const drafts = JSON.parse(store.get(draftStorageKey));
  assert.equal(profile.studyMode, "self");
  assert.equal(profile.minutesGoal, 30);
  assert.equal(profile.selfStudyGoal, "foundation");
  assert.deepEqual(progress.completedLessons, []);
  assert.deepEqual(progress.masteredHangul, []);
  assert.deepEqual(progress.learnedVocab, []);
  assert.equal(progress.streak, 0);
  assert.equal(progress.lastStudyDate, null);
  assert.deepEqual(srs.cards, {});
  assert.deepEqual(srs.history, []);
  assert.deepEqual(outputs.entries, []);
  assert.deepEqual(lessonSession.sessions, {});
  assert.deepEqual(drafts.immersion, {});
  assert.deepEqual(drafts.selfStudyCheckpoints, {});
});

test("resetLearningWorkspace rolls back profile when progress reset fails", () => {
  const seeded = seedResetState();

  blockedWriteKeys.add(progressStorageKey);
  try {
    assert.equal(resetLearningWorkspace(), false);
  } finally {
    blockedWriteKeys.delete(progressStorageKey);
  }

  const profile = JSON.parse(store.get(profileStorageKey));
  const progress = JSON.parse(store.get(progressStorageKey));
  const outputs = JSON.parse(store.get(outputStorageKey));
  const lessonSession = JSON.parse(store.get(lessonSessionStorageKey));
  const drafts = JSON.parse(store.get(draftStorageKey));
  assert.equal(profile.studyMode, seeded.profile.studyMode);
  assert.equal(profile.minutesGoal, seeded.profile.minutesGoal);
  assert.deepEqual(progress.completedLessons, seeded.progress.completedLessons);
  assert.deepEqual(progress.learnedVocab, seeded.progress.learnedVocab);
  assert.equal(Object.keys(getSrsState().cards).length, 1);
  assert.deepEqual(outputs.entries, seeded.outputState.entries);
  assert.deepEqual(lessonSession.sessions, seeded.lessonSession.sessions);
  assert.deepEqual(drafts.immersion, seeded.draftState.immersion);
});

test("resetLearningWorkspace rolls back earlier storage when output reset fails", () => {
  const seeded = seedResetState();

  blockedWriteKeys.add(outputStorageKey);
  try {
    assert.equal(resetLearningWorkspace(), false);
  } finally {
    blockedWriteKeys.delete(outputStorageKey);
  }

  const profile = JSON.parse(store.get(profileStorageKey));
  const progress = JSON.parse(store.get(progressStorageKey));
  const outputs = JSON.parse(store.get(outputStorageKey));
  const lessonSession = JSON.parse(store.get(lessonSessionStorageKey));
  const drafts = JSON.parse(store.get(draftStorageKey));
  assert.equal(profile.studyMode, seeded.profile.studyMode);
  assert.equal(profile.selfStudyGoal, seeded.profile.selfStudyGoal);
  assert.equal(progress.streak, seeded.progress.streak);
  assert.deepEqual(progress.completedLessons, seeded.progress.completedLessons);
  assert.equal(Object.keys(getSrsState().cards).length, 1);
  assert.deepEqual(outputs.entries, seeded.outputState.entries);
  assert.deepEqual(lessonSession.sessions, seeded.lessonSession.sessions);
  assert.deepEqual(drafts.selfStudyCheckpoints, seeded.draftState.selfStudyCheckpoints);
});

test("resetLearningWorkspace rolls back earlier storage when lesson session reset fails", () => {
  const seeded = seedResetState();

  blockedWriteKeys.add(lessonSessionStorageKey);
  try {
    assert.equal(resetLearningWorkspace(), false);
  } finally {
    blockedWriteKeys.delete(lessonSessionStorageKey);
  }

  const profile = JSON.parse(store.get(profileStorageKey));
  const progress = JSON.parse(store.get(progressStorageKey));
  const outputs = JSON.parse(store.get(outputStorageKey));
  const lessonSession = JSON.parse(store.get(lessonSessionStorageKey));
  const drafts = JSON.parse(store.get(draftStorageKey));
  assert.equal(profile.studyMode, seeded.profile.studyMode);
  assert.equal(progress.streak, seeded.progress.streak);
  assert.deepEqual(outputs.entries, seeded.outputState.entries);
  assert.deepEqual(lessonSession.sessions, seeded.lessonSession.sessions);
  assert.equal(Object.keys(getSrsState().cards).length, 1);
  assert.deepEqual(drafts.immersion, seeded.draftState.immersion);
});

test("resetLearningWorkspace rolls back earlier storage when draft reset fails", () => {
  const seeded = seedResetState();

  blockedWriteKeys.add(draftStorageKey);
  try {
    assert.equal(resetLearningWorkspace(), false);
  } finally {
    blockedWriteKeys.delete(draftStorageKey);
  }

  const profile = JSON.parse(store.get(profileStorageKey));
  const progress = JSON.parse(store.get(progressStorageKey));
  const outputs = JSON.parse(store.get(outputStorageKey));
  const lessonSession = JSON.parse(store.get(lessonSessionStorageKey));
  const drafts = JSON.parse(store.get(draftStorageKey));
  assert.equal(profile.studyMode, seeded.profile.studyMode);
  assert.equal(progress.streak, seeded.progress.streak);
  assert.deepEqual(outputs.entries, seeded.outputState.entries);
  assert.deepEqual(lessonSession.sessions, seeded.lessonSession.sessions);
  assert.deepEqual(drafts.immersion, seeded.draftState.immersion);
  assert.equal(Object.keys(getSrsState().cards).length, 1);
});

test("mapCardToAbilities turns review cards into ability signals", () => {
  assert.deepEqual(mapCardToAbilities({ payload: { kind: "hangul", itemId: firstHangulId } }), ["script"]);
  assert.deepEqual(mapCardToAbilities({ payload: { kind: "pronunciation", itemId: "plain-aspirated-k" } }), ["listening"]);
  assert.deepEqual(mapCardToAbilities({ payload: { kind: "vocab", itemId: firstVocabId } }), ["vocabulary"]);
  assert.deepEqual(mapCardToAbilities({ payload: { kind: "lesson", itemId: "lesson:l01-hangul-map:1" } }), ["script", "listening"]);
  assert.deepEqual(mapCardToAbilities({ payload: { kind: "lesson", itemId: "lesson:l05-particles:2" } }), ["grammar"]);
  assert.deepEqual(mapCardToAbilities({ payload: { kind: "mistake", itemId: "lesson:l05-particles:1" } }), ["grammar"]);
  assert.deepEqual(mapCardToAbilities({ payload: { kind: "mistake", itemId: "nq:pragmatics:p-first-meeting" } }), ["pragmatics"]);
  assert.deepEqual(mapCardToAbilities({ payload: { kind: "mistake", itemId: "nq:nuance:n-thanks" } }), ["native"]);
  assert.deepEqual(mapCardToAbilities({ payload: { kind: "output", itemId: "output-1" } }), ["grammar", "pragmatics", "native"]);
});

test("output archive quiz answers count toward expression abilities", () => {
  store.clear();

  assert.equal(recordQuizProgress("output-transfer", [
    { question: { id: "oq:output-transfer-1" }, correct: true }
  ], 100), true);

  const progress = JSON.parse(store.get("kirina.progress.v2"));
  assert.equal(progress.ability.grammar, 3);
  assert.equal(progress.ability.pragmatics, 3);
  assert.equal(progress.ability.native, 3);
  assert.equal(progress.completedTasks["quiz:mixed"], progress.lastStudyDate);
});

test("legacy quiz progress entry still commits mistake SRS atomically", () => {
  store.clear();

  assert.equal(recordQuizProgress("legacy-mixed", [
    {
      question: {
        id: "vq:v-annyeonghaseyo",
        prompt: "meaning",
        answer: "hello"
      },
      correct: false
    }
  ], 0), true);

  const srs = getSrsState();
  const progress = JSON.parse(store.get("kirina.progress.v2"));
  assert.equal(srs.cards["mistake:vq:v-annyeonghaseyo"].payload.answer, "hello");
  assert.equal(srs.cards["mistake:vq:v-annyeonghaseyo"].wrong, 1);
  assert.equal(progress.completedTasks["quiz:mixed"], progress.lastStudyDate);
});

test("quiz session commits mistake SRS and progress together", () => {
  store.clear();

  assert.equal(commitQuizSession("mixed:atomic", [
    {
      question: {
        id: "vq:v-annyeonghaseyo",
        prompt: "meaning",
        answer: "hello"
      },
      correct: false
    },
    {
      question: {
        id: "gq:g-topic-subject",
        prompt: "grammar",
        answer: "topic"
      },
      correct: true
    }
  ], 50), true);

  const srs = getSrsState();
  const progress = JSON.parse(store.get("kirina.progress.v2"));
  assert.equal(srs.cards["mistake:vq:v-annyeonghaseyo"].payload.prompt, "meaning");
  assert.equal(srs.cards["mistake:vq:v-annyeonghaseyo"].wrong, 1);
  assert.equal(progress.completedTasks["quiz:mixed"], progress.lastStudyDate);
  assert.equal(progress.abilityEvents["quiz:mixed:atomic:0:vq:v-annyeonghaseyo"], undefined);
  assert.equal(progress.abilityEvents["quiz:mixed:atomic:1:gq:g-topic-subject"], 1);
  assert.equal(progress.practiceItems["vq:v-annyeonghaseyo"].wrong, 1);
  assert.equal(progress.practiceItems["vq:v-annyeonghaseyo"].lastSource, "quiz");
  assert.equal(progress.practiceItems["gq:g-topic-subject"].correct, 1);
  assert.equal(progress.practiceItems["gq:g-topic-subject"].streak, 1);
});

test("quiz session does not write progress when mistake SRS save fails", () => {
  store.clear();
  blockedWriteKeys.add("kirina.srs.v2");
  try {
    assert.equal(commitQuizSession("mixed:srs-blocked", [
      {
        question: {
          id: "vq:v-annyeonghaseyo",
          prompt: "meaning",
          answer: "hello"
        },
        correct: false
      }
    ], 0), false);
  } finally {
    blockedWriteKeys.delete("kirina.srs.v2");
  }

  assert.equal(store.has("kirina.progress.v2"), false);
  assert.equal(getSrsState().cards["mistake:vq:v-annyeonghaseyo"], undefined);
});

test("quiz session rolls back mistake SRS when progress save fails", () => {
  store.clear();
  ensureCard("mistake:vq:v-annyeonghaseyo", {
    kind: "mistake",
    itemId: "vq:v-annyeonghaseyo",
    prompt: "old prompt",
    answer: "old answer"
  });
  const before = getSrsState().cards["mistake:vq:v-annyeonghaseyo"];

  blockedWriteKeys.add("kirina.progress.v2");
  try {
    assert.equal(commitQuizSession("mixed:progress-blocked", [
      {
        question: {
          id: "vq:v-annyeonghaseyo",
          prompt: "new prompt",
          answer: "new answer"
        },
        correct: false
      }
    ], 0), false);
  } finally {
    blockedWriteKeys.delete("kirina.progress.v2");
  }

  const after = getSrsState().cards["mistake:vq:v-annyeonghaseyo"];
  assert.equal(store.has("kirina.progress.v2"), false);
  assert.equal(after.payload.prompt, before.payload.prompt);
  assert.equal(after.payload.answer, before.payload.answer);
  assert.equal(after.wrong, before.wrong);
  assert.equal(after.lastSeenAt, before.lastSeenAt);
});

test("review task is completed only after the due queue is cleared", () => {
  store.clear();
  const now = Date.now();
  saveSrsState({
    cards: {
      "mistake:review-one": {
        id: "mistake:review-one",
        box: 0,
        dueAt: now - 1000,
        correct: 0,
        wrong: 1,
        lastSeenAt: null,
        payload: { kind: "mistake", itemId: "review-one", prompt: "一", answer: "하나" }
      },
      "mistake:review-two": {
        id: "mistake:review-two",
        box: 0,
        dueAt: now - 1000,
        correct: 0,
        wrong: 1,
        lastSeenAt: null,
        payload: { kind: "mistake", itemId: "review-two", prompt: "二", answer: "둘" }
      }
    },
    history: []
  });

  assert.equal(gradeReviewCardAndProgress(getSrsState().cards["mistake:review-one"], true), true);
  let progress = JSON.parse(store.get("kirina.progress.v2"));
  assert.equal(progress.completedTasks?.["open:review-rhythm"], progress.lastStudyDate);
  assert.equal(progress.completedTasks?.["system:review"], undefined);
  assert.equal(progress.practiceItems["review-one"].correct, 1);
  assert.equal(progress.practiceItems["review-one"].lastSource, "review");

  assert.equal(gradeReviewCardAndProgress(getSrsState().cards["mistake:review-two"], true), true);
  progress = JSON.parse(store.get("kirina.progress.v2"));
  assert.equal(progress.completedTasks["system:review"], progress.lastStudyDate);
  assert.equal(progress.practiceItems["review-two"].correct, 1);
});

test("due review is not marked completed when new cards are due later the same day", () => {
  const progress = normalizeLearningProgress({
    ...defaultProgress(),
    completedTasks: { "system:review": todayKey() }
  });
  const workspace = buildLearningWorkspace(normalizeUserProfile(defaultProfile()), progress, 1);
  const dueReview = workspace.recommended.find((task) => task.id === "system:review");

  assert.equal(dueReview?.completed, false);
});

test("output archive entry saves draft without granting formal evidence", () => {
  store.clear();

  const entry = saveOutputArchiveEntry({
    materialId: "im-cafe-real-speed",
    materialTitle: "咖啡店真实语速点单",
    mission: "mission",
    draft: "아이스 아메리카노 하나 주세요.",
    weakPoint: "포장",
    targetRewrite: "아이스 아메리카노 하나 포장해 주세요.",
    rubric: ["naturalness"]
  }, defaultProgress());

  const outputs = JSON.parse(store.get(outputStorageKey));
  const srs = getSrsState();
  assert.equal(Boolean(entry?.id), true);
  assert.equal(outputs.entries[0].id, entry.id);
  assert.equal(srs.cards[`output:${entry.id}`], undefined);
  assert.equal(store.has("kirina.progress.v2"), false);
});

test("output archive entry is not blocked by formal SRS write failures", () => {
  store.clear();
  blockedWriteKeys.add("kirina.srs.v2");
  try {
    const entry = saveOutputArchiveEntry({
      materialId: "im-cafe-real-speed",
      materialTitle: "咖啡店真实语速点单",
      mission: "mission",
      draft: "아이스 아메리카노 하나 주세요.",
      weakPoint: "포장",
      targetRewrite: "아이스 아메리카노 하나 포장해 주세요.",
      rubric: ["naturalness"]
    }, defaultProgress());
    assert.equal(Boolean(entry?.id), true);
  } finally {
    blockedWriteKeys.delete("kirina.srs.v2");
  }

  assert.equal(JSON.parse(store.get(outputStorageKey)).entries.length, 1);
  assert.equal(store.has("kirina.progress.v2"), false);
  assert.equal(Object.keys(getSrsState().cards).length, 0);
});

test("output archive entry is not blocked by formal progress write failures", () => {
  store.clear();
  blockedWriteKeys.add("kirina.progress.v2");
  try {
    const entry = saveOutputArchiveEntry({
      materialId: "im-cafe-real-speed",
      materialTitle: "咖啡店真实语速点单",
      mission: "mission",
      draft: "아이스 아메리카노 하나 주세요.",
      weakPoint: "포장",
      targetRewrite: "아이스 아메리카노 하나 포장해 주세요.",
      rubric: ["naturalness"]
    }, defaultProgress());
    assert.equal(Boolean(entry?.id), true);
  } finally {
    blockedWriteKeys.delete("kirina.progress.v2");
  }

  assert.equal(JSON.parse(store.get(outputStorageKey)).entries.length, 1);
  assert.equal(store.has("kirina.progress.v2"), false);
  assert.equal(Object.keys(getSrsState().cards).length, 0);
});

test("workspace stats ignore stale progress ids after normalization", () => {
  global.window.localStorage.removeItem(outputStorageKey);
  const progress = normalizeLearningProgress({
    ...defaultProgress(),
    completedLessons: ["l01-hangul-map", "ghost"],
    learnedVocab: [firstVocabId, "ghost"],
    completedMaterials: ["im-cafe-real-speed", "ghost"],
    practiceItems: {
      "lesson:l01-hangul-map:1": {
        attempts: 2,
        correct: 1,
        wrong: 1,
        streak: 0,
        lastCorrect: false,
        lastSeenAt: "2026-07-06T00:00:00.000Z",
        lastSource: "lesson"
      },
      "gq:g-topic-subject": {
        attempts: 1,
        correct: 1,
        wrong: 0,
        streak: 1,
        lastCorrect: true,
        lastSeenAt: "2026-07-06T00:00:00.000Z",
        lastSource: "quiz"
      }
    }
  });
  const workspace = buildLearningWorkspace({
    name: "Learner",
    studyMode: "self",
    selfStudyGoal: "foundation",
    selfStudyIntensity: "steady",
    selfStudyFocus: "balanced",
    minutesGoal: 30,
    romanization: "fade",
    createdAt: "2026-06-08T00:00:00.000Z",
    updatedAt: "2026-06-08T00:00:00.000Z"
  }, progress, 0);

  assert.equal(workspace.stats.completedLessons, 1);
  assert.equal(workspace.stats.learnedVocab, 1);
  assert.equal(progress.completedMaterials.length, 1);
  assert.equal(workspace.stats.completedMaterials, 0);
  assert.equal(workspace.stats.practiceItems, 2);
  assert.equal(workspace.stats.weakPracticeItems, 1);
});

test("workspace turns weak practice history into a concrete repair task", () => {
  const progress = normalizeLearningProgress({
    ...defaultProgress(),
    practiceItems: {
      "vq:v-annyeonghaseyo": {
        attempts: 4,
        correct: 2,
        wrong: 2,
        streak: 0,
        lastCorrect: false,
        lastSeenAt: "2026-07-06T02:00:00.000Z",
        lastSource: "quiz"
      },
      "gq:g-topic-subject": {
        attempts: 2,
        correct: 1,
        wrong: 1,
        streak: 0,
        lastCorrect: false,
        lastSeenAt: "2026-07-06T01:00:00.000Z",
        lastSource: "review"
      },
      "hq:v-a": {
        attempts: 3,
        correct: 2,
        wrong: 1,
        streak: 1,
        lastCorrect: true,
        lastSeenAt: "2026-07-06T03:00:00.000Z",
        lastSource: "lesson"
      }
    }
  });
  const workspace = buildLearningWorkspace(normalizeUserProfile({ studyMode: "self" }), progress, 0);
  const recommendedTask = workspace.recommended.find((task) => task.id === "system:practice-repair");
  const openTask = workspace.openStudy.find((task) => task.id === "system:practice-repair");

  assert.equal(workspace.stats.weakPracticeItems, 2);
  assert.equal(recommendedTask?.href, "/quiz");
  assert.equal(recommendedTask?.kind, "quiz");
  assert.deepEqual(recommendedTask?.ability, ["vocabulary", "grammar"]);
  assert.match(recommendedTask?.detail ?? "", /2/);
  assert.equal(recommendedTask?.completed, false);
  assert.equal(openTask?.href, "/quiz");
});

test("workspace drops the practice repair task after weak items are answered correctly", () => {
  const progress = normalizeLearningProgress({
    ...defaultProgress(),
    practiceItems: {
      "vq:v-annyeonghaseyo": {
        attempts: 5,
        correct: 3,
        wrong: 2,
        streak: 1,
        lastCorrect: true,
        lastSeenAt: "2026-07-06T02:00:00.000Z",
        lastSource: "quiz"
      }
    }
  });
  const workspace = buildLearningWorkspace(normalizeUserProfile({ studyMode: "self" }), progress, 0);

  assert.equal(workspace.stats.weakPracticeItems, 0);
  assert.equal(workspace.recommended.some((task) => task.id === "system:practice-repair"), false);
  assert.equal(workspace.openStudy.some((task) => task.id === "system:practice-repair"), false);
});

test("removing a mistake card resolves the matching weak practice item", () => {
  store.clear();
  const itemId = "vq:v-annyeonghaseyo";
  const cardId = mistakeCardId(itemId);
  const progress = normalizeLearningProgress({
    ...defaultProgress(),
    practiceItems: {
      [itemId]: {
        attempts: 3,
        correct: 1,
        wrong: 2,
        streak: 0,
        lastCorrect: false,
        lastSeenAt: "2026-07-06T02:00:00.000Z",
        lastSource: "quiz"
      }
    }
  });
  assert.equal(saveUserProfileAndProgress(defaultProfile(), defaultProfile(), progress), true);
  ensureCard(cardId, {
    kind: "mistake",
    itemId,
    prompt: "meaning",
    answer: "hello"
  });

  assert.equal(removeMistakeCardAndPracticeItem(cardId), true);

  const nextProgress = normalizeLearningProgress(JSON.parse(store.get(progressStorageKey)));
  const workspace = buildLearningWorkspace(defaultProfile(), nextProgress, 0);
  assert.equal(getSrsState().cards[cardId], undefined);
  assert.equal(nextProgress.practiceItems[itemId].wrong, 2);
  assert.equal(nextProgress.practiceItems[itemId].attempts, 3);
  assert.equal(nextProgress.practiceItems[itemId].lastCorrect, true);
  assert.equal(workspace.stats.weakPracticeItems, 0);
  assert.equal(workspace.recommended.some((task) => task.id === "system:practice-repair"), false);
  assert.equal(workspace.openStudy.some((task) => task.id === "system:practice-repair"), false);
});

test("removing a mistake card rolls back SRS when practice progress cannot be saved", () => {
  store.clear();
  const itemId = "gq:g-topic-subject";
  const cardId = mistakeCardId(itemId);
  const progress = normalizeLearningProgress({
    ...defaultProgress(),
    practiceItems: {
      [itemId]: {
        attempts: 2,
        correct: 1,
        wrong: 1,
        streak: 0,
        lastCorrect: false,
        lastSeenAt: "2026-07-06T01:00:00.000Z",
        lastSource: "quiz"
      }
    }
  });
  assert.equal(saveUserProfileAndProgress(defaultProfile(), defaultProfile(), progress), true);
  ensureCard(cardId, {
    kind: "mistake",
    itemId,
    prompt: "particle",
    answer: "은/는"
  });
  blockedWriteKeys.add(progressStorageKey);
  try {
    assert.equal(removeMistakeCardAndPracticeItem(cardId), false);
  } finally {
    blockedWriteKeys.delete(progressStorageKey);
  }

  const nextProgress = normalizeLearningProgress(JSON.parse(store.get(progressStorageKey)));
  assert.notEqual(getSrsState().cards[cardId], undefined);
  assert.equal(nextProgress.practiceItems[itemId].lastCorrect, false);
});

test("workspace exposes mistake debt as stats and an open repair task", () => {
  const srs = {
    cards: {
      "mistake:gq:particle": {
        id: "mistake:gq:particle",
        box: 0,
        dueAt: 0,
        correct: 0,
        wrong: 2,
        lastSeenAt: null,
        payload: {
          kind: "mistake",
          itemId: "gq:particle",
          prompt: "Translate: I am a student.",
          answer: "저는 학생이에요"
        }
      },
      "mistake:vq:future": {
        id: "mistake:vq:future",
        box: 2,
        dueAt: Date.now() + 86_400_000,
        correct: 1,
        wrong: 1,
        lastSeenAt: null,
        payload: {
          kind: "mistake",
          itemId: "vq:future",
          prompt: "Meaning of 내일",
          answer: "明天"
        }
      }
    },
    history: []
  };

  const workspace = buildLearningWorkspace(defaultProfile(), defaultProgress(), 1, { outputs: [], srs });

  assert.equal(workspace.stats.mistakeCards, 2);
  assert.equal(workspace.stats.dueMistakes, 1);
  const task = workspace.openStudy.find((item) => item.id === "open:mistakes");
  assert.equal(task?.href, "/mistakes");
  assert.match(task?.detail ?? "", /2/);
});

test("workspace stats and passport include only reviewable output archive evidence", () => {
  store.clear();
  ensureCard("output:output-a", {
    kind: "output",
    itemId: "output-a",
    prompt: "rewrite",
    answer: "아이스 아메리카노 하나 포장해 주세요."
  });
  global.window.localStorage.setItem(outputStorageKey, JSON.stringify({
    entries: [
      {
        id: "output-a",
        materialId: "im-cafe-real-speed",
        materialTitle: "咖啡店真实语速点单",
        mission: "mission",
        draft: "아이스 아메리카노 하나 주세요.",
        weakPoint: "포장",
        targetRewrite: "아이스 아메리카노 하나 포장해 주세요.",
        rubric: [],
        createdAt: "2026-06-09T00:00:00.000Z"
      },
      {
        id: "output-b",
        materialId: "im-subway-directions",
        materialTitle: "地铁站问路与换乘",
        mission: "mission",
        draft: "어디에서 타면 돼요?",
        weakPoint: "갈아타다",
        targetRewrite: "시청역에서 갈아타면 돼요.",
        rubric: [],
        createdAt: "2026-06-09T00:00:00.000Z"
      }
    ]
  }));

  const progress = normalizeLearningProgress(defaultProgress());
  const outputs = JSON.parse(store.get(outputStorageKey)).entries;
  const outputEvidence = { outputs, srs: getSrsState() };
  const workspace = buildLearningWorkspace(normalizeUserProfile({ studyMode: "self" }), progress, 0, outputEvidence);
  const passport = buildProficiencySnapshot(progress, outputEvidence);

  assert.equal(workspace.stats.outputEntries, 1);
  assert.equal(passport.evidence.outputs, 1);

  global.window.localStorage.removeItem(outputStorageKey);
});

test("workspace exposes the same validated material evidence used by stats and passport", () => {
  store.clear();
  const materialId = "im-cafe-real-speed";
  const outputId = "material-valid-output";
  const targetRewrite = "오늘 카페에서 자연스럽게 주문할 수 있어요.";
  ensureCard(materialCardId(materialId), {
    kind: "material",
    itemId: materialId,
    prompt: "retell",
    answer: "카페에서 주문했어요."
  });
  ensureCard(outputCardId(outputId), {
    kind: "output",
    itemId: outputId,
    prompt: "rewrite",
    answer: targetRewrite
  });
  const outputs = [{
    id: outputId,
    materialId,
    materialTitle: "material",
    mission: "mission",
    draft: "카페에서 주문해요.",
    weakPoint: "naturalness",
    targetRewrite,
    rubric: [],
    createdAt: "2026-06-09T00:00:00.000Z"
  }];
  const validProgress = normalizeLearningProgress({
    ...defaultProgress(),
    completedMaterials: [materialId, "im-subway-directions"],
    materialEvidence: {
      [materialId]: {
        dictation: immersionMaterials.find((item) => item.id === materialId).dictation[0],
        retell: "카페에서 커피를 주문했어요.",
        selfCheck: immersionMaterials.find((item) => item.id === materialId).selfCheck,
        outputEntryId: outputId,
        updatedAt: "2026-06-09T00:00:00.000Z"
      }
    }
  });
  const workspace = buildLearningWorkspace(normalizeUserProfile({ studyMode: "self" }), validProgress, 0, { outputs, srs: getSrsState() });
  const passport = buildProficiencySnapshot(validProgress, { outputs, srs: getSrsState() });

  assert.deepEqual(workspace.evidence.validMaterialIds, [materialId]);
  assert.equal(workspace.stats.completedMaterials, 1);
  assert.equal(passport.evidence.materials, 1);
});

test("stale material completions do not hide immersion recommendations or advance native self-study evidence", () => {
  store.clear();
  const readyProgress = normalizeLearningProgress({
    ...defaultProgress(),
    completedLessons: allLessonIds.slice(0, 11),
    lessonScores: Object.fromEntries(allLessonIds.slice(0, 11).map((id) => [id, 90])),
    masteredHangul: allHangulIds,
    learnedVocab: vocab.map((item) => item.id),
    learnedGrammar: allGrammarIds,
    learnedNative: allNativeIds.filter((id) => id.startsWith("pragmatics:")),
    completedMaterials: ["im-cafe-real-speed"]
  });
  const workspace = buildLearningWorkspace(normalizeUserProfile({
    studyMode: "self",
    selfStudyGoal: "native",
    selfStudyFocus: "conversation"
  }), readyProgress, 0, { outputs: [], srs: getSrsState() });

  assert.equal(workspace.stats.completedMaterials, 0);
  assert.equal(workspace.evidence.validMaterialIds.length, 0);
  assert.equal(workspace.proficiency.evidence.materials, 0);
  assert.equal(workspace.recommended.find((task) => task.id === "system:immersion")?.href, "/immersion?material=im-cafe-real-speed");
  assert.equal(workspace.openStudy.find((task) => task.id === "open:immersion")?.href, "/immersion?material=im-cafe-real-speed");
  assert.equal(workspace.recommended.some((task) => task.id === "ability:native"), false);
});

test("immersion recommendations wait for material prerequisites", () => {
  store.clear();
  const zeroBasis = buildLearningWorkspace(normalizeUserProfile({ studyMode: "guided", selfStudyGoal: "native" }), normalizeLearningProgress(defaultProgress()), 0);
  assert.equal(zeroBasis.recommended.some((task) => task.id === "system:immersion"), false);
  const preview = zeroBasis.openStudy.find((task) => task.id === "open:immersion");
  assert.equal(preview.title, "真实材料预览");
  assert.equal(preview.href, "/immersion?material=im-cafe-real-speed");

  const readyProgress = normalizeLearningProgress({
    ...defaultProgress(),
    completedLessons: allLessonIds.slice(0, 11),
    lessonScores: Object.fromEntries(allLessonIds.slice(0, 11).map((id) => [id, 90]))
  });
  const ready = buildLearningWorkspace(normalizeUserProfile({ studyMode: "guided", selfStudyGoal: "native" }), readyProgress, 0);
  const immersionTask = ready.recommended.find((task) => task.id === "system:immersion");
  assert.equal(immersionTask.href, "/immersion?material=im-cafe-real-speed");
  assert.equal(ready.openStudy.find((task) => task.id === "open:immersion").title, "真实材料实验室");
});

test("material completion binds a concrete reviewable output entry", () => {
  store.clear();
  const materialId = "im-cafe-real-speed";
  const selfCheck = immersionMaterials.find((item) => item.id === materialId).selfCheck;
  const baseEvidence = {
    dictation: "포장해 주세요.",
    retell: "손님은 아이스 아메리카노를 주문하고 카드로 계산해요.",
    selfCheck
  };
  const readyProgress = normalizeLearningProgress({
    ...defaultProgress(),
    completedLessons: allLessonIds.slice(0, 11),
    lessonScores: Object.fromEntries(allLessonIds.slice(0, 11).map((id) => [id, 90]))
  });
  global.window.localStorage.setItem(outputStorageKey, JSON.stringify({
    entries: [
      {
        id: "output-a",
        materialId,
        materialTitle: "咖啡店真实语速点单",
        mission: "mission",
        draft: "아이스 아메리카노 하나 주세요.",
        weakPoint: "포장",
        targetRewrite: "아이스 아메리카노 하나 포장해 주세요.",
        rubric: [],
        createdAt: "2026-06-09T00:00:00.000Z"
      }
    ]
  }));

  assert.equal(completeMaterialEvidence(materialId, baseEvidence, defaultProgress()), false);
  assert.equal(completeMaterialEvidence(materialId, { ...baseEvidence, outputEntryId: "output-a" }, defaultProgress()), false);
  assert.equal(completeMaterialEvidence(materialId, { ...baseEvidence, outputEntryId: "output-a" }, readyProgress), true);

  const progress = JSON.parse(store.get("kirina.progress.v2"));
  const srs = getSrsState();
  assert.equal(progress.completedMaterials.includes(materialId), true);
  assert.equal(progress.materialEvidence[materialId].outputEntryId, "output-a");
  assert.equal(Boolean(srs.cards[`material:${materialId}`]), true);
  assert.equal(srs.cards["output:output-a"].payload.answer, "아이스 아메리카노 하나 포장해 주세요.");
  assert.equal(progress.abilityEvents["output:output-a"], 2);
  const outputs = JSON.parse(store.get(outputStorageKey)).entries;
  const workspace = buildLearningWorkspace(normalizeUserProfile({ studyMode: "self" }), normalizeLearningProgress(progress), 0, { outputs, srs });
  const passport = buildProficiencySnapshot(normalizeLearningProgress(progress), { outputs, srs });
  assert.equal(workspace.stats.completedMaterials, 1);
  assert.equal(passport.evidence.materials, 1);
});

test("material completion rejects forged Korean fragments as formal evidence", () => {
  store.clear();
  const materialId = "im-cafe-real-speed";
  const selfCheck = immersionMaterials.find((item) => item.id === materialId).selfCheck;
  const readyProgress = normalizeLearningProgress({
    ...defaultProgress(),
    completedLessons: allLessonIds.slice(0, 11),
    lessonScores: Object.fromEntries(allLessonIds.slice(0, 11).map((id) => [id, 90]))
  });
  global.window.localStorage.setItem(outputStorageKey, JSON.stringify({
    entries: [
      {
        id: "output-a",
        materialId,
        materialTitle: "咖啡店真实语速点单",
        mission: "mission",
        draft: "아이스 아메리카노 하나 주세요.",
        weakPoint: "포장",
        targetRewrite: "아이스 아메리카노 하나 포장해 주세요.",
        rubric: [],
        createdAt: "2026-06-09T00:00:00.000Z"
      }
    ]
  }));

  assert.equal(completeMaterialEvidence(materialId, {
    dictation: "가a",
    retell: "손님은 아이스 아메리카노를 주문하고 카드로 계산해요.",
    selfCheck,
    outputEntryId: "output-a"
  }, readyProgress), false);
  assert.equal(completeMaterialEvidence(materialId, {
    dictation: "포장해 주세요.",
    retell: "가abc",
    selfCheck,
    outputEntryId: "output-a"
  }, readyProgress), false);
  assert.equal(store.has("kirina.progress.v2"), false);
  assert.equal(getSrsState().cards[materialCardId(materialId)], undefined);
});

test("new immersion recommendations do not inherit today's completed state from another material", () => {
  store.clear();
  const completedMaterialId = "im-cafe-real-speed";
  const nextMaterialId = "im-subway-directions";
  const completedMaterial = immersionMaterials.find((item) => item.id === completedMaterialId);
  const output = {
    id: "output-a",
    materialId: completedMaterialId,
    materialTitle: completedMaterial.title,
    mission: completedMaterial.outputMission,
    draft: "아이스 아메리카노 하나 주세요.",
    weakPoint: "포장",
    targetRewrite: "아이스 아메리카노 하나 포장해 주세요.",
    rubric: [],
    createdAt: "2026-06-09T00:00:00.000Z"
  };
  const srs = {
    cards: {
      [materialCardId(completedMaterialId)]: {
        id: materialCardId(completedMaterialId),
        box: 0,
        dueAt: 0,
        correct: 0,
        wrong: 0,
        lastSeenAt: null,
        payload: { kind: "material", itemId: completedMaterialId }
      },
      [outputCardId(output.id)]: {
        id: outputCardId(output.id),
        box: 0,
        dueAt: 0,
        correct: 0,
        wrong: 0,
        lastSeenAt: null,
        payload: { kind: "output", itemId: output.id, prompt: "rewrite", answer: output.targetRewrite }
      }
    },
    history: []
  };
  const progress = normalizeLearningProgress({
    ...defaultProgress(),
    completedLessons: allLessonIds.slice(0, 12),
    lessonScores: Object.fromEntries(allLessonIds.slice(0, 12).map((id) => [id, 90])),
    completedMaterials: [completedMaterialId],
    materialEvidence: {
      [completedMaterialId]: {
        dictation: "포장해 주세요.",
        retell: "손님은 아이스 아메리카노를 주문하고 카드로 계산해요.",
        selfCheck: completedMaterial.selfCheck,
        outputEntryId: output.id,
        updatedAt: "2026-06-09T00:00:00.000Z"
      }
    },
    completedTasks: { "system:immersion": todayKey(), "open:immersion": todayKey() }
  });
  const workspace = buildLearningWorkspace(normalizeUserProfile({ studyMode: "guided", selfStudyGoal: "native" }), progress, 0, { outputs: [output], srs });
  const immersionTask = workspace.recommended.find((task) => task.id === "system:immersion");
  const openImmersionTask = workspace.openStudy.find((task) => task.id === "open:immersion");

  assert.equal(immersionTask?.href, immersionMaterialHref(nextMaterialId));
  assert.equal(immersionTask?.completed, false);
  assert.equal(openImmersionTask?.href, immersionMaterialHref(nextMaterialId));
  assert.equal(openImmersionTask?.completed, false);
});

test("locked material output drafts do not count as passport or SRS evidence", () => {
  store.clear();

  const entry = saveOutputArchiveEntry({
    materialId: "im-weekend-plan",
    materialTitle: "约周末计划和改期",
    mission: "mission",
    draft: "토요일은 힘들 것 같아요.",
    weakPoint: "缓冲",
    targetRewrite: "토요일은 힘들 것 같아요.",
    rubric: ["register"]
  }, defaultProgress());
  const outputs = JSON.parse(store.get(outputStorageKey)).entries;
  const workspace = buildLearningWorkspace(normalizeUserProfile({ studyMode: "self" }), normalizeLearningProgress(defaultProgress()), 0, { outputs, srs: getSrsState() });
  const passport = buildProficiencySnapshot(normalizeLearningProgress(defaultProgress()), { outputs, srs: getSrsState() });

  assert.equal(Boolean(entry?.id), true);
  assert.equal(Object.keys(getSrsState().cards).length, 0);
  assert.equal(store.has("kirina.progress.v2"), false);
  assert.equal(workspace.stats.outputEntries, 0);
  assert.equal(passport.evidence.outputs, 0);
});

test("clearing material archive retracts material and output ability events", () => {
  store.clear();
  ensureCard("output:output-a", {
    kind: "output",
    itemId: "output-a",
    prompt: "rewrite",
    answer: "아이스 아메리카노 하나 포장해 주세요."
  });
  ensureCard(mistakeCardId(materialCardId("im-cafe-real-speed")), {
    kind: "mistake",
    itemId: materialCardId("im-cafe-real-speed"),
    prompt: "material review",
    answer: "손님은 커피를 주문해요."
  });
  ensureCard(mistakeCardId(materialRetellQuestionId("im-cafe-real-speed")), {
    kind: "mistake",
    itemId: materialRetellQuestionId("im-cafe-real-speed"),
    prompt: "material quiz",
    answer: "손님은 커피를 주문해요."
  });
  ensureCard(mistakeCardId(outputCardId("output-a")), {
    kind: "mistake",
    itemId: outputCardId("output-a"),
    prompt: "output review",
    answer: "아이스 아메리카노 하나 포장해 주세요."
  });
  ensureCard(mistakeCardId(outputTransferQuestionId("output-a")), {
    kind: "mistake",
    itemId: outputTransferQuestionId("output-a"),
    prompt: "output quiz",
    answer: "아이스 아메리카노 하나 포장해 주세요."
  });
  ensureCard(mistakeCardId(outputTransferQuestionId("output-b")), {
    kind: "mistake",
    itemId: outputTransferQuestionId("output-b"),
    prompt: "other output quiz",
    answer: "토요일은 힘들 것 같아요."
  });
  assert.notEqual(getSrsState().cards[mistakeCardId(outputTransferQuestionId("output-b"))], undefined);
  global.window.localStorage.setItem(outputStorageKey, JSON.stringify({
    entries: [
      {
        id: "output-a",
        materialId: "im-cafe-real-speed",
        materialTitle: "咖啡店真实语速点单",
        mission: "mission",
        draft: "아이스 아메리카노 하나 주세요.",
        weakPoint: "포장",
        targetRewrite: "아이스 아메리카노 하나 포장해 주세요.",
        rubric: [],
        createdAt: "2026-06-09T00:00:00.000Z"
      },
      {
        id: "output-b",
        materialId: "im-weekend-plan",
        materialTitle: "约周末计划和改期",
        mission: "mission",
        draft: "토요일은 힘들 것 같아요.",
        weakPoint: "direct",
        targetRewrite: "토요일은 힘들 것 같아요.",
        rubric: [],
        createdAt: "2026-06-09T00:00:00.000Z"
      }
    ]
  }));
  const progress = normalizeLearningProgress({
    ...defaultProgress(),
    completedMaterials: ["im-cafe-real-speed"],
    materialEvidence: {
      "im-cafe-real-speed": {
        dictation: "포장해 주세요.",
        retell: "손님은 커피를 주문해요.",
        selfCheck: ["是否先说核心名词再说数量"],
        updatedAt: "2026-06-09T00:00:00.000Z"
      }
    },
    completedTasks: { "system:immersion": "2026-06-09", "open:immersion": "2026-06-09" },
    ability: { ...defaultProgress().ability, listening: 3, vocabulary: 3, grammar: 4, pragmatics: 7, native: 4 },
    abilityEvents: {
      "material:im-cafe-real-speed": 3,
      "output:output-a": 2,
      "output:output-b": 2
    }
  });
  global.window.localStorage.setItem("kirina.progress.v2", JSON.stringify(progress));

  assert.equal(clearMaterialArchiveEvidence("im-cafe-real-speed"), true);

  const nextProgress = JSON.parse(store.get("kirina.progress.v2"));
  const outputs = JSON.parse(store.get(outputStorageKey));
  assert.equal(nextProgress.completedMaterials.includes("im-cafe-real-speed"), false);
  assert.equal(nextProgress.materialEvidence["im-cafe-real-speed"], undefined);
  assert.equal(nextProgress.abilityEvents["material:im-cafe-real-speed"], undefined);
  assert.equal(nextProgress.abilityEvents["output:output-a"], undefined);
  assert.equal(nextProgress.abilityEvents["output:output-b"], 2);
  assert.equal(nextProgress.ability.listening, 0);
  assert.equal(nextProgress.ability.vocabulary, 0);
  assert.equal(nextProgress.ability.pragmatics, 2);
  assert.equal(nextProgress.ability.native, 2);
  const nextSrs = getSrsState();
  assert.equal(nextSrs.cards[materialCardId("im-cafe-real-speed")], undefined);
  assert.equal(nextSrs.cards[outputCardId("output-a")], undefined);
  assert.equal(nextSrs.cards[mistakeCardId(materialCardId("im-cafe-real-speed"))], undefined);
  assert.equal(nextSrs.cards[mistakeCardId(materialRetellQuestionId("im-cafe-real-speed"))], undefined);
  assert.equal(nextSrs.cards[mistakeCardId(outputCardId("output-a"))], undefined);
  assert.equal(nextSrs.cards[mistakeCardId(outputTransferQuestionId("output-a"))], undefined);
  assert.notEqual(nextSrs.cards[mistakeCardId(outputTransferQuestionId("output-b"))], undefined);
  assert.equal(nextProgress.ability.grammar, 2);
  assert.equal(nextProgress.completedTasks["system:immersion"], undefined);
  assert.equal(outputs.entries.some((entry) => entry.id === "output-a"), false);
  assert.equal(outputs.entries.some((entry) => entry.id === "output-b"), true);
});

test("next lesson follows mastery threshold and ordered unlocks", () => {
  assert.equal(getNextLesson(new Set(), {}).id, "l01-hangul-map");
  assert.equal(getNextLesson(new Set(["l01-hangul-map"]), { "l01-hangul-map": 64 }).id, "l01-hangul-map");
  assert.equal(getNextLesson(new Set(["l01-hangul-map"]), { "l01-hangul-map": 65 }).id, "l02-vowels");

  const progress = normalizeLearningProgress({
    ...defaultProgress(),
    completedLessons: ["l01-hangul-map"],
    lessonScores: { "l01-hangul-map": 65 }
  });
  const workspace = buildLearningWorkspace(normalizeUserProfile({ studyMode: "guided" }), progress, 0);
  assert.equal(workspace.nextLesson.id, "l02-vowels");
});

test("open next lesson does not inherit today's completed state after retargeting", () => {
  const progress = normalizeLearningProgress({
    ...defaultProgress(),
    completedLessons: ["l01-hangul-map"],
    lessonScores: { "l01-hangul-map": 90 },
    completedTasks: { "open:next-lesson": todayKey() }
  });
  const workspace = buildLearningWorkspace(normalizeUserProfile({ studyMode: "guided" }), progress, 0);
  const openNext = workspace.openStudy.find((task) => task.id === "open:next-lesson");

  assert.equal(workspace.nextLesson.id, "l02-vowels");
  assert.equal(openNext?.href, "/learn/l02-vowels");
  assert.equal(openNext?.completed, false);
});

test("lesson completion requires score and prerequisite mastery before core path mastery", () => {
  const locked = applyLessonCompletion(normalizeLearningProgress(defaultProgress()), "l10-native-softeners", 100);
  assert.equal(locked.canMasterCorePath, false);
  assert.deepEqual(locked.next.completedLessons, []);
  assert.equal(locked.wasUnlocked, false);
  assert.equal(locked.next.lessonScores["l10-native-softeners"], undefined);
  assert.equal(locked.next.previewLessonScores["l10-native-softeners"], 100);

  const lowScore = applyLessonCompletion(normalizeLearningProgress(defaultProgress()), "l01-hangul-map", 64);
  assert.equal(lowScore.canMasterCorePath, false);
  assert.deepEqual(lowScore.next.completedLessons, []);

  const mastered = applyLessonCompletion(normalizeLearningProgress(defaultProgress()), "l01-hangul-map", 65);
  assert.equal(mastered.canMasterCorePath, true);
  assert.equal(mastered.wasUnlocked, true);
  assert.deepEqual(mastered.next.completedLessons, ["l01-hangul-map"]);

  const alreadyMastered = applyLessonCompletion(normalizeLearningProgress({
    ...defaultProgress(),
    completedLessons: ["l01-hangul-map"],
    lessonScores: { "l01-hangul-map": 80 }
  }), "l01-hangul-map", 20);
  assert.equal(alreadyMastered.canMasterCorePath, true);
  assert.deepEqual(alreadyMastered.next.completedLessons, ["l01-hangul-map"]);
  assert.equal(alreadyMastered.next.lessonScores["l01-hangul-map"], 80);
});

test("locked lesson previews do not count as formal study sessions", () => {
  store.clear();

  assert.equal(completeLessonProgress("l10-native-softeners", 100), true);
  let progress = JSON.parse(store.get("kirina.progress.v2"));
  assert.equal(progress.previewLessonScores["l10-native-softeners"], 100);
  assert.equal(progress.completedLessons.includes("l10-native-softeners"), false);
  assert.equal(progress.streak, 0);
  assert.equal(progress.lastStudyDate, null);
  assert.equal(progress.ability.native, 0);
  assert.equal(Object.keys(getSrsState().cards).length, 0);
  assert.deepEqual(progress.practiceItems, {});

  assert.equal(completeLessonProgress("l01-hangul-map", 64), true);
  progress = JSON.parse(store.get("kirina.progress.v2"));
  assert.equal(progress.lessonScores["l01-hangul-map"], 64);
  assert.equal(progress.completedLessons.includes("l01-hangul-map"), false);
  assert.equal(progress.streak, 1);
  assert.equal(typeof progress.lastStudyDate, "string");
});

test("lesson session commits progress, review cards, and mistake cards together", () => {
  store.clear();
  const firstLesson = lessons.find((lesson) => lesson.id === "l01-hangul-map");
  const firstQuestion = { ...firstLesson.drills[0], id: lessonReviewCardId("l01-hangul-map", 0) };
  const secondQuestion = { ...firstLesson.drills[1], id: lessonReviewCardId("l01-hangul-map", 1) };

  assert.equal(commitLessonSession("l01-hangul-map", [
    { question: firstQuestion, correct: false },
    { question: secondQuestion, correct: true }
  ], 67), true);

  const progress = JSON.parse(store.get("kirina.progress.v2"));
  const srs = getSrsState();
  assert.equal(progress.lessonScores["l01-hangul-map"], 67);
  assert.equal(progress.completedLessons.includes("l01-hangul-map"), true);
  assert.equal(Object.values(srs.cards).filter((card) => card.payload.kind === "lesson" && card.payload.itemId.startsWith("lesson:l01-hangul-map:")).length, firstLesson.drills.length);
  assert.equal(srs.cards[mistakeCardId(firstQuestion.id)].payload.answer, firstQuestion.answer);
  assert.equal(srs.cards[mistakeCardId(firstQuestion.id)].wrong, 1);
  assert.equal(srs.cards[mistakeCardId(secondQuestion.id)], undefined);
  assert.equal(progress.practiceItems[firstQuestion.id].wrong, 1);
  assert.equal(progress.practiceItems[firstQuestion.id].lastSource, "lesson");
  assert.equal(progress.practiceItems[secondQuestion.id].correct, 1);
  assert.equal(progress.practiceItems[secondQuestion.id].streak, 1);
});

test("lesson session does not write progress when lesson SRS save fails", () => {
  store.clear();
  const firstLesson = lessons.find((lesson) => lesson.id === "l01-hangul-map");
  const firstQuestion = { ...firstLesson.drills[0], id: lessonReviewCardId("l01-hangul-map", 0) };

  blockedWriteKeys.add("kirina.srs.v2");
  try {
    assert.equal(commitLessonSession("l01-hangul-map", [{ question: firstQuestion, correct: false }], 67), false);
  } finally {
    blockedWriteKeys.delete("kirina.srs.v2");
  }

  assert.equal(store.has("kirina.progress.v2"), false);
  assert.equal(getSrsState().cards[mistakeCardId(firstQuestion.id)], undefined);
});

test("lesson session rolls back SRS when progress save fails", () => {
  store.clear();
  const firstLesson = lessons.find((lesson) => lesson.id === "l01-hangul-map");
  const firstQuestion = { ...firstLesson.drills[0], id: lessonReviewCardId("l01-hangul-map", 0) };
  ensureCard(mistakeCardId(firstQuestion.id), {
    kind: "mistake",
    itemId: firstQuestion.id,
    prompt: "old prompt",
    answer: "old answer"
  });
  const before = getSrsState().cards[mistakeCardId(firstQuestion.id)];

  blockedWriteKeys.add("kirina.progress.v2");
  try {
    assert.equal(commitLessonSession("l01-hangul-map", [{ question: firstQuestion, correct: false }], 67), false);
  } finally {
    blockedWriteKeys.delete("kirina.progress.v2");
  }

  const after = getSrsState().cards[mistakeCardId(firstQuestion.id)];
  assert.equal(store.has("kirina.progress.v2"), false);
  assert.equal(after.payload.prompt, before.payload.prompt);
  assert.equal(after.payload.answer, before.payload.answer);
  assert.equal(after.wrong, before.wrong);
  assert.equal(after.lastSeenAt, before.lastSeenAt);
  assert.equal(getSrsState().cards[lessonReviewCardId("l01-hangul-map", 0)], undefined);
});

test("unknown lessons stay outside preview and core scores", () => {
  const unknown = applyLessonCompletion(normalizeLearningProgress(defaultProgress()), "missing-lesson", 100);

  assert.equal(unknown.knownLesson, false);
  assert.deepEqual(unknown.next.completedLessons, []);
  assert.deepEqual(unknown.next.lessonScores, {});
  assert.deepEqual(unknown.next.previewLessonScores, {});
});

test("lesson bridge connects prerequisites, review cards, transfer materials, and next lesson", () => {
  const cafeLesson = lessons.find((lesson) => lesson.id === "l06-cafe");
  const blockedBridge = buildLessonBridge(cafeLesson, normalizeLearningProgress(defaultProgress()));

  assert.equal(blockedBridge.unlocked, false);
  assert.equal(blockedBridge.mastered, false);
  assert.equal(blockedBridge.missingPrerequisites.length > 0, true);
  assert.equal(blockedBridge.steps.find((step) => step.id === "prerequisite").done, false);
  assert.equal(blockedBridge.steps.find((step) => step.id === "lesson").title, "仅记录预览分");
  assert.equal(blockedBridge.steps.find((step) => step.id === "review").title, "先不写入 SRS");
  assert.equal(blockedBridge.steps.find((step) => step.id === "transfer").title, "达标后迁移到材料");
  assert.equal(blockedBridge.transferMaterials.some((material) => material.id === "im-cafe-real-speed"), true);
  assert.equal(blockedBridge.transferMaterials.find((material) => material.id === "im-cafe-real-speed").href, immersionMaterialHref("im-cafe-real-speed"));
  assert.equal(blockedBridge.steps.find((step) => step.id === "transfer").href, `/learn/${cafeLesson.id}`);
  assert.equal(blockedBridge.reviewCards, cafeLesson.drills.length);
  assert.deepEqual(lessonReviewCardIds(cafeLesson), cafeLesson.drills.map((drill, index) => drill.id ?? `lesson:${cafeLesson.id}:${index + 1}`));

  const masteredBridge = buildLessonBridge(cafeLesson, normalizeLearningProgress({
    ...defaultProgress(),
    completedLessons: ["l01-hangul-map", "l02-vowels", "l03-consonants", "l04-first-sentences", "l05-particles", "l06-cafe"],
    lessonScores: {
      "l01-hangul-map": 90,
      "l02-vowels": 90,
      "l03-consonants": 90,
      "l04-first-sentences": 90,
      "l05-particles": 90,
      "l06-cafe": 90
    }
  }));

  assert.equal(masteredBridge.unlocked, true);
  assert.equal(masteredBridge.mastered, true);
  assert.equal(masteredBridge.steps.find((step) => step.id === "lesson").done, true);
  assert.equal(masteredBridge.steps.find((step) => step.id === "review").done, true);
  assert.equal(masteredBridge.nextLesson.id, "l07-location");
});

test("lesson bridge keeps lessons without material bindings explicit", () => {
  const unboundLessonId = lessonsWithoutTransferMaterials()[0];
  const lesson = lessons.find((item) => item.id === unboundLessonId);
  const bridge = buildLessonBridge(lesson, normalizeLearningProgress(defaultProgress()));
  const transferStep = bridge.steps.find((step) => step.id === "transfer");

  assert.equal(Boolean(unboundLessonId), true);
  assert.equal(bridge.transferMaterials.length, 0);
  assert.equal(transferStep.href, `/learn/${lesson.id}`);
  assert.equal(transferStep.title, "达标后再迁移");
});

test("lesson bridge transfer completion uses validated material ids when provided", () => {
  const cafeLesson = lessons.find((lesson) => lesson.id === "l06-cafe");
  const staleBridge = buildLessonBridge(cafeLesson, normalizeLearningProgress({
    ...defaultProgress(),
    completedMaterials: ["im-cafe-real-speed"]
  }), { validMaterialIds: [] });
  const validBridge = buildLessonBridge(cafeLesson, normalizeLearningProgress(defaultProgress()), { validMaterialIds: ["im-cafe-real-speed"] });
  const allValidBridge = buildLessonBridge(cafeLesson, normalizeLearningProgress(defaultProgress()), { validMaterialIds: ["im-cafe-real-speed", "im-convenience-payment"] });

  assert.equal(staleBridge.transferMaterials.find((material) => material.id === "im-cafe-real-speed").completed, false);
  assert.equal(staleBridge.steps.find((step) => step.id === "transfer").done, false);
  assert.equal(validBridge.transferMaterials.find((material) => material.id === "im-cafe-real-speed").completed, true);
  assert.equal(validBridge.steps.find((step) => step.id === "transfer").done, false);
  assert.equal(allValidBridge.steps.find((step) => step.id === "transfer").done, true);
});

test("self-study plans keep a zero-basis foundation spine before advanced goals", () => {
  const nativePlan = buildSelfStudyPlan({
    selfStudyGoal: "native",
    selfStudyIntensity: "steady",
    selfStudyFocus: "conversation",
    minutesGoal: 30
  });

  assert.deepEqual(nativePlan.modules.slice(0, 2).map((module) => module.id), ["script", "listening"]);
  assert.deepEqual(nativePlan.phases[0].modules.slice(0, 2).map((module) => module.id), ["script", "listening"]);
  assert.equal(nativePlan.dailyTemplate[1].detail, nativePlan.modules[0].daily);
});

test("self-study plans stay valid across goals, intensity, focus, and minute limits", () => {
  const goals = ["foundation", "travel", "media", "native"];
  const intensities = ["light", "steady", "deep"];
  const focuses = ["balanced", "listening", "reading", "conversation"];
  const minuteGoals = [5, 15, 30, 60, 120, -1, Number.NaN];

  for (const selfStudyGoal of goals) {
    for (const selfStudyIntensity of intensities) {
      for (const selfStudyFocus of focuses) {
        for (const minutesGoal of minuteGoals) {
          const plan = buildSelfStudyPlan({ selfStudyGoal, selfStudyIntensity, selfStudyFocus, minutesGoal });
          assert.equal(plan.phases.length, 4);
          assert.equal(plan.weeklyRhythm.length, 7);
          assert.equal(plan.weeklyRhythm.filter((day) => day.active).length > 0, true);
          assert.equal(plan.dailyTemplate.every((item) => item.minutes >= 0), true);
          assert.equal(plan.weeklyHours > 0, true);
          assert.equal(plan.minutesGoal >= 5 && plan.minutesGoal <= 120, true);
          assert.equal(plan.dailyTemplate.reduce((sum, item) => sum + item.minutes, 0), plan.minutesGoal);
          assert.equal(plan.modules.every((module) => module.href.startsWith("/")), true);
          assert.equal(plan.checkpoints.length >= 4, true);
        }
      }
    }
  }
});

test("self-study recommended tasks reuse real completion ids", () => {
  const profile = normalizeUserProfile({
    studyMode: "self",
    selfStudyGoal: "native",
    selfStudyIntensity: "steady",
    selfStudyFocus: "conversation",
    minutesGoal: 30
  });
  const workspace = buildLearningWorkspace(profile, normalizeLearningProgress(defaultProgress()), 0);
  const ids = workspace.recommended.map((task) => task.id);

  assert.equal(ids.includes("open:review-rhythm"), true);
  assert.equal(ids.includes("system:review"), false);
  assert.equal(ids.some((id) => id.startsWith("self:")), false);
  assert.equal(new Set(ids).size, ids.length);
});

test("self-study rhythm review does not complete the real due-card review task", () => {
  const profile = normalizeUserProfile({
    studyMode: "self",
    selfStudyGoal: "native",
    selfStudyIntensity: "steady",
    selfStudyFocus: "conversation",
    minutesGoal: 30
  });
  const progress = normalizeLearningProgress({
    ...defaultProgress(),
    completedTasks: { "open:review-rhythm": todayKey() }
  });
  const workspace = buildLearningWorkspace(profile, progress, 2);
  const dueReview = workspace.recommended.find((task) => task.id === "system:review");
  const rhythmReview = workspace.recommended.find((task) => task.id === "open:review-rhythm");

  assert.equal(dueReview?.completed, false);
  assert.equal(rhythmReview?.completed, true);
});

test("self-study recommendations advance from foundation spine into target modules", () => {
  const profile = normalizeUserProfile({
    studyMode: "self",
    selfStudyGoal: "native",
    selfStudyIntensity: "steady",
    selfStudyFocus: "conversation",
    minutesGoal: 45
  });
  const zeroBasis = buildLearningWorkspace(profile, normalizeLearningProgress(defaultProgress()), 0);
  assert.equal(zeroBasis.recommended.some((task) => task.id === "ability:script"), true);
  assert.equal(zeroBasis.recommended.some((task) => task.id === "ability:listening"), true);

  const afterFoundation = buildLearningWorkspace(profile, normalizeLearningProgress({
    ...defaultProgress(),
    completedLessons: ["l01-hangul-map", "l02-vowels", "l03-consonants"],
    lessonScores: { "l01-hangul-map": 90, "l02-vowels": 90, "l03-consonants": 90 },
    masteredHangul: allHangulIds,
    ability: { ...defaultProgress().ability, script: 25, listening: 22 }
  }), 0);
  const targetIds = afterFoundation.recommended.map((task) => task.id);
  assert.equal(targetIds.includes("ability:native"), false);
  assert.equal(targetIds.includes("ability:pragmatics"), false);
  assert.equal(targetIds.includes("ability:vocabulary"), true);
  assert.equal(targetIds.includes("ability:grammar"), true);

  const earlyNativePractice = buildLearningWorkspace(profile, normalizeLearningProgress({
    ...defaultProgress(),
    completedLessons: ["l01-hangul-map", "l02-vowels", "l03-consonants"],
    lessonScores: { "l01-hangul-map": 90, "l02-vowels": 90, "l03-consonants": 90 },
    masteredHangul: allHangulIds,
    learnedNative: [allNativeIds.find((id) => id.startsWith("pragmatics:"))],
    ability: { ...defaultProgress().ability, script: 25, listening: 22, pragmatics: 2 }
  }), 0);
  assert.equal(earlyNativePractice.recommended.some((task) => task.id === "system:native-bridge"), false);

  const afterTargetReady = buildLearningWorkspace(profile, normalizeLearningProgress({
    ...defaultProgress(),
    completedLessons: allLessonIds.slice(0, 12),
    lessonScores: Object.fromEntries(allLessonIds.slice(0, 12).map((id) => [id, 90])),
    masteredHangul: allHangulIds,
    learnedVocab: vocab.map((item) => item.id),
    learnedGrammar: allGrammarIds,
    learnedNative: allNativeIds,
    nativeEvidence: nativeEvidenceForIds(allNativeIds),
    completedMaterials: allMaterialIds,
    completedCheckpoints: ["c1", "c2", "c3", "c4", "c5", "c6"],
    ability: { script: 100, listening: 100, vocabulary: 100, grammar: 100, pragmatics: 100, native: 100 }
  }), 0);
  const continuationIds = afterTargetReady.recommended.filter((task) => task.source === "self").map((task) => task.id);
  assert.equal(continuationIds.includes("ability:script"), false);
  assert.equal(continuationIds.includes("ability:listening"), false);
  assert.equal(continuationIds.some((id) => ["ability:pragmatics", "ability:native", "ability:vocabulary", "ability:grammar"].includes(id)), true);
});

test("pronunciation pair practice closes the listening self-study loop", () => {
  store.clear();
  const progress = normalizeLearningProgress(defaultProgress());
  const pairId = "plain-aspirated-k";
  const cardId = pronunciationCardId(pairId);
  assert.equal(togglePronunciationPair(pairId, progress), true);
  const next = JSON.parse(store.get("kirina.progress.v2"));

  assert.equal(next.completedTasks["ability:listening"], next.lastStudyDate);
  assert.equal(next.ability.listening, 2);
  const card = getSrsState().cards[cardId];
  assert.equal(card.payload.kind, "pronunciation");
  assert.deepEqual(mapCardToAbilities(card), ["listening"]);
});

test("removing Hangul and pronunciation practice clears derived mistake cards", () => {
  store.clear();
  const hangulId = firstHangulId;
  const pairId = "plain-aspirated-k";

  assert.equal(toggleHangulItem(hangulId, defaultProgress()), true);
  ensureCard(mistakeCardId(hangulQuestionId(hangulId)), {
    kind: "mistake",
    itemId: hangulQuestionId(hangulId),
    prompt: "Hangul mistake",
    answer: "a"
  });
  assert.equal(toggleHangulItem(hangulId, JSON.parse(store.get(progressStorageKey))), true);
  assert.equal(getSrsState().cards[`hangul:${hangulId}`], undefined);
  assert.equal(getSrsState().cards[mistakeCardId(hangulQuestionId(hangulId))], undefined);
  assert.equal(JSON.parse(store.get(progressStorageKey)).completedTasks["ability:script"], undefined);

  assert.equal(togglePronunciationPair(pairId, JSON.parse(store.get(progressStorageKey))), true);
  assert.equal(JSON.parse(store.get(progressStorageKey)).completedTasks["ability:listening"], todayKey());
  ensureCard(mistakeCardId(pronunciationQuestionId(pairId)), {
    kind: "mistake",
    itemId: pronunciationQuestionId(pairId),
    prompt: "Pronunciation mistake",
    answer: "aspirated"
  });
  assert.equal(togglePronunciationPair(pairId, JSON.parse(store.get(progressStorageKey))), true);
  assert.equal(getSrsState().cards[pronunciationCardId(pairId)], undefined);
  assert.equal(getSrsState().cards[mistakeCardId(pronunciationQuestionId(pairId))], undefined);
  assert.equal(JSON.parse(store.get(progressStorageKey)).completedTasks["ability:listening"], undefined);
});

test("removing self-study SRS items clears the matching ability task completion", () => {
  store.clear();
  const grammarId = allGrammarIds[0];
  const pragmaticsId = allNativeIds.find((id) => id.startsWith("pragmatics:"));
  const nuanceId = allNativeIds.find((id) => id.startsWith("nuance:"));

  assert.equal(toggleVocabItem(firstVocabId, defaultProgress()), true);
  let progress = JSON.parse(store.get(progressStorageKey));
  assert.equal(progress.completedTasks["ability:vocabulary"], progress.lastStudyDate);
  assert.equal(toggleVocabItem(firstVocabId, progress), true);
  progress = JSON.parse(store.get(progressStorageKey));
  assert.equal(progress.completedTasks["ability:vocabulary"], undefined);
  assert.equal(getSrsState().cards[vocabCardId(firstVocabId)], undefined);

  assert.equal(toggleGrammarPoint(grammarId, progress), true);
  progress = JSON.parse(store.get(progressStorageKey));
  assert.equal(progress.completedTasks["ability:grammar"], progress.lastStudyDate);
  assert.equal(toggleGrammarPoint(grammarId, progress), true);
  progress = JSON.parse(store.get(progressStorageKey));
  assert.equal(progress.completedTasks["ability:grammar"], undefined);

  assert.equal(toggleNativeItem(pragmaticsId, progress), true);
  progress = JSON.parse(store.get(progressStorageKey));
  assert.equal(progress.completedTasks["ability:pragmatics"], undefined);
  assert.equal(toggleNativeItem(pragmaticsId, progress), true);
  progress = JSON.parse(store.get(progressStorageKey));
  assert.equal(progress.completedTasks["ability:pragmatics"], undefined);

  assert.equal(toggleNativeItem(nuanceId, progress), true);
  progress = JSON.parse(store.get(progressStorageKey));
  assert.equal(progress.completedTasks["ability:native"], undefined);
  assert.equal(toggleNativeItem(nuanceId, progress), true);
  progress = JSON.parse(store.get(progressStorageKey));
  assert.equal(progress.completedTasks["ability:native"], undefined);
});

test("native evidence completion adds SRS and marks bridge ability tasks", () => {
  store.clear();
  const pragmaticsId = allNativeIds.find((id) => id.startsWith("pragmatics:"));
  const nuanceId = allNativeIds.find((id) => id.startsWith("nuance:"));

  assert.equal(saveNativePracticeEvidence(pragmaticsId, {
    listened: true,
    retell: "처음 만날 때는 자기소개를 하고 천천히 말해 달라고 부탁해요.",
    transfer: "선생님께는 안녕하세요. 저는 리나라고 합니다."
  }, defaultProgress()), true);
  let progress = JSON.parse(store.get(progressStorageKey));
  assert.equal(progress.learnedNative.includes(pragmaticsId), true);
  assert.equal(progress.completedTasks["ability:pragmatics"], progress.lastStudyDate);
  assert.equal(countNativePracticeEvidence(progress, "pragmatics"), 1);
  assert.equal(Boolean(getSrsState().cards[nativeCardId(pragmaticsId)]), true);

  assert.equal(saveNativePracticeEvidence(nuanceId, {
    listened: true,
    retell: "감사합니다는 공식적인 자리에서 쓰고 고마워요는 일상에서 자연스러워요.",
    transfer: "친구에게는 고마워라고 말하고 회사에서는 감사합니다라고 말해요."
  }, progress), true);
  progress = JSON.parse(store.get(progressStorageKey));
  assert.equal(progress.learnedNative.includes(nuanceId), true);
  assert.equal(progress.completedTasks["ability:native"], progress.lastStudyDate);
  assert.equal(countNativePracticeEvidence(progress, "nuance"), 1);
  assert.equal(Boolean(getSrsState().cards[nativeCardId(nuanceId)]), true);

  assert.equal(saveNativePracticeEvidence(nuanceId, {
    listened: true,
    retell: "not korean",
    transfer: "고마워요."
  }, progress), false);
});

test("removing one of several same-ability SRS items keeps non-native ability task completion", () => {
  store.clear();
  const hangulA = allHangulIds[0];
  const hangulB = allHangulIds[1];
  const pronunciationA = pronunciationPairs[0].id;
  const pronunciationB = pronunciationPairs[1].id;
  const vocabA = firstVocabId;
  const vocabB = vocab.find((item) => item.id !== vocabA).id;
  const grammarA = allGrammarIds[0];
  const grammarB = allGrammarIds[1];

  assert.equal(toggleHangulItem(hangulA, defaultProgress()), true);
  let progress = JSON.parse(store.get(progressStorageKey));
  assert.equal(toggleHangulItem(hangulB, progress), true);
  progress = JSON.parse(store.get(progressStorageKey));
  assert.equal(toggleHangulItem(hangulA, progress), true);
  progress = JSON.parse(store.get(progressStorageKey));
  assert.equal(progress.completedTasks["ability:script"], progress.lastStudyDate);
  assert.equal(toggleHangulItem(hangulB, progress), true);
  progress = JSON.parse(store.get(progressStorageKey));
  assert.equal(progress.completedTasks["ability:script"], undefined);

  assert.equal(togglePronunciationPair(pronunciationA, progress), true);
  progress = JSON.parse(store.get(progressStorageKey));
  assert.equal(togglePronunciationPair(pronunciationB, progress), true);
  progress = JSON.parse(store.get(progressStorageKey));
  assert.equal(togglePronunciationPair(pronunciationA, progress), true);
  progress = JSON.parse(store.get(progressStorageKey));
  assert.equal(progress.completedTasks["ability:listening"], progress.lastStudyDate);
  assert.equal(togglePronunciationPair(pronunciationB, progress), true);
  progress = JSON.parse(store.get(progressStorageKey));
  assert.equal(progress.completedTasks["ability:listening"], undefined);

  assert.equal(toggleVocabItem(vocabA, progress), true);
  progress = JSON.parse(store.get(progressStorageKey));
  assert.equal(toggleVocabItem(vocabB, progress), true);
  progress = JSON.parse(store.get(progressStorageKey));
  assert.equal(toggleVocabItem(vocabA, progress), true);
  progress = JSON.parse(store.get(progressStorageKey));
  assert.equal(progress.completedTasks["ability:vocabulary"], progress.lastStudyDate);
  assert.equal(toggleVocabItem(vocabB, progress), true);
  progress = JSON.parse(store.get(progressStorageKey));
  assert.equal(progress.completedTasks["ability:vocabulary"], undefined);

  assert.equal(toggleGrammarPoint(grammarA, progress), true);
  progress = JSON.parse(store.get(progressStorageKey));
  assert.equal(toggleGrammarPoint(grammarB, progress), true);
  progress = JSON.parse(store.get(progressStorageKey));
  assert.equal(toggleGrammarPoint(grammarA, progress), true);
  progress = JSON.parse(store.get(progressStorageKey));
  assert.equal(progress.completedTasks["ability:grammar"], progress.lastStudyDate);
  assert.equal(toggleGrammarPoint(grammarB, progress), true);
  progress = JSON.parse(store.get(progressStorageKey));
  assert.equal(progress.completedTasks["ability:grammar"], undefined);

});

test("saving the self-study plan does not count as a study session", () => {
  const progress = normalizeLearningProgress(defaultProgress());
  const next = applyTaskCompletion(progress, {
    id: "open:self-plan",
    kind: "checkpoint",
    title: "配置自学计划",
    detail: "保存目标、强度和重点。",
    href: "/self-study",
    minutes: 5,
    ability: ["script", "listening"],
    source: "system",
    priority: 1
  });

  assert.equal(typeof next.completedTasks["open:self-plan"], "string");
  assert.equal(next.completedTasks["open:self-plan"].length, 10);
  assert.equal(next.streak, 0);
  assert.equal(next.lastStudyDate, null);
  assert.equal(next.ability.script, 0);
  assert.equal(next.ability.listening, 0);
});

test("self-study plan task is labeled as confirmed configuration, not completed study", () => {
  const profile = normalizeUserProfile({
    studyMode: "self",
    selfStudyGoal: "native",
    selfStudyIntensity: "steady",
    selfStudyFocus: "conversation",
    minutesGoal: 30
  });
  const progress = normalizeLearningProgress({
    ...defaultProgress(),
    completedTasks: { "open:self-plan": todayKey() }
  });
  const workspace = buildLearningWorkspace(profile, progress, 0);
  const planTask = workspace.openStudy.find((task) => task.id === "open:self-plan");

  assert.equal(planTask?.completed, true);
  assert.equal(planTask?.completionLabel, "今日已确认");
  assert.equal(planTask?.completionAsset, "selfStudy");
  assert.equal(planTask?.kind, "checkpoint");
});

test("checkpoint evidence requires a concrete study signal", () => {
  assert.equal(validateCheckpointEvidence("随便看看"), false);
  assert.equal(validateCheckpointEvidence("录音 75 秒，能说 안녕하세요。"), true);
  assert.equal(validateCheckpointEvidence("正确率 80%"), true);
});

test("checkpoint completion closes the self-study planning task", () => {
  const checkpointId = "foundation:steady:balanced:1:week-check";
  const result = applyCheckpointCompletion(
    normalizeLearningProgress(defaultProgress()),
    checkpointId,
    "录音 75 秒，正确率 80%",
    ["script", "listening"]
  );

  assert.equal(result.completed, true);
  assert.equal(result.next.completedCheckpoints.includes(checkpointId), true);
  assert.equal(result.next.completedTasks["open:self-plan"], result.next.lastStudyDate);
  assert.equal(result.next.completedTasks[`checkpoint:${checkpointId}`], result.next.lastStudyDate);
});

test("checkpoint credits require saved concrete evidence", () => {
  const staleProgress = normalizeLearningProgress({
    ...defaultProgress(),
    completedCheckpoints: ["foundation:steady:balanced:1:week-check"]
  });
  const validProgress = normalizeLearningProgress({
    ...defaultProgress(),
    completedCheckpoints: ["foundation:steady:balanced:1:week-check"],
    checkpointEvidence: { "foundation:steady:balanced:1:week-check": "录音 75 秒，正确率 80%" }
  });

  assert.equal(countCheckpointCredits(staleProgress), 0);
  assert.equal(buildProficiencySnapshot(staleProgress, 0).evidence.checkpoints, 0);
  assert.equal(countCheckpointCredits(validProgress), 1);
  assert.equal(buildProficiencySnapshot(validProgress, 0).evidence.checkpoints, 1);
});

test("checkpoint completion backfills ability credit when stale evidence is later supplied", () => {
  const checkpointId = "foundation:steady:balanced:1:week-check";
  const staleProgress = normalizeLearningProgress({
    ...defaultProgress(),
    completedCheckpoints: [checkpointId]
  });

  assert.equal(findCompletedCheckpointCredit(staleProgress, checkpointId), null);
  const result = applyCheckpointCompletion(staleProgress, checkpointId, "录音 75 秒，正确率 80%", ["script"]);

  assert.equal(result.completed, true);
  assert.equal(findCompletedCheckpointCredit(result.next, checkpointId), checkpointId);
  assert.equal(result.next.ability.script, 3);
  assert.equal(result.next.abilityEvents[`checkpoint:${checkpointId}`], 3);
});

test("self-study checkpoint credits stay scoped to plan intent", () => {
  const firstId = "foundation:steady:balanced:1:第 2 周检查";
  const secondId = "native:deep:conversation:1:第 2 周检查";
  const distinctId = "native:deep:conversation:2:中期检查";
  assert.notEqual(checkpointCreditKey(firstId), checkpointCreditKey(secondId));
  assert.notEqual(checkpointCreditKey(firstId), checkpointCreditKey(distinctId));

  const first = applyCheckpointCompletion(
    normalizeLearningProgress(defaultProgress()),
    firstId,
    "录音 75 秒，正确率 80%",
    ["script", "listening"]
  );
  const second = applyCheckpointCompletion(
    first.next,
    secondId,
    "录音 90 秒，正确率 85%",
    ["script", "listening"]
  );
  const third = applyCheckpointCompletion(
    second.next,
    distinctId,
    "输出 6 个句子，正确率 80%",
    ["native"]
  );
  const duplicateSnapshot = buildProficiencySnapshot(normalizeLearningProgress(second.next), 0);
  const distinctSnapshot = buildProficiencySnapshot(normalizeLearningProgress(third.next), 0);

  assert.equal(second.completed, true);
  assert.equal(second.next.completedCheckpoints.includes(secondId), true);
  assert.equal(countCheckpointCredits(second.next), 2);
  assert.equal(duplicateSnapshot.evidence.checkpoints, 2);
  assert.equal(second.next.ability.script, 6);
  assert.equal(second.next.ability.listening, 6);
  assert.equal(second.next.abilityEvents[`checkpoint:${secondId}`], 3);
  assert.equal(findCompletedCheckpointCredit(second.next, secondId), secondId);
  assert.equal(findCompletedCheckpointCredit(second.next, "travel:light:reading:1:第 2 周检查"), null);
  assert.equal(countCheckpointCredits(third.next), 3);
  assert.equal(distinctSnapshot.evidence.checkpoints, 3);
  assert.equal(third.next.ability.native, 3);
});

test("self-study checkpoints expose focused ability evidence", () => {
  const plan = buildSelfStudyPlan({
    selfStudyGoal: "native",
    selfStudyIntensity: "steady",
    selfStudyFocus: "conversation",
    minutesGoal: 30
  });
  const nativeCheckpoint = plan.checkpoints.find((checkpoint) => checkpoint.title === "母语者表达检查");
  const midterm = plan.checkpoints.find((checkpoint) => checkpoint.title === "中期检查");
  const scriptCheckpoint = plan.checkpoints.find((checkpoint) => checkpoint.title === "韩文与收音检查");

  assert.deepEqual(nativeCheckpoint.abilities, ["native"]);
  assert.deepEqual(scriptCheckpoint.abilities, ["script"]);
  assert.equal(midterm.abilities.length >= 2, true);
  assert.equal(plan.checkpoints.every((checkpoint) => Array.isArray(checkpoint.abilities) && checkpoint.abilities.length > 0), true);
});

test("proficiency passport turns mixed evidence into staged progress", () => {
  global.window.localStorage.removeItem(outputStorageKey);
  const empty = buildProficiencySnapshot(normalizeLearningProgress(defaultProgress()), 0);
  assert.equal(empty.current.id, "seed");
  assert.equal(empty.next.id, "script-foundation");
  assert.equal(empty.nextRequirements.some((item) => item.metric === "lessons" && item.current === 0 && item.target === 3), true);

  const scriptReady = buildProficiencySnapshot(normalizeLearningProgress({
    ...defaultProgress(),
    completedLessons: ["l01-hangul-map", "l02-vowels", "l03-consonants"],
    lessonScores: { "l01-hangul-map": 90, "l02-vowels": 90, "l03-consonants": 90 },
    masteredHangul: allHangulIds.slice(0, 12),
    ability: { ...defaultProgress().ability, script: 18, listening: 10 }
  }), 0);
  assert.equal(scriptReady.current.id, "script-foundation");
  assert.equal(scriptReady.next.id, "survival-polite");

  global.window.localStorage.setItem(outputStorageKey, JSON.stringify({
    entries: Array.from({ length: 12 }, (_, index) => ({
      id: `native-output-${index + 1}`,
      materialId: allMaterialIds[index],
      materialTitle: `材料 ${index + 1}`,
      mission: "mission",
      draft: "제 생각에는 균형이 중요해요.",
      weakPoint: "缓冲",
      targetRewrite: "제 생각에는 어느 정도 균형이 중요한 것 같아요.",
      rubric: ["naturalness"],
      createdAt: "2026-06-09T00:00:00.000Z"
    }))
  }));
  const nativeOutputEntries = JSON.parse(store.get(outputStorageKey)).entries;
  const materialEvidenceIds = allMaterialIds.slice(0, 12);
  for (const [index, materialId] of materialEvidenceIds.entries()) {
    const outputId = `native-output-${index + 1}`;
    ensureCard(materialCardId(materialId), {
      kind: "material",
      itemId: materialId,
      prompt: "复述",
      answer: "제 생각에는 균형이 중요해요."
    });
    ensureCard(outputCardId(outputId), {
      kind: "output",
      itemId: outputId,
      prompt: "rewrite",
      answer: "제 생각에는 어느 정도 균형이 중요한 것 같아요."
    });
  }
  const materialEvidence = Object.fromEntries(materialEvidenceIds.map((materialId, index) => [
    materialId,
    {
      dictation: immersionMaterials.find((item) => item.id === materialId).dictation[0],
      retell: "제 생각에는 균형이 중요해요.",
      selfCheck: immersionMaterials.find((item) => item.id === materialId).selfCheck,
      outputEntryId: `native-output-${index + 1}`,
      updatedAt: "2026-06-09T00:00:00.000Z"
    }
  ]));
  const nativeLayer = buildProficiencySnapshot(normalizeLearningProgress({
    ...defaultProgress(),
    completedLessons: allLessonIds,
    lessonScores: Object.fromEntries(allLessonIds.map((id) => [id, 90])),
    masteredHangul: allHangulIds,
    learnedVocab: vocab.map((item) => item.id),
    learnedGrammar: allGrammarIds,
    learnedNative: allNativeIds,
    nativeEvidence: nativeEvidenceForIds(allNativeIds),
    completedMaterials: materialEvidenceIds,
    materialEvidence,
    completedCheckpoints: ["c1", "c2", "c3", "c4"],
    checkpointEvidence: {
      c1: "录音 75 秒，正确率 80%",
      c2: "输出 6 个句子，正确率 80%",
      c3: "复述 90 秒，正确率 80%",
      c4: "自评 4 个弱点，正确率 80%"
    },
    ability: { script: 100, listening: 60, vocabulary: 70, grammar: 70, pragmatics: 60, native: 60 }
  }), { outputs: nativeOutputEntries, srs: getSrsState() });
  assert.equal(nativeLayer.current.id, "native-layer");
  assert.equal(nativeLayer.next.id, "native-portfolio");
  assert.equal(nativeLayer.next.expansionOnly, true);
  assert.equal(nativeLayer.evidence.outputs, 12);
  global.window.localStorage.removeItem(outputStorageKey);
});

test("native roadmap keeps executable portfolio actions and long-term scale", () => {
  const knownRoutes = new Set(["/", "/path", "/self-study", "/hangul", "/vocabulary", "/grammar", "/native", "/immersion", "/review", "/quiz"]);
  let previous = { vocabulary: 0, collocations: 0, native: 0, materials: 0, outputTasks: 0, checkpoints: 0 };
  const inAppStages = nativeRoadmapStages.filter((stage) => stage.scope !== "external");

  for (const stage of nativeRoadmapStages) {
    for (const key of Object.keys(previous)) {
      assert.equal(stage.deliverables[key] > previous[key], true);
    }
    assert.equal(stage.todayActions.length >= 3, true);
    for (const action of stage.todayActions) {
      assert.equal(Boolean(action.title && action.task), true);
      assert.equal(knownRoutes.has(action.href) || action.href.startsWith("/learn/"), true);
    }
    previous = stage.deliverables;
  }

  assert.equal(inAppStages.length >= 2, true);
  assert.equal(Math.max(...inAppStages.map((stage) => stage.deliverables.vocabulary)) <= vocab.length, true);
  assert.equal(Math.max(...inAppStages.map((stage) => stage.deliverables.native)) <= allNativeIds.length, true);
  assert.equal(Math.max(...inAppStages.map((stage) => stage.deliverables.materials)) <= immersionMaterials.length, true);
  assert.equal(nativeRoadmapStages.some((stage) => stage.scope === "external"), true);
  assert.equal(nativeRoadmapTotals.vocabulary >= 5000, true);
  assert.equal(nativeRoadmapTotals.native >= 400, true);
  assert.equal(nativeRoadmapTotals.materials >= 200, true);
  assert.equal(nativeRoadmapTotals.outputTasks >= 120, true);
  assert.equal(nativeRoadmapTotals.checkpoints >= 24, true);
});

test("native roadmap current stage stays inside executable in-app scope", () => {
  const inAppStages = nativeRoadmapStages.filter((stage) => stage.scope !== "external");
  const lastInApp = inAppStages.at(-1);
  const evidenceBeyondInApp = {
    vocabulary: lastInApp.deliverables.vocabulary,
    native: lastInApp.deliverables.native,
    materials: lastInApp.deliverables.materials,
    outputTasks: lastInApp.deliverables.outputTasks,
    checkpoints: lastInApp.deliverables.checkpoints
  };
  const snapshot = getCurrentInAppNativeStage(evidenceBeyondInApp);

  assert.equal(snapshot.inAppPortfolioComplete, true);
  assert.equal(snapshot.currentStage.scope, "in-app");
  assert.equal(snapshot.currentStage.id, lastInApp.id);
  assert.equal(snapshot.longTermStage.scope, "external");
});

test("native roadmap material evidence should use validated workspace stats", () => {
  const staleProgress = normalizeLearningProgress({
    ...defaultProgress(),
    learnedVocab: vocab.map((item) => item.id),
    learnedNative: allNativeIds,
    completedMaterials: allMaterialIds,
    completedCheckpoints: ["native-check-1", "native-check-2", "native-check-3", "native-check-4"],
    checkpointEvidence: {
      "native-check-1": "录音 75 秒，正确率 80%",
      "native-check-2": "输出 6 个句子，正确率 80%",
      "native-check-3": "复述 90 秒，正确率 80%",
      "native-check-4": "自评 4 个弱点，正确率 80%"
    }
  });
  const workspace = buildLearningWorkspace(normalizeUserProfile({ studyMode: "self", selfStudyGoal: "native" }), staleProgress, 0, { outputs: [], srs: getSrsState() });
  const stage = getCurrentInAppNativeStage({
    vocabulary: workspace.progress.learnedVocab.length,
    materials: workspace.stats.completedMaterials,
    outputTasks: workspace.stats.outputEntries,
    checkpoints: countCheckpointCredits(workspace.progress),
    native: countNativePracticeEvidence(workspace.progress)
  });

  assert.equal(staleProgress.completedMaterials.length, allMaterialIds.length);
  assert.equal(workspace.stats.completedMaterials, 0);
  assert.equal(countNativePracticeEvidence(workspace.progress), 0);
  assert.equal(stage.currentStage.id, "in-app-bridge");
});
