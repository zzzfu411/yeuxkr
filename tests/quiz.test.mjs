import test from "node:test";
import assert from "node:assert/strict";
import { defaultProgress } from "../src/lib/learning/storage.ts";
import { buildDistractors, buildProgressQuiz, buildReviewQuestions, checkAnswer, lessonQuestionId, lessonQuestions, makeChoices, normalizeAnswer } from "../src/lib/learning/quiz.ts";
import { defaultSrsState, ensureCard, getSrsState } from "../src/lib/learning/srs.ts";
import { grammarQuestionId, lessonReviewCardId, materialCardId, outputCardId, pronunciationCardId, vocabQuestionId } from "../src/lib/learning/ids.ts";

const store = new Map();
global.window = {
  localStorage: {
    getItem(key) {
      return store.get(key) ?? null;
    },
    setItem(key, value) {
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

test("normalizeAnswer trims, compacts, and lowercases", () => {
  assert.equal(normalizeAnswer("  ABC   def  "), "abc def");
});

test("normalizeAnswer applies NFC and ignores trailing punctuation", () => {
  const decomposed = "가";
  assert.equal(normalizeAnswer(decomposed), "가");
  assert.equal(normalizeAnswer("좋아요."), "좋아요");
  assert.equal(normalizeAnswer("어디예요？"), "어디예요");
  assert.equal(normalizeAnswer("네!!"), "네");
});

test("checkAnswer tolerates trailing punctuation and composition form", () => {
  const drill = { answer: "비가 와서 집에 있었어요", acceptable: [] };
  assert.equal(checkAnswer(drill, "비가 와서 집에 있었어요."), true);
  assert.equal(checkAnswer(drill, "비가  와서 집에 있었어요"), true);
  assert.equal(checkAnswer(drill, "비가 왔어요"), false);
});

test("checkAnswer accepts canonical and acceptable answers", () => {
  const drill = { answer: "어디예요", acceptable: ["어디에요"] };
  assert.equal(checkAnswer(drill, " 어디예요 "), true);
  assert.equal(checkAnswer(drill, "어디에요"), true);
  assert.equal(checkAnswer(drill, "어디"), false);
});

test("buildDistractors prefers confusables, then category, then level", () => {
  const pool = [
    { id: "a", category: "food", level: "survival", value: "答案" },
    { id: "b", category: "food", level: "survival", value: "同类" },
    { id: "c", category: "travel", level: "survival", value: "同级" },
    { id: "d", category: "travel", level: "daily", value: "混淆" },
    { id: "e", category: "travel", level: "daily", value: "其余" }
  ];
  const item = { ...pool[0], confusables: ["d"] };

  const two = buildDistractors(item, pool, (entry) => entry.value, 2, () => 0.5);
  assert.deepEqual(two, ["混淆", "同类"]);

  const four = buildDistractors(item, pool, (entry) => entry.value, 4, () => 0.5);
  assert.equal(four[0], "混淆");
  assert.equal(four[1], "同类");
  assert.equal(four[2], "同级");
  assert.equal(four.includes("答案"), false);
});

test("makeChoices always includes the answer", () => {
  for (let index = 0; index < 100; index += 1) {
    const choices = makeChoices("정답", ["오답1", "오답2", "오답3", "오답4"], 4);
    assert.equal(choices.includes("정답"), true);
    assert.equal(choices.length, 4);
  }
});

test("lessonQuestions gives stable ids to course drills", () => {
  const questions = lessonQuestions("l01-hangul-map");

  assert.equal(questions.length, 3);
  assert.equal(questions[0].id, "lesson:l01-hangul-map:1");
  assert.equal(questions[2].id, lessonQuestionId("l01-hangul-map", 2));
});

test("buildReviewQuestions supports lesson review cards", () => {
  const questions = buildReviewQuestions([
    {
      id: "lesson:l01-hangul-map:3",
      box: 0,
      dueAt: Date.now(),
      correct: 0,
      wrong: 0,
      lastSeenAt: null,
      payload: {
        kind: "lesson",
        itemId: "lesson:l01-hangul-map:3",
        type: "type",
        prompt: "输入 ㄱ + ㅗ 组成的音节",
        answer: "고",
        acceptable: ["고"],
        explain: "横元音 ㅗ 放在 ㄱ 下方，组成 고。",
        speak: "고"
      }
    }
  ]);

  assert.equal(questions.length, 1);
  assert.equal(questions[0].id, "lesson:l01-hangul-map:3");
  assert.equal(questions[0].type, "type");
  assert.equal(questions[0].answer, "고");
  assert.deepEqual(questions[0].acceptable, ["고"]);
  assert.match(questions[0].explain, /横元音/);
});

test("buildReviewQuestions supports mistake cards as typed repair prompts", () => {
  const questions = buildReviewQuestions([
    {
      id: "mistake:gq:particle",
      box: 0,
      dueAt: Date.now(),
      correct: 1,
      wrong: 2,
      lastSeenAt: Date.now(),
      payload: {
        kind: "mistake",
        itemId: "gq:particle",
        prompt: "Translate: I am a student.",
        answer: "저는 학생이에요"
      }
    }
  ]);

  assert.equal(questions.length, 1);
  assert.equal(questions[0].id, "mistake:gq:particle");
  assert.equal(questions[0].type, "type");
  assert.equal(questions[0].prompt, "Translate: I am a student.");
  assert.equal(questions[0].answer, "저는 학생이에요");
});

test("buildReviewQuestions supports grammar and native cards", () => {
  const questions = buildReviewQuestions([
    {
      id: "grammar:g-topic-subject",
      box: 0,
      dueAt: Date.now(),
      correct: 0,
      wrong: 0,
      lastSeenAt: null,
      payload: { kind: "grammar", itemId: "g-topic-subject" }
    },
    {
      id: "native:pragmatics:p-first-meeting",
      box: 0,
      dueAt: Date.now(),
      correct: 0,
      wrong: 0,
      lastSeenAt: null,
      payload: { kind: "native", itemId: "pragmatics:p-first-meeting" }
    },
    {
      id: "native:nuance:n-thanks",
      box: 0,
      dueAt: Date.now(),
      correct: 0,
      wrong: 0,
      lastSeenAt: null,
      payload: { kind: "native", itemId: "nuance:n-thanks" }
    },
    {
      id: "material:im-cafe-real-speed",
      box: 0,
      dueAt: Date.now(),
      correct: 0,
      wrong: 0,
      lastSeenAt: null,
      payload: { kind: "material", itemId: "im-cafe-real-speed" }
    },
    {
      id: "output:im-cafe-real-speed",
      box: 0,
      dueAt: Date.now(),
      correct: 0,
      wrong: 0,
      lastSeenAt: null,
      payload: { kind: "output", itemId: "im-cafe-real-speed", prompt: "重写弱点", answer: "포장해 주세요" }
    }
  ]);
  assert.equal(questions.length, 5);
  assert.equal(questions.filter((question) => question.choices).every((question) => question.choices.includes(question.answer)), true);
  assert.equal(questions.filter((question) => question.type === "type").length, 2);
  const materialQuestion = questions.find((question) => question.id === "material:im-cafe-real-speed");
  assert.equal(materialQuestion.acceptable.includes("咖啡店真实语速点单"), false);
  assert.equal(materialQuestion.acceptable.some((item) => item.includes("欢迎光临")), false);
  const outputQuestion = questions.find((question) => question.id === "output:im-cafe-real-speed");
  assert.match(outputQuestion.explain, /目标改写/);
});

test("buildProgressQuiz limits default transfer checks to learned content", () => {
  const emptyQuestions = buildProgressQuiz(defaultProgress(), 10, 1);
  assert.deepEqual(emptyQuestions, []);

  const learnedQuestions = buildProgressQuiz({
    ...defaultProgress(),
    masteredHangul: ["v-a"],
    learnedVocab: ["v-annyeonghaseyo"],
    learnedGrammar: ["g-topic-subject"]
  }, 20, 2);

  assert.equal(learnedQuestions.some((question) => question.id === "vq:v-annyeonghaseyo"), true);
  assert.equal(learnedQuestions.some((question) => question.id === "gq:g-topic-subject"), true);
  assert.equal(learnedQuestions.some((question) => question.id === "vq:dict:v-annyeonghaseyo" && question.type === "dictation" && question.speak), true);
  assert.equal(learnedQuestions.filter((question) => question.id.startsWith("vq:")).every((question) => question.id.endsWith(":v-annyeonghaseyo") || question.id === "vq:v-annyeonghaseyo"), true);
  assert.equal(learnedQuestions.some((question) => question.id.startsWith("gq:") && question.id !== "gq:g-topic-subject"), false);
  assert.equal(learnedQuestions.some((question) => question.id.startsWith("pq:")), false);
});

test("buildProgressQuiz prioritizes weak practice items and completed lesson drills", () => {
  const lessonId = "l01-hangul-map";
  const lessonQuestionId = lessonReviewCardId(lessonId, 0);
  const vocabId = vocabQuestionId("v-annyeonghaseyo");
  const grammarId = grammarQuestionId("g-topic-subject");
  const questions = buildProgressQuiz({
    ...defaultProgress(),
    completedLessons: [lessonId],
    lessonScores: { [lessonId]: 90 },
    masteredHangul: ["v-a"],
    learnedVocab: ["v-annyeonghaseyo"],
    learnedGrammar: ["g-topic-subject"],
    practiceItems: {
      [lessonQuestionId]: {
        attempts: 5,
        correct: 2,
        wrong: 3,
        streak: 0,
        lastCorrect: false,
        lastSeenAt: "2026-07-06T03:00:00.000Z",
        lastSource: "lesson"
      },
      [vocabId]: {
        attempts: 2,
        correct: 1,
        wrong: 1,
        streak: 0,
        lastCorrect: false,
        lastSeenAt: "2026-07-06T02:00:00.000Z",
        lastSource: "quiz"
      },
      [grammarId]: {
        attempts: 3,
        correct: 2,
        wrong: 1,
        streak: 1,
        lastCorrect: true,
        lastSeenAt: "2026-07-06T01:00:00.000Z",
        lastSource: "review"
      }
    }
  }, 4, 11);

  assert.equal(questions[0].id, lessonQuestionId);
  assert.equal(questions[1].id, vocabId);
  assert.equal(questions.some((question) => question.id === grammarId), true);
});

test("buildProgressQuiz only adds explicitly practiced pronunciation pairs", () => {
  const foundationOnly = buildProgressQuiz({
    ...defaultProgress(),
    masteredHangul: ["v-a", "v-ya", "v-eo", "v-yeo", "v-o", "v-yo", "v-u", "v-yu"]
  }, 20, 3);

  assert.equal(foundationOnly.some((question) => question.id.startsWith("pq:")), false);

  ensureCard(pronunciationCardId("plain-aspirated-k"), { kind: "pronunciation", itemId: "plain-aspirated-k" });
  const practiced = buildProgressQuiz({
    ...defaultProgress(),
    masteredHangul: ["v-a", "v-ya", "v-eo", "v-yeo", "v-o", "v-yo", "v-u", "v-yu"]
  }, 20, 3, [], getSrsState());

  assert.equal(practiced.some((question) => question.id === "pq:plain-aspirated-k"), true);
  assert.equal(practiced.some((question) => question.id.startsWith("pq:") && question.id !== "pq:plain-aspirated-k"), false);
});

test("buildProgressQuiz includes learned native and material retell checks", () => {
  store.clear();
  ensureCard(materialCardId("im-cafe-real-speed"), {
    kind: "material",
    itemId: "im-cafe-real-speed",
    prompt: "retell",
    answer: "손님은 아이스 아메리카노를 포장으로 주문하고 카드로 계산해요."
  });
  ensureCard(outputCardId("output-transfer-1"), {
    kind: "output",
    itemId: "output-transfer-1",
    prompt: "rewrite",
    answer: "아이스 아메리카노 하나 포장해 주세요."
  });
  const questions = buildProgressQuiz({
    ...defaultProgress(),
    learnedNative: ["pragmatics:p-first-meeting", "nuance:n-thanks"],
    nativeEvidence: {
      "pragmatics:p-first-meeting": {
        listened: true,
        retell: "처음 만날 때는 자기소개를 하고 천천히 말해 달라고 부탁해요.",
        transfer: "선생님께는 안녕하세요. 저는 리나라고 합니다.",
        updatedAt: "2026-06-09T00:00:00.000Z"
      },
      "nuance:n-thanks": {
        listened: true,
        retell: "감사합니다는 공식적인 자리에서 쓰고 고마워요는 일상에서 자연스러워요.",
        transfer: "친구에게는 고마워라고 말하고 회사에서는 감사합니다라고 말해요.",
        updatedAt: "2026-06-09T00:00:00.000Z"
      }
    },
    completedMaterials: ["im-cafe-real-speed"],
    materialEvidence: {
      "im-cafe-real-speed": {
        dictation: "뭐 드릴까요?",
        retell: "손님은 아이스 아메리카노를 포장으로 주문하고 카드로 계산해요.",
        selfCheck: ["是否先说核心名词再说数量", "是否使用 주세요 或 드릴까요", "是否能不看中文复述交易流程"],
        outputEntryId: "output-transfer-1",
        updatedAt: "2026-06-09T00:00:00.000Z"
      }
    }
  }, 20, 4, [
    {
      id: "output-transfer-1",
      materialId: "im-cafe-real-speed",
      materialTitle: "咖啡店真实语速点单",
      mission: "把点单句改写得更自然。",
      draft: "아메리카노 주세요.",
      weakPoint: "外带表达不稳",
      targetRewrite: "아이스 아메리카노 하나 포장해 주세요.",
      rubric: ["naturalness"],
      createdAt: "2026-06-09T00:00:00.000Z"
    }
  ], getSrsState());

  assert.equal(questions.some((question) => question.id === "nq:pragmatics:p-first-meeting"), true);
  assert.equal(questions.some((question) => question.id === "nq:nuance:n-thanks"), true);
  const materialQuestion = questions.find((question) => question.id === "mq:im-cafe-real-speed");
  assert.equal(Boolean(materialQuestion), true);
  assert.equal(materialQuestion.answer, "손님은 아이스 아메리카노를 포장으로 주문하고 카드로 계산해요.");
  assert.equal(materialQuestion.acceptable.includes("어서 오세요. 뭐 드릴까요?"), false);
});

test("buildProgressQuiz skips material retell checks without Korean evidence", () => {
  const questions = buildProgressQuiz({
    ...defaultProgress(),
    completedMaterials: ["im-cafe-real-speed"]
  }, 20, 4);

  assert.equal(questions.some((question) => question.id === "mq:im-cafe-real-speed"), false);
});

test("buildProgressQuiz includes output archive target rewrites", () => {
  store.clear();
  ensureCard(materialCardId("im-cafe-real-speed"), {
    kind: "material",
    itemId: "im-cafe-real-speed",
    prompt: "retell",
    answer: "손님은 아이스 아메리카노를 포장으로 주문하고 카드로 계산해요."
  });
  ensureCard(outputCardId("output-transfer-1"), {
    kind: "output",
    itemId: "output-transfer-1",
    prompt: "rewrite",
    answer: "아이스 아메리카노 하나 포장해 주세요."
  });
  const questions = buildProgressQuiz({
    ...defaultProgress(),
    completedMaterials: ["im-cafe-real-speed"],
    materialEvidence: {
      "im-cafe-real-speed": {
        dictation: "뭐 드릴까요?",
        retell: "손님은 아이스 아메리카노를 포장으로 주문하고 카드로 계산해요.",
        selfCheck: ["是否先说核心名词再说数量", "是否使用 주세요 或 드릴까요", "是否能不看中文复述交易流程"],
        outputEntryId: "output-transfer-1",
        updatedAt: "2026-06-09T00:00:00.000Z"
      }
    }
  }, 20, 5, [
    {
      id: "output-transfer-1",
      materialId: "im-cafe-real-speed",
      materialTitle: "咖啡店真实语速点单",
      mission: "把点单句改写得更自然。",
      draft: "아메리카노 주세요.",
      weakPoint: "外带表达不稳",
      targetRewrite: "아이스 아메리카노 하나 포장해 주세요.",
      rubric: ["naturalness"],
      createdAt: "2026-06-09T00:00:00.000Z"
    }
  ], getSrsState());

  const outputQuestion = questions.find((question) => question.id === "oq:output-transfer-1");
  assert.equal(Boolean(outputQuestion), true);
  assert.equal(outputQuestion.type, "type");
  assert.equal(outputQuestion.answer, "아이스 아메리카노 하나 포장해 주세요.");
  assert.equal(outputQuestion.acceptable.includes("아메리카노 주세요."), true);
  assert.match(outputQuestion.prompt, /外带表达不稳/);
});

test("buildProgressQuiz uses the output currently bound to material evidence", () => {
  store.clear();
  ensureCard(materialCardId("im-cafe-real-speed"), {
    kind: "material",
    itemId: "im-cafe-real-speed",
    prompt: "retell",
    answer: "손님은 아이스 아메리카노를 포장으로 주문하고 카드로 계산해요."
  });
  ensureCard(outputCardId("old-output"), {
    kind: "output",
    itemId: "old-output",
    prompt: "old rewrite",
    answer: "예전 문장입니다."
  });
  ensureCard(outputCardId("current-output"), {
    kind: "output",
    itemId: "current-output",
    prompt: "current rewrite",
    answer: "아이스 아메리카노 하나 포장해 주세요."
  });

  const questions = buildProgressQuiz({
    ...defaultProgress(),
    completedMaterials: ["im-cafe-real-speed"],
    materialEvidence: {
      "im-cafe-real-speed": {
        dictation: "뭐 드릴까요?",
        retell: "손님은 아이스 아메리카노를 포장으로 주문하고 카드로 계산해요.",
        selfCheck: ["是否先说核心名词再说数量", "是否使用 주세요 或 드릴까요", "是否能不看中文复述交易流程"],
        outputEntryId: "current-output",
        updatedAt: "2026-06-09T00:00:00.000Z"
      }
    }
  }, 20, 7, [
    {
      id: "old-output",
      materialId: "im-cafe-real-speed",
      materialTitle: "咖啡店真实语速点单",
      mission: "旧输出",
      draft: "예전 문장.",
      weakPoint: "old",
      targetRewrite: "예전 문장입니다.",
      rubric: ["naturalness"],
      createdAt: "2026-06-08T00:00:00.000Z"
    },
    {
      id: "current-output",
      materialId: "im-cafe-real-speed",
      materialTitle: "咖啡店真实语速点单",
      mission: "当前输出",
      draft: "아메리카노 주세요.",
      weakPoint: "外带表达不稳",
      targetRewrite: "아이스 아메리카노 하나 포장해 주세요.",
      rubric: ["naturalness"],
      createdAt: "2026-06-09T00:00:00.000Z"
    }
  ], getSrsState());

  assert.equal(questions.some((question) => question.id === "oq:old-output"), false);
  assert.equal(questions.some((question) => question.id === "oq:current-output"), true);
});

test("buildProgressQuiz rejects material evidence with forged self-check items", () => {
  store.clear();
  ensureCard(materialCardId("im-cafe-real-speed"), {
    kind: "material",
    itemId: "im-cafe-real-speed",
    prompt: "retell",
    answer: "손님은 아이스 아메리카노를 포장으로 주문하고 카드로 계산해요."
  });
  ensureCard(outputCardId("output-transfer-1"), {
    kind: "output",
    itemId: "output-transfer-1",
    prompt: "rewrite",
    answer: "아이스 아메리카노 하나 포장해 주세요."
  });

  const questions = buildProgressQuiz({
    ...defaultProgress(),
    completedMaterials: ["im-cafe-real-speed"],
    materialEvidence: {
      "im-cafe-real-speed": {
        dictation: "뭐 드릴까요?",
        retell: "손님은 아이스 아메리카노를 포장으로 주문하고 카드로 계산해요.",
        selfCheck: ["fake-a", "fake-b", "fake-c"],
        outputEntryId: "output-transfer-1",
        updatedAt: "2026-06-09T00:00:00.000Z"
      }
    }
  }, 20, 6, [
    {
      id: "output-transfer-1",
      materialId: "im-cafe-real-speed",
      materialTitle: "咖啡店真实语速点单",
      mission: "把点单句改写得更自然。",
      draft: "아메리카노 주세요.",
      weakPoint: "外带表达不稳",
      targetRewrite: "아이스 아메리카노 하나 포장해 주세요.",
      rubric: ["naturalness"],
      createdAt: "2026-06-09T00:00:00.000Z"
    }
  ], getSrsState());

  assert.equal(questions.some((question) => question.id === "mq:im-cafe-real-speed"), false);
  assert.equal(questions.some((question) => question.id === "oq:output-transfer-1"), false);
});

test("buildProgressQuiz skips output archive entries without SRS evidence", () => {
  const questions = buildProgressQuiz({
    ...defaultProgress(),
    completedMaterials: ["im-cafe-real-speed"]
  }, 20, 5, [
    {
      id: "output-without-card",
      materialId: "im-cafe-real-speed",
      materialTitle: "咖啡店真实语速点单",
      mission: "把点单句改写得更自然。",
      draft: "아메리카노 주세요.",
      weakPoint: "外带表达不稳",
      targetRewrite: "아이스 아메리카노 하나 포장해 주세요.",
      rubric: ["naturalness"],
      createdAt: "2026-06-09T00:00:00.000Z"
    }
  ], defaultSrsState());

  assert.equal(questions.some((question) => question.id === "oq:output-without-card"), false);
});
