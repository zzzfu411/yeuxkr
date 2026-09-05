import type { AbilityId } from "./types";

export type LibraryCounts = {
  hangul: number;
  vocab: number;
  grammar: number;
  materials: number;
  native: number;
};

export type LibraryGap = {
  key: keyof LibraryCounts;
  label: string;
  href: string;
  current: number;
  target: number;
  ability: AbilityId;
};

export type LibraryGate = {
  ok: boolean;
  missing: LibraryGap[];
};

const LABELS: Record<keyof LibraryCounts, string> = {
  hangul: "韩文掌握",
  vocab: "已学词汇",
  grammar: "已学语法",
  materials: "情境听读",
  native: "自然表达"
};

const HREFS: Record<keyof LibraryCounts, string> = {
  hangul: "/hangul",
  vocab: "/vocabulary",
  grammar: "/grammar",
  materials: "/immersion",
  native: "/native"
};

const ABILITY: Record<keyof LibraryCounts, AbilityId> = {
  hangul: "script",
  vocab: "vocabulary",
  grammar: "grammar",
  materials: "listening",
  native: "native"
};

export function libraryTargetsForMilestone(milestoneId: string, lessonOrder = 0): Partial<LibraryCounts> {
  if (milestoneId === "m0") return lessonOrder >= 4 ? { hangul: 12 } : {};
  if (milestoneId === "m1") return { hangul: 28, vocab: 16 };
  if (milestoneId === "m2") return { hangul: 28, vocab: 40, grammar: 8 };
  if (milestoneId === "m3") return { hangul: 28, vocab: 80, grammar: 16, materials: 3 };
  if (milestoneId === "m4") return { hangul: 28, vocab: 120, grammar: 24, materials: 4, native: 4 };
  return {};
}

export function getLibraryGate(milestoneId: string, counts: LibraryCounts, lessonOrder = 0): LibraryGate {
  const targets = libraryTargetsForMilestone(milestoneId, lessonOrder);
  const missing: LibraryGap[] = [];
  for (const key of Object.keys(targets) as Array<keyof LibraryCounts>) {
    const target = Number(targets[key] ?? 0);
    const current = Number(counts[key] ?? 0);
    if (current >= target) continue;
    missing.push({
      key,
      label: LABELS[key],
      href: HREFS[key],
      current,
      target,
      ability: ABILITY[key]
    });
  }
  return { ok: missing.length === 0, missing };
}

export function getLibraryGateForLesson(
  lesson: { milestone?: string; order?: number } | null | undefined,
  counts: LibraryCounts
): LibraryGate {
  if (!lesson?.milestone) return { ok: true, missing: [] };
  return getLibraryGate(lesson.milestone, counts, Number(lesson.order) || 0);
}

export function libraryRepairHref(gate: LibraryGate): string | null {
  return gate.ok ? null : gate.missing[0]?.href ?? null;
}

export function getCoreLibraryGate(
  lesson: { milestone?: string; order?: number } | null | undefined,
  counts: LibraryCounts
): LibraryGate {
  return getLibraryGateForLesson(lesson, counts);
}
