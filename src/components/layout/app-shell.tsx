"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { BookOpen, BrainCircuit, CircleAlert, Compass, GraduationCap, LibraryBig, Menu, MessagesSquare, NotebookTabs, Radio, RefreshCcw, Settings2, Sparkles } from "lucide-react";
import { PwaRegister } from "@/components/layout/pwa-register";
import { LearningDataPanel } from "@/components/layout/learning-data-panel";
import { NowPlayingBar } from "@/components/layout/now-playing";
import { SpeechStatusBanner } from "@/components/korean/speech-status";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { stopSpeech } from "@/lib/speech";
import { cn } from "@/lib/utils";
import { LearningWorkspaceProvider } from "@/lib/learning/use-learning-workspace";

const primaryNav = [
  { href: "/", label: "今日", ko: "오늘", icon: Compass },
  { href: "/path", label: "路线", ko: "여정", icon: GraduationCap },
  { href: "/hangul", label: "韩文", ko: "한글", icon: Sparkles },
  { href: "/review", label: "复习", ko: "복습", icon: RefreshCcw },
  { href: "/immersion", label: "听读", ko: "몰입", icon: Radio }
] as const;

const moreNav = [
  { href: "/self-study", label: "自由自学", ko: "자율 학습", icon: NotebookTabs },
  { href: "/mistakes", label: "错题重练", ko: "다시 보기", icon: CircleAlert },
  { href: "/quiz", label: "综合测验", ko: "확인", icon: BrainCircuit },
  { href: "/vocabulary", label: "场景词汇", ko: "단어", icon: LibraryBig },
  { href: "/grammar", label: "句型语法", ko: "문법", icon: BookOpen },
  { href: "/native", label: "自然表达", ko: "말투", icon: MessagesSquare },
  { href: "/settings", label: "学习设置", ko: "설정", icon: Settings2 }
] as const;

function navItemIsActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/path") return pathname.startsWith("/path") || pathname.startsWith("/learn/");
  return pathname.startsWith(href);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return <LearningWorkspaceProvider><AppShellContent>{children}</AppShellContent></LearningWorkspaceProvider>;
}

function AppShellContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement | null>(null);
  const activeItemRef = useRef<HTMLAnchorElement | null>(null);
  const moreRef = useRef<HTMLDetailsElement | null>(null);

  useEffect(() => () => {
    stopSpeech();
  }, [pathname]);

  useEffect(() => {
    moreRef.current?.removeAttribute("open");
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
      <a
        href="#main"
        className="skip-link focus-ring"
      >
        跳到正文
      </a>
      <div className="editorial-shell">
        <header className="app-header">
          <div className="header-inner">
            <Link href="/" className="brand-lockup focus-ring" aria-label="Kirina Korean 首页">
              <span className="brand-window" aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
                <b />
              </span>
              <span className="brand-copy">
                <strong>Kirina</strong>
                <small>오늘의 한국어</small>
              </span>
            </Link>

            <div className="header-actions">
              <ThemeToggle />
              <LearningDataPanel />
            </div>

            <nav ref={navRef} className="main-nav nav-scroll" aria-label="主导航">
              {primaryNav.map((item) => {
                const Icon = item.icon;
                const active = navItemIsActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    ref={active ? activeItemRef : undefined}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn("nav-link", active && "is-active")}
                  >
                    <Icon aria-hidden="true" />
                    <span>{item.label}</span>
                    <small>{item.ko}</small>
                  </Link>
                );
              })}

              <details ref={moreRef} className="nav-more">
                <summary className={cn("nav-link", moreNav.some((item) => navItemIsActive(pathname, item.href)) && "is-active")}>
                  <Menu aria-hidden="true" />
                  <span>全部场景</span>
                  <small>더보기</small>
                </summary>
                <div className="nav-more-menu">
                  <p>按你现在需要的方式进入</p>
                  <div>
                    {moreNav.map((item) => {
                      const Icon = item.icon;
                      const active = navItemIsActive(pathname, item.href);
                      return (
                        <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}>
                          <Icon aria-hidden="true" />
                          <span><strong>{item.label}</strong><small>{item.ko}</small></span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </details>
            </nav>
          </div>
        </header>

        <SpeechStatusBanner />

        <div className="studio-stage">
          <main id="main" className="app-main" tabIndex={-1}>{children}</main>
        </div>

        <footer className="app-footer">
          <div>
            <span>Kirina Korean</span>
            <span lang="ko">배우고, 듣고, 말하다.</span>
            <span>学一点，也把生活听懂一点。</span>
          </div>
        </footer>
      </div>
      <NowPlayingBar />
    </>
  );
}
