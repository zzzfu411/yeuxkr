export const CHOSEONG = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"] as const;

export const JUNGSEONG = ["ㅏ", "ㅐ", "ㅑ", "ㅒ", "ㅓ", "ㅔ", "ㅕ", "ㅖ", "ㅗ", "ㅘ", "ㅙ", "ㅚ", "ㅛ", "ㅜ", "ㅝ", "ㅞ", "ㅟ", "ㅠ", "ㅡ", "ㅢ", "ㅣ"] as const;

export const JONGSEONG = ["", "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ", "ㄹ", "ㄺ", "ㄻ", "ㄼ", "ㄽ", "ㄾ", "ㄿ", "ㅀ", "ㅁ", "ㅂ", "ㅄ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"] as const;

export const VOWEL_COMBOS: Record<string, string> = {
  "ㅗㅏ": "ㅘ",
  "ㅗㅐ": "ㅙ",
  "ㅗㅣ": "ㅚ",
  "ㅜㅓ": "ㅝ",
  "ㅜㅔ": "ㅞ",
  "ㅜㅣ": "ㅟ",
  "ㅡㅣ": "ㅢ"
};

export const JONG_COMBOS: Record<string, string> = {
  "ㄱㅅ": "ㄳ",
  "ㄴㅈ": "ㄵ",
  "ㄴㅎ": "ㄶ",
  "ㄹㄱ": "ㄺ",
  "ㄹㅁ": "ㄻ",
  "ㄹㅂ": "ㄼ",
  "ㄹㅅ": "ㄽ",
  "ㄹㅌ": "ㄾ",
  "ㄹㅍ": "ㄿ",
  "ㄹㅎ": "ㅀ",
  "ㅂㅅ": "ㅄ"
};

const VOWEL_SPLITS = invertCombos(VOWEL_COMBOS);
const JONG_SPLITS = invertCombos(JONG_COMBOS);
const SYLLABLE_BASE = 0xac00;
const SYLLABLE_COUNT = 11172;

export const QWERTY_TO_JAMO: Record<string, string> = {
  q: "ㅂ", w: "ㅈ", e: "ㄷ", r: "ㄱ", t: "ㅅ", y: "ㅛ", u: "ㅕ", i: "ㅑ", o: "ㅐ", p: "ㅔ",
  a: "ㅁ", s: "ㄴ", d: "ㅇ", f: "ㄹ", g: "ㅎ", h: "ㅗ", j: "ㅓ", k: "ㅏ", l: "ㅣ",
  z: "ㅋ", x: "ㅌ", c: "ㅊ", v: "ㅍ", b: "ㅠ", n: "ㅜ", m: "ㅡ",
  Q: "ㅃ", W: "ㅉ", E: "ㄸ", R: "ㄲ", T: "ㅆ", Y: "ㅛ", U: "ㅕ", I: "ㅑ", O: "ㅒ", P: "ㅖ",
  A: "ㅁ", S: "ㄴ", D: "ㅇ", F: "ㄹ", G: "ㅎ", H: "ㅗ", J: "ㅓ", K: "ㅏ", L: "ㅣ",
  Z: "ㅋ", X: "ㅌ", C: "ㅊ", V: "ㅍ", B: "ㅠ", N: "ㅜ", M: "ㅡ"
};

export function isVowelJamo(jamo: string) {
  return (JUNGSEONG as readonly string[]).includes(jamo);
}

export function isConsonantJamo(jamo: string) {
  return (CHOSEONG as readonly string[]).includes(jamo) || (JONGSEONG as readonly string[]).includes(jamo);
}

export function composeSyllable(cho: string, jung: string, jong = "") {
  const choIndex = (CHOSEONG as readonly string[]).indexOf(cho);
  const jungIndex = (JUNGSEONG as readonly string[]).indexOf(jung);
  const jongIndex = (JONGSEONG as readonly string[]).indexOf(jong);
  if (choIndex < 0 || jungIndex < 0 || jongIndex < 0) return null;
  return String.fromCharCode(SYLLABLE_BASE + (choIndex * 21 + jungIndex) * 28 + jongIndex);
}

export function decomposeSyllable(ch: string): { cho: string; jung: string; jong: string } | null {
  if (typeof ch !== "string" || ch.length !== 1) return null;
  const offset = ch.charCodeAt(0) - SYLLABLE_BASE;
  if (offset < 0 || offset >= SYLLABLE_COUNT) return null;
  return {
    cho: CHOSEONG[Math.floor(offset / 588)],
    jung: JUNGSEONG[Math.floor((offset % 588) / 28)],
    jong: JONGSEONG[offset % 28]
  };
}

export function composeJamoInput(text: string, jamo: string) {
  const base = typeof text === "string" ? text : "";
  if (!isVowelJamo(jamo) && !isConsonantJamo(jamo)) return base + jamo;
  const last = base.slice(-1);
  const rest = base.slice(0, -1);
  const syllable = decomposeSyllable(last);

  if (isVowelJamo(jamo)) {
    if ((CHOSEONG as readonly string[]).includes(last)) {
      const composed = composeSyllable(last, jamo);
      if (composed) return rest + composed;
    }
    if (isVowelJamo(last)) {
      const merged = VOWEL_COMBOS[last + jamo];
      if (merged) return rest + merged;
    }
    if (syllable) {
      if (!syllable.jong) {
        const merged = VOWEL_COMBOS[syllable.jung + jamo];
        if (merged) {
          const composed = composeSyllable(syllable.cho, merged);
          if (composed) return rest + composed;
        }
        return base + jamo;
      }
      const jongSplit = JONG_SPLITS[syllable.jong];
      const carried = jongSplit ? jongSplit[1] : syllable.jong;
      const remainingJong = jongSplit ? jongSplit[0] : "";
      const nextSyllable = composeSyllable(carried, jamo);
      if (nextSyllable && (CHOSEONG as readonly string[]).includes(carried)) {
        const reduced = composeSyllable(syllable.cho, syllable.jung, remainingJong);
        if (reduced) return rest + reduced + nextSyllable;
      }
    }
    return base + jamo;
  }

  if (syllable && !syllable.jong && (JONGSEONG as readonly string[]).includes(jamo)) {
    const composed = composeSyllable(syllable.cho, syllable.jung, jamo);
    if (composed) return rest + composed;
  }
  if (syllable && syllable.jong) {
    const merged = JONG_COMBOS[syllable.jong + jamo];
    if (merged) {
      const composed = composeSyllable(syllable.cho, syllable.jung, merged);
      if (composed) return rest + composed;
    }
  }
  return base + jamo;
}

export function backspaceJamo(text: string) {
  const base = typeof text === "string" ? text : "";
  if (!base) return "";
  const last = base.slice(-1);
  const rest = base.slice(0, -1);
  const syllable = decomposeSyllable(last);

  if (syllable) {
    if (syllable.jong) {
      const jongSplit = JONG_SPLITS[syllable.jong];
      const reducedJong = jongSplit ? jongSplit[0] : "";
      const reduced = composeSyllable(syllable.cho, syllable.jung, reducedJong);
      if (reduced) return rest + reduced;
    }
    const vowelSplit = VOWEL_SPLITS[syllable.jung];
    if (vowelSplit) {
      const reduced = composeSyllable(syllable.cho, vowelSplit[0]);
      if (reduced) return rest + reduced;
    }
    return rest + syllable.cho;
  }

  const vowelSplit = VOWEL_SPLITS[last];
  if (vowelSplit) return rest + vowelSplit[0];
  return rest;
}

function invertCombos(combos: Record<string, string>) {
  const result: Record<string, [string, string]> = {};
  for (const [pair, merged] of Object.entries(combos)) {
    result[merged] = [pair[0], pair[1]];
  }
  return result;
}
