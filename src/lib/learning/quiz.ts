"use client";

import { lessons } from "../../data/curriculum.js";
import { hangulGroups, pronunciationPairs } from "../../data/hangul.js";
import { vocab } from "../../data/lexicon.js";
import { grammarPoints } from "../../data/grammar.js";
import { nuanceSets } from "../../data/nuance.js";
import { pragmaticScenarios } from "../../data/pragmatics.js";
import { soundChangeRules } from "../../data/sound-changes.js";
import { immersionMaterials } from "../../data/materials.ts";
import {
  grammarQuestionId,
  hangulQuestionId,
  lessonReviewCardId,
  materialCardId,
  materialRetellQuestionId,
  nativeNuanceQuestionId,
  nativePragmaticsQuestionId,
  outputCardId,
  outputTransferQuestionId,
  pronunciationQuestionId,
  vocabClozeQuestionId,
  vocabDictationQuestionId,
  vocabQuestionId
} from "./ids.ts";
import { hasKoreanDictationEvidence, hasKoreanOutputRewrite, hasKoreanRetellEvidence } from "./evidence.ts";
import { getOutputState, type OutputEntry } from "./output.ts";
import { getSrsState, type SrsState } from "./srs.ts";
import type { SrsCard } from "./srs.ts";
import type { LearningProgress, QuestionType } from "./types.ts";

export interface Question {
  id: string;
  type: QuestionType;
  prompt: string;
  answer: string;
  acceptable?: string[];
  choices?: string[];
  explain?: string;
  speak?: string;
  clozeText?: string;
  hint?: string;
}

export function normalizeAnswer(value: unknown) {
  return String(value ?? "")
    .normalize("NFC")
    .trim()
    .replace(/[.。?？!！…~〜]+$/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

export function checkAnswer(question: Question, answer: string) {
  const normalized = normalizeAnswer(answer);
  const accepted = [question.answer, ...(question.acceptable ?? [])].map(normalizeAnswer);
  return accepted.includes(normalized);
}

export function lessonQuestions(lessonId: string): Question[] {
  return lessonReviewQuestions(lessonId);
}

export function lessonReviewQuestions(lessonId: string): Question[] {
  const lesson = lessons.find((item: any) => item.id === lessonId);
  return ((lesson?.drills ?? []) as Question[]).map((question, index) => ({
    ...question,
    id: question.id ?? lessonReviewCardId(lessonId, index)
  }));
}

export function lessonQuestionId(lessonId: string, index: number) {
  return lessonReviewCardId(lessonId, index);
}

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
          speak: item.example
        } satisfies Question;
      }
      if (card.payload.kind === "pronunciation") {
        const pair = pronunciationPairs.find((entry: any) => entry.id === card.payload.itemId);
        if (!pair) return null;
        return {
          id: card.id,
          type: "choice",
          prompt: `${pair.a} vs ${pair.b}: 训练重点是什么？`,
          answer: pair.focus,
          choices: makeChoices(pair.focus, pronunciationPairs.filter((entry: any) => entry.id !== pair.id).map((entry: any) => entry.focus)),
          explain: pair.tip,
          speak: `${pair.a}. ${pair.b}`
        } satisfies Question;
      }
      if (card.payload.kind === "vocab") {
        const item = vocab.find((entry: any) => entry.id === card.payload.itemId);
        if (!item) return null;
        if (card.box >= 3) {
          return {
            id: card.id,
            type: "translate",
            prompt: `「${item.meaning}」用韩语怎么说？`,
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
        return {
          id: card.id,
          type: "type",
          prompt: card.payload.prompt,
          answer: card.payload.answer,
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
          speak: card.payload.speak
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
          choices: makeChoices(example.zh, buildDistractors(point, grammarPoints as any[], (entry: any) => entry.meaning)),
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
            choices: makeChoices(example.register, nuanceSets.flatMap((entry: any) => entry.examples.map((item: any) => item.register)).filter((item: string) => item !== example.register)),
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
        const prompt = card.payload.prompt ?? `${material.title}: ${material.retellPrompts[0] ?? "这段材料的核心信息是什么？"}`;
        const answer = card.payload.answer ?? material.lines[0]?.ko ?? material.title;
        return {
          id: card.id,
          type: "type",
          prompt,
          answer,
          acceptable: card.payload.acceptable ?? material.lines.map((line) => line.ko),
          explain: card.payload.explain ?? `用韩语复述重点：${material.summary}`,
          speak: card.payload.speak ?? material.lines.map((line) => line.ko).join(" ")
        } satisfies Question;
      }
      if (card.payload.kind === "output" && card.payload.prompt && card.payload.answer) {
        return {
          id: card.id,
          type: "type",
          prompt: card.payload.prompt,
          answer: card.payload.answer,
          explain: "这是你输出后设定的目标改写，重新写对或写得更自然后再延后复习。"
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
      speak: item.example
    }))
  );
  const vocabQuestions = vocab.map((item: any) => ({
    id: vocabQuestionId(item.id),
    type: "choice" as const,
    prompt: `${item.meaning} 对应哪一个韩语？`,
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
      choices: makeChoices(example.zh, buildDistractors(point, grammarPoints as any[], (entry: any) => entry.meaning, 6, random), 4, random),
      explain: point.explanation,
      speak: example.ko
    }))
  );
  const soundQuestions = pronunciationPairs.map((pair: any) => ({
    id: pronunciationQuestionId(pair.id),
    type: "choice" as const,
    prompt: `${pair.a} vs ${pair.b}: 训练重点是什么？`,
    answer: pair.focus,
    choices: makeChoices(pair.focus, pronunciationPairs.filter((entry: any) => entry.id !== pair.id).map((entry: any) => entry.focus), 4, random),
    explain: pair.tip,
    speak: `${pair.a}. ${pair.b}`
  }));
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
  const completedLessonQuestions = progress.completedLessons.flatMap((lessonId) => lessonReviewQuestions(lessonId));
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
        speak: item.example
      }))
  );
  const vocabQuestions = vocab
    .filter((item: any) => learnedVocab.has(item.id))
    .map((item: any) => ({
      id: vocabQuestionId(item.id),
      type: "choice" as const,
      prompt: `${item.meaning} 对应哪一个韩语？`,
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
      prompt: "听音频，用韩文写出这个词。",
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
        choices: makeChoices(example.zh, buildDistractors(point, grammarPoints as any[], (entry: any) => entry.meaning, 6, random), 4, random),
        explain: point.explanation,
        speak: example.ko
      }))
    );
  const soundQuestions = pronunciationPairs
    .filter((pair: any) => learnedPronunciation.has(pair.id))
    .map((pair: any) => ({
      id: pronunciationQuestionId(pair.id),
      type: "choice" as const,
      prompt: `${pair.a} vs ${pair.b}: 训练重点是什么？`,
      answer: pair.focus,
      choices: makeChoices(pair.focus, pronunciationPairs.filter((entry: any) => entry.id !== pair.id).map((entry: any) => entry.focus), 4, random),
      explain: pair.tip,
      speak: `${pair.a}. ${pair.b}`
    }));
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
        choices: makeChoices(example.register, nuanceSets.flatMap((entry: any) => entry.examples.map((item: any) => item.register)).filter((item: string) => item !== example.register), 4, random),
        explain: set.explanation,
        speak: example.ko
      }))
    );
  const materialQuestions = immersionMaterials
    .filter((material) => validMaterials.has(material.id))
    .map((material): Question | null => {
      const retell = progress.materialEvidence[material.id]?.retell?.trim() ?? "";
      if (!hasKoreanRetellEvidence(retell)) return null;
      return {
        id: materialRetellQuestionId(material.id),
        type: "type" as const,
        prompt: `${material.title}: 复述你归档过的一个核心信息。`,
        answer: retell,
        acceptable: [retell],
        explain: `用自己的韩语复述重点：${material.summary}`,
        speak: material.lines.map((line) => line.ko).join(" ")
      };
    })
    .filter((question): question is Question => Boolean(question));
  const outputQuestions = outputEntries
    .filter((entry) => validMaterials.has(entry.materialId))
    .filter((entry) => progress.materialEvidence[entry.materialId]?.outputEntryId === entry.id)
    .filter((entry) => {
      const target = entry.targetRewrite || "";
      return hasKoreanOutputRewrite(target) && srsState.cards[outputCardId(entry.id)]?.payload.kind === "output";
    })
    .slice(0, 12)
    .map((entry) => ({
      id: outputTransferQuestionId(entry.id),
      type: "type" as const,
      prompt: `${entry.materialTitle}: 重新写出你的目标改写。${entry.weakPoint ? `弱点：${entry.weakPoint}` : ""}`,
      answer: entry.targetRewrite || entry.draft,
      acceptable: [entry.targetRewrite, entry.draft].filter(Boolean),
      explain: `输出任务：${entry.mission || "把自己的弱点改写成更自然的韩语。"}`,
      speak: entry.targetRewrite || entry.draft
    }));
  const pool = [...completedLessonQuestions, ...hangulQuestions, ...vocabQuestions, ...vocabDictationQuestions, ...vocabClozeQuestions, ...grammarQuestions, ...soundQuestions, ...pragmaticQuestions, ...nuanceQuestions, ...materialQuestions, ...outputQuestions];
  if (pool.length) return prioritizeWeakPracticeQuestions(pool, progress, random).slice(0, count);
  return [];
}

function getValidQuizMaterialIds(progress: LearningProgress, outputEntries: OutputEntry[], srsState: SrsState) {
  return immersionMaterials
    .filter((material) => {
      const evidence = progress.materialEvidence[material.id];
      if (!completedMaterialsHas(progress, material.id) || !evidence) return false;
      if (!hasKoreanDictationEvidence(evidence.dictation, material.dictation) || !hasKoreanRetellEvidence(evidence.retell)) return false;
      if (!hasCompleteMaterialSelfCheck(evidence.selfCheck, material.selfCheck)) return false;
      if (srsState.cards[materialCardId(material.id)]?.payload.kind !== "material") return false;
      const output = outputEntries.find((entry) => entry.id === evidence.outputEntryId && entry.materialId === material.id);
      const target = output?.targetRewrite ?? "";
      return Boolean(output && hasKoreanOutputRewrite(target) && srsState.cards[outputCardId(output.id)]?.payload.kind === "output" && srsState.cards[outputCardId(output.id)]?.payload.answer === target);
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
