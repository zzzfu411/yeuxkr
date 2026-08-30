export const PATH_SEQUENCE = [
  "l01-hangul-map",
  "l02-vowels",
  "l31-compound-vowels",
  "l03-consonants",
  "l32-tense-aspirated",
  "l33-batchim",
  "l46-syllable-fluency",
  "l47-double-batchim",
  "l04-first-sentences",
  "l34-sound-changes",
  "l05-particles",
  "l48-object-particle",
  "l49-scope-particles",
  "l35-negation",
  "l36-yo-present",
  "l37-numbers-counters",
  "l38-time-date",
  "l06-cafe",
  "l07-location",
  "l11-shopping-price",
  "l08-past",
  "l39-hamnida",
  "l40-requests",
  "l09-connectors",
  "l50-nde-background",
  "l16-because",
  "l51-nikka-reason",
  "l52-umyeon-condition",
  "l12-time-plans",
  "l41-irregulars",
  "l13-permission",
  "l42-ability-obligation",
  "l14-progressive",
  "l15-comparison",
  "l45-desire-intent",
  "l54-try-experience",
  "l55-purpose",
  "l53-myeonseo",
  "l43-adnominal",
  "l17-phone-message",
  "l18-health",
  "l19-family-honorific",
  "l20-invitation",
  "l44-passive-causative",
  "l56-concession",
  "l57-guess-evidence",
  "l21-slow-news",
  "l22-media-shadowing",
  "l23-social-posts",
  "l24-opinion-paragraph",
  "l25-retelling",
  "l26-indirect-speech",
  "l58-workplace-talk",
  "l27-honorific-register",
  "l10-native-softeners",
  "l28-soft-refusal",
  "l59-banmal-register",
  "l29-abstract-discussion",
  "l60-written-formal",
  "l30-native-capstone"
];

const MILESTONE_BY_ORDER = (order) => {
  if (order <= 8) return "m0";
  if (order <= 20) return "m1";
  if (order <= 43) return "m2";
  if (order <= 53) return "m3";
  return "m4";
};

export function applyPathOrder(lessons) {
  const byId = new Map(lessons.map((lesson) => [lesson.id, lesson]));
  const missing = PATH_SEQUENCE.filter((id) => !byId.has(id));
  if (missing.length) {
    throw new Error(`PATH_SEQUENCE missing lessons: ${missing.join(", ")}`);
  }
  return PATH_SEQUENCE.map((id, index) => {
    const lesson = byId.get(id);
    const order = index + 1;
    const next = PATH_SEQUENCE[index + 1];
    return {
      ...lesson,
      order,
      milestone: MILESTONE_BY_ORDER(order),
      duration: Math.max(16, Math.min(32, Number(lesson.duration) || 20)),
      unlocks: next ? [next] : []
    };
  });
}
