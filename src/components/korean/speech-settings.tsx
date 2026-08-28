"use client";

import { useEffect, useState } from "react";
import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useKoreanVoiceStatus } from "@/components/korean/speech-status";
import { ensureVoicesReady, getSpeechSettings, listKoreanVoices, saveSpeechSettings, speakKorean, SPEECH_RATE_MAX, SPEECH_RATE_MIN } from "@/lib/speech";

type VoiceOption = { voiceURI: string; name: string; localService: boolean };

export function SpeechSettings({ className }: { className?: string }) {
  const { status } = useKoreanVoiceStatus();
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [voiceURI, setVoiceURI] = useState("");
  const [rate, setRate] = useState(0.82);
  const [storageError, setStorageError] = useState("");

  useEffect(() => {
    let active = true;
    const refreshVoices = () => {
      if (!active) return;
      setVoices(
        listKoreanVoices().map((voice: SpeechSynthesisVoice) => ({
          voiceURI: voice.voiceURI,
          name: voice.name,
          localService: Boolean(voice.localService)
        }))
      );
      const settings = getSpeechSettings();
      setVoiceURI(settings.voiceURI ?? "");
      setRate(settings.rate ?? 0.82);
    };
    ensureVoicesReady().then(refreshVoices);
    window.addEventListener("online", refreshVoices);
    window.addEventListener("offline", refreshVoices);
    window.speechSynthesis?.addEventListener?.("voiceschanged", refreshVoices);
    return () => {
      active = false;
      window.removeEventListener("online", refreshVoices);
      window.removeEventListener("offline", refreshVoices);
      window.speechSynthesis?.removeEventListener?.("voiceschanged", refreshVoices);
    };
  }, []);

  return (
    <div className={className}>
      <div className="grid gap-3">
        <label className="grid gap-1 text-sm font-extrabold">
          系统备用语音
          <select
            className="focus-ring min-h-11 rounded-[8px] border border-[var(--line-strong)] bg-[var(--surface-solid)] px-3"
            value={voiceURI}
            disabled={!voices.length}
            aria-describedby={storageError ? "speech-settings-storage-error" : undefined}
            onChange={(event) => {
              const next = event.target.value;
              if (!saveSpeechSettings({ voiceURI: next || undefined })) {
                setStorageError("语音设置未能保存，已恢复为上次保存的设置。请检查浏览器存储权限或可用空间。");
                return;
              }
              setVoiceURI(next);
              setStorageError("");
            }}
          >
            <option value="">自动选择{voices.length ? `（共 ${voices.length} 个韩语语音）` : ""}</option>
            {voices.map((voice) => (
              <option key={voice.voiceURI} value={voice.voiceURI}>
                {voice.name}
                {voice.localService ? " · 本地" : " · 在线"}
              </option>
            ))}
          </select>
          <span className="text-xs font-bold text-[var(--muted)]">课程内容优先播放统一录音；仅未收录内容使用这里选择的系统语音。</span>
          {status === "missing" ? (
            <span className="text-xs font-bold text-[var(--cinnabar)]">未检测到韩语语音包，请先在系统里安装韩语语音。</span>
          ) : null}
        </label>
        <label className="grid gap-1 text-sm font-extrabold">
          朗读速度 <span className="font-mono text-xs text-[var(--ocean)]">{rate.toFixed(2)}×</span>
          <input
            type="range"
            min={SPEECH_RATE_MIN}
            max={SPEECH_RATE_MAX}
            step={0.02}
            value={rate}
            aria-describedby={storageError ? "speech-settings-storage-error" : undefined}
            onChange={(event) => {
              const next = Number(event.target.value);
              if (!saveSpeechSettings({ rate: next })) {
                setStorageError("语音设置未能保存，已恢复为上次保存的设置。请检查浏览器存储权限或可用空间。");
                return;
              }
              setRate(next);
              setStorageError("");
            }}
          />
        </label>
        {storageError ? (
          <p id="speech-settings-storage-error" role="alert" className="text-sm font-bold text-[var(--cinnabar)]">
            {storageError}
          </p>
        ) : null}
        <Button type="button" variant="secondary" size="sm" className="justify-self-start" onClick={() => speakKorean("안녕하세요")}>
          <Volume2 className="h-4 w-4" aria-hidden="true" />
          试听 안녕하세요
        </Button>
      </div>
    </div>
  );
}
