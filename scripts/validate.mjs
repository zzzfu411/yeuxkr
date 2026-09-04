import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { getLessonPrerequisites, getNextLesson, lessons, milestones, normalizeTeachEntry, UNLOCK_SCORE } from "../src/data/curriculum.js";
import { grammarPoints } from "../src/data/grammar.js";
import { hangulGroups, pronunciationPairs, syllableLabs } from "../src/data/hangul.js";
import { soundChangeRules } from "../src/data/sound-changes.js";
import { vocab, vocabCategories, vocabLevels, vocabPosLabels } from "../src/data/lexicon.js";
import { nuanceSets } from "../src/data/nuance.js";
import { pragmaticScenarios } from "../src/data/pragmatics.js";
import { immersionMaterials, outputRubric } from "../src/data/materials.ts";
import { nativeRoadmapPrinciples, nativeRoadmapStages, nativeRoadmapTotals } from "../src/data/native-roadmap.js";
import { studyModes, selfStudyGoals, selfStudyIntensity, selfStudyFocus, buildSelfStudyPlan } from "../src/data/self-study.js";
import { proficiencyLevels, proficiencyMetrics } from "../src/data/proficiency.js";
import { visualAssets } from "../src/data/visuals/assets.ts";
import { visualAssetManifest } from "../src/data/visuals/manifest.ts";
import { BUNDLED_SPEECH_ASSETS } from "../src/data/speech-assets.generated.js";
import { isStudyModuleId, moduleToAbility, studyModuleDescriptors } from "../src/lib/learning/modules.js";
import { buildMixedQuiz, buildProgressQuiz, buildReviewQuestions, lessonQuestions } from "../src/lib/learning/quiz.ts";
import { lessonReviewCardId, materialCardId, outputCardId, outputTransferQuestionId } from "../src/lib/learning/ids.ts";
import { hasKoreanText, mapFocusToAbilities, requiresKoreanOutput, unknownFocusTags } from "../src/lib/learning/evidence.ts";
import { mapCardToAbilities, normalizeLearningProgress } from "../src/lib/learning/workspace.ts";

const errors = [];
const knownAppRoutes = new Set([
  "/", "/onboarding", "/settings", "/path", "/self-study", "/hangul", "/vocabulary", "/grammar",
  "/native", "/immersion", "/review", "/mistakes", "/quiz"
]);

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function pngDimensions(file) {
  if (!existsSync(file)) return null;
  const bytes = readFileSync(file);
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (!isPng || bytes.length < 24) return null;
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function webpDimensions(file) {
  if (!existsSync(file)) return null;
  const bytes = readFileSync(file);
  const isWebp =
    bytes.length >= 20 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP";
  if (!isWebp) return null;

  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const chunkType = bytes.toString("ascii", offset, offset + 4);
    const chunkSize = bytes.readUInt32LE(offset + 4);
    const dataOffset = offset + 8;
    if (dataOffset + chunkSize > bytes.length) return null;

    if (chunkType === "VP8X" && chunkSize >= 10) {
      return {
        width: readUInt24LE(bytes, dataOffset + 4) + 1,
        height: readUInt24LE(bytes, dataOffset + 7) + 1
      };
    }

    if (chunkType === "VP8L" && chunkSize >= 5 && bytes[dataOffset] === 0x2f) {
      const bits = bytes.readUInt32LE(dataOffset + 1);
      return {
        width: (bits & 0x3fff) + 1,
        height: ((bits >> 14) & 0x3fff) + 1
      };
    }

    if (chunkType === "VP8 " && chunkSize >= 10) {
      const hasStartCode = bytes[dataOffset + 3] === 0x9d && bytes[dataOffset + 4] === 0x01 && bytes[dataOffset + 5] === 0x2a;
      if (!hasStartCode) return null;
      return {
        width: bytes.readUInt16LE(dataOffset + 6) & 0x3fff,
        height: bytes.readUInt16LE(dataOffset + 8) & 0x3fff
      };
    }

    offset = dataOffset + chunkSize + (chunkSize % 2);
  }
  return null;
}

function readUInt24LE(bytes, offset) {
  return bytes[offset] + (bytes[offset + 1] << 8) + (bytes[offset + 2] << 16);
}

function parseSquareSize(value) {
  const match = String(value ?? "").match(/^(\d+)x(\d+)$/);
  if (!match) return null;
  return { width: Number(match[1]), height: Number(match[2]) };
}

function assertReadableUiText(value, label) {
  if (typeof value !== "string") return;
  const damaged = /�|Ã.|Â.|(?:鏄|绂|闊|瀛|璇|妫|褰|绗|姣|淇|杈|寮|頃|鞎|韽|欤|瓴|臧|勳|毽|雲)/.test(value);
  assert(!damaged, `${label} looks encoding-damaged: ${value}`);
}

function unique(items, label) {
  const seen = new Set();
  for (const item of items) {
    assert(!seen.has(item), `${label} duplicate id: ${item}`);
    seen.add(item);
  }
}

unique(lessons.map((item) => item.id), "lesson");
unique(milestones.map((item) => item.id), "milestone");
unique(grammarPoints.map((item) => item.id), "grammar");
unique(vocab.map((item) => item.id), "vocab");
unique(hangulGroups.flatMap((group) => group.items.map((item) => item.id)), "hangul");
unique(studyModes.map((item) => item.id), "study mode");
unique(selfStudyGoals.map((item) => item.id), "self-study goal");
unique(selfStudyIntensity.map((item) => item.id), "self-study intensity");
unique(selfStudyFocus.map((item) => item.id), "self-study focus");
unique(proficiencyLevels.map((item) => item.id), "proficiency level");
unique(immersionMaterials.map((item) => item.id), "immersion material");
unique(outputRubric.map((item) => item.id), "output rubric");
unique(nativeRoadmapStages.map((item) => item.id), "native roadmap stage");

const milestoneIds = new Set(milestones.map((item) => item.id));
const lessonIds = new Set(lessons.map((item) => item.id));
const levelIds = new Set(vocabLevels.map((item) => item.id));
const categoryIds = new Set(vocabCategories.map((item) => item.id));
const knownStudyModules = new Set(Object.keys(studyModuleDescriptors));

assert(lessons.length >= 60, `curriculum should have at least 60 lessons, found ${lessons.length}`);
assert(vocab.length >= 650, `vocab should have at least 650 entries, found ${vocab.length}`);
assert(grammarPoints.length >= 80, `grammar should have at least 80 points, found ${grammarPoints.length}`);
assert(pragmaticScenarios.length >= 16, `pragmatics should have at least 16 scenarios, found ${pragmaticScenarios.length}`);
assert(nuanceSets.length >= 10, `nuance should have at least 10 sets, found ${nuanceSets.length}`);
assert(immersionMaterials.length >= 28, `immersion should have at least 28 materials, found ${immersionMaterials.length}`);
assert(outputRubric.length >= 4, `output rubric should have at least 4 criteria, found ${outputRubric.length}`);
assert(proficiencyLevels.length >= 6, `proficiency passport should have at least 6 levels, found ${proficiencyLevels.length}`);
assert(nativeRoadmapStages.length >= 3, `native roadmap should have at least 3 expansion stages, found ${nativeRoadmapStages.length}`);
assert(nativeRoadmapPrinciples.length >= 4, `native roadmap should explain learning principles, found ${nativeRoadmapPrinciples.length}`);

const bundledSpeechEntries = Object.entries(BUNDLED_SPEECH_ASSETS);
const speechManifestFile = "public/assets/audio/ko/manifest.json";
let speechManifest = null;
try {
  speechManifest = JSON.parse(readFileSync(speechManifestFile, "utf8"));
} catch {
  assert(false, `bundled speech manifest should be readable JSON: ${speechManifestFile}`);
}
const manifestSpeechEntries = Array.isArray(speechManifest?.assets) ? speechManifest.assets : [];
const manifestSpeechMap = new Map(manifestSpeechEntries.map((item) => [item?.text, item?.file]));
const invalidSpeechPaths = bundledSpeechEntries.filter(([, asset]) => !/^\/assets\/audio\/ko\/[a-f0-9]{20}\.mp3$/.test(asset));
const missingSpeechAssets = bundledSpeechEntries.filter(([, asset]) => !existsSync(`public${asset}`));
const smallSpeechAssets = bundledSpeechEntries.filter(([, asset]) => {
  const file = `public${asset}`;
  return existsSync(file) && statSync(file).size <= 1024;
});
const invalidSpeechBytes = bundledSpeechEntries.filter(([, asset]) => {
  const file = `public${asset}`;
  if (!existsSync(file) || statSync(file).size <= 1024) return false;
  const bytes = readFileSync(file);
  const hasId3 = bytes.toString("ascii", 0, 3) === "ID3";
  const hasMpegFrame = bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0;
  return !hasId3 && !hasMpegFrame;
});
const mismatchedSpeechManifest = bundledSpeechEntries.filter(([text, asset]) => manifestSpeechMap.get(text) !== asset.split("/").at(-1));
const invalidHangulSpeechAssets = hangulGroups.flatMap((group) => group.items).filter((item) => {
  const asset = BUNDLED_SPEECH_ASSETS[item.sound];
  if (!/^\/assets\/audio\/ko\/[a-f0-9]{20}\.mp3$/.test(asset ?? "")) return true;
  const file = `public${asset}`;
  return !existsSync(file) || !statSync(file).isFile() || statSync(file).size === 0;
});

assert(bundledSpeechEntries.length >= 1000, `bundled speech corpus should cover at least 1000 Korean prompts, found ${bundledSpeechEntries.length}`);
assert(manifestSpeechEntries.length === bundledSpeechEntries.length, `speech manifest should contain ${bundledSpeechEntries.length} assets, found ${manifestSpeechEntries.length}`);
assert(!invalidSpeechPaths.length, `bundled speech has invalid asset paths: ${invalidSpeechPaths.slice(0, 5).map(([text]) => text).join(", ")}`);
assert(!missingSpeechAssets.length, `bundled speech is missing ${missingSpeechAssets.length} MP3 files; first: ${missingSpeechAssets.slice(0, 5).map(([text]) => text).join(", ")}`);
assert(!smallSpeechAssets.length, `bundled speech has ${smallSpeechAssets.length} empty or truncated MP3 files; first: ${smallSpeechAssets.slice(0, 5).map(([text]) => text).join(", ")}`);
assert(!invalidSpeechBytes.length, `bundled speech has ${invalidSpeechBytes.length} invalid MP3 files; first: ${invalidSpeechBytes.slice(0, 5).map(([text]) => text).join(", ")}`);
assert(!mismatchedSpeechManifest.length, `speech manifest disagrees with the runtime map for ${mismatchedSpeechManifest.length} entries`);
assert(
  !invalidHangulSpeechAssets.length,
  `every Hangul sound should map to an existing nonempty MP3; invalid ${invalidHangulSpeechAssets.length}: ${invalidHangulSpeechAssets.slice(0, 15).map((item) => `${item.id}=${item.sound}`).join(", ")}`
);

const lessonOrders = [...lessons].sort((a, b) => a.order - b.order);
for (let index = 0; index < lessonOrders.length; index += 1) {
  assert(lessonOrders[index].order === index + 1, `lesson order should be continuous at ${index + 1}`);
}
for (let index = 1; index < lessonOrders.length; index += 1) {
  const lesson = lessonOrders[index];
  const previousLesson = lessonOrders[index - 1];
  const prerequisites = getLessonPrerequisites(lesson.id);
  const prerequisiteIds = new Set(prerequisites.map((item) => item.id));
  const explicitPrerequisites = lessons.filter((item) => item.order < lesson.order && item.unlocks?.includes(lesson.id));

  assert(prerequisiteIds.has(previousLesson.id), `lesson ${lesson.id} should require previous lesson ${previousLesson.id}`);
  assert(prerequisiteIds.size === prerequisites.length, `lesson ${lesson.id} prerequisites should be unique`);
  for (const explicit of explicitPrerequisites) {
    assert(prerequisiteIds.has(explicit.id), `lesson ${lesson.id} should preserve explicit prerequisite ${explicit.id}`);
  }
}
for (const skippedId of ["l40-requests", "l41-irregulars", "l42-ability-obligation", "l44-passive-causative"]) {
  const skippedLesson = lessons.find((item) => item.id === skippedId);
  const successor = lessonOrders[skippedLesson.order];
  assert(
    getLessonPrerequisites(successor.id).some((item) => item.id === skippedLesson.id),
    `lesson ${successor.id} should not allow skipping ${skippedLesson.id}`
  );
}

const finalLesson = lessonOrders.at(-1);
const finalPrerequisiteClosure = new Set();
const pendingPrerequisites = finalLesson ? [finalLesson] : [];
while (pendingPrerequisites.length) {
  const lesson = pendingPrerequisites.pop();
  for (const prerequisite of getLessonPrerequisites(lesson.id)) {
    if (finalPrerequisiteClosure.has(prerequisite.id)) continue;
    finalPrerequisiteClosure.add(prerequisite.id);
    pendingPrerequisites.push(prerequisite);
  }
}
for (const prerequisite of lessonOrders.slice(0, -1)) {
  assert(
    finalPrerequisiteClosure.has(prerequisite.id),
    `mastering final lesson ${finalLesson?.id} should require prior lesson ${prerequisite.id}`
  );
}
const milestoneOrder = new Map(milestones.map((item, index) => [item.id, index]));
for (let index = 1; index < lessonOrders.length; index += 1) {
  const previous = milestoneOrder.get(lessonOrders[index - 1].milestone) ?? 0;
  const current = milestoneOrder.get(lessonOrders[index].milestone) ?? 0;
  assert(current >= previous, `lesson ${lessonOrders[index].id} moves milestone backward after ${lessonOrders[index - 1].id}`);
}
for (const milestone of milestones) {
  assert(lessons.some((lesson) => lesson.milestone === milestone.id), `milestone ${milestone.id} has no lessons`);
}

const simulatedCompleted = new Set();
const simulatedScores = {};
const simulatedVisitOrder = [];
for (let index = 0; index < lessons.length; index += 1) {
  const lesson = getNextLesson(simulatedCompleted, simulatedScores);
  assert(Boolean(lesson), `curriculum traversal stopped after ${simulatedVisitOrder.length} lessons`);
  if (!lesson) break;
  assert(!simulatedCompleted.has(lesson.id), `curriculum traversal repeated lesson ${lesson.id}`);
  simulatedVisitOrder.push(lesson.id);
  simulatedCompleted.add(lesson.id);
  simulatedScores[lesson.id] = UNLOCK_SCORE;
}
assert(simulatedVisitOrder.length === lessons.length, `curriculum traversal should reach all ${lessons.length} lessons, reached ${simulatedVisitOrder.length}`);
assert(simulatedVisitOrder.join(",") === lessonOrders.map((lesson) => lesson.id).join(","), "curriculum traversal should follow lesson order without gaps");

for (const lesson of lessons) {
  assert(milestoneIds.has(lesson.milestone), `lesson ${lesson.id} references missing milestone ${lesson.milestone}`);
  assert(mapFocusToAbilities(lesson.focus ?? []).length > 0, `lesson ${lesson.id} focus should map to at least one ability`);
  for (const tag of unknownFocusTags(lesson.focus ?? [])) {
    assert(false, `lesson ${lesson.id} has unknown focus tag ${tag}`);
  }
  assert(lesson.title && lesson.subtitle, `lesson ${lesson.id} missing title/subtitle`);
  assert(lesson.objectives?.length >= 2, `lesson ${lesson.id} needs objectives`);
  assert(lesson.duration >= 16 && lesson.duration <= 32, `lesson ${lesson.id} duration should be 16-32 minutes, found ${lesson.duration}`);
  assert(lesson.teach?.length >= 6, `lesson ${lesson.id} needs at least 6 teach cards, found ${lesson.teach?.length}`);
  assert(lesson.teach.every((entry) => typeof entry === "object" && entry !== null), `lesson ${lesson.id} teach entries should all use the object form`);
  assert(lesson.teach.filter((entry) => typeof entry === "object" && entry?.speak).length >= 2, `lesson ${lesson.id} needs at least 2 teach cards with audio`);
  assert(lesson.teach.some((entry) => typeof entry === "object" && entry?.examples?.length), `lesson ${lesson.id} needs at least 1 teach card with examples`);
  for (const rawTeach of lesson.teach ?? []) {
    const entry = normalizeTeachEntry(rawTeach);
    assert(typeof entry.body === "string" && entry.body.trim(), `lesson ${lesson.id} has a teach entry without body text`);
    if (typeof rawTeach === "object" && rawTeach?.speak !== undefined) {
      assert(hasKoreanText(rawTeach.speak), `lesson ${lesson.id} teach speak "${rawTeach.speak}" should contain Korean`);
    }
    for (const example of entry.examples ?? []) {
      assert(hasKoreanText(example.ko) && example.zh, `lesson ${lesson.id} teach example needs Korean text and Chinese gloss`);
    }
  }
  assert(lesson.drills?.length >= 8, `lesson ${lesson.id} needs at least 8 drills, found ${lesson.drills?.length}`);
  assert(lesson.drills.filter((drill) => drill.type === "choice").length >= 2, `lesson ${lesson.id} needs at least 2 choice drills`);
  assert(lesson.drills.some((drill) => drill.type === "listen" || drill.type === "dictation"), `lesson ${lesson.id} needs a listening drill (listen or dictation)`);
  assert(lesson.drills.some((drill) => drill.type === "cloze"), `lesson ${lesson.id} needs a cloze drill`);
  assert(lesson.drills.some((drill) => drill.type === "type" || drill.type === "translate"), `lesson ${lesson.id} needs a production drill (type or translate)`);
  for (const drill of lesson.drills) {
    assert(drill.prompt && drill.answer && drill.explain, `lesson ${lesson.id} has incomplete drill`);
    assert(["choice", "listen", "type", "dictation", "cloze", "translate"].includes(drill.type), `lesson ${lesson.id} drill "${drill.prompt}" has invalid type ${drill.type}`);
    if (drill.type === "choice" || drill.type === "listen") {
      assert(drill.choices?.length >= 2, `lesson ${lesson.id} drill "${drill.prompt}" needs choices`);
      assert(drill.choices?.includes(drill.answer), `lesson ${lesson.id} drill "${drill.prompt}" missing correct choice`);
    }
    if (drill.type === "listen" || drill.type === "dictation") {
      assert(typeof drill.speak === "string" && drill.speak.trim(), `lesson ${lesson.id} drill "${drill.prompt}" needs speak audio text`);
    }
    if (drill.type === "dictation") {
      assert(!drill.prompt.includes(drill.answer), `lesson ${lesson.id} dictation "${drill.prompt}" should not reveal the answer in the prompt`);
    }
    if (drill.type === "cloze") {
      assert(typeof drill.clozeText === "string" && drill.clozeText.includes("___"), `lesson ${lesson.id} cloze "${drill.prompt}" needs clozeText with a ___ blank`);
      if (drill.choices?.length) {
        assert(drill.choices.includes(drill.answer), `lesson ${lesson.id} cloze "${drill.prompt}" missing correct choice`);
      }
    }
    if (drill.type === "translate") {
      assert(Array.isArray(drill.acceptable) && drill.acceptable.length >= 1, `lesson ${lesson.id} translate "${drill.prompt}" needs at least one acceptable answer`);
    }
  }
  for (const unlock of lesson.unlocks ?? []) {
    assert(lessonIds.has(unlock), `lesson ${lesson.id} unlocks missing lesson ${unlock}`);
    const target = lessons.find((item) => item.id === unlock);
    assert(!target || target.order > lesson.order, `lesson ${lesson.id} unlocks non-forward lesson ${unlock}`);
  }
}

for (const goal of selfStudyGoals) {
  for (const moduleId of goal.emphasis ?? []) {
    assert(isStudyModuleId(moduleId), `self-study goal ${goal.id} references unknown module ${moduleId}`);
    assert(Boolean(moduleToAbility(moduleId)), `self-study goal ${goal.id} module ${moduleId} should map to an ability`);
  }
}
for (const focus of selfStudyFocus) {
  for (const moduleId of focus.modules ?? []) {
    assert(isStudyModuleId(moduleId), `self-study focus ${focus.id} references unknown module ${moduleId}`);
    assert(Boolean(moduleToAbility(moduleId)), `self-study focus ${focus.id} module ${moduleId} should map to an ability`);
  }
}

const reviewQuestionIds = new Set();
for (const lesson of lessons) {
  const questions = lessonQuestions(lesson.id);
  assert(questions.length === lesson.drills.length, `lesson ${lesson.id} should generate one review question per drill`);
  for (const [index, question] of questions.entries()) {
    const expectedId = lesson.drills[index]?.id ?? lessonReviewCardId(lesson.id, index);
    assert(question.id === expectedId, `lesson ${lesson.id} review question ${index + 1} should use stable id ${expectedId}`);
    assert(!reviewQuestionIds.has(question.id), `lesson review question duplicate id: ${question.id}`);
    reviewQuestionIds.add(question.id);
    if (question.type === "choice" || question.type === "listen") {
      assert(question.choices?.includes(question.answer), `lesson review question ${question.id} missing correct choice`);
    }
    const reviewCards = buildReviewQuestions([{
      id: question.id,
      box: 0,
      dueAt: 0,
      correct: 0,
      wrong: 0,
      lastSeenAt: null,
      payload: {
        kind: "lesson",
        itemId: question.id,
        type: question.type,
        prompt: question.prompt,
        answer: question.answer,
        acceptable: question.acceptable,
        choices: question.choices,
        explain: question.explain,
        speak: question.speak
      }
    }]);
    assert(reviewCards.length === 1, `lesson review card ${question.id} should become a review question`);
  }
}

for (const item of vocab) {
  assert(levelIds.has(item.level), `vocab ${item.id} invalid level ${item.level}`);
  assert(categoryIds.has(item.category), `vocab ${item.id} invalid category ${item.category}`);
  assert(item.korean && item.meaning && item.example && item.note, `vocab ${item.id} incomplete`);
  assert(hasKoreanText(item.example), `vocab ${item.id} example should contain Korean`);
}
const vocabByLevel = vocab.reduce((counts, item) => {
  counts[item.level] = (counts[item.level] ?? 0) + 1;
  return counts;
}, {});
const vocabByCategory = vocab.reduce((counts, item) => {
  counts[item.category] = (counts[item.category] ?? 0) + 1;
  return counts;
}, {});
assert(vocabByLevel.survival >= 40, `vocab should include at least 40 survival entries, found ${vocabByLevel.survival ?? 0}`);
assert(vocabByLevel.daily >= 32, `vocab should include at least 32 daily entries, found ${vocabByLevel.daily ?? 0}`);
assert(vocabByLevel.native >= 14, `vocab should include at least 14 native entries, found ${vocabByLevel.native ?? 0}`);
for (const category of vocabCategories) {
  assert((vocabByCategory[category.id] ?? 0) >= 6, `vocab category ${category.id} should include at least 6 entries, found ${vocabByCategory[category.id] ?? 0}`);
}

for (const point of grammarPoints) {
  assert(point.examples?.length > 0, `grammar ${point.id} needs examples`);
  assert(point.pattern && point.explanation, `grammar ${point.id} incomplete`);
  const firstExample = point.examples?.[0];
  assert(firstExample?.ko && firstExample?.zh, `grammar ${point.id} first example needs ko/zh for review`);
  const reviewCards = buildReviewQuestions([{
    id: `grammar:${point.id}`,
    box: 0,
    dueAt: 0,
    correct: 0,
    wrong: 0,
    lastSeenAt: null,
    payload: { kind: "grammar", itemId: point.id }
  }]);
  assert(reviewCards.length === 1, `grammar ${point.id} should become a review question`);
  assert(reviewCards[0].answer && reviewCards[0].choices?.includes(reviewCards[0].answer), `grammar ${point.id} review question should include its answer`);
}

for (const group of hangulGroups) {
  assert(group.items.length > 0, `hangul group ${group.id} empty`);
  for (const item of group.items) {
    assert(item.glyph && item.romanization && item.example, `hangul ${item.id} incomplete`);
  }
}

const hangulGlyphs = new Set(hangulGroups.flatMap((group) => group.items.map((item) => item.glyph)));
for (const compoundVowel of ["ㅐ", "ㅔ", "ㅒ", "ㅖ", "ㅘ", "ㅙ", "ㅚ", "ㅝ", "ㅞ", "ㅟ", "ㅢ"]) {
  assert(hangulGlyphs.has(compoundVowel), `hangul should teach compound vowel ${compoundVowel}`);
}
const compoundVowelGroup = hangulGroups.find((group) => group.id === "vowels-compound");
assert(Boolean(compoundVowelGroup), "hangul should keep a dedicated compound vowel group");
for (const item of compoundVowelGroup?.items ?? []) {
  assert(Array.isArray(item.parts) && item.parts.length >= 2, `compound vowel ${item.id} should list its component parts`);
}
assert(pronunciationPairs.length >= 9, `pronunciation pairs should cover compound vowels too, found ${pronunciationPairs.length}`);
assert(syllableLabs.some((lab) => ["ㅘ", "ㅙ", "ㅚ", "ㅝ", "ㅞ", "ㅟ", "ㅢ"].some((glyph) => lab.blocks.includes(glyph))), "syllable labs should demonstrate a compound vowel block");

unique(soundChangeRules.map((rule) => rule.id), "sound change rule");
assert(soundChangeRules.length >= 7, `sound change lab should cover the seven core rules, found ${soundChangeRules.length}`);
for (const rule of soundChangeRules) {
  assert(rule.korean && rule.title && rule.summary && rule.rule, `sound change ${rule.id} incomplete`);
  assert(["foundation", "growth"].includes(rule.stage), `sound change ${rule.id} has invalid stage ${rule.stage}`);
  assert(rule.examples?.length >= 2, `sound change ${rule.id} needs at least 2 examples`);
  for (const example of rule.examples ?? []) {
    assert(hasKoreanText(example.written) && hasKoreanText(example.spoken), `sound change ${rule.id} example needs Korean written/spoken forms`);
    assert(example.speak === example.written, `sound change ${rule.id} example ${example.written} should speak its written form so TTS applies the change`);
    assert(example.romanization && example.zh, `sound change ${rule.id} example ${example.written} needs romanization and Chinese gloss`);
  }
}

const vocabIdSetForRefs = new Set(vocab.map((item) => item.id));
const soundChangeRuleIds = new Set(soundChangeRules.map((rule) => rule.id));
const grammarIdSetForRefs = new Set(grammarPoints.map((point) => point.id));
const vocabCategoryCounts = {};
for (const item of vocab) {
  vocabCategoryCounts[item.category] = (vocabCategoryCounts[item.category] ?? 0) + 1;
  assert(Boolean(vocabPosLabels[item.pos]), `vocab ${item.id} needs a valid pos, found ${item.pos}`);
  for (const confusable of item.confusables ?? []) {
    assert(vocabIdSetForRefs.has(confusable), `vocab ${item.id} confusable ${confusable} does not exist`);
    assert(confusable !== item.id, `vocab ${item.id} lists itself as a confusable`);
  }
  if (item.soundChangeRuleId !== undefined) {
    assert(soundChangeRuleIds.has(item.soundChangeRuleId), `vocab ${item.id} references unknown sound change rule ${item.soundChangeRuleId}`);
  }
  for (const collocation of item.collocations ?? []) {
    assert(hasKoreanText(collocation.ko) && collocation.zh, `vocab ${item.id} collocation needs Korean text and Chinese gloss`);
  }
}
for (const category of vocabCategories) {
  assert((vocabCategoryCounts[category.id] ?? 0) >= 12, `vocab category ${category.id} should have at least 12 entries, found ${vocabCategoryCounts[category.id] ?? 0}`);
}
assert(vocab.filter((item) => item.collocations?.length).length >= 90, `at least 90 vocab entries should carry collocations, found ${vocab.filter((item) => item.collocations?.length).length}`);
for (const point of grammarPoints) {
  assert(point.examples?.length >= 3, `grammar ${point.id} needs at least 3 examples, found ${point.examples?.length}`);
  for (const confusable of point.confusables ?? []) {
    assert(grammarIdSetForRefs.has(confusable), `grammar ${point.id} confusable ${confusable} does not exist`);
    assert(confusable !== point.id, `grammar ${point.id} lists itself as a confusable`);
  }
}

for (const scene of pragmaticScenarios) {
  assert(scene.lines?.length >= 2, `scenario ${scene.id} needs lines`);
  assert(scene.nativeMove, `scenario ${scene.id} needs nativeMove`);
  assert(scene.lines[0]?.ko && scene.lines[0]?.zh, `scenario ${scene.id} first line needs ko/zh for review`);
  const reviewCards = buildReviewQuestions([{
    id: `native:pragmatics:${scene.id}`,
    box: 0,
    dueAt: 0,
    correct: 0,
    wrong: 0,
    lastSeenAt: null,
    payload: { kind: "native", itemId: `pragmatics:${scene.id}` }
  }]);
  assert(reviewCards.length === 1, `scenario ${scene.id} should become a native review question`);
  assert(reviewCards[0].answer && reviewCards[0].choices?.includes(reviewCards[0].answer), `scenario ${scene.id} review question should include its answer`);
}

for (const set of nuanceSets) {
  assert(set.contrast?.length >= 2, `nuance ${set.id} needs contrast`);
  assert(set.examples?.[0]?.ko && set.examples?.[0]?.register, `nuance ${set.id} first example needs ko/register for review`);
  assert(set.examples[0].distractors?.length >= 3, `nuance ${set.id} first example needs explicit, mutually exclusive quiz distractors`);
  assert(!set.examples[0].distractors.includes(set.examples[0].register), `nuance ${set.id} distractors should not repeat the answer`);
  assert(new Set(set.examples[0].distractors).size === set.examples[0].distractors.length, `nuance ${set.id} distractors should be unique`);
  const reviewCards = buildReviewQuestions([{
    id: `native:nuance:${set.id}`,
    box: 0,
    dueAt: 0,
    correct: 0,
    wrong: 0,
    lastSeenAt: null,
    payload: { kind: "native", itemId: `nuance:${set.id}` }
  }]);
  assert(reviewCards.length === 1, `nuance ${set.id} should become a native review question`);
  assert(reviewCards[0].answer && reviewCards[0].choices?.includes(reviewCards[0].answer), `nuance ${set.id} review question should include its answer`);
}

for (const material of immersionMaterials) {
  assert(material.title && material.summary && material.outputMission, `immersion ${material.id} incomplete`);
  assert(["foundation", "growth", "native"].includes(material.level), `immersion ${material.id} has invalid level ${material.level}`);
  assert(["dialogue", "news", "social", "essay"].includes(material.kind), `immersion ${material.id} has invalid kind ${material.kind}`);
  assert(Number(material.minutes) >= 10, `immersion ${material.id} should have realistic minutes`);
  assert(material.focus?.length >= 2, `immersion ${material.id} needs at least 2 focus tags`);
  assert(mapFocusToAbilities(material.focus ?? []).length > 0, `immersion ${material.id} focus should map to at least one ability`);
  for (const tag of unknownFocusTags(material.focus ?? [])) {
    assert(false, `immersion ${material.id} has unknown focus tag ${tag}`);
  }
  assert(material.lines?.length >= 3, `immersion ${material.id} needs at least 3 lines`);
  assert(material.dictation?.length >= 2, `immersion ${material.id} needs dictation prompts`);
  assert(material.retellPrompts?.length >= 2, `immersion ${material.id} needs retell prompts`);
  assert(material.recommendedLessons?.length >= 2, `immersion ${material.id} needs recommended lesson links`);
  assert(material.selfCheck?.length >= 3, `immersion ${material.id} needs self-check points`);
  assert(material.lines.every((line) => hasKoreanText(line.ko) && line.zh && line.note), `immersion ${material.id} needs Korean lines with zh/note`);
  assert(material.dictation.every((item) => hasKoreanText(item)), `immersion ${material.id} dictation prompts should contain Korean`);
  assert(requiresKoreanOutput(material.outputMission), `immersion ${material.id} output mission should require Korean output`);
  for (const lessonId of material.recommendedLessons ?? []) {
    assert(lessonIds.has(lessonId), `immersion ${material.id} references missing recommended lesson ${lessonId}`);
  }
}
const materialsByLevel = immersionMaterials.reduce((counts, material) => {
  counts[material.level] = (counts[material.level] ?? 0) + 1;
  return counts;
}, {});
assert(materialsByLevel.foundation >= 5, `immersion should include at least 5 foundation materials, found ${materialsByLevel.foundation ?? 0}`);
assert(materialsByLevel.growth >= 6, `immersion should include at least 6 growth materials, found ${materialsByLevel.growth ?? 0}`);
assert(materialsByLevel.native >= 5, `immersion should include at least 5 native materials, found ${materialsByLevel.native ?? 0}`);

for (const goal of selfStudyGoals) {
  const plan = buildSelfStudyPlan({ selfStudyGoal: goal.id, selfStudyIntensity: "steady", selfStudyFocus: "balanced", minutesGoal: 30 });
  assert(plan.phases.length === 4, `self-study goal ${goal.id} should generate 4 phases`);
  assert(plan.dailyTemplate.length >= 4, `self-study goal ${goal.id} needs daily template`);
  assert(plan.weeklyRhythm.length === 7, `self-study goal ${goal.id} needs 7-day rhythm`);
  assert(plan.checkpoints.length >= 4, `self-study goal ${goal.id} needs checkpoints`);
}
for (const goal of selfStudyGoals) {
  for (const intensity of selfStudyIntensity) {
    for (const focus of selfStudyFocus) {
      for (const minutesGoal of [5, 15, 30, 60, 120, -1, Number.NaN]) {
        const plan = buildSelfStudyPlan({
          selfStudyGoal: goal.id,
          selfStudyIntensity: intensity.id,
          selfStudyFocus: focus.id,
          minutesGoal
        });
        const templateMinutes = plan.dailyTemplate.reduce((sum, item) => sum + item.minutes, 0);
        assert(plan.modules.slice(0, 2).map((module) => module.id).join(",") === "script,listening", `self-study ${goal.id}/${intensity.id}/${focus.id} should preserve zero-basis foundation spine`);
        assert(plan.minutesGoal >= 5 && plan.minutesGoal <= 120, `self-study ${goal.id}/${intensity.id}/${focus.id} should clamp daily minutes, found ${plan.minutesGoal}`);
        assert(plan.weeklyHours > 0, `self-study ${goal.id}/${intensity.id}/${focus.id} should produce positive weekly hours`);
        assert(templateMinutes === plan.minutesGoal, `self-study ${goal.id}/${intensity.id}/${focus.id} daily template should sum to ${plan.minutesGoal}, found ${templateMinutes}`);
        assert(plan.weeklyRhythm.filter((day) => day.active).length === intensity.daysPerWeek, `self-study ${goal.id}/${intensity.id}/${focus.id} should honor active days`);
        assert(plan.modules.every((module) => knownStudyModules.has(module.id)), `self-study ${goal.id}/${intensity.id}/${focus.id} should only generate known modules`);
        assert(plan.modules.every((module) => module.href?.startsWith("/")), `self-study ${goal.id}/${intensity.id}/${focus.id} modules should link to routes`);
        assert(plan.modules.every((module) => Boolean(moduleToAbility(module.id))), `self-study ${goal.id}/${intensity.id}/${focus.id} modules should map to abilities`);
        assert(plan.phases.every((phase) => phase.modules.every((module) => knownStudyModules.has(module.id))), `self-study ${goal.id}/${intensity.id}/${focus.id} phases should only use known modules`);
        assert(plan.checkpoints.every((checkpoint) => checkpoint.abilities?.length > 0), `self-study ${goal.id}/${intensity.id}/${focus.id} checkpoints should expose ability evidence`);
      }
    }
  }
}

for (const level of proficiencyLevels) {
  assert(level.band && level.title && level.summary, `proficiency level ${level.id} incomplete`);
  assert(Array.isArray(level.requirements), `proficiency level ${level.id} needs requirements`);
  for (const requirement of level.requirements) {
    assert(proficiencyMetrics[requirement.metric], `proficiency level ${level.id} references unknown metric ${requirement.metric}`);
    assert(Number(requirement.target) > 0 || requirement.target === 0, `proficiency level ${level.id} has invalid target for ${requirement.metric}`);
  }
  if (level.expansionOnly) {
    assert(level.roadmapTargets?.length >= 3, `expansion proficiency level ${level.id} needs roadmap targets`);
  }
}

let previousRoadmap = { vocabulary: 0, collocations: 0, native: 0, materials: 0, outputTasks: 0, checkpoints: 0 };
for (const stage of nativeRoadmapStages) {
  assert(stage.band && stage.title && stage.target && stage.weeks, `native roadmap stage ${stage.id} incomplete`);
  assert(stage.domains?.length >= 4, `native roadmap stage ${stage.id} needs domains`);
  assert(stage.gates?.length >= 3, `native roadmap stage ${stage.id} needs quality gates`);
  assert(stage.todayActions?.length >= 3, `native roadmap stage ${stage.id} needs executable today actions`);
  for (const action of stage.todayActions ?? []) {
    assert(action.title && action.task && action.href?.startsWith("/"), `native roadmap stage ${stage.id} has invalid today action`);
  }
  for (const key of Object.keys(previousRoadmap)) {
    assert(Number(stage.deliverables?.[key]) > previousRoadmap[key], `native roadmap stage ${stage.id} should increase ${key}`);
  }
  previousRoadmap = stage.deliverables;
}
assert(nativeRoadmapTotals.vocabulary >= 5000, "native roadmap should preserve 5000+ vocabulary target");
assert(nativeRoadmapTotals.native >= 400, "native roadmap should preserve long-term native expression target");
assert(nativeRoadmapTotals.materials >= 200, "native roadmap should preserve 200+ material target");
assert(nativeRoadmapTotals.outputTasks >= 120, "native roadmap should preserve 120+ output archive target");
assert(nativeRoadmapTotals.checkpoints >= 24, "native roadmap should preserve long-term checkpoint target");

for (const file of [
  "src/app/layout.tsx",
  "src/app/page.tsx",
  "src/app/onboarding/page.tsx",
  "src/app/settings/page.tsx",
  "src/app/path/page.tsx",
  "src/app/self-study/page.tsx",
  "src/app/hangul/page.tsx",
  "src/app/vocabulary/page.tsx",
  "src/app/grammar/page.tsx",
  "src/app/native/page.tsx",
  "src/app/immersion/page.tsx",
  "src/app/review/page.tsx",
  "src/app/mistakes/page.tsx",
  "src/app/quiz/page.tsx",
  "src/components/korean/hangul-keyboard.tsx",
  "src/components/korean/korean-input.tsx",
  "src/components/korean/speech-status.tsx",
  "src/components/korean/speech-settings.tsx",
  "src/components/learning/onboarding-flow.tsx",
  "src/components/learning/mastery-gate.tsx",
  "src/lib/korean/jamo.ts",
  "src/lib/learning/gate.ts",
  "src/data/sound-changes.js",
  "public/manifest.webmanifest",
  "public/assets/icon-192.png",
  "public/assets/icon-512.png",
  "public/assets/icon-maskable-192.png",
  "public/assets/icon-maskable-512.png"
]) {
  assert(existsSync(file), `missing required file ${file}`);
}

const manifest = JSON.parse(readFileSync("public/manifest.webmanifest", "utf8"));
assert(manifest.name === "Kirina Korean", "manifest should keep app name");
assert(manifest.short_name === "Kirina", "manifest should keep concise short_name");
assertReadableUiText(manifest.description, "manifest description");
assert(manifest.id === "/", "manifest should declare a stable PWA app id");
assert(manifest.lang === "zh-CN" && manifest.dir === "ltr", "manifest should declare language and direction");
assert(manifest.start_url === "/" && manifest.scope === "/", "manifest should start and scope at root");
assert(manifest.display === "standalone", "manifest should install as standalone PWA");
assert(Array.isArray(manifest.display_override) && manifest.display_override.includes("standalone"), "manifest display_override should retain standalone fallback");
assert(manifest.orientation === "any", "manifest should not force a device orientation");
assert(manifest.background_color === "#f4f6f5", "manifest background should match the porcelain spring shell");
assert(manifest.theme_color === "#f4f6f5", "manifest theme color should match the default spring scene");
assert(Array.isArray(manifest.categories) && manifest.categories.includes("education"), "manifest should declare education category");
assert(Array.isArray(manifest.icons) && manifest.icons.length >= 4, "manifest should include app icons");
const manifestPurposeSizes = new Set();
for (const icon of manifest.icons ?? []) {
  const declared = parseSquareSize(icon.sizes);
  const file = `public${icon.src}`;
  const actual = pngDimensions(file);
  assert(icon.src?.startsWith("/assets/"), `manifest icon ${icon.src} should be local`);
  assert(icon.type === "image/png", `manifest icon ${icon.src} should be PNG`);
  assert(["any", "maskable"].includes(icon.purpose), `manifest icon ${icon.src} has unsupported purpose`);
  assert(Boolean(declared), `manifest icon ${icon.src} should declare square size`);
  assert(Boolean(actual), `manifest icon ${icon.src} should be a readable PNG`);
  if (declared && actual) {
    assert(actual.width === declared.width && actual.height === declared.height, `manifest icon ${icon.src} declares ${icon.sizes} but is ${actual.width}x${actual.height}`);
    manifestPurposeSizes.add(`${icon.purpose}:${declared.width}`);
  }
}
for (const required of ["any:192", "any:512", "maskable:192", "maskable:512"]) {
  assert(manifestPurposeSizes.has(required), `manifest missing ${required} icon`);
}
assert(Array.isArray(manifest.shortcuts) && manifest.shortcuts.length >= 2, "manifest should expose shortcuts");
assert(manifest.shortcuts.some((shortcut) => shortcut?.url === "/mistakes"), "manifest should expose a mistake notebook shortcut");
for (const shortcut of manifest.shortcuts ?? []) {
  assert(shortcut.name?.trim(), "manifest shortcut should have a name");
  assertReadableUiText(shortcut.name, `manifest shortcut ${shortcut.url} name`);
  assert(shortcut.url?.startsWith("/"), `manifest shortcut ${shortcut.name} should use local URL`);
  assert(knownAppRoutes.has(shortcut.url), `manifest shortcut ${shortcut.name} points to unknown route ${shortcut.url}`);
  assert(shortcut.description?.trim(), `manifest shortcut ${shortcut.name} should have description`);
  assertReadableUiText(shortcut.description, `manifest shortcut ${shortcut.name} description`);
  for (const icon of shortcut.icons ?? []) {
    const declared = parseSquareSize(icon.sizes);
    const actual = pngDimensions(`public${icon.src}`);
    assert(icon.type === "image/png", `manifest shortcut icon ${icon.src} should be PNG`);
    assert(Boolean(declared && actual && actual.width === declared.width && actual.height === declared.height), `manifest shortcut icon ${icon.src} size mismatch`);
  }
}
assert(Array.isArray(manifest.screenshots) && manifest.screenshots.length >= 2, "manifest should include real application install screenshots");
const screenshotFormFactors = new Set();
for (const screenshot of manifest.screenshots ?? []) {
  const declared = parseSquareSize(screenshot.sizes);
  const file = `public${screenshot.src}`;
  const actual = screenshot.type === "image/webp" ? webpDimensions(file) : screenshot.type === "image/png" ? pngDimensions(file) : null;
  assert(screenshot.src?.startsWith("/assets/screenshots/"), `manifest screenshot ${screenshot.src} should use captured application screenshots`);
  assert(["image/webp", "image/png"].includes(screenshot.type), `manifest screenshot ${screenshot.src} should be PNG or WebP`);
  assert(["wide", "narrow"].includes(screenshot.form_factor), `manifest screenshot ${screenshot.src} should declare form_factor`);
  screenshotFormFactors.add(screenshot.form_factor);
  assert(screenshot.label?.trim(), `manifest screenshot ${screenshot.src} should have a label`);
  assertReadableUiText(screenshot.label, `manifest screenshot ${screenshot.src} label`);
  assert(Boolean(declared), `manifest screenshot ${screenshot.src} should declare dimensions`);
  assert(Boolean(actual), `manifest screenshot ${screenshot.src} should be readable`);
  if (declared && actual) {
    assert(actual.width === declared.width && actual.height === declared.height, `manifest screenshot ${screenshot.src} declares ${screenshot.sizes} but is ${actual.width}x${actual.height}`);
  }
}
assert(screenshotFormFactors.has("wide") && screenshotFormFactors.has("narrow"), "manifest should include both wide and narrow application screenshots");

const pwaRegister = readFileSync("src/components/layout/pwa-register.tsx", "utf8");
assert(pwaRegister.includes("removeLegacyOfflineData"), "application should remove retired offline data on visit");
assert(pwaRegister.includes('name.startsWith(LEGACY_OFFLINE_CACHE_PREFIX)'), "offline cleanup should stay scoped to Kirina cache names");
assert(pwaRegister.includes('new URL(worker.scriptURL).pathname === "/sw.js"'), "offline cleanup should only unregister the retired Kirina worker");
assert(!pwaRegister.includes('.register("/sw.js")'), "application must not register a new offline service worker");
for (const stage of nativeRoadmapStages) {
  for (const action of stage.todayActions ?? []) {
    assert(knownAppRoutes.has(action.href) || action.href.startsWith("/learn/"), `native roadmap action ${action.title} links to unknown route ${action.href}`);
  }
}
for (const file of listSourceFiles("scripts")) {
  const source = readFileSync(file, "utf8");
  for (const match of source.matchAll(/\/learn\/(l\d{2}-[a-z0-9-]+)/g)) {
    assert(lessonIds.has(match[1]), `${file} references missing lesson route /learn/${match[1]}`);
  }
  for (const match of source.matchAll(/\b(l\d{2}-[a-z0-9-]+)\b/g)) {
    assert(lessonIds.has(match[1]), `${file} references missing lesson id ${match[1]}`);
  }
}

const visualDisplayPaths = new Set();
const visualSourcePaths = new Set();
const generatedFiles = new Set(readdirSync("public/assets/generated").map((file) => `/assets/generated/${file}`));
for (const asset of Object.values(visualAssets)) {
  assert(asset.src.startsWith("/assets/"), `visual asset ${asset.id} should live under /assets`);
  assert(existsSync(`public${asset.src}`), `visual asset ${asset.id} missing file public${asset.src}`);
  assert(asset.source?.startsWith("/assets/"), `visual asset ${asset.id} should keep an image-gen source under /assets`);
  assert(existsSync(`public${asset.source}`), `visual asset ${asset.id} missing source file public${asset.source}`);
  assert(asset.alt?.trim(), `visual asset ${asset.id} needs alt text`);
  assertReadableUiText(asset.alt, `visual asset ${asset.id} alt`);
  visualDisplayPaths.add(asset.src);
  visualSourcePaths.add(asset.source);
  if (asset.src.endsWith(".webp") && asset.source.endsWith(".png")) {
    const sourceDimensions = pngDimensions(`public${asset.source}`);
    const webpDimensionsValue = webpDimensions(`public${asset.src}`);
    const sourceStat = statSync(`public${asset.source}`);
    const webpStat = statSync(`public${asset.src}`);
    assert(Boolean(sourceDimensions), `visual asset ${asset.id} png source should be readable`);
    assert(Boolean(webpDimensionsValue), `visual asset ${asset.id} webp display should be readable`);
    if (sourceDimensions && webpDimensionsValue) {
      assert(webpDimensionsValue.width === sourceDimensions.width && webpDimensionsValue.height === sourceDimensions.height, `visual asset ${asset.id} webp dimensions ${webpDimensionsValue.width}x${webpDimensionsValue.height} should match png source ${sourceDimensions.width}x${sourceDimensions.height}`);
    }
    assert(webpStat.mtimeMs >= sourceStat.mtimeMs, `visual asset ${asset.id} webp is older than png source`);
    assert(webpStat.size < sourceStat.size, `visual asset ${asset.id} webp should be smaller than png source`);
  }
  if (asset.id === "iconBase") {
    const iconSourceDimensions = pngDimensions(`public${asset.source}`);
    assert(Boolean(iconSourceDimensions), "iconBase source should be a readable PNG");
    if (iconSourceDimensions) assert(iconSourceDimensions.width === iconSourceDimensions.height, "iconBase source should be square");
  }
  assert(asset.promptSummary?.length > 20, `visual asset ${asset.id} needs prompt summary`);
}
const expectedGeneratedFiles = new Set([...visualSourcePaths, ...visualDisplayPaths].filter((path) => path.startsWith("/assets/generated/")));
for (const path of generatedFiles) {
  assert(expectedGeneratedFiles.has(path), `generated asset directory contains an orphan file ${path}`);
}
const visualAssetIds = new Set(Object.keys(visualAssets));
const manifestAssetIds = new Set(Object.keys(visualAssetManifest));
for (const file of listSourceFiles("src")) {
  const source = readFileSync(file, "utf8");
  for (const match of source.matchAll(/<VisualPanel[^>]*\sasset=["']([^"']+)["']/g)) {
    assert(visualAssetIds.has(match[1]), `VisualPanel in ${file} references missing asset ${match[1]}`);
  }
}
for (const assetId of visualAssetIds) {
  const manifestEntry = visualAssetManifest[assetId];
  assert(manifestAssetIds.has(assetId), `visual asset ${assetId} missing image-gen manifest entry`);
  assert(manifestEntry?.provider === "openai-imagegen", `visual asset ${assetId} should record the OpenAI ImageGen provider`);
  assert(manifestEntry?.prompt?.length > 80, `visual asset ${assetId} manifest prompt should capture aesthetic requirements`);
  assertReadableUiText(manifestEntry?.aesthetic, `visual asset ${assetId} manifest aesthetic`);
  assert(manifestEntry?.prompt?.includes("no watermark"), `visual asset ${assetId} manifest prompt should explicitly avoid watermarks`);
  assert(manifestEntry?.sourceFile === `public${visualAssets[assetId].source}`, `visual asset ${assetId} manifest source mismatch`);
  assert(manifestEntry?.webpFile === `public${visualAssets[assetId].src}`, `visual asset ${assetId} manifest webp mismatch`);
  assert(existsSync(manifestEntry?.sourceFile ?? ""), `visual asset ${assetId} manifest source file missing`);
  assert(existsSync(manifestEntry?.webpFile ?? ""), `visual asset ${assetId} manifest webp file missing`);
}

const visualPanel = readFileSync("src/components/assets/visual-panel.tsx", "utf8");
const smokeBrowser = readFileSync("scripts/smoke-browser.mjs", "utf8");
assert(visualPanel.includes("unoptimized"), "VisualPanel should serve local generated assets directly and predictably");
assert(visualPanel.includes("DisplayVisualAssetId") && !visualPanel.includes("asset: VisualAssetId"), "VisualPanel should not accept iconBase as a page display asset");
assert(visualPanel.includes("manifestLabel") && visualPanel.includes('role={resolvedImageState.failed && !decorative ? "img" : undefined}'), "VisualPanel should render an accessible fallback when generated assets fail");
assert(visualPanel.includes("film-grain") && visualPanel.includes("var(--night)") && visualPanel.includes("brightness-[0.8]") && !visualPanel.includes("paper-tape"), "VisualPanel should frame generated scenes with a restrained cinematic treatment instead of paper decorations");
assert(smokeBrowser.includes("desktop-1440") && smokeBrowser.includes("tablet-768") && smokeBrowser.includes("mobile-320"), "browser smoke should check layout overflow across mobile, tablet, and desktop widths");
assert(smokeBrowser.includes("visibleElementOverflow") && smokeBrowser.includes("getBoundingClientRect"), "browser smoke should detect clipped visible elements hidden by overflow-x rules");
assert(smokeBrowser.includes("verifyLearningDataPanel") && smokeBrowser.includes("learning data reset should preserve unmanaged localStorage entries") && smokeBrowser.includes("已持久"), "browser smoke should cover learning data export/import/reset/storage health controls");
assert(smokeBrowser.includes("home self-study mode switch should persist self") && smokeBrowser.includes("home guided mode switch should persist guided"), "browser smoke should click and verify home study mode switching");
assert(smokeBrowser.includes("self-study checkpoint should keep the record button disabled for weak evidence") && smokeBrowser.includes("请先完成一课或加入一项学习内容"), "browser smoke should cover weak self-study checkpoint evidence feedback");
assert(smokeBrowser.includes("叙述与材料入口课程") && smokeBrowser.includes("慢速新闻入口"), "browser smoke should cover focusing a path stage into the core course window");
assert(smokeBrowser.includes('empty review state should expose "') && smokeBrowser.includes("积累词汇"), "browser smoke should cover empty review next-step actions");
const globalsCss = readFileSync("src/app/globals.css", "utf8");
const appShellSource = readFileSync("src/components/layout/app-shell.tsx", "utf8");
const learningDataPanelSource = readFileSync("src/components/layout/learning-data-panel.tsx", "utf8");
const learningBackupSource = readFileSync("src/lib/learning/backup.ts", "utf8");
const learningDraftSource = readFileSync("src/lib/learning/drafts.ts", "utf8");
const learningStorageHealthSource = readFileSync("src/lib/learning/storage-health.ts", "utf8");
const lessonSessionSource = readFileSync("src/lib/learning/lesson-session.ts", "utf8");
const learningStorageSource = readFileSync("src/lib/learning/storage.ts", "utf8");
const pageHeaderSource = readFileSync("src/components/ui/section.tsx", "utf8");
const learningCompassSource = readFileSync("src/components/learning/learning-compass.tsx", "utf8");
const compassLogicSource = readFileSync("src/lib/learning/compass.ts", "utf8");
const drillRunnerSource = readFileSync("src/components/learning/drill-runner.tsx", "utf8");
const homePage = readFileSync("src/app/page.tsx", "utf8");
const lessonClientSource = readFileSync("src/app/learn/[lessonId]/lesson-client.tsx", "utf8");
const quizPage = readFileSync("src/app/quiz/page.tsx", "utf8");
const quizSource = readFileSync("src/lib/learning/quiz.ts", "utf8");
const reviewPage = readFileSync("src/app/review/page.tsx", "utf8");
const mistakesPage = readFileSync("src/app/mistakes/page.tsx", "utf8");
const vocabularyPage = readFileSync("src/app/vocabulary/page.tsx", "utf8");
const grammarPage = readFileSync("src/app/grammar/page.tsx", "utf8");
const hangulPage = readFileSync("src/app/hangul/page.tsx", "utf8");
const pathPage = readFileSync("src/app/path/page.tsx", "utf8");
const nativePage = readFileSync("src/app/native/page.tsx", "utf8");
const immersionPage = readFileSync("src/app/immersion/page.tsx", "utf8");
const selfStudyPage = readFileSync("src/app/self-study/page.tsx", "utf8");
const workspaceSource = readFileSync("src/lib/learning/workspace.ts", "utf8");
const playerSource = readFileSync("src/lib/learning/player.ts", "utf8");
const nowPlayingSource = readFileSync("src/components/layout/now-playing.tsx", "utf8");
const lessonAssessmentSource = readFileSync("src/lib/learning/lesson-assessment.ts", "utf8");
assert(globalsCss.includes(".editorial-shell > *") && globalsCss.includes("overflow-x: clip"), "global shell should prevent top-level grid children from creating mobile horizontal overflow");
assert(globalsCss.includes(".app-main") && globalsCss.includes("min-width: 0"), "main app container should be allowed to shrink on mobile");
assert(globalsCss.includes(":where(.app-main .grid:not(.grid-flow-col))") && globalsCss.includes("grid-template-columns: minmax(0, 1fr)"), "single-column app grids should use a minmax track so mobile layouts are not clipped behind overflow-x");
assert(globalsCss.includes(".dark-slab") && globalsCss.includes("var(--paper-lo)") && !globalsCss.includes("#000"), "dark-slab should remain a readable seasonal surface instead of void-black chrome");
assert(globalsCss.includes('html[data-theme="yue"]') && globalsCss.includes('html[data-theme="qing"]') && globalsCss.includes('html[data-theme="ye"]'), "global shell should expose spring, rain, autumn, and blue-night seasonal themes");
assert(globalsCss.includes("--camellia") && globalsCss.includes("--mist") && globalsCss.includes("--leaf") && globalsCss.includes("--hero-radius"), "global seasonal system should expose its restrained K-drama palette and cinematic geometry");
assert(globalsCss.includes(".app-header") && globalsCss.includes("backdrop-filter: blur(18px)") && appShellSource.includes('className="header-inner"'), "AppShell should use a light cinematic header that remains legible over every season");
assert(appShellSource.includes('className="main-nav nav-scroll"') && globalsCss.includes("overflow-x: auto") && globalsCss.includes("max-width: 100%"), "AppShell navigation should scroll internally without widening the document");
assert(appShellSource.includes("<LearningDataPanel"), "AppShell should expose local learning data backup controls");
assert(learningDataPanelSource.includes("createLearningBackup") && learningDataPanelSource.includes("restoreLearningBackup") && learningDataPanelSource.includes("resetLearningData"), "learning data panel should support export, import, and reset");
assert(learningDataPanelSource.includes("requestLearningStoragePersistence") && learningDataPanelSource.includes("存储"), "learning data panel should expose a one-click storage persistence health check");
assert(learningDataPanelSource.includes("w-[min(20rem,calc(100vw-1.5rem))]") && learningDataPanelSource.includes("<details"), "learning data panel should keep its menu inside the viewport");
assert(learningStorageHealthSource.includes("navigator.storage") && learningStorageHealthSource.includes("persisted") && learningStorageHealthSource.includes("estimate") && learningStorageHealthSource.includes("空间紧"), "learning storage health should use StorageManager persistence and quota signals");
assert(learningBackupSource.includes("LEARNING_BACKUP_VERSION") && learningBackupSource.includes("LEARNING_BACKUP_KEYS = Object.values(STORAGE_KEYS)"), "learning backup model should version and cover declared learning storage keys");
assert(learningBackupSource.includes("rollbackLearningStorage") && learningBackupSource.includes("normalizeLearningBackup"), "learning backup restore should normalize imports and roll back failed writes");
assert(learningBackupSource.includes("catch") && learningBackupSource.includes("return null"), "learning backup export should report denied storage reads without throwing into the UI");
assert(learningBackupSource.includes("kirina:learning-batch"), "learning backup restore/reset should announce a batch refresh for pages with frozen queues");
assert(learningBackupSource.includes("getLessonPracticeStateFromRaw"), "learning backup should preserve normalized in-progress lesson sessions");
assert(learningStorageSource.includes("kirina.drafts.v1") && learningStorageSource.includes("drafts"), "learning storage should declare a managed draft key for long-form local work");
assert(learningBackupSource.includes("getLearningDraftStateFromRaw"), "learning backup should preserve normalized long-form study drafts");
assert(learningDraftSource.includes("saveImmersionMaterialDraft") && learningDraftSource.includes("saveSelfStudyCheckpointDraft") && learningDraftSource.includes("normalizeLearningDraftState"), "learning drafts should normalize, save, and clear material and self-study checkpoint drafts");
assert(workspaceSource.includes("defaultLearningDraftState") && workspaceSource.includes("saveLearningDraftState(previousDraftState)"), "workspace reset should clear long-form drafts and roll them back on failure");
assert(lessonSessionSource.includes("kirina.lesson-session.v1") || learningStorageSource.includes("lessonSession"), "lesson practice sessions should use a declared storage key");
assert(lessonSessionSource.includes("normalizeLessonPracticeSession") && lessonSessionSource.includes("lessonQuestions") && lessonSessionSource.includes("checkAnswer"), "lesson practice sessions should normalize against current questions and recheck persisted answers");
assert(drillRunnerSource.includes("initialAnswers") && drillRunnerSource.includes("onProgress") && drillRunnerSource.includes("buildInitialState"), "DrillRunner should support step resume and progress persistence");
assert(drillRunnerSource.includes("onResult") && drillRunnerSource.includes("emittedResultRef"), "DrillRunner should expose an idempotent result hook so terminal quiz state can save before the next action");
assert(drillRunnerSource.includes("KoreanInput") && drillRunnerSource.includes("hasKoreanText(question.answer)"), "DrillRunner should offer the on-screen Korean keyboard for Korean type answers");
assert(drillRunnerSource.includes('role="progressbar"'), "DrillRunner should render a visible progress bar");
assert(drillRunnerSource.includes("playedListenRef"), "DrillRunner should auto-play listen prompts once per question");
const speechSource = readFileSync("src/lib/speech.js", "utf8");
assert(speechSource.includes("kirina.speech.v1") && learningStorageSource.includes("kirina.speech.v1") && learningBackupSource.includes("normalizeSpeechSettings"), "speech settings key should be declared in speech.js, storage keys, and backup normalization");
assert(speechSource.includes("ensureVoicesReady") && speechSource.includes("voiceschanged"), "speech should wait for voices to load before first playback");
assert(speechSource.includes("getKoreanVoiceStatus") && speechSource.includes('"missing"'), "speech should detect a missing Korean voice pack");
assert(appShellSource.includes("<SpeechStatusBanner"), "AppShell should surface the Korean voice status banner");
assert(appShellSource.includes('"/settings"'), "AppShell should link to the settings page");
const onboardingFlowSource = readFileSync("src/components/learning/onboarding-flow.tsx", "utf8");
assert(onboardingFlowSource.includes("KoreanInput") && onboardingFlowSource.includes("speakKorean") && onboardingFlowSource.includes("onboardedAt"), "onboarding flow should cover keyboard practice, voice check, and persist onboardedAt");
assert(onboardingFlowSource.includes('"/learn/l01-hangul-map"'), "onboarding flow should land learners on the first lesson");
assert(lessonClientSource.includes("getLessonPracticeSession") && lessonClientSource.includes("saveLessonPracticeSession") && lessonClientSource.includes("clearLessonPracticeSession"), "lesson client should restore, persist, and clear in-progress lesson sessions");
assert(lessonClientSource.includes("sessionSaveError") && lessonClientSource.includes("练习进度没有保存"), "lesson client should warn when in-progress resume state cannot be saved");
assert(lessonClientSource.includes("sessionClearError") && lessonClientSource.includes("重试清理"), "lesson client should warn and retry when a saved lesson cannot clear stale resume state");
assert(workspaceSource.includes("practiceItems") && workspaceSource.includes("recordPracticeItem") && workspaceSource.includes("normalizePracticeItems"), "workspace should keep normalized item-level practice history across formal lesson, review, and quiz work");
assert(workspaceSource.includes('recordPracticeItem(next, entry.question.id, entry.correct, "lesson")') && workspaceSource.includes('recordPracticeItem(next, practiceItemIdForCard(card), isCorrect, "review")') && workspaceSource.includes('recordPracticeItem(next, entry.question.id, entry.correct, "quiz")'), "formal study commits should update item-level practice history for lessons, reviews, and quizzes");
assert(workspaceSource.includes("getWeakPracticeItems") && workspaceSource.includes("TASK_IDS.systemPracticeRepair") && workspaceSource.includes("taskForPracticeRepair"), "workspace should turn item-level weak practice history into a concrete repair task");
assert(quizSource.includes("prioritizeWeakPracticeQuestions") && quizSource.includes("completedLessonQuestions") && quizSource.includes("progress.practiceItems"), "progress quiz should prioritize weak item-level practice history and include completed lesson drills");
assert(reviewPage.includes("kirina:learning-batch") && reviewPage.includes("StorageEvent") && reviewPage.includes("REVIEW_STORAGE_REFRESH_KEYS"), "review page should rebuild its frozen due queue after backup/reset or cross-tab storage changes");
assert(reviewPage.includes('"kirina:learning"') && reviewPage.includes("reviewRefreshEventMatches") && reviewPage.includes("nextDueAt"), "review page should refresh empty queues for same-tab learning events and future due-card rollovers without disrupting an active queue");
assert(reviewPage.includes("LEARNING_REFRESH_EVENT_TYPES") && reviewPage.includes("questions.length && LEARNING_REFRESH_EVENT_TYPES.has(event.type)"), "review page should skip remounting an active queue for same-tab, batch, and cross-tab learning refreshes");
assert(lessonClientSource.includes("savingRef") && lessonClientSource.includes("handleSave") && lessonClientSource.includes("重新保存"), "lesson result actions should latch in-flight saves and still allow retry after an error");
assert(pageHeaderSource.includes("compact = false"), "PageHeader should keep a compact variant for tool-like module pages");
assert(pageHeaderSource.includes('compact ? "text-[clamp(2.25rem,5vw,4.4rem)]"'), "PageHeader compact variant should preserve a responsive H1 hierarchy above module hero headings");
assert(learningCompassSource.includes("function CompactMetric"), "LearningCompass condensed mode should keep compact evidence metrics");
assert((learningCompassSource.match(/aria-current=\{track\.active \? "page" : undefined\}/g) ?? []).length >= 2, "LearningCompass active route cards should expose aria-current in condensed and full modes");
assert(learningCompassSource.includes("mt-5 min-w-0 overflow-hidden"), "LearningCompass condensed route strip should be clipped inside its card on mobile");
assert(learningCompassSource.includes("nav-scroll flex w-full max-w-full snap-x overflow-x-auto"), "LearningCompass condensed route strip should be horizontally scrollable on mobile");
assert(learningCompassSource.includes("md:grid md:grid-cols-4") && learningCompassSource.includes("xl:grid-cols-7"), "LearningCompass condensed route strip should become a dense seven-track grid on larger screens");
assert(homePage.includes('asset="hero"') && homePage.includes('className="home-hero"') && homePage.includes("EP. TODAY"), "home page should open on an original cinematic Korean-drama scene");
assert(homePage.includes("开始这一集") && !homePage.includes("<DashboardMetric") && !homePage.includes("<MobileHeroMetric"), "home page hero should keep one current learning action instead of dashboard chrome");
assert(homePage.includes("练习轨迹") && homePage.includes("workspace.stats.weakPracticeItems") && homePage.includes("workspace.stats.practiceItems"), "home page should expose item-level practice history instead of only coarse course totals");
assert(homePage.includes("saveProfile") && homePage.includes("handleStudyMode") && homePage.includes('aria-pressed={profile.studyMode === "guided"}') && homePage.includes('aria-pressed={profile.studyMode === "self"}'), "home page should let learners switch guided path and self-study mode directly");
assert(homePage.includes("先从序幕开始") && homePage.includes("今天的三幕") && homePage.includes("workspace.recommended.slice(0, 3)") && !homePage.includes("paper-tape"), "home page should use a truthful first-visit prologue, then organize active study as three concise scenes without legacy paper decoration");
assert(homePage.includes('<LearningCompass workspace={workspace} active="workspace" condensed'), "home page should use the condensed learning compass");
assert(homePage.includes('"/onboarding"') && homePage.includes("needsOnboardingFunnel"), "home page should invite brand-new learners into onboarding");
for (const [route, pageSource, requiresCompass] of [
  ["/hangul", hangulPage, false],
  ["/vocabulary", vocabularyPage, false],
  ["/grammar", grammarPage, false],
  ["/path", pathPage],
  ["/self-study", selfStudyPage],
  ["/native", nativePage],
  ["/immersion", immersionPage],
  ["/review", reviewPage],
  ["/mistakes", mistakesPage],
  ["/quiz", quizPage]
]) {
  assert(pageSource.includes("<PageHeader") && pageSource.includes("compact"), `${route} should use compact page headers to avoid stacked hero sections`);
  if (requiresCompass !== false) {
    assert(pageSource.includes("<LearningCompass") && pageSource.includes("condensed"), `${route} should use the condensed learning compass`);
  }
}
assert(hangulPage.includes('variant="plain"'), "hangul repeated practice sections should avoid nesting item cards inside framed surface cards");
assert(vocabularyPage.includes('variant="plain"'), "vocabulary repeated list sections should avoid nesting item cards inside framed surface cards");
assert(grammarPage.includes('variant="plain"'), "grammar repeated list sections should avoid nesting item cards inside framed surface cards");
assert(reviewPage.indexOf('kicker="Due Queue"') < reviewPage.indexOf("<ReviewStatusHero"), "review page should show the due queue before the SRS status explainer");
assert(reviewPage.indexOf('kicker="Due Queue"') < reviewPage.indexOf("<LearningCompass"), "review page should show the due queue before secondary learning context");
assert(reviewPage.includes('href="/mistakes"'), "review page should expose a direct mistake notebook bridge");
assert(reviewPage.includes('"/path"') && reviewPage.includes('href="/vocabulary"') && reviewPage.includes("继续路径") && reviewPage.includes("积累词汇") && reviewPage.includes("先去入门") && reviewPage.includes("先补韩文"), "empty review state should offer evidence-building actions instead of a quiz loop");
assert(mistakesPage.includes("buildMistakeInsights") && mistakesPage.includes("summarizeMistakes"), "mistake notebook should derive weak points from normalized SRS cards");
assert(mistakesPage.includes("removeMistakeCardAndPracticeItem") && mistakesPage.includes('href="/review"'), "mistake notebook should let learners remove handled mistakes and return to review");
assert(mistakesPage.includes("buildRetrainQuestions") && mistakesPage.includes("<DrillRunner") && mistakesPage.includes("gradeReviewCardAndProgress"), "mistake notebook should retrain selected mistakes in place and grade them through the shared review pipeline");
assert(hangulPage.includes("<MasteryGate") && hangulPage.includes("测一测"), "hangul page should gate mastery behind a quick check instead of a bare toggle");
assert(vocabularyPage.includes("<MasteryGate") && vocabularyPage.includes("测一测"), "vocabulary page should gate mastery behind a quick check instead of a bare toggle");
assert(grammarPage.includes("<MasteryGate") && grammarPage.includes("测一测"), "grammar page should gate mastery behind a quick check instead of a bare toggle");
assert(hangulPage.includes("soundChangeRules") && hangulPage.includes("音变实验室"), "hangul page should expose the sound change lab");
assert(vocabularyPage.includes("vocabPosLabels") && vocabularyPage.includes("collocations") && vocabularyPage.includes("soundChangeNote"), "vocabulary page should render structured vocab fields when present");
assert(lessonClientSource.includes("normalizeTeachEntry") && lessonClientSource.includes("speakKorean(entry.speak"), "lesson teach cards should support audio playback via normalized teach entries");
assert(mistakesPage.includes('<LearningCompass workspace={workspace} active="mistakes" condensed />'), "mistake notebook should stay connected to the shared learning compass");
assert(quizPage.indexOf("<DrillRunner") < quizPage.indexOf("<LearningCompass"), "quiz page should show the transfer drill before secondary learning context");
assert(quizPage.includes("onResult={saveQuizResult}") && quizPage.includes("重试保存") && quizPage.includes("savedQuizId"), "quiz page should save results as soon as the result screen appears and expose retry on localStorage failure");
assert(vocabularyPage.includes("visibleVocab = showAll || focusedFilterActive ? filteredVocab : filteredVocab.slice(0, 12)"), "vocabulary page should default to a 12-card daily practice slice");
assert(vocabularyPage.includes("展开全部词汇"), "vocabulary page should let learners expand beyond the daily slice");
assert(vocabularyPage.includes("showAll || hiddenVocabCount"), "vocabulary page should let learners collapse after expanding the full lexicon");
assert(grammarPage.includes("visiblePoints = showAll || focusedFilterActive ? filteredPoints : filteredPoints.slice(0, 6)"), "grammar page should default to a six-card sentence-pattern slice");
assert(grammarPage.includes("展开全部句型"), "grammar page should let learners expand beyond the daily sentence-pattern slice");
assert(grammarPage.includes("showAll || hiddenPointCount"), "grammar page should let learners collapse after expanding all sentence patterns");
assert(nativePage.includes("visibleItems = showAll || focusedFilterActive ? filteredItems : buildDailyNativeSlice(filteredItems, 6)"), "native page should default to a six-card mixed daily expression slice");
assert(nativePage.includes("展开全部表达"), "native page should let learners expand beyond the daily native expression slice");
assert(nativePage.includes("showAll || hiddenItemCount"), "native page should let learners collapse after expanding all native expressions");
assert(nativePage.includes("visibleLines = showAllLines ? item.lines : item.lines.slice(0, 1)"), "native cards should default to one key rehearsal line");
assert(nativePage.includes("展开完整排练"), "native cards should let learners expand complete dialogue rehearsals");
assert(nativePage.includes("hasCompleteNativePracticeEvidence") && nativePage.includes("if (!learned) return"), "native cards should enroll SRS only after listen-retell-transfer evidence");
assert(nativePage.includes("disabled={enrollBlocked || !evidenceComplete") && nativePage.includes("保存练习并加入复习"), "native cards should enroll only after the practice is complete");
assert(workspaceSource.includes("if (!set.has(itemId)) return false") && workspaceSource.includes("toggleNativeItem"), "toggleNativeItem should only unenroll native SRS items");
assert(!workspaceSource.includes("const completeTask"), "workspace hook should not expose a click-to-complete task API");
assert(lessonClientSource.includes("dueCount") && lessonClientSource.includes("先清到期复习") && lessonClientSource.includes("reviewFirst"), "lesson result should prefer due review over the next lesson");
assert(lessonClientSource.includes("needsOnboarding") && lessonClientSource.includes('href="/onboarding"') && lessonClientSource.includes("先去入门") && lessonClientSource.includes("先完成三分钟入门"), "first lesson should send un-onboarded learners to onboarding before starting drills");
assert(lessonClientSource.includes("libraryFirst") && lessonClientSource.includes("libraryRepairHref"), "lesson result should send learners to library repair when the next lesson is gated");
assert(pathPage.includes("recommendNextLessonNow") && pathPage.includes("dueReview") && pathPage.includes("nextLibraryGate.ok"), "path current-lesson highlight should freeze while library repair or due review is first");
assert(pathPage.includes("dueReview?.href") && pathPage.includes("libraryRepairHref(nextLibraryGate)"), "path continue action should prefer due review over library repair");
assert(pathPage.includes("needsOnboarding && !mastered") && pathPage.includes("firstActionableLesson"), "path rows should send un-onboarded learners to onboarding and locked lessons to an enterable prereq");
assert(compassLogicSource.includes("needsOnboardingFunnel") && compassLogicSource.includes("system:retrain-"), "path compass should prefer review, then library, then retrain over the next lesson");
assert(compassLogicSource.includes("pathSpineDetail"), "compass path track copy should follow the same next-action order as the path CTA");
assert((learningCompassSource.match(/href: funnel \? "\/onboarding"/g) ?? []).length >= 7, "compass route tracks should send un-onboarded learners to onboarding");
assert(homePage.includes('kicker="모든 장면 · 全部"') && homePage.includes("{isFirstVisit ? null : ("), "home page should hide free module entrances until onboarding is done");
assert(quizPage.includes("followUp") && quizPage.includes("先清到期复习"), "quiz results should offer the current next action instead of only another quiz");
assert(immersionPage.includes("先学第") && immersionPage.includes("lockedCtaLesson") && immersionPage.includes("firstActionableLesson"), "immersion hero should send locked materials to the currently enterable missing lesson");
assert(hangulPage.includes("OnboardingGateNotice") && vocabularyPage.includes("OnboardingGateNotice") && grammarPage.includes("OnboardingGateNotice") && nativePage.includes("OnboardingGateNotice") && nativePage.includes("enrollBlocked"), "library and native pages should warn un-onboarded learners before mastery enrollment");
assert(selfStudyPage.includes("OnboardingGateNotice") && selfStudyPage.includes("enrollBlocked"), "self-study page should block plan writes until onboarding is done");
assert(workspaceSource.includes("priority: 92") && workspaceSource.includes("pinnedRetrain") && workspaceSource.includes("system:retrain-"), "retrain tasks should stay pinned in the recommended six");
assert(playerSource.includes("splitTrackHref") && playerSource.includes("nowPlayingNav") && playerSource.includes("getNowPlayingLocationSearch") && playerSource.includes("window.location.search") && nowPlayingSource.includes("subscribeNowPlayingLocation") && nowPlayingSource.includes("getNowPlayingLocationSearch"), "now playing should match query tracks and not treat unmatched pages as index 0");
assert(lessonAssessmentSource.includes("listeningSkipped") && lessonAssessmentSource.includes("!listeningSkipped"), "lesson assessment should reject skipped listening items instead of scoring only the remaining audio");
assert(immersionPage.includes("<ModuleHero"), "immersion page should use the shared module hero before the workbench");
assert(immersionPage.includes('id="material-workbench"'), "immersion page should anchor the execution workbench from the hero");
assert(immersionPage.includes("clearArchiveConfirmId") && immersionPage.includes("确认清除完成记录") && immersionPage.includes("!clearMaterialArchive(active.id)"), "immersion archive clearing should require explicit confirmation for completed material and preserve UI state on storage failure");
assert(immersionPage.includes("getImmersionMaterialDraft") && immersionPage.includes("saveImmersionMaterialDraft") && immersionPage.includes("已恢复上次的草稿"), "immersion page should restore and autosave long-form material drafts");
assert(selfStudyPage.includes("visibleRhythm = showFullRhythm ? plan.weeklyRhythm : plan.weeklyRhythm.filter"), "self-study page should keep the default weekly rhythm focused on active study days");
assert(selfStudyPage.includes("getSelfStudyCheckpointDrafts") && selfStudyPage.includes("saveSelfStudyCheckpointDraft") && selfStudyPage.includes("clearSelfStudyCheckpointDraft"), "self-study page should restore, autosave, and clear checkpoint evidence drafts");
assert(selfStudyPage.includes("展开完整周节奏"), "self-study page should let learners expand the full weekly rhythm");
assert(selfStudyPage.includes("weakEvidence") && selfStudyPage.includes("aria-describedby={weakEvidence ? evidenceHintId : undefined}") && selfStudyPage.includes("请先完成一课或加入一项学习内容"), "self-study checkpoints should explain why weak evidence cannot be recorded without repeating hints on empty checkpoints");
assert(selfStudyPage.indexOf("<ModuleHero") < selfStudyPage.indexOf('<section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_24rem]"'), "self-study page should show the generated plan summary before the planner/detail split");
assert(selfStudyPage.indexOf("<ModuleHero") < selfStudyPage.indexOf("<LearningCompass") && selfStudyPage.indexOf("<LearningCompass") < selfStudyPage.indexOf('id="planner"'), "self-study page should show current plan, then compact context, then the planner");
assert(selfStudyPage.includes('id="planner" className="order-1'), "self-study planner should be reachable before long detail sections on mobile");
assert(pathPage.includes("focusedMilestoneId") && pathPage.includes('id="core-queue"') && pathPage.includes("查看本阶段课程") && pathPage.includes('aria-controls="core-queue"'), "path overview stages should focus the core course window instead of staying as static summary cards");
const sampleOutputId = "validator-output";
const sampleMaterialId = immersionMaterials[0].id;
const sampleTargetRewrite = "아이스 아메리카노 하나 포장해 주세요.";
const outputTransferQuestions = buildProgressQuiz(
  normalizeLearningProgress({
    completedMaterials: [sampleMaterialId],
    materialEvidence: {
      [sampleMaterialId]: {
        dictation: "포장해 주세요.",
        retell: "아이스 아메리카노 하나 포장해 주세요. 손님은 음료와 포장 방식을 선택해서 주문했어요.",
        selfCheck: immersionMaterials[0].selfCheck,
        outputEntryId: sampleOutputId,
        updatedAt: "2026-06-09T00:00:00.000Z"
      }
    }
  }),
  10,
  1,
  [{
    id: sampleOutputId,
    materialId: sampleMaterialId,
    materialTitle: immersionMaterials[0].title,
    mission: immersionMaterials[0].outputMission,
    draft: "저는 카페에서 따뜻한 라테를 한 잔 마시고 싶어요.",
    weakPoint: "外带表达还不稳定",
    targetRewrite: sampleTargetRewrite,
    rubric: [],
    createdAt: "2026-06-09T00:00:00.000Z"
  }],
  {
    cards: {
      [materialCardId(sampleMaterialId)]: {
        id: materialCardId(sampleMaterialId),
        box: 0,
        dueAt: 0,
        correct: 0,
        wrong: 0,
        lastSeenAt: null,
        payload: {
          kind: "material",
          itemId: sampleMaterialId,
          prompt: "retell",
          answer: "손님은 커피를 주문해요."
        }
      },
      [outputCardId(sampleOutputId)]: {
        id: outputCardId(sampleOutputId),
        box: 0,
        dueAt: 0,
        correct: 0,
        wrong: 0,
        lastSeenAt: null,
        payload: {
          kind: "output",
          itemId: sampleOutputId,
          prompt: "rewrite",
          answer: sampleTargetRewrite
        }
      }
    },
    history: []
  }
);
const outputTransferQuestion = outputTransferQuestions.find((question) => question.id === outputTransferQuestionId(sampleOutputId));
assert(Boolean(outputTransferQuestion), "progress quiz should include output archive transfer questions");
assert(outputTransferQuestion?.answer === sampleTargetRewrite, "progress quiz output transfer should use the target rewrite");
assert(JSON.stringify(mapCardToAbilities({ payload: { kind: "output", itemId: sampleOutputId } })) === JSON.stringify(["grammar", "pragmatics", "native"]), "output review cards should map to expression abilities");
assert(workspaceSource.includes("useStorageRaw(STORAGE_KEYS.outputs)"), "learning workspace should subscribe to output archive changes");
assert(workspaceSource.includes("useStorageRaw(STORAGE_KEYS.srs)"), "learning workspace should subscribe to SRS changes");
assert(quizPage.includes("outputEntries") && quizPage.includes("srsState"), "quiz page should consume unified output/SRS evidence from learning workspace");

for (const question of buildMixedQuiz(50)) {
  if (question.choices) assert(question.choices.includes(question.answer), `mixed quiz question ${question.id} missing answer`);
}

const productionQuizPool = buildProgressQuiz(
  normalizeLearningProgress({ learnedVocab: vocab.map((item) => item.id) }),
  1000,
  7,
  [],
  { cards: {}, history: [] }
);
assert(productionQuizPool.some((question) => question.type === "dictation" && question.speak), "progress quiz should generate dictation questions for learned vocab");
assert(productionQuizPool.some((question) => question.type === "cloze" && question.clozeText?.includes("___")), "progress quiz should generate cloze questions with a ___ blank");

for (const file of listSourceFiles("src")) {
  const source = readFileSync(file, "utf8");
  assert(!/<a\s+[^>]*href=["']\//.test(source), `internal navigation should use Next Link instead of <a href> in ${file}`);
}

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

console.log(`Validated ${lessons.length} lessons, ${vocab.length} vocab items, ${grammarPoints.length} grammar points, ${hangulGroups.length} hangul groups, ${immersionMaterials.length} materials.`);

function listSourceFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const path = `${dir}/${entry}`;
    const stat = statSync(path);
    if (stat.isDirectory()) files.push(...listSourceFiles(path));
    else if (/\.(tsx|ts|jsx|js|mjs|css)$/.test(entry)) files.push(path);
  }
  return files;
}
