import test from "node:test";
import assert from "node:assert/strict";

const { buildGateQuestions, GATE_PASS_SCORE } = await import("../src/lib/learning/gate.ts");
const { checkAnswer } = await import("../src/lib/learning/quiz.ts");

test("gate pass score demands real mastery", () => {
  assert.equal(GATE_PASS_SCORE >= 75, true);
});

test("hangul gate mixes listening, recognition, and keyboard production", () => {
  const questions = buildGateQuestions("hangul", "v-a", 7);
  assert.equal(questions.length, 4);
  assert.equal(questions[0].type, "listen");
  assert.equal(Boolean(questions[0].speak), true);
  assert.equal(questions[0].choices.includes(questions[0].answer), true);
  assert.equal(questions[1].type, "choice");
  assert.equal(questions[1].answer, "a");
  assert.equal(questions[3].type, "dictation");
  assert.equal(questions[3].answer, "아");
  assert.equal(questions[3].speak, "아");
  assert.equal(questions.every((question) => question.id.startsWith("hq:v-a:gate")), true);
});

test("vocab gate covers meaning, recognition, dictation, and production", () => {
  const questions = buildGateQuestions("vocab", "v-annyeonghaseyo", 7);
  assert.equal(questions.length, 4);
  assert.equal(questions[0].type, "choice");
  assert.equal(questions[0].answer, "안녕하세요");
  assert.equal(questions[1].answer, "你好");
  assert.equal(questions[2].type, "dictation");
  assert.equal(questions[2].answer, "안녕하세요");
  assert.equal(["cloze", "translate"].includes(questions[3].type), true);
  if (questions[3].type === "cloze") {
    assert.equal(questions[3].clozeText.includes("___"), true);
    assert.equal(questions[3].clozeText.includes("안녕하세요"), false);
  }
  assert.equal(questions.every((question) => question.id.startsWith("vq:v-annyeonghaseyo:gate")), true);
});

test("grammar gate checks example meaning, pattern function, and pitfalls", () => {
  const questions = buildGateQuestions("grammar", "g-topic-subject", 7);
  assert.equal(questions.length, 3);
  for (const question of questions) {
    assert.equal(question.type, "choice");
    assert.equal(question.choices.includes(question.answer), true);
    assert.equal(question.id.startsWith("gq:g-topic-subject:gate"), true);
  }
});

test("sound change gate tests spoken form, rule identity, and written dictation", () => {
  const questions = buildGateQuestions("soundChange", "sc-liaison", 7);
  assert.equal(questions.length, 3);
  assert.equal(questions[0].type, "choice");
  assert.equal(questions[0].answer, "한구거");
  assert.equal(questions[1].answer, "连音");
  assert.equal(questions[2].type, "dictation");
  assert.equal(questions[2].answer, "옷이");
  assert.equal(checkAnswer(questions[2], "옷이"), true);
  assert.equal(checkAnswer(questions[2], "오시"), false);
});

test("gate questions are deterministic per seed and unknown items return nothing", () => {
  const first = buildGateQuestions("vocab", "v-annyeonghaseyo", 42);
  const second = buildGateQuestions("vocab", "v-annyeonghaseyo", 42);
  assert.deepEqual(first, second);
  const shifted = buildGateQuestions("vocab", "v-annyeonghaseyo", 43);
  assert.equal(JSON.stringify(first) !== JSON.stringify(shifted), true);
  assert.deepEqual(buildGateQuestions("vocab", "missing-item", 1), []);
  assert.deepEqual(buildGateQuestions("hangul", "missing-item", 1), []);
});
