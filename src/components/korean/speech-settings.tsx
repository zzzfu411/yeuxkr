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

  useEffect(() => {
    let active = true;
    ensureVoicesReady().then(() => {
      if (!active) return;
      setVoices(
        listKoreanVoices().map((voice: SpeechSynthesisVoice) => ({
          voiceURI: voice.voiceURI,
          name: voice.name,
          localService: Boolean(voice.localService)
        }))
      );
      const settings = getSpeechSettings();
      if (settings.voiceURI) setVoiceURI(settings.voiceURI);
      if (settings.rate) setRate(settings.rate);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className={className}>
      <div className="grid gap-3">
        <label className="grid gap-1 text-sm font-extrabold">
          韩语语音
          <select
            className="focus-ring min-h-11 rounded-[8px] border border-[var(--line-strong)] bg-[var(--surface-solid)] px-3"
            value={voiceURI}
            disabled={!voices.length}
            onChange={(event) => {
              setVoiceURI(event.target.value);
              saveSpeechSettings({ voiceURI: event.target.value || undefined });
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
            onChange={(event) => {
              const next = Number(event.target.value);
              setRate(next);
              saveSpeechSettings({ rate: next });
            }}
          />
        </label>
        <Button type="button" variant="secondary" size="sm" className="justify-self-start" onClick={() => speakKorean("안녕하세요")}>
          <Volume2 className="h-4 w-4" aria-hidden="true" />
          试听 안녕하세요
        </Button>
      </div>
    </div>
  );
}
