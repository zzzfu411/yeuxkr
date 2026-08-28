import { allLessons } from "./lessons/index.js";
import { proficiencyLevels, proficiencyMetrics } from "./proficiency.js";

export const milestones = [
  {
    id: "m0",
    title: "文字与声音对齐",
    range: "Day 1-14",
    outcome: "能读写基础韩文字母、拼出音节、听出核心最小对立。",
    acceptanceLevelId: "script-foundation",
    modules: ["hangul", "pronunciation", "starter-vocab"]
  },
  {
    id: "m1",
    title: "礼貌日常句",
    range: "Week 3-8",
    outcome: "能完成自我介绍、基础否定、数字时间、点餐购物和位置表达。",
    acceptanceLevelId: "survival-polite",
    modules: ["particles", "yo-style", "survival-dialogues"]
  },
  {
    id: "m2",
    title: "连续表达",
    range: "Month 3-6",
    outcome: "能用过去式、请求、许可、原因与转折组织愿望、计划和连续经历。",
    acceptanceLevelId: "connected-daily",
    modules: ["connectors", "daily-vocab", "listening-shadowing"]
  },
  {
    id: "m3",
    title: "真实材料入口",
    range: "Month 6-12",
    outcome: "能读懂慢速新闻、综艺片段和社交媒体短帖，并做复述。",
    acceptanceLevelId: "media-discourse",
    modules: ["media", "nuance", "paragraph"]
  },
  {
    id: "m4",
    title: "母语者级语用",
    range: "Year 2+",
    outcome: "能根据关系、场合、语域和隐含态度调整表达。",
    acceptanceLevelId: "native-layer",
    modules: ["register", "discourse", "native-collocations"]
  }
];

export const lessons = allLessons;

export function getLessonById(id) {
  return lessons.find((lesson) => lesson.id === id);
}

// teach 条目支持两种形态（渐进迁移）：
//   "一句讲解文本"
//   { title?, body, speak?, romanization?, examples?: [{ ko, zh, note? }] }
export function normalizeTeachEntry(entry) {
  if (typeof entry === "string") return { body: entry };
  if (entry && typeof entry === "object" && typeof entry.body === "string") {
    return {
      title: typeof entry.title === "string" ? entry.title : undefined,
      body: entry.body,
      speak: typeof entry.speak === "string" && entry.speak.trim() ? entry.speak : undefined,
      romanization: typeof entry.romanization === "string" && entry.romanization.trim() ? entry.romanization : undefined,
      examples: Array.isArray(entry.examples)
        ? entry.examples.filter((example) => example && typeof example.ko === "string" && typeof example.zh === "string")
        : undefined
    };
  }
  return { body: String(entry ?? "") };
}

export const UNLOCK_SCORE = 65;

export function getLessonPrerequisites(lessonId) {
  const lesson = getLessonById(lessonId);
  if (!lesson || lesson.order === 1) return [];
  const previous = lessons.find((item) => item.order === lesson.order - 1);
  const explicit = lessons.filter((item) => item.order < lesson.order && item.unlocks?.includes(lessonId));
  const prerequisites = new Map();

  for (const item of [...explicit, previous]) {
    if (item) prerequisites.set(item.id, item);
  }

  return [...prerequisites.values()].sort((a, b) => a.order - b.order);
}

export function isLessonMastered(lessonId, completedIds, scores = {}) {
  return completedIds.has(lessonId) && Number(scores[lessonId] ?? 0) >= UNLOCK_SCORE;
}

export function isLessonUnlocked(lessonId, completedIds, scores = {}) {
  const lesson = getLessonById(lessonId);
  if (!lesson) return false;
  if (lesson.order === 1) return true;
  return getLessonPrerequisites(lessonId).every((item) => isLessonMastered(item.id, completedIds, scores));
}

export function getMilestoneProgress(milestoneId, completedIds = new Set(), scores = {}, evidence = {}) {
  const milestone = milestones.find((item) => item.id === milestoneId);
  if (!milestone) return null;

  const completedSet = completedIds instanceof Set
    ? completedIds
    : new Set(Array.isArray(completedIds) ? completedIds : []);
  const legacyCompatibleScores = Object.fromEntries(
    [...completedSet].map((lessonId) => [lessonId, scores[lessonId] ?? UNLOCK_SCORE])
  );
  const milestoneLessons = lessons.filter((lesson) => lesson.milestone === milestoneId);
  const completedCount = milestoneLessons.filter((lesson) => {
    return isLessonMastered(lesson.id, completedSet, legacyCompatibleScores);
  }).length;
  const courseProgress = toPercent(completedCount, milestoneLessons.length);

  const acceptanceLevel = proficiencyLevels.find((level) => level.id === milestone.acceptanceLevelId);
  const requirements = (acceptanceLevel?.requirements ?? [])
    .filter((requirement) => requirement.metric !== "lessons")
    .map((requirement) => {
      const current = Math.max(0, Number(evidence[requirement.metric] ?? 0));
      return {
        ...requirement,
        label: proficiencyMetrics[requirement.metric] ?? requirement.metric,
        current,
        met: current >= requirement.target
      };
    });
  const metCount = requirements.filter((requirement) => requirement.met).length;
  const acceptanceProgress = toPercent(metCount, requirements.length);
  const courseComplete = milestoneLessons.length > 0 && completedCount === milestoneLessons.length;
  const acceptanceComplete = requirements.length > 0 && metCount === requirements.length;

  return {
    course: {
      completed: completedCount,
      total: milestoneLessons.length,
      progress: courseProgress,
      complete: courseComplete
    },
    acceptance: {
      levelId: acceptanceLevel?.id ?? null,
      band: acceptanceLevel?.band ?? "",
      met: metCount,
      total: requirements.length,
      progress: acceptanceProgress,
      complete: acceptanceComplete,
      requirements
    },
    complete: courseComplete && acceptanceComplete
  };
}

function toPercent(value, total) {
  if (!total) return 0;
  return Math.round((Math.min(Math.max(value, 0), total) / total) * 100);
}

export function getNextLesson(completedIds, scores = {}) {
  return lessons.find((lesson) => !isLessonMastered(lesson.id, completedIds, scores) && isLessonUnlocked(lesson.id, completedIds, scores)) ?? null;
}
