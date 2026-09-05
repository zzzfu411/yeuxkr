import { composeJamoInput, decomposeSyllable } from "./jamo.ts";

/** Check explicit written decompositions, not distractors or pronunciation spellings. */
export function decompositionMatches(word: string, blocks: string[]) {
  const syllables = [...word.normalize("NFC")];
  return syllables.length === blocks.length && syllables.every((syllable, index) => {
    const parts = decomposeSyllable(syllable);
    const written = blocks[index].replace(/[\s+]/g, "");
    return parts !== null && (parts.cho + parts.jung + parts.jong === written || [...written].reduce(composeJamoInput, "") === syllable);
  });
}

export function checkTeachingDecompositions(lessons: Array<{ id: string; teach?: unknown[] }>) {
  const errors: string[] = [];
  for (const lesson of lessons) {
    for (const input of lesson.teach ?? []) {
      if (!input || typeof input !== "object") continue;
      const entry = input as { body?: string; examples?: Array<{ ko: string; zh: string }> };
      const breakdown = entry.body?.match(/看见\s*([가-힣]+).*?再拆\s*([ㄱ-ㅎㅏ-ㅣ]+(?:\s*\/\s*[ㄱ-ㅎㅏ-ㅣ]+)*)/);
      if (breakdown && !decompositionMatches(breakdown[1], breakdown[2].split("/"))) {
        errors.push(`${lesson.id}: ${breakdown[1]} has an incorrect syllable breakdown`);
      }
      for (const example of entry.examples ?? []) {
        const parts = example.zh?.match(/^([ㄱ-ㅎㅏ-ㅣ](?:\s*\+\s*[ㄱ-ㅎㅏ-ㅣ]){1,2})(?!\s*\+)/);
        if (parts && /^[가-힣]$/.test(example.ko) && !decompositionMatches(example.ko, [parts[1]])) {
          errors.push(`${lesson.id}: ${example.ko} does not match ${parts[1]}`);
        }
      }
    }
  }
  return errors;
}
