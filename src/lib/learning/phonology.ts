import { pronunciationPairs } from "../../data/hangul.js";
import type { AbilityId } from "./types.ts";

export function pronunciationAbilities(itemId: string): AbilityId[] {
  const pair = pronunciationPairs.find((entry) => entry.id === itemId);
  return pair?.spellingPrompts ? ["script"] : ["listening"];
}

/** Common mergers cannot be the sole distinction in an isolated-audio question. */
export function confusableVowelSounds(glyph: string) {
  return [["ㅐ", "ㅔ"], ["ㅒ", "ㅖ"], ["ㅙ", "ㅚ", "ㅞ"]].find((group) => group.includes(glyph)) ?? [glyph];
}
