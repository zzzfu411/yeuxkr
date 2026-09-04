import type { Metadata, Viewport } from "next";
import "@fontsource-variable/noto-serif-kr";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";

const DEFAULT_SITE_URL = "http://localhost:3000";

function getMetadataBase() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!configured) return new URL(DEFAULT_SITE_URL);
  try {
    const url = new URL(configured);
    return url.protocol === "http:" || url.protocol === "https:" ? url : new URL(DEFAULT_SITE_URL);
  } catch {
    return new URL(DEFAULT_SITE_URL);
  }
}

export const metadata: Metadata = {
  title: "Kirina Korean | 把每次学习过成一幕韩剧",
  description: "从第一句韩语开始，在四季场景里学习、复习、听读与开口表达。",
  metadataBase: getMetadataBase(),
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "Kirina Korean | 今天，只学这一小段",
    description: "简约、安静的韩语学习空间，把课程、复习和情境听读编成自己的四季故事。",
    images: [{ url: "/assets/generated/hero.webp", alt: "春雨夜窗边，两只杯子与一朵山茶花" }]
  },
  icons: {
    icon: "/assets/icon-192.png",
    apple: "/assets/icon-192.png"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f6f5" },
    { media: "(prefers-color-scheme: dark)", color: "#17212d" }
  ]
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="zh-CN"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("yeuxkr.theme");if(t==="dark")t="ye";if(t==="light")t="yuan";if(!/^(yuan|yue|qing|ye)$/.test(t||""))t="yuan";document.documentElement.setAttribute("data-theme",t);}catch(e){document.documentElement.setAttribute("data-theme","yuan");}})();`
          }}
        />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
