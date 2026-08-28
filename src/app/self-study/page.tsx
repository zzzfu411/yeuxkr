"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, CheckCircle2, Compass, ListChecks, Route, SlidersHorizontal, TimerReset } from "lucide-react";
import { LearningCompass } from "@/components/learning/learning-compass";
import { TaskCard } from "@/components/learning/task-card";
import { Button } from "@/components/ui/button";
import { ModuleHero, PageHeader, SectionHeading, Surface } from "@/components/ui/section";
import { selfStudyFocus, selfStudyGoals, selfStudyIntensity, buildSelfStudyPlan, normalizeDailyMinutes } from "@/data/self-study";
import { clearSelfStudyCheckpointDraft, getSelfStudyCheckpointDrafts, saveSelfStudyCheckpointDraft } from "@/lib/learning/drafts";
import { moduleToAbility } from "@/lib/learning/modules";
import { ABILITY_LABELS, findCompletedCheckpointCredit, useLearningWorkspace, validateCheckpointEvidence } from "@/lib/learning/workspace";
import type { AbilityId, StudyFocus, StudyGoal, StudyIntensity, StudyMode, UserProfile } from "@/lib/learning/types";

export default function SelfStudyPage() {
  const { workspace, saveSelfStudyPlan, saveSelfStudyCheckpoint } = useLearningWorkspace();
  const profile = workspace.profile;
  const [draftPatch, setDraftPatch] = useState<Partial<ReturnType<typeof draftFromProfile>>>({});
  const [minutesGoalDraft, setMinutesGoalDraft] = useState<string | null>(null);
  const [checkpointDrafts, setCheckpointDrafts] = useState<Record<string, string>>({});
  const [checkpointErrors, setCheckpointErrors] = useState<Record<string, string>>({});
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [showFullRhythm, setShowFullRhythm] = useState(false);
  const baseDraft = useMemo(() => draftFromProfile(profile), [profile]);
  const draft = useMemo(() => ({ ...baseDraft, ...draftPatch }), [baseDraft, draftPatch]);
  const minutesGoalText = minutesGoalDraft ?? String(baseDraft.minutesGoal);
  const planDraft = useMemo(() => ({ ...draft, minutesGoal: normalizeEditableMinutes(minutesGoalText, draft.minutesGoal) }), [draft, minutesGoalText]);
  const plan = useMemo(() => buildSelfStudyPlan(planDraft), [planDraft]);
  const firstIncompleteCheckpointIndex = plan.checkpoints.findIndex((item: any, index: number) => {
    const checkpointId = checkpointKey(plan.goal.id, plan.intensity.id, plan.focus.id, item.title, index);
    return !findCompletedCheckpointCredit(workspace.progress, checkpointId);
  });
  const visibleCheckpointCount = firstIncompleteCheckpointIndex < 0 ? plan.checkpoints.length : firstIncompleteCheckpointIndex + 1;
  const visibleCheckpoints = plan.checkpoints.slice(0, visibleCheckpointCount);
  const hiddenCheckpointCount = plan.checkpoints.length - visibleCheckpoints.length;
  const todayTasks = workspace.recommended.filter((task) => task.id !== "open:self-plan").slice(0, 3);
  const visibleRhythm = showFullRhythm ? plan.weeklyRhythm : plan.weeklyRhythm.filter((day: any) => day.active);
  const hiddenRhythmDays = Math.max(0, plan.weeklyRhythm.length - visibleRhythm.length);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const drafts = getSelfStudyCheckpointDrafts();
      setCheckpointDrafts(Object.fromEntries(Object.entries(drafts).map(([id, draft]) => [id, draft.evidence])));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const updateDraft = (input: Partial<typeof draft>) => {
    setDraftPatch((current) => ({ ...current, ...input }));
    setSaveStatus("idle");
  };

  const applyPlan = () => {
    if (!saveSelfStudyPlan(planDraft)) {
      setSaveStatus("error");
      return false;
    }
    setDraftPatch({});
    setMinutesGoalDraft(null);
    setSaveStatus("saved");
    return true;
  };

  return (
    <div className="grid gap-6">
      <PageHeader
        kicker="Self Study"
        title="自学不是没有路径，而是你拥有调度权。"
        copy="先决定今天跟随主线还是自主调度，再把目标、强度、重点和检查证据连成一张可执行的学习合约。"
        compact
      >
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link href="/path">
              <Route className="h-4 w-4" />
              按路径学习
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="#planner">
              <SlidersHorizontal className="h-4 w-4" />
              调整自学
            </Link>
          </Button>
        </div>
      </PageHeader>

      <ModuleHero
        kicker={`Current Plan · ${plan.intensity.title} · ${plan.focus.title}`}
        title={plan.goal.title}
        copy={`${plan.goal.outcome} 当前投入约每周 ${plan.weeklyHours} 小时，周期按约 ${plan.goal.targetHours} 小时目标量动态估算。`}
        asset="selfStudy"
        imageSize="18rem"
        imageClassName="min-h-56 rounded-none border-t border-[var(--line)] lg:min-h-full lg:border-l lg:border-t-0"
      >
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <Mini icon={CalendarDays} label="估算周期" value={formatPlanDuration(plan.durationWeeks)} />
            <Mini icon={TimerReset} label="每周" value={`${plan.weeklyHours} 小时`} />
            <Mini icon={ListChecks} label="每周天数" value={`${plan.intensity.daysPerWeek} 天`} />
            <Mini icon={Compass} label="每日" value={`${plan.minutesGoal} 分钟`} />
          </div>
          <Button asChild variant="secondary" size="sm" className="w-fit">
            <Link href="#planner">调整方案</Link>
          </Button>
        </div>
      </ModuleHero>

      <Surface>
        <SectionHeading
          kicker="Start Here"
          title="今天先完成这三步"
          copy="这些不是另一套任务。它们直接来自工作台推荐，并共用课程掌握、SRS、错题和能力证据。"
        />
        <div className="grid gap-3 lg:grid-cols-3">
          {todayTasks.map((task) => (
            <TaskCard key={task.id} task={task} compact />
          ))}
        </div>
      </Surface>

      <LearningCompass workspace={workspace} active="self" condensed />

      <section className="grid gap-3 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="dark-slab grid gap-4 p-5 md:grid-cols-[auto_minmax(0,1fr)]">
          <div className="hidden h-full w-12 place-items-center rounded-[8px] border border-[rgba(255,250,240,0.18)] bg-[rgba(255,250,240,0.06)] font-mono text-xs font-black uppercase tracking-normal text-[rgba(255,250,240,0.74)] md:grid">
            <span className="vertical-text">Mode</span>
          </div>
          <div className="grid gap-3">
            <p className="eyebrow text-[rgba(255,250,240,0.74)]">Choice Architecture</p>
            <h2 className="font-serif text-3xl font-black leading-tight md:text-4xl">两种学习方式，共用同一份证据。</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <ModeCard active={draft.studyMode === "guided"} title="按路径学习" detail="主线课负责先后顺序，适合零基础一路推进；自学设置仍会影响复习和弱项排序。" />
              <ModeCard active={draft.studyMode === "self"} title="自由自学" detail="你决定目标与节奏，系统把每日模板、模块入口和检查点收进同一个工作台。" />
            </div>
          </div>
        </div>
        <div className="studio-panel paper-rail grid gap-3 p-5">
          <p className="eyebrow">Plan Thread</p>
          <h2 className="font-serif text-3xl font-black leading-tight">今天的方案会怎样流动</h2>
          <div className="grid gap-2">
            {[
              ["1", "先清复习", plan.dailyTemplate[0]?.detail ?? "先处理到期 SRS。"],
              ["2", "再进新输入", plan.dailyTemplate[1]?.detail ?? "进入当前最重要模块。"],
              ["3", "必须有输出", plan.dailyTemplate[2]?.detail ?? "写或说一句可复查的韩语。"],
              ["4", "检查点收口", "用录音、正确率、韩语复述或短文证明它真的掌握了。"]
            ].map(([step, title, detail]) => (
              <div key={step} className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-3 rounded-[8px] border border-[rgba(24,28,27,0.12)] bg-[rgba(255,250,240,0.66)] p-3">
                <span className="grid h-9 w-9 place-items-center rounded-[8px] bg-[var(--ink)] font-mono text-xs font-black text-[var(--surface-solid)]">{step}</span>
                <span>
                  <strong className="block font-serif text-xl leading-tight">{title}</strong>
                  <span className="mt-1 block text-sm font-bold leading-6 text-[var(--muted)]">{detail}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div id="planner" className="order-1 h-fit scroll-mt-40 lg:order-2 lg:scroll-mt-28 lg:sticky lg:top-24">
          <Surface>
            <SectionHeading kicker="Planner" title="学习控制台" />
            <div className="grid gap-5">
              <ChoiceGroup
                label="学习方式"
                value={draft.studyMode}
                options={[
                  { id: "self", title: "自由自学" },
                  { id: "guided", title: "路径推荐" }
                ]}
                onChange={(value) => updateDraft({ studyMode: value as StudyMode })}
              />
              <ChoiceGroup
                label="自学目标"
                value={draft.selfStudyGoal}
                options={selfStudyGoals}
                onChange={(value) => updateDraft({ selfStudyGoal: value as StudyGoal })}
              />
              <ChoiceGroup
                label="强度"
                value={draft.selfStudyIntensity}
                options={selfStudyIntensity}
                onChange={(value) => updateDraft({ selfStudyIntensity: value as StudyIntensity })}
              />
              <ChoiceGroup
                label="重点"
                value={draft.selfStudyFocus}
                options={selfStudyFocus}
                onChange={(value) => updateDraft({ selfStudyFocus: value as StudyFocus })}
              />
              <label className="grid gap-2 text-sm font-extrabold">
                每日可用分钟
                <input
                  className="focus-ring min-h-11 rounded-[8px] border border-[var(--line-strong)] bg-[var(--surface-solid)] px-3"
                  type="number"
                  min={5}
                  max={120}
                  step={5}
                  value={minutesGoalText}
                  onChange={(event) => {
                    setMinutesGoalDraft(event.target.value);
                    setSaveStatus("idle");
                  }}
                />
              </label>
              <Button type="button" onClick={applyPlan}>
                {saveStatus === "saved" ? "已应用到工作台" : "保存并应用到工作台"}
              </Button>
              {saveStatus === "error" ? (
                <p className="rounded-[8px] border border-[rgba(185,78,60,0.45)] bg-[rgba(185,78,60,0.08)] p-3 text-sm font-bold leading-6 text-[var(--cinnabar)]">
                  本机进度暂时无法写入，请释放浏览器存储空间或关闭隐私限制后再试。
                </p>
              ) : null}
              {saveStatus === "saved" ? (
                <div className="grid gap-2 rounded-[8px] border border-[rgba(79,140,118,0.45)] bg-[rgba(79,140,118,0.1)] p-3 text-sm font-bold leading-6">
                  <p className="text-[var(--celadon)]">今日自学规划已确认，首页会按这个方案重新排序推荐任务。</p>
                  <div className="grid gap-2 rounded-[8px] border border-[rgba(24,28,27,0.1)] bg-[rgba(255,250,240,0.58)] p-3 text-[var(--muted)]">
                    <span>{planDraft.studyMode === "self" ? "首页优先：自学计划、弱项模块、复习节奏。" : "首页优先：下一课、到期复习、路径转移任务。"}</span>
                    <span>仍会记录：课程掌握、真实材料、输出档案、错题 SRS 和检查点证据。</span>
                  </div>
                </div>
              ) : null}
            </div>
          </Surface>
        </div>

        <div className="order-2 grid gap-5 lg:order-1">
          <Surface>
            <SectionHeading
              kicker="Daily Template"
              title="每日执行模板"
              copy="复习、新输入、主动输出和记录共同组成每日建议；首页会依据你真正完成的课程、复习、材料、输出与检查点动态重排。"
            />
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {plan.dailyTemplate.map((item: any) => (
                <article key={item.title} className="grid min-h-44 content-between rounded-[8px] border border-[var(--line)] bg-[rgba(255,250,240,0.62)] p-4 shadow-paper-sm">
                  <span>
                    <strong className="font-serif text-2xl leading-tight">{item.title}</strong>
                    <span className="ml-2 font-mono text-xs font-black text-[var(--ocean)]">{item.minutes} min</span>
                  </span>
                  <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{item.detail}</p>
                </article>
              ))}
            </div>
          </Surface>

          <Surface>
            <SectionHeading
              kicker="Phases"
              title="阶段路线"
              copy="完整自学方案会先固定声音和文字，再进入句型、真实场景、语气和作品集，不会一上来就把高级表达堆给零基础学习者。"
            />
            <div className="relative grid gap-3">
              <div className="absolute bottom-8 left-8 top-8 hidden w-px bg-[rgba(23,63,115,0.18)] md:block" />
              {plan.phases.map((phase: any, index: number) => (
                <article key={phase.title} className="relative grid gap-3 rounded-[8px] border border-[var(--line)] bg-[rgba(255,250,240,0.66)] p-4 md:grid-cols-[5rem_minmax(0,1fr)]">
                  <div className="z-10 grid h-14 w-14 place-items-center rounded-[8px] border border-[rgba(23,63,115,0.2)] bg-[var(--surface-solid)] font-mono text-2xl font-black text-[var(--ocean)] shadow-paper-sm">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <div className="min-w-0">
                    <span className="font-mono text-xs font-black uppercase text-[var(--muted)]">{phase.weeks}</span>
                    <h3 className="mt-1 font-serif text-2xl font-black">{phase.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{phase.outcome}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {phase.modules.map((module: any) => (
                        <Link key={module.id} href={module.href} className="rounded-[8px] bg-[rgba(23,63,115,0.08)] px-3 py-1 text-sm font-bold text-[var(--ocean)]">
                          {module.title}
                        </Link>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </Surface>

          <section className="grid gap-5 xl:grid-cols-2">
            <Surface>
              <SectionHeading
                kicker="Week Rhythm"
                title="每周节奏"
                copy={showFullRhythm ? "完整 7 天节奏会显示执行日、复盘日和休息日。" : "默认只显示需要真正执行学习任务的日子，完整周节奏可随时展开。"}
                action={hiddenRhythmDays || showFullRhythm ? (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowFullRhythm((value) => !value)}>
                    {showFullRhythm ? "收起休息日" : `展开完整周节奏 · ${hiddenRhythmDays} 天`}
                  </Button>
                ) : null}
              />
              <div className="grid gap-2">
                {visibleRhythm.map((day: any) => (
                  <article key={day.day} className={`rounded-[8px] border p-3 ${day.active ? "border-[rgba(79,140,118,0.35)] bg-[rgba(79,140,118,0.1)]" : "border-[var(--line)] bg-[rgba(255,250,240,0.56)]"}`}>
                    <strong>{day.day} · {day.title}</strong>
                    <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{day.detail}</p>
                  </article>
                ))}
              </div>
            </Surface>
            <Surface>
              <SectionHeading
                kicker="Checkpoints"
                title="证据闸门"
                copy="自学可以自由，但不能空口完成。检查点保存周度复盘与可复查记录；能力分仍只来自课程答题、SRS、真实材料和输出作品。"
              />
              <div className="grid gap-2">
                {visibleCheckpoints.map((item: any, index: number) => {
                  const checkpointId = checkpointKey(plan.goal.id, plan.intensity.id, plan.focus.id, item.title, index);
                  const completedCheckpointId = findCompletedCheckpointCredit(workspace.progress, checkpointId);
                  const completed = Boolean(completedCheckpointId);
                  const savedEvidence = completedCheckpointId ? workspace.progress.checkpointEvidence[completedCheckpointId] : undefined;
                  const evidence = savedEvidence ?? workspace.progress.checkpointEvidence[checkpointId] ?? checkpointDrafts[checkpointId] ?? "";
                  const evidenceReady = validateCheckpointEvidence(evidence);
                  const weakEvidence = !completed && Boolean(evidence.trim()) && !evidenceReady;
                  const evidenceHintId = `checkpoint-evidence-hint-${index}`;
                  return (
                  <article key={item.title} className={`rounded-[8px] border p-3 ${completed ? "border-[rgba(79,140,118,0.45)] bg-[rgba(79,140,118,0.1)]" : "border-[var(--line)] bg-[rgba(255,250,240,0.56)]"}`}>
                    <div className="flex items-start gap-3">
                      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-[8px] border text-xs font-black ${completed ? "border-[var(--celadon)] bg-[var(--celadon)] text-[var(--surface-solid)]" : "border-[rgba(23,63,115,0.2)] bg-[var(--surface-solid)] text-[var(--ocean)]"}`}>
                        {completed ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                      </span>
                      <span>
                        <strong className="block">{item.title}</strong>
                        <span className="mt-1 block text-xs font-bold leading-5 text-[var(--muted)]">
                          关联训练：{checkpointAbilities(item, plan.modules).map((ability) => ABILITY_LABELS[ability]).join(" / ")}
                        </span>
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{item.detail}</p>
                    <label className="mt-3 grid gap-2 text-sm font-extrabold">
                      检查证据
                      <textarea
                        className="focus-ring min-h-20 resize-none rounded-[8px] border border-[var(--line-strong)] bg-[var(--surface-solid)] px-3 py-2 text-sm font-medium"
                        value={evidence}
                        disabled={completed}
                        aria-describedby={weakEvidence ? evidenceHintId : undefined}
                        aria-invalid={weakEvidence}
                        placeholder="写下录音内容、正确率、输出句子或最不稳的点"
                        onChange={(event) => {
                          const value = event.target.value;
                          setCheckpointDrafts((current) => ({ ...current, [checkpointId]: value }));
                          const draftSaved = saveSelfStudyCheckpointDraft(checkpointId, value);
                          setCheckpointErrors((current) => {
                            const next = { ...current };
                            if (draftSaved) delete next[checkpointId];
                            else next[checkpointId] = "检查点草稿断点没有写入本地存储。当前输入还在页面里，但刷新或离开后可能无法恢复。";
                            return next;
                          });
                        }}
                      />
                    </label>
                    {weakEvidence ? (
                      <p id={evidenceHintId} className="mt-2 rounded-[8px] border border-[rgba(183,135,63,0.28)] bg-[rgba(183,135,63,0.08)] p-3 text-xs font-bold leading-5 text-[var(--brass)]">
                        需要可复查证据：录音时长、正确率、韩语输出句子、错因或修正目标。
                      </p>
                    ) : null}
                    <Button
                      className="mt-3"
                      type="button"
                      size="sm"
                      variant="secondary"
                       disabled={completed || !evidenceReady}
                       onClick={() => {
                         if (!saveSelfStudyCheckpoint(planDraft, checkpointId, evidence, checkpointAbilities(item, plan.modules))) {
                           setCheckpointErrors((current) => ({ ...current, [checkpointId]: "证据没有保存成功，请稍后重试。" }));
                           return;
                         }
                         const draftCleared = clearSelfStudyCheckpointDraft(checkpointId);
                         setCheckpointDrafts((current) => {
                           const next = { ...current };
                           delete next[checkpointId];
                           return next;
                         });
                         setDraftPatch({});
                         setCheckpointErrors((current) => {
                           const next = { ...current };
                           if (draftCleared) delete next[checkpointId];
                           else next[checkpointId] = "检查点已记录，但草稿断点没有清理成功；正式证据已保存。";
                           return next;
                         });
                       }}
                     >
                       {completed ? "已记录" : "记录检查点"}
                     </Button>
                     {checkpointErrors[checkpointId] ? (
                       <p className="mt-3 rounded-[8px] border border-[rgba(185,78,60,0.45)] bg-[rgba(185,78,60,0.08)] p-3 text-sm font-bold leading-6 text-[var(--cinnabar)]">
                         {checkpointErrors[checkpointId]}
                       </p>
                     ) : null}
                   </article>
                );
                })}
              </div>
              {hiddenCheckpointCount ? (
                <details className="mt-3 rounded-[8px] border border-[var(--line)] bg-[rgba(255,250,240,0.5)] p-3">
                  <summary className="cursor-pointer text-sm font-black text-[var(--muted)]">
                    后续 {hiddenCheckpointCount} 个检查点将在当前项完成后顺序开放
                  </summary>
                  <ol className="mt-3 grid gap-2 text-sm font-bold leading-6 text-[var(--muted)]">
                    {plan.checkpoints.slice(visibleCheckpointCount).map((item: any) => <li key={item.title}>{item.title}</li>)}
                  </ol>
                </details>
              ) : null}
            </Surface>
          </section>
        </div>
      </section>
    </div>
  );
}

function formatPlanDuration(weeks: number) {
  if (weeks < 104) return `${weeks} 周`;
  const years = Math.round((weeks / 52) * 10) / 10;
  return `约 ${years} 年`;
}

function draftFromProfile(profile: UserProfile) {
  return {
    studyMode: profile.studyMode,
    selfStudyGoal: profile.selfStudyGoal,
    selfStudyIntensity: profile.selfStudyIntensity,
    selfStudyFocus: profile.selfStudyFocus,
    minutesGoal: profile.minutesGoal
  };
}

function normalizeEditableMinutes(input: string, fallback: number) {
  if (!input.trim()) return normalizeDailyMinutes(fallback);
  return normalizeDailyMinutes(input, fallback);
}

function ChoiceGroup({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: Array<{ id: string; title: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-extrabold">{label}</legend>
      <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={label}>
        {options.map((item) => (
          <label
            key={item.id}
            className={`focus-ring grid min-h-11 place-items-center rounded-[8px] border px-3 text-center text-sm font-extrabold focus-within:border-[var(--ocean)] focus-within:ring-2 focus-within:ring-[rgba(23,63,115,0.22)] ${
              value === item.id ? "border-[var(--ocean)] bg-[rgba(23,63,115,0.12)] text-[var(--ocean)]" : "border-[var(--line)] bg-[rgba(255,250,240,0.62)]"
            }`}
          >
            <input
              className="sr-only"
              type="radio"
              name={label}
              value={item.id}
              checked={value === item.id}
              onChange={() => onChange(item.id)}
            />
            {item.title}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function checkpointKey(goalId: string, intensityId: string, focusId: string, title: string, index: number) {
  return `${goalId}:${intensityId}:${focusId}:${index + 1}:${title}`;
}

function checkpointAbilities(item: { abilities?: AbilityId[] }, modules: Array<{ id: string }>): AbilityId[] {
  if (Array.isArray(item.abilities) && item.abilities.length) return [...new Set(item.abilities)];
  return planCheckpointAbilities(modules);
}

function planCheckpointAbilities(modules: Array<{ id: string }>): AbilityId[] {
  const result = new Set<AbilityId>();
  for (const studyModule of modules.slice(0, 3)) {
    const ability = moduleToAbility(studyModule.id) as AbilityId | null;
    if (ability) result.add(ability);
  }
  return [...result];
}

function ModeCard({ active, title, detail }: { active: boolean; title: string; detail: string }) {
  return (
    <div className={`rounded-[8px] border p-4 ${active ? "border-[rgba(255,250,240,0.42)] bg-[rgba(255,250,240,0.16)]" : "border-[rgba(255,250,240,0.14)] bg-[rgba(255,250,240,0.06)]"}`}>
      <span className="mb-3 inline-flex items-center gap-2 font-mono text-xs font-black uppercase text-[rgba(255,250,240,0.72)]">
        <CheckCircle2 className={`h-4 w-4 ${active ? "text-[var(--celadon)]" : "text-[rgba(255,250,240,0.38)]"}`} />
        {active ? "当前模式" : "可随时切换"}
      </span>
      <strong className="block font-serif text-2xl leading-tight">{title}</strong>
      <p className="mt-2 text-sm font-bold leading-6 text-[rgba(255,250,240,0.68)]">{detail}</p>
    </div>
  );
}

function Mini({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value: string }) {
  return (
    <div className="rounded-[8px] border border-[var(--line)] bg-[rgba(255,250,240,0.66)] p-3">
      <Icon className="mb-3 h-4 w-4 text-[var(--ocean)]" aria-hidden="true" />
      <strong className="block font-serif text-2xl font-black">{value}</strong>
      <span className="font-mono text-xs font-black uppercase text-[var(--muted)]">{label}</span>
    </div>
  );
}
