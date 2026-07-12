import { getLessonPrerequisites, getNextLesson, isLessonMastered, isLessonUnlocked, lessons, UNLOCK_SCORE } from "../../data/curriculum.js";
import { immersionMaterialHref, immersionMaterials } from "../../data/materials.ts";
import { mapFocusToAbilities } from "./evidence.ts";
import { lessonReviewCardId } from "./ids.ts";
import type { AbilityId, LearningProgress } from "./types.ts";

export interface LessonBridgeStep {
  id: string;
  label: string;
  title: string;
  detail: string;
  href: string;
  done: boolean;
}

export interface LessonBridge {
  lessonId: string;
  unlocked: boolean;
  mastered: boolean;
  score: number;
  abilities: AbilityId[];
  missingPrerequisites: Array<{ id: string; order: number; title: string }>;
  reviewCards: number;
  transferMaterials: Array<{ id: string; title: string; level: string; minutes: number; completed: boolean; href: string }>;
  nextLesson: { id: string; order: number; title: string } | null;
  steps: LessonBridgeStep[];
}

export function buildLessonBridge(lesson: any, progress: LearningProgress, evidence?: { validMaterialIds?: string[] }): LessonBridge {
  const validMaterialIds = new Set(evidence?.validMaterialIds ?? progress.completedMaterials);
  const completedIds = new Set(progress.completedLessons);
  const score = Number(progress.lessonScores[lesson.id] ?? progress.previewLessonScores?.[lesson.id] ?? 0);
  const unlocked = isLessonUnlocked(lesson.id, completedIds, progress.lessonScores);
  const mastered = isLessonMastered(lesson.id, completedIds, progress.lessonScores);
  const missingPrerequisites = getLessonPrerequisites(lesson.id)
    .filter((item: any) => !isLessonMastered(item.id, completedIds, progress.lessonScores))
    .map((item: any) => ({ id: item.id, order: item.order, title: item.title }));
  const abilities = mapFocusToAbilities(lesson.focus ?? []);
  const transferMaterials = immersionMaterials
    .filter((material) => material.recommendedLessons.includes(lesson.id))
    .map((material) => ({
      id: material.id,
      title: material.title,
      level: material.level,
      minutes: material.minutes,
      completed: validMaterialIds.has(material.id),
      href: immersionMaterialHref(material.id)
    }));
  const simulatedCompleted = new Set(progress.completedLessons);
  const simulatedScores = { ...progress.lessonScores };
  if (unlocked && score >= UNLOCK_SCORE) {
    simulatedCompleted.add(lesson.id);
    simulatedScores[lesson.id] = Math.max(Number(simulatedScores[lesson.id] ?? 0), score);
  }
  const next = getNextLesson(simulatedCompleted, simulatedScores);
  const nextLesson = next ? { id: next.id, order: next.order, title: next.title } : null;
  const reviewCards = (lesson.drills ?? []).filter((drill: any) => drill?.prompt && drill?.answer).length;
  const dueMaterial = transferMaterials.find((material) => !material.completed) ?? transferMaterials[0] ?? null;

  const steps: LessonBridgeStep[] = [
    {
      id: "prerequisite",
      label: "01",
      title: missingPrerequisites.length ? "先补前置课" : "前置已对齐",
      detail: missingPrerequisites.length
        ? `建议先把 ${missingPrerequisites.map((item) => `第 ${item.order} 课`).join("、")} 达到 ${UNLOCK_SCORE}%。`
        : "这节课已经站在正确的路径位置上。",
      href: missingPrerequisites[0] ? `/learn/${missingPrerequisites[0].id}` : "/path",
      done: !missingPrerequisites.length
    },
    {
      id: "lesson",
      label: "02",
      title: mastered ? "课程已掌握" : unlocked ? "完成本课练习" : "仅记录预览分",
      detail: mastered
        ? `最高分 ${Number(progress.lessonScores[lesson.id] ?? 0)}%，复习卡已可进入 SRS。`
        : unlocked
          ? `达到 ${UNLOCK_SCORE}% 后写入核心路径，并生成 ${reviewCards} 张复习卡。`
          : `先修未达标时，练习只保存预览分数；不会生成复习卡或解锁后续课。`,
      href: `/learn/${lesson.id}`,
      done: mastered
    },
    {
      id: "review",
      label: "03",
      title: mastered ? "送回复习" : unlocked ? "达标后生成整课复习" : "先不写入 SRS",
      detail: mastered
        ? reviewCards ? `${reviewCards} 个本课题目已经可以成为长期记忆材料，错题也会进入复习队列。` : "本课暂无可复习题目。"
        : unlocked
          ? `达到 ${UNLOCK_SCORE}% 后才生成整课复习卡；未达标尝试只保留具体错题，避免把不稳内容伪装成已掌握。`
          : "旁路预览不会写入错题或整课复习，避免把未满足先修的内容伪装成已掌握。",
      href: mastered || (unlocked && score > 0) ? "/review" : `/learn/${lesson.id}`,
      done: mastered
    },
    {
      id: "transfer",
      label: "04",
      title: dueMaterial ? mastered ? "迁移到真实材料" : "达标后迁移到材料" : mastered ? "等待材料迁移" : "达标后再迁移",
      detail: dueMaterial
        ? mastered
          ? `${dueMaterial.title} · ${dueMaterial.minutes} min，把本课知识放进听写、复述和输出。`
          : unlocked
            ? `先把本课达到 ${UNLOCK_SCORE}%，再用 ${dueMaterial.title} 做听写、复述和输出迁移。`
            : `补齐先修后，再用 ${dueMaterial.title} 做听写、复述和输出迁移。`
        : mastered
          ? "当前材料库暂未绑定这节课，可以回到路径查看后续路线，或用综合测验做跨模块检查。"
          : `本课达到 ${UNLOCK_SCORE}% 后，再进入后续路线或综合测验。`,
      href: dueMaterial && mastered ? dueMaterial.href : mastered ? "/quiz" : `/learn/${lesson.id}`,
      done: Boolean(dueMaterial?.completed)
    }
  ];

  return {
    lessonId: lesson.id,
    unlocked,
    mastered,
    score,
    abilities,
    missingPrerequisites,
    reviewCards,
    transferMaterials,
    nextLesson,
    steps
  };
}

export function lessonReviewCardIds(lesson: any) {
  return (lesson.drills ?? [])
    .map((drill: any, index: number) => drill?.prompt && drill?.answer ? (drill.id ?? lessonReviewCardId(lesson.id, index)) : null)
    .filter(Boolean);
}

export function lessonsWithoutTransferMaterials() {
  const materialLessonIds = new Set(immersionMaterials.flatMap((material) => material.recommendedLessons));
  return lessons.filter((lesson: any) => !materialLessonIds.has(lesson.id)).map((lesson: any) => lesson.id);
}
