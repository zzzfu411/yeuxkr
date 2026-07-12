import { extraVocab } from "./extended-content.js";

export const vocabLevels = [
  { id: "survival", label: "生存核心", target: "0-800 词", description: "先让学习者能打招呼、点餐、问路、表达需要。" },
  { id: "daily", label: "日常扩展", target: "800-2500 词", description: "覆盖工作、学校、社交、媒体和情绪表达。" },
  { id: "native", label: "母语者表达", target: "2500+ 词", description: "处理搭配、语域、惯用语、新闻和抽象讨论。" }
];

// 词条可选扩展字段（schema v2，向后兼容）：
//   pos: 词性（见 vocabPosLabels 白名单）
//   collocations: [{ ko, zh }] 高频搭配
//   soundChangeNote: 发音提示（如连音/紧音化）
//   soundChangeRuleId: 关联 sound-changes.js 的规则 id
//   confusables: 易混淆词 id 列表（出题时优先做干扰项）
//   tags: 附加标签（hanja / loanword / honorific ...）
export const vocabPosLabels = {
  noun: "名词",
  verb: "动词",
  adj: "形容词",
  adv: "副词",
  particle: "助词",
  expression: "表达",
  counter: "量词",
  number: "数词",
  pronoun: "代词",
  interjection: "叹词"
};

export const vocabCategories = [
  { id: "greetings", label: "寒暄", color: "red" },
  { id: "identity", label: "身份", color: "blue" },
  { id: "food", label: "饮食", color: "green" },
  { id: "travel", label: "移动", color: "orange" },
  { id: "time", label: "时间", color: "violet" },
  { id: "feelings", label: "感受", color: "pink" },
  { id: "work", label: "学习工作", color: "slate" },
  { id: "media", label: "媒体", color: "cyan" }
];

export const vocab = [
  {
    id: "v-annyeonghaseyo",
    level: "survival",
    category: "greetings",
    korean: "안녕하세요",
    romanization: "annyeonghaseyo",
    meaning: "你好",
    register: "礼貌通用",
    example: "안녕하세요, 저는 리나예요.",
    exampleMeaning: "你好，我是 Lina。",
    note: "最安全的通用问候。和亲近朋友可说 안녕。"
  },
  {
    id: "v-gamsahamnida",
    level: "survival",
    category: "greetings",
    korean: "감사합니다",
    romanization: "gamsahamnida",
    meaning: "谢谢",
    register: "正式礼貌",
    example: "도와주셔서 감사합니다.",
    exampleMeaning: "谢谢您帮我。",
    note: "고마워요 更柔和日常；고마워 用于熟人。"
  },
  {
    id: "v-joesonghamnida",
    level: "survival",
    category: "greetings",
    korean: "죄송합니다",
    romanization: "joesonghamnida",
    meaning: "对不起；抱歉",
    register: "正式礼貌",
    example: "늦어서 죄송합니다.",
    exampleMeaning: "我迟到了，很抱歉。",
    note: "미안해요 更亲近，죄송합니다 更正式。"
  },
  {
    id: "v-jeo",
    level: "survival",
    category: "identity",
    korean: "저",
    romanization: "jeo",
    meaning: "我",
    register: "谦逊礼貌",
    example: "저는 중국 사람이에요.",
    exampleMeaning: "我是中国人。",
    note: "나 是非敬语的“我”。"
  },
  {
    id: "v-ireum",
    level: "survival",
    category: "identity",
    korean: "이름",
    romanization: "ireum",
    meaning: "名字",
    register: "中性",
    example: "이름이 뭐예요?",
    exampleMeaning: "你叫什么名字？",
    note: "询问陌生人时可用 성함이 어떻게 되세요? 更敬。"
  },
  {
    id: "v-mul",
    level: "survival",
    category: "food",
    korean: "물",
    romanization: "mul",
    meaning: "水",
    register: "中性",
    example: "물 한 잔 주세요.",
    exampleMeaning: "请给我一杯水。",
    note: "잔 是杯，병 是瓶。"
  },
  {
    id: "v-bap",
    level: "survival",
    category: "food",
    korean: "밥",
    romanization: "bap",
    meaning: "饭；餐",
    register: "中性",
    example: "밥 먹었어요?",
    exampleMeaning: "吃饭了吗？",
    note: "韩语寒暄常用，语气像关心对方。"
  },
  {
    id: "v-juseyo",
    level: "survival",
    category: "food",
    korean: "주세요",
    romanization: "juseyo",
    meaning: "请给我",
    register: "礼貌请求",
    example: "김밥 하나 주세요.",
    exampleMeaning: "请给我一个紫菜包饭。",
    note: "名词 + 주세요 是生存韩语的高频结构。"
  },
  {
    id: "v-eodi",
    level: "survival",
    category: "travel",
    korean: "어디",
    romanization: "eodi",
    meaning: "哪里",
    register: "中性",
    example: "화장실이 어디예요?",
    exampleMeaning: "洗手间在哪里？",
    note: "어디에 있어요? 强调位置存在。"
  },
  {
    id: "v-jigeum",
    level: "survival",
    category: "time",
    korean: "지금",
    romanization: "jigeum",
    meaning: "现在",
    register: "中性",
    example: "지금 시간이 있어요?",
    exampleMeaning: "你现在有时间吗？",
    note: "현재 更书面、正式。"
  },
  {
    id: "v-joayo",
    level: "survival",
    category: "feelings",
    korean: "좋아요",
    romanization: "joayo",
    meaning: "好；喜欢",
    register: "礼貌日常",
    example: "이 노래가 좋아요.",
    exampleMeaning: "我喜欢这首歌。",
    note: "主语常用 이/가，表达“某物让我觉得好”。"
  },
  {
    id: "v-sireo",
    level: "survival",
    category: "feelings",
    korean: "싫어요",
    romanization: "sireoyo",
    meaning: "不喜欢；讨厌",
    register: "礼貌日常",
    example: "매운 음식은 싫어요.",
    exampleMeaning: "我不喜欢辣的食物。",
    note: "语气直接，正式场合可缓和为 잘 못 먹어요。"
  },
  {
    id: "v-yeoyak",
    level: "daily",
    category: "travel",
    korean: "예약",
    romanization: "yeyak",
    meaning: "预约；预订",
    register: "中性",
    example: "예약을 확인하고 싶어요.",
    exampleMeaning: "我想确认预约。",
    note: "예약하다 是“预约/预订”。"
  },
  {
    id: "v-hoesa",
    level: "daily",
    category: "work",
    korean: "회사",
    romanization: "hoesa",
    meaning: "公司",
    register: "中性",
    example: "회사에 가야 해요.",
    exampleMeaning: "我得去公司。",
    note: "회사원 是公司职员。"
  },
  {
    id: "v-gongbu",
    level: "daily",
    category: "work",
    korean: "공부",
    romanization: "gongbu",
    meaning: "学习",
    register: "中性",
    example: "한국어를 매일 공부해요.",
    exampleMeaning: "我每天学习韩语。",
    note: "공부하다 是动词“学习”。"
  },
  {
    id: "v-saenggak",
    level: "daily",
    category: "feelings",
    korean: "생각",
    romanization: "saenggak",
    meaning: "想法；思考",
    register: "中性",
    example: "제 생각에는 괜찮아요.",
    exampleMeaning: "我觉得还可以。",
    note: "제 생각에는 是表达观点的柔和开头。"
  },
  {
    id: "v-bunwigi",
    level: "daily",
    category: "feelings",
    korean: "분위기",
    romanization: "bunwigi",
    meaning: "氛围；气氛",
    register: "中性",
    example: "이 카페는 분위기가 좋아요.",
    exampleMeaning: "这家咖啡馆氛围很好。",
    note: "常用于评价店、场合、团队气氛。"
  },
  {
    id: "v-yeonseup",
    level: "daily",
    category: "work",
    korean: "연습",
    romanization: "yeonseup",
    meaning: "练习",
    register: "中性",
    example: "발음 연습을 더 해야 해요.",
    exampleMeaning: "我需要多练发音。",
    note: "연습하다 是动词“练习”。"
  },
  {
    id: "v-sasil",
    level: "native",
    category: "media",
    korean: "사실",
    romanization: "sasil",
    meaning: "其实；事实",
    register: "中性",
    example: "사실 저도 그렇게 생각했어요.",
    exampleMeaning: "其实我也那么想过。",
    note: "口语中常用于铺垫真实想法。"
  },
  {
    id: "v-geureonikka",
    level: "native",
    category: "media",
    korean: "그러니까",
    romanization: "geureonikka",
    meaning: "所以；我是说",
    register: "口语连接",
    example: "그러니까 제 말은, 시간이 더 필요하다는 거예요.",
    exampleMeaning: "我的意思是，还需要更多时间。",
    note: "既能总结因果，也能修正表达。"
  },
  {
    id: "v-eojjeomyeon",
    level: "native",
    category: "feelings",
    korean: "어쩌면",
    romanization: "eojjeomyeon",
    meaning: "也许；说不定",
    register: "中性偏书面",
    example: "어쩌면 우리가 너무 빨리 판단했을지도 몰라요.",
    exampleMeaning: "也许我们判断得太快了。",
    note: "常和 -을지도 모르다 搭配表达不确定推测。"
  },
  {
    id: "v-daeche",
    level: "native",
    category: "media",
    korean: "도대체",
    romanization: "dodaeche",
    meaning: "到底；究竟",
    register: "强调",
    example: "도대체 무슨 일이 있었던 거예요?",
    exampleMeaning: "到底发生了什么事？",
    note: "情绪强度高，注意语境。"
  },
  {
    id: "v-gamjeong",
    level: "native",
    category: "feelings",
    korean: "감정",
    romanization: "gamjeong",
    meaning: "情感；情绪",
    register: "中性",
    example: "감정을 솔직하게 표현하는 게 어려워요.",
    exampleMeaning: "坦率表达情绪很难。",
    note: "기분 更偏当下心情。"
  },
  {
    id: "v-maengnak",
    level: "native",
    category: "media",
    korean: "맥락",
    romanization: "maengnak",
    meaning: "脉络；上下文",
    register: "书面/讨论",
    example: "이 표현은 맥락에 따라 달라져요.",
    exampleMeaning: "这个表达会随语境而变化。",
    note: "高级阅读和语用分析高频词。"
  }
].concat(extraVocab);
