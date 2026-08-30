import { TASK_IDS } from "./ids.ts";
import type { LearningWorkspace, StudyTask } from "./types.ts";

export type CompassContext = "workspace" | "path" | "self" | "review" | "mistakes" | "quiz" | "immersion" | "native";

export const ONBOARDING_TASK: StudyTask = {
  id: TASK_IDS.systemOnboarding,
  kind: "hangul",
  title: "完成三分钟入门设置",
  detail: "选目标、试听韩语并完成键盘检查。",
  href: "/onboarding",
  minutes: 3,
  ability: ["script"],
  source: "system",
  priority: 100,
  lane: "core",
  reason: "先确认发音与韩文输入，再进入第一课。"
};

export function needsOnboardingFunnel(
  profile: { onboardedAt?: string } | null | undefined,
  progress: { completedLessons?: string[] } | null | undefined
) {
  return !profile?.onboardedAt && !(progress?.completedLessons?.length);
}

export function pathSpineDetail(
  workspace: Pick<LearningWorkspace, "recommended" | "openStudy" | "nextLesson">,
  funnel = false
) {
  if (funnel) return "先完成三分钟入门，再进入第一课。";
  const primary = selectCompassPrimaryTask(workspace, "path");
  if (primary?.id === TASK_IDS.systemReview) return primary.title;
  if (primary && String(primary.id).startsWith("system:library-")) return primary.title;
  if (primary && String(primary.id).startsWith("system:retrain-")) return primary.title;
  if (workspace.nextLesson) return `下一课 ${workspace.nextLesson.order} · ${workspace.nextLesson.title}`;
  return "核心课已跑通，继续扩作品集";
}

export function selectCompassPrimaryTask(
  workspace: Pick<LearningWorkspace, "recommended" | "openStudy">,
  active: CompassContext,
  options: { isFirstVisit?: boolean } = {}
): StudyTask | null {
  if (options.isFirstVisit) return ONBOARDING_TASK;
  const recommended = workspace.recommended ?? [];
  const openStudy = workspace.openStudy ?? [];
  const findTask = (predicate: (task: StudyTask) => boolean) => recommended.find(predicate) ?? openStudy.find(predicate) ?? null;

  if (active === "path") {
    return (
      findTask((task) => task.id === TASK_IDS.systemReview) ??
      findTask((task) => String(task.id).startsWith("system:library-")) ??
      findTask((task) => String(task.id).startsWith("system:retrain-")) ??
      findTask((task) => task.id === TASK_IDS.openNextLesson || (task.kind === "lesson" && task.href.startsWith("/learn/") && !String(task.id).startsWith("system:retrain-"))) ??
      recommended[0] ??
      openStudy[0] ??
      null
    );
  }

  if (active === "self") {
    return (
      findTask((task) => task.source === "self" && task.id !== TASK_IDS.openReviewRhythm) ??
      findTask((task) => task.id === TASK_IDS.openSelfPlan) ??
      findTask((task) => task.id === TASK_IDS.openReviewRhythm) ??
      recommended[0] ??
      openStudy[0] ??
      null
    );
  }

  if (active === "immersion") {
    return findTask((task) => task.id === TASK_IDS.systemImmersion || task.id === TASK_IDS.openImmersion || task.kind === "immersion") ?? recommended[0] ?? openStudy[0] ?? null;
  }

  if (active === "review") {
    return selectCompassReviewTask(workspace) ?? recommended[0] ?? openStudy[0] ?? null;
  }

  if (active === "mistakes") {
    return findTask((task) => task.id === TASK_IDS.openMistakes || task.href.startsWith("/mistakes")) ?? selectCompassReviewTask(workspace) ?? recommended[0] ?? openStudy[0] ?? null;
  }

  if (active === "quiz") {
    return findTask((task) => task.id === TASK_IDS.quizMixed || task.id === TASK_IDS.openQuiz || task.kind === "quiz") ?? recommended[0] ?? openStudy[0] ?? null;
  }

  if (active === "native") {
    return findTask((task) => task.kind === "native" || task.href.startsWith("/native")) ?? recommended[0] ?? openStudy[0] ?? null;
  }

  return recommended[0] ?? openStudy[0] ?? null;
}

export function selectCompassReviewTask(workspace: Pick<LearningWorkspace, "recommended" | "openStudy">) {
  const allTasks = [...(workspace.recommended ?? []), ...(workspace.openStudy ?? [])];
  return allTasks.find((task) => task.id === TASK_IDS.systemReview) ?? allTasks.find((task) => task.id === TASK_IDS.openReviewRhythm || task.kind === "review") ?? null;
}
