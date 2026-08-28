import { allVocab } from "./vocab/index.js";

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
  { id: "media", label: "媒体", color: "cyan" },
  { id: "numbers", label: "数字量词", color: "amber" },
  { id: "home", label: "居家", color: "lime" },
  { id: "health", label: "身体健康", color: "rose" },
  { id: "shopping", label: "购物金钱", color: "teal" },
  { id: "places", label: "场所", color: "indigo" },
  { id: "verbs", label: "核心动词", color: "emerald" },
  { id: "adjectives", label: "核心形容词", color: "sky" },
  { id: "social", label: "社交关系", color: "fuchsia" }
];

export const vocab = allVocab;
