export const nuanceSets = [
  {
    id: "n-thanks",
    title: "感谢的温度",
    level: "foundation",
    contrast: [
      "감사합니다",
      "고마워요",
      "고마워"
    ],
    explanation: "감사합니다 正式安全；고마워요 柔和日常；고마워 用于亲近或下对上不合适。",
    examples: [
      {
        ko: "도와주셔서 감사합니다.",
        zh: "谢谢您帮助我。",
        register: "正式",
        distractors: ["朋友间命令", "客观事实说明", "非正式自言自语"]
      },
      {
        ko: "선물 고마워요.",
        zh: "谢谢你的礼物。",
        register: "日常礼貌"
      },
      {
        ko: "고마워!",
        zh: "谢啦！",
        register: "亲近"
      }
    ]
  },
  {
    id: "n-sorry",
    title: "道歉的距离",
    level: "foundation",
    contrast: [
      "죄송합니다",
      "미안해요",
      "미안"
    ],
    explanation: "죄송합니다 更正式、承担责任；미안해요 更有人情味；미안 用于朋友。",
    examples: [
      {
        ko: "불편을 드려 죄송합니다.",
        zh: "给您带来不便很抱歉。",
        register: "正式",
        distractors: ["朋友间玩笑", "直接命令", "中性事实报告"]
      },
      {
        ko: "늦어서 미안해요.",
        zh: "迟到了，不好意思。",
        register: "熟悉但礼貌"
      },
      {
        ko: "미안, 내가 착각했어.",
        zh: "抱歉，我搞错了。",
        register: "朋友"
      }
    ]
  },
  {
    id: "n-like",
    title: "좋아요 vs 좋아해요",
    level: "growth",
    contrast: [
      "좋아요",
      "좋아해요"
    ],
    explanation: "좋아요 像“某物很好/合我意”；좋아해요 更主动地“喜欢某人/某物”。",
    examples: [
      {
        ko: "이 노래가 좋아요.",
        zh: "这首歌很好/我喜欢这首歌。",
        register: "自然评价",
        distractors: ["主动偏好陈述", "正式道歉", "委婉拒绝"]
      },
      {
        ko: "저는 이 가수를 좋아해요.",
        zh: "我喜欢这位歌手。",
        register: "主动偏好"
      }
    ]
  },
  {
    id: "n-softeners",
    title: "母语者的缓冲垫",
    level: "native",
    contrast: [
      "좀",
      "약간",
      "것 같아요",
      "아마"
    ],
    explanation: "韩语自然对话常通过副词和推测结构降低冲突或绝对感。",
    examples: [
      {
        ko: "이건 좀 어려운 것 같아요.",
        zh: "这个好像有点难。",
        register: "柔和评价",
        distractors: ["直接命令", "确定事实报告", "正式致谢"]
      },
      {
        ko: "아마 내일은 힘들 것 같아요.",
        zh: "明天可能不太行。",
        register: "委婉拒绝"
      }
    ]
  },
  {
    id: "n-request-temperature",
    title: "주세요 / 부탁드려요 / 해 주세요",
    level: "foundation",
    contrast: [
      "주세요",
      "해 주세요",
      "부탁드려요"
    ],
    explanation: "주세요 可用于给东西或做动作；부탁드려요 更郑重，适合请求对方付出精力。",
    examples: [
      {
        ko: "물 주세요.",
        zh: "请给我水。",
        register: "点单",
        distractors: ["工作汇报", "书面论述", "朋友间道歉"]
      },
      {
        ko: "확인 부탁드려요.",
        zh: "麻烦您确认。",
        register: "工作礼貌"
      }
    ]
  },
  {
    id: "n-permission-politeness",
    title: "돼요? / 될까요? / 가능할까요?",
    level: "growth",
    contrast: [
      "돼요?",
      "될까요?",
      "가능할까요?"
    ],
    explanation: "돼요? 直接自然；될까요? 更柔和；가능할까요? 更像正式询问可行性。",
    examples: [
      {
        ko: "여기 앉아도 돼요?",
        zh: "这里可以坐吗？",
        register: "日常",
        distractors: ["正式公告", "命令禁止", "过去经历叙述"]
      },
      {
        ko: "내일로 미뤄도 될까요?",
        zh: "可以推到明天吗？",
        register: "柔和协商"
      }
    ]
  },
  {
    id: "n-because-register",
    title: "그래서 / -아서 / -기 때문에",
    level: "growth",
    contrast: [
      "그래서",
      "-아서/어서",
      "-기 때문에"
    ],
    explanation: "그래서 接结果；-아서/어서 自然连接原因；-기 때문에 解释感更强。",
    examples: [
      {
        ko: "바빠서 못 갔어요.",
        zh: "因为忙所以没去。",
        register: "自然口语",
        distractors: ["正式命令", "敬语称谓", "书面引用"]
      },
      {
        ko: "중요하기 때문에 다시 확인해요.",
        zh: "因为重要所以再确认。",
        register: "说明/论述"
      }
    ]
  },
  {
    id: "n-uncertainty",
    title: "아마 / 것 같아요 / -지도 몰라요",
    level: "native",
    contrast: [
      "아마",
      "것 같아요",
      "-지도 몰라요"
    ],
    explanation: "三者都能降低确定性；-지도 몰라요 更像开放可能性，常用于推测。",
    examples: [
      {
        ko: "아마 내일은 힘들 것 같아요.",
        zh: "明天可能不太行。",
        register: "委婉",
        distractors: ["确定断言", "直接命令", "正式致谢"]
      },
      {
        ko: "비가 올지도 몰라요.",
        zh: "说不定会下雨。",
        register: "可能性"
      }
    ]
  },
  {
    id: "n-disagree-distance",
    title: "아니요 / 그럴 수도 있는데 / 제 생각에는",
    level: "native",
    contrast: [
      "아니요",
      "그럴 수도 있는데",
      "제 생각에는"
    ],
    explanation: "直接否定清楚但硬；先承认可能性再表达观点，更适合维持对话。",
    examples: [
      {
        ko: "그럴 수도 있는데 저는 조금 다르게 생각해요.",
        zh: "也可能是那样，不过我想得稍微不同。",
        register: "柔和不同意",
        distractors: ["完全赞同", "直接命令", "正式道歉"]
      },
      {
        ko: "제 생각에는 이 방법이 좋아요.",
        zh: "在我看来这个方法好。",
        register: "个人观点"
      }
    ]
  },
  {
    id: "n-honorific-direction",
    title: "말하다 / 말씀하시다 / 말씀드리다",
    level: "native",
    contrast: [
      "말하다",
      "말씀하시다",
      "말씀드리다"
    ],
    explanation: "말씀하시다 尊敬说话的人；말씀드리다 是自己谦逊地向对方说。",
    examples: [
      {
        ko: "선생님이 말씀하셨어요.",
        zh: "老师说了。",
        register: "尊敬主语",
        distractors: ["谦逊自己", "朋友平语", "直接请求"]
      },
      {
        ko: "제가 다시 말씀드릴게요.",
        zh: "我再跟您说明。",
        register: "谦逊给对方"
      }
    ]
  },
  {
    id: "n-reaction-degree",
    title: "정말 / 진짜 / 완전 / 살짝",
    level: "native",
    contrast: [
      "정말",
      "진짜",
      "완전",
      "살짝"
    ],
    explanation: "정말 较稳，진짜 口语，완전 强度高，살짝 可柔化负面评价。",
    examples: [
      {
        ko: "완전 재밌었어요.",
        zh: "超级有趣。",
        register: "强口语",
        distractors: ["正式书面", "柔和负面评价", "敬语请求"]
      },
      {
        ko: "살짝 아쉬웠어요.",
        zh: "稍微有点可惜。",
        register: "柔和评价"
      }
    ]
  },
  {
    id: "n-written-spoken",
    title: "하지만 / 그런데 / 근데",
    level: "growth",
    contrast: [
      "하지만",
      "그런데",
      "근데"
    ],
    explanation: "하지만 清晰偏书面；그런데 自然转向；근데 是口语缩略。",
    examples: [
      {
        ko: "좋아요. 그런데 조금 비싸요.",
        zh: "不错，不过有点贵。",
        register: "自然转折",
        distractors: ["正式致谢", "直接命令", "无保留赞同"]
      },
      {
        ko: "근데 시간이 없어요.",
        zh: "不过没时间。",
        register: "口语"
      }
    ]
  }
];
