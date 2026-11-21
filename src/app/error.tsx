"use client";

import { Button } from "@/components/ui/button";

function returnToStudy() {
  // Client navigation within /study retains a failed lazy import and its error boundary.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign("/study");
}

export default function ErrorPage() {
  return <section className="mx-auto grid max-w-xl justify-items-start gap-5 px-6 py-16">
    <span className="text-sm text-[var(--muted)]">잠시만요 · 稍等一下</span>
    <h1 className="text-3xl font-bold tracking-tight">这页没有顺利打开</h1>
    <p className="leading-7 text-[var(--muted)]">可以重试，或先回到学习页。请勿为了重试而清除浏览器数据。</p>
    <div className="flex flex-wrap gap-3">
      <Button onClick={() => window.location.reload()}>重新加载</Button>
      <Button variant="secondary" onClick={returnToStudy}>回到学习</Button>
    </div>
  </section>;
}
