import type { Metadata, Viewport } from "next";
import "@fontsource-variable/noto-serif-kr";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";

import { getSiteOrigin, pageMetadata, sitePages } from "@/lib/site-metadata";

export const metadata: Metadata = {
  ...pageMetadata("/", ...sitePages["/"]),
  title: { default: "今日学习 | Kirina Korean", template: "%s | Kirina Korean" },
  metadataBase: getSiteOrigin() ?? undefined,
  manifest: "/manifest.webmanifest",
  icons: { icon: "/assets/icon-192.png", apple: "/assets/icon-192.png" }
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
