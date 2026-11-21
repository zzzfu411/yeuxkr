import Link from "@/components/learning/studio-link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return <section className="mx-auto grid max-w-xl justify-items-start gap-5 px-6 py-16">
    <span className="text-sm text-[var(--muted)]">404 · 길을 잃었나요?</span>
    <h1 className="text-3xl font-bold tracking-tight">这页暂时找不到了</h1>
    <p className="leading-7 text-[var(--muted)]">链接可能已失效。回到学习页，继续上次的进度。</p>
    <Button asChild><Link href="/study">回到学习</Link></Button>
  </section>;
}
