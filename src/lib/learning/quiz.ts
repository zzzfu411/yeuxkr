"use client";

import { hangulGroups, pronunciationPairs } from "../../data/hangul.js";
import { vocab, vocabPosLabels } from "../../data/lexicon.js";
import { grammarPoints } from "../../data/grammar.js";
import { nuanceSets } from "../../data/nuance.js";
import { pragmaticScenarios } from "../../data/pragmatics.js";
import { soundChangeRules } from "../../data/sound-changes.js";
import { immersionMaterials } from "../../data/materials.ts";
import {
  grammarQuestionId,
  hangulQuestionId,
  materialCardId,
  materialRetellQuestionId,
  nativeNuanceQuestionId,
  nativePragmaticsQuestionId,
  outputCardId,
  outputTransferQuestionId,
  pronunciationQuestionId,
  vocabClozeQuestionId,
  vocabDictationQuestionId,
  parseLessonReviewCardId,
  vocabQuestionId
} from "./ids.ts";
import { hasKoreanDictationEvidence, hasKoreanOutputRewrite, hasKoreanRetellEvidence, hasMaterialOutputEvidence } from "./evidence.ts";
import { getOutputState, type OutputEntry } from "./output.ts";
import { getSrsState, type SrsState } from "./srs.ts";
import type { SrsCard } from "./srs.ts";
import type { LearningProgress } from "./types.ts";

import { checkAnswer, lessonQuestionId, lessonQuestions, lessonReviewQuestions, normalizeAnswer, type Question } from "./lesson-questions.ts";
export { checkAnswer, lessonQuestionId, lessonQuestions, lessonReviewQuestions, normalizeAnswer, type Question };

export function buildReviewQuestions(cards: SrsCard[]): Question[] {
  const allHangul = hangulGroups.flatMap((group: any) => group.items.map((item: any) => ({ ...item, groupTitle: group.title })));
  return cards
    .map((card) => {
      if (card.payload.kind === "hangul") {
        const item = allHangul.find((entry: any) => entry.id === card.payload.itemId);
        if (!item) return null;
        return {
          id: card.id,
          type: "choice",
          prompt: `${item.glyph} 的读音/提示是哪一个？`,
          answer: item.romanization,
          choices: makeChoices(item.romanization, allHangul.filter((entry: any) => entry.id !== item.id).map((entry: any) => entry.romanization)),
          explain: `${item.glyph} ${item.cue}，例词 ${item.example}：${item.exampleMeaning}。`,
          speak: item.sound
        } satisfies Question;
      }
      if (card.payload.kind === "pronunciation") {
        const pair = pronunciationPairs.find((entry: any) => entry.id === card.payload.itemId);
        if (!pair) return null;
        return pronunciationContrastQuestion(pair, card.id);
      }
      if (card.payload.kind === "vocab") {
        const item = vocab.find((entry: any) => entry.id === card.payload.itemId);
        if (!item) return null;
        if (card.box >= 3) {
          return {
            id: card.id,
            type: "translate",
            prompt: `「${vocabMeaningCue(item)}」用韩语怎么说？`,
            answer: item.korean,
            acceptable: [item.korean],
            hint: `罗马音提示：${item.romanization}`,
            explain: `${item.korean}（${item.romanization}）。${item.example} = ${item.exampleMeaning}。`,
            speak: item.korean
          } satisfies Question;
        }
        return {
          id: card.id,
          type: "choice",
          prompt: `${item.korean} 的意思是？`,
          answer: item.meaning,
          choices: makeChoices(item.meaning, buildDistractors(item, vocab as any[], (entry: any) => entry.meaning)),
          explain: `${item.example} = ${item.exampleMeaning}。${item.note}`,
          speak: item.korean
        } satisfies Question;
      }
      if (card.payload.kind === "mistake" && card.payload.prompt && card.payload.answer) {
        // Rebuild obsolete homophone exams without removing the learner's mistake card.
        const contrast = /^pq:([^:]+):gate([12])$/.exec(card.payload.itemId);
        const pair = contrast && pronunciationPairs.find((entry) => entry.id === contrast[1]);
        if (pair?.spellingPrompts && contrast) {
          return pronunciationContrastQuestion(pair, card.id, Math.random, Number(contrast[2]) - 1);
        }
        const archivedOutput = /^(?:oq|mq):/.test(card.payload.itemId);
        return {
          id: card.id,
          type: card.payload.type ?? "type",
          prompt: archivedOutput ? "回忆并写出这道题归档时的目标原句。" : card.payload.prompt,
          answer: card.payload.answer,
          acceptable: archivedOutput ? [card.payload.answer] : card.payload.acceptable,
          choices: card.payload.choices,
          speak: card.payload.speak,
          clozeText: card.payload.clozeText,
          hint: card.payload.hint,
          explain: "这是之前答错过的题，重新写对后会延后复习。"
        } satisfies Question;
      }
      if (card.payload.kind === "lesson" && card.payload.prompt && card.payload.answer) {
        return {
          id: card.id,
          type: card.payload.type ?? "type",
          prompt: card.payload.prompt,
          answer: card.payload.answer,
          acceptable: card.payload.acceptable,
          choices: card.payload.choices,
          explain: card.payload.explain ?? "这是课程里的核心练习。做对后会按间隔重复，直到真正稳住。",
          speak: card.payload.speak,
          clozeText: card.payload.clozeText,
          hint: card.payload.hint
        } satisfies Question;
      }
      if (card.payload.kind === "grammar") {
        const point = grammarPoints.find((entry: any) => entry.id === card.payload.itemId);
        const example = point?.examples?.[0];
        if (!point || !example) return null;
        return {
          id: card.id,
          type: "choice",
          prompt: `${point.title}: ${example.ko} 的意思是？`,
          answer: example.zh,
          choices: makeChoices(example.zh, grammarTranslationDistractors(point.id)),
          explain: point.explanation,
          speak: example.ko
        } satisfies Question;
      }
      if (card.payload.kind === "native") {
        const [scope, rawId] = card.payload.itemId.split(":");
        if (scope === "pragmatics") {
          const scene = pragmaticScenarios.find((entry: any) => entry.id === rawId);
          const line = scene?.lines?.[0];
          if (!scene || !line) return null;
          return {
            id: card.id,
            type: "choice",
            prompt: `${scene.title}: ${line.ko} 的意思是？`,
            answer: line.zh,
            choices: makeChoices(line.zh, pragmaticScenarios.flatMap((entry: any) => entry.lines.map((item: any) => item.zh)).filter((item: string) => item !== line.zh)),
            explain: scene.nativeMove,
            speak: line.ko
          } satisfies Question;
        }
        if (scope === "nuance") {
          const set = nuanceSets.find((entry: any) => entry.id === rawId);
          const example = set?.examples?.[0];
          if (!set || !example) return null;
          return {
            id: card.id,
            type: "choice",
            prompt: `${set.title}: ${example.ko} 的语气/用法是？`,
            answer: example.register,
            choices: makeChoices(example.register, example.distractors ?? []),
            explain: set.explanation,
            speak: example.ko
          } satisfies Question;
        }
      }
      if (card.payload.kind === "soundChange") {
        const rule = soundChangeRules.find((entry: any) => entry.id === card.payload.itemId);
        const example = rule?.examples?.[0];
        if (!rule || !example) return null;
        return {
          id: card.id,
          type: "choice",
          prompt: `${rule.title}（${rule.korean}）：${example.written} 实际读作哪一个？`,
          answer: example.spoken,
          choices: makeChoices(example.spoken, soundChangeRules.flatMap((entry: any) => entry.examples.map((item: any) => item.spoken)).filter((item: string) => item !== example.spoken)),
          explain: `${rule.rule}。${example.written} → [${example.spoken}]（${example.zh}）。`,
          speak: example.speak
        } satisfies Question;
      }
      if (card.payload.kind === "material") {
        const material = immersionMaterials.find((entry) => entry.id === card.payload.itemId);
        if (!material) return null;
        const prompt = `${material.title}：回忆并写出已归档的复述原句。`;
        const answer = card.payload.answer ?? material.lines[0]?.ko ?? material.title;
        return {
          id: card.id,
          type: "type",
          prompt,
          answer,
          acceptable: [answer],
          explain: "本题核对归档原句，忽略句末标点；新的同义表达请到听读材料中自评归档。",
          speak: card.payload.speak ?? material.lines.map((line) => line.ko).join(" ")
        } satisfies Question;
      }
      if (card.payload.kind === "output" && card.payload.prompt && card.payload.answer) {
        return {
          id: card.id,
          type: "type",
          prompt: "回忆并写出已归档的目标改写原句。",
          answer: card.payload.answer,
          explain: "本题核对目标改写原句，忽略句末标点；不自动判断新表达是否自然。"
        } satisfies Question;
      }
      return null;
    })
    .filter(Boolean) as Question[];
}

export function buildMixedQuiz(count = 10, seed = Date.now()): Question[] {
  const random = seededRandom(seed);
  const hangulQuestions = hangulGroups.flatMap((group: any) =>
    group.items.map((item: any) => ({
      id: hangulQuestionId(item.id),
      type: "choice" as const,
      prompt: `${item.glyph} 的罗马音提示是？`,
      answer: item.romanization,
      choices: makeChoices(item.romanization, group.items.filter((entry: any) => entry.id !== item.id).map((entry: any) => entry.romanization), 4, random),
      explain: item.cue,
      speak: item.sound
    }))
  );
  const vocabQuestions = vocab.map((item: any) => ({
    id: vocabQuestionId(item.id),
    type: "choice" as const,
    prompt: `${vocabMeaningCue(item)} 对应哪一个韩语？`,
    answer: item.korean,
    choices: makeChoices(item.korean, buildDistractors(item, vocab as any[], (entry: any) => entry.korean, 6, random), 4, random),
    explain: `${item.korean}: ${item.note}`,
    speak: item.korean
  }));
  const grammarQuestions = grammarPoints.flatMap((point: any) =>
    point.examples.slice(0, 1).map((example: any) => ({
      id: grammarQuestionId(point.id),
      type: "choice" as const,
      prompt: `${point.title}: ${example.ko} 的意思是？`,
      answer: example.zh,
      choices: makeChoices(example.zh, grammarTranslationDistractors(point.id), 4, random),
      explain: point.explanation,
      speak: example.ko
    }))
  );
  const soundQuestions = pronunciationPairs.map((pair) => pronunciationContrastQuestion(pair, pronunciationQuestionId(pair.id), random));
  return shuffle([...hangulQuestions, ...vocabQuestions, ...grammarQuestions, ...soundQuestions], random).slice(0, count);
}

export function buildProgressQuiz(progress: LearningProgress, count = 10, seed = Date.now(), outputEntries: OutputEntry[] = getOutputState().entries, srsState: SrsState = getSrsState()): Question[] {
  const random = seededRandom(seed);
  const learnedHangul = new Set(progress.masteredHangul);
  const learnedVocab = new Set(progress.learnedVocab);
  const learnedGrammar = new Set(progress.learnedGrammar);
  const practicedNative = new Set(Object.entries(progress.nativeEvidence ?? {})
    .filter(([, evidence]) => hasCompleteNativeQuizEvidence(evidence))
    .map(([itemId]) => itemId));
  const learnedPronunciation = new Set(Object.values(srsState.cards)
    .filter((card) => card.payload.kind === "pronunciation")
    .map((card) => card.payload.itemId));
  const validMaterials = new Set(getValidQuizMaterialIds(progress, outputEntries, srsState));
  const completedLessonQuestions = lessonIdsForProgressQuiz(progress).flatMap((lessonId) => lessonReviewQuestions(lessonId));
  const hangulQuestions = hangulGroups.flatMap((group: any) =>
    group.items
      .filter((item: any) => learnedHangul.has(item.id))
      .map((item: any) => ({
        id: hangulQuestionId(item.id),
        type: "choice" as const,
        prompt: `${item.glyph} 的罗马音提示是？`,
        answer: item.romanization,
        choices: makeChoices(item.romanization, group.items.filter((entry: any) => entry.id !== item.id).map((entry: any) => entry.romanization), 4, random),
        explain: item.cue,
        speak: item.sound
      }))
  );
  const vocabQuestions = vocab
    .filter((item: any) => learnedVocab.has(item.id))
    .map((item: any) => ({
      id: vocabQuestionId(item.id),
      type: "choice" as const,
      prompt: `${vocabMeaningCue(item)} 对应哪一个韩语？`,
      answer: item.korean,
      choices: makeChoices(item.korean, buildDistractors(item, vocab as any[], (entry: any) => entry.korean, 6, random), 4, random),
      explain: `${item.korean}: ${item.note}`,
      speak: item.korean
    }));
  const vocabDictationQuestions = vocab
    .filter((item: any) => learnedVocab.has(item.id))
    .map((item: any) => ({
      id: vocabDictationQuestionId(item.id),
      type: "dictation" as const,
      prompt: `听音频，用韩文写出这个词（词义：${vocabMeaningCue(item)}）。`,
      answer: item.korean,
      explain: `${item.korean}（${item.romanization}）= ${item.meaning}。${item.note}`,
      speak: item.korean
    }));
  const vocabClozeQuestions = vocab
    .filter((item: any) => learnedVocab.has(item.id) && typeof item.example === "string" && item.example.includes(item.korean))
    .map((item: any) => ({
      id: vocabClozeQuestionId(item.id),
      type: "cloze" as const,
      prompt: `补全例句：${item.exampleMeaning}`,
      answer: item.korean,
      clozeText: item.example.replace(item.korean, "___"),
      explain: `${item.example} = ${item.exampleMeaning}`,
      speak: item.example
    }));
  const grammarQuestions = grammarPoints
    .filter((point: any) => learnedGrammar.has(point.id))
    .flatMap((point: any) =>
      point.examples.slice(0, 1).map((example: any) => ({
        id: grammarQuestionId(point.id),
        type: "choice" as const,
        prompt: `${point.title}: ${example.ko} 的意思是？`,
        answer: example.zh,
        choices: makeChoices(example.zh, grammarTranslationDistractors(point.id), 4, random),
        explain: point.explanation,
        speak: example.ko
      }))
    );
  const soundQuestions = pronunciationPairs
    .filter((pair) => learnedPronunciation.has(pair.id))
    .map((pair) => pronunciationContrastQuestion(pair, pronunciationQuestionId(pair.id), random));
  const pragmaticQuestions = pragmaticScenarios
    .filter((scene: any) => practicedNative.has(`pragmatics:${scene.id}`))
    .flatMap((scene: any) =>
      scene.lines.slice(0, 1).map((line: any) => ({
        id: nativePragmaticsQuestionId(scene.id),
        type: "choice" as const,
        prompt: `${scene.title}: ${line.ko} 的意思是？`,
        answer: line.zh,
        choices: makeChoices(line.zh, pragmaticScenarios.flatMap((entry: any) => entry.lines.map((item: any) => item.zh)).filter((item: string) => item !== line.zh), 4, random),
        explain: scene.nativeMove,
        speak: line.ko
      }))
    );
  const nuanceQuestions = nuanceSets
    .filter((set: any) => practicedNative.has(`nuance:${set.id}`))
    .flatMap((set: any) =>
      set.examples.slice(0, 1).map((example: any) => ({
        id: nativeNuanceQuestionId(set.id),
        type: "choice" as const,
        prompt: `${set.title}: ${example.ko} 的语气/用法是？`,
        answer: example.register,
        choices: makeChoices(
          example.register,
          example.distractors ?? nuanceSets.flatMap((entry: any) => entry.examples.map((item: any) => item.register)).filter((item: string) => item !== example.register),
          4,
          random
        ),
        explain: set.explanation,
        speak: example.ko
      }))
    );
  const materialQuestions = immersionMaterials
    .filter((material) => validMaterials.has(material.id))
    .map((material): Question | null => {
      const retell = progress.materialEvidence[material.id]?.retell?.trim() ?? "";
      if (!hasKoreanRetellEvidence(retell, material.lines.map((line) => line.ko))) return null;
      return {
        id: materialRetellQuestionId(material.id),
        type: "type" as const,
        prompt: `${material.title}：回忆并写出已归档的复述原句。`,
        answer: retell,
        acceptable: [retell],
        explain: "本题核对归档原句，忽略句末标点；新的同义表达请到听读材料中自评归档。",
        speak: material.lines.map((line) => line.ko).join(" ")
      };
    })
    .filter((question): question is Question => Boolean(question));
  const outputQuestions = outputEntries
    .filter((entry) => validMaterials.has(entry.materialId))
    .filter((entry) => progress.materialEvidence[entry.materialId]?.outputEntryId === entry.id)
    .filter((entry) => {
      const material = immersionMaterials.find((item) => item.id === entry.materialId);
      return hasMaterialOutputEvidence(entry, material) && srsState.cards[outputCardId(entry.id)]?.payload.kind === "output";
    })
    .slice(0, 12)
    .map((entry) => ({
      id: outputTransferQuestionId(entry.id),
      type: "type" as const,
      prompt: `${entry.materialTitle}：回忆并写出已归档的目标改写原句。${entry.weakPoint ? `弱点：${entry.weakPoint}` : ""}`,
      answer: entry.targetRewrite,
      acceptable: [entry.targetRewrite],
      explain: "本题核对目标原句，忽略句末标点；不自动判断新表达是否自然。",
      speak: entry.targetRewrite
    }));
  const pool = [...completedLessonQuestions, ...hangulQuestions, ...vocabQuestions, ...vocabDictationQuestions, ...vocabClozeQuestions, ...grammarQuestions, ...soundQuestions, ...pragmaticQuestions, ...nuanceQuestions, ...materialQuestions, ...outputQuestions];
  if (pool.length) return prioritizeWeakPracticeQuestions(pool, progress, random).slice(0, count);
  return [];
}

function lessonIdsForProgressQuiz(progress: LearningProgress) {
  const ids = new Set(progress.completedLessons ?? []);
  for (const itemId of Object.keys(progress.practiceItems ?? {})) {
    const parsed = parseLessonReviewCardId(itemId);
    if (parsed?.lessonId) ids.add(parsed.lessonId);
  }
  return [...ids];
}

function getValidQuizMaterialIds(progress: LearningProgress, outputEntries: OutputEntry[], srsState: SrsState) {
  return immersionMaterials
    .filter((material) => {
      const evidence = progress.materialEvidence[material.id];
      if (!completedMaterialsHas(progress, material.id) || !evidence) return false;
      if (!hasKoreanDictationEvidence(evidence.dictation, material.dictation) || !hasKoreanRetellEvidence(evidence.retell, material.lines.map((line) => line.ko))) return false;
      if (!hasCompleteMaterialSelfCheck(evidence.selfCheck, material.selfCheck)) return false;
      if (srsState.cards[materialCardId(material.id)]?.payload.kind !== "material") return false;
      const output = outputEntries.find((entry) => entry.id === evidence.outputEntryId && entry.materialId === material.id);
      const target = output?.targetRewrite ?? "";
      return Boolean(output && hasMaterialOutputEvidence(output, material) && srsState.cards[outputCardId(output.id)]?.payload.kind === "output" && srsState.cards[outputCardId(output.id)]?.payload.answer === target);
    })
    .map((material) => material.id);
}

function hasCompleteNativeQuizEvidence(evidence: unknown) {
  if (!evidence || typeof evidence !== "object") return false;
  const entry = evidence as { listened?: unknown; retell?: unknown; transfer?: unknown };
  return entry.listened === true && hasKoreanRetellEvidence(entry.retell) && hasKoreanOutputRewrite(entry.transfer);
}

function completedMaterialsHas(progress: LearningProgress, materialId: string) {
  return progress.completedMaterials.includes(materialId);
}

function hasCompleteMaterialSelfCheck(input: unknown, expected: string[]) {
  if (!Array.isArray(input)) return false;
  const selected = new Set(input.map(String));
  return expected.every((item) => selected.has(item));
}

export function makeChoices(answer: string, distractors: string[], count = 4, random = Math.random) {
  const unique = [...new Set(distractors)].filter((item) => item !== answer);
  return shuffle([answer, ...shuffle(unique, random).slice(0, count - 1)], random);
}

export function grammarTranslationDistractors(pointId: string): string[] {
  return grammarPoints.filter((point) => point.id !== pointId).flatMap((point) => point.examples.map((example: { zh: string }) => example.zh));
}

export function vocabMeaningCue(item: { meaning: string; pos?: string }) {
  const ambiguous = vocab.filter((entry) => entry.meaning === item.meaning).length > 1;
  const pos = item.pos && Object.hasOwn(vocabPosLabels, item.pos)
    ? vocabPosLabels[item.pos as keyof typeof vocabPosLabels] : "";
  return ambiguous && pos ? `${item.meaning}（${pos}）` : item.meaning;
}

export function pronunciationContrastQuestion(
  pair: typeof pronunciationPairs[number], id: string, random = Math.random, side = random() < 0.5 ? 0 : 1
): Question {
  const answer = side === 0 ? pair.a : pair.b;
  return {
    id,
    type: pair.spellingPrompts ? "choice" : "listen",
    prompt: pair.spellingPrompts?.[side] ?? "听示范音，选出你听到的音节。",
    answer,
    choices: makeChoices(answer, [side === 0 ? pair.b : pair.a], 2, random),
    explain: `${pair.a} / ${pair.b}：${pair.tip}`,
    speak: answer
  };
}

type DistractorSource = {
  id: string;
  category?: string;
  level?: string;
  confusables?: string[];
};

export function buildDistractors<T extends DistractorSource>(
  item: T,
  pool: T[],
  pick: (entry: T) => string,
  count = 6,
  random = Math.random
): string[] {
  const answer = pick(item);
  const confusableIds = new Set(item.confusables ?? []);
  const buckets: T[][] = [[], [], [], []];
  for (const entry of pool) {
    if (entry.id === item.id) continue;
    if (confusableIds.has(entry.id)) buckets[0].push(entry);
    else if (item.category && entry.category === item.category) buckets[1].push(entry);
    else if (item.level && entry.level === item.level) buckets[2].push(entry);
    else buckets[3].push(entry);
  }
  const values: string[] = [];
  for (const bucket of [buckets[0], ...buckets.slice(1).map((bucket) => shuffle(bucket, random))]) {
    for (const entry of bucket) {
      const value = pick(entry);
      if (value && value !== answer && !values.includes(value)) values.push(value);
      if (values.length >= count) return values;
    }
  }
  return values;
}

export function shuffle<T>(items: T[], random = Math.random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function prioritizeWeakPracticeQuestions(pool: Question[], progress: LearningProgress, random = Math.random) {
  const byId = new Map(pool.map((question) => [question.id, question]));
  const weakQuestions = Object.entries(progress.practiceItems ?? {})
    .filter(([id, item]) => Boolean(id.trim()) && item.wrong > 0 && !item.lastCorrect && byId.has(id))
    .sort((a, b) => {
      const wrongDelta = b[1].wrong - a[1].wrong;
      if (wrongDelta) return wrongDelta;
      const attemptDelta = b[1].attempts - a[1].attempts;
      if (attemptDelta) return attemptDelta;
      return practiceSeenAtMs(b[1].lastSeenAt) - practiceSeenAtMs(a[1].lastSeenAt);
    })
    .map(([id]) => byId.get(id))
    .filter((question): question is Question => Boolean(question));
  if (!weakQuestions.length) return shuffle(pool, random);
  const weakIds = new Set(weakQuestions.map((question) => question.id));
  return [...weakQuestions, ...shuffle(pool.filter((question) => !weakIds.has(question.id)), random)];
}

function practiceSeenAtMs(value: string) {
  const parsed = Date.parse(value || "");
  return Number.isFinite(parsed) ? parsed : 0;
}

export function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
