import test from "node:test";
import assert from "node:assert/strict";
import { lessons } from "../src/data/curriculum.js";
import { grammarPoints } from "../src/data/grammar.js";
import { hangulGroups, pronunciationPairs } from "../src/data/hangul.js";
import { vocab } from "../src/data/lexicon.js";
import { nuanceSets } from "../src/data/nuance.js";
import { soundChangeRules } from "../src/data/sound-changes.js";
import { canPlayQuestionAudio } from "../src/lib/learning/question-audio.ts";
import { assessLessonAttempt } from "../src/lib/learning/lesson-assessment.ts";
import { buildGateQuestions } from "../src/lib/learning/gate.ts";
import { buildMixedQuiz, buildProgressQuiz, buildReviewQuestions, vocabMeaningCue } from "../src/lib/learning/quiz.ts";
import { defaultProgress } from "../src/lib/learning/storage.ts";
import { buildProficiencySnapshot, mapQuestionToAbilities } from "../src/lib/learning/workspace-snapshot.ts";
import { mapCardToAbilities } from "../src/lib/learning/workspace.ts";

const card = (kind, itemId, box = 0) => ({ id: `${kind}:${itemId}`, box, dueAt: 0, interval: 1, correct: 0, wrong: 0, payload: { kind, itemId } });
const emptyEvidence = { outputs: [], srs: { cards: {} } };

test("retrieval audio is feedback only; listening stimuli remain available", () => {
  for (const type of ["type", "translate", "cloze"]) {
    const question = { type, prompt: "안녕", answer: "안녕", speak: "안녕" };
    assert.equal(canPlayQuestionAudio(question), false);
    assert.equal(canPlayQuestionAudio(question, true), true);
  }
  assert.equal(canPlayQuestionAudio({ type: "choice", prompt: "你好用韩语怎么说？", speak: "안녕" }), false);
  assert.equal(canPlayQuestionAudio({ type: "choice", prompt: "안녕 的意思是？", speak: "안녕" }), true);
  for (const type of ["listen", "dictation"]) assert.equal(canPlayQuestionAudio({ type, prompt: "听", speak: "안녕" }), true);
});

test("all productive curriculum questions protect answer audio until feedback", () => {
  let checked = 0;
  for (const lesson of lessons) for (const question of lesson.drills) {
    if (!question.speak || !["type", "translate", "cloze"].includes(question.type)) continue;
    checked++;
    assert.equal(canPlayQuestionAudio(question), false, lesson.id);
    assert.equal(canPlayQuestionAudio(question, true), true, lesson.id);
  }
  assert.ok(checked > 20);
});

test("near-merger gates use spelling context and true contrasts always contain both sounds", () => {
  for (const pair of pronunciationPairs) for (let seed = 1; seed <= 20; seed++) {
    const questions = buildGateQuestions("pronunciation", pair.id, seed);
    for (const question of questions.slice(0, 2)) {
      assert.deepEqual([...question.choices].sort(), [pair.a, pair.b].sort());
      assert.equal(question.type, pair.spellingPrompts ? "choice" : "listen");
      if (pair.spellingPrompts) assert.equal(canPlayQuestionAudio(question), false);
    }
    const review = buildReviewQuestions([card("pronunciation", pair.id)])[0];
    assert.equal(review.type, pair.spellingPrompts ? "choice" : "listen");
  }
});

test("archived mistakes cannot revive obsolete homophone exams or uncorrected drafts", () => {
  const oldPair = card("mistake", "pq:ae-e:gate1");
  Object.assign(oldPair.payload, { type: "listen", prompt: "听音", answer: "개", speak: "개", choices: ["개", "게"] });
  const rebuilt = buildReviewQuestions([oldPair])[0];
  assert.equal(rebuilt.id, oldPair.id);
  assert.equal(rebuilt.type, "choice");
  assert.match(rebuilt.prompt, /狗/);
  assert.equal(canPlayQuestionAudio(rebuilt), false);
  const oldOutput = card("mistake", "oq:old-output");
  Object.assign(oldOutput.payload, { type: "type", prompt: "自由复述", answer: "목표", acceptable: ["목표", "초안"] });
  const repaired = buildReviewQuestions([oldOutput])[0];
  assert.deepEqual(repaired.acceptable, ["목표"]);
  assert.match(repaired.prompt, /原句/);
});

test("isolated Hangul listening specifies a position and excludes merger distractors", () => {
  const mergers = [["ㅐ", "ㅔ"], ["ㅒ", "ㅖ"], ["ㅙ", "ㅚ", "ㅞ"]];
  for (const item of hangulGroups.flatMap((group) => group.items)) for (let seed = 1; seed <= 20; seed++) {
    const [question] = buildGateQuestions("hangul", item.id, seed);
    assert.match(question.prompt, /元音字母|初声字母|收音字母/);
    assert.equal(question.speak, item.sound);
    const merger = mergers.find((group) => group.includes(item.glyph)) ?? [];
    assert.equal(question.choices.some((choice) => choice !== item.glyph && merger.includes(choice)), false);
  }
});

test("spelling contrast evidence is script evidence, including legacy explicit listening events", () => {
  for (const id of ["ae-e", "oe-we"]) {
    assert.deepEqual(mapQuestionToAbilities(`pq:${id}:gate1`), ["script"]);
    assert.deepEqual(mapCardToAbilities(card("pronunciation", id)), ["script"]);
    const progress = { ...defaultProgress(), abilityEvents: { [`pronunciation:${id}`]: { listening: 2 } } };
    const snapshot = buildProficiencySnapshot(progress, emptyEvidence);
    assert.equal(snapshot.evidence.listeningAbility, 0);
    assert.equal(snapshot.evidence.scriptAbility, 2);
  }
  assert.deepEqual(mapQuestionToAbilities("pq:plain-aspirated-k:gate1"), ["listening"]);
});

const drills = [
  { id: "one", type: "choice", prompt: "读", answer: "一" },
  { id: "two", type: "translate", prompt: "写", answer: "둘" },
  { id: "three", type: "listen", prompt: "听", answer: "셋", speak: "셋" }
];
const lesson = { drills, focus: ["listening"] };
const answers = drills.map((question) => ({ question, correct: true }));

test("mastery requires exactly one answer to every current question", () => {
  for (const attempt of [[], answers.slice(0, 1), [answers[1], answers[1], answers[2]], [...answers, answers[0]], [...answers.slice(0, 2), { question: { id: "unknown" }, correct: true }]]) {
    const assessment = assessLessonAttempt(lesson, attempt, 100);
    assert.equal(assessment.complete, false);
    assert.equal(assessment.score, 0);
    assert.equal(assessment.corePassed, false);
  }
  assert.equal(assessLessonAttempt(lesson, answers, 100).corePassed, true);
});

test("a caller's inflated score cannot override the actual correct ratio", () => {
  const assessment = assessLessonAttempt(lesson, answers.map((entry, index) => ({ ...entry, correct: index === 0 })), 100);
  assert.equal(assessment.score, 33);
  assert.equal(assessment.overallPassed, false);
  assert.equal(assessLessonAttempt(lesson, answers, NaN).overallPassed, false);
});

test("grammar sentence questions use sentence translations in every generator", () => {
  const translations = new Set(grammarPoints.flatMap((point) => point.examples.map((example) => example.zh)));
  const progress = { ...defaultProgress(), learnedGrammar: grammarPoints.map((point) => point.id) };
  const questions = [
    ...buildReviewQuestions(grammarPoints.map((point) => card("grammar", point.id))),
    ...buildMixedQuiz(3000, 23),
    ...buildProgressQuiz(progress, 3000, 23, [], { cards: {} }),
    ...grammarPoints.flatMap((point) => buildGateQuestions("grammar", point.id, 23))
  ].filter((question) => question.id.startsWith("gq:") || question.id.startsWith("grammar:"));
  for (const question of questions.filter((question) => question.prompt.includes("的意思是"))) {
    assert.ok(question.choices.length >= 3);
    assert.ok(question.choices.every((option) => translations.has(option)), question.id);
  }
});

test("ambiguous reverse vocabulary prompts distinguish noun and verb", () => {
  const entries = vocab.filter((entry) => entry.meaning === "联系");
  assert.equal(entries.length, 2);
  for (const entry of entries) {
    const cue = vocabMeaningCue(entry);
    assert.match(cue, entry.pos === "noun" ? /名词/ : /动词/);
    assert.ok(buildGateQuestions("vocab", entry.id)[0].prompt.includes(cue));
    assert.ok(buildReviewQuestions([card("vocab", entry.id, 3)])[0].prompt.includes(cue));
  }
});

test("nuance review uses the authored alternatives", () => {
  for (const set of nuanceSets) {
    const question = buildReviewQuestions([card("native", `nuance:${set.id}`)])[0];
    const example = set.examples[0];
    assert.ok(question.choices.every((choice) => choice === example.register || example.distractors.includes(choice)));
  }
});

test("sound-change teaching states morphological conditions and lexical exceptions", () => {
  const rule = (id) => soundChangeRules.find((entry) => entry.id === id);
  assert.match(rule("sc-liaison").summary, /助词.*词尾.*后缀/);
  assert.match(rule("sc-liaison").summary, /实词/);
  assert.match(rule("sc-liquidization").summary, /생산량.*생산냥/);
  assert.match(rule("sc-palatalization").summary, /语素边界/);
});
