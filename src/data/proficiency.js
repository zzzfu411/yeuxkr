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
    summary: "能拆音节块、读基础韩文，并开始听出元音和辅音差异。",
    requirements: [
      { metric: "lessons", target: 3 },
      { metric: "hangul", target: 12 },
      { metric: "scriptAbility", target: 18 },
      { metric: "listeningAbility", target: 10 }
    ]
  },
  {
    id: "survival-polite",
    band: "A1",
    title: "礼貌生存表达",
    summary: "能完成问候、自我介绍、点单、问路和基础需求表达。",
    requirements: [
      { metric: "lessons", target: 7 },
      { metric: "vocabulary", target: 18 },
      { metric: "grammar", target: 3 },
      { metric: "materials", target: 2 },
      { metric: "vocabularyAbility", target: 18 },
      { metric: "pragmaticsAbility", target: 12 }
    ]
  },
  {
    id: "connected-daily",
    band: "A2",
    title: "日常连续表达",
    summary: "能围绕过去、计划、许可、身体、邀请和简单原因组织连续句。",
    requirements: [
      { metric: "lessons", target: 20 },
      { metric: "vocabulary", target: 40 },
      { metric: "grammar", target: 12 },
      { metric: "materials", target: 4 },
      { metric: "checkpoints", target: 1 },
      { metric: "grammarAbility", target: 35 }
    ]
  },
  {
    id: "media-discourse",
    band: "站内 B1-B2 入口",
    title: "真实材料入口",
    summary: "站内证据足以开始挑战慢速新闻、社交短评和观点段落，并做短复述与观点输出；这不是正式 CEFR 等级认证。",
    requirements: [
      { metric: "lessons", target: 26 },
      { metric: "vocabulary", target: 56 },
      { metric: "grammar", target: 18 },
      { metric: "native", target: 8 },
      { metric: "materials", target: 8 },
      { metric: "checkpoints", target: 2 },
      { metric: "listeningAbility", target: 45 },
      { metric: "nativeAbility", target: 35 }
    ]
  },
  {
    id: "native-layer",
    band: "站内 C1 桥接",
    title: "母语者语用桥接",
    summary: "站内证据已覆盖关系、场合、语域和隐含态度的基础调节；这是进入高级作品集前的桥接层，不等同完整母语者水平。",
    requirements: [
      { metric: "lessons", target: 30 },
      { metric: "capstone", target: 1 },
      { metric: "vocabulary", target: 64 },
      { metric: "grammar", target: 24 },
      { metric: "native", target: 16 },
      { metric: "materials", target: 12 },
      { metric: "outputs", target: 4 },
      { metric: "checkpoints", target: 4 },
      { metric: "pragmaticsAbility", target: 60 },
      { metric: "nativeAbility", target: 60 }
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
