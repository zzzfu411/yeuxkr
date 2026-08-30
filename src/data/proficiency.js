export const proficiencyMetrics = {
  lessons: "核心课程",
  hangul: "韩文掌握",
  vocabulary: "词汇入册",
  grammar: "语法点",
  native: "语用/语气",
  materials: "真实材料",
  outputs: "输出档案",
  checkpoints: "检查点证据",
  capstone: "最终整合课",
  scriptAbility: "韩文字母能力",
  listeningAbility: "听辨能力",
  vocabularyAbility: "词汇调用能力",
  grammarAbility: "句型语法能力",
  pragmaticsAbility: "场景语用能力",
  nativeAbility: "母语者表达能力"
};

export const proficiencyLevels = [
  {
    id: "seed",
    band: "A0",
    title: "起步工作台",
    summary: "知道学习从韩文、声音、复习和输出证据开始，而不是先背孤立单词。",
    requirements: []
  },
  {
    id: "script-foundation",
    band: "A0+",
    title: "文字与声音对齐",
    summary: "能拆音节块、读全部韩文字母（含复合元音），并开始听出音变前后的差异。",
    requirements: [
      { metric: "lessons", target: 8 },
      { metric: "hangul", target: 28 },
      { metric: "scriptAbility", target: 18 },
      { metric: "listeningAbility", target: 12 }
    ]
  },
  {
    id: "survival-polite",
    band: "A1",
    title: "礼貌生存表达",
    summary: "能完成问候、自我介绍、数字与价格、点单、问路和基础需求表达，并稳定使用礼貌现在时。",
    requirements: [
      { metric: "lessons", target: 20 },
      { metric: "vocabulary", target: 80 },
      { metric: "grammar", target: 14 },
      { metric: "materials", target: 3 },
      { metric: "vocabularyAbility", target: 40 },
      { metric: "pragmaticsAbility", target: 12 }
    ]
  },
  {
    id: "connected-daily",
    band: "A2",
    title: "日常连续表达",
    summary: "能围绕过去、请求、许可、原因、条件、背景句、身体和邀请组织连续日常段落。",
    requirements: [
      { metric: "lessons", target: 43 },
      { metric: "vocabulary", target: 200 },
      { metric: "grammar", target: 36 },
      { metric: "materials", target: 8 },
      { metric: "checkpoints", target: 1 },
      { metric: "grammarAbility", target: 50 }
    ]
  },
  {
    id: "media-discourse",
    band: "站内 B1 入口",
    title: "叙述与材料入口",
    summary: "站内证据足以开始挑战慢速新闻、社交短评和观点段落，并做短复述；这不是正式 CEFR 认证，也还不是母语者层。",
    requirements: [
      { metric: "lessons", target: 53 },
      { metric: "vocabulary", target: 320 },
      { metric: "grammar", target: 56 },
      { metric: "native", target: 8 },
      { metric: "materials", target: 14 },
      { metric: "checkpoints", target: 2 },
      { metric: "listeningAbility", target: 50 },
      { metric: "nativeAbility", target: 35 }
    ]
  },
  {
    id: "native-layer",
    band: "站内 B1-B2 语域桥接",
    title: "语域与关系距离桥接",
    summary: "站内证据已覆盖敬语、软化、拒绝、半语和书面距离的基础调节。这是进入长期作品集前的桥接层，不等同 C1，更不是母语者水平。",
    requirements: [
      { metric: "lessons", target: 60 },
      { metric: "capstone", target: 1 },
      { metric: "vocabulary", target: 450 },
      { metric: "grammar", target: 72 },
      { metric: "native", target: 18 },
      { metric: "materials", target: 22 },
      { metric: "outputs", target: 6 },
      { metric: "checkpoints", target: 4 },
      { metric: "pragmaticsAbility", target: 60 },
      { metric: "nativeAbility", target: 50 }
    ]
  },
  {
    id: "native-portfolio",
    band: "C2+ roadmap",
    title: "长期母语者作品集",
    summary: "真正接近母语者需要大量语料、输出修订、话题迁移和社会语用反馈；这是完整学习路线的长期扩容目标。",
    expansionOnly: true,
    roadmapTargets: [
      "5000+ 可调用词汇与搭配",
      "200+ 分级真实材料",
      "120+ 口语/写作输出档案",
      "新闻、职场、学术、社交媒体、亲密关系等话题域迁移",
      "敬语、方言/口语缩略、幽默、暗示、反讽和立场边界训练"
    ],
    requirements: [
      { metric: "vocabulary", target: 5000 },
      { metric: "materials", target: 200 },
      { metric: "outputs", target: 120 },
      { metric: "checkpoints", target: 24 },
      { metric: "nativeAbility", target: 95 }
    ]
  }
];
