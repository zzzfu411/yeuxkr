"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RefreshCcw, ShieldCheck, X } from "lucide-react";
import { DrillRunner } from "@/components/learning/drill-runner";
import { Button } from "@/components/ui/button";
import { InlineAlert } from "@/components/ui/inline-alert";
import { buildGateQuestions, GATE_PASS_SCORE, hasSkippedGateAudio, type GateKind } from "@/lib/learning/gate";

export function MasteryGate({
  kind,
  itemId,
  title,
  onPassed,
  onClose
}: {
  kind: GateKind;
  itemId: string;
  title: string;
  onPassed: () => void;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [attempt, setAttempt] = useState(1);
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [missingAudioEvidence, setMissingAudioEvidence] = useState(false);
  const seed = useMemo(() => hashSeed(`${kind}:${itemId}:${attempt}`), [attempt, itemId, kind]);
  const questions = useMemo(() => buildGateQuestions(kind, itemId, seed), [itemId, kind, seed]);

  useEffect(() => {
    containerRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, []);

  if (!questions.length) return null;

  return (
    <div ref={containerRef} className="mt-3 grid gap-3 rounded-[8px] border border-[rgba(23,63,115,0.28)] bg-[rgba(23,63,115,0.05)] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-mono text-xs font-black uppercase text-[var(--ocean)]">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          掌握小测 · {title} · 需 {GATE_PASS_SCORE} 分
        </p>
        <Button type="button" variant="ghost" size="sm" aria-label="关闭掌握小测" onClick={onClose}>
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
      {missingAudioEvidence ? (
        <InlineAlert>
          这项掌握记录必须包含真实听辨。当前音频题被跳过，所以不会写入听力能力；安装韩语语音后再试。
        </InlineAlert>
      ) : lastScore !== null && lastScore < GATE_PASS_SCORE ? (
        <InlineAlert>
          上一轮 {lastScore} 分，还差一点。先听几遍、读一遍要点，再试一次。
        </InlineAlert>
      ) : null}
      <DrillRunner
        key={attempt}
        questions={questions}
        finishLabel="交卷"
        recordMistakes
        onResult={(score, answers) => {
          const blockedBySkippedAudio = hasSkippedGateAudio(answers);
          setLastScore(score);
          setMissingAudioEvidence(blockedBySkippedAudio);
          if (score >= GATE_PASS_SCORE && !blockedBySkippedAudio) onPassed();
        }}
        resultAddon={({ score, answers }) => {
          const blockedBySkippedAudio = hasSkippedGateAudio(answers);
          return score >= GATE_PASS_SCORE && !blockedBySkippedAudio ? (
            <p className="flex items-center gap-2 font-bold text-[var(--celadon)]">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              通过！已写入掌握记录和复习队列。
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => setAttempt((value) => value + 1)}>
                <RefreshCcw className="h-4 w-4" aria-hidden="true" />
                换一组再试
              </Button>
              <Button type="button" variant="secondary" onClick={onClose}>
                先回去复习
              </Button>
            </div>
          );
        }}
      />
    </div>
  );
}

function hashSeed(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
