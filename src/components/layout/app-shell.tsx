"use client";

import Link from "@/components/learning/studio-link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { UserRound } from "lucide-react";
import { PwaRegister } from "@/components/layout/pwa-register";
import { StudioNavigation } from "@/components/layout/studio-navigation";
import { SpeechStatusBanner } from "@/components/korean/speech-status";
import { stopSpeech } from "@/lib/speech-core";
import { cn } from "@/lib/utils";
import { legacyStudio, navigationGroup } from "@/lib/studio-navigation";
import { LearningWorkspaceProvider } from "@/lib/learning/use-learning-workspace";

const primaryNav = [
  { href: "/", label: "今日" },
  { href: "/study", label: "学习" },
  { href: "/practice", label: "练习" }
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  return <LearningWorkspaceProvider><AppShellContent>{children}</AppShellContent></LearningWorkspaceProvider>;
}

function AppShellContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement | null>(null);
  const activeItemRef = useRef<HTMLAnchorElement | null>(null);
  const activeGroup = navigationGroup(pathname);
  const legacy = legacyStudio(pathname);

  useEffect(() => () => { stopSpeech(); }, [pathname]);

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

  return <>
    <PwaRegister />
    <a href="#main" className="skip-link focus-ring">跳到正文</a>
    <div className={cn("editorial-shell", pathname === "/" && "editorial-shell--home")}>
      <header className="app-header">
        <div className="header-inner header-inner--quiet">
          <Link href="/" className="brand-lockup focus-ring" aria-label="Kirina Korean 首页">
            <span className="brand-sticker" lang="ko" aria-hidden="true">ㅋ</span>
            <span className="brand-copy"><strong>Kirina</strong><small>오늘의 한국어</small></span>
          </Link>
          <nav ref={navRef} className="main-nav nav-scroll" aria-label="主导航">
            {primaryNav.map((item) => {
              const active = activeGroup === item.href;
              return <Link key={item.href} ref={active ? activeItemRef : undefined} href={item.href} aria-current={active ? "page" : undefined} className={cn("nav-link", active && "is-active")}>{item.label}</Link>;
            })}
          </nav>
          <div className="header-actions">
            <Link href="/settings" className={cn("my-learning focus-ring", activeGroup === "/settings" && "is-active")} aria-label="我的学习" aria-current={activeGroup === "/settings" ? "page" : undefined}><UserRound aria-hidden="true" /><span>我的</span></Link>
          </div>
        </div>
      </header>
      <SpeechStatusBanner />
      <div className="studio-stage">
        <main id="main" className="app-main" tabIndex={-1}>
          {legacy ? <div className="legacy-studio-nav"><StudioNavigation {...legacy} /></div> : null}
          {children}
        </main>
      </div>
      <footer className="app-footer"><div><span>Kirina Korean</span>{pathname !== "/" ? <><span lang="ko">배우고, 듣고, 말하다.</span><span>每天一点，慢慢听懂。</span></> : null}</div></footer>
    </div>
  </>;
}
