"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, CheckCircle2, Compass, ListChecks, Route, SlidersHorizontal, TimerReset } from "lucide-react";
import { LearningCompass } from "@/components/learning/learning-compass";
import { OnboardingGateNotice } from "@/components/learning/onboarding-gate-notice";
import { TaskCard } from "@/components/learning/task-card";
import { Button } from "@/components/ui/button";
import { ModuleHero, PageHeader, SectionHeading, Surface } from "@/components/ui/section";
import { TrackRow } from "@/components/ui/track-row";
import { selfStudyFocus, selfStudyGoals, selfStudyIntensity, buildSelfStudyPlan, normalizeDailyMinutes } from "@/data/self-study";
import { clearSelfStudyCheckpointDraft, getSelfStudyCheckpointDrafts, saveSelfStudyCheckpointDraft } from "@/lib/learning/drafts";
import { moduleToAbility } from "@/lib/learning/modules";
import { needsOnboardingFunnel } from "@/lib/learning/compass";
import { ABILITY_LABELS, findCompletedCheckpointCredit, useLearningWorkspace, validateCheckpointEvidence } from "@/lib/learning/workspace";
import type { AbilityId, StudyFocus, StudyGoal, StudyIntensity, StudyMode, UserProfile } from "@/lib/learning/types";

export default function SelfStudyPage() {
  const { workspace, saveSelfStudyPlan, saveSelfStudyCheckpoint } = useLearningWorkspace();
  const profile = workspace.profile;
  const enrollBlocked = needsOnboardingFunnel(workspace.profile, workspace.progress);
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
    if (enrollBlocked) return false;
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
        title="按自己的时间安排，也别丢掉学习顺序。"
        copy="选择目标、每天能学多久，以及当前最想练什么。保存后，首页会按这个计划安排任务。"
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

      <OnboardingGateNotice copy="先完成三分钟入门，再保存你的学习计划。" />

      <ModuleHero
        kicker={`Current Plan · ${plan.intensity.title} · ${plan.focus.title}`}
        title={plan.goal.title}
        copy={`${plan.goal.outcome} 按当前安排，每周约 ${plan.weeklyHours} 小时。预计周期会随每天可用时间调整。`}
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
          copy="这里显示今天最值得先做的内容，与首页使用同一份课程、复习和错题记录。"
        />
        <div>
          {todayTasks.map((task, index) => (
            <TaskCard key={task.id} task={task} compact index={index + 1} />
          ))}
        </div>
      </Surface>

      <LearningCompass workspace={workspace} active="self" condensed />

      <section className="grid gap-3 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="dark-slab grid gap-4 p-5 md:grid-cols-[auto_minmax(0,1fr)]">
          <div className="hidden h-full w-12 place-items-center rounded-none border border-[var(--line)] bg-[var(--wash-1)] font-mono text-xs font-black uppercase tracking-normal text-[var(--ink-soft)] md:grid">
            <span className="vertical-text">Mode</span>
          </div>
          <div className="grid gap-3">
            <p className="eyebrow text-[var(--ink-soft)]">Choice Architecture</p>
            <h2 className="font-serif text-3xl font-black leading-tight md:text-4xl">两种学习方式，共用同一份进度。</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <ModeCard active={draft.studyMode === "guided"} title="按路径学习" detail="主线课负责先后顺序，适合零基础一路推进；自学设置仍会影响复习和弱项排序。" />
              <ModeCard active={draft.studyMode === "self"} title="自由自学" detail="你决定目标与节奏，系统把每日模板、模块入口和检查点收进同一个工作台。" />
            </div>
          </div>
        </div>
        <div className="studio-panel paper-rail grid gap-3 p-5">
          <p className="eyebrow">Plan Thread</p>
          <h2 className="font-serif text-3xl font-black leading-tight">每天怎么学</h2>
          <div className="grid gap-2">
            {[
              ["1", "先复习", plan.dailyTemplate[0]?.detail ?? "先处理今天到期的内容。"],
              ["2", "再学一点新的", plan.dailyTemplate[1]?.detail ?? "进入当前最重要的模块。"],
              ["3", "说或写一句", plan.dailyTemplate[2]?.detail ?? "用韩语留下一段自己的表达。"],
              ["4", "记下结果", "保存正确率、录音、韩语复述或短文，方便之后回看。"]
            ].map(([step, title, detail]) => (
              <div key={step} className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-3 rounded-none border border-[var(--line)] bg-[var(--card)] p-3">
                <span className="grid h-9 w-9 place-items-center rounded-none bg-[var(--ink)] font-mono text-xs font-black text-[var(--surface-solid)]">{step}</span>
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
                  className="focus-ring min-h-11 rounded-none border border-[var(--line-strong)] bg-[var(--surface-solid)] px-3"
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
              <Button type="button" onClick={applyPlan} disabled={enrollBlocked}>
                {enrollBlocked ? "先完成入门" : saveStatus === "saved" ? "计划已保存" : "保存学习计划"}
              </Button>
              {saveStatus === "error" ? (
                <p className="rounded-none border border-[var(--seal)] bg-[var(--seal-soft)] p-3 text-sm font-bold leading-6 text-[var(--cinnabar)]">
                  学习计划没有保存。请释放浏览器空间，或允许本站使用本地存储后重试。
                </p>
              ) : null}
              {saveStatus === "saved" ? (
                <div className="grid gap-2 rounded-none border border-[var(--green)] bg-[var(--green-soft)] p-3 text-sm font-bold leading-6">
                  <p className="text-[var(--celadon)]">学习计划已保存，首页推荐已经重新排序。</p>
                  <div className="grid gap-2 rounded-none border border-[var(--line)] bg-[var(--card)] p-3 text-[var(--muted)]">
                    <span>{planDraft.studyMode === "self" ? "首页会优先显示自学计划、薄弱内容和到期复习。" : "首页会优先显示下一课和到期复习。"}</span>
                    <span>课程、情境听读、输出、错题和阶段检查都会继续保存。</span>
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
              copy="每天安排复习、新内容和一次主动表达。你完成任务后，首页会自动调整下一项。"
            />
            <div>
              {plan.dailyTemplate.map((item: any, index: number) => (
                <TrackRow
                  key={item.title}
                  index={index + 1}
                  glyph={String(index + 1)}
                  kicker={`${item.minutes} 分钟`}
                  title={item.title}
                  detail={item.detail}
                />
              ))}
            </div>
          </Surface>

          <Surface>
            <SectionHeading
              kicker="Phases"
              title="阶段路线"
              copy="先学稳韩文和发音，再进入句型、日常场景、语气和长期作品。"
            />
            <div>
              {plan.phases.map((phase: any, index: number) => (
                <TrackRow
                  key={phase.title}
                  index={index + 1}
                  glyph={String(index + 1)}
                  kicker={phase.weeks}
                  title={phase.title}
                  detail={phase.outcome}
                  expanded
                >
                  <div className="flex flex-wrap gap-2">
                    {phase.modules.map((module: any) => (
                      <Link key={module.id} href={module.href} className="rounded-none border-[3px] border-[var(--border)] bg-[var(--yellow-soft)] px-3 py-1 text-sm font-bold text-[var(--ocean)]">
                        {module.title}
                      </Link>
                    ))}
                  </div>
                </TrackRow>
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
              <div>
                {visibleRhythm.map((day: any, index: number) => (
                  <TrackRow
                    key={day.day}
                    index={index + 1}
                    glyph={day.day.slice(0, 1)}
                    kicker={day.day}
                    title={day.title}
                    detail={day.detail}
                    active={day.active}
                  />
                ))}
              </div>
            </Surface>
            <Surface>
              <SectionHeading
                kicker="Checkpoints"
                title="阶段检查"
                copy="每隔一段时间，用正确率、录音、韩语复述或短文记下学习结果。这里只保存复盘，不会替代课程成绩。"
              />
              <div>
                {visibleCheckpoints.map((item: any, index: number) => {
                  const checkpointId = checkpointKey(plan.goal.id, plan.intensity.id, plan.focus.id, item.title, index);
                  const completedCheckpointId = findCompletedCheckpointCredit(workspace.progress, checkpointId);
                  const completed = Boolean(completedCheckpointId);
                  const savedEvidence = completedCheckpointId ? workspace.progress.checkpointEvidence[completedCheckpointId] : undefined;
                  const evidence = savedEvidence ?? workspace.progress.checkpointEvidence[checkpointId] ?? checkpointDrafts[checkpointId] ?? "";
                  const evidenceReady = validateCheckpointEvidence(evidence, workspace.progress);
                  const weakEvidence = !completed && Boolean(evidence.trim()) && !evidenceReady;
                  const evidenceHintId = `checkpoint-evidence-hint-${index}`;
                  return (
                  <TrackRow
                    key={item.title}
                    index={index + 1}
                    glyph={String(index + 1)}
                    kicker={completed ? "已完成" : "阶段检查"}
                    title={item.title}
                    detail={`关联训练：${checkpointAbilities(item, plan.modules).map((ability) => ABILITY_LABELS[ability]).join(" / ")}`}
                    completed={completed}
                    expanded
                  >
                    <p className="text-sm leading-6 text-[var(--muted)]">{item.detail}</p>
                    <label className="mt-3 grid gap-2 text-sm font-extrabold">
                      学习记录
                      <textarea
                        className="focus-ring min-h-20 resize-none rounded-none border border-[var(--line-strong)] bg-[var(--surface-solid)] px-3 py-2 text-sm font-medium"
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
                            else next[checkpointId] = "草稿没有保存。当前输入还在页面里，但刷新或离开后可能丢失。";
                            return next;
                          });
                        }}
                      />
                    </label>
                    {weakEvidence ? (
                      <p id={evidenceHintId} className="mt-2 rounded-none border border-[var(--border)] bg-[var(--yellow-soft)] p-3 text-xs font-bold leading-5 text-[var(--brass)]">
                        请先完成一课或加入一项学习内容，再写下包含韩语的录音、正确率或输出句子。
                      </p>
                    ) : null}
                    <Button
                      className="mt-3"
                      type="button"
                      size="sm"
                      variant="secondary"
                       disabled={completed || enrollBlocked || !evidenceReady}
                       onClick={() => {
                         if (enrollBlocked) return;
                         if (!saveSelfStudyCheckpoint(planDraft, checkpointId, evidence, checkpointAbilities(item, plan.modules))) {
                           setCheckpointErrors((current) => ({ ...current, [checkpointId]: "学习记录没有保存，请稍后重试。" }));
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
                           else next[checkpointId] = "阶段检查已保存，但旧草稿没有清理成功。";
                           return next;
                         });
                       }}
                     >
                       {completed ? "已保存" : "保存阶段检查"}
                     </Button>
                     {checkpointErrors[checkpointId] ? (
                       <p className="mt-3 rounded-none border border-[var(--seal)] bg-[var(--seal-soft)] p-3 text-sm font-bold leading-6 text-[var(--cinnabar)]">
                         {checkpointErrors[checkpointId]}
                       </p>
                     ) : null}
                   </TrackRow>
                );
                })}
              </div>
              {hiddenCheckpointCount ? (
                <details className="mt-3 rounded-none border border-[var(--line)] bg-[var(--card)] p-3">
                  <summary className="min-h-11 cursor-pointer py-3 text-sm font-black text-[var(--muted)]">
                    后续 {hiddenCheckpointCount} 个阶段检查会依次开放
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
            className={`focus-ring grid min-h-11 place-items-center rounded-none border px-3 text-center text-sm font-extrabold focus-within:border-[var(--ocean)] focus-within:ring-2 focus-within:ring-[rgba(23,63,115,0.22)] ${
              value === item.id ? "border-[var(--ocean)] bg-[color-mix(in_srgb,var(--navy)_12%,transparent)] text-[var(--ocean)]" : "border-[var(--line)] bg-[var(--card)]"
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
    <div className={`rounded-none border p-4 ${active ? "border-[var(--line-strong)] bg-[var(--wash-2)]" : "border-[var(--line)] bg-[var(--wash-1)]"}`}>
      <span className="mb-3 inline-flex items-center gap-2 font-mono text-xs font-black uppercase text-[var(--muted)]">
        <CheckCircle2 className={`h-4 w-4 ${active ? "text-[var(--celadon)]" : "text-[var(--ink-faint)]"}`} />
        {active ? "当前模式" : "可随时切换"}
      </span>
      <strong className="block font-serif text-2xl leading-tight">{title}</strong>
      <p className="mt-2 text-sm font-bold leading-6 text-[var(--muted)]">{detail}</p>
    </div>
  );
}

function Mini({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value: string }) {
  return (
    <div className="rounded-none border border-[var(--line)] bg-[var(--card)] p-3">
      <Icon className="mb-3 h-4 w-4 text-[var(--ocean)]" aria-hidden="true" />
      <strong className="block font-serif text-2xl font-black">{value}</strong>
      <span className="font-mono text-xs font-black uppercase text-[var(--muted)]">{label}</span>
    </div>
  );
}
