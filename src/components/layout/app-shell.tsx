"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { BookOpen, BrainCircuit, CircleAlert, Compass, GraduationCap, LibraryBig, MessagesSquare, NotebookTabs, Radio, RefreshCcw, Settings2, Sparkles } from "lucide-react";
import { PwaRegister } from "@/components/layout/pwa-register";
import { LearningDataPanel } from "@/components/layout/learning-data-panel";
import { SpeechStatusBanner } from "@/components/korean/speech-status";
import { cn } from "@/lib/utils";

const navGroups = [
  {
    label: "工作台",
    items: [
      { href: "/", label: "工作台", icon: Compass },
      { href: "/settings", label: "设置", icon: Settings2 }
    ]
  },
  {
    label: "规划",
    items: [
      { href: "/path", label: "路径", icon: GraduationCap },
      { href: "/self-study", label: "自学", icon: NotebookTabs }
    ]
  },
  {
    label: "练习",
    items: [
      { href: "/review", label: "复习", icon: RefreshCcw },
      { href: "/mistakes", label: "错题", icon: CircleAlert },
      { href: "/quiz", label: "测验", icon: BrainCircuit },
      { href: "/hangul", label: "韩文", icon: Sparkles }
    ]
  },
  {
    label: "能力材料",
    items: [
      { href: "/vocabulary", label: "词汇", icon: LibraryBig },
      { href: "/grammar", label: "语法", icon: BookOpen },
      { href: "/immersion", label: "材料", icon: Radio },
      { href: "/native", label: "母语者", icon: MessagesSquare }
    ]
  }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const activeItemRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    activeItemRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest", inline: "center" });
  }, [pathname]);

  return (
    <div className="editorial-shell">
      <PwaRegister />
      <a
        href="#main"
        className="focus-ring fixed left-3 top-3 z-[60] -translate-y-20 rounded-[8px] bg-[var(--ink)] px-4 py-2 text-sm font-black text-[var(--surface-solid)] transition focus:translate-y-0"
      >
        跳到正文
      </a>
      <header className="sticky top-0 z-40 overflow-hidden border-b border-[var(--line)] bg-[rgba(243,239,229,0.82)] px-3 py-3 backdrop-blur-xl">
        <div className="mx-auto grid w-full min-w-0 max-w-[1480px] grid-cols-[minmax(0,auto)_minmax(0,1fr)] items-center gap-3 lg:grid-cols-[auto_minmax(0,1fr)_auto]">
          <Link href="/" className="focus-ring flex min-w-0 items-center gap-3 rounded-[8px]">
            <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-[8px] border border-[rgba(24,28,27,0.18)] bg-[var(--ink)] shadow-paper-sm">
              <Image
                src="/assets/icon-192.png"
                alt=""
                width={40}
                height={40}
                priority
                unoptimized
                className="h-full w-full object-cover"
              />
            </span>
            <span className="leading-tight">
              <strong className="block font-serif text-lg">Kirina Korean</strong>
              <small className="hidden font-mono text-[0.68rem] font-black uppercase text-[var(--muted)] sm:block">
                Seoul Editorial Studio
              </small>
            </span>
          </Link>

          <nav className="nav-scroll col-span-2 flex w-full min-w-0 max-w-full snap-x gap-3 overflow-x-auto lg:col-span-1 lg:justify-center" aria-label="主导航">
            {navGroups.map((group) => (
              <div key={group.label} className="flex shrink-0 snap-center items-center gap-1 rounded-[8px] border border-[rgba(24,28,27,0.08)] bg-[rgba(255,250,240,0.44)] p-1">
                <span className="hidden px-2 font-mono text-[0.65rem] font-black uppercase text-[var(--muted)] xl:inline">
                  {group.label}
                </span>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      ref={active ? activeItemRef : undefined}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "focus-ring inline-flex min-h-9 shrink-0 items-center gap-2 rounded-[8px] border px-2.5 text-sm font-extrabold transition hover:bg-[rgba(24,28,27,0.06)] hover:text-[var(--ink)]",
                        active ? "border-[rgba(23,63,115,0.28)] bg-[rgba(23,63,115,0.1)] text-[var(--ocean)]" : "border-transparent text-[var(--muted)]"
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          <LearningDataPanel />
        </div>
      </header>

      <SpeechStatusBanner />

      <main id="main" className="app-main" tabIndex={-1}>{children}</main>

      <footer className="border-t border-[var(--line)] px-4 py-5">
        <div className="mx-auto flex max-w-[1480px] flex-wrap justify-between gap-3 font-mono text-xs font-bold text-[var(--muted)]">
          <span>Kirina Korean</span>
          <span>自由工作台 · 路径建议 · 真实材料 · 本地进度 · 间隔复习</span>
        </div>
      </footer>
    </div>
  );
}
