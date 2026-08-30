"use client";

import { useState } from "react";
import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InlineAlert } from "@/components/ui/inline-alert";
import { TrackRow } from "@/components/ui/track-row";
import { LibraryGateNotice } from "@/components/learning/library-gate-notice";
import { OnboardingGateNotice } from "@/components/learning/onboarding-gate-notice";
import { needsOnboardingFunnel } from "@/lib/learning/compass";
import { MasteryGate } from "@/components/learning/mastery-gate";
import { RomanizationText } from "@/components/korean/romanization-text";
import { ModuleHero, PageHeader, SectionHeading, Surface } from "@/components/ui/section";
import { hangulGroups, pronunciationPairs, syllableLabs } from "@/data/hangul";
import { soundChangeRules } from "@/data/sound-changes";
import { decomposeSyllable } from "@/lib/korean/jamo";
import { pronunciationCardId, soundChangeCardId } from "@/lib/learning/ids";
import { useLearningWorkspace } from "@/lib/learning/workspace";
import { speakKorean, speakSequence } from "@/lib/speech";

export default function HangulPage() {
  const {
    workspace,
    srsState,
    toggleHangul,
    ensureHangul,
    togglePronunciation,
    ensurePronunciation,
    toggleSoundChange,
    ensureSoundChange
  } = useLearningWorkspace();
  const [srsErrorId, setSrsErrorId] = useState("");
  const [gateItemId, setGateItemId] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const enrollBlocked = needsOnboardingFunnel(workspace.profile, workspace.progress);
  const mastered = new Set(workspace.progress.masteredHangul);
  const romanizationScaffold = workspace.progress.completedLessons.length < 6;
  const pronunciationCards = new Set(Object.keys(srsState.cards).filter((id) => id.startsWith("pronunciation:")));
  const soundChangeCards = new Set(Object.keys(srsState.cards).filter((id) => id.startsWith("soundChange:")));
  const toggleSrs = (id: string, action: () => boolean) => {
    if (action()) {
      setSrsErrorId((current) => (current === id ? "" : current));
      return true;
    }
    setSrsErrorId(id);
    return false;
  };

  return (
    <div className="grid gap-6">
      <PageHeader
        kicker="Hangul Studio"
        title="先听清楚，再把字形写进眼睛里。"
        copy="韩文不是线性字母表，而是声音与字形压缩成音节块。这个页面像实验室：拆结构、听差异、把掌握项送进 SRS。"
        compact
      />

      <OnboardingGateNotice copy="先完成三分钟入门，再把字母掌握写入核心路径。" />
      <LibraryGateNotice focus="hangul" />

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
              className="focus-ring rounded-none border border-[var(--line)] bg-[var(--card)] p-4 text-left transition hover:-translate-y-0.5"
              onClick={() => speakKorean(lab.result)}
              aria-label={`播放音节 ${lab.result}，结构 ${lab.blocks.join(" 加 ")}`}
            >
              <strong className="hangul-display block text-5xl" lang="ko">{lab.result}</strong>
              <span className="mt-2 block font-mono text-xs font-black text-[var(--ocean)]" lang="ko">{lab.blocks.join(" + ")}</span>
              <small className="mt-2 block leading-5 text-[var(--muted)]">{lab.note}</small>
            </button>
          ))}
        </div>
      </ModuleHero>

      {hangulGroups.map((group: any) => (
        <Surface key={group.id} variant="plain">
          <SectionHeading kicker={group.track} title={group.title} copy={group.summary} />
          <div>
            {group.items.map((item: any, itemIndex: number) => {
              const soundRole = getSoundRole(group.id);
              const relation = getExampleRelation(item, group.id);
              const expanded = !collapsed[item.id];
              return (
              <TrackRow
                key={item.id}
                index={itemIndex + 1}
                glyph={item.glyph}
                kicker={soundRole}
                title={item.glyph}
                detail={item.cue}
                meta={item.sound}
                completed={mastered.has(item.id)}
                expanded={expanded}
                onToggle={() => setCollapsed((current) => ({ ...current, [item.id]: !current[item.id] }))}
                onPlay={() => speakKorean(item.sound)}
                playLabel={`播放${soundRole} ${item.sound}`}
              >
                <div className="grid gap-3">
                  <div className="grid gap-1 font-mono text-sm font-black text-[var(--ocean)]">
                    <RomanizationText
                      text={item.romanization}
                      preference={workspace.profile.romanization}
                      scaffold={romanizationScaffold}
                      className="font-mono text-sm font-black text-[var(--ocean)]"
                    />
                    <span>
                      /{item.ipa}/
                      {item.parts ? <span className="ml-2 text-[var(--brass)]" lang="ko">{item.parts.join(" + ")}</span> : null}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="eyebrow">例词</p>
                      <strong className="hangul-display mt-1 block text-2xl" lang="ko">{item.example}</strong>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      onClick={() => speakKorean(item.example)}
                      aria-label={`播放例词 ${item.example}`}
                      title={`播放例词：${item.example}`}
                    >
                      <Volume2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                  <small className="leading-5 text-[var(--muted)]">{item.exampleMeaning}</small>
                  <p className="text-xs font-bold leading-5 text-[var(--muted)]">{relation}</p>
                  {mastered.has(item.id) ? (
                    <Button type="button" variant="secondary" size="sm" onClick={() => toggleSrs(`hangul:${item.id}`, () => toggleHangul(item.id))}>
                      已掌握 · 点击移出
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      aria-expanded={gateItemId === item.id}
                      disabled={enrollBlocked}
                      onClick={() => setGateItemId((current) => (current === item.id ? "" : item.id))}
                    >
                      测一测 · 加入掌握
                    </Button>
                  )}
                  {gateItemId === item.id && !mastered.has(item.id) ? (
                    <MasteryGate
                      kind="hangul"
                      itemId={item.id}
                      title={item.glyph}
                      onPassed={() => {
                        if (toggleSrs(`hangul:${item.id}`, () => ensureHangul(item.id))) setGateItemId("");
                      }}
                      onClose={() => setGateItemId("")}
                    />
                  ) : null}
                  {srsErrorId === `hangul:${item.id}` ? <SrsError /> : null}
                </div>
              </TrackRow>
              );
            })}
          </div>
        </Surface>
      ))}

      <Surface variant="plain">
        <SectionHeading kicker="Minimal Pairs" title="最小对立听辨" copy="先听后读，重点比较气流、紧张度和唇形。" />
        <div id="pairs">
          {pronunciationPairs.map((pair: any, pairIndex: number) => (
            <TrackRow
              key={pair.id}
              index={pairIndex + 1}
              glyph={pair.a}
              kicker="最小对立"
              title={`${pair.a} vs ${pair.b}`}
              detail={pair.focus}
              completed={pronunciationCards.has(pronunciationCardId(pair.id))}
              expanded={!collapsed[pair.id]}
              onToggle={() => setCollapsed((current) => ({ ...current, [pair.id]: !current[pair.id] }))}
              onPlay={() => speakSequence([pair.a, pair.b])}
              playLabel={`播放对比：先 ${pair.a}，后 ${pair.b}`}
            >
              <p className="text-sm leading-6 text-[var(--muted)]">{pair.tip}</p>
              {pronunciationCards.has(pronunciationCardId(pair.id)) ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                  onClick={() => toggleSrs(`pronunciation:${pair.id}`, () => togglePronunciation(pair.id))}
                >
                  已加入 SRS · 点击移出
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                  aria-expanded={gateItemId === pair.id}
                  disabled={enrollBlocked}
                  onClick={() => setGateItemId((current) => (current === pair.id ? "" : pair.id))}
                >
                  测一测 · 加入听辨复习
                </Button>
              )}
              {gateItemId === pair.id && !pronunciationCards.has(pronunciationCardId(pair.id)) ? (
                <MasteryGate
                  kind="pronunciation"
                  itemId={pair.id}
                  title={`${pair.a} vs ${pair.b}`}
                  onPassed={() => {
                    if (toggleSrs(`pronunciation:${pair.id}`, () => ensurePronunciation(pair.id))) setGateItemId("");
                  }}
                  onClose={() => setGateItemId("")}
                />
              ) : null}
              {srsErrorId === `pronunciation:${pair.id}` ? <SrsError className="mt-3" /> : null}
            </TrackRow>
          ))}
        </div>
      </Surface>

      <Surface variant="plain">
        <SectionHeading
          kicker="Sound Change Lab"
          title="音变实验室"
          copy="韩语“写的”和“读的”经常不一样。每条规则都把标准拼写与实际读音并列；播放时边听边对照方括号里的读法，若设备语音与标注不一致，以标注为准。"
        />
        <div>
          {soundChangeRules.map((rule: any, ruleIndex: number) => {
            const cardId = soundChangeCardId(rule.id);
            const added = soundChangeCards.has(cardId);
            const first = rule.examples?.[0];
            return (
              <TrackRow
                key={rule.id}
                index={ruleIndex + 1}
                glyph={rule.korean?.[0] ?? "한"}
                kicker="音变"
                title={rule.title}
                detail={rule.summary}
                completed={added}
                expanded={!collapsed[rule.id]}
                onToggle={() => setCollapsed((current) => ({ ...current, [rule.id]: !current[rule.id] }))}
                onPlay={first ? () => speakKorean(first.speak) : undefined}
                playLabel={first ? `播放 ${first.written}` : undefined}
              >
                <p className="rounded-none bg-[color-mix(in_srgb,var(--navy)_12%,transparent)] p-2 font-mono text-xs font-black text-[var(--ocean)]">{rule.rule}</p>
                <div className="mt-3 grid gap-2">
                  {rule.examples.map((example: any) => (
                    <button
                      key={example.written}
                      type="button"
                      className="focus-ring flex items-center justify-between gap-2 rounded-none border border-[var(--line)] bg-[var(--surface-solid)] p-2 text-left transition hover:-translate-y-0.5"
                      onClick={() => speakKorean(example.speak)}
                      aria-label={`播放 ${example.written}，实际读作 ${example.spoken}，意思是${example.zh}`}
                    >
                      <span className="hangul-display text-lg font-black" lang="ko">
                        {example.written}
                        <span className="mx-1 text-[var(--muted)]">→</span>
                        <span className="text-[var(--celadon)]">[{example.spoken}]</span>
                      </span>
                      <span className="flex items-center gap-2 text-xs font-bold text-[var(--muted)]">
                        {example.zh}
                        <Volume2 className="h-4 w-4" aria-hidden="true" />
                      </span>
                    </button>
                  ))}
                </div>
                {added ? (
                  <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={() => toggleSrs(cardId, () => toggleSoundChange(rule.id))}>
                    已加入听辨复习 · 点击移出
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="mt-3"
                    aria-expanded={gateItemId === rule.id}
                    disabled={enrollBlocked}
                    onClick={() => setGateItemId((current) => (current === rule.id ? "" : rule.id))}
                  >
                    测一测 · 加入听辨复习
                  </Button>
                )}
                {gateItemId === rule.id && !added ? (
                  <MasteryGate
                    kind="soundChange"
                    itemId={rule.id}
                    title={rule.title}
                    onPassed={() => {
                      if (toggleSrs(cardId, () => ensureSoundChange(rule.id))) setGateItemId("");
                    }}
                    onClose={() => setGateItemId("")}
                  />
                ) : null}
                {srsErrorId === cardId ? <SrsError /> : null}
              </TrackRow>
            );
          })}
        </div>
      </Surface>
    </div>
  );
}

function getSoundRole(groupId: string) {
  if (groupId.startsWith("vowels")) return "字母音";
  if (groupId === "batchim") return "收音示范";
  return "示范音节";
}

function getExampleRelation(item: { glyph: string; example: string; ipa: string }, groupId: string) {
  const candidates = new Set(item.glyph.split("/"));
  const match = [...item.example]
    .map((syllable) => ({ syllable, parts: decomposeSyllable(syllable) }))
    .find(({ parts }) => {
      if (!parts) return false;
      if (groupId.startsWith("vowels")) return candidates.has(parts.jung);
      if (groupId === "batchim") return candidates.has(parts.jong);
      return candidates.has(parts.cho);
    });

  if (!match?.parts) return `这个例词包含 ${item.glyph}，用来观察它进入真实词汇后的读法。`;
  const formula = [match.parts.cho, match.parts.jung, match.parts.jong].filter(Boolean).join(" + ");
  if (groupId.startsWith("vowels")) {
    return `${match.syllable} = ${formula}；${item.glyph} 是这个音节的元音，读作 [${item.ipa}]。`;
  }
  if (groupId === "batchim") {
    return `${match.syllable} = ${formula}；底部的 ${match.parts.jong} 在这里按 [${item.ipa}] 收尾。`;
  }
  return `${match.syllable} = ${formula}；${item.glyph} 在这个音节中作初声。`;
}

function SrsError({ className }: { className?: string }) {
  return (
    <InlineAlert className={className}>
      这张复习卡没有写入成功，请释放浏览器存储空间或关闭隐私限制后再试。
    </InlineAlert>
  );
}
