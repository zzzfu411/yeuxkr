"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function TrackRow({
  index,
  glyph,
  kicker,
  title,
  detail,
  meta,
  completed = false,
  active = false,
  expanded = false,
  onToggle,
  onPlay,
  href,
  playLabel,
  children
}: {
  index?: number;
  glyph: string;
  kicker?: string;
  title: string;
  detail?: string;
  meta?: string;
  completed?: boolean;
  active?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  onPlay?: () => void;
  href?: string;
  playLabel?: string;
  children?: ReactNode;
}) {
  const order = index != null ? String(index).padStart(2, "0") : "·";
  const titleInner = (
    <>
      <span className="flex flex-wrap items-center gap-2">
        {kicker ? <span className="font-mono text-[0.66rem] font-black uppercase text-[var(--ocean)]">{kicker}</span> : null}
        {completed ? <span className="font-mono text-[0.66rem] font-black uppercase text-[var(--celadon)]">已掌握</span> : null}
      </span>
      <strong className="block truncate font-serif text-xl font-black leading-tight">{title}</strong>
      {detail ? <span className="mt-0.5 line-clamp-2 block text-sm font-bold leading-5 text-[var(--muted)]">{detail}</span> : null}
    </>
  );

  return (
    <article className="pl-block">
      <div className={cn("pl-item", completed && "is-done", (active || expanded) && "is-open", active && "is-active")}>
        <span className="font-mono text-[0.7rem] font-black text-[var(--fade)]">{order}</span>
        <span className="pl-cover hangul-display" lang="ko" aria-hidden="true">{glyph}</span>
        {onToggle ? (
          <button
            type="button"
            className="min-w-0 py-1 text-left"
            aria-expanded={expanded}
            onClick={onToggle}
          >
            {titleInner}
          </button>
        ) : href ? (
          <Link href={href} className="min-w-0 py-1 text-left">
            {titleInner}
          </Link>
        ) : (
          <div className="min-w-0 py-1">{titleInner}</div>
        )}
        {meta ? <span className="hidden font-mono text-xs font-black text-[var(--muted)] sm:inline">{meta}</span> : <span />}
        {onPlay ? (
          <button
            type="button"
            className="pl-play"
            aria-label={playLabel ?? `播放 ${title}`}
            onClick={onPlay}
          >
            <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        ) : href ? (
          <Link href={href} className="pl-play" aria-label={playLabel ?? `打开 ${title}`}>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        ) : <span />}
      </div>
      {expanded && children ? <div className="pl-body">{children}</div> : null}
    </article>
  );
}
