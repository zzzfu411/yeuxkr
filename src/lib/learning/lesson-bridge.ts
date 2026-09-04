import { getLessonPrerequisites, getNextLesson, isLessonMastered, isLessonUnlocked, lessons, UNLOCK_SCORE } from "../../data/curriculum.js";
import { getMissingMaterialPrerequisiteIds, immersionMaterialHref, immersionMaterials } from "../../data/materials.ts";
import { mapFocusToAbilities } from "./evidence.ts";
import { lessonReviewCardId } from "./ids.ts";
import type { LibraryGap } from "./path-gates.ts";
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
  transferMaterials: Array<{
    id: string;
    title: string;
    level: string;
    minutes: number;
    completed: boolean;
    available: boolean;
    missingPrerequisiteIds: string[];
    href: string;
  }>;
  nextLesson: { id: string; order: number; title: string } | null;
  steps: LessonBridgeStep[];
}

export function buildLessonBridge(lesson: any, progress: LearningProgress, evidence?: { validMaterialIds?: string[]; libraryOk?: boolean; libraryMissing?: LibraryGap[] }): LessonBridge {
  const validMaterialIds = new Set(evidence?.validMaterialIds ?? progress.completedMaterials);
  const completedIds = new Set(progress.completedLessons);
  const score = Number(progress.lessonScores[lesson.id] ?? progress.previewLessonScores?.[lesson.id] ?? 0);
  const mastered = isLessonMastered(lesson.id, completedIds, progress.lessonScores);
  const libraryMissing = evidence?.libraryMissing ?? [];
  const libraryOk = evidence?.libraryOk ?? true;
  const unlocked = isLessonUnlocked(lesson.id, completedIds, progress.lessonScores) && (mastered || libraryOk);
  const missingPrerequisites = getLessonPrerequisites(lesson.id)
    .filter((item: any) => !isLessonMastered(item.id, completedIds, progress.lessonScores))
    .map((item: any) => ({ id: item.id, order: item.order, title: item.title }));
  const abilities = mapFocusToAbilities(lesson.focus ?? []);
  const transferMaterials = immersionMaterials
    .filter((material) => material.recommendedLessons.includes(lesson.id))
    .map((material) => {
      const missingPrerequisiteIds = getMissingMaterialPrerequisiteIds(material, completedIds);
      return {
        id: material.id,
        title: material.title,
        level: material.level,
        minutes: material.minutes,
        completed: validMaterialIds.has(material.id),
        available: missingPrerequisiteIds.length === 0,
        missingPrerequisiteIds,
        href: immersionMaterialHref(material.id)
      };
    });
  const simulatedCompleted = new Set(progress.completedLessons);
  const simulatedScores = { ...progress.lessonScores };
  if (unlocked && score >= UNLOCK_SCORE) {
    simulatedCompleted.add(lesson.id);
    simulatedScores[lesson.id] = Math.max(Number(simulatedScores[lesson.id] ?? 0), score);
  }
  const next = getNextLesson(simulatedCompleted, simulatedScores);
  const nextLesson = next ? { id: next.id, order: next.order, title: next.title } : null;
  const reviewCards = (lesson.drills ?? []).filter((drill: any) => drill?.prompt && drill?.answer).length;
  const dueMaterial = transferMaterials.find((material) => material.available && !material.completed)
    ?? transferMaterials.find((material) => material.available)
    ?? null;
  const lockedMaterial = transferMaterials.find((material) => !material.available) ?? null;

  const steps: LessonBridgeStep[] = [
    {
      id: "prerequisite",
      label: "01",
      title: missingPrerequisites.length ? "先学前置课" : !libraryOk && !mastered ? "先补基础内容" : "可以开始本课",
      detail: missingPrerequisites.length
        ? `建议先把 ${missingPrerequisites.map((item) => `第 ${item.order} 课`).join("、")} 达到 ${UNLOCK_SCORE}%。`
        : !libraryOk && !mastered
          ? `还需${libraryMissing.map((gap) => `${gap.label} ${gap.current}/${gap.target}`).join("、")}。补齐后，本课才会计入主线进度。`
          : "前置要求已满足，可以开始本课。",
      href: missingPrerequisites[0] ? `/learn/${missingPrerequisites[0].id}` : libraryMissing[0]?.href ?? "/path",
      done: !missingPrerequisites.length && (mastered || libraryOk)
    },
    {
      id: "lesson",
      label: "02",
      title: mastered ? "本课已完成" : unlocked ? "完成本课练习" : "当前只能预览",
      detail: mastered
        ? `最高分 ${Number(progress.lessonScores[lesson.id] ?? 0)}%，本课内容已加入间隔复习。`
        : unlocked
          ? `达到 ${UNLOCK_SCORE}% 后，本课会计入主线进度，并生成 ${reviewCards} 张复习卡。`
          : "前置要求尚未满足。本次只保存预览分数，不会生成复习卡或解锁后续课程。",
      href: `/learn/${lesson.id}`,
      done: mastered
    },
    {
      id: "review",
      label: "03",
      title: mastered ? "复习卡已生成" : unlocked ? "完成后加入复习" : "暂不加入复习",
      detail: mastered
        ? reviewCards ? `本课有 ${reviewCards} 道题进入间隔复习，答错的题也会加入错题本。` : "本课暂无可复习题目。"
        : unlocked
          ? `达到 ${UNLOCK_SCORE}% 后才会生成整课复习卡；未达标时只保留具体错题。`
          : "预览不会生成错题或整课复习，也不会计为完成。",
      href: mastered || (unlocked && score > 0) ? "/review" : `/learn/${lesson.id}`,
      done: mastered
    },
    {
      id: "transfer",
      label: "04",
      title: dueMaterial ? mastered ? "到情境听读里再用一次" : "完成后进入情境听读" : lockedMaterial ? "听读内容尚未解锁" : mastered ? "等待新的听读内容" : "完成后再综合运用",
      detail: dueMaterial
        ? mastered
          ? `${dueMaterial.title} · ${dueMaterial.minutes} 分钟。用本课内容做听写、复述和改写。`
          : unlocked
            ? `先让本课达到 ${UNLOCK_SCORE}%，再到“${dueMaterial.title}”做听写、复述和改写。`
            : `补齐前置要求后，再到“${dueMaterial.title}”做听写、复述和改写。`
        : lockedMaterial
          ? mastered
            ? `材料还需要先完成 ${lockedMaterial.missingPrerequisiteIds.length} 节前置课；当前不会跳进未解锁材料。`
            : `先把本课达到 ${UNLOCK_SCORE}%，材料还需要完成 ${lockedMaterial.missingPrerequisiteIds.length} 节前置课；当前不会跳进未解锁材料。`
        : mastered
          ? "当前还没有与本课直接对应的听读内容。可以继续下一课，或做一组综合测验。"
          : `本课达到 ${UNLOCK_SCORE}% 后，再继续后续课程或综合测验。`,
      href: dueMaterial && mastered ? dueMaterial.href : mastered ? "/path" : `/learn/${lesson.id}`,
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
