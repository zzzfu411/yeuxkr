import type { Metadata, Viewport } from "next";
import { Caveat, DM_Sans, Ma_Shan_Zheng, Noto_Sans_KR, Noto_Sans_SC, Noto_Serif_KR } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-ui",
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap"
});

const notoSansSc = Noto_Sans_SC({
  subsets: ["latin"],
  variable: "--font-sc",
  weight: ["400", "500", "700", "900"],
  display: "swap"
});

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  variable: "--font-kr",
  weight: ["400", "500", "700", "900"],
  display: "swap"
});

const notoSerifKr = Noto_Serif_KR({
  subsets: ["latin"],
  variable: "--font-hangul",
  weight: ["400", "700", "900"],
  display: "swap"
});

const maShanZheng = Ma_Shan_Zheng({
  subsets: ["latin"],
  variable: "--font-display",
  weight: "400",
  display: "swap"
});

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-en",
  weight: ["400", "600", "700"],
  display: "swap"
});

export const metadata: Metadata = {
  title: "Kirina Korean | YEUX KR 韩语播放器",
  description: "纸面上的韩语学习唱机。路径、复习、真实材料共用同一条播放队列。",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/assets/icon-192.png",
    apple: "/assets/icon-192.png"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#facc15" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" }
  ]
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="zh-CN"
      suppressHydrationWarning
      className={`${dmSans.variable} ${notoSansSc.variable} ${notoSansKr.variable} ${notoSerifKr.variable} ${maShanZheng.variable} ${caveat.variable}`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("yeuxkr.theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`
          }}
        />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
