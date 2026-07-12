import { extraPragmaticScenarios } from "./extended-content.js";

export const pragmaticScenarios = [
  {
    id: "p-first-meeting",
    level: "foundation",
    title: "第一次见面",
    goal: "礼貌介绍自己并接住对方的问题。",
    context: "陌生人、老师、同事或店员场景，默认使用 요 体或更正式表达。",
    lines: [
      { ko: "안녕하세요. 저는 리나예요.", zh: "你好，我是 Lina。", note: "安全开场。" },
      { ko: "만나서 반가워요.", zh: "很高兴见到你。", note: "见面固定句。" },
      { ko: "한국어를 조금 공부하고 있어요.", zh: "我正在学一点韩语。", note: "降低压力，也给对方语速提示。" }
    ],
    nativeMove: "如果听不懂，可以接：죄송한데, 천천히 말씀해 주시겠어요?"
  },
  {
    id: "p-cafe-order",
    level: "foundation",
    title: "咖啡店点单",
    goal: "完成点单、数量、冷热、外带。",
    context: "店员通常语速快，先抓关键词：뭐 드릴까요, 따뜻한/아이스, 포장。",
    lines: [
      { ko: "아이스 아메리카노 하나 주세요.", zh: "请给我一杯冰美式。", note: "名词 + 数量 + 주세요。" },
      { ko: "포장해 주세요.", zh: "请打包。", note: "外带高频。" },
      { ko: "카드로 계산할게요.", zh: "我刷卡结账。", note: "结账表达。" }
    ],
    nativeMove: "想更自然可说：아아 하나 포장 가능할까요? 其中 아아 是 아이스 아메리카노 的缩略。"
  },
  {
    id: "p-asking-directions",
    level: "foundation",
    title: "问路",
    goal: "询问地点、确认方向、表达感谢。",
    context: "对陌生人开口时用 실례지만 缓冲。",
    lines: [
      { ko: "실례지만, 지하철역이 어디예요?", zh: "不好意思，地铁站在哪里？", note: "실례지만 是礼貌开口。" },
      { ko: "여기서 멀어요?", zh: "从这里远吗？", note: "确认距离。" },
      { ko: "정말 감사합니다.", zh: "真的谢谢。", note: "结束对话。" }
    ],
    nativeMove: "听到 쭉 가세요 表示“一直走”，오른쪽/왼쪽 是右/左。"
  },
  {
    id: "p-soft-disagree",
    level: "growth",
    title: "柔和表达不同意见",
    goal: "不同意但不让对话变硬。",
    context: "韩语对话常用缓冲表达，尤其在工作、学习和不熟的人之间。",
    lines: [
      { ko: "그럴 수도 있는데, 저는 조금 다르게 생각해요.", zh: "也可能是那样，不过我想得稍微不一样。", note: "先承认可能性。" },
      { ko: "제 생각에는 이 방법이 더 좋을 것 같아요.", zh: "我觉得这个方法可能更好。", note: "것 같아요 降低断言。" },
      { ko: "한번 더 확인해 보면 어떨까요?", zh: "再确认一次怎么样？", note: "用提议替代命令。" }
    ],
    nativeMove: "避免直接说 아니요, 틀렸어요，除非关系和场景允许。"
  },
  {
    id: "p-media-reaction",
    level: "native",
    title: "看剧/综艺后的反应",
    goal: "像母语者一样表达情绪、反转和评价。",
    context: "媒体讨论常用夸张、语气副词和省略。",
    lines: [
      { ko: "와, 이 장면 진짜 소름 돋았어요.", zh: "哇，这一幕真的起鸡皮疙瘩。", note: "소름 돋다 表示震撼。" },
      { ko: "처음엔 별로였는데 갈수록 재밌더라고요.", zh: "一开始一般，但越看越有意思。", note: "-더라고요 表示亲身发现。" },
      { ko: "결말이 좀 아쉽긴 했어요.", zh: "结局确实有点可惜。", note: "긴 했어요 表示让步式评价。" }
    ],
    nativeMove: "진짜, 완전, 살짝, 좀 这些副词能调语气，但不要过量。"
  }
].concat(extraPragmaticScenarios);
