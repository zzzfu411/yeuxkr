import test from "node:test";
import assert from "node:assert/strict";
import { getCoreLibraryGate, getLibraryGate, getLibraryGateForLesson, libraryTargetsForMilestone } from "../src/lib/learning/path-gates.ts";
import { applyLessonCompletion, buildLearningWorkspace, libraryCountsForWrite, libraryCountsFromProgress } from "../src/lib/learning/workspace.ts";
import { defaultProfile, defaultProgress } from "../src/lib/learning/storage.ts";
import { hangulGroups } from "../src/data/hangul.js";
import { vocab } from "../src/data/lexicon.js";
import { lessons } from "../src/data/curriculum.js";

const emptyCounts = { hangul: 0, vocab: 0, grammar: 0, materials: 0, native: 0 };

test("m0 early lessons are not blocked by the hangul library", () => {
  const lesson = lessons.find((item) => item.id === "l01-hangul-map");
  assert.equal(getLibraryGateForLesson(lesson, emptyCounts).ok, true);
});

test("m1 requires hangul enrollment before particles", () => {
  const lesson = lessons.find((item) => item.id === "l04-first-sentences");
  const blocked = getLibraryGateForLesson(lesson, emptyCounts);
  assert.equal(blocked.ok, false);
  assert.equal(blocked.missing[0].key, "hangul");
  assert.equal(blocked.missing[0].target, 28);
  assert.equal(getLibraryGateForLesson(lesson, { ...emptyCounts, hangul: 28 }).ok, false);
  assert.equal(getLibraryGateForLesson(lesson, { ...emptyCounts, hangul: 28, vocab: 16 }).ok, true);
});

test("m4 write gate needs materials and native evidence", () => {
  const lesson = lessons.find((item) => item.id === "l30-native-capstone");
  const blocked = getLibraryGateForLesson(lesson, { hangul: 28, vocab: 120, grammar: 24, materials: 0, native: 0 });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.missing.some((gap) => gap.key === "materials"), true);
  assert.equal(blocked.missing.some((gap) => gap.key === "native"), true);
  assert.equal(getLibraryGateForLesson(lesson, { hangul: 28, vocab: 120, grammar: 24, materials: 4, native: 4 }).ok, true);
});

test("m2 requires hangul, vocab, and grammar together", () => {
  const targets = libraryTargetsForMilestone("m2");
  assert.deepEqual(targets, { hangul: 28, vocab: 40, grammar: 8 });
  const blocked = getLibraryGate("m2", { ...emptyCounts, hangul: 28, vocab: 40, grammar: 7 });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.missing.map((gap) => gap.key).join(","), "grammar");
});

test("library-gated first-sentence lesson stays in preview until hangul and vocab are enrolled", () => {
  const m0Ids = ["l01-hangul-map", "l02-vowels", "l31-compound-vowels", "l03-consonants", "l32-tense-aspirated", "l33-batchim", "l46-syllable-fluency", "l47-double-batchim"];
  const progress = {
    ...defaultProgress(),
    completedLessons: m0Ids,
    lessonScores: Object.fromEntries(m0Ids.map((id) => [id, 90]))
  };
  const blocked = applyLessonCompletion(progress, "l04-first-sentences", 90);
  assert.equal(blocked.wasUnlocked, false);
  assert.equal(blocked.next.completedLessons.includes("l04-first-sentences"), false);
  assert.equal(blocked.next.previewLessonScores["l04-first-sentences"], 90);

  const ready = applyLessonCompletion({
    ...progress,
    masteredHangul: hangulGroups.flatMap((group) => group.items.map((item) => item.id)).slice(0, 28),
    learnedVocab: vocab.slice(0, 16).map((item) => item.id)
  }, "l04-first-sentences", 90);
  assert.equal(ready.wasUnlocked, true);
  assert.equal(ready.next.completedLessons.includes("l04-first-sentences"), true);
  assert.equal(getCoreLibraryGate(lessons.find((item) => item.id === "l04-first-sentences"), {
    ...emptyCounts,
    hangul: 28,
    vocab: 16
  }).ok, true);
});

test("guided desk puts library repair above the next lesson when m1 is gated", () => {
  const progress = {
    ...defaultProgress(),
    completedLessons: ["l01-hangul-map", "l02-vowels", "l31-compound-vowels", "l03-consonants", "l32-tense-aspirated", "l33-batchim", "l46-syllable-fluency", "l47-double-batchim"],
    lessonScores: Object.fromEntries([
      "l01-hangul-map", "l02-vowels", "l31-compound-vowels", "l03-consonants", "l32-tense-aspirated", "l33-batchim", "l46-syllable-fluency", "l47-double-batchim"
    ].map((id) => [id, 90]))
  };
  const workspace = buildLearningWorkspace({ ...defaultProfile(), studyMode: "guided" }, progress, 0);
  assert.equal(workspace.nextLesson?.id, "l04-first-sentences");
  assert.equal(workspace.recommended[0].id, "system:library-hangul");
  assert.equal(workspace.recommended.some((task) => task.href === "/learn/l04-first-sentences"), true);
});

test("libraryCountsForWrite ignores raw material completions without evidence", () => {
  const counts = libraryCountsForWrite({
    ...defaultProgress(),
    completedMaterials: ["im-cafe-real-speed"]
  });
  assert.equal(counts.materials, 0);
});

test("libraryCountsFromProgress ignores stale ids", () => {
  const counts = libraryCountsFromProgress({
    ...defaultProgress(),
    masteredHangul: ["missing", "v-a"],
    learnedVocab: ["missing"],
    learnedGrammar: ["missing"]
  });
  assert.equal(counts.hangul, 1);
  assert.equal(counts.vocab, 0);
  assert.equal(counts.grammar, 0);
});
