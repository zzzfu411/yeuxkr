export const nativeRoadmapStages = [
  {
    id: "in-app-bridge",
    scope: "in-app",
    band: "站内 B1-B2 过渡",
    title: "完成站内基础练习",
    target: "完成韩文、词汇、语法、情境听读、改写和阶段检查。这是站内进度，不是 C1 认证。",
    weeks: "4-8 周",
    deliverables: {
      vocabulary: 64,
      collocations: 40,
      native: 8,
      materials: 12,
      outputTasks: 4,
      checkpoints: 4
    },
    domains: ["点餐与服务", "问路交通", "社交缓冲", "慢速新闻", "短观点表达"],
    gates: [
      "每段听读都要完成听写、复述和目标改写",
      "目标改写需要加入间隔复习",
      "阶段检查至少记录正确率、录音、韩语复述或短文中的一项"
    ],
    todayActions: [
      { title: "完成一段情境听读", href: "/immersion", task: "听写 1 句，用韩语复述 1 句，再保存一条目标改写。" },
      { title: "做一次综合测验", href: "/quiz", task: "用混合题复习发音、词汇、语法和听读内容。" },
      { title: "记录一次阶段检查", href: "/self-study", task: "保存本周的正确率、录音内容或韩语短文。" }
    ]
  },
  {
    id: "in-app-domain-transfer",
    scope: "in-app",
    band: "站内 B2 预览",
    title: "换个话题再练",
    target: "把站内的语用、语法、听读和输出整理成一份可以回看的小型作品集。",
    weeks: "8-12 周",
    deliverables: {
      vocabulary: 88,
      collocations: 88,
      native: 16,
      materials: 17,
      outputTasks: 12,
      checkpoints: 6
    },
    domains: ["服务对话", "交通与生活", "媒体短评", "观点写作", "关系距离", "学习规划"],
    gates: [
      "同一个意思至少练习正式、半正式和亲近日常三种说法",
      "作品保留原稿、需要改进的地方、目标改写和自评",
      "综合测验覆盖词汇、语法、语用、听读复述和输出改写"
    ],
    todayActions: [
      { title: "改写同一意图", href: "/native", task: "把同一句意图改成陌生人、朋友、前辈三种关系版本。" },
      { title: "保存一段输出", href: "/immersion", task: "写韩语草稿，标出需要改进的地方，再保存更自然的改写。" },
      { title: "完成到期复习", href: "/review", task: "优先复习输出、听读和自然表达卡，别只停在看懂。" }
    ]
  },
  {
    id: "external-bridge-expansion",
    scope: "external",
    band: "B2 → C1 长期练习",
    title: "扩充站外材料",
    target: "完成站内内容后，开始积累原生语料、常用搭配和反复修改的输出。",
    weeks: "12-18 周",
    deliverables: {
      vocabulary: 800,
      collocations: 260,
      native: 80,
      materials: 36,
      outputTasks: 24,
      checkpoints: 8
    },
    domains: ["日常协商", "服务场景", "健康与求助", "社交短评", "慢速新闻"],
    gates: [
      "每 120 个词必须绑定 20 个搭配和 12 个可替换句框",
      "每次阶段检查都要留下韩语录音或短文",
      "看懂不等于会用；保存目标改写，并在之后重新测试"
    ],
    todayActions: [
      { title: "扩充原生材料", href: "/immersion", task: "为新材料安排听写、复述和改写，再加入间隔复习。" },
      { title: "换个场景使用", href: "/native", task: "把学过的缓冲表达用到一个新话题或新关系中。" },
      { title: "回看阶段记录", href: "/self-study", task: "整理新增材料、输出和阶段检查。" }
    ]
  },
  {
    id: "native-portfolio-expansion",
    scope: "external",
    band: "长期高阶路线",
    title: "长期作品集",
    target: "持续积累原生语料、反复修改作品，并从真实交流中获得语用和语域反馈。",
    weeks: "36+ 周",
    deliverables: {
      vocabulary: 5000,
      collocations: 2200,
      native: 400,
      materials: 200,
      outputTasks: 120,
      checkpoints: 24
    },
    domains: ["学术表达", "职场谈判", "媒体评论", "幽默与暗示", "方言/口语缩略", "敬语体系", "立场与边界"],
    gates: [
      "每个输出主题至少经历草稿、目标改写、复盘和延迟复测",
      "材料库按速度、语域、话题、任务类型和文化负载标注",
      "站内分数不能替代原生材料数量、作品质量和真实交流反馈"
    ],
    todayActions: [
      { title: "建立主题作品集", href: "/immersion", task: "围绕一个新闻、职场或社交主题保存草稿、弱点、目标改写和自评。" },
      { title: "复测旧输出", href: "/review", task: "等输出卡到期后重新说或写一遍，看看还能不能自然表达。" },
      { title: "安排下一阶段", href: "/path", task: "按材料、词汇、搭配、输出和阶段检查规划下一轮练习。" }
    ]
  }
];

export const nativeRoadmapTotals = nativeRoadmapStages.at(-1)?.deliverables ?? {
  vocabulary: 5000,
  collocations: 2200,
  native: 400,
  materials: 200,
  outputTasks: 120,
  checkpoints: 24
};

export const nativeRoadmapPrinciples = [
  "先把 A0-A2 的声音、文字和基本输出做稳，再进入高级表达。",
  "高阶表达不只是更难的单句，还要能根据关系、媒介、立场和语域换一种说法。",
  "站内等级参考课程、情境听读、输出、复习和阶段检查，但不等于正式语言认证。",
  "接近母语者是长期目标，不能用有限的站内课程替代原生语料、作品修改和真实交流。"
];

const inAppEvidenceKeys = ["vocabulary", "collocations", "native", "materials", "outputTasks", "checkpoints"];

export function isNativeRoadmapStageComplete(stage, evidence = {}) {
  return inAppEvidenceKeys.every((key) => {
    return Number(evidence[key] ?? 0) >= Number(stage?.deliverables?.[key] ?? 0);
  });
}

export function getCurrentInAppNativeStage(evidence = {}, stages = nativeRoadmapStages) {
  const inAppStages = stages.filter((stage) => stage.scope !== "external");
  const currentStage = inAppStages.find((stage) => !isNativeRoadmapStageComplete(stage, evidence)) ?? inAppStages.at(-1) ?? stages[0];
  const longTermStage = stages.find((stage) => stage.scope === "external") ?? stages.at(-1) ?? currentStage;
  return {
    currentStage,
    longTermStage,
    inAppPortfolioComplete: inAppStages.length > 0 && inAppStages.every((stage) => isNativeRoadmapStageComplete(stage, evidence))
  };
}
