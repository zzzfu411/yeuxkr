"use client";

import { grammarPoints } from "../../data/grammar.js";
import { hangulGroups } from "../../data/hangul.js";
import { vocab } from "../../data/lexicon.js";
import { soundChangeRules } from "../../data/sound-changes.js";
import { grammarQuestionId, hangulQuestionId, soundChangeQuestionId, vocabQuestionId } from "./ids.ts";
import { buildDistractors, makeChoices, seededRandom, type Question } from "./quiz.ts";

export const GATE_PASS_SCORE = 75;

export type GateKind = "hangul" | "vocab" | "grammar" | "soundChange";

export function buildGateQuestions(kind: GateKind, itemId: string, seed = 1): Question[] {
  const random = seededRandom(seed);
  if (kind === "hangul") return buildHangulGate(itemId, random);
  if (kind === "vocab") return buildVocabGate(itemId, random);
  if (kind === "grammar") return buildGrammarGate(itemId, random);
  if (kind === "soundChange") return buildSoundChangeGate(itemId, random);
  return [];
}

function buildHangulGate(itemId: string, random: () => number): Question[] {
  const group = hangulGroups.find((entry: any) => entry.items.some((item: any) => item.id === itemId));
  const item = group?.items.find((entry: any) => entry.id === itemId);
  if (!group || !item) return [];
  const otherGlyphs = group.items.filter((entry: any) => entry.id !== item.id).map((entry: any) => entry.glyph);
  const otherRoman = group.items.filter((entry: any) => entry.id !== item.id).map((entry: any) => entry.romanization);
  return [
    {
      id: `${hangulQuestionId(itemId)}:gate1`,
      type: "listen",
      prompt: "听例词，它练的是哪个字母？",
      answer: item.glyph,
      choices: makeChoices(item.glyph, otherGlyphs, 4, random),
      explain: `例词 ${item.example}（${item.exampleMeaning}）练的是 ${item.glyph}。`,
      speak: item.example
    },
    {
      id: `${hangulQuestionId(itemId)}:gate2`,
      type: "choice",
      prompt: `${item.glyph} 的罗马音提示是？`,
      answer: item.romanization,
      choices: makeChoices(item.romanization, otherRoman, 4, random),
      explain: item.cue,
      speak: item.example
    },
    {
      id: `${hangulQuestionId(itemId)}:gate3`,
      type: "choice",
      prompt: `哪个字母的发音要点是「${item.cue}」？`,
      answer: item.glyph,
      choices: makeChoices(item.glyph, otherGlyphs, 4, random),
      explain: `${item.glyph}：${item.cue}`,
      speak: item.example
    },
    {
      id: `${hangulQuestionId(itemId)}:gate4`,
      type: "dictation",
      prompt: "听音频，用韩文键盘打出这个例词。",
      answer: item.example,
      explain: `${item.example} = ${item.exampleMeaning}`,
      speak: item.example
    }
  ];
}

function buildVocabGate(itemId: string, random: () => number): Question[] {
  const item = vocab.find((entry: any) => entry.id === itemId);
  if (!item) return [];
  const koreanDistractors = buildDistractors(item, vocab as any[], (entry: any) => entry.korean, 6, random);
  const meaningDistractors = buildDistractors(item, vocab as any[], (entry: any) => entry.meaning, 6, random);
  const questions: Question[] = [
    {
      id: `${vocabQuestionId(itemId)}:gate1`,
      type: "choice",
      prompt: `「${item.meaning}」对应哪一个韩语？`,
      answer: item.korean,
      choices: makeChoices(item.korean, koreanDistractors, 4, random),
      explain: `${item.korean}（${item.romanization}）。${item.note}`,
      speak: item.korean
    },
    {
      id: `${vocabQuestionId(itemId)}:gate2`,
      type: "choice",
      prompt: `${item.korean} 的意思是？`,
      answer: item.meaning,
      choices: makeChoices(item.meaning, meaningDistractors, 4, random),
      explain: `${item.example} = ${item.exampleMeaning}`,
      speak: item.korean
    },
    {
      id: `${vocabQuestionId(itemId)}:gate3`,
      type: "dictation",
      prompt: "听音频，用韩文写出这个词。",
      answer: item.korean,
      explain: `${item.korean}（${item.romanization}）= ${item.meaning}`,
      speak: item.korean
    }
  ];
  if (typeof item.example === "string" && item.example.includes(item.korean)) {
    questions.push({
      id: `${vocabQuestionId(itemId)}:gate4`,
      type: "cloze",
      prompt: `补全例句：${item.exampleMeaning}`,
      answer: item.korean,
      clozeText: item.example.replace(item.korean, "___"),
      explain: `${item.example} = ${item.exampleMeaning}`,
      speak: item.example
    });
  } else {
    questions.push({
      id: `${vocabQuestionId(itemId)}:gate4`,
      type: "translate",
      prompt: `「${item.meaning}」用韩语怎么说？`,
      answer: item.korean,
      acceptable: [item.korean],
      hint: `罗马音提示：${item.romanization}`,
      explain: `${item.korean}（${item.romanization}）`,
      speak: item.korean
    });
  }
  return questions;
}

function buildGrammarGate(itemId: string, random: () => number): Question[] {
  const point = grammarPoints.find((entry: any) => entry.id === itemId);
  const example = point?.examples?.[0];
  if (!point || !example) return [];
  const meaningDistractors = buildDistractors(point, grammarPoints as any[], (entry: any) => entry.meaning, 6, random);
  const pitfallDistractors = grammarPoints
    .filter((entry: any) => entry.id !== point.id)
    .map((entry: any) => entry.pitfalls?.[0])
    .filter(Boolean);
  const questions: Question[] = [
    {
      id: `${grammarQuestionId(itemId)}:gate1`,
      type: "choice",
      prompt: `${point.title}: ${example.ko} 的意思是？`,
      answer: example.zh,
      choices: makeChoices(example.zh, meaningDistractors, 4, random),
      explain: point.explanation,
      speak: example.ko
    },
    {
      id: `${grammarQuestionId(itemId)}:gate2`,
      type: "choice",
      prompt: `句型「${point.pattern}」表达的是？`,
      answer: point.meaning,
      choices: makeChoices(point.meaning, meaningDistractors, 4, random),
      explain: point.explanation,
      speak: example.ko
    }
  ];
  if (point.pitfalls?.[0] && pitfallDistractors.length >= 2) {
    questions.push({
      id: `${grammarQuestionId(itemId)}:gate3`,
      type: "choice",
      prompt: `使用 ${point.title} 时最需要避开的坑是？`,
      answer: point.pitfalls[0],
      choices: makeChoices(point.pitfalls[0], pitfallDistractors, 4, random),
      explain: point.explanation
    });
  } else {
    const second = point.examples?.[1] ?? example;
    questions.push({
      id: `${grammarQuestionId(itemId)}:gate3`,
      type: "choice",
      prompt: `${point.title}: ${second.ko} 的意思是？`,
      answer: second.zh,
      choices: makeChoices(second.zh, meaningDistractors, 4, random),
      explain: point.explanation,
      speak: second.ko
    });
  }
  return questions;
}

function buildSoundChangeGate(itemId: string, random: () => number): Question[] {
  const rule = soundChangeRules.find((entry: any) => entry.id === itemId);
  if (!rule || rule.examples.length < 2) return [];
  const [first, second, third] = rule.examples;
  const otherSpoken = soundChangeRules
    .flatMap((entry: any) => entry.examples.map((item: any) => item.spoken))
    .filter((item: string) => item !== first.spoken);
  const otherTitles = soundChangeRules.filter((entry: any) => entry.id !== rule.id).map((entry: any) => entry.title);
  const dictationExample = third ?? second;
  return [
    {
      id: `${soundChangeQuestionId(itemId)}:gate1`,
      type: "choice",
      prompt: `${rule.title}（${rule.korean}）：${first.written} 实际读作哪一个？`,
      answer: first.spoken,
      choices: makeChoices(first.spoken, otherSpoken, 4, random),
      explain: `${rule.rule}。${first.written} → [${first.spoken}]（${first.zh}）。`,
      speak: first.speak
    },
    {
      id: `${soundChangeQuestionId(itemId)}:gate2`,
      type: "choice",
      prompt: `${second.written} 读作 [${second.spoken}]，这是哪条音变规则？`,
      answer: rule.title,
      choices: makeChoices(rule.title, otherTitles, 4, random),
      explain: `${rule.rule}。`,
      speak: second.speak
    },
    {
      id: `${soundChangeQuestionId(itemId)}:gate3`,
      type: "dictation",
      prompt: "听音频，按标准拼写写出这个词（注意：听到的读音和写法不同）。",
      answer: dictationExample.written,
      explain: `写作 ${dictationExample.written}，读作 [${dictationExample.spoken}]（${dictationExample.zh}）。`,
      speak: dictationExample.speak
    }
  ];
}
