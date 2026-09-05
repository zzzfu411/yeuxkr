import { ONBOARDING_TASK } from "./compass.ts";
import type { LearningWorkspace, StudyTask, TaskKind } from "@/lib/learning/types";

export type QueueTrack = Pick<StudyTask, "href" | "title" | "detail" | "minutes" | "kind"> & {
  completed?: boolean;
};

export const NOW_PLAYING_LOCATION_EVENT = "kirina:now-playing-location";

export function getNowPlayingLocationSearch() {
  return typeof window === "undefined" ? "" : window.location.search;
}

export function subscribeNowPlayingLocation(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(NOW_PLAYING_LOCATION_EVENT, onStoreChange);
  window.addEventListener("popstate", onStoreChange);
  return () => {
    window.removeEventListener(NOW_PLAYING_LOCATION_EVENT, onStoreChange);
    window.removeEventListener("popstate", onStoreChange);
  };
}

export function notifyNowPlayingLocationChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(NOW_PLAYING_LOCATION_EVENT));
}

export function buildPlayQueue(workspace: LearningWorkspace, isFirstVisit: boolean): QueueTrack[] {
  if (isFirstVisit) return [ONBOARDING_TASK];
  const seen = new Set<string>();
  const queue: QueueTrack[] = [];
  for (const task of [...workspace.recommended, ...workspace.openStudy]) {
    if (seen.has(task.href)) continue;
    seen.add(task.href);
    queue.push(task);
  }
  return queue.length ? queue : [{ href: "/path", title: "学习路径", detail: "进入主线课表。", minutes: 8, kind: "lesson" }];
}

export function splitTrackHref(href: string) {
  const withoutHash = href.split("#")[0] ?? href;
  const queryAt = withoutHash.indexOf("?");
  if (queryAt < 0) return { pathname: withoutHash || "/", search: "" };
  return {
    pathname: withoutHash.slice(0, queryAt) || "/",
    search: withoutHash.slice(queryAt)
  };
}

function searchParamsMatch(trackSearch: string, pageSearch: string) {
  if (!trackSearch) return true;
  const trackParams = new URLSearchParams(trackSearch.startsWith("?") ? trackSearch.slice(1) : trackSearch);
  const pageParams = new URLSearchParams(pageSearch.startsWith("?") ? pageSearch.slice(1) : pageSearch);
  for (const [key, value] of trackParams) {
    if (pageParams.get(key) !== value) return false;
  }
  return true;
}

export function pathMatchesTrack(pathname: string, href: string, search = "") {
  const track = splitTrackHref(href);
  if (track.pathname === "/") return pathname === "/" && searchParamsMatch(track.search, search);
  if (track.pathname.startsWith("/learn/") && pathname.startsWith("/learn/")) {
    return pathname === track.pathname && searchParamsMatch(track.search, search);
  }
  if (pathname !== track.pathname && !pathname.startsWith(`${track.pathname}/`)) return false;
  return searchParamsMatch(track.search, search);
}

export function matchQueueIndex(queue: QueueTrack[], pathname: string, search = "") {
  const pageQuery = search.startsWith("?") ? search.slice(1) : search;
  if (pageQuery) {
    // A generic module entry (for example `/immersion`) must not shadow the
    // material-specific entry currently selected by the query string.
    const specific = queue.findIndex((track) => {
      const { search: trackSearch } = splitTrackHref(track.href);
      return Boolean(trackSearch) && pathMatchesTrack(pathname, track.href, search);
    });
    return specific;
  }
  const exact = queue.findIndex((track) => pathMatchesTrack(pathname, track.href, search));
  if (exact >= 0) return exact;
  return queue.findIndex((track) => {
    const { pathname: trackPath } = splitTrackHref(track.href);
    return pathMatchesTrack(pathname, trackPath, "");
  });
}

export function wrapQueueIndex(index: number, length: number) {
  if (length <= 0) return 0;
  return (index + length) % length;
}

export function nowPlayingNav(queue: QueueTrack[], matchedIndex: number) {
  const inQueue = matchedIndex >= 0;
  const index = inQueue ? matchedIndex : 0;
  const current = queue[index];
  const href = current?.href ?? "/path";
  return {
    inQueue,
    index,
    current,
    href,
    prevHref: inQueue ? (queue[wrapQueueIndex(index - 1, queue.length)]?.href ?? href) : href,
    nextHref: inQueue ? (queue[wrapQueueIndex(index + 1, queue.length)]?.href ?? href) : href
  };
}

export function trackProgress(track: QueueTrack | undefined, pathname: string, search = "") {
  if (!track) return 0;
  if (track.completed) return 100;
  return pathMatchesTrack(pathname, track.href, search) ? 42 : 0;
}

export const KIND_LABEL: Record<TaskKind, string> = {
  review: "复习",
  lesson: "课程",
  hangul: "韩文",
  vocabulary: "词汇",
  grammar: "语法",
  native: "表达",
  quiz: "测验",
  checkpoint: "规划",
  immersion: "听读"
};

export const KIND_GLYPH: Record<TaskKind, string> = {
  review: "복",
  lesson: "한",
  hangul: "가",
  vocabulary: "말",
  grammar: "문",
  native: "말",
  quiz: "퀴",
  checkpoint: "길",
  immersion: "듣"
};

const hangulRe = /[\uac00-\ud7a3]/;

export function firstHangul(text: string, fallback = "한") {
  return [...text].find((char) => hangulRe.test(char)) ?? fallback;
}

export function taskGlyph(task: Pick<StudyTask, "kind" | "title"> | null | undefined) {
  if (!task) return "한";
  return firstHangul(task.title, KIND_GLYPH[task.kind] ?? "한");
}

export function formatTrackTime(minutes: number) {
  const safe = Math.max(1, Math.round(minutes));
  return `${safe}:00`;
}
