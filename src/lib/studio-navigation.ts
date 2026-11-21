export const studyViews = ["courses", "hangul", "vocabulary", "grammar", "listening", "expression"] as const;
export const practiceViews = ["review", "mistakes", "quiz"] as const;
export type StudyView = typeof studyViews[number];
export type PracticeView = typeof practiceViews[number];
export type Studio = "study" | "practice";

export function resolveStudyView(value: string | null): StudyView {
  return studyViews.find((view) => view === value) ?? "courses";
}

export function resolvePracticeView(value: string | null): PracticeView {
  return practiceViews.find((view) => view === value) ?? "review";
}

const legacyViews: Record<string, { studio: Studio; view: StudyView | PracticeView }> = {
  "/path": { studio: "study", view: "courses" },
  "/hangul": { studio: "study", view: "hangul" },
  "/vocabulary": { studio: "study", view: "vocabulary" },
  "/grammar": { studio: "study", view: "grammar" },
  "/immersion": { studio: "study", view: "listening" },
  "/native": { studio: "study", view: "expression" },
  "/review": { studio: "practice", view: "review" },
  "/mistakes": { studio: "practice", view: "mistakes" },
  "/quiz": { studio: "practice", view: "quiz" }
};

export function legacyStudio(pathname: string) {
  return legacyViews[pathname];
}

export function navigationGroup(pathname: string): "/" | "/study" | "/practice" | "/settings" | null {
  if (pathname === "/") return "/";
  if (pathname === "/settings" || pathname === "/self-study") return "/settings";
  if (pathname === "/study" || pathname.startsWith("/learn/") || pathname === "/onboarding") return "/study";
  if (pathname === "/practice") return "/practice";
  const legacy = legacyStudio(pathname);
  return legacy ? `/${legacy.studio}` : null;
}

/** Keep material/query/hash deep links while routing navigation into a learning space. */
export function studioHref(href: string): string {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  const url = new URL(href, "https://kirina.invalid");
  const legacy = legacyStudio(url.pathname);
  if (!legacy) return href;
  url.pathname = `/${legacy.studio}`;
  url.searchParams.set("view", legacy.view);
  return `${url.pathname}${url.search}${url.hash}`;
}
