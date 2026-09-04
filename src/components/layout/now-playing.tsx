"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { Play } from "lucide-react";
import { useLearningWorkspace } from "@/lib/learning/workspace";
import {
  buildPlayQueue,
  KIND_LABEL,
  getNowPlayingLocationSearch,
  matchQueueIndex,
  nowPlayingNav,
  subscribeNowPlayingLocation,
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
  const search = useSyncExternalStore(subscribeNowPlayingLocation, getNowPlayingLocationSearch, () => "");
  const { workspace, srs } = useLearningWorkspace();
  const isFirstVisit = needsOnboardingFunnel(workspace.profile, workspace.progress);
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

export function NowPlayingBar() {
  const { current, href, glyph } = useNowPlayingTrack();

  return (
    <aside className="next-episode" aria-label="下一项学习">
      <div className="next-episode__glyph hangul-display" aria-hidden="true">{glyph}</div>
      <div className="next-episode__copy">
        <p>{current ? `下一集 · ${KIND_LABEL[current.kind]}` : "下一集"}</p>
        <strong>{current?.title ?? "从韩文开始"}</strong>
      </div>
      <Link
        href={href}
        className="next-episode__play focus-ring"
        aria-label={current ? `开始：${current.title}` : "开始学习"}
      >
        <Play className="h-4 w-4 fill-current" aria-hidden="true" />
        <span>继续</span>
      </Link>
    </aside>
  );
}
