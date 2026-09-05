import { runtimeLessons as allLessons } from "./lessons/runtime.generated.js";
import { proficiencyLevels, proficiencyMetrics } from "./proficiency.js";

export const milestones = [
  {
    id: "m0",
    title: "文字与声音对齐",
    range: "Week 1-3",
    outcome: "能拆音节块、读完全部基础字母与复合元音，并在双收音和连读里站稳。",
    acceptanceLevelId: "script-foundation",
    modules: ["hangul", "pronunciation", "starter-vocab"]
  },
  {
    id: "m1",
    title: "礼貌生存句",
    range: "Week 3-10",
    outcome: "能完成自我介绍、基础否定、数字时间、点餐购物和位置表达，并分清 은/는、이/가、을/를。",
    acceptanceLevelId: "survival-polite",
    modules: ["particles", "yo-style", "survival-dialogues"]
  },
  {
    id: "m2",
    title: "连续日常表达",
    range: "Month 3-8",
    outcome: "能用过去式、请求、许可、原因、条件、背景句和意图组织愿望、计划和连续经历。",
    acceptanceLevelId: "connected-daily",
    modules: ["connectors", "daily-vocab", "listening-shadowing"]
  },
  {
    id: "m3",
    title: "叙述与材料入口",
    range: "Month 8-14",
    outcome: "能处理被动/使动、让步、推测，并开始跟慢速新闻、短评和职场短对话做复述。",
    acceptanceLevelId: "media-discourse",
    modules: ["media", "nuance", "paragraph"]
  },
  {
    id: "m4",
    title: "语域桥接",
    range: "Month 14-18",
    outcome: "能按关系和场合调整敬语、缓和表达、拒绝和半语；这些课程只是长期进阶的一部分。",
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

export const UNLOCK_SCORE = 80;

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

export function firstActionableLesson(lessonIds, completedIds, scores = {}, fallbackId = "") {
  const items = [...new Set((lessonIds ?? []).filter(Boolean))]
    .map((id) => getLessonById(id))
    .filter(Boolean)
    .sort((a, b) => a.order - b.order);
  const enterable = items.find((item) => isLessonUnlocked(item.id, completedIds, scores));
  if (enterable) return enterable;
  if (fallbackId) {
    const fallback = getLessonById(fallbackId);
    if (fallback) return fallback;
  }
  return items[0] ?? null;
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
