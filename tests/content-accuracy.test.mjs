import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { grammarPoints } from "../src/data/grammar.js";
import { hangulGroups } from "../src/data/hangul.js";
import { BUNDLED_SPEECH_ASSETS } from "../src/data/speech-assets.generated.js";
import { lessons } from "../src/data/curriculum.js";
import { immersionMaterials } from "../src/data/materials.ts";
import { nuanceSets } from "../src/data/nuance.js";
import { pragmaticScenarios } from "../src/data/pragmatics.js";
import { vocab } from "../src/data/lexicon.js";
import { checkTeachingDecompositions, decompositionMatches } from "../src/lib/korean/content-checks.ts";

test("written teaching decompositions agree with actual Hangul syllables", () => {
  assert.deepEqual(checkTeachingDecompositions(lessons), []);
  assert.equal(decompositionMatches("한글", ["ㅎㅏㄴ", "ㄱㅡㄹ"]), true);
  assert.equal(decompositionMatches("한글", ["ㅎㅏㄴ", "ㄱㅡㄱ"]), false);
  assert.equal(decompositionMatches("과", ["ㄱ + ㅘ"]), true);
  assert.equal(decompositionMatches("읽", ["ㅇㅣㄹㄱ"]), true);
  assert.equal(decompositionMatches("읽", ["ㅇㅏㄹㄱ"]), false);
  assert.equal(decompositionMatches("한글", ["ㅎㅏㄴ"]), false);
  assert.equal(checkTeachingDecompositions([{ id: "bad", teach: [{ body: "看见 한글 先数两块，再拆 ㅎㅏㄴ / ㄱㅡㄱ。" }] }]).length, 1);
});

test("Hangul cards separate the target sound from the example word", () => {
  const items = hangulGroups.flatMap((group) => group.items);
  const oe = items.find((item) => item.id === "v-oe");

  assert.equal(oe.sound, "외");
  assert.equal(oe.example, "회사");
  assert.notEqual(oe.sound, oe.example);
  for (const item of items) assert.match(item.sound, /[가-힣]/, item.id);

  const pageSource = readFileSync("src/app/hangul/page.tsx", "utf8");
  assert.match(pageSource, /onPlay=\{\(\) => speakKorean\(item\.sound\)\}/);
  assert.match(pageSource, /onClick=\{\(\) => speakKorean\(item\.example\)\}/);
  assert.match(pageSource, /회 = ㅎ \+ ㅚ|const relation = getExampleRelation/);
});

test("every Hangul card sound has a nonempty bundled MP3", () => {
  const invalidItems = hangulGroups.flatMap((group) => group.items).filter((item) => {
    const asset = BUNDLED_SPEECH_ASSETS[item.sound];
    if (!/^\/assets\/audio\/ko\/[a-f0-9]{20}\.mp3$/.test(asset ?? "")) return true;

    const file = `public${asset}`;
    return !existsSync(file) || !statSync(file).isFile() || statSync(file).size === 0;
  });

  assert.deepEqual(invalidItems.map((item) => `${item.id}=${item.sound}`), []);
});

test("high-risk grammar entries preserve Korean predicate-class distinctions", () => {
  const guess = grammarPoints.find((point) => point.id === "g-guess");
  const nominalization = grammarPoints.find((point) => point.id === "g-nominalization");
  const indirect = grammarPoints.find((point) => point.id === "g-indirect-speech");
  const honorific = grammarPoints.find((point) => point.id === "g-euseyo-request");

  assert.match(guess.pattern, /动词现在时.*形容词.*名词/);
  assert.match(guess.explanation, /\-\(으\)ㄹ 것 같아요/);
  assert.match(nominalization.pattern, /动词现在.*形容词\/动词过去.*未来/);
  assert.ok(nominalization.examples.some((example) => example.ko.includes("복잡한 것")));
  assert.match(indirect.pattern, /动词 \-ㄴ\/는다고.*形容词 \-다고.*名词 \-\(이\)라고/);
  assert.match(honorific.pitfalls.join(" "), /계시다.*있으시다/);
});

test("native capstone listening item has an unambiguous polite request", () => {
  const capstone = lessons.find((lesson) => lesson.id === "l30-native-capstone");
  const listening = capstone.drills.find((drill) => drill.type === "listen");

  assert.equal(listening.speak, "선생님, 먼저 말씀해 주시겠어요?");
  assert.equal(listening.answer, "礼貌地请老师先说");
  assert.ok(listening.choices.includes(listening.answer));
});

test("usage notes distinguish appointments, refusals, and softened opinions", () => {
  const appointment = vocab.find((item) => item.id === "v-yaksok");
  const refusal = pragmaticScenarios.find((scene) => scene.id === "p-soft-refusal-plan");
  const discussion = pragmaticScenarios.find((scene) => scene.id === "p-news-discussion");

  assert.match(appointment.note, /机构或服务预约通常用 예약/);
  assert.match(refusal.nativeMove, /좋아요 很自然.*싫어요 往往较硬/);
  assert.equal(discussion.lines[2].zh, "归根结底，我觉得平衡很重要。");
});

test("native quiz labels use explicit non-overlapping distractors", () => {
  for (const set of nuanceSets) {
    const example = set.examples[0];
    assert.equal(example.distractors.length, 3, set.id);
    assert.equal(new Set([example.register, ...example.distractors]).size, 4, set.id);
  }
});

test("podcast rest strategy describes a daily empty time block naturally", () => {
  const material = immersionMaterials.find((item) => item.id === "im-podcast-opinion");
  assert.ok(material.lines.some((line) => line.ko.includes("매일 일부러 아무 일정도 잡지 않고 쉬는 시간을")));
  assert.ok(material.dictation.some((line) => line.includes("쉬는 시간을 가지려고 해요")));
});

test("zero-basis Hangul lessons teach every symbol used by their own title and bridge", () => {
  const vowels = lessons.find((lesson) => lesson.id === "l02-vowels");
  const consonants = lessons.find((lesson) => lesson.id === "l03-consonants");
  const vowelTeaching = JSON.stringify(vowels.teach);
  const consonantTeaching = JSON.stringify(consonants.teach);

  for (const glyph of ["ㅏ", "ㅑ", "ㅓ", "ㅕ", "ㅗ", "ㅛ", "ㅜ", "ㅠ", "ㅡ", "ㅣ"]) assert.match(vowelTeaching, new RegExp(glyph));
  for (const glyph of ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅅ", "ㅇ", "ㅈ", "ㅎ"]) assert.match(consonantTeaching, new RegExp(glyph));
});

test("first particle examples stay inside grammar taught before polite present", () => {
  const particles = lessons.find((lesson) => lesson.id === "l05-particles");
  assert.doesNotMatch(JSON.stringify(particles), /할게요/);
  assert.match(JSON.stringify(particles), /제가 학생이에요/);
});

test("cafe lesson explicitly teaches first-person intent before testing it", () => {
  const cafe = lessons.find((lesson) => lesson.id === "l06-cafe");
  const teaching = JSON.stringify(cafe.teach);
  assert.match(teaching, /\-\(으\)ㄹ게요/);
  assert.match(teaching, /주어.*일반|주어.*“我”|第一人称|说话人/);
  assert.equal(cafe.drills.some((drill) => drill.answer === "제가 계산할게요."), true);
});
