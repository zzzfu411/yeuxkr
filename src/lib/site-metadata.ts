import type { Metadata } from "next";

export const sitePages = {
  "/": ["今日学习", "从第一句韩语开始，在四季场景里学习、复习、听读与开口表达。"],
  "/path": ["学习路线", "循序完成韩文、基础句型和自然表达课程，按学习证据推进主线。"],
  "/hangul": ["韩文字母与发音", "练习韩文字母、拼读、收音和音变，用听辨与输入建立基础。"],
  "/vocabulary": ["场景词汇", "按等级和场景检索韩语词汇，练习听写、搭配并加入间隔复习。"],
  "/grammar": ["句型语法", "检索韩语句型，结合例句与主动输入练习语法。"],
  "/immersion": ["情境听读", "用韩语情境材料完成听读、听写、复述和改写。"],
  "/native": ["自然表达", "练习韩语语气、敬语与语用差别，积累自然表达作品。"],
  "/self-study": ["自由自学", "按目标安排韩语自学计划，用阶段任务检验学习成果。"],
  "/review": ["到期复习", "按间隔复习计划巩固已学内容，关注到期和薄弱卡片。"],
  "/mistakes": ["错题重练", "从具体错题回到原知识点，通过重练检查掌握情况。"],
  "/quiz": ["综合测验", "用已学韩语内容检查跨模块运用能力。"],
  "/settings": ["学习设置", "管理本机学习偏好、备用语音和学习数据。"],
  "/onboarding": ["三分钟入门", "设置学习偏好，试听韩语并尝试输入，开始第一课。"],
} as const;

export const privateRoutes = new Set(["/review", "/mistakes", "/quiz", "/settings", "/onboarding"]);

export function getSiteOrigin(configured = process.env.NEXT_PUBLIC_SITE_URL): URL | null {
  if (!configured?.trim()) return null;
  try {
    const url = new URL(configured.trim());
    if (!/^https?:$/.test(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) return null;
    return url;
  } catch { return null; }
}

export function pageMetadata(path: string, title: string, description: string): Metadata {
  const origin = getSiteOrigin();
  const publicPage = !privateRoutes.has(path);
  return {
    title,
    description,
    // Without a configured origin, omit absolute discovery links instead of publishing localhost.
    alternates: origin && publicPage ? { canonical: new URL(path, origin).href } : undefined,
    robots: publicPage ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: {
      title: `${title} | Kirina Korean`, description, type: "website", locale: "zh_CN", siteName: "Kirina Korean",
      ...(origin ? { url: new URL(path, origin).href, images: [{ url: new URL("/assets/generated/hero.webp", origin).href, alt: "春雨夜窗边，两只杯子与一朵山茶花" }] } : {})
    }
  };
}
