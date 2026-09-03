import test from "node:test";
import assert from "node:assert/strict";
import { hangulGroups, pronunciationPairs } from "../src/data/hangul.js";
import { vocab } from "../src/data/lexicon.js";
import { grammarPoints } from "../src/data/grammar.js";
import { soundChangeRules } from "../src/data/sound-changes.js";
import { pragmaticScenarios } from "../src/data/pragmatics.js";
import { nuanceSets } from "../src/data/nuance.js";
import { immersionMaterialHref, immersionMaterials } from "../src/data/materials.ts";
import { defaultProfile, defaultProgress, todayKey } from "../src/lib/learning/storage.ts";
import { applyCheckpointCompletion, applyLessonCompletion, applyTaskCompletion, buildLearningWorkspace, buildProficiencySnapshot, checkpointCreditKey, clearMaterialArchiveEvidence, commitLessonSession, commitQuizSession, completeLessonProgress, completeMaterialEvidence, countCheckpointCredits, countNativePracticeEvidence, ensureGrammarPointMastered, ensureHangulItemMastered, ensurePronunciationPairMastered, ensureSoundChangeRuleMastered, ensureVocabItemMastered, findCompletedCheckpointCredit, gradeReviewCardAndProgress, invalidateCapstoneRecordingEvidence, invalidateLessonTaskRecordingEvidence, mapCardToAbilities, materialPrerequisitesMet, normalizeLearningProgress, normalizeUserProfile, recordAbilityEvent, removeAbilityEvent, removeMistakeCardAndPracticeItem, recordQuizProgress, resetLearningWorkspace, saveCapstonePracticeEvidence, saveLessonTaskPracticeEvidence, saveNativePracticeEvidence, saveOutputArchiveEntry, saveSelfStudyCheckpointAndProgress, saveSelfStudyPlanAndProgress, saveUserProfileAndProgress, toggleGrammarPoint, toggleHangulItem, toggleNativeItem, togglePronunciationPair, toggleSoundChangeRule, toggleVocabItem, validateCheckpointEvidence } from "../src/lib/learning/workspace.ts";
import { getNextLesson, lessons, UNLOCK_SCORE } from "../src/data/curriculum.js";
import { getCurrentInAppNativeStage, nativeRoadmapStages, nativeRoadmapTotals } from "../src/data/native-roadmap.js";
import { buildSelfStudyPlan } from "../src/data/self-study.js";
import { getLearningDraftStateFromRaw } from "../src/lib/learning/drafts.ts";
import { buildGateQuestions } from "../src/lib/learning/gate.ts";
import { BOX_INTERVALS, ensureCard, getDueCardsFromState, getSrsState, gradeCard, saveSrsState } from "../src/lib/learning/srs.ts";
import { buildLessonBridge, lessonReviewCardIds, lessonsWithoutTransferMaterials } from "../src/lib/learning/lesson-bridge.ts";
import { hangulQuestionId, lessonReviewCardId, materialCardId, materialRetellQuestionId, mistakeCardId, nativeCardId, outputCardId, outputTransferQuestionId, pronunciationCardId, pronunciationQuestionId, soundChangeCardId, vocabCardId, vocabClozeQuestionId, vocabDictationQuestionId, vocabQuestionId } from "../src/lib/learning/ids.ts";

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
const allLessonListeningEvidence = Object.fromEntries(allLessonIds.map((id) => [id, true]));
const allGrammarIds = grammarPoints.map((point) => point.id);
const allNativeIds = [
  ...pragmaticScenarios.map((item) => `pragmatics:${item.id}`),
  ...nuanceSets.map((item) => `nuance:${item.id}`)
];
const allMaterialIds = immersionMaterials.map((item) => item.id);
const outputStorageKey = "kirina.outputs.v1";
const nativePortfolioStorageKey = "kirina.native-portfolio.v1";
const profileStorageKey = "kirina.profile.v2";
const progressStorageKey = "kirina.progress.v2";
const srsStorageKey = "kirina.srs.v2";
const lessonSessionStorageKey = "kirina.lesson-session.v1";
const draftStorageKey = "kirina.drafts.v1";

function seedOnboardedProfile() {
  store.set(profileStorageKey, JSON.stringify({
    ...defaultProfile(),
    onboardedAt: "2026-01-01T00:00:00.000Z"
  }));
}

function masteredLessonStateThrough(lessonIds) {
  const lastIndex = Math.max(-1, ...lessonIds.map((id) => allLessonIds.indexOf(id)));
  const completedLessons = allLessonIds.slice(0, lastIndex + 1);
  return {
    completedLessons,
    lessonScores: Object.fromEntries(completedLessons.map((id) => [id, 90]))
  };
}

function withEnrolledLibrary(progress) {
  return {
    ...progress,
    masteredHangul: allHangulIds,
    learnedVocab: vocab.map((item) => item.id),
    learnedGrammar: allGrammarIds,
    learnedNative: allNativeIds,
    nativeEvidence: nativeEvidenceForIds(allNativeIds),
    completedMaterials: allMaterialIds
  };
}

function attachValidMaterials(progress, count = 4) {
  const materials = immersionMaterials.slice(0, count);
  const outputs = materials.map((material) => {
    const outputId = `valid-out-${material.id}`;
    const targetRewrite = "오늘 카페에서 아이스 아메리카노 하나 포장하고 카드로 계산할게요.";
    ensureCard(materialCardId(material.id), {
      kind: "material",
      itemId: material.id,
      prompt: "retell",
      answer: material.lines[0].ko
    });
    ensureCard(outputCardId(outputId), {
      kind: "output",
      itemId: outputId,
      prompt: "rewrite",
      answer: targetRewrite
    });
    return {
      id: outputId,
      materialId: material.id,
      materialTitle: material.title,
      mission: material.outputMission,
      draft: "저는 카페에서 따뜻한 음료를 주문하고 카드로 바로 계산하고 싶어요.",
      weakPoint: "packaging request still sounds translated",
      targetRewrite,
      rubric: [],
      createdAt: "2026-06-09T00:00:00.000Z"
    };
  });
  store.set(outputStorageKey, JSON.stringify({ entries: outputs }));
  return {
    ...progress,
    completedMaterials: materials.map((material) => material.id),
    materialEvidence: Object.fromEntries(materials.map((material) => [material.id, {
      dictation: material.dictation[0],
      retell: materialRetellEvidence(material.id),
      selfCheck: material.selfCheck,
      outputEntryId: `valid-out-${material.id}`,
      updatedAt: "2026-06-09T00:00:00.000Z"
    }]))
  };
}

function progressWithStudy(patch = {}) {
  return normalizeLearningProgress({
    ...defaultProgress(),
    completedLessons: ["l01-hangul-map"],
    lessonScores: { "l01-hangul-map": 90 },
    ...patch
  });
}

function masteredLessonStateForMaterial(materialId) {
  const material = immersionMaterials.find((item) => item.id === materialId);
  return masteredLessonStateThrough(material?.requiredLessons ?? material?.recommendedLessons ?? []);
}

function materialRetellEvidence(materialId) {
  const material = immersionMaterials.find((item) => item.id === materialId);
  const source = material?.lines?.[0]?.ko ?? "한국어 대화를 들었어요.";
  return `${source} 이 대화에서는 핵심 정보를 확인하고 상황을 다시 설명해요.`;
}

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
  global.window.localStorage.setItem(nativePortfolioStorageKey, JSON.stringify({
    version: 1,
    entries: [{
      id: "portfolio-reset-1",
      title: "重置测试作品",
      source: "뉴스",
      sourceUrl: "",
      learningMinutes: 20,
      recordingMinutes: 3,
      mentorFeedback: "",
      body: "한국어 작품입니다.",
      revisions: [],
      createdAt: "2026-06-09T00:00:00.000Z",
      updatedAt: "2026-06-09T00:00:00.000Z"
    }]
  }));
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
    nativePortfolio: JSON.parse(store.get(nativePortfolioStorageKey)),
    lessonSession: JSON.parse(store.get(lessonSessionStorageKey)),
    draftState: JSON.parse(store.get(draftStorageKey)),
    srsState: getSrsState()
  };
}

function nativeEvidenceForIds(ids) {
  return Object.fromEntries(ids.filter(Boolean).map((id) => {
    const source = id.startsWith("pragmatics:")
      ? pragmaticScenarios.find((item) => `pragmatics:${item.id}` === id)?.lines?.[0]?.ko
      : nuanceSets.find((item) => `nuance:${item.id}` === id)?.examples?.[0]?.ko ??
        nuanceSets.find((item) => `nuance:${item.id}` === id)?.contrast?.[0];
    const anchor = source ?? "상황에 맞는 한국어 표현이에요.";
    return [id, {
      listened: true,
      retell: `${anchor} 이 표현의 뜻과 관계를 생각해서 자연스럽게 설명해요.`,
      transfer: `${anchor} 다른 상황에서도 상대에 맞게 표현을 바꾸어 말해요.`,
      updatedAt: "2026-06-09T00:00:00.000Z"
    }];
  }));
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
  assert.equal(legacyCompletedOnly.lessonScores["l01-hangul-map"], UNLOCK_SCORE);
  assert.equal(legacyCompletedOnly.lessonScores["l02-vowels"], UNLOCK_SCORE);

  const staleLowScore = normalizeLearningProgress({
    ...defaultProgress(),
    completedLessons: ["l01-hangul-map", "l02-vowels"],
    lessonScores: { "l01-hangul-map": UNLOCK_SCORE, "l02-vowels": UNLOCK_SCORE - 1 }
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
  assert.deepEqual(progress.abilityEvents["quiz:mixed:transfer"], { grammar: 3 });
});

test("passport counts entity-backed vocabulary, grammar, and native evidence once", () => {
  const grammarId = allGrammarIds[0];
  const nativeId = allNativeIds.find((id) => id.startsWith("pragmatics:"));
  const progress = normalizeLearningProgress({
    ...defaultProgress(),
    learnedVocab: [firstVocabId],
    learnedGrammar: [grammarId],
    learnedNative: [nativeId],
    nativeEvidence: nativeEvidenceForIds([nativeId]),
    abilityEvents: {
      [`vocab:${firstVocabId}`]: 1,
      [`grammar:${grammarId}`]: 2,
      [`nativeEvidence:${nativeId}`]: 3
    }
  });
  const workspace = buildLearningWorkspace(normalizeUserProfile({}), progress, 0, { outputs: [], srs: { cards: {}, history: [] } });
  const evidence = workspace.proficiency.evidence;
  const passportAbility = {
    script: evidence.scriptAbility,
    listening: evidence.listeningAbility,
    vocabulary: evidence.vocabularyAbility,
    grammar: evidence.grammarAbility,
    pragmatics: evidence.pragmaticsAbility,
    native: evidence.nativeAbility
  };
  const expectedGaps = Object.entries(passportAbility)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 2)
    .map(([id]) => id);

  assert.equal(evidence.vocabularyAbility, 1);
  assert.equal(evidence.grammarAbility, 3);
  assert.equal(evidence.pragmaticsAbility, 4);
  assert.deepEqual(workspace.abilityGaps, expectedGaps);
});

test("passport retains review and quiz events but ignores checkpoint self-reports", () => {
  const progress = normalizeLearningProgress(defaultProgress());
  recordAbilityEvent(progress, `review:vocab:${firstVocabId}:1`, ["vocabulary"], 1);
  recordAbilityEvent(progress, `quiz:mixed:0:gq:${allGrammarIds[0]}`, ["grammar"], 1);
  recordAbilityEvent(progress, "quiz:mixed:transfer", ["grammar", "native"], 2);
  recordAbilityEvent(progress, "checkpoint:native-expression", ["native"], 3);

  const evidence = buildProficiencySnapshot(progress, { outputs: [], srs: { cards: {}, history: [] } }).evidence;
  assert.equal(evidence.vocabularyAbility, 1);
  assert.equal(evidence.grammarAbility, 3);
  assert.equal(evidence.nativeAbility, 2);
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
  const oldProgress = progressWithStudy({ minutesGoal: 30 });
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
  assert.equal(progress.abilityEvents["checkpoint:native:steady:conversation:1:检查"], undefined);
  assert.equal(progress.ability.script, 0);
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
  assert.equal(profile.studyMode, "guided");
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
  assert.deepEqual(JSON.parse(store.get(nativePortfolioStorageKey)).entries, []);
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
  assert.deepEqual(JSON.parse(store.get(nativePortfolioStorageKey)), seeded.nativePortfolio);
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

test("resetLearningWorkspace rolls back all learning data when portfolio reset fails", () => {
  const seeded = seedResetState();

  blockedWriteKeys.add(nativePortfolioStorageKey);
  try {
    assert.equal(resetLearningWorkspace(), false);
  } finally {
    blockedWriteKeys.delete(nativePortfolioStorageKey);
  }

  assert.equal(JSON.parse(store.get(profileStorageKey)).studyMode, seeded.profile.studyMode);
  assert.deepEqual(JSON.parse(store.get(progressStorageKey)).completedLessons, seeded.progress.completedLessons);
  assert.deepEqual(getSrsState(), seeded.srsState);
  assert.deepEqual(JSON.parse(store.get(outputStorageKey)), seeded.outputState);
  assert.deepEqual(JSON.parse(store.get(lessonSessionStorageKey)), seeded.lessonSession);
  assert.deepEqual(JSON.parse(store.get(draftStorageKey)), getLearningDraftStateFromRaw(JSON.stringify(seeded.draftState)));
  const restoredPortfolio = JSON.parse(store.get(nativePortfolioStorageKey));
  assert.equal(restoredPortfolio.entries.length, 1);
  assert.equal(restoredPortfolio.entries[0].id, seeded.nativePortfolio.entries[0].id);
  assert.equal(restoredPortfolio.entries[0].title, seeded.nativePortfolio.entries[0].title);
  assert.equal(restoredPortfolio.entries[0].body, seeded.nativePortfolio.entries[0].body);
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

test("re-queued mature quiz mistakes restart on the learning ladder", () => {
  store.clear();
  const questionId = "vq:v-annyeonghaseyo";
  const cardId = mistakeCardId(questionId);
  saveSrsState({
    cards: {
      [cardId]: {
        id: cardId,
        box: 6,
        dueAt: Date.now() - 1,
        correct: 8,
        wrong: 1,
        lastSeenAt: Date.now() - 1000,
        ease: 2.5,
        intervalDays: 100,
        lapses: 2,
        payload: { kind: "mistake", itemId: questionId, prompt: "旧题面", answer: "old" }
      }
    },
    history: []
  });

  assert.equal(commitQuizSession("mixed:restart-mature", [{
    question: { id: questionId, prompt: "新题面", answer: "hello" },
    correct: false
  }], 0), true);

  const queued = getSrsState().cards[cardId];
  assert.equal(queued.box, 0);
  assert.equal(queued.intervalDays, undefined);
  assert.equal(queued.ease, undefined);
  assert.equal(queued.lapses, undefined);

  assert.equal(gradeReviewCardAndProgress(queued, true), true);
  const graded = getSrsState().cards[cardId];
  assert.equal(graded.box, 1);
  assert.equal(graded.intervalDays, BOX_INTERVALS[1] / (1000 * 60 * 60 * 24));
  assert.equal(graded.dueAt > Date.now(), true);
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

test("a stale review card snapshot cannot be graded twice", () => {
  store.clear();
  const now = Date.now();
  saveSrsState({
    cards: {
      "mistake:single-submit": {
        id: "mistake:single-submit",
        box: 0,
        dueAt: now - 1000,
        correct: 0,
        wrong: 1,
        lastSeenAt: null,
        payload: { kind: "mistake", itemId: "single-submit", prompt: "prompt", answer: "answer" }
      }
    },
    history: []
  });

  const submitted = getSrsState().cards["mistake:single-submit"];
  assert.equal(gradeReviewCardAndProgress(submitted, true), true);
  assert.equal(gradeReviewCardAndProgress(submitted, true), false);

  const state = getSrsState();
  assert.equal(state.cards[submitted.id].correct, 1);
  assert.equal(state.history.filter((entry) => entry.id === submitted.id).length, 1);
  assert.equal(JSON.parse(store.get(progressStorageKey)).practiceItems["single-submit"].correct, 1);
});

test("a stale review card snapshot cannot be graded after its payload changes", () => {
  store.clear();
  const now = Date.now();
  const id = "mistake:payload-change";
  saveSrsState({
    cards: {
      [id]: {
        id,
        box: 0,
        dueAt: now - 1000,
        correct: 0,
        wrong: 1,
        lastSeenAt: null,
        payload: {
          kind: "mistake",
          itemId: "payload-change",
          prompt: "old prompt",
          answer: "same answer",
          acceptable: ["same answer"],
          choices: ["same answer", "other answer"]
        }
      }
    },
    history: []
  });

  const submitted = getSrsState().cards[id];
  const before = getSrsState().cards[id];
  const updated = ensureCard(id, {
    kind: "mistake",
    itemId: "payload-change",
    prompt: "new prompt",
    answer: "new answer",
    acceptable: ["new acceptable answer"],
    choices: ["same answer", "new choice"]
  });
  assert.equal(updated?.payload.prompt, "new prompt");
  assert.equal(updated?.payload.answer, "new answer");
  assert.equal(updated?.payload.acceptable?.[0], "new acceptable answer");

  assert.equal(gradeReviewCardAndProgress(submitted, true), false);
  const after = getSrsState().cards[id];
  assert.equal(after.box, before.box);
  assert.equal(after.dueAt, before.dueAt);
  assert.equal(after.correct, before.correct);
  assert.equal(after.wrong, before.wrong);
  assert.equal(after.lastSeenAt, before.lastSeenAt);
  assert.deepEqual(getSrsState().history, []);
  assert.equal(after.payload.prompt, "new prompt");
  assert.equal(after.payload.answer, "new answer");
  assert.equal(after.payload.acceptable?.[0], "new acceptable answer");
  assert.equal(store.has(progressStorageKey), false);
});

test("early practice can grade a not-yet-due card when allowed", () => {
  store.clear();
  const now = Date.now();
  saveSrsState({
    cards: {
      "mistake:future-practice": {
        id: "mistake:future-practice",
        box: 1,
        dueAt: now + 60_000,
        correct: 1,
        wrong: 1,
        lastSeenAt: now - 1000,
        payload: { kind: "mistake", itemId: "future-practice", prompt: "prompt", answer: "answer" }
      }
    },
    history: []
  });

  const card = getSrsState().cards["mistake:future-practice"];
  assert.equal(gradeReviewCardAndProgress(card, true), false);
  assert.equal(getSrsState().cards[card.id].correct, 1);
  assert.equal(gradeReviewCardAndProgress(card, true, { allowEarly: true }), true);

  const after = getSrsState().cards[card.id];
  assert.equal(after.correct, 2);
  assert.equal(after.dueAt > now, true);
  const progress = JSON.parse(store.get(progressStorageKey));
  assert.equal(progress.practiceItems["future-practice"].correct, 1);
  assert.equal(progress.completedTasks?.["system:review"], undefined);
});

test("skipping a review audio card defers it without counting listening evidence", () => {
  store.clear();
  const now = Date.now();
  const id = "mistake:listen-skip";
  saveSrsState({
    cards: {
      [id]: {
        id,
        box: 2,
        dueAt: now - 1000,
        correct: 3,
        wrong: 1,
        lastSeenAt: now - 5000,
        ease: 2.2,
        intervalDays: 8 / 24,
        lapses: 0,
        payload: {
          kind: "mistake",
          itemId: "listen-skip",
          type: "listen",
          prompt: "听选",
          answer: "안녕",
          speak: "안녕"
        }
      }
    },
    history: []
  });

  const submitted = getSrsState().cards[id];
  assert.equal(getDueCardsFromState(getSrsState(), 30, now).some((card) => card.id === id), true);
  assert.equal(gradeReviewCardAndProgress(submitted, false, { skipped: true }), true);

  const after = getSrsState().cards[id];
  assert.equal(after.correct, 3);
  assert.equal(after.wrong, 1);
  assert.equal(after.box, 2);
  assert.equal(after.ease, 2.2);
  assert.equal(after.dueAt > now, true);
  assert.equal(getDueCardsFromState(getSrsState(), 30, now).some((card) => card.id === id), false);
  assert.deepEqual(getSrsState().history, []);
  assert.equal(store.has(progressStorageKey), false);
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
    draft: "저는 카페에서 아이스 아메리카노를 주문하고 카드로 계산하고 싶어요.",
    weakPoint: "포장 표현이 빠짐",
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
      draft: "저는 카페에서 아이스 아메리카노를 주문하고 카드로 계산하고 싶어요.",
      weakPoint: "포장 표현이 빠짐",
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
      draft: "저는 카페에서 아이스 아메리카노를 주문하고 카드로 계산하고 싶어요.",
      weakPoint: "포장 표현이 빠짐",
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

test("practice repair returns to an unfinished lesson when weak items concentrate there", () => {
  const lessonId = "l04-first-sentences";
  const itemId = lessonReviewCardId(lessonId, 0);
  const progress = normalizeLearningProgress({
    ...defaultProgress(),
    practiceItems: {
      [itemId]: {
        attempts: 3,
        correct: 0,
        wrong: 3,
        streak: 0,
        lastCorrect: false,
        lastSeenAt: "2026-07-06T02:00:00.000Z",
        lastSource: "lesson"
      }
    }
  });
  const workspace = buildLearningWorkspace(normalizeUserProfile({ studyMode: "guided" }), progress, 0);
  const repair = workspace.recommended.find((task) => task.id === "system:practice-repair");

  assert.equal(repair?.href, `/learn/${lessonId}`);
  assert.equal(repair?.kind, "lesson");
});

test("heavy due review drops the next lesson out of the recommended six", () => {
  const progress = normalizeLearningProgress({
    ...defaultProgress(),
    completedLessons: ["l01-hangul-map"],
    lessonScores: { "l01-hangul-map": 90 }
  });
  const workspace = buildLearningWorkspace(normalizeUserProfile({ studyMode: "guided" }), progress, 8);
  assert.equal(workspace.nextLesson?.id, "l02-vowels");
  assert.equal(workspace.recommended.some((task) => task.id === "system:review"), true);
  assert.equal(workspace.recommended.some((task) => String(task.href).startsWith("/learn/")), false);
});

test("mastered lesson with concentrated weak items becomes a retrain task", () => {
  const lessonId = "l01-hangul-map";
  const progress = normalizeLearningProgress({
    ...defaultProgress(),
    completedLessons: [lessonId],
    lessonScores: { [lessonId]: 90 },
    practiceItems: Object.fromEntries([0, 1, 2].map((index) => [lessonReviewCardId(lessonId, index), {
      attempts: 3,
      correct: 0,
      wrong: 3,
      streak: 0,
      lastCorrect: false,
      lastSeenAt: "2026-07-06T02:00:00.000Z",
      lastSource: "review"
    }]))
  });
  const workspace = buildLearningWorkspace(normalizeUserProfile({ studyMode: "guided" }), progress, 0);
  const retrain = workspace.recommended.find((task) => task.id === `system:retrain-${lessonId}`);
  assert.equal(Boolean(retrain), true);
  assert.equal(retrain?.href, `/learn/${lessonId}`);
  assert.equal(workspace.recommended[0]?.id, `system:retrain-${lessonId}`);
});

test("retrain stays in recommended when review and library gaps fill the top six", () => {
  const m4Start = lessons.find((lesson) => lesson.milestone === "m4");
  const prior = lessons.filter((lesson) => lesson.order < m4Start.order);
  const priorIds = prior.map((lesson) => lesson.id);
  const retrainLessonId = priorIds[0];
  const progress = normalizeLearningProgress({
    ...defaultProgress(),
    completedLessons: priorIds,
    lessonScores: Object.fromEntries(priorIds.map((id) => [id, 90])),
    practiceItems: Object.fromEntries([0, 1, 2].map((index) => [lessonReviewCardId(retrainLessonId, index), {
      attempts: 3,
      correct: 0,
      wrong: 3,
      streak: 0,
      lastCorrect: false,
      lastSeenAt: "2026-07-06T02:00:00.000Z",
      lastSource: "review"
    }]))
  });
  const workspace = buildLearningWorkspace(normalizeUserProfile({ studyMode: "guided" }), progress, 8);
  const retrainId = `system:retrain-${retrainLessonId}`;
  assert.equal(workspace.recommended.some((task) => task.id === "system:review"), true);
  assert.ok(workspace.recommended.filter((task) => String(task.id).startsWith("system:library-")).length >= 4);
  assert.equal(workspace.recommended.some((task) => task.id === retrainId), true);
  assert.equal(workspace.openStudy.some((task) => task.id === retrainId), true);
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
        draft: "저는 카페에서 아이스 아메리카노를 주문하고 카드로 계산하고 싶어요.",
        weakPoint: "포장 표현이 빠짐",
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
    draft: "저는 카페에서 따뜻한 음료를 주문하고 카드로 바로 계산하고 싶어요.",
    weakPoint: "naturalness",
    targetRewrite,
    rubric: [],
    createdAt: "2026-06-09T00:00:00.000Z"
  }];
  const validProgress = normalizeLearningProgress({
    ...defaultProgress(),
    ...masteredLessonStateForMaterial(materialId),
    completedMaterials: [materialId, "im-subway-directions"],
    materialEvidence: {
      [materialId]: {
        dictation: immersionMaterials.find((item) => item.id === materialId).dictation[0],
        retell: materialRetellEvidence(materialId),
        selfCheck: immersionMaterials.find((item) => item.id === materialId).selfCheck,
        outputEntryId: outputId,
        updatedAt: "2026-06-09T00:00:00.000Z"
      }
    },
    abilityEvents: {
      [`material:${materialId}`]: 3,
      [`output:${outputId}`]: 2
    }
  });
  const workspace = buildLearningWorkspace(normalizeUserProfile({ studyMode: "self" }), validProgress, 0, { outputs, srs: getSrsState() });
  const passport = buildProficiencySnapshot(validProgress, { outputs, srs: getSrsState() });

  assert.deepEqual(workspace.evidence.validMaterialIds, [materialId]);
  assert.equal(workspace.stats.completedMaterials, 1);
  assert.equal(passport.evidence.materials, 1);
  assert.equal(passport.evidence.listeningAbility, 2);
  assert.equal(passport.evidence.grammarAbility >= 2, true);
  assert.equal(passport.evidence.pragmaticsAbility >= 4, true);
  assert.equal(passport.evidence.nativeAbility >= 4, true);
});

test("stale material completions do not hide immersion recommendations or advance native self-study evidence", () => {
  store.clear();
  const readyProgress = normalizeLearningProgress({
    ...defaultProgress(),
    ...masteredLessonStateForMaterial("im-cafe-real-speed"),
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
  assert.equal(workspace.recommended.find((task) => task.id === "ability:native")?.completed ?? false, false);
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
    ...masteredLessonStateForMaterial("im-cafe-real-speed")
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
    ...masteredLessonStateForMaterial(materialId)
  });
  global.window.localStorage.setItem(outputStorageKey, JSON.stringify({
    entries: [
      {
        id: "output-a",
        materialId,
        materialTitle: "咖啡店真实语速点单",
        mission: "mission",
        draft: "저는 카페에서 아이스 아메리카노를 주문하고 카드로 계산하고 싶어요.",
        weakPoint: "포장 표현이 빠짐",
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

  const requiredLessonId = immersionMaterials.find((item) => item.id === materialId).requiredLessons[0];
  const staleProgress = normalizeLearningProgress({
    ...progress,
    completedLessons: progress.completedLessons.filter((lessonId) => lessonId !== requiredLessonId)
  });
  const staleWorkspace = buildLearningWorkspace(normalizeUserProfile({ studyMode: "self" }), staleProgress, 0, { outputs, srs });
  const stalePassport = buildProficiencySnapshot(staleProgress, { outputs, srs });
  assert.equal(staleWorkspace.stats.completedMaterials, 0);
  assert.equal(stalePassport.evidence.materials, 0);
});

test("material completion rejects forged Korean fragments as formal evidence", () => {
  store.clear();
  const materialId = "im-cafe-real-speed";
  const selfCheck = immersionMaterials.find((item) => item.id === materialId).selfCheck;
  const readyProgress = normalizeLearningProgress({
    ...defaultProgress(),
    ...masteredLessonStateForMaterial(materialId)
  });
  global.window.localStorage.setItem(outputStorageKey, JSON.stringify({
    entries: [
      {
        id: "output-a",
        materialId,
        materialTitle: "咖啡店真实语速点单",
        mission: "mission",
        draft: "저는 카페에서 아이스 아메리카노를 주문하고 카드로 계산하고 싶어요.",
        weakPoint: "포장 표현이 빠짐",
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
  const completedMaterial = immersionMaterials.find((item) => item.id === completedMaterialId);
  const output = {
    id: "output-a",
    materialId: completedMaterialId,
    materialTitle: completedMaterial.title,
    mission: completedMaterial.outputMission,
    draft: "저는 카페에서 아이스 아메리카노를 주문하고 카드로 계산하고 싶어요.",
    weakPoint: "포장 표현이 빠짐",
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
    ...masteredLessonStateForMaterial(completedMaterialId),
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
  const nextMaterial = immersionMaterials.find((material) => material.id !== completedMaterialId && materialPrerequisitesMet(material, progress));

  assert.equal(Boolean(nextMaterial), true);
  assert.equal(immersionTask?.href, immersionMaterialHref(nextMaterial.id));
  assert.equal(immersionTask?.completed, false);
  assert.equal(openImmersionTask?.href, immersionMaterialHref(nextMaterial.id));
  assert.equal(openImmersionTask?.completed, false);
});

test("locked material output drafts do not count as passport or SRS evidence", () => {
  store.clear();

  const entry = saveOutputArchiveEntry({
    materialId: "im-weekend-plan",
    materialTitle: "约周末计划和改期",
    mission: "mission",
    draft: "이번 토요일에는 이미 약속이 있어서 만나기 힘들 것 같아요. 다음 주에는 시간이 괜찮아요.",
    weakPoint: "缓冲表达不足",
    targetRewrite: "이번 토요일은 어려울 것 같지만 다음 주에는 같이 만날 수 있어요.",
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
        draft: "저는 카페에서 아이스 아메리카노를 주문하고 카드로 계산하고 싶어요.",
        weakPoint: "포장 표현이 빠짐",
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
  assert.equal(getNextLesson(new Set(["l01-hangul-map"]), { "l01-hangul-map": UNLOCK_SCORE - 1 }).id, "l01-hangul-map");
  assert.equal(getNextLesson(new Set(["l01-hangul-map"]), { "l01-hangul-map": UNLOCK_SCORE }).id, "l02-vowels");

  const progress = normalizeLearningProgress({
    ...defaultProgress(),
    completedLessons: ["l01-hangul-map"],
    lessonScores: { "l01-hangul-map": UNLOCK_SCORE }
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

  const mastered = applyLessonCompletion(normalizeLearningProgress(defaultProgress()), "l01-hangul-map", UNLOCK_SCORE);
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
  seedOnboardedProfile();

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

test("first lesson stays in preview until onboarding is saved", () => {
  store.clear();
  assert.equal(completeLessonProgress("l01-hangul-map", UNLOCK_SCORE), true);
  const progress = JSON.parse(store.get(progressStorageKey));
  assert.equal(progress.completedLessons.includes("l01-hangul-map"), false);
  assert.equal(progress.previewLessonScores["l01-hangul-map"], UNLOCK_SCORE);
  assert.equal(progress.lessonScores["l01-hangul-map"], undefined);
});

test("lesson session commits progress, review cards, and mistake cards together", () => {
  store.clear();
  seedOnboardedProfile();
  const firstLesson = lessons.find((lesson) => lesson.id === "l01-hangul-map");
  const firstQuestion = { ...firstLesson.drills[0], id: lessonReviewCardId("l01-hangul-map", 0) };
  const secondQuestion = { ...firstLesson.drills[1], id: lessonReviewCardId("l01-hangul-map", 1) };
  const answers = firstLesson.drills.map((question, index) => ({
    question: { ...question, id: lessonReviewCardId("l01-hangul-map", index) },
    answer: question.answer,
    correct: index !== 0
  }));

  assert.equal(commitLessonSession("l01-hangul-map", answers, 83), true);

  const progress = JSON.parse(store.get("kirina.progress.v2"));
  const srs = getSrsState();
  assert.equal(progress.lessonScores["l01-hangul-map"], 83);
  assert.equal(progress.completedLessons.includes("l01-hangul-map"), true);
  assert.equal(progress.lessonProductionEvidence["l01-hangul-map"], true);
  assert.equal(Object.values(srs.cards).filter((card) => card.payload.kind === "lesson" && card.payload.itemId.startsWith("lesson:l01-hangul-map:")).length, firstLesson.drills.length);
  assert.equal(srs.cards[mistakeCardId(firstQuestion.id)].payload.answer, firstQuestion.answer);
  assert.equal(srs.cards[mistakeCardId(firstQuestion.id)].wrong, 1);
  assert.equal(srs.cards[mistakeCardId(secondQuestion.id)], undefined);
  assert.equal(progress.practiceItems[firstQuestion.id].wrong, 1);
  assert.equal(progress.practiceItems[firstQuestion.id].lastSource, "lesson");
  assert.equal(progress.practiceItems[secondQuestion.id].correct, 1);
  assert.equal(progress.practiceItems[secondQuestion.id].streak, 1);
});

test("re-queued mature lesson mistakes restart on the learning ladder", () => {
  store.clear();
  seedOnboardedProfile();
  const lesson = lessons.find((item) => item.id === "l01-hangul-map");
  const question = { ...lesson.drills[0], id: lessonReviewCardId(lesson.id, 0) };
  const cardId = mistakeCardId(question.id);
  saveSrsState({
    cards: {
      [cardId]: {
        id: cardId,
        box: 6,
        dueAt: Date.now() - 1,
        correct: 7,
        wrong: 2,
        lastSeenAt: Date.now() - 1000,
        ease: 2.4,
        intervalDays: 90,
        lapses: 3,
        payload: { kind: "mistake", itemId: question.id, prompt: "旧题面", answer: "old" }
      }
    },
    history: []
  });

  assert.equal(commitLessonSession(lesson.id, [{ question, correct: false }], 67), true);

  const queued = getSrsState().cards[cardId];
  assert.equal(queued.box, 0);
  assert.equal(queued.intervalDays, undefined);
  assert.equal(queued.ease, undefined);
  assert.equal(queued.lapses, undefined);

  assert.equal(gradeReviewCardAndProgress(queued, true), true);
  const graded = getSrsState().cards[cardId];
  assert.equal(graded.box, 1);
  assert.equal(graded.intervalDays, BOX_INTERVALS[1] / (1000 * 60 * 60 * 24));
});

test("lesson session does not write progress when lesson SRS save fails", () => {
  store.clear();
  seedOnboardedProfile();
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
  seedOnboardedProfile();
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

test("native capstone requires a saved Korean output artifact before path completion", () => {
  store.clear();
  const capstone = lessons.find((lesson) => lesson.id === "l30-native-capstone");
  const priorLessons = allLessonIds.slice(0, -1);
  const priorProgress = normalizeLearningProgress(attachValidMaterials(withEnrolledLibrary({
    ...defaultProgress(),
    completedLessons: priorLessons,
    lessonScores: Object.fromEntries(priorLessons.map((id) => [id, 90]))
  })));

  assert.equal(commitLessonSession(capstone.id, [], UNLOCK_SCORE, priorProgress), false);
  assert.equal(store.has(progressStorageKey), false);

  const transcript = "제 생각에는 도시 생활과 시골 생활이 서로 다른 장점을 가지고 있어요. 도시에서는 교통이 편리하고 필요한 서비스를 쉽게 이용할 수 있기 때문에 시간을 아낄 수 있어요. 예를 들면 늦은 시간에도 병원이나 가게를 찾기 쉬워서 생활이 안정적이에요. 하지만 사람이 많고 소음이 커서 마음이 지칠 때도 있어요. 반면에 시골은 이동이 조금 어렵긴 하지만 자연 속에서 천천히 쉬고 이웃과 가까이 지낼 수 있어요. 그래서 저는 일할 때는 도시에 살고 주말에는 조용한 곳에서 쉬는 방법이 좋다고 생각해요. 결국 중요한 것은 한쪽만 선택하는 것이 아니라 자신의 상황에 맞게 균형을 만드는 일이에요.";
  const capstoneArtifact = {
    transcript,
    weakPoint: "对比之后的理由展开仍然太短",
    targetRewrite: "반면에 시골은 이동이 어렵긴 하지만 자연 속에서 충분히 쉴 수 있어요.",
    rubric: ["position", "reason", "contrast", "landing"]
  };
  assert.equal(saveCapstonePracticeEvidence({ ...capstoneArtifact, recordedSeconds: 119.9, recordingId: "capstone:test-recording" }, priorProgress), false);
  assert.equal(saveCapstonePracticeEvidence({ ...capstoneArtifact, recordedSeconds: 120, recordingId: "capstone:test-recording" }, priorProgress), true);
  assert.equal(saveCapstonePracticeEvidence({ ...capstoneArtifact, recordedSeconds: 121, recordingId: "capstone:replacement" }, priorProgress, "capstone:test-recording"), true);
  assert.equal(saveCapstonePracticeEvidence({ ...capstoneArtifact, recordedSeconds: 122, recordingId: "capstone:stale" }, priorProgress, "capstone:test-recording"), false);
  assert.equal(JSON.parse(store.get(progressStorageKey)).capstoneEvidence.recordingId, "capstone:replacement");
  assert.equal(commitLessonSession(capstone.id, [], UNLOCK_SCORE, priorProgress), true);

  const progress = JSON.parse(store.get(progressStorageKey));
  assert.equal(progress.completedLessons.includes(capstone.id), true);
  assert.equal(progress.capstoneEvidence.transcript.includes("제 생각에는"), true);
  assert.equal(Object.values(getSrsState().cards).filter((card) => card.payload.kind === "lesson" && card.payload.itemId.startsWith(`lesson:${capstone.id}:`)).length, capstone.drills.length);
});

test("declared paragraph lessons require saved valid output evidence", () => {
  store.clear();
  saveSrsState({ cards: {}, history: [] });
  const lesson = lessons.find((item) => item.id === "l09-connectors");
  const priorLessons = allLessonIds.slice(0, allLessonIds.indexOf(lesson.id));
  const priorProgress = normalizeLearningProgress(withEnrolledLibrary({
    ...defaultProgress(),
    completedLessons: priorLessons,
    lessonScores: Object.fromEntries(priorLessons.map((id) => [id, 90]))
  }));
  const answers = lesson.drills.map((question, index) => ({
    question: { ...question, id: question.id ?? lessonReviewCardId(lesson.id, index) },
    answer: question.answer,
    correct: true
  }));

  assert.equal(commitLessonSession(lesson.id, answers, 100, priorProgress), false);
  assert.equal(saveLessonTaskPracticeEvidence(lesson.id, {
    kind: "paragraph",
    text: "어제 비가 와서 집에 있었어요. 그래서 한국어 책을 오래 읽었어요. 근데 저녁에는 조금 심심했어요.",
    recordedSeconds: 0
  }, priorProgress), true);
  assert.equal(commitLessonSession(lesson.id, answers, 100, priorProgress), true);

  const progress = normalizeLearningProgress(JSON.parse(store.get(progressStorageKey)));
  assert.equal(progress.completedLessons.includes(lesson.id), true);
  assert.equal(progress.lessonTaskEvidence[lesson.id].kind, "paragraph");
  assert.equal(progress.lessonProductionEvidence[lesson.id], true);
});

test("export-time normalization revokes writing lessons without saved work", () => {
  const lessonId = "l09-connectors";
  const priorLessons = allLessonIds.slice(0, allLessonIds.indexOf(lessonId));
  const stripped = normalizeLearningProgress({
    ...defaultProgress(),
    completedLessons: [...priorLessons, lessonId],
    lessonScores: Object.fromEntries([...priorLessons, lessonId].map((id) => [id, 90])),
    masteredHangul: allHangulIds,
    learnedVocab: vocab.map((item) => item.id),
    learnedGrammar: allGrammarIds
  }, { enforceRecordingEvidence: true });
  assert.equal(stripped.completedLessons.includes(lessonId), false);

  const stale = normalizeLearningProgress({
    ...defaultProgress(),
    completedLessons: [...priorLessons, lessonId],
    lessonScores: Object.fromEntries([...priorLessons, lessonId].map((id) => [id, 90])),
    masteredHangul: allHangulIds,
    learnedVocab: vocab.map((item) => item.id),
    learnedGrammar: allGrammarIds,
    lessonTaskEvidence: {
      [lessonId]: { kind: "paragraph", text: "ok", recordedSeconds: 0, updatedAt: "2026-08-29T00:00:00.000Z" }
    }
  });
  assert.equal(stale.completedLessons.includes(lessonId), false);
});

test("shadowing evidence save rejects a stale recording baseline", () => {
  store.clear();
  const lessonId = "l22-media-shadowing";
  const first = { kind: "shadowing", text: "", recordedSeconds: 4, recordingId: "shadowing:base" };
  const replacement = { ...first, recordedSeconds: 4.5, recordingId: "shadowing:replacement" };
  const stale = { ...first, recordedSeconds: 5, recordingId: "shadowing:stale" };

  assert.equal(saveLessonTaskPracticeEvidence(lessonId, first, defaultProgress(), ""), true);
  assert.equal(saveLessonTaskPracticeEvidence(lessonId, replacement, defaultProgress(), "shadowing:base"), true);
  assert.equal(saveLessonTaskPracticeEvidence(lessonId, stale, defaultProgress(), "shadowing:base"), false);
  assert.equal(JSON.parse(store.get(progressStorageKey)).lessonTaskEvidence[lessonId].recordingId, "shadowing:replacement");
});

test("unknown lessons stay outside preview and core scores", () => {
  const unknown = applyLessonCompletion(normalizeLearningProgress(defaultProgress()), "missing-lesson", 100);

  assert.equal(unknown.knownLesson, false);
  assert.deepEqual(unknown.next.completedLessons, []);
  assert.deepEqual(unknown.next.lessonScores, {});
  assert.deepEqual(unknown.next.previewLessonScores, {});
});

test("audio fallback can advance a lesson without forging listening evidence", () => {
  store.clear();
  seedOnboardedProfile();
  saveSrsState({ cards: {}, history: [] });
  const lesson = lessons[0];
  const answers = lesson.drills.map((question, index) => {
    const normalizedQuestion = { ...question, id: question.id ?? lessonReviewCardId(lesson.id, index) };
    const auditory = normalizedQuestion.speak && ["listen", "dictation"].includes(normalizedQuestion.type);
    return auditory
      ? { question: normalizedQuestion, answer: "", correct: false, skipped: true }
      : { question: normalizedQuestion, answer: normalizedQuestion.answer, correct: true };
  });

  assert.equal(commitLessonSession(lesson.id, answers, 100, defaultProgress()), true);
  const fallbackProgress = normalizeLearningProgress(JSON.parse(store.get(progressStorageKey)));
  const fallbackSnapshot = buildProficiencySnapshot(fallbackProgress, { outputs: [], srs: getSrsState() });

  assert.equal(fallbackProgress.completedLessons.includes(lesson.id), false);
  assert.equal(fallbackProgress.lessonScores[lesson.id], 100);
  assert.equal(fallbackProgress.lessonListeningEvidence[lesson.id], undefined);
  assert.equal(fallbackSnapshot.evidence.listeningAbility, 0);
  assert.equal(fallbackSnapshot.evidence.scriptAbility, 0);
  assert.equal(Object.values(getSrsState().cards).some((card) => card.payload.kind === "mistake"), false);

  const audioAnswers = lesson.drills.map((question, index) => ({
    question: { ...question, id: question.id ?? lessonReviewCardId(lesson.id, index) },
    answer: question.answer,
    correct: true
  }));
  assert.equal(commitLessonSession(lesson.id, audioAnswers, 100, fallbackProgress), true);
  const upgradedProgress = normalizeLearningProgress(JSON.parse(store.get(progressStorageKey)));
  const upgradedSnapshot = buildProficiencySnapshot(upgradedProgress, { outputs: [], srs: getSrsState() });
  assert.equal(upgradedProgress.completedLessons.includes(lesson.id), true);
  assert.equal(upgradedProgress.lessonListeningEvidence[lesson.id], true);
  assert.equal(upgradedSnapshot.evidence.listeningAbility > 0, true);
  assert.equal(upgradedSnapshot.evidence.scriptAbility > 0, true);
});

test("legacy completed lessons retain listening evidence while explicit fallback records stay false", () => {
  const legacyBase = { ...defaultProgress() };
  delete legacyBase.lessonListeningEvidence;
  const legacy = normalizeLearningProgress({
    ...legacyBase,
    completedLessons: [lessons[0].id],
    lessonScores: { [lessons[0].id]: 90 }
  });
  const explicitFallback = normalizeLearningProgress({
    ...defaultProgress(),
    completedLessons: [lessons[0].id],
    lessonScores: { [lessons[0].id]: 90 },
    lessonListeningEvidence: { [lessons[0].id]: false }
  });

  assert.equal(legacy.lessonListeningEvidence[lessons[0].id], true);
  assert.equal(explicitFallback.lessonListeningEvidence[lessons[0].id], false);
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
  assert.equal(blockedBridge.steps.find((step) => step.id === "transfer").title, "等待材料前置课");
  assert.equal(blockedBridge.transferMaterials.some((material) => material.id === "im-cafe-real-speed"), true);
  assert.equal(blockedBridge.transferMaterials.find((material) => material.id === "im-cafe-real-speed").available, false);
  assert.equal(blockedBridge.steps.find((step) => step.id === "transfer").href, `/learn/${cafeLesson.id}`);
  assert.equal(blockedBridge.reviewCards, cafeLesson.drills.length);
  assert.deepEqual(lessonReviewCardIds(cafeLesson), cafeLesson.drills.map((drill, index) => drill.id ?? `lesson:${cafeLesson.id}:${index + 1}`));

  const masteredBridge = buildLessonBridge(cafeLesson, normalizeLearningProgress({
    ...defaultProgress(),
    ...masteredLessonStateThrough([cafeLesson.id])
  }));

  assert.equal(masteredBridge.unlocked, true);
  assert.equal(masteredBridge.mastered, true);
  assert.equal(masteredBridge.steps.find((step) => step.id === "lesson").done, true);
  assert.equal(masteredBridge.steps.find((step) => step.id === "review").done, true);
  assert.equal(masteredBridge.transferMaterials.find((material) => material.id === "im-cafe-real-speed").available, false);
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
  const readyProgress = masteredLessonStateThrough(["l11-shopping-price"]);
  const staleBridge = buildLessonBridge(cafeLesson, normalizeLearningProgress({
    ...defaultProgress(),
    ...readyProgress,
    completedMaterials: ["im-cafe-real-speed"]
  }), { validMaterialIds: [] });
  const validBridge = buildLessonBridge(cafeLesson, normalizeLearningProgress({ ...defaultProgress(), ...readyProgress }), { validMaterialIds: ["im-cafe-real-speed"] });
  const allValidBridge = buildLessonBridge(cafeLesson, normalizeLearningProgress({ ...defaultProgress(), ...readyProgress }), { validMaterialIds: ["im-cafe-real-speed", "im-convenience-payment"] });

  assert.equal(staleBridge.transferMaterials.find((material) => material.id === "im-cafe-real-speed").completed, false);
  assert.equal(staleBridge.transferMaterials.find((material) => material.id === "im-cafe-real-speed").available, true);
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

test("self-study duration follows real weekly investment instead of a fixed promise", () => {
  const base = {
    selfStudyGoal: "native",
    selfStudyIntensity: "steady",
    selfStudyFocus: "conversation"
  };
  const fiveMinutePlan = buildSelfStudyPlan({ ...base, minutesGoal: 5 });
  const sixtyMinutePlan = buildSelfStudyPlan({ ...base, minutesGoal: 60 });

  assert.equal(fiveMinutePlan.durationWeeks > sixtyMinutePlan.durationWeeks, true);
  assert.equal(sixtyMinutePlan.durationWeeks > 36, true);
  assert.equal(fiveMinutePlan.goal.targetHours, 2000);
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

test("self-study recommendations omit review tasks when there is no review debt", () => {
  const profile = normalizeUserProfile({
    studyMode: "self",
    selfStudyGoal: "native",
    selfStudyIntensity: "steady",
    selfStudyFocus: "conversation",
    minutesGoal: 30
  });
  const workspace = buildLearningWorkspace(profile, normalizeLearningProgress(defaultProgress()), 0);
  const ids = workspace.recommended.map((task) => task.id);

  assert.equal(ids.includes("open:review-rhythm"), false);
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

test("mastery gate writes are idempotent and preserve their SRS cards", () => {
  store.clear();
  const hangulId = firstHangulId;
  const pronunciationId = pronunciationPairs[0].id;
  const soundChangeId = soundChangeRules[0].id;
  const vocabId = firstVocabId;
  const grammarId = allGrammarIds[0];

  const operations = [
    () => ensureHangulItemMastered(hangulId, defaultProgress()),
    () => ensurePronunciationPairMastered(pronunciationId, defaultProgress()),
    () => ensureSoundChangeRuleMastered(soundChangeId, defaultProgress()),
    () => ensureVocabItemMastered(vocabId, defaultProgress()),
    () => ensureGrammarPointMastered(grammarId, defaultProgress())
  ];
  for (const operation of operations) {
    assert.equal(operation(), true);
    assert.equal(operation(), true);
  }

  const progress = JSON.parse(store.get(progressStorageKey));
  const cards = getSrsState().cards;
  assert.equal(progress.masteredHangul.includes(hangulId), true);
  assert.equal(progress.learnedVocab.includes(vocabId), true);
  assert.equal(progress.learnedGrammar.includes(grammarId), true);
  assert.equal(Boolean(cards[`hangul:${hangulId}`]), true);
  assert.equal(Boolean(cards[pronunciationCardId(pronunciationId)]), true);
  assert.equal(Boolean(cards[soundChangeCardId(soundChangeId)]), true);
  assert.equal(Boolean(cards[vocabCardId(vocabId)]), true);
  assert.equal(Boolean(cards[`grammar:${grammarId}`]), true);
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

test("removing mastered items clears their mastery-gate mistake cards", () => {
  store.clear();
  const cases = [
    { kind: "hangul", itemId: firstHangulId, toggle: toggleHangulItem },
    { kind: "pronunciation", itemId: pronunciationPairs[0].id, toggle: togglePronunciationPair },
    { kind: "soundChange", itemId: soundChangeRules[0].id, toggle: toggleSoundChangeRule },
    { kind: "vocab", itemId: firstVocabId, toggle: toggleVocabItem },
    { kind: "grammar", itemId: allGrammarIds[0], toggle: toggleGrammarPoint }
  ];

  for (const item of cases) {
    assert.equal(item.toggle(item.itemId, defaultProgress()), true);
    const gateMistakeIds = buildGateQuestions(item.kind, item.itemId).map((question) => mistakeCardId(question.id));
    assert.ok(gateMistakeIds.length > 0);
    for (const id of gateMistakeIds) {
      ensureCard(id, { kind: "mistake", itemId: id.slice("mistake:".length), prompt: "Gate mistake", answer: "a" });
    }

    assert.equal(item.toggle(item.itemId, JSON.parse(store.get(progressStorageKey))), true);
    for (const id of gateMistakeIds) assert.equal(getSrsState().cards[id], undefined);
  }
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

  assert.equal(toggleNativeItem(pragmaticsId, progress), false);
  assert.equal(toggleNativeItem(nuanceId, progress), false);
  assert.equal(JSON.parse(store.get(progressStorageKey)).learnedNative?.includes(pragmaticsId) ?? false, false);
  assert.equal(JSON.parse(store.get(progressStorageKey)).learnedNative?.includes(nuanceId) ?? false, false);
});

test("native SRS enrollment requires listen-retell-transfer evidence", () => {
  store.clear();
  const pragmaticsId = allNativeIds.find((id) => id.startsWith("pragmatics:"));
  const nuanceId = allNativeIds.find((id) => id.startsWith("nuance:"));

  assert.equal(toggleNativeItem(pragmaticsId, defaultProgress()), false);
  assert.equal(toggleNativeItem(nuanceId, defaultProgress()), false);
  assert.equal(getSrsState().cards[nativeCardId(pragmaticsId)], undefined);
  assert.equal(getSrsState().cards[nativeCardId(nuanceId)], undefined);

  assert.equal(saveNativePracticeEvidence(pragmaticsId, {
    listened: true,
    retell: "안녕하세요. 이 인사로 처음 만난 사람에게 자신을 소개해요.",
    transfer: "안녕하세요. 선생님께는 한국어를 공부하고 있다고 정중하게 말해요."
  }, defaultProgress()), true);
  let progress = JSON.parse(store.get(progressStorageKey));
  assert.equal(progress.learnedNative.includes(pragmaticsId), true);
  assert.equal(Boolean(getSrsState().cards[nativeCardId(pragmaticsId)]), true);

  assert.equal(toggleNativeItem(pragmaticsId, progress), true);
  progress = JSON.parse(store.get(progressStorageKey));
  assert.equal(progress.learnedNative.includes(pragmaticsId), false);
  assert.equal(getSrsState().cards[nativeCardId(pragmaticsId)], undefined);
  assert.equal(countNativePracticeEvidence(progress, "pragmatics"), 1);
});

test("native evidence completion adds SRS and marks bridge ability tasks", () => {
  store.clear();
  const pragmaticsId = allNativeIds.find((id) => id.startsWith("pragmatics:"));
  const nuanceId = allNativeIds.find((id) => id.startsWith("nuance:"));

  assert.equal(saveNativePracticeEvidence(pragmaticsId, {
    listened: true,
    retell: "안녕하세요. 이 인사로 처음 만난 사람에게 자신을 소개해요.",
    transfer: "안녕하세요. 선생님께는 한국어를 공부하고 있다고 정중하게 말해요."
  }, defaultProgress()), true);
  let progress = JSON.parse(store.get(progressStorageKey));
  assert.equal(progress.learnedNative.includes(pragmaticsId), true);
  assert.equal(progress.completedTasks["ability:pragmatics"], progress.lastStudyDate);
  assert.equal(countNativePracticeEvidence(progress, "pragmatics"), 1);
  assert.equal(Boolean(getSrsState().cards[nativeCardId(pragmaticsId)]), true);

  assert.equal(saveNativePracticeEvidence(nuanceId, {
    listened: true,
    retell: "감사합니다 이 표현은 공식적인 자리에서 쓰고 고마워요는 일상에서 자연스러워요.",
    transfer: "친구에게는 고마워라고 말하고 회사에서는 감사합니다 표현을 사용해요."
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
  assert.equal(validateCheckpointEvidence("复述已经完成"), false);
  assert.equal(validateCheckpointEvidence("录音 75 秒，能说 안녕하세요。"), true);
  assert.equal(validateCheckpointEvidence("正确率 80%"), true);
  assert.equal(validateCheckpointEvidence("正确率 80%", progressWithStudy()), false);
  assert.equal(validateCheckpointEvidence("录音 75 秒，能说 안녕하세요。", progressWithStudy()), true);
  assert.equal(validateCheckpointEvidence("录音 75 秒，能说 안녕하세요。", normalizeLearningProgress(defaultProgress())), false);
});

test("checkpoint completion closes the self-study planning task", () => {
  const checkpointId = "foundation:steady:balanced:1:week-check";
  const result = applyCheckpointCompletion(
    progressWithStudy(),
    checkpointId,
    "录音 75 秒，能说 안녕하세요。",
    ["script", "listening"]
  );

  assert.equal(result.completed, true);
  assert.equal(result.next.completedCheckpoints.includes(checkpointId), true);
  assert.equal(result.next.completedTasks["open:self-plan"], result.next.lastStudyDate);
  assert.equal(result.next.completedTasks[`checkpoint:${checkpointId}`], result.next.lastStudyDate);
});

test("the same reflection cannot be reused to mint another checkpoint credit", () => {
  const first = applyCheckpointCompletion(
    progressWithStudy(),
    "foundation:steady:balanced:1:first",
    "录音 75 秒，能说 안녕하세요。",
    ["script"]
  );
  const duplicate = applyCheckpointCompletion(
    first.next,
    "foundation:steady:balanced:2:second",
    "录音 75 秒， 能说 안녕하세요。",
    ["listening"]
  );

  assert.equal(first.completed, true);
  assert.equal(duplicate.completed, false);
  assert.equal(countCheckpointCredits(duplicate.next), 1);
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

test("checkpoint completion restores reflection evidence without granting ability", () => {
  const checkpointId = "foundation:steady:balanced:1:week-check";
  const staleProgress = normalizeLearningProgress({
    ...defaultProgress(),
    completedCheckpoints: [checkpointId]
  });

  assert.equal(findCompletedCheckpointCredit(staleProgress, checkpointId), null);
  const result = applyCheckpointCompletion(progressWithStudy({
    completedCheckpoints: [checkpointId]
  }), checkpointId, "录音 75 秒，能说 안녕하세요。", ["script"]);

  assert.equal(result.completed, true);
  assert.equal(findCompletedCheckpointCredit(result.next, checkpointId), checkpointId);
  assert.equal(result.next.ability.script, 0);
  assert.equal(result.next.abilityEvents[`checkpoint:${checkpointId}`], undefined);
});

test("self-study checkpoint reflections stay scoped without inflating abilities", () => {
  const firstId = "foundation:steady:balanced:1:第 2 周检查";
  const secondId = "native:deep:conversation:1:第 2 周检查";
  const distinctId = "native:deep:conversation:2:中期检查";
  assert.notEqual(checkpointCreditKey(firstId), checkpointCreditKey(secondId));
  assert.notEqual(checkpointCreditKey(firstId), checkpointCreditKey(distinctId));

  const first = applyCheckpointCompletion(
    progressWithStudy(),
    firstId,
    "录音 75 秒，能说 안녕하세요。",
    ["script", "listening"]
  );
  const second = applyCheckpointCompletion(
    first.next,
    secondId,
    "录音 90 秒，能说 감사합니다。",
    ["script", "listening"]
  );
  const third = applyCheckpointCompletion(
    second.next,
    distinctId,
    "출력 6개 문장, 正确率 80%",
    ["native"]
  );
  const duplicateSnapshot = buildProficiencySnapshot(normalizeLearningProgress(second.next), 0);
  const distinctSnapshot = buildProficiencySnapshot(normalizeLearningProgress(third.next), 0);

  assert.equal(second.completed, true);
  assert.equal(second.next.completedCheckpoints.includes(secondId), true);
  assert.equal(countCheckpointCredits(second.next), 2);
  assert.equal(duplicateSnapshot.evidence.checkpoints, 2);
  assert.equal(second.next.ability.script, 0);
  assert.equal(second.next.ability.listening, 0);
  assert.equal(second.next.abilityEvents[`checkpoint:${secondId}`], undefined);
  assert.equal(findCompletedCheckpointCredit(second.next, secondId), secondId);
  assert.equal(findCompletedCheckpointCredit(second.next, "travel:light:reading:1:第 2 周检查"), null);
  assert.equal(countCheckpointCredits(third.next), 3);
  assert.equal(distinctSnapshot.evidence.checkpoints, 3);
  assert.equal(third.next.ability.native, 0);
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
  const lessonRequirement = empty.next.requirements.find((item) => item.metric === "lessons");
  assert.equal(empty.nextRequirements.some((item) => item.metric === "lessons" && item.current === 0 && item.target === lessonRequirement.target), true);

  const scriptReady = buildProficiencySnapshot(normalizeLearningProgress({
    ...defaultProgress(),
    completedLessons: allLessonIds,
    lessonScores: Object.fromEntries(allLessonIds.map((id) => [id, 90])),
    lessonListeningEvidence: allLessonListeningEvidence,
    masteredHangul: allHangulIds
  }), 0);
  assert.equal(scriptReady.current.id, "script-foundation");
  assert.equal(scriptReady.next.id, "survival-polite");

  global.window.localStorage.setItem(outputStorageKey, JSON.stringify({
    entries: Array.from({ length: 22 }, (_, index) => ({
      id: `native-output-${index + 1}`,
      materialId: allMaterialIds[index],
      materialTitle: `材料 ${index + 1}`,
      mission: "mission",
      draft: "제 생각에는 충분히 쉬면서 일하는 습관이 중요해요. 그래서 매일 계획을 확인하고 필요한 부분을 다시 정리해요.",
      weakPoint: "缓冲表达不足",
      targetRewrite: "제 생각에는 어느 정도 균형이 중요한 것 같아요.",
      rubric: ["naturalness"],
      createdAt: "2026-06-09T00:00:00.000Z"
    }))
  }));
  const nativeOutputEntries = JSON.parse(store.get(outputStorageKey)).entries;
  const materialEvidenceIds = allMaterialIds.slice(0, 22);
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
      retell: materialRetellEvidence(materialId),
      selfCheck: immersionMaterials.find((item) => item.id === materialId).selfCheck,
      outputEntryId: `native-output-${index + 1}`,
      updatedAt: "2026-06-09T00:00:00.000Z"
    }
  ]));
  const nativeLayer = buildProficiencySnapshot(normalizeLearningProgress({
    ...defaultProgress(),
    completedLessons: allLessonIds,
    lessonScores: Object.fromEntries(allLessonIds.map((id) => [id, 90])),
    lessonListeningEvidence: allLessonListeningEvidence,
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
  assert.equal(nativeLayer.evidence.outputs, 22);
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
    collocations: lastInApp.deliverables.collocations,
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

test("SRS membership is not passport evidence without pronunciation or sound-change events", () => {
  const progress = normalizeLearningProgress({ ...defaultProgress(), masteredHangul: ["v-a", "v-ya", "v-eo"] });
  const noListening = buildLearningWorkspace(normalizeUserProfile({}), progress, 0, { outputs: [], srs: { cards: {}, history: [] } });
  assert.equal(noListening.proficiency.evidence.scriptAbility >= 3, true);
  assert.equal(noListening.proficiency.evidence.listeningAbility, 0);

  const srsWithListening = {
    cards: {
      "pronunciation:eo-o": { id: "pronunciation:eo-o", box: 0, dueAt: 0, correct: 0, wrong: 0, lastSeenAt: null, payload: { kind: "pronunciation", itemId: "eo-o" } },
      "soundChange:sc-liaison": { id: "soundChange:sc-liaison", box: 0, dueAt: 0, correct: 0, wrong: 0, lastSeenAt: null, payload: { kind: "soundChange", itemId: "sc-liaison" } }
    },
    history: []
  };
  const membershipOnly = buildLearningWorkspace(normalizeUserProfile({}), progress, 0, { outputs: [], srs: srsWithListening });
  assert.equal(membershipOnly.proficiency.evidence.listeningAbility, 0);

  const practiced = normalizeLearningProgress({
    ...progress,
    abilityEvents: { "pronunciation:eo-o": 2, "soundChange:sc-liaison": 2 }
  });
  const withPracticeEvidence = buildLearningWorkspace(normalizeUserProfile({}), practiced, 0, { outputs: [], srs: srsWithListening });
  assert.equal(withPracticeEvidence.proficiency.evidence.listeningAbility, 4);
});

test("sound change cards survive normalization and map to listening", () => {
  const srsState = {
    cards: {
      "soundChange:sc-liaison": { id: "soundChange:sc-liaison", box: 1, dueAt: 0, correct: 1, wrong: 0, lastSeenAt: null, payload: { kind: "soundChange", itemId: "sc-liaison" } },
      "soundChange:sc-unknown": { id: "soundChange:sc-unknown", box: 1, dueAt: 0, correct: 0, wrong: 0, lastSeenAt: null, payload: { kind: "soundChange", itemId: "sc-unknown" } }
    },
    history: []
  };
  assert.deepEqual(mapCardToAbilities(srsState.cards["soundChange:sc-liaison"]), ["listening"]);
});

test("removing vocabulary clears dictation and cloze mistakes and restores history on progress failure", () => {
  store.clear();
  const itemId = firstVocabId;
  assert.equal(toggleVocabItem(itemId, defaultProgress()), true);
  let progress = JSON.parse(store.get(progressStorageKey));
  const derivedIds = [
    mistakeCardId(vocabQuestionId(itemId)),
    mistakeCardId(vocabDictationQuestionId(itemId)),
    mistakeCardId(vocabClozeQuestionId(itemId))
  ];
  for (const [index, id] of derivedIds.entries()) {
    ensureCard(id, { kind: "mistake", itemId: id.slice("mistake:".length), prompt: `p${index}`, answer: `a${index}` });
    gradeCard(id, false);
  }
  const historyBefore = getSrsState().history;

  blockedWriteKeys.add(progressStorageKey);
  try {
    assert.equal(toggleVocabItem(itemId, progress), false);
  } finally {
    blockedWriteKeys.delete(progressStorageKey);
  }
  assert.ok(getSrsState().cards[vocabCardId(itemId)]);
  for (const id of derivedIds) assert.ok(getSrsState().cards[id]);
  assert.deepEqual(getSrsState().history, historyBefore);

  progress = JSON.parse(store.get(progressStorageKey));
  assert.equal(toggleVocabItem(itemId, progress), true);
  for (const id of derivedIds) assert.equal(getSrsState().cards[id], undefined);
});

test("remaining sound-change evidence keeps the listening task completed", () => {
  store.clear();
  let progress = normalizeLearningProgress(defaultProgress());
  assert.equal(toggleSoundChangeRule("sc-liaison", progress), true);
  progress = JSON.parse(store.get(progressStorageKey));
  assert.equal(toggleSoundChangeRule("sc-nasalization", progress), true);
  progress = JSON.parse(store.get(progressStorageKey));
  assert.equal(toggleSoundChangeRule("sc-liaison", progress), true);
  progress = JSON.parse(store.get(progressStorageKey));

  assert.equal(progress.completedTasks["ability:listening"], progress.lastStudyDate);
  assert.ok(getSrsState().cards["soundChange:sc-nasalization"]);
});

test("missing recording entities revoke persisted evidence, dependent lessons, ability credit, and lesson review cards", () => {
  store.clear();
  const targetId = "l22-media-shadowing";
  const targetIndex = allLessonIds.indexOf(targetId);
  const completedLessons = allLessonIds.slice(0, targetIndex + 3);
  const lessonScores = Object.fromEntries(completedLessons.map((id) => [id, 90]));
  const recordingId = "shadowing:missing-entity";
  const progress = normalizeLearningProgress({
    ...defaultProgress(),
    completedLessons,
    lessonScores,
    lessonTaskEvidence: {
      [targetId]: { kind: "shadowing", text: "", recordedSeconds: 4.2, recordingId, updatedAt: "2026-07-15T00:00:00.000Z" }
    },
    ability: { ...defaultProgress().ability, listening: 9 },
    abilityEvents: { [`lesson:${targetId}`]: { listening: 9 } },
    completedTasks: Object.fromEntries(completedLessons.map((id) => [`lesson:${id}`, "2026-07-15"]))
  });
  store.set(progressStorageKey, JSON.stringify(progress));
  const targetCard = lessonReviewCardId(targetId, 0);
  const dependentCard = lessonReviewCardId(allLessonIds[targetIndex + 1], 0);
  ensureCard(targetCard, { kind: "lesson", itemId: targetCard, prompt: "p", answer: "a" });
  ensureCard(dependentCard, { kind: "lesson", itemId: dependentCard, prompt: "p", answer: "a" });

  assert.equal(invalidateLessonTaskRecordingEvidence(targetId, "shadowing:stale-race", progress), false);
  assert.equal(invalidateLessonTaskRecordingEvidence(targetId, recordingId, progress), true);
  const saved = JSON.parse(store.get(progressStorageKey));
  assert.equal(saved.completedLessons.includes(targetId), false);
  assert.equal(saved.completedLessons.includes(allLessonIds[targetIndex + 1]), false);
  assert.equal(saved.lessonScores[targetId], undefined);
  assert.equal(saved.previewLessonScores[targetId], 90);
  assert.equal(saved.lessonTaskEvidence[targetId], undefined);
  assert.equal(saved.abilityEvents[`lesson:${targetId}`], undefined);
  assert.equal(saved.ability.listening, 0);
  assert.equal(getSrsState().cards[targetCard], undefined);
  assert.equal(getSrsState().cards[dependentCard], undefined);
});

test("capstone recording invalidation is guarded by the expected recording id", () => {
  store.clear();
  const capstoneId = "l30-native-capstone";
  const completedLessons = [...allLessonIds];
  const recordingId = "capstone:missing-entity";
  const progress = normalizeLearningProgress({
    ...defaultProgress(),
    completedLessons,
    lessonScores: Object.fromEntries(completedLessons.map((id) => [id, 90])),
    capstoneEvidence: {
      transcript: "제 생각에는 도시 생활과 시골 생활이 서로 다른 장점을 가지고 있어요. 도시에서는 교통이 편리하고 필요한 서비스를 쉽게 이용할 수 있기 때문에 시간을 아낄 수 있어요. 예를 들면 늦은 시간에도 병원이나 가게를 찾기 쉬워서 생활이 안정적이에요. 하지만 사람이 많고 소음이 커서 마음이 지칠 때도 있어요. 반면에 시골은 이동이 조금 어렵긴 하지만 자연 속에서 천천히 쉬고 이웃과 가까이 지낼 수 있어요. 그래서 저는 일할 때는 도시에 살고 주말에는 조용한 곳에서 쉬는 방법이 좋다고 생각해요. 결국 중요한 것은 한쪽만 선택하는 것이 아니라 자신의 상황에 맞게 균형을 만드는 일이에요.",
      weakPoint: "이유 전개가 짧아요",
      targetRewrite: "반면에 다른 관점도 함께 살펴볼 필요가 있다고 생각해요.",
      rubric: ["position", "reason", "contrast", "landing"],
      recordedSeconds: 120,
      recordingId,
      updatedAt: "2026-07-15T00:00:00.000Z"
    }
  });
  store.set(progressStorageKey, JSON.stringify(progress));

  assert.equal(invalidateCapstoneRecordingEvidence("capstone:newer", progress), false);
  assert.equal(invalidateCapstoneRecordingEvidence(recordingId, progress), true);
  const saved = JSON.parse(store.get(progressStorageKey));
  assert.equal(saved.capstoneEvidence, null);
  assert.equal(saved.completedLessons.includes(capstoneId), false);
});
