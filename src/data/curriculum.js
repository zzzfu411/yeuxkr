// Full teaching content is loaded by the lesson server page and content tooling.
import { allLessons } from "./lessons/index.js";
export { milestones, normalizeTeachEntry, UNLOCK_SCORE, getLessonPrerequisites, isLessonMastered, isLessonUnlocked, firstActionableLesson, getMilestoneProgress, getNextLesson } from "./curriculum-runtime.js";
export const lessons = allLessons;
export function getLessonById(id) { return lessons.find(lesson => lesson.id === id); }
