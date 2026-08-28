export const nativeRoadmapStages = [
  {
    id: "in-app-bridge",
    scope: "in-app",
    band: "站内 C1 bridge",
    title: "站内桥接证据闭环",
    target: "用当前内容库先跑通韩文、词汇、语法、真实材料、输出改写和检查点的完整证据链。",
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
      "每个材料至少包含听写、复述、目标改写和 SRS 回流",
      "输出档案只承认已经进入 SRS 的韩语目标改写",
      "检查点必须包含正确率、录音、韩语复述或短文证据"
    ],
    todayActions: [
      { title: "完成一段真实材料", href: "/immersion", task: "听写 1 句、韩语复述 1 句，并保存一条目标改写。" },
      { title: "做一次迁移测验", href: "/quiz", task: "用混合题检查声音、词汇、语法和材料复述是否能互相调用。" },
      { title: "记录自学检查点", href: "/self-study", task: "用正确率、录音内容或韩语短文证明本周确实掌握了一个模块。" }
    ]
  },
  {
    id: "in-app-domain-transfer",
    scope: "in-app",
    band: "站内 C1 preview",
    title: "站内话题迁移预演",
    target: "把当前站内所有语用、语法、材料和输出任务串成可复查的小型作品集。",
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
      "同一任务至少提供正式体、半正式体、亲近日常体三种表达",
      "输出档案必须保留原稿、弱点、目标改写和自评 rubric",
      "综合测验必须覆盖词汇、语法、语用、材料复述和输出改写"
    ],
    todayActions: [
      { title: "改写同一意图", href: "/native", task: "把同一句意图改成陌生人、朋友、前辈三种关系版本。" },
      { title: "补一条输出档案", href: "/immersion", task: "写韩语草稿，标出弱点，再保存更自然的目标改写。" },
      { title: "回到到期复习", href: "/review", task: "优先清掉 output、material、native 类卡片，避免高级表达只停在看懂。" }
    ]
  },
  {
    id: "external-bridge-expansion",
    scope: "external",
    band: "B2 -> C1 expansion",
    title: "站外桥接扩容",
    target: "当站内资源跑通后，把同一套证据链扩展到真实语料、搭配和输出修订。",
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
      "每个阶段检查点必须要求韩语录音或韩语短文证据",
      "不得把看懂材料当成完成，必须保存目标改写并延迟复测"
    ],
    todayActions: [
      { title: "扩展真实材料池", href: "/immersion", task: "按同一格式加入新的听写、复述和输出任务，再送入 SRS。" },
      { title: "迁移一个语气动作", href: "/native", task: "把站内学过的缓冲表达迁移到一个新话题或新关系里。" },
      { title: "做一次证据盘点", href: "/self-study", task: "把新增材料、输出和检查点写成可复查的阶段记录。" }
    ]
  },
  {
    id: "native-portfolio-expansion",
    scope: "external",
    band: "C2 roadmap",
    title: "母语者作品集扩容",
    target: "建立真正长期的高阶作品集：大量语料、反复修订、社会语用反馈和语域切换。",
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
      "不得用站内分数替代真实语料量和输出作品集证据"
    ],
    todayActions: [
      { title: "建立主题作品集", href: "/immersion", task: "围绕一个新闻、职场或社交主题保存草稿、弱点、目标改写和自评。" },
      { title: "复测旧输出", href: "/review", task: "等输出卡到期后重新说/写一遍，检查是否仍能自然调用。" },
      { title: "扩展下一阶段计划", href: "/path", task: "按材料、词汇、搭配、输出和检查点五类证据规划下一轮扩容。" }
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
  "高级不是更难的单句，而是同一意图在关系、媒介、立场和语域之间迁移。",
  "每个可达等级都必须由课程、真实材料、输出档案、复习记录和检查点共同证明。",
  "母语者路线必须保留长期作品集目标，不能被 30 节核心课伪装成终点。"
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
