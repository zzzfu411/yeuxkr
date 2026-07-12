export type VisualAssetId =
  | "hero"
  | "workspace"
  | "path"
  | "selfStudy"
  | "hangul"
  | "vocabulary"
  | "grammar"
  | "native"
  | "immersion"
  | "quiz"
  | "lesson"
  | "review"
  | "complete"
  | "empty"
  | "iconBase";

export type DisplayVisualAssetId = Exclude<VisualAssetId, "iconBase">;

export interface VisualAsset {
  id: VisualAssetId;
  src: string;
  source: string;
  alt: string;
  promptSummary: string;
  manifestLabel: string;
}

function createGeneratedAsset(
  id: Exclude<VisualAssetId, "iconBase">,
  fileStem: string,
  alt: string,
  promptSummary: string,
  manifestLabel: string
): VisualAsset {
  return {
    id,
    src: `/assets/generated/${fileStem}.webp`,
    source: `/assets/generated/${fileStem}.png`,
    alt,
    promptSummary,
    manifestLabel
  };
}

function createIconBaseAsset(alt: string, promptSummary: string, manifestLabel: string): VisualAsset {
  const source = "/assets/generated/icon-base.png";
  return {
    id: "iconBase",
    src: source,
    source,
    alt,
    promptSummary,
    manifestLabel
  };
}

export const visualAssets = {
  hero: createGeneratedAsset(
    "hero",
    "hero",
    "Hero study collage with Seoul map fragments, Hangul specimens, and waveform study cards.",
    "Seoul Editorial Study Atlas hero: warm Korean paper desk, Seoul map geometry, Hangul specimens, waveform cards, celadon and brass accents.",
    "Hero editorial collage"
  ),
  workspace: createGeneratedAsset(
    "workspace",
    "workspace",
    "Editorial learning workspace with Hangul notes, route map pieces, and sound-wave study cards.",
    "Seoul Editorial Study Atlas workspace: learning atlas desk with Hangul notes, route map, sound-wave cards, refined stationery.",
    "Learning workspace"
  ),
  path: createGeneratedAsset(
    "path",
    "path",
    "Guided path board with folded route map, milestone ribbons, and lesson planning cards.",
    "Guided path atlas: folded Seoul route map, milestone ribbons, lesson cards, brass pins, celadon tabs.",
    "Guided path atlas"
  ),
  selfStudy: createGeneratedAsset(
    "selfStudy",
    "self-study",
    "Self-study planner with weekly rhythm cards, goals, and quiet desk stationery.",
    "Self-study planner: weekly rhythm cards, goal/intensity/focus planning, calendar tabs, brass clips, celadon ruler.",
    "Self-study planner"
  ),
  hangul: createGeneratedAsset(
    "hangul",
    "hangul",
    "Hangul tracing studio with syllable grids, pronunciation cards, and editorial desk tools.",
    "Hangul studio: tracing sheets, syllable construction grids, minimal-pair cards, technical warm editorial desk.",
    "Hangul studio"
  ),
  vocabulary: createGeneratedAsset(
    "vocabulary",
    "vocabulary",
    "Vocabulary atlas with category tabs, everyday objects, and example cards in a paper collage.",
    "Vocabulary atlas: category tabs, cafe/travel/home objects, example cards, refined paper collage.",
    "Vocabulary atlas"
  ),
  grammar: createGeneratedAsset(
    "grammar",
    "grammar",
    "Grammar workshop with sentence architecture strips, syntax overlays, and brass markers.",
    "Grammar workshop: sentence architecture board, pattern strips, syntax overlays, brass and celadon objects.",
    "Grammar workshop"
  ),
  native: createGeneratedAsset(
    "native",
    "native",
    "Native-expression desk with dialogue cards, register overlays, and relation-distance markers.",
    "Native pragmatics: dialogue theater cards, register overlays, relation-distance markers, mature editorial light.",
    "Native pragmatics desk"
  ),
  immersion: createGeneratedAsset(
    "immersion",
    "immersion",
    "Immersion lab with waveform strips, transcript cards, and listening practice equipment.",
    "Immersion lab: waveform strips, transcript cards, audio recorder, dictation and retelling overlays on a refined Seoul desk.",
    "Immersion lab"
  ),
  quiz: createGeneratedAsset(
    "quiz",
    "quiz",
    "Mixed quiz table with sound cards, syllable blocks, vocabulary objects, and grammar strips.",
    "Mixed quiz transfer table: sound cards, syllable blocks, vocabulary objects, grammar strips, brass timer.",
    "Mixed quiz transfer table"
  ),
  lesson: createGeneratedAsset(
    "lesson",
    "lesson",
    "Lesson folio with numbered teaching slips, objective tags, and Hangul construction sheets.",
    "Lesson folio: numbered teaching slips, objective tags, Hangul construction sheets, celadon bookmark.",
    "Lesson folio"
  ),
  review: createGeneratedAsset(
    "review",
    "review",
    "Review queue with stacked cards, interval markers, a brass timer, and memory timeline strips.",
    "SRS review queue: elegant card stack, interval markers, brass timer, celadon tray, memory timeline strips.",
    "SRS review queue"
  ),
  complete: createGeneratedAsset(
    "complete",
    "complete",
    "Completed study stack with a seal stamp, brass clip, and celadon bookmark.",
    "Completion state: completed study card stack, seal stamp, brass clip, celadon bookmark, restrained progress mood.",
    "Completion state"
  ),
  empty: createGeneratedAsset(
    "empty",
    "empty",
    "Empty paper tray with one blank Hangul seed card and generous negative space.",
    "Empty state: open paper tray, one blank Hangul seed card, celadon saucer, generous negative space.",
    "Empty state"
  ),
  iconBase: createIconBaseAsset(
    "Kirina Korean app icon base with a compact editorial mark and Hangul-inspired geometry.",
    "Kirina Korean app icon base: compact black editorial mark with refined Hangul-inspired geometry, celadon paper detail, brass accent, no readable text.",
    "App icon base"
  )
} satisfies Record<VisualAssetId, VisualAsset>;
