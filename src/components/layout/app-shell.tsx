"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { BookOpen, BrainCircuit, CircleAlert, Compass, GraduationCap, LibraryBig, MessagesSquare, NotebookTabs, Radio, RefreshCcw, Settings2, Sparkles } from "lucide-react";
import { PwaRegister } from "@/components/layout/pwa-register";
import { LearningDataPanel } from "@/components/layout/learning-data-panel";
import { NowPlayingBar, NowPlayingRail } from "@/components/layout/now-playing";
import { SpeechStatusBanner } from "@/components/korean/speech-status";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { stopSpeech } from "@/lib/speech";
import { cn } from "@/lib/utils";

const navGroups = [
  {
    label: "工作台",
    items: [
      { href: "/", label: "工作台", en: "Desk", icon: Compass },
      { href: "/settings", label: "设置", en: "Set", icon: Settings2 }
    ]
  },
  {
    label: "规划",
    items: [
      { href: "/path", label: "路径", en: "Path", icon: GraduationCap },
      { href: "/self-study", label: "自学", en: "Self", icon: NotebookTabs }
    ]
  },
  {
    label: "练习",
    items: [
      { href: "/review", label: "复习", en: "Review", icon: RefreshCcw },
      { href: "/mistakes", label: "错题", en: "Miss", icon: CircleAlert },
      { href: "/quiz", label: "测验", en: "Quiz", icon: BrainCircuit },
      { href: "/hangul", label: "韩文", en: "Hangul", icon: Sparkles }
    ]
  },
  {
    label: "能力材料",
    items: [
      { href: "/vocabulary", label: "词汇", en: "Words", icon: LibraryBig },
      { href: "/grammar", label: "语法", en: "Grammar", icon: BookOpen },
      { href: "/immersion", label: "材料", en: "Tape", icon: Radio },
      { href: "/native", label: "母语者", en: "Native", icon: MessagesSquare }
    ]
  }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement | null>(null);
  const activeItemRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => () => {
    stopSpeech();
  }, [pathname]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const nav = navRef.current;
      const active = activeItemRef.current;
      if (!nav || !active) return;
      const navRect = nav.getBoundingClientRect();
      const activeRect = active.getBoundingClientRect();
      const activeCenter = nav.scrollLeft + activeRect.left - navRect.left + activeRect.width / 2;
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      nav.scrollTo({ left: Math.max(0, activeCenter - nav.clientWidth / 2), behavior: reduceMotion ? "auto" : "smooth" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  return (
    <>
      <PwaRegister />
      <div className="grain" aria-hidden="true" />
      <div className="vignette" aria-hidden="true" />
      <a
        href="#main"
        className="focus-ring fixed left-3 top-3 z-[90] -translate-y-20 border-[3px] border-[var(--border)] bg-[var(--ink)] px-4 py-2 text-sm font-black text-[var(--ink-inv)] shadow-[3px_3px_0_var(--shadow-color)] transition focus:translate-y-0"
      >
        跳到正文
      </a>
      <div className="editorial-shell">
        <header className="sticky top-0 z-40 border-b-[3px] border-[var(--border)] bg-[color-mix(in_srgb,var(--paper)_88%,transparent)] px-3 py-3 backdrop-blur-xl">
        <div className="mx-auto grid w-full min-w-0 max-w-[1480px] grid-cols-[minmax(0,auto)_minmax(0,1fr)] items-center gap-3 lg:grid-cols-[auto_minmax(0,1fr)_auto]">
          <Link href="/" className="focus-ring order-1 flex min-w-0 items-center gap-3">
            <span className="logo-mark">YEUX KR!</span>
            <span className="leading-tight">
              <strong className="hidden font-serif text-lg sm:block">Kirina Korean</strong>
              <small className="hidden font-mono text-[0.68rem] font-black uppercase text-[var(--muted)] md:block">
                paper player desk
              </small>
            </span>
          </Link>

          <div className="order-2 flex min-w-0 items-center justify-end gap-2 lg:order-3">
            <ThemeToggle />
            <LearningDataPanel />
          </div>

          <nav ref={navRef} className="nav-scroll order-3 col-span-2 flex w-full min-w-0 max-w-full snap-x justify-start gap-3 overflow-x-auto lg:order-2 lg:col-span-1" aria-label="主导航">
            {navGroups.map((group) => (
              <div key={group.label} className="top-tabs flex shrink-0 snap-center items-center">
                <span className="hidden px-2 font-mono text-[0.65rem] font-black uppercase text-[var(--muted)] xl:inline">
                  {group.label}
                </span>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = item.href === "/"
                    ? pathname === "/"
                    : item.href === "/path"
                      ? pathname.startsWith("/path") || pathname.startsWith("/learn/")
                      : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      ref={active ? activeItemRef : undefined}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(active && "is-active")}
                    >
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      {item.label}
                      <span className="hidden text-[0.7rem] font-normal opacity-70 lg:inline" style={{ fontFamily: "var(--font-script)" }}>{item.en}</span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>
      </header>

      <SpeechStatusBanner />

      <div className="studio-stage">
        <NowPlayingRail />
        <main id="main" className="app-main" tabIndex={-1}>{children}</main>
      </div>

      <footer className="border-t-[3px] border-[var(--border)] bg-[var(--card)] px-4 py-4">
        <div className="mx-auto flex max-w-[1480px] flex-wrap justify-between gap-3 font-mono text-xs font-bold text-[var(--muted)]">
          <span>Kirina Korean · YEUX KR</span>
          <span>纸面唱机 · 路径队列 · 真实材料 · 本地进度</span>
        </div>
        </footer>
      </div>
      <NowPlayingBar />
    </>
  );
}
