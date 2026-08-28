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
  if (syllables / Math.max(1, nonWhitespace) < 0.55) return false;
  const uniqueSyllables = new Set(normalizeKoreanSyllables(text)).size;
  if (uniqueSyllables < Math.min(5, Math.max(2, Math.ceil(minimumSyllables / 3)))) return false;
  return !hasExcessiveKoreanRepetition(text);
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

export function hasKoreanRetellEvidence(value: unknown, sources: unknown[] = []) {
  const words = koreanWords(value);
  return hasMeaningfulKoreanSentence(value, 8) &&
    new Set(words).size >= 3 &&
    !isKoreanSourceCopy(value, sources) &&
    (!sources.length || hasKoreanContentOverlap(value, sources));
}

export function hasKoreanContentOverlap(value: unknown, sources: unknown[] = []) {
  const evidenceWords = new Set(koreanContentWords(value));
  if (!evidenceWords.size) return false;
  return sources.some((source) => koreanContentWords(source).some((word) => evidenceWords.has(word)));
}

export function hasKoreanOutputRewrite(value: unknown) {
  const words = koreanWords(value);
  return hasMeaningfulKoreanSentence(value, 8) && new Set(words).size >= 2;
}

export function hasKoreanOutputDraft(value: unknown, minimumSyllables = 12) {
  const text = String(value ?? "").trim();
  const words = koreanWords(text);
  const uniqueWords = new Set(words);
  if (!hasMeaningfulKoreanSentence(text, minimumSyllables) || uniqueWords.size < 4) return false;
  if (minimumSyllables >= 24 && countKoreanClauses(text) < 2) return false;
  return true;
}

export function isKoreanSourceCopy(value: unknown, sources: unknown[] = []) {
  const evidence = normalizeKoreanSyllables(value);
  if (evidence.length < 8) return false;
  const sourceTexts = sources.map(normalizeKoreanSyllables).filter(Boolean);
  if (sourceTexts.some((source) => source.length >= 8 && (source === evidence || source.includes(evidence)))) return true;
  if (exactKoreanSourceCoverage(evidence, sourceTexts) >= 0.6) return true;
  if (sourceTexts.length < 2) return false;
  const joinedSources = sourceTexts.join("");
  return joinedSources.includes(evidence) || isExactKoreanSourceConcatenation(evidence, sourceTexts);
}

function exactKoreanSourceCoverage(evidence: string, sources: string[]) {
  const covered = Array<boolean>(evidence.length).fill(false);
  for (const source of [...new Set(sources.filter((item) => item.length >= 8))]) {
    let fromIndex = 0;
    while (fromIndex < evidence.length) {
      const index = evidence.indexOf(source, fromIndex);
      if (index < 0) break;
      for (let offset = index; offset < index + source.length; offset += 1) covered[offset] = true;
      fromIndex = index + source.length;
    }
  }
  return covered.filter(Boolean).length / Math.max(1, evidence.length);
}

export function materialOutputMinimumSyllables(level: unknown) {
  return level === "native" ? 28 : level === "growth" ? 20 : 12;
}

export function hasMaterialOutputEvidence(
  input: { draft?: unknown; weakPoint?: unknown; targetRewrite?: unknown } | null | undefined,
  material: { level?: unknown; lines?: Array<{ ko?: unknown }> } | null | undefined
) {
  if (!input || !material) return false;
  const draft = String(input.draft ?? "").trim();
  const weakPoint = String(input.weakPoint ?? "").trim();
  const targetRewrite = String(input.targetRewrite ?? "").trim();
  const sourceLines = material.lines?.map((line) => line.ko) ?? [];
  return hasKoreanOutputDraft(draft, materialOutputMinimumSyllables(material.level)) &&
    !isKoreanSourceCopy(draft, sourceLines) &&
    weakPoint.length >= 4 &&
    hasKoreanOutputRewrite(targetRewrite) &&
    normalizeComparableKorean(draft) !== normalizeComparableKorean(targetRewrite);
}

export function hasExcessiveKoreanRepetition(value: unknown) {
  const syllables = normalizeKoreanSyllables(value);
  if (syllables.length < 6) return false;
  const counts = new Map<string, number>();
  for (const syllable of syllables) counts.set(syllable, (counts.get(syllable) ?? 0) + 1);
  const dominantShare = Math.max(...counts.values()) / syllables.length;
  if (dominantShare > 0.42) return true;
  for (let period = 1; period <= Math.floor(syllables.length / 2); period += 1) {
    if (syllables.length / period < 2) continue;
    if ([...syllables].every((char, index) => char === syllables[index % period])) return true;
  }
  const words = koreanWords(value);
  if (words.length >= 4) {
    const wordCounts = new Map<string, number>();
    for (const word of words) wordCounts.set(word, (wordCounts.get(word) ?? 0) + 1);
    if (Math.max(...wordCounts.values()) / words.length > 0.5) return true;
  }
  return false;
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

function koreanWords(value: unknown) {
  return String(value ?? "").match(/[가-힣]+/g) ?? [];
}

function koreanContentWords(value: unknown) {
  return koreanWords(value)
    .map((word) => word.replace(/(?:에게서|한테서|으로|에서|에게|한테|까지|부터|처럼|보다|하고|이나|거나|은|는|이|가|을|를|에|도|만|와|과)$/u, ""))
    .filter((word) => word.length >= 2 && !/^(그리고|하지만|그래서|정말|조금|저는|제가|그것|이것)$/u.test(word));
}

function countKoreanClauses(value: unknown) {
  return String(value ?? "")
    .split(/[.!?。！？\n]+|(?:지만|는데|그래서|그러나|반면에|따라서)/u)
    .filter((part) => countHangulSyllables(part) >= 4)
    .length;
}

function normalizeComparableKorean(value: string) {
  return value.normalize("NFC").replace(/\s+/g, "").replace(/[.!?。！？]/g, "");
}

function koreanNgrams(value: string, size: number) {
  if (value.length < size) return [value].filter(Boolean);
  return Array.from({ length: value.length - size + 1 }, (_, index) => value.slice(index, index + size));
}

function isExactKoreanSourceConcatenation(evidence: string, sources: string[]) {
  const candidates = [...new Set(sources.filter((source) => source.length >= 4 && evidence.includes(source)))];
  const pieceCounts = Array<number>(evidence.length + 1).fill(-1);
  pieceCounts[0] = 0;
  for (let index = 0; index < evidence.length; index += 1) {
    if (pieceCounts[index] < 0) continue;
    for (const source of candidates) {
      if (!evidence.startsWith(source, index)) continue;
      const nextIndex = index + source.length;
      pieceCounts[nextIndex] = Math.max(pieceCounts[nextIndex], pieceCounts[index] + 1);
    }
  }
  return pieceCounts[evidence.length] >= 2;
}
