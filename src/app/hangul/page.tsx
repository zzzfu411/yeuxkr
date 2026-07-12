"use client";

import { useState } from "react";
import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InlineAlert } from "@/components/ui/inline-alert";
import { ModuleHero, PageHeader, SectionHeading, Surface } from "@/components/ui/section";
import { hangulGroups, pronunciationPairs, syllableLabs } from "@/data/hangul";
import { pronunciationCardId } from "@/lib/learning/ids";
import { useLearningWorkspace } from "@/lib/learning/workspace";
import { speakKorean, speakSequence } from "@/lib/speech";

export default function HangulPage() {
  const { workspace, srsState, toggleHangul, togglePronunciation } = useLearningWorkspace();
  const [srsErrorId, setSrsErrorId] = useState("");
  const mastered = new Set(workspace.progress.masteredHangul);
  const pronunciationCards = new Set(Object.keys(srsState.cards).filter((id) => id.startsWith("pronunciation:")));
  const toggleSrs = (id: string, action: () => boolean) => {
    if (action()) {
      setSrsErrorId((current) => (current === id ? "" : current));
      return;
    }
    setSrsErrorId(id);
  };

  return (
    <div className="grid gap-6">
      <PageHeader
        kicker="Hangul Studio"
        title="先听清楚，再把字形写进眼睛里。"
        copy="韩文不是线性字母表，而是声音与字形压缩成音节块。这个页面像实验室：拆结构、听差异、把掌握项送进 SRS。"
        compact
      />

      <ModuleHero
        kicker="Syllable Lab"
        title="先拆开音节块，再听它怎么发声。"
        copy="每个韩文字块都由初声、中声和可选终声压缩而成。罗马化只帮助查找，真正发音以字母位置、IPA 和播放音频为准。"
        asset="hangul"
        imageClassName="min-h-80 rounded-none border-0"
      >
        <div className="grid gap-3 md:grid-cols-2">
          {syllableLabs.map((lab: any) => (
            <button
              key={lab.result}
              type="button"
              className="focus-ring rounded-[8px] border border-[var(--line)] bg-[rgba(255,250,240,0.68)] p-4 text-left transition hover:-translate-y-0.5"
              onClick={() => speakKorean(lab.result)}
            >
              <strong className="hangul-display block text-5xl">{lab.result}</strong>
              <span className="mt-2 block font-mono text-xs font-black text-[var(--ocean)]">{lab.blocks.join(" + ")}</span>
              <small className="mt-2 block leading-5 text-[var(--muted)]">{lab.note}</small>
            </button>
          ))}
        </div>
      </ModuleHero>

      {hangulGroups.map((group: any) => (
        <Surface key={group.id} variant="plain">
          <SectionHeading kicker={group.track} title={group.title} copy={group.summary} />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {group.items.map((item: any) => (
              <article key={item.id} className={`relative grid min-h-60 gap-2 rounded-[8px] border p-4 pr-16 md:min-h-72 ${mastered.has(item.id) ? "border-[rgba(79,140,118,0.45)] bg-[rgba(79,140,118,0.11)]" : "border-[var(--line)] bg-[rgba(255,250,240,0.62)]"}`}>
                <button
                  type="button"
                  className="focus-ring absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-[8px] border border-[var(--line)] bg-[var(--surface-solid)]"
                  onClick={() => speakKorean(item.example)}
                  aria-label={`播放 ${item.example}`}
                >
                  <Volume2 className="h-4 w-4" />
                </button>
                <div className="hangul-display text-5xl font-black md:text-6xl">{item.glyph}</div>
                <p className="font-mono text-sm font-black text-[var(--ocean)]">
                  {item.romanization} · /{item.ipa}/
                  {item.parts ? <span className="ml-2 text-[var(--brass)]">{item.parts.join(" + ")}</span> : null}
                </p>
                <p className="text-sm leading-6 text-[var(--muted)]">{item.cue}</p>
                <strong className="hangul-display text-2xl">{item.example}</strong>
                <small className="leading-5 text-[var(--muted)]">{item.exampleMeaning}</small>
                <Button type="button" variant="secondary" size="sm" onClick={() => toggleSrs(`hangul:${item.id}`, () => toggleHangul(item.id))}>
                  {mastered.has(item.id) ? "已加入 SRS" : "加入掌握"}
                </Button>
                {srsErrorId === `hangul:${item.id}` ? <SrsError /> : null}
              </article>
            ))}
          </div>
        </Surface>
      ))}

      <Surface variant="plain">
        <SectionHeading kicker="Minimal Pairs" title="最小对立听辨" copy="先听后读，重点比较气流、紧张度和唇形。" />
        <div id="pairs" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {pronunciationPairs.map((pair: any) => (
            <article key={pair.id} className={`rounded-[8px] border p-4 ${pronunciationCards.has(pronunciationCardId(pair.id)) ? "border-[rgba(79,140,118,0.45)] bg-[rgba(79,140,118,0.11)]" : "border-[var(--line)] bg-[rgba(255,250,240,0.62)]"}`}>
              <button
                type="button"
                className="focus-ring flex w-full items-center justify-between rounded-[8px] bg-[rgba(23,63,115,0.08)] p-3"
                onClick={() => speakSequence([pair.a, pair.b])}
              >
                <strong className="hangul-display text-3xl">{pair.a}</strong>
                <span className="font-mono text-xs font-black text-[var(--muted)]">vs</span>
                <strong className="hangul-display text-3xl">{pair.b}</strong>
              </button>
              <h3 className="mt-3 font-serif text-xl font-black">{pair.focus}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{pair.tip}</p>
              <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={() => toggleSrs(`pronunciation:${pair.id}`, () => togglePronunciation(pair.id))}>
                {pronunciationCards.has(pronunciationCardId(pair.id)) ? "已加入 SRS" : "加入听辨复习"}
              </Button>
              {srsErrorId === `pronunciation:${pair.id}` ? <SrsError className="mt-3" /> : null}
            </article>
          ))}
        </div>
      </Surface>
    </div>
  );
}

function SrsError({ className }: { className?: string }) {
  return (
    <InlineAlert className={className}>
      这张复习卡没有写入成功，请释放浏览器存储空间或关闭隐私限制后再试。
    </InlineAlert>
  );
}
