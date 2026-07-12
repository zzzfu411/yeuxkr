import { TASK_IDS } from "./ids.ts";
import type { LearningWorkspace, StudyTask } from "./types.ts";

export type CompassContext = "workspace" | "path" | "self" | "review" | "mistakes" | "quiz" | "immersion" | "native";

export function selectCompassPrimaryTask(workspace: Pick<LearningWorkspace, "recommended" | "openStudy">, active: CompassContext): StudyTask | null {
  const recommended = workspace.recommended ?? [];
  const openStudy = workspace.openStudy ?? [];
  const findTask = (predicate: (task: StudyTask) => boolean) => recommended.find(predicate) ?? openStudy.find(predicate) ?? null;

  if (active === "path") {
    return findTask((task) => task.id === TASK_IDS.openNextLesson || (task.kind === "lesson" && task.href.startsWith("/learn/"))) ?? recommended[0] ?? openStudy[0] ?? null;
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
