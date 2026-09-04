import type { Metadata, Viewport } from "next";
import "@fontsource-variable/caveat";
import "@fontsource-variable/noto-serif-kr";
import "@fontsource/ma-shan-zheng/chinese-simplified-400.css";
import "@fontsource/ma-shan-zheng/latin-400.css";
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
  title: "Kirina Korean | YEUX KR 韩语手帖",
  description: "在纸上读、听、写韩语。课程、复习与情境听读收进同一本学习手帖。",
  metadataBase: getMetadataBase(),
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "Kirina Korean | YEUX KR",
    description: "纸上的韩语学习手帖。",
    images: [{ url: "/assets/generated/hero.webp", alt: "Kirina Korean paper study still life" }]
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
    { media: "(prefers-color-scheme: light)", color: "#d8d3cc" },
    { media: "(prefers-color-scheme: dark)", color: "#2a2733" }
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
        <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: "absolute" }}>
          <filter id="roughen">
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.014" numOctaves="2" seed="7" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="3.2" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </svg>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
