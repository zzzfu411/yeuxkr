// One-off restructure: split lessons/vocab into per-milestone files, renumber
// orders 1-45 with slots for 15 new lessons, add branch unlock edges, absorb
// extended-content.js, and delete it. Content is preserved verbatim.
import { mkdirSync, writeFileSync } from "node:fs";
import { lessons } from "../src/data/curriculum.js";
import { vocab } from "../src/data/lexicon.js";
import { grammarPoints } from "../src/data/grammar.js";
import { pragmaticScenarios } from "../src/data/pragmatics.js";
import { nuanceSets } from "../src/data/nuance.js";

// new order for existing lessons + anchor edges to new lessons
const ORDER_MAP = {
  "l01-hangul-map": 1,
  "l02-vowels": 2,
  "l31-compound-vowels": 3,
  "l03-consonants": 4,
  "l32-tense-aspirated": 5,
  "l33-batchim": 6,
  "l04-first-sentences": 7,
  "l34-sound-changes": 8,
  "l05-particles": 9,
  "l35-negation": 10,
  "l36-yo-present": 11,
  "l37-numbers-counters": 12,
  "l06-cafe": 13,
  "l07-location": 14,
  "l38-time-date": 15,
  "l11-shopping-price": 16,
  "l08-past": 17,
  "l39-hamnida": 18,
  "l40-requests": 19,
  "l09-connectors": 20,
  "l12-time-plans": 21,
  "l41-irregulars": 22,
  "l13-permission": 23,
  "l42-ability-obligation": 24,
  "l14-progressive": 25,
  "l15-comparison": 26,
  "l45-desire-intent": 27,
  "l16-because": 28,
  "l43-adnominal": 29,
  "l17-phone-message": 30,
  "l18-health": 31,
  "l19-family-honorific": 32,
  "l20-invitation": 33,
  "l44-passive-causative": 34,
  "l21-slow-news": 35,
  "l22-media-shadowing": 36,
  "l23-social-posts": 37,
  "l24-opinion-paragraph": 38,
  "l25-retelling": 39,
  "l26-indirect-speech": 40,
  "l27-honorific-register": 41,
  "l10-native-softeners": 42,
  "l28-soft-refusal": 43,
  "l29-abstract-discussion": 44,
  "l30-native-capstone": 45
};

const ANCHOR_EDGES = {
  "l02-vowels": ["l31-compound-vowels"],
  "l03-consonants": ["l32-tense-aspirated"],
  "l04-first-sentences": ["l34-sound-changes"],
  "l05-particles": ["l35-negation"],
  "l07-location": ["l38-time-date"],
  "l08-past": ["l39-hamnida"],
  "l12-time-plans": ["l41-irregulars"],
  "l13-permission": ["l42-ability-obligation"],
  "l15-comparison": ["l45-desire-intent"],
  "l16-because": ["l43-adnominal"],
  "l20-invitation": ["l44-passive-causative"]
};

// file assignment by new order
const FILE_FOR_ORDER = (order) => {
  if (order <= 6) return "m0";
  if (order <= 16) return "m1";
  if (order <= 25) return "m2a";
  if (order <= 33) return "m2b";
  if (order <= 40) return "m3";
  return "m4";
};

function serialize(value, name) {
  const json = JSON.stringify(value, null, 2).replace(/"([A-Za-z_][A-Za-z0-9_]*)":/g, "$1:");
  return `export const ${name} = ${json};\n`;
}

const buckets = { m0: [], m1: [], m2a: [], m2b: [], m3: [], m4: [] };
for (const lesson of lessons) {
  const order = ORDER_MAP[lesson.id];
  if (!order) throw new Error(`no new order for ${lesson.id}`);
  const next = {
    ...lesson,
    order,
    unlocks: [...new Set([...(ANCHOR_EDGES[lesson.id] ?? []), ...(lesson.unlocks ?? [])])]
  };
  buckets[FILE_FOR_ORDER(order)].push(next);
}

mkdirSync("src/data/lessons", { recursive: true });
for (const [file, items] of Object.entries(buckets)) {
  items.sort((a, b) => a.order - b.order);
  writeFileSync(`src/data/lessons/${file}.js`, serialize(items, `${file}Lessons`), "utf8");
}
writeFileSync(
  "src/data/lessons/index.js",
  [
    'import { m0Lessons } from "./m0.js";',
    'import { m1Lessons } from "./m1.js";',
    'import { m2aLessons } from "./m2a.js";',
    'import { m2bLessons } from "./m2b.js";',
    'import { m3Lessons } from "./m3.js";',
    'import { m4Lessons } from "./m4.js";',
    "",
    "export const allLessons = [...m0Lessons, ...m1Lessons, ...m2aLessons, ...m2bLessons, ...m3Lessons, ...m4Lessons].sort((a, b) => a.order - b.order);",
    ""
  ].join("\n"),
  "utf8"
);

mkdirSync("src/data/vocab", { recursive: true });
for (const level of ["survival", "daily", "native"]) {
  const items = vocab.filter((item) => item.level === level);
  writeFileSync(`src/data/vocab/${level}.js`, serialize(items, `${level}Vocab`), "utf8");
}
writeFileSync(
  "src/data/vocab/index.js",
  [
    'import { survivalVocab } from "./survival.js";',
    'import { dailyVocab } from "./daily.js";',
    'import { nativeVocab } from "./native.js";',
    "",
    "export const allVocab = [...survivalVocab, ...dailyVocab, ...nativeVocab];",
    ""
  ].join("\n"),
  "utf8"
);

writeFileSync("generated/grammar-merged.js", serialize(grammarPoints, "grammarPoints"), "utf8");
writeFileSync("generated/pragmatics-merged.js", serialize(pragmaticScenarios, "pragmaticScenarios"), "utf8");
writeFileSync("generated/nuance-merged.js", serialize(nuanceSets, "nuanceSets"), "utf8");

console.log("lessons per file:", Object.fromEntries(Object.entries(buckets).map(([k, v]) => [k, v.length])));
console.log("vocab per level:", ["survival", "daily", "native"].map((level) => `${level}=${vocab.filter((v) => v.level === level).length}`).join(" "));
