import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "Kirina Korean | 从 0 到母语者级韩语",
  description: "高审美、可离线、可自由规划的韩语学习工作台。",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/assets/icon-192.png",
    apple: "/assets/icon-192.png"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#181c1b"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
