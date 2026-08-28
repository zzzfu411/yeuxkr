import { foundationSpine, studyModuleDescriptors as moduleMap, uniqueModuleAbilities } from "../lib/learning/modules.js";

export const studyModes = [
  {
    id: "guided",
    title: "按路径学习",
    summary: "适合零基础和想降低决策成本的人。系统安排下一课、复习和阶段推进。"
  },
  {
    id: "self",
    title: "自学规划",
    summary: "适合目标明确或学习时间不固定的人。你选择目标和强度，系统给出完整自学方案。"
  }
];

export const selfStudyGoals = [
  {
    id: "foundation",
    title: "打牢基础",
    durationWeeks: 12,
    targetHours: 180,
    outcome: "能稳定读写韩文、完成日常礼貌句、进行 2-3 分钟自我介绍。",
    emphasis: ["script", "listening", "grammar", "vocabulary"]
  },
  {
    id: "travel",
    title: "旅行与生活",
    durationWeeks: 10,
    targetHours: 240,
    outcome: "能处理点餐、交通、住宿、购物、求助和基础闲聊。",
    emphasis: ["vocabulary", "pragmatics", "listening", "grammar"]
  },
  {
    id: "media",
    title: "韩剧综艺理解",
    durationWeeks: 18,
    targetHours: 800,
    outcome: "能听懂慢速材料和短片段关键词，开始积累口语反应和语气表达。",
    emphasis: ["listening", "vocabulary", "native", "pragmatics"]
  },
  {
    id: "native",
    title: "高级表达长期路线",
    durationWeeks: 36,
    targetHours: 2000,
    outcome: "建立抽象讨论、语气与关系调节的长期作品集，持续向母语者水平推进。",
    emphasis: ["native", "pragmatics", "grammar", "vocabulary"]
  }
];

export const selfStudyIntensity = [
  {
    id: "light",
    title: "轻量",
    minutes: 15,
    daysPerWeek: 4,
    reviewRatio: 0.35,
    description: "适合通勤、碎片时间或刚开始建立习惯。"
  },
  {
    id: "steady",
    title: "稳定",
    minutes: 30,
    daysPerWeek: 5,
    reviewRatio: 0.3,
    description: "推荐强度。能兼顾新课、听力、词汇和复盘。"
  },
  {
    id: "deep",
    title: "强化",
    minutes: 60,
    daysPerWeek: 6,
    reviewRatio: 0.25,
    description: "适合短期集中突破，需要更稳定的输出练习。"
  }
];

export const selfStudyFocus = [
  { id: "balanced", title: "均衡", modules: ["script", "listening", "vocabulary", "grammar", "pragmatics", "native"] },
  { id: "listening", title: "听力口语", modules: ["listening", "script", "pragmatics", "native", "vocabulary"] },
  { id: "reading", title: "阅读语法", modules: ["grammar", "vocabulary", "script", "native", "pragmatics"] },
  { id: "conversation", title: "真实对话", modules: ["pragmatics", "listening", "vocabulary", "native", "grammar"] }
];

const MIN_DAILY_MINUTES = 5;
const MAX_DAILY_MINUTES = 120;

export function buildSelfStudyPlan(profile = {}) {
  const goal = selfStudyGoals.find((item) => item.id === profile.selfStudyGoal) ?? selfStudyGoals[0];
  const intensity = selfStudyIntensity.find((item) => item.id === profile.selfStudyIntensity) ?? selfStudyIntensity[1];
  const focus = selfStudyFocus.find((item) => item.id === profile.selfStudyFocus) ?? selfStudyFocus[0];
  const modules = mergeModules(foundationSpine, goal.emphasis, focus.modules).map((id) => ({ id, ...moduleMap[id] }));
  const minutes = normalizeDailyMinutes(profile.minutesGoal, intensity.minutes);
  const rawWeeklyHours = (minutes * intensity.daysPerWeek) / 60;
  const durationWeeks = Math.max(goal.durationWeeks, Math.ceil(goal.targetHours / Math.max(rawWeeklyHours, 0.1)));
  const plannedGoal = { ...goal, durationWeeks };
  const dailyTemplate = buildDailyTemplate(minutes, intensity, modules);

  return {
    goal: plannedGoal,
    intensity,
    focus,
    modules,
    minutesGoal: minutes,
    durationWeeks,
    weeklyHours: Math.round(rawWeeklyHours * 10) / 10,
    dailyTemplate,
    phases: buildPhases(plannedGoal, modules),
    weeklyRhythm: buildWeeklyRhythm(intensity, modules),
    checkpoints: buildCheckpoints(plannedGoal, modules)
  };
}

export function normalizeDailyMinutes(input, fallback = selfStudyIntensity[1].minutes) {
  const value = Number(input);
  const fallbackValue = Number.isFinite(Number(fallback)) ? Number(fallback) : selfStudyIntensity[1].minutes;
  const minutes = Number.isFinite(value) ? value : fallbackValue;
  return Math.min(MAX_DAILY_MINUTES, Math.max(MIN_DAILY_MINUTES, Math.round(minutes)));
}

function buildDailyTemplate(minutes, intensity, modules) {
  if (minutes <= 5) {
    return [
      { title: "复习", minutes: 2, detail: "只处理最到期的 SRS 卡片，避免记忆债继续堆积。" },
      { title: "新输入", minutes: 1, detail: modules[0]?.daily ?? moduleMap.script.daily },
      { title: "主动输出", minutes: 1, detail: modules[1]?.daily ?? moduleMap.grammar.daily },
      { title: "记录", minutes: 1, detail: "写 1 个今天能说出口的韩语词、短句或最不稳的音。" }
    ];
  }

  const reviewMinutes = Math.max(2, Math.round(minutes * intensity.reviewRatio));
  const remaining = minutes - reviewMinutes;
  const inputMinutes = Math.max(1, Math.round(remaining * 0.45));
  const outputMinutes = Math.max(1, Math.round(remaining * 0.35));
  const recordMinutes = Math.max(1, minutes - reviewMinutes - inputMinutes - outputMinutes);
  const overflow = reviewMinutes + inputMinutes + outputMinutes + recordMinutes - minutes;
  const adjustedOutputMinutes = Math.max(1, outputMinutes - Math.max(0, overflow));

  return [
    { title: "复习", minutes: reviewMinutes, detail: "先处理 SRS 到期卡片，只复习已经学过的内容。" },
    { title: "新输入", minutes: inputMinutes, detail: modules[0]?.daily ?? moduleMap.script.daily },
    { title: "主动输出", minutes: adjustedOutputMinutes, detail: modules[1]?.daily ?? moduleMap.grammar.daily },
    { title: "记录", minutes: minutes - reviewMinutes - inputMinutes - adjustedOutputMinutes, detail: "写 1 句今天能说出口的韩语，标记最不稳的音或句型。" }
  ];
}

function mergeModules(...groups) {
  return [...new Set(groups.flat())].filter((id) => moduleMap[id]);
}

function buildPhases(goal, modules) {
  const total = goal.durationWeeks;
  const first = Math.max(2, Math.round(total * 0.22));
  const second = Math.max(3, Math.round(total * 0.34));
  const third = Math.max(3, Math.round(total * 0.28));
  const fourth = Math.max(2, total - first - second - third);

  const pick = (ids) => ids.map((id) => modules.find((module) => module.id === id)).filter(Boolean);
  const goalModules = modules.filter((module) => goal.emphasis.includes(module.id));
  const appliedModules = modules.filter((module) => !["script", "listening"].includes(module.id));

  return [
    {
      title: "校准声音与文字",
      weeks: `第 1-${first} 周`,
      outcome: "韩文音节块、基础发音和收音口型变成自动反应。",
      modules: pick(["script", "listening", "vocabulary"])
    },
    {
      title: "建立句型骨架",
      weeks: `第 ${first + 1}-${first + second} 周`,
      outcome: "能用礼貌体表达身份、位置、需要、过去经历和简单原因。",
      modules: pick(["vocabulary", "grammar", "pragmatics"])
    },
    {
      title: "进入真实场景",
      weeks: `第 ${first + second + 1}-${first + second + third} 周`,
      outcome: "围绕生活、媒体或旅行场景做听读输入，并进行短复述。",
      modules: appliedModules.length ? appliedModules : modules.slice(2)
    },
    {
      title: "语气与表达升级",
      weeks: `最后 ${fourth} 周`,
      outcome: goal.outcome,
      modules: goalModules.length ? goalModules : pick(["pragmatics", "native", "grammar", "vocabulary"])
    }
  ];
}

function buildWeeklyRhythm(intensity, modules) {
  const days = ["一", "二", "三", "四", "五", "六", "日"];
  return days.map((day, index) => {
    const active = index < intensity.daysPerWeek;
    const studyModule = modules[index % modules.length] ?? modules[0];
    return {
      day: `周${day}`,
      active,
      title: active ? studyModule.title : "轻复盘",
      detail: active ? studyModule.daily : "只做 5 分钟 SRS 或听一遍本周最难的句子。"
    };
  });
}

function buildCheckpoints(goal, modules) {
  return [
    {
      title: "第 2 周检查",
      detail: "随机打开 10 个韩文字母或音节，读音和结构正确率达到 80%。",
      abilities: ["script", "listening"]
    },
    {
      title: "中期检查",
      detail: `围绕「${goal.title}」录 60-90 秒韩语，允许停顿，但要包含至少 6 个本阶段词汇。`,
      abilities: uniqueAbilities(modules.slice(0, 3).map((module) => module.id))
    },
    ...modules.slice(0, 4).map((module) => ({
      title: `${module.title}检查`,
      detail: module.checkpoint,
      abilities: uniqueAbilities([module.id])
    })),
    {
      title: "结课检查",
      detail: goal.outcome,
      abilities: uniqueAbilities(goal.emphasis)
    }
  ];
}

function uniqueAbilities(moduleIds) {
  return uniqueModuleAbilities(moduleIds);
}
