"use client";

import { useState } from "react";
import { ChevronDown, Volume2 } from "lucide-react";
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
import { useLearningWorkspace } from "@/lib/learning/use-learning-workspace";
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
  const [selectedSyllable, setSelectedSyllable] = useState(syllableLabs[0]);
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
        kicker="한글 · 韩文"
        title="先认清字形，再听清发音。"
        copy="韩文字母会组合成音节块。这里可以拆结构、听对比，也能把学会的内容加入间隔复习。"
        compact
      />

      <OnboardingGateNotice copy="先完成三分钟入门，之后的韩文练习才会计入学习进度。" />
      <LibraryGateNotice focus="hangul" />

      <ModuleHero
        kicker="글자 조립 · 拼字"
        title="拆开一个音节，看看每个字母放在哪里。"
        copy="音节块由初声、中声和可选的终声组成。罗马音只作提示，发音请以字母位置、IPA 和音频为准。"
        asset="hangul"
        imageClassName="min-h-80 border-0"
      >
        <div className="flex flex-wrap gap-2" aria-label="选择音节并试听">
          {syllableLabs.map((lab: any) => (
            <button
              key={lab.result}
              type="button"
              className={`focus-ring hangul-display min-h-12 min-w-12 rounded-[var(--radius-sm)] border px-3 text-2xl ${selectedSyllable.result === lab.result ? "border-[var(--accent)] bg-[var(--seal-soft)] text-[var(--accent)]" : "border-[var(--line)] hover:bg-[var(--wash-2)]"}`}
              aria-pressed={selectedSyllable.result === lab.result}
              onClick={() => { setSelectedSyllable(lab); speakKorean(lab.result); }}
              aria-label={`播放音节 ${lab.result}，结构 ${lab.blocks.join(" 加 ")}`}
            >
              <span lang="ko">{lab.result}</span>
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-1" aria-live="polite" aria-atomic="true">
          <p className="hangul-display text-xl" lang="ko">{selectedSyllable.blocks.join(" + ")} = {selectedSyllable.result}</p>
          <p className="text-sm leading-6 text-[var(--muted)]">{selectedSyllable.note}</p>
        </div>
      </ModuleHero>

      <details className="filter-disclosure">
        <summary className="focus-ring">按主题查找字母与发音<ChevronDown className="ml-auto h-4 w-4" aria-hidden="true" /></summary>
        <nav className="flex flex-wrap gap-x-5 gap-y-1 py-2" aria-label="韩文页内目录">
          {hangulGroups.map((group: any) => <a key={group.id} className="text-link focus-ring" href={`#hangul-${group.id}`}>{group.title}</a>)}
          <a className="text-link focus-ring" href="#hangul-pronunciation">发音与拼写辨析</a>
          <a className="text-link focus-ring" href="#hangul-sound-changes">音变规则</a>
        </nav>
      </details>

      {hangulGroups.map((group: any) => (
        <Surface key={group.id} id={`hangul-${group.id}`} variant="plain" className="scroll-mt-24">
          <SectionHeading kicker={group.track === "sound" ? "소리 · 发音" : "글자 · 字形"} title={group.title} copy={group.summary} />
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
                  <div className="grid gap-1 font-mono text-sm font-medium text-[var(--ink-soft)]">
                    <RomanizationText
                      text={item.romanization}
                      preference={workspace.profile.romanization}
                      scaffold={romanizationScaffold}
                      className="font-mono text-sm font-medium text-[var(--ink-soft)]"
                    />
                    <span>
                      /{item.ipa}/
                      {item.parts ? <span className="ml-2 text-[var(--ink-mute)]" lang="ko">{item.parts.join(" + ")}</span> : null}
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
                      已加入复习 · 点击移出
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
                      测一测，再加入复习
                    </Button>
                  )}
                  {gateItemId === item.id && !mastered.has(item.id) ? (
                    <MasteryGate
                      kind="hangul"
                      itemId={item.id}
                      title={item.glyph}
                      onPassed={() => {
                        const saved = toggleSrs(`hangul:${item.id}`, () => ensureHangul(item.id));
                        if (saved) setGateItemId("");
                        return saved;
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

      <Surface id="hangul-pronunciation" variant="plain" className="scroll-mt-24">
        <SectionHeading kicker="소리 비교 · 对比发音" title="发音与拼写辨析" copy="比较气流、紧张度和唇形；常见近同音项目结合词义与字形练习。" />
        <div id="pairs">
          {pronunciationPairs.map((pair: any, pairIndex: number) => (
            <TrackRow
              key={pair.id}
              index={pairIndex + 1}
              glyph={pair.a}
              kicker={pair.spellingPrompts ? "拼写辨析" : "发音对比"}
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
                  已加入复习 · 点击移出
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
                  {pair.spellingPrompts ? "测一测，再加入拼写复习" : "测一测，再加入听辨复习"}
                </Button>
              )}
              {gateItemId === pair.id && !pronunciationCards.has(pronunciationCardId(pair.id)) ? (
                <MasteryGate
                  kind="pronunciation"
                  itemId={pair.id}
                  title={`${pair.a} vs ${pair.b}`}
                  onPassed={() => {
                    const saved = toggleSrs(`pronunciation:${pair.id}`, () => ensurePronunciation(pair.id));
                    if (saved) setGateItemId("");
                    return saved;
                  }}
                  onClose={() => setGateItemId("")}
                />
              ) : null}
              {srsErrorId === `pronunciation:${pair.id}` ? <SrsError className="mt-3" /> : null}
            </TrackRow>
          ))}
        </div>
      </Surface>

      <Surface id="hangul-sound-changes" variant="plain" className="scroll-mt-24">
        <SectionHeading
          kicker="이어 읽기 · 连读音变"
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
                <p className="rounded-[var(--radius)] border-l-2 border-[var(--seal)] bg-[var(--wash-2)] p-2 font-mono text-xs font-medium text-[var(--ink-soft)]">{rule.rule}</p>
                <div className="mt-3 grid gap-2">
                  {rule.examples.map((example: any) => (
                    <button
                      key={example.written}
                      type="button"
                      className="focus-ring flex items-center justify-between gap-2 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--card)] p-2 text-left transition-colors hover:bg-[var(--wash-2)]"
                      onClick={() => speakKorean(example.speak)}
                      aria-label={`播放 ${example.written}，实际读作 ${example.spoken}，意思是${example.zh}`}
                    >
                      <span className="hangul-display text-lg font-normal" lang="ko">
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
                    已加入复习 · 点击移出
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
                    测一测，再加入听辨复习
                  </Button>
                )}
                {gateItemId === rule.id && !added ? (
                  <MasteryGate
                    kind="soundChange"
                    itemId={rule.id}
                    title={rule.title}
                    onPassed={() => {
                      const saved = toggleSrs(cardId, () => ensureSoundChange(rule.id));
                      if (saved) setGateItemId("");
                      return saved;
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
      这张复习卡没有保存。请释放浏览器空间，或允许本站使用本地存储后重试。
    </InlineAlert>
  );
}
