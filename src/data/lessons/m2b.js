export const m2bLessons = [
  {
    id: "l15-comparison",
    order: 26,
    milestone: "m2",
    title: "比较、偏好和最喜欢",
    subtitle: "보다, 더, 제일, 좋아해요。",
    duration: 18,
    focus: [
      "grammar",
      "vocab",
      "native"
    ],
    objectives: [
      "比较两件事",
      "表达偏好",
      "避免 좋아요/좋아해요 混用"
    ],
    teach: [
      "A보다 B가 더 좋아요 表示“比起 A，B 更好/更喜欢 B”。",
      "제일 좋아해요 是“最喜欢”，对象常用 을/를 或 이/가。",
      "좋아요 偏评价，좋아해요 偏主动喜欢。"
    ],
    drills: [
      {
        type: "choice",
        prompt: "比咖啡更喜欢茶：커피___ 차가 더 좋아요.",
        answer: "보다",
        choices: [
          "보다",
          "에서",
          "까지",
          "처럼"
        ],
        explain: "A보다 B 表示比较基准。"
      },
      {
        type: "type",
        prompt: "最喜欢这个：이걸 제일 좋아___",
        answer: "해요",
        acceptable: [
          "해요"
        ],
        explain: "좋아하다 -> 좋아해요。"
      },
      {
        type: "choice",
        prompt: "이 노래가 좋아요 更接近？",
        answer: "这首歌不错/合我意",
        choices: [
          "这首歌不错/合我意",
          "我讨厌这首歌",
          "请给我这首歌",
          "这首歌在哪里"
        ],
        explain: "좋아요 可以是评价。"
      }
    ],
    unlocks: [
      "l45-desire-intent",
      "l16-because"
    ]
  },
  {
    id: "l45-desire-intent",
    order: 27,
    milestone: "m2",
    title: "想做、打算做与已经决定",
    subtitle: "区分 -고 싶어요、-(으)려고 해요 和 -기로 했어요。",
    duration: 22,
    focus: ["grammar", "sentence", "pragmatics"],
    objectives: ["表达自己的愿望", "说明近期意图", "说出已经确定的计划"],
    teach: [
      { title: "-고 싶어요：我想做", body: "动词词干后直接接 -고 싶어요，表达说话人自己的愿望。问对方时可说 뭐 하고 싶어요?。", speak: "한국에 가고 싶어요", examples: [{ ko: "한국에 가고 싶어요.", zh: "我想去韩国。" }, { ko: "뭐 먹고 싶어요?", zh: "你想吃什么？" }] },
      { title: "第三人称愿望要换表达", body: "直接陈述别人的内心时不用 -고 싶어요 下结论，常用 -고 싶어 해요 表示“看起来想……”。", speak: "민수는 여행하고 싶어 해요", examples: [{ ko: "민수는 여행하고 싶어 해요.", zh: "民洙想去旅行。" }] },
      { title: "-(으)려고 해요：正打算", body: "有收音接 -으려고，无收音接 -려고，表示已经形成意图、准备去做。", speak: "주말에 쉬려고 해요", examples: [{ ko: "주말에 쉬려고 해요.", zh: "周末打算休息。" }, { ko: "책을 읽으려고 해요.", zh: "打算读书。" }] },
      { title: "-기로 했어요：已经决定", body: "动词词干 + 기로 했어요 表示已作出决定，常用于约定或确定的安排。", speak: "내일 만나기로 했어요", examples: [{ ko: "내일 만나기로 했어요.", zh: "已经决定明天见面。" }] }
    ],
    drills: [
      { type: "choice", prompt: "单纯表达“想看电影”应选择？", answer: "영화를 보고 싶어요.", choices: ["영화를 보고 싶어요.", "영화를 봤어요.", "영화를 보지 마세요.", "영화가 아니에요."], explain: "动词词干 + 고 싶어요 表示自己的愿望。" },
      { type: "choice", prompt: "哪一句表示“已经决定明天见面”？", answer: "내일 만나기로 했어요.", choices: ["내일 만나고 싶어요.", "내일 만나기로 했어요.", "내일 만났어요.", "내일 만나지 않아요."], explain: "-기로 했어요 表示已经作出决定。" },
      { type: "listen", prompt: "听句子并选择说话人的周末计划。", answer: "休息", choices: ["休息", "工作", "购物", "运动"], speak: "주말에 쉬려고 해요", explain: "쉬려고 해요 表示打算休息。" },
      { type: "cloze", prompt: "补全愿望表达。", clozeText: "한국 음식을 먹___ 싶어요.", answer: "고", choices: ["고", "지만", "보다", "부터"], explain: "愿望结构是动词词干 + 고 싶어요。" },
      { type: "translate", prompt: "翻译成韩语：我打算读书。", answer: "책을 읽으려고 해요", acceptable: ["책을 읽으려고 해요", "책을 읽으려고 해요."], explain: "읽다 有收音，接 -으려고 해요。" },
      { type: "dictation", prompt: "听已确定的计划并输入完整韩语。", answer: "운동하기로 했어요", acceptable: ["운동하기로 했어요", "운동하기로 했어요."], speak: "운동하기로 했어요", explain: "운동하다 + 기로 했어요 表示已经决定运动。" }
    ],
    unlocks: ["l16-because"]
  },
  {
    id: "l16-because",
    order: 28,
    milestone: "m2",
    title: "把原因说清楚",
    subtitle: "-아서/어서, -기 때문에, 그래서。",
    duration: 18,
    focus: [
      "grammar",
      "discourse"
    ],
    objectives: [
      "表达自然原因",
      "表达正式原因",
      "避免中文式因为所以堆叠"
    ],
    completionTask: {
      kind: "paragraph",
      title: "先说原因再说结果",
      prompt: "用韩语写至少两句：一句用 -아서/어서 或 -기 때문에 说明原因，一句给出结果。不要把“因为所以”都堆在同一句里。",
      minSyllables: 20,
      minClauses: 2,
      markerGroups: [["아서", "어서", "해서", "와서", "때문에"], ["그래서", "못", "집에", "갔어요", "있었"]]
    },
    teach: [
      "-아서/어서 适合自然原因或先后动作。",
      "-기 때문에 更明确、书面，常用于解释和论述。",
      "그래서 是承接结果的连接词，不一定每句都要出现。"
    ],
    drills: [
      {
        type: "choice",
        prompt: "바빠서 못 갔어요 的原因是？",
        answer: "忙",
        choices: [
          "忙",
          "远",
          "贵",
          "冷"
        ],
        explain: "바쁘다 -> 바빠서。"
      },
      {
        type: "type",
        prompt: "因为下雨待在家：비가 ___ 집에 있었어요.（오다 + -아서）",
        answer: "와서",
        acceptable: [
          "와서"
        ],
        explain: "오다 + -아서 → 와서：ㅗ 与 아 缩合成 와，不能写成 오아서。"
      },
      {
        type: "choice",
        prompt: "-기 때문에 常用于？",
        answer: "更明确的原因说明",
        choices: [
          "更明确的原因说明",
          "数量单位",
          "请求许可",
          "道歉结尾"
        ],
        explain: "때문에 表示原因。"
      }
    ],
    unlocks: [
      "l43-adnominal",
      "l17-phone-message"
    ]
  },
  {
    id: "l43-adnominal",
    order: 29,
    milestone: "m2",
    title: "把一句话放到名词前",
    subtitle: "用 -는、-(으)ㄴ、-(으)ㄹ 修饰人、事、物。",
    duration: 24,
    focus: ["grammar", "sentence", "discourse"],
    objectives: ["识别韩语定语在名词前", "区分动作的现在过去将来定语", "用短定语描述人和物"],
    teach: [
      { title: "韩语修饰语放在名词前", body: "中文说“我昨天买的书”，韩语也把整段信息放在名词前：어제 산 책。先找最后的核心名词。", speak: "어제 산 책", examples: [{ ko: "어제 산 책", zh: "昨天买的书；核心名词是 책" }] },
      { title: "正在或经常做：-는", body: "动作动词修饰现在的人或物时，词干后接 -는：먹는 사람、공부하는 학생。", speak: "한국어를 공부하는 학생", examples: [{ ko: "한국어를 공부하는 학생", zh: "学习韩语的学生" }, { ko: "제가 자주 먹는 음식", zh: "我经常吃的食物" }] },
      { title: "已经做过：-(으)ㄴ", body: "过去动作有收音接 -은，无收音接 -ㄴ：먹은 음식、본 영화、산 책。", speak: "어제 본 영화", examples: [{ ko: "어제 본 영화", zh: "昨天看的电影" }, { ko: "친구가 만든 케이크", zh: "朋友做的蛋糕" }] },
      { title: "将要做：-(으)ㄹ", body: "未来或预定动作有收音接 -을，无收音接 -ㄹ：먹을 음식、갈 곳、만날 사람。", speak: "내일 만날 사람", examples: [{ ko: "내일 만날 사람", zh: "明天要见的人" }, { ko: "주말에 갈 곳", zh: "周末要去的地方" }] }
    ],
    drills: [
      { type: "choice", prompt: "“正在学习韩语的学生”应选择？", answer: "한국어를 공부하는 학생", choices: ["한국어를 공부하는 학생", "한국어를 공부한 학생", "한국어를 공부할 학생", "한국어가 학생"], explain: "当前或经常发生的动作修饰名词时用 -는。" },
      { type: "choice", prompt: "어제 산 책 的意思是？", answer: "昨天买的书", choices: ["昨天买的书", "明天要买的书", "正在读的书", "卖书的人"], explain: "산 是 사다 的过去定语形。" },
      { type: "listen", prompt: "听短语并选择时间关系。", answer: "明天要见", choices: ["昨天见过", "现在正见", "明天要见", "不想见"], speak: "내일 만날 사람", explain: "만날 使用未来定语形，내일 表示明天。" },
      { type: "cloze", prompt: "补全现在动作定语。", clozeText: "제가 자주 먹___ 음식", answer: "는", choices: ["는", "은", "을", "고"], explain: "经常吃是现在习惯动作，用 먹는。" },
      { type: "translate", prompt: "翻译成韩语：昨天看的电影。", answer: "어제 본 영화", acceptable: ["어제 본 영화"], explain: "보다 的过去定语形是 본。" },
      { type: "dictation", prompt: "听短语并输入完整韩语。", answer: "주말에 갈 곳", acceptable: ["주말에 갈 곳"], speak: "주말에 갈 곳", explain: "갈 是 가다 的未来定语形，곳 表示地方。" }
    ],
    unlocks: ["l17-phone-message"]
  },
  {
    id: "l17-phone-message",
    order: 30,
    milestone: "m2",
    title: "电话、留言和确认",
    subtitle: "여보세요, 다시 말씀해 주세요, 문자。",
    duration: 16,
    focus: [
      "listening",
      "pragmatics",
      "vocab"
    ],
    objectives: [
      "接电话",
      "请求重复",
      "确认信息"
    ],
    teach: [
      "여보세요 是接电话常用开场。",
      "다시 말씀해 주세요 能礼貌请求对方再说一遍。",
      "문자로 보내 주세요 可以把听不清的信息转成文字。"
    ],
    drills: [
      {
        type: "choice",
        prompt: "接电话第一句常说？",
        answer: "여보세요",
        choices: [
          "여보세요",
          "얼마예요",
          "어디예요",
          "맛있어요"
        ],
        explain: "여보세요 用于电话开场。"
      },
      {
        type: "type",
        prompt: "请再说一遍：다시 말씀해 ___",
        answer: "주세요",
        acceptable: [
          "주세요"
        ],
        explain: "礼貌请求用 주세요。"
      },
      {
        type: "choice",
        prompt: "문자로 보내 주세요 的意思是？",
        answer: "请用短信发给我",
        choices: [
          "请用短信发给我",
          "请换成咖啡",
          "请不要说",
          "请打包"
        ],
        explain: "문자 是短信/文字消息。"
      }
    ],
    unlocks: [
      "l18-health"
    ]
  },
  {
    id: "l18-health",
    order: 31,
    milestone: "m2",
    title: "身体不舒服和药店",
    subtitle: "아파요, 약국, 증상 설명。",
    duration: 18,
    focus: [
      "vocab",
      "pragmatics",
      "sentence"
    ],
    objectives: [
      "描述症状",
      "在药店求助",
      "表达持续时间"
    ],
    teach: [
      "머리가 아파요, 목이 아파요 可以描述具体部位疼。",
      "약국이 어디예요? 是寻找药店的直接问法。",
      "어제부터 表示从昨天开始，有助于描述病程。"
    ],
    drills: [
      {
        type: "choice",
        prompt: "头疼是？",
        answer: "머리가 아파요.",
        choices: [
          "머리가 아파요.",
          "물이 없어요.",
          "학교에 가요.",
          "커피가 좋아요."
        ],
        explain: "머리 + 가 아파요。"
      },
      {
        type: "type",
        prompt: "药店在哪里？약국이 ___?",
        answer: "어디예요",
        acceptable: ["어디예요"],
        explain: "地点询问用 어디예요。"
      },
      {
        type: "choice",
        prompt: "어제부터 的意思是？",
        answer: "从昨天开始",
        choices: [
          "从昨天开始",
          "到明天为止",
          "现在马上",
          "一点也不"
        ],
        explain: "부터 表示起点。"
      }
    ],
    unlocks: [
      "l19-family-honorific"
    ]
  },
  {
    id: "l19-family-honorific",
    order: 32,
    milestone: "m2",
    title: "家人、关系和敬语入口",
    subtitle: "가족, 부모님, -(으)세요。",
    duration: 20,
    focus: [
      "grammar",
      "pragmatics",
      "native"
    ],
    objectives: [
      "介绍家庭关系",
      "识别基础敬语",
      "理解上下关系影响表达"
    ],
    teach: [
      "부모님 的 님 已经带敬意，常用于自己的父母也可使用。",
      "-(으)세요 可以表示尊敬或礼貌请求。",
      "韩语关系表达常先判断年龄、亲疏和场合。"
    ],
    drills: [
      {
        type: "choice",
        prompt: "请坐的礼貌说法是？",
        answer: "앉으세요.",
        choices: [
          "앉으세요.",
          "앉았어요.",
          "앉고 있어요.",
          "앉지 마세요."
        ],
        explain: "-으세요 可作礼貌请求。"
      },
      {
        type: "type",
        prompt: "父母：부모___",
        answer: "님",
        acceptable: [
          "님"
        ],
        explain: "부모님 是带敬意的表达。"
      },
      {
        type: "choice",
        prompt: "-세요 常带有什么功能？",
        answer: "尊敬或礼貌请求",
        choices: [
          "尊敬或礼貌请求",
          "过去式",
          "比较",
          "数量"
        ],
        explain: "-시- 是敬语核心之一。"
      }
    ],
    unlocks: [
      "l20-invitation"
    ]
  },
  {
    id: "l20-invitation",
    order: 33,
    milestone: "m2",
    title: "邀请、约时间和婉转",
    subtitle: "같이, 시간 괜찮아요?, -(으)ㄹ래요?",
    duration: 20,
    focus: [
      "pragmatics",
      "grammar",
      "sentence"
    ],
    objectives: [
      "发出邀请",
      "确认对方时间",
      "用缓冲降低压力"
    ],
    completionTask: {
      kind: "paragraph",
      title: "发出邀请或改期",
      prompt: "用韩语写至少两句：邀请对方做一件事，或先问时间是否方便。必须出现 같이 或 -ㄹ래요/-을래요。",
      minSyllables: 18,
      minClauses: 2,
      markerGroups: [["같이", "래요", "괜찮"]]
    },
    teach: [
      "같이 가실래요? 比 같이 가요 更像邀请和询问意愿。",
      "시간 괜찮으세요? 是确认对方是否方便。",
      "如果拒绝，可先感谢再给原因：미안해요, 그날은 약속이 있어요。"
    ],
    drills: [
      {
        type: "choice",
        prompt: "一起去吗？更柔和可说？",
        answer: "같이 가실래요?",
        choices: [
          "같이 가실래요?",
          "같이 갔어요.",
          "같이 가지 마세요.",
          "같이 있어요."
        ],
        explain: "-실래요? 询问意愿。"
      },
      {
        type: "type",
        prompt: "时间方便吗？시간 괜찮___?",
        answer: "으세요",
        acceptable: [
          "으세요"
        ],
        explain: "괜찮다 + 으세요。"
      },
      {
        type: "choice",
        prompt: "그날은 약속이 있어요 通常用于？",
        answer: "说明那天已有约",
        choices: [
          "说明那天已有约",
          "询问价格",
          "点一杯咖啡",
          "表达最喜欢"
        ],
        explain: "약속 是约定/预约。"
      }
    ],
    unlocks: [
      "l44-passive-causative",
      "l21-slow-news"
    ]
  }
];
