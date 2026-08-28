import { m0Lessons } from "./m0.js";
import { m1Lessons } from "./m1.js";
import { m2aLessons } from "./m2a.js";
import { m2bLessons } from "./m2b.js";
import { m3Lessons } from "./m3.js";
import { m4Lessons } from "./m4.js";
import { completeLessons } from "./completions.js";

export const allLessons = completeLessons([
  ...m0Lessons,
  ...m1Lessons,
  ...m2aLessons,
  ...m2bLessons,
  ...m3Lessons,
  ...m4Lessons
]).sort((a, b) => a.order - b.order);
