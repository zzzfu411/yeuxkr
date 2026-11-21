"use client";

import Link from "@/components/learning/studio-link";
import { ArrowUpRight } from "lucide-react";
import { LetterFragment } from "@/components/assets/art-scene";
import { Button } from "@/components/ui/button";
import { needsOnboardingFunnel } from "@/lib/learning/compass";
import { useLearningWorkspace } from "@/lib/learning/use-learning-workspace";
import { studioHref } from "@/lib/studio-navigation";

export default function HomePage() {
  const { workspace } = useLearningWorkspace();
  const isFirstVisit = needsOnboardingFunnel(workspace.profile, workspace.progress);
  const heroAction = isFirstVisit
    ? { href: "/onboarding", title: "约 3 分钟完成入门设置，再开始第一课。", minutes: 3 }
    : workspace.recommended[0];

  return <div className="home-flow home-flow--letters">
    <div className="home-corner-fragments" aria-hidden="true">
      <LetterFragment asset="letterH" sizes="(max-width: 480px) 48px, 96px" className="home-corner home-corner--h" />
      <LetterFragment asset="letterHangul" sizes="(max-width: 480px) 70px, 126px" className="home-corner home-corner--hangul" />
    </div>
    <section className="home-hero home-hero--letters">
      <div className="home-hero__copy">
        <div className="home-greeting" aria-hidden="true">
          <LetterFragment asset="letterHello" priority sizes="220px" className="hero-letter hero-letter--hello" />
          <LetterFragment asset="letterK" priority sizes="48px" className="hero-letter hero-letter--k" />
        </div>
        <h1 className="home-title"><span>把韩语，</span><span>学进日常。</span></h1>
        <p className="home-hero__intro">看懂一个字，听懂一句问候。</p>
        {heroAction ? <>
          {!isFirstVisit ? <p className="home-current-task">{heroAction.title}</p> : null}
          <div className="home-hero__actions">
            <Button asChild><Link href={studioHref(heroAction.href)}>{isFirstVisit ? "开始学习" : "继续学习"}</Link></Button>
          </div>
          <p className="home-hero__hint">{isFirstVisit ? heroAction.title : `约 ${heroAction.minutes} 分钟 · 学习进度自动保存在此浏览器`}</p>
        </> : <div className="home-hero__actions"><Button asChild><Link href="/study">开始学习</Link></Button></div>}
      </div>
    </section>

    <section className="home-gateways home-gateways--letters" aria-label="学习与练习">
      {([
        { href: "/study", letter: "letterSlowly", title: "学一点新的", detail: "课程、字词与听说" },
        { href: "/practice", letter: "letterAgain", title: "把学过的记牢", detail: "复习、错题与测验" }
      ] as const).map((item) => <Link key={item.href} href={item.href} className="home-gateway focus-ring">
        <div className="home-gateway__copy"><h2>{item.title}</h2><p>{item.detail}</p><ArrowUpRight aria-hidden="true" /></div>
        <LetterFragment asset={item.letter} sizes="92px" className="home-gateway__letter" />
      </Link>)}
    </section>
  </div>;
}
