import { extraNuanceSets } from "./extended-content.js";

export const nuanceSets = [
  {
    id: "n-thanks",
    title: "感谢的温度",
    level: "foundation",
    contrast: ["감사합니다", "고마워요", "고마워"],
    explanation: "감사합니다 正式安全；고마워요 柔和日常；고마워 用于亲近或下对上不合适。",
    examples: [
      { ko: "도와주셔서 감사합니다.", zh: "谢谢您帮助我。", register: "正式" },
      { ko: "선물 고마워요.", zh: "谢谢你的礼物。", register: "日常礼貌" },
      { ko: "고마워!", zh: "谢啦！", register: "亲近" }
    ]
  },
  {
    id: "n-sorry",
    title: "道歉的距离",
    level: "foundation",
    contrast: ["죄송합니다", "미안해요", "미안"],
    explanation: "죄송합니다 更正式、承担责任；미안해요 更有人情味；미안 用于朋友。",
    examples: [
      { ko: "불편을 드려 죄송합니다.", zh: "给您带来不便很抱歉。", register: "正式" },
      { ko: "늦어서 미안해요.", zh: "迟到了，不好意思。", register: "熟悉但礼貌" },
      { ko: "미안, 내가 착각했어.", zh: "抱歉，我搞错了。", register: "朋友" }
    ]
  },
  {
    id: "n-like",
    title: "좋아요 vs 좋아해요",
    level: "growth",
    contrast: ["좋아요", "좋아해요"],
    explanation: "좋아요 像“某物很好/合我意”；좋아해요 更主动地“喜欢某人/某物”。",
    examples: [
      { ko: "이 노래가 좋아요.", zh: "这首歌很好/我喜欢这首歌。", register: "自然评价" },
      { ko: "저는 이 가수를 좋아해요.", zh: "我喜欢这位歌手。", register: "主动偏好" }
    ]
  },
  {
    id: "n-softeners",
    title: "母语者的缓冲垫",
    level: "native",
    contrast: ["좀", "약간", "것 같아요", "아마"],
    explanation: "韩语自然对话常通过副词和推测结构降低冲突或绝对感。",
    examples: [
      { ko: "이건 좀 어려운 것 같아요.", zh: "这个好像有点难。", register: "柔和评价" },
      { ko: "아마 내일은 힘들 것 같아요.", zh: "明天可能不太行。", register: "委婉拒绝" }
    ]
  }
].concat(extraNuanceSets);
