import type { AbilityId } from "./types.ts";

export const KOREAN_TEXT_PATTERN = /[가-힣ㄱ-ㅎㅏ-ㅣ]/;
export const HANGUL_SYLLABLE_PATTERN = /[가-힣]/g;

export const OUTPUT_MISSION_PATTERN = /韩语|韓語|[가-힣ㄱ-ㅎㅏ-ㅣ]/;

export const FOCUS_TO_ABILITIES: Record<string, AbilityId[]> = {
  script: ["script"],
  sound: ["listening"],
  listening: ["listening"],
  vocab: ["vocabulary"],
  vocabulary: ["vocabulary"],
  travel: ["vocabulary"],
  time: ["vocabulary"],
  media: ["vocabulary"],
  grammar: ["grammar"],
  sentence: ["grammar"],
  discourse: ["grammar"],
  pragmatics: ["pragmatics"],
  native: ["native"],
  speaking: ["native"]
};

export function hasKoreanText(value: unknown) {
  return KOREAN_TEXT_PATTERN.test(String(value ?? ""));
}

export function countHangulSyllables(value: unknown) {
  return String(value ?? "").match(HANGUL_SYLLABLE_PATTERN)?.length ?? 0;
}

export function hasKoreanSyllables(value: unknown, minimum = 1) {
  return countHangulSyllables(value) >= minimum;
}

export function hasMeaningfulKoreanSentence(value: unknown, minimumSyllables = 4) {
  const text = String(value ?? "").trim();
  if (!text) return false;
  const syllables = countHangulSyllables(text);
  if (syllables < minimumSyllables) return false;
  const nonWhitespace = text.replace(/\s/g, "").length;
  return syllables / Math.max(1, nonWhitespace) >= 0.55;
}

export function hasKoreanSourceOverlap(value: unknown, sources: unknown[] = []) {
  const evidence = normalizeKoreanSyllables(value);
  if (evidence.length < 4) return false;
  const sourceTexts = sources.map(normalizeKoreanSyllables).filter((item) => item.length >= 4);
  if (!sourceTexts.length) return true;
  if (sourceTexts.some((source) => source.includes(evidence) || evidence.includes(source))) return true;
  const grams = koreanNgrams(evidence, evidence.length >= 5 ? 3 : 2);
  return sourceTexts.some((source) => grams.some((gram) => source.includes(gram)));
}

export function hasKoreanDictationEvidence(value: unknown, sources: unknown[] = []) {
  return hasMeaningfulKoreanSentence(value, 4) && hasKoreanSourceOverlap(value, sources);
}

export function hasKoreanRetellEvidence(value: unknown) {
  return hasMeaningfulKoreanSentence(value, 8);
}

export function hasKoreanOutputRewrite(value: unknown) {
  return hasMeaningfulKoreanSentence(value, 4);
}

export function requiresKoreanOutput(value: unknown) {
  return OUTPUT_MISSION_PATTERN.test(String(value ?? ""));
}

export function mapFocusToAbilities(focus: string[] = []): AbilityId[] {
  const result = new Set<AbilityId>();
  for (const item of focus) {
    for (const ability of FOCUS_TO_ABILITIES[item] ?? []) {
      result.add(ability);
    }
  }
  return [...result];
}

export function unknownFocusTags(focus: string[] = []) {
  return [...new Set(focus.filter((item) => !FOCUS_TO_ABILITIES[item]))];
}

function normalizeKoreanSyllables(value: unknown) {
  return String(value ?? "").match(HANGUL_SYLLABLE_PATTERN)?.join("") ?? "";
}

function koreanNgrams(value: string, size: number) {
  if (value.length < size) return [value].filter(Boolean);
  return Array.from({ length: value.length - size + 1 }, (_, index) => value.slice(index, index + size));
}
