"use client";

import { useCallback, useEffect, useState } from "react";
import { Volume2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ensureVoicesReady,
  getKoreanVoiceStatus,
  getSpeechSettings,
  saveSpeechSettings,
  SPEECH_EVENT_NAME,
  SPEECH_EVENT_PLAYBACK_ERROR,
  SPEECH_EVENT_PLAYBACK_START
} from "@/lib/speech";

type VoiceStatus = "unsupported" | "loading" | "ready" | "missing";
type PlaybackError = {
  reason?: "unsupported" | "voice-unavailable" | "synthesis-error" | "asset-unavailable" | "audio-error" | "needs-gesture";
  error?: string;
  offline?: boolean;
};

export function useKoreanVoiceStatus() {
  const [status, setStatus] = useState<VoiceStatus>("loading");

  const refresh = useCallback(() => {
    setStatus(getKoreanVoiceStatus() as VoiceStatus);
  }, []);

  useEffect(() => {
    let active = true;
    ensureVoicesReady().then(() => {
      if (active) setStatus(getKoreanVoiceStatus() as VoiceStatus);
    });
    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);
    window.speechSynthesis?.addEventListener?.("voiceschanged", refresh);
    return () => {
      active = false;
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", refresh);
      window.speechSynthesis?.removeEventListener?.("voiceschanged", refresh);
    };
  }, [refresh]);

  return { status, refresh };
}

export function SpeechStatusBanner() {
  const { status } = useKoreanVoiceStatus();
  const [dismissed, setDismissed] = useState(true);
  const [playbackError, setPlaybackError] = useState<PlaybackError | null>(null);

  useEffect(() => {
    const sync = (event?: Event) => {
      setDismissed(Boolean(getSpeechSettings().dismissedVoiceWarning));
      const detail = (event as CustomEvent<PlaybackError & { type?: string }> | undefined)?.detail;
      if (detail?.type === SPEECH_EVENT_PLAYBACK_ERROR) setPlaybackError(detail);
      if (detail?.type === SPEECH_EVENT_PLAYBACK_START) setPlaybackError(null);
    };
    sync();
    window.addEventListener(SPEECH_EVENT_NAME, sync);
    return () => window.removeEventListener(SPEECH_EVENT_NAME, sync);
  }, []);

  const showPersistentWarning = (status === "missing" || status === "unsupported") && !dismissed;
  if (!playbackError && !showPersistentWarning) return null;

  const playbackMessage = playbackError
    ? getPlaybackErrorMessage(playbackError)
    : null;

  return (
    <div className="border-b-[3px] border-[var(--border)] bg-[var(--seal-soft)] px-3 py-2" role="alert" aria-live="assertive">
      <div className="mx-auto flex max-w-[1480px] items-start justify-between gap-2 sm:items-center">
        <div className="flex min-w-0 items-start gap-2 text-sm font-bold leading-6 text-[var(--cinnabar)]">
          <Volume2 className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            {playbackMessage ?? (status === "unsupported"
              ? "当前浏览器不支持语音朗读；听力题会跳过且不计分。"
              : "未检测到韩语语音包；听力题会跳过且不计分。")}
            {!playbackError && status === "missing" ? (
              <details className="mt-1 font-normal text-[var(--ink)]">
                <summary className="min-h-11 cursor-pointer py-3 font-bold">安装韩语语音包</summary>
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
          variant="ghost"
          size="icon"
          className="shrink-0"
          aria-label={playbackError ? "关闭语音错误提示" : "不再提示"}
          title={playbackError ? "关闭语音错误提示" : "不再提示语音包缺失"}
          onClick={() => {
            if (playbackError) setPlaybackError(null);
            else saveSpeechSettings({ dismissedVoiceWarning: true });
          }}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

function getPlaybackErrorMessage(error: PlaybackError) {
  if (error.reason === "unsupported") {
    return "本次播放失败：当前浏览器不支持语音朗读。";
  }
  if (error.reason === "voice-unavailable") {
    return error.offline
      ? "本次播放失败：离线时未找到可用的本地韩语语音，请安装韩语语音包后重试。"
      : "本次播放失败：未找到可用的韩语语音，请安装韩语语音包后重试。";
  }
  if (error.reason === "asset-unavailable") {
    return "本次内容没有课程录音，且当前浏览器没有可用的韩语系统语音。";
  }
  if (error.reason === "needs-gesture" || error.error === "NotAllowedError" || error.error === "play-rejected" || error.error === "not-allowed") {
    return "浏览器阻止了本次自动播放；点一次「听」或「播放」即可继续，不代表设备无法播放韩语。";
  }
  if (error.reason === "audio-error") {
    return error.error === "NotAllowedError"
      ? "浏览器阻止了本次声音播放；请允许此站点播放声音后再点一次。"
      : "课程录音加载失败，请检查网络后重试。";
  }
  return "本次语音播放失败，请重试；若问题持续，请检查系统语音服务。";
}
