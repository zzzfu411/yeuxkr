import test from "node:test";
import assert from "node:assert/strict";
import {
  FOCUS_TO_ABILITIES,
  hasKoreanDictationEvidence,
  hasKoreanOutputDraft,
  hasKoreanOutputRewrite,
  hasKoreanRetellEvidence,
  hasKoreanText,
  hasMaterialOutputEvidence,
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
  assert.equal(hasKoreanRetellEvidence("사과 바나나 학교에서 공부해요.", ["손님은 카페에서 커피를 주문하고 카드로 계산해요."]), false);
  assert.equal(hasKoreanRetellEvidence("손님은 카페에서 음료를 주문한 뒤 계산했어요.", ["손님은 커피를 주문하고 카드로 계산했어요."]), true);
  assert.equal(hasKoreanRetellEvidence("안녕하세요안녕하세요"), false);
  assert.equal(hasKoreanRetellEvidence("어서 오세요. 뭐 드릴까요?", ["어서 오세요. 뭐 드릴까요?"]), false);
  assert.equal(hasKoreanOutputRewrite("가"), false);
  assert.equal(hasKoreanOutputRewrite("아이스 아메리카노 주세요."), true);
  assert.equal(hasKoreanOutputDraft("가".repeat(30)), false);
  assert.equal(hasKoreanOutputDraft("저는 카페에서 음료를 주문하고 카드로 계산하고 싶어요."), true);
});

test("retell evidence rejects source lines joined with arbitrary separators", () => {
  const sourceLines = [
    "손님은 카페에서 음료를 주문했어요.",
    "카드로 계산하고 영수증을 받았어요."
  ];

  assert.equal(hasKoreanRetellEvidence(sourceLines.join("\n"), sourceLines), false);
  assert.equal(hasKoreanRetellEvidence(`${sourceLines[0]} / ...?! \n ${sourceLines[1]}`, sourceLines), false);
  assert.equal(hasKoreanRetellEvidence(`${sourceLines[1]} -- ${sourceLines[0]}`, sourceLines), false);
  assert.equal(hasKoreanRetellEvidence(`${sourceLines[0]} 정말 재미있었어요.`, sourceLines), false);
  assert.equal(hasKoreanRetellEvidence(`${sourceLines[1]} ${sourceLines[0]} 정말 좋았어요.`, sourceLines), false);
  assert.equal(
    hasKoreanRetellEvidence("손님은 카페에서 음료를 고른 뒤 카드로 결제하고 영수증도 챙겼어요.", sourceLines),
    true
  );
});

test("material output evidence rejects copied, repeated, and unchanged drafts", () => {
  const material = {
    level: "foundation",
    lines: [
      { ko: "손님은 카페에서 아이스 아메리카노를 주문했어요." },
      { ko: "카드로 계산하고 영수증을 받았어요." }
    ]
  };
  const valid = {
    draft: "저는 카페에서 따뜻한 음료를 주문하고 현금으로 바로 계산하고 싶어요.",
    weakPoint: "수량 표현이 부족함",
    targetRewrite: "따뜻한 라테 두 잔을 포장해서 현금으로 계산하고 싶어요."
  };

  assert.equal(hasMaterialOutputEvidence(valid, material), true);
  assert.equal(hasMaterialOutputEvidence({ ...valid, draft: material.lines[0].ko }, material), false);
  assert.equal(hasMaterialOutputEvidence({ ...valid, draft: material.lines.map((line) => line.ko).join("\n... / ") }, material), false);
  assert.equal(hasMaterialOutputEvidence({ ...valid, draft: "가나다라마바사".repeat(5) }, material), false);
  assert.equal(hasMaterialOutputEvidence({ ...valid, targetRewrite: valid.draft }, material), false);
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
  assert.deepEqual(mapFocusToAbilities(["pragmatics", "native", "speaking"]), ["pragmatics", "native", "listening"]);
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
