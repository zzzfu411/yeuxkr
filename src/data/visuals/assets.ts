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
  | "lessonPronunciation"
  | "lessonCafe"
  | "lessonTransit"
  | "lessonTime"
  | "lessonHealth"
  | "lessonMedia"
  | "lessonHonorific"
  | "lessonOutput"
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
    "Cool-white Seoul study desk with transit fragments, waveform sheets, abstract syllable tiles, celadon, and brass tools.",
    "Seoul Transit Editorial hero with cool hanji, unlabeled route fragments, sound-wave sheets, abstract construction tiles, and restrained color accents.",
    "Hero editorial collage"
  ),
  workspace: createGeneratedAsset(
    "workspace",
    "workspace",
    "Modular weekly study cards, timer, waveform deck, tabs, and an unlabeled Seoul route fragment.",
    "Operational Korean study workspace with blank weekly slips, brass timer, sound-wave deck, celadon tabs, and deep-blue archive pieces.",
    "Learning workspace"
  ),
  path: createGeneratedAsset(
    "path",
    "path",
    "Unlabeled metropolitan route atlas with five tactile geometric milestone markers.",
    "Guided Korean path visualized as a folded unlabeled transit atlas, five material milestones, ink route, celadon, ocean blue, cinnabar, and brass.",
    "Guided path atlas"
  ),
  selfStudy: createGeneratedAsset(
    "selfStudy",
    "self-study",
    "Blank weekly rhythm cards, goal compass, focus dial, review deck, and checkpoint clips.",
    "Self-study planning system with interchangeable blank weekly cards, goal compass, focus dial, review deck, and checkpoint markers on cool hanji.",
    "Self-study planner"
  ),
  hangul: createGeneratedAsset(
    "hangul",
    "hangul",
    "Korean sound laboratory with abstract stroke pieces, airflow paper, mouth-position contours, and calibration tiles.",
    "Korean writing and sound laboratory using abstract square stroke architecture, airflow paper, contour cards, and acoustic calibration objects without letters.",
    "Hangul studio"
  ),
  vocabulary: createGeneratedAsset(
    "vocabulary",
    "vocabulary",
    "Everyday cafe, transit, home, weather, and health objects arranged in blank category trays.",
    "Vocabulary field atlas with real everyday objects, blank taxonomy trays, ink dividers, celadon tabs, deep-blue accents, and no labels.",
    "Vocabulary atlas"
  ),
  grammar: createGeneratedAsset(
    "grammar",
    "grammar",
    "Blank modular sentence strips interlocked with transparent syntax overlays and alignment markers.",
    "Korean grammar workshop visualized through blank interlocking sentence strips, transparent relation overlays, brass alignment marks, and colored rails.",
    "Grammar workshop"
  ),
  native: createGeneratedAsset(
    "native",
    "native",
    "Formal and relaxed stationery positions illustrating Korean register, social distance, and speech turns.",
    "Advanced Korean pragmatics desk with contrasting social distances, formal and relaxed materials, speech-turn tokens, and layered relation maps.",
    "Native pragmatics desk"
  ),
  immersion: createGeneratedAsset(
    "immersion",
    "immersion",
    "Headphones, field recorder, blank transcript cards, waveform strips, and retelling tokens.",
    "Korean listening immersion lab with headphones, recorder, blank transcripts, waveform strips, dictation tool, and listen-dictate-retell sequence tokens.",
    "Immersion lab"
  ),
  quiz: createGeneratedAsset(
    "quiz",
    "quiz",
    "Sound tokens, abstract syllable blocks, everyday objects, grammar strips, and a timing dial converging on one answer tray.",
    "Cross-skill Korean assessment table where sound, abstract writing blocks, vocabulary objects, grammar connections, and timing meet in one organized instrument.",
    "Mixed quiz transfer table"
  ),
  lesson: createGeneratedAsset(
    "lesson",
    "lesson",
    "Blank lesson slips, objective tabs, abstract construction sheet, listening token, and production card.",
    "General Korean lesson folio with blank teach-practice-transfer slips, objective tabs, abstract sound construction, listening token, and production evidence card.",
    "Lesson folio"
  ),
  lessonPronunciation: createGeneratedAsset(
    "lessonPronunciation",
    "lesson-pronunciation",
    "Precision airflow and sound-block experiments for Korean consonants and final sounds.",
    "Korean pronunciation laboratory with airflow flags, pressure rings, sound blocks, and a final-consonant landing rail on cool white hanji.",
    "Pronunciation laboratory"
  ),
  lessonCafe: createGeneratedAsset(
    "lessonCafe",
    "lesson-cafe",
    "Unbranded Seoul cafe counter objects arranged for ordering, quantity, takeaway, and payment practice.",
    "Seoul cafe language counter with ceramic drinkware, order tokens, quantity markers, takeaway tray, and blank payment terminal.",
    "Cafe service lesson"
  ),
  lessonTransit: createGeneratedAsset(
    "lessonTransit",
    "lesson-transit",
    "Unlabeled metro interchange map and direction tokens for Korean location and transit language.",
    "Seoul transit lesson with unlabeled interchange map, route arrows, platform geometry, destination markers, and a cinnabar transfer point.",
    "Transit and location lesson"
  ),
  lessonTime: createGeneratedAsset(
    "lessonTime",
    "lesson-time",
    "Clock, calendar, and two counting-token systems for Korean time, dates, and plans.",
    "Korean time and planning lesson with two counting systems, a numeral-free clock, blank calendar grid, appointment rail, and future-plan tabs.",
    "Time and planning lesson"
  ),
  lessonHealth: createGeneratedAsset(
    "lessonHealth",
    "lesson-health",
    "Calm unbranded pharmacy objects and symptom timeline for Korean health communication.",
    "Clinical Korean language still life with unbranded medicine, a digit-free thermometer, body-location card, symptom timeline, and polite request token.",
    "Health and pharmacy lesson"
  ),
  lessonMedia: createGeneratedAsset(
    "lessonMedia",
    "lesson-media",
    "Headphones, recorder, waveform strips, and reaction tokens for Korean media listening practice.",
    "Korean media listening studio with headphones, recorder, three-pass waveforms, blank subtitle frames, replay dial, and reaction-intensity tokens.",
    "Media listening lesson"
  ),
  lessonHonorific: createGeneratedAsset(
    "lessonHonorific",
    "lesson-honorific",
    "Workplace relation markers and formal objects for Korean honorific and register choices.",
    "Korean honorific lesson with formal workplace folder, blank visitor card, seating-distance markers, courtesy tray, seal, and relationship map.",
    "Honorific and register lesson"
  ),
  lessonOutput: createGeneratedAsset(
    "lessonOutput",
    "lesson-output",
    "Draft, revision, recording, and evidence objects arranged as a Korean output portfolio workflow.",
    "Korean output portfolio with opinion structure cards, retelling rail, revision overlays, recording spool, and evidence folio from draft to final.",
    "Output portfolio lesson"
  ),
  review: createGeneratedAsset(
    "review",
    "review",
    "Blank memory cards moving along an interval timeline beside a brass date dial and archive tray.",
    "Spaced repetition queue with disciplined blank cards, interval timeline, brass date dial, celadon review tray, deep-blue archive, and cinnabar due marker.",
    "SRS review queue"
  ),
  complete: createGeneratedAsset(
    "complete",
    "complete",
    "Finished study evidence bound with a celadon band beside a brass clip and deep-blue next-stage tab.",
    "Quiet earned completion represented by bound study evidence, restrained seal impression, celadon band, brass clip, and next-stage tab on cool hanji.",
    "Completion state"
  ),
  empty: createGeneratedAsset(
    "empty",
    "empty",
    "Open paper tray with one blank seed card, a celadon listening token, and generous clean space.",
    "Purposeful empty state with a single blank seed card, one listening token, deep-blue edge, brass registration pin, and ample cool-white space.",
    "Empty state"
  ),
  iconBase: createIconBaseAsset(
    "Kirina Korean app icon base with interlocking square stroke modules and transit-interchange geometry.",
    "Compact original app mark made from interlocking square modules suggesting a syllable block and transit interchange, with no readable characters.",
    "App icon base"
  )
} satisfies Record<VisualAssetId, VisualAsset>;
