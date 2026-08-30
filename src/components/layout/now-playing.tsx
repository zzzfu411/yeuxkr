"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { Play, SkipBack, SkipForward } from "lucide-react";
import { useLearningWorkspace } from "@/lib/learning/workspace";
import {
  buildPlayQueue,
  formatTrackTime,
  KIND_LABEL,
  matchQueueIndex,
  nowPlayingNav,
  taskGlyph,
  trackProgress,
  type QueueTrack
} from "@/lib/learning/player";
import { needsOnboardingFunnel } from "@/lib/learning/compass";

const QUEUE_PENDING: QueueTrack = {
  href: "/path",
  title: "正在整理今日页",
  detail: "本机进度加载中。",
  minutes: 1,
  kind: "lesson"
};

const emptySubscribe = () => () => {};

function useClientMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

function useNowPlayingTrack() {
  const mounted = useClientMounted();
  const pathname = usePathname();
  const { workspace, srs } = useLearningWorkspace();
  const isFirstVisit = needsOnboardingFunnel(workspace.profile, workspace.progress);
  const search = mounted && typeof window !== "undefined" ? window.location.search : "";
  const queue = mounted ? buildPlayQueue(workspace, isFirstVisit) : [QUEUE_PENDING];
  const matchedIndex = mounted ? matchQueueIndex(queue, pathname, search) : -1;
  const nav = nowPlayingNav(queue, matchedIndex);
  return {
    workspace,
    srs,
    queue,
    mounted,
    ...nav,
    glyph: taskGlyph(nav.current),
    progress: trackProgress(nav.current, pathname, search),
    pathname
  };
}

export function NowPlayingRail() {
  const { workspace, srs, queue, mounted, inQueue, index, current, href, prevHref, nextHref, glyph, progress } = useNowPlayingTrack();
  const due = srs.due;

  return (
    <aside className="now-playing" aria-label="正在学习">
      <p className="np-kicker">오늘 · Today</p>
      <div className="np-cover hangul-display" aria-hidden="true">{glyph}</div>
      <p className="np-title">{current?.title ?? "从韩文开始"}</p>
      <p className="np-artist">
        {current ? `${KIND_LABEL[current.kind]} · ${current.detail}` : "今天的下一页会留在这里。"}
      </p>
      <div className="prog-wrap" title="当前学习进度">
        <span>0:00</span>
        <div className="prog-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label="当前学习进度">
          <div className="prog-fill" style={{ width: `${progress}%` }} />
        </div>
        <span>{formatTrackTime(current?.minutes ?? workspace.profile.minutesGoal)}</span>
      </div>
      <div className="np-controls">
        <Link href={prevHref} aria-label={`上一项：${queue.find((track) => track.href === prevHref)?.title ?? "上一项"}`} title="上一项">
          <SkipBack className="h-4 w-4" aria-hidden="true" />
        </Link>
        <Link href={href} className="play-btn" aria-label={current ? `开始：${current.title}` : "开始学习"}>
          <Play className="h-5 w-5 fill-current" aria-hidden="true" />
        </Link>
        <Link href={nextHref} aria-label={`下一项：${queue.find((track) => track.href === nextHref)?.title ?? "下一项"}`} title="下一项">
          <SkipForward className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
      <p className="np-kicker">
        {!mounted ? "读取中" : inQueue ? `${index + 1}/${queue.length}` : `建议 · ${queue.length}`} · {workspace.modeLabel} · 到期 {due}
      </p>
    </aside>
  );
}

export function NowPlayingBar() {
  const { current, href, glyph } = useNowPlayingTrack();

  return (
    <aside className="np-mobile" aria-label="正在学习">
      <div className="np-cover hangul-display" aria-hidden="true">{glyph}</div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black">{current?.title ?? "从韩文开始"}</p>
        <p className="truncate text-xs font-bold text-[var(--mild)]">{current ? KIND_LABEL[current.kind] : "YEUX KR"}</p>
      </div>
      <Link
        href={href}
        className="np-mobile-play"
        aria-label={current ? `开始：${current.title}` : "开始学习"}
      >
        <Play className="h-4 w-4 fill-current" aria-hidden="true" />
      </Link>
    </aside>
  );
}
