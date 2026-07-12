"use client";

import { useCallback, useEffect, useState } from "react";
import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ensureVoicesReady, getKoreanVoiceStatus, getSpeechSettings, saveSpeechSettings } from "@/lib/speech";

type VoiceStatus = "unsupported" | "loading" | "ready" | "missing";

export function useKoreanVoiceStatus() {
  const [status, setStatus] = useState<VoiceStatus | null>(null);

  const refresh = useCallback(() => {
    setStatus(getKoreanVoiceStatus() as VoiceStatus);
  }, []);

  useEffect(() => {
    let active = true;
    ensureVoicesReady().then(() => {
      if (active) setStatus(getKoreanVoiceStatus() as VoiceStatus);
    });
    return () => {
      active = false;
    };
  }, []);

  return { status, refresh };
}

export function SpeechStatusBanner() {
  const { status } = useKoreanVoiceStatus();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const sync = () => setDismissed(Boolean(getSpeechSettings().dismissedVoiceWarning));
    sync();
    window.addEventListener("kirina:speech", sync);
    return () => window.removeEventListener("kirina:speech", sync);
  }, []);

  if (status !== "missing" && status !== "unsupported") return null;
  if (dismissed) return null;

  return (
    <div className="border-b border-[rgba(185,78,60,0.35)] bg-[rgba(185,78,60,0.08)] px-4 py-3" role="alert">
      <div className="mx-auto flex max-w-[1480px] flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2 text-sm font-bold leading-6 text-[var(--cinnabar)]">
          <Volume2 className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            {status === "unsupported"
              ? "当前浏览器不支持语音朗读，听力练习需要换用 Chrome / Edge / Safari 等现代浏览器。"
              : "没有检测到韩语语音包，播放按钮可能发不出标准韩语。安装后刷新页面即可恢复听力练习。"}
            {status === "missing" ? (
              <details className="mt-1 font-normal text-[rgba(24,28,27,0.72)]">
                <summary className="cursor-pointer font-bold">怎么安装韩语语音？</summary>
                <ul className="mt-1 list-disc pl-5">
                  <li>Windows：设置 → 时间和语言 → 语音 → 添加语音 → 한국어（韩语）。</li>
                  <li>macOS / iOS：设置 → 辅助功能 → 朗读内容 → 声音 → 添加韩语语音。</li>
                  <li>Android：设置 → Google 文字转语音 → 安装韩语语音数据。</li>
                </ul>
              </details>
            ) : null}
          </span>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => {
            saveSpeechSettings({ dismissedVoiceWarning: true });
          }}
        >
          不再提示
        </Button>
      </div>
    </div>
  );
}
