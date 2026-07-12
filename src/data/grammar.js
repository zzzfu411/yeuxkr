import { extraGrammarPoints } from "./extended-content.js";

export const grammarPoints = [
  {
    id: "g-topic-subject",
    level: "foundation",
    title: "은/는 与 이/가",
    pattern: "名词 + 은/는 / 이/가",
    meaning: "话题标记 vs 主语标记",
    explanation: "은/는 把名词设为谈论主题，常带对比或背景；이/가 标出句中主语，常用于新信息、强调谁/什么。",
    examples: [
      { ko: "저는 학생이에요.", zh: "我是学生。", note: "저는 设定“我”这个话题。" },
      { ko: "제가 할게요.", zh: "我来做。", note: "제가 强调由我来做。" },
      { ko: "이 카페는 커피가 맛있어요.", zh: "这家咖啡馆咖啡好喝。", note: "카페 是话题，커피 是具体好喝的主语。" }
    ],
    pitfalls: ["不要把 은/는 简单等同于“是”。", "初期可以先记：介绍自己多用 저는，回答“谁”多用 제가。"]
  },
  {
    id: "g-copula",
    level: "foundation",
    title: "이에요/예요",
    pattern: "名词 + 이에요/예요",
    meaning: "是……",
    explanation: "前面有收音用 이에요，没有收音用 예요。口语中常用于身份、名称和定义。",
    examples: [
      { ko: "저는 리나예요.", zh: "我是 Lina。", note: "리나 无收音，用 예요。" },
      { ko: "이건 책이에요.", zh: "这是书。", note: "책 有收音，用 이에요。" }
    ],
    pitfalls: ["正式场合可用 입니다。", "否定是 名词 + 이/가 아니에요。"]
  },
  {
    id: "g-have-exist",
    level: "foundation",
    title: "있어요/없어요",
    pattern: "名词 + 이/가 있어요/없어요",
    meaning: "有/在；没有/不在",
    explanation: "있다 同时表达存在和拥有，需要靠上下文判断。",
    examples: [
      { ko: "시간이 있어요.", zh: "有时间。", note: "拥有抽象资源。" },
      { ko: "친구가 집에 있어요.", zh: "朋友在家。", note: "表达位置存在。" },
      { ko: "문제가 없어요.", zh: "没有问题。", note: "없어요 是否定存在。" }
    ],
    pitfalls: ["“喜欢”不是 있어요，而是 좋아해요 或 좋아요。"]
  },
  {
    id: "g-politeness-yo",
    level: "foundation",
    title: "요 体礼貌句",
    pattern: "谓词词干 + 아/어요",
    meaning: "礼貌日常表达",
    explanation: "요 体是日常最实用的礼貌层级。元音调和决定 아요/어요，하다 变 해요。",
    examples: [
      { ko: "가요.", zh: "去。", note: "가다 -> 가요。" },
      { ko: "먹어요.", zh: "吃。", note: "먹다 -> 먹어요。" },
      { ko: "공부해요.", zh: "学习。", note: "공부하다 -> 공부해요。" }
    ],
    pitfalls: ["不要所有动词都直接加 요；要先去 다 再变形。"]
  },
  {
    id: "g-object",
    level: "foundation",
    title: "을/를",
    pattern: "名词 + 을/를 + 动词",
    meaning: "宾语标记",
    explanation: "动词作用的对象常用 을/를 标记。有收音用 을，无收音用 를。",
    examples: [
      { ko: "물을 마셔요.", zh: "喝水。", note: "물 有收音，用 을。" },
      { ko: "커피를 마셔요.", zh: "喝咖啡。", note: "커피 无收音，用 를。" }
    ],
    pitfalls: ["口语中可省略，但学习阶段建议先保留以建立句法感。"]
  },
  {
    id: "g-location",
    level: "foundation",
    title: "에 与 에서",
    pattern: "地点 + 에/에서",
    meaning: "到/在 vs 在……做",
    explanation: "에 表示目的地或存在位置；에서 表示动作发生地点。",
    examples: [
      { ko: "학교에 가요.", zh: "去学校。", note: "目的地。" },
      { ko: "학교에 있어요.", zh: "在学校。", note: "存在位置。" },
      { ko: "학교에서 공부해요.", zh: "在学校学习。", note: "动作发生地。" }
    ],
    pitfalls: ["있다/없다 的位置常用 에，不用 에서。"]
  },
  {
    id: "g-want",
    level: "growth",
    title: "-고 싶어요",
    pattern: "动词词干 + 고 싶어요",
    meaning: "想做……",
    explanation: "表达第一人称愿望时非常高频。问对方也可以用 싶어요?，但谈第三人称常用 싶어 해요。",
    examples: [
      { ko: "한국에 가고 싶어요.", zh: "我想去韩国。", note: "가다 -> 가고 싶어요。" },
      { ko: "뭐 먹고 싶어요?", zh: "你想吃什么？", note: "自然询问对方愿望。" }
    ],
    pitfalls: ["第三人称愿望不要长期只用 싶어요，要学习 싶어 하다。"]
  },
  {
    id: "g-past",
    level: "growth",
    title: "过去式 -았/었어요",
    pattern: "谓词词干 + 았/었어요",
    meaning: "做了；曾经是",
    explanation: "아/오 系多接 았어요，其他多接 었어요，하다 变 했어요。",
    examples: [
      { ko: "어제 영화를 봤어요.", zh: "昨天看了电影。", note: "보다 -> 봤어요。" },
      { ko: "정말 맛있었어요.", zh: "真的很好吃。", note: "있다 -> 있었어요。" },
      { ko: "공부했어요.", zh: "学习了。", note: "하다 -> 했어요。" }
    ],
    pitfalls: ["았/었 的选择看词干最后元音，不看中文意思。"]
  },
  {
    id: "g-reason",
    level: "growth",
    title: "-아서/어서",
    pattern: "谓词词干 + 아서/어서",
    meaning: "因为……所以；先后动作",
    explanation: "连接原因或自然先后，后句通常不接命令和共动。",
    examples: [
      { ko: "바빠서 못 갔어요.", zh: "因为忙所以没去。", note: "原因。" },
      { ko: "집에 가서 쉬어요.", zh: "回家后休息。", note: "先后动作。" }
    ],
    pitfalls: ["正式清晰表达原因也可用 -기 때문에。"]
  },
  {
    id: "g-contrast",
    level: "growth",
    title: "-지만",
    pattern: "谓词词干 + 지만",
    meaning: "虽然……但是",
    explanation: "连接转折，语气直接清楚。",
    examples: [
      { ko: "어렵지만 재미있어요.", zh: "虽然难，但有意思。", note: "形容词转折。" },
      { ko: "가고 싶지만 시간이 없어요.", zh: "想去，但是没时间。", note: "愿望与现实冲突。" }
    ],
    pitfalls: ["更口语的铺垫可用 그런데 或 근데。"]
  },
  {
    id: "g-guess",
    level: "native",
    title: "-나 봐요 / -는 것 같아요",
    pattern: "谓词 + 나 봐요 / 는 것 같아요",
    meaning: "看来；好像",
    explanation: "用来降低断言强度，是母语者表达判断时常用的缓冲装置。",
    examples: [
      { ko: "비가 오나 봐요.", zh: "看来要下雨/正在下雨。", note: "基于迹象推测。" },
      { ko: "이 방법이 더 좋은 것 같아요.", zh: "这个方法好像更好。", note: "柔和表达意见。" }
    ],
    pitfalls: ["母语者常不用绝对断言，而用推测和缓冲保护对话空间。"]
  },
  {
    id: "g-nominalization",
    level: "native",
    title: "-는 것",
    pattern: "动词/形容词修饰 + 것",
    meaning: "把动作或状态名词化",
    explanation: "高级表达的核心工具，可把整件事包装成话题、主语或宾语。",
    examples: [
      { ko: "한국어를 배우는 것은 재미있어요.", zh: "学习韩语这件事很有意思。", note: "动作名词化作话题。" },
      { ko: "제가 말하고 싶은 건 이거예요.", zh: "我想说的是这个。", note: "건 = 것은。" }
    ],
    pitfalls: ["不要只依赖短句；-는 것 能让你讨论抽象概念。"]
  }
].concat(extraGrammarPoints);
