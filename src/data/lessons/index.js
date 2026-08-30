import { m0Lessons } from "./m0.js";
import { m1Lessons } from "./m1.js";
import { m2aLessons } from "./m2a.js";
import { m2bLessons } from "./m2b.js";
import { m3Lessons } from "./m3.js";
import { m4Lessons } from "./m4.js";
import { extraLessons } from "./extra.js";
import { completeLessons } from "./completions.js";
import { applyPathOrder } from "./path-sequence.js";

export const allLessons = applyPathOrder(completeLessons([
  ...m0Lessons,
  ...m1Lessons,
  ...m2aLessons,
  ...m2bLessons,
  ...m3Lessons,
  ...m4Lessons,
  ...extraLessons
]));
