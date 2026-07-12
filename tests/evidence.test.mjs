import test from "node:test";
import assert from "node:assert/strict";
import {
  FOCUS_TO_ABILITIES,
  hasKoreanDictationEvidence,
  hasKoreanOutputRewrite,
  hasKoreanRetellEvidence,
  hasKoreanText,
  mapFocusToAbilities,
  requiresKoreanOutput,
  unknownFocusTags
} from "../src/lib/learning/evidence.ts";
import {
  foundationSpine,
  hrefForStudyModule,
  moduleToAbility,
  studyModuleDescriptors,
  studyModuleIds,
  studyModuleReadinessRequirement,
  uniqueModuleAbilities
} from "../src/lib/learning/modules.js";

test("hasKoreanText accepts Hangul and rejects non-Korean text", () => {
  assert.equal(hasKoreanText("안녕하세요."), true);
  assert.equal(hasKoreanText("ㄱ + ㅏ"), true);
  assert.equal(hasKoreanText("  카드로 계산할게요!  "), true);
  assert.equal(hasKoreanText("中文 English 123"), false);
  assert.equal(hasKoreanText(""), false);
  assert.equal(hasKoreanText(null), false);
});

test("formal Korean evidence requires sentence-like Hangul, not one forged character", () => {
  assert.equal(hasKoreanDictationEvidence("가a", ["뭐 드릴까요?"]), false);
  assert.equal(hasKoreanDictationEvidence("포장해 주세요.", ["포장해 주세요."]), true);
  assert.equal(hasKoreanDictationEvidence("계산할게요.", ["카드로 계산할게요."]), true);
  assert.equal(hasKoreanRetellEvidence("가abc"), false);
  assert.equal(hasKoreanRetellEvidence("손님은 커피를 주문해요."), true);
  assert.equal(hasKoreanOutputRewrite("가"), false);
  assert.equal(hasKoreanOutputRewrite("아이스 아메리카노 주세요."), true);
});

test("requiresKoreanOutput accepts explicit Korean-output instructions", () => {
  assert.equal(requiresKoreanOutput("用韩语写一句目标改写。"), true);
  assert.equal(requiresKoreanOutput("한국어로 다시 말해 보세요."), true);
  assert.equal(requiresKoreanOutput("Write a reflection."), false);
});

test("focus tags map to stable ability ids", () => {
  assert.deepEqual(mapFocusToAbilities(["script", "sound"]), ["script", "listening"]);
  assert.deepEqual(mapFocusToAbilities(["vocab", "travel", "media"]), ["vocabulary"]);
  assert.deepEqual(mapFocusToAbilities(["grammar", "sentence", "discourse"]), ["grammar"]);
  assert.deepEqual(mapFocusToAbilities(["pragmatics", "native", "speaking"]), ["pragmatics", "native"]);
  assert.deepEqual(unknownFocusTags(Object.keys(FOCUS_TO_ABILITIES)), []);
  assert.deepEqual(unknownFocusTags(["grammar", "ghost"]), ["ghost"]);
});

test("study modules expose one shared ability and route contract", () => {
  assert.deepEqual(foundationSpine, ["script", "listening"]);
  assert.equal(studyModuleIds.length >= 6, true);
  for (const moduleId of studyModuleIds) {
    assert.equal(Boolean(studyModuleDescriptors[moduleId].title), true);
    assert.equal(hrefForStudyModule(moduleId).startsWith("/"), true);
    assert.equal(Boolean(moduleToAbility(moduleId)), true);
    assert.equal(studyModuleReadinessRequirement(moduleId) > 0, true);
  }
  assert.deepEqual(uniqueModuleAbilities(["script", "listening", "media", "native"]), ["script", "listening", "native"]);
  assert.equal(moduleToAbility("missing"), null);
  assert.equal(hrefForStudyModule("missing"), "/");
});
