import {
  countHangulSyllables,
  hasKoreanOutputDraft,
  hasKoreanSourceOverlap,
  isKoreanSourceCopy
} from "./evidence.ts";

export type LessonCompletionTaskKind = "paragraph" | "retell" | "shadowing";

export interface LessonCompletionTask {
  kind: LessonCompletionTaskKind;
  title: string;
  prompt: string;
  source?: string;
  minSyllables?: number;
  minClauses?: number;
  markerGroups?: string[][];
  minRecordingSeconds?: number;
  fallbackMinSyllables?: number;
}

export interface LessonTaskEvidence {
  kind: LessonCompletionTaskKind;
  text: string;
  recordedSeconds: number;
  recordingId?: string;
  updatedAt: string;
}

export interface LessonTaskCheck {
  ready: boolean;
  checks: Array<{ id: string; label: string; passed: boolean }>;
}

export function lessonCompletionTask(lesson: unknown): LessonCompletionTask | null {
  if (!isRecord(lesson) || !isRecord(lesson.completionTask)) return null;
  const task = lesson.completionTask;
  if (!isTaskKind(task.kind) || typeof task.title !== "string" || typeof task.prompt !== "string") return null;
  return {
    kind: task.kind,
    title: task.title.trim(),
    prompt: task.prompt.trim(),
    source: cleanText(task.source, 1600) || undefined,
    minSyllables: positiveInteger(task.minSyllables),
    minClauses: positiveInteger(task.minClauses),
    markerGroups: normalizeMarkerGroups(task.markerGroups),
    minRecordingSeconds: positiveNumber(task.minRecordingSeconds),
    fallbackMinSyllables: positiveInteger(task.fallbackMinSyllables)
  };
}

export function normalizeLessonTaskEvidence(input: unknown): LessonTaskEvidence | null {
  if (!isRecord(input) || !isTaskKind(input.kind)) return null;
  const recordedSeconds = Math.min(600, Math.max(0, Number(input.recordedSeconds) || 0));
  return {
    kind: input.kind,
    text: cleanText(input.text, 4000),
    recordedSeconds: Math.round(recordedSeconds * 10) / 10,
    recordingId: typeof input.recordingId === "string" && input.recordingId.trim() ? input.recordingId.trim().slice(0, 180) : undefined,
    updatedAt: typeof input.updatedAt === "string" && input.updatedAt.trim()
      ? input.updatedAt
      : new Date().toISOString()
  };
}

export function checkLessonTaskEvidence(task: LessonCompletionTask | null | undefined, input: unknown): LessonTaskCheck {
  if (!task) return { ready: true, checks: [] };
  const evidence = normalizeLessonTaskEvidence(input);
  if (!evidence || evidence.kind !== task.kind) {
    return {
      ready: false,
      checks: [{ id: "saved", label: "保存本课作品", passed: false }]
    };
  }

  if (task.kind === "shadowing") return checkShadowingEvidence(task, evidence);

  const minimumSyllables = task.minSyllables ?? 24;
  const minimumClauses = task.minClauses ?? 3;
  const markerGroups = task.markerGroups ?? [];
  const checks = [
    {
      id: "length",
      label: `至少 ${minimumSyllables} 个韩文音节`,
      passed: hasKoreanOutputDraft(evidence.text, minimumSyllables)
    },
    {
      id: "clauses",
      label: `至少 ${minimumClauses} 个完整分句`,
      passed: countKoreanClauses(evidence.text) >= minimumClauses
    },
    ...markerGroups.map((markers, index) => ({
      id: `marker-${index}`,
      label: `包含 ${markers.join(" / ")} 中的一项`,
      passed: markers.some((marker) => evidence.text.includes(marker))
    }))
  ];
  if (task.kind === "retell" && task.source) {
    checks.push({
      id: "original",
      label: "使用自己的表达，不逐字复制原文",
      passed: !isKoreanSourceCopy(evidence.text, [task.source])
    });
  }
  return { ready: checks.every((check) => check.passed), checks };
}

function checkShadowingEvidence(task: LessonCompletionTask, evidence: LessonTaskEvidence): LessonTaskCheck {
  const minimumSeconds = task.minRecordingSeconds ?? 4;
  const fallbackMinimum = task.fallbackMinSyllables ?? 12;
  const recorded = evidence.recordedSeconds >= minimumSeconds && Boolean(evidence.recordingId);
  const fallback = Boolean(
    task.source &&
    countHangulSyllables(evidence.text) >= fallbackMinimum &&
    hasKoreanSourceOverlap(evidence.text, [task.source])
  );
  const checks = [
    {
      id: "shadowing",
      label: `录下至少 ${minimumSeconds} 秒的最后一轮，或完成无文本听后复现`,
      passed: recorded || fallback
    },
    {
      id: "review",
      label: recorded ? "已生成可回听录音" : "已完成韩语听后复现",
      passed: recorded || fallback
    }
  ];
  return { ready: checks.every((check) => check.passed), checks };
}

function countKoreanClauses(value: string) {
  return value
    .split(/[.!?。！？\n]+|(?:지만|는데|그래서|그런데|근데|결국|반면에|따라서)/u)
    .filter((part) => countHangulSyllables(part) >= 3)
    .length;
}

function normalizeMarkerGroups(input: unknown) {
  if (!Array.isArray(input)) return undefined;
  const groups = input
    .map((group) => Array.isArray(group) ? group.map((item) => cleanText(item, 80)).filter(Boolean) : [])
    .filter((group) => group.length);
  return groups.length ? groups : undefined;
}

function isTaskKind(value: unknown): value is LessonCompletionTaskKind {
  return value === "paragraph" || value === "retell" || value === "shadowing";
}

function positiveInteger(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : undefined;
}

function positiveNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

function cleanText(value: unknown, maximum: number) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
