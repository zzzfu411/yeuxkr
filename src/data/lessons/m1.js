export const m1Lessons = [
  {
    id: "l04-first-sentences",
    order: 7,
    milestone: "m1",
    title: "第一组能用的句子",
    subtitle: "안녕하세요, 저는..., ...예요/이에요。",
    duration: 14,
    focus: [
      "sentence",
      "pragmatics"
    ],
    objectives: [
      "会打招呼",
      "会介绍名字",
      "会用 이에요/예요"
    ],
    teach: [
      {
        title: "最安全的问候",
        body: "안녕하세요 是最安全的通用问候，任何场合都不会失礼。",
        speak: "안녕하세요",
        romanization: "annyeonghaseyo",
        examples: [
          {
            ko: "안녕하세요",
            zh: "你好（礼貌通用）"
          }
        ]
      },
      {
        title: "一句完成自我介绍",
        body: "저는 + 名字 + 예요/이에요 可以完成自我介绍。",
        speak: "저는 리나예요",
        examples: [
          {
            ko: "저는 리나예요.",
            zh: "我是 Lina。"
          }
        ]
      },
      {
        title: "收音决定 예요 还是 이에요",
        body: "名字最后一个字有收音接 이에요，没有收音接 예요。注意 예 是复合元音 ㅖ。",
        speak: "리나예요, 민준이에요",
        examples: [
          {
            ko: "리나예요",
            zh: "리나 无收音 → 예요"
          },
          {
            ko: "민준이에요",
            zh: "민준 有收音 ㄴ → 이에요"
          }
        ]
      }
    ],
    drills: [
      {
        type: "choice",
        prompt: "리나 后面应接？",
        answer: "예요",
        choices: [
          "이에요",
          "예요",
          "입니다가",
          "은요"
        ],
        explain: "리나 没有收音，所以用 예요。"
      },
      {
        type: "type",
        prompt: "补全：저는 민수___",
        answer: "예요",
        acceptable: [
          "예요"
        ],
        explain: "민수 没有收音，用 예요。"
      },
      {
        type: "choice",
        prompt: "처음 만났을 때 가장 안전한 인사는？",
        answer: "안녕하세요",
        choices: [
          "안녕",
          "야",
          "안녕하세요",
          "뭐"
        ],
        explain: "陌生或礼貌场景使用 안녕하세요。"
      }
    ],
    unlocks: [
      "l34-sound-changes",
      "l05-particles"
    ]
  },
  {
    id: "l34-sound-changes",
    order: 8,
    milestone: "m1",
    title: "字写一块，声音连起来",
    subtitle: "从连音、鼻音化和紧音化听懂最常见的韩语音变。",
    duration: 20,
    focus: ["sound", "listening", "script"],
    objectives: ["理解音变不改变拼写", "听出收音后的连音", "识别 감사합니다、학교 等高频实际读音"],
    teach: [
      { title: "拼写保留词形，读音照顾口腔", body: "韩语音变主要让相邻音节更容易连续说出。先保留正确拼写，再把实际声音作为整词一起记。", speak: "한국어", examples: [{ ko: "한국어", zh: "韩语；实际连读接近 한구거" }] },
      { title: "连音：收音移到 ㅇ 后", body: "前一音节有收音、后一音节以不发音的 ㅇ 开头时，收音会移过去充当初声。", speak: "물이, 한국어", examples: [{ ko: "물이", zh: "水 + 主语助词；听起来接近 무리" }, { ko: "한국어", zh: "听起来接近 한구거" }] },
      { title: "鼻音化：说起来更顺", body: "ㄱ/ㄷ/ㅂ 类收音遇到 ㄴ 或 ㅁ 时，常分别变成 ㅇ/ㄴ/ㅁ。감사합니다 中 합니다 接近 함니다。", speak: "감사합니다", examples: [{ ko: "감사합니다", zh: "谢谢；합니다 实际接近 함니다" }] },
      { title: "紧音化与送气化先认高频词", body: "학교 常听成 학꾜，축하 常听成 추카。初学先建立“写法和听感是一对”的词汇记忆。", speak: "학교, 축하해요", examples: [{ ko: "학교", zh: "学校；听感接近 학꾜" }, { ko: "축하해요", zh: "祝贺；축하 接近 추카" }] }
    ],
    drills: [
      { type: "choice", prompt: "물이 连读时更接近哪一个声音？", answer: "무리", choices: ["무리", "물리", "무니", "무미"], explain: "ㄹ 收音移到以 ㅇ 开头的 이 前，形成接近 무리 的声音。" },
      { type: "choice", prompt: "학교 常听起来更接近？", answer: "학꾜", choices: ["하교", "학꾜", "항교", "학교아"], explain: "ㄱ 收音后的 ㄱ 发生紧音化。" },
      { type: "listen", prompt: "听实际读音并选择正确拼写。", answer: "한국어", choices: ["한국어", "한구거", "한구어", "한국오"], speak: "한국어", explain: "实际连读接近 한구거，但规范拼写仍是 한국어。" },
      { type: "cloze", prompt: "补全连音后的听感。", clozeText: "옷이 → ___", answer: "오시", choices: ["오시", "옫이", "오치", "온니"], explain: "ㅅ 收音移到 이 前成为初声 ㅅ。" },
      { type: "type", prompt: "输入“谢谢”的规范韩语拼写。", answer: "감사합니다", acceptable: ["감사합니다"], explain: "虽然 합니다 常听成 함니다，拼写仍是 감사합니다。" },
      { type: "dictation", prompt: "听词语并写出规范拼写。", answer: "학교", acceptable: ["학교"], speak: "학교", explain: "听感虽接近 학꾜，规范拼写是 학교。" }
    ],
    unlocks: ["l05-particles"]
  },
  {
    id: "l05-particles",
    order: 9,
    milestone: "m1",
    title: "은/는 与 이/가 的第一层直觉",
    subtitle: "不是死背“主语助词”，而是建立话题与焦点。",
    duration: 16,
    focus: [
      "grammar"
    ],
    objectives: [
      "理解话题和新信息",
      "会说 저는 학생이에요",
      "会用 제가 回答“谁”"
    ],
    teach: [
      {
        title: "은/는 把话题放上桌",
        body: "은/는 常把一个对象放到桌面上：关于它，我们来说点什么。",
        speak: "저는 학생이에요",
        examples: [
          {
            ko: "저는 학생이에요.",
            zh: "（要说我了）我是学生。"
          }
        ]
      },
      {
        title: "이/가 指出主体",
        body: "이/가 常指出句中真正处于某种状态的主体，也用来回答“谁/什么”。",
        speak: "제가 학생이에요",
        examples: [
          {
            ko: "제가 학생이에요.",
            zh: "（问谁是学生？）我是学生。"
          }
        ]
      },
      {
        title: "靠真实句子建立直觉",
        body: "学习初期不要背规则清单，最重要的是在真实句子里建立话题 vs 焦点的直觉。",
        speak: "비가 와요",
        examples: [
          {
            ko: "비가 와요.",
            zh: "下雨了（新信息用 가）。"
          }
        ]
      }
    ],
    drills: [
      {
        type: "choice",
        prompt: "做一般自我介绍时，表达“我是学生”最自然的是？",
        answer: "저는 학생이에요.",
        choices: [
          "제가 학생이에요.",
          "저는 학생이에요.",
          "저를 학생이에요.",
          "저에 학생이에요."
        ],
        explain: "自我介绍通常用 저는 设定话题。"
      },
      {
        type: "choice",
        prompt: "回答“누가 학생이에요?”可说？",
        answer: "제가 학생이에요.",
        choices: [
          "저는 학생이에요.",
          "제가 학생이에요.",
          "저를 학생이에요.",
          "저에 학생이에요."
        ],
        explain: "누가 问“谁”，回答用 제가 指出新信息主体。"
      }
    ],
    unlocks: [
      "l35-negation",
      "l06-cafe"
    ]
  },
  {
    id: "l35-negation",
    order: 10,
    milestone: "m1",
    title: "不做、不会与没有",
    subtitle: "用 안、못、없어요 和 아니에요 说出四种基础否定。",
    duration: 18,
    focus: ["grammar", "sentence", "pragmatics"],
    objectives: ["区分 안 和 못", "正确使用 없어요 与 아니에요", "说出简短礼貌否定句"],
    teach: [
      { title: "안：选择不做或事实不成立", body: "안 放在动词或形容词前，表示“不……”。하다 类动词通常把 안 放在 하다 前：공부 안 해요。", speak: "오늘 안 가요", examples: [{ ko: "오늘 안 가요.", zh: "今天不去。" }, { ko: "공부 안 해요.", zh: "不学习。" }] },
      { title: "못：能力或条件不允许", body: "못 表示想做却不会、不能或条件不允许。不会说韩语可以说 한국어를 못 해요。", speak: "수영을 못 해요", examples: [{ ko: "수영을 못 해요.", zh: "我不会游泳。" }] },
      { title: "없어요：没有、不在", body: "있어요 的否定不是 안 있어요，而是 없어요，可表示没有某物或某人不在。", speak: "시간이 없어요", examples: [{ ko: "시간이 없어요.", zh: "没有时间。" }, { ko: "친구가 집에 없어요.", zh: "朋友不在家。" }] },
      { title: "아니에요：不是", body: "名词句的否定用 아니에요。학생이에요 的否定是 학생이 아니에요。", speak: "학생이 아니에요", examples: [{ ko: "저는 회사원이 아니에요.", zh: "我不是公司职员。" }] }
    ],
    drills: [
      { type: "choice", prompt: "表达“不会开车”最合适的是？", answer: "운전을 못 해요.", choices: ["운전을 못 해요.", "운전이 없어요.", "운전이 아니에요.", "운전을 주세요."], explain: "能力不足或不会做用 못。" },
      { type: "choice", prompt: "“我不是学生”应使用哪一句？", answer: "저는 학생이 아니에요.", choices: ["저는 학생이 아니에요.", "저는 학생이 없어요.", "저는 학생을 못 해요.", "저는 학생을 안 가요."], explain: "名词身份的否定用 아니에요。" },
      { type: "listen", prompt: "听句子并选择说话人缺少什么。", answer: "时间", choices: ["时间", "朋友", "咖啡", "钱"], speak: "시간이 없어요", explain: "시간이 없어요 表示没有时间。" },
      { type: "cloze", prompt: "补全能力否定。", clozeText: "한국어를 ___ 해요.", answer: "못", choices: ["못", "안", "없", "아니"], explain: "表示不会说韩语时用 못 해요。" },
      { type: "translate", prompt: "翻译成韩语：今天不去。", answer: "오늘 안 가요", acceptable: ["오늘 안 가요", "오늘 안 가요."], explain: "把 안 放在 가요 前。" },
      { type: "dictation", prompt: "听否定句并输入完整韩语。", answer: "커피를 안 마셔요", acceptable: ["커피를 안 마셔요", "커피를 안 마셔요."], speak: "커피를 안 마셔요", explain: "안 마셔요 表示不喝。" }
    ],
    unlocks: ["l36-yo-present"]
  },
  {
    id: "l36-yo-present",
    order: 11,
    milestone: "m1",
    title: "把动词变成礼貌现在时",
    subtitle: "掌握 -아요/어요/해요，并用 을/를 标记动作对象。",
    duration: 22,
    focus: ["grammar", "sentence"],
    objectives: ["从 다 形找到词干", "选择 -아요/어요/해요", "用 을/를 组成基础动作句"],
    teach: [
      { title: "先去掉词典形的 다", body: "韩语词典形以 다 结尾。去掉 다 得到词干：가다→가-，먹다→먹-，공부하다→공부하-。", speak: "가다, 먹다, 공부하다", examples: [{ ko: "먹다", zh: "吃；词干是 먹-" }] },
      { title: "ㅏ/ㅗ 后接 -아요", body: "词干最后元音是 ㅏ 或 ㅗ 时通常接 -아요，并会缩合：가다→가요，오다→와요。", speak: "가요, 와요", examples: [{ ko: "학교에 가요.", zh: "去学校。" }, { ko: "친구가 와요.", zh: "朋友来。" }] },
      { title: "其他元音接 -어요，하다 变 해요", body: "除 ㅏ/ㅗ 外通常接 -어요：먹다→먹어요，마시다→마셔요；하다 固定变成 해요。", speak: "먹어요, 마셔요, 공부해요", examples: [{ ko: "밥을 먹어요.", zh: "吃饭。" }] },
      { title: "을/를 标出动作对象", body: "对象名词有收音用 을，无收音用 를：밥을 먹어요，커피를 마셔요。", speak: "책을 읽어요, 커피를 마셔요", examples: [{ ko: "책을 읽어요.", zh: "读书。" }, { ko: "커피를 마셔요.", zh: "喝咖啡。" }] }
    ],
    drills: [
      { type: "choice", prompt: "먹다 的礼貌现在时是？", answer: "먹어요", choices: ["먹아요", "먹어요", "먹해요", "먹다요"], explain: "먹- 的最后元音不是 ㅏ/ㅗ，所以接 -어요。" },
      { type: "choice", prompt: "커피 后应接哪个宾语助词？", answer: "를", choices: ["을", "를", "은", "이"], explain: "커피 没有收音，宾语助词用 를。" },
      { type: "listen", prompt: "听句子并选择正在做的事。", answer: "读书", choices: ["读书", "喝咖啡", "去学校", "睡觉"], speak: "책을 읽어요", explain: "책을 읽어요 表示读书。" },
      { type: "cloze", prompt: "补全礼貌现在时。", clozeText: "공부하다 → 공부___", answer: "해요", choices: ["아요", "어요", "해요", "다요"], explain: "하다 活用为 해요。" },
      { type: "translate", prompt: "翻译成韩语：我喝水。", answer: "물을 마셔요", acceptable: ["물을 마셔요", "저는 물을 마셔요", "물을 마셔요."], explain: "물 有收音接 을，마시다 变 마셔요。" },
      { type: "dictation", prompt: "听基础动作句并输入完整韩语。", answer: "밥을 먹어요", acceptable: ["밥을 먹어요", "밥을 먹어요."], speak: "밥을 먹어요", explain: "밥 有收音接 을，먹다 变 먹어요。" }
    ],
    unlocks: ["l37-numbers-counters"]
  },
  {
    id: "l37-numbers-counters",
    order: 12,
    milestone: "m1",
    title: "两套数字与常用量词",
    subtitle: "用汉字词数字报金额号码，用固有词数字数人和物。",
    duration: 24,
    focus: ["vocab", "listening", "sentence"],
    objectives: ["读出 1–10 的两套数字", "为金额与数量选择正确数字", "掌握 한/두/세/네 + 量词"],
    teach: [
      { title: "汉字词数字很像中文", body: "일、이、삼、사、오、육、칠、팔、구、십 用于金额、日期、分钟、电话号码和楼层。", speak: "일, 이, 삼, 사, 오, 육, 칠, 팔, 구, 십", examples: [{ ko: "삼천 원", zh: "三千韩元" }, { ko: "오 분", zh: "五分钟" }] },
      { title: "固有词数字用来数", body: "하나、둘、셋、넷、다섯 等常与 개、명、잔、살 搭配，数物品、人数、杯数和年龄。", speak: "하나, 둘, 셋, 넷, 다섯", examples: [{ ko: "사람 세 명", zh: "三个人" }, { ko: "커피 두 잔", zh: "两杯咖啡" }] },
      { title: "量词前四个会缩短", body: "하나/둘/셋/넷 在量词前变成 한/두/세/네：한 개、두 명、세 잔、네 살。", speak: "한 개, 두 명, 세 잔, 네 살", examples: [{ ko: "사과 한 개", zh: "一个苹果" }, { ko: "학생 두 명", zh: "两名学生" }] },
      { title: "先看用途再选数字", body: "同一个“3”，三月用 삼월，三个用 세 개。看到 원、월、분 多选汉字词；看到 개、명、잔 多选固有词。", speak: "삼월, 세 개", examples: [{ ko: "삼월", zh: "三月；汉字词数字" }, { ko: "세 개", zh: "三个；固有词数字" }] }
    ],
    drills: [
      { type: "choice", prompt: "“三杯咖啡”中的“三”应说？", answer: "세", choices: ["삼", "세", "셋", "사"], explain: "잔 前使用固有词数字，셋 在量词前变 세。" },
      { type: "choice", prompt: "“三千韩元”应使用哪套数字？", answer: "汉字词数字", choices: ["汉字词数字", "固有词数字", "序数词", "不用数字"], explain: "金额使用汉字词数字。" },
      { type: "listen", prompt: "听数量并选择正确意思。", answer: "两个", choices: ["一个", "两个", "三个", "四个"], speak: "두 개", explain: "둘 在量词 개 前变为 두。" },
      { type: "cloze", prompt: "补全量词前的数字。", clozeText: "사과 ___ 개（四个苹果）", answer: "네", choices: ["사", "넷", "네", "너"], explain: "넷 在量词前变成 네。" },
      { type: "type", prompt: "输入“五千韩元”。", answer: "오천 원", acceptable: ["오천 원", "오천원"], explain: "金额用汉字词数字：오천 원。" },
      { type: "dictation", prompt: "听人数并输入韩语。", answer: "세 명", acceptable: ["세 명", "세명"], speak: "세 명", explain: "셋 在人数单位 명 前变成 세。" }
    ],
    unlocks: ["l06-cafe"]
  },
  {
    id: "l06-cafe",
    order: 13,
    milestone: "m1",
    title: "咖啡店点单",
    subtitle: "名词 + 数量 + 주세요，把生存韩语跑通。",
    duration: 12,
    focus: [
      "vocab",
      "pragmatics"
    ],
    objectives: [
      "会用 주세요",
      "会说数量 하나",
      "会表达外带"
    ],
    teach: [
      "주세요 是请求“请给我”的核心表达。",
      "아이스 아메리카노 하나 주세요 是完整点单句。",
      "포장해 주세요 表示请打包。"
    ],
    drills: [
      {
        type: "type",
        prompt: "请给我一杯水：물 한 잔 ___",
        answer: "주세요",
        acceptable: [
          "주세요"
        ],
        explain: "物品 + 数量 + 주세요。"
      },
      {
        type: "choice",
        prompt: "포장해 주세요 的意思是？",
        answer: "请打包",
        choices: [
          "请打包",
          "请加热",
          "请推荐",
          "请取消"
        ],
        explain: "포장 是包装/外带。"
      },
      {
        type: "listen",
        prompt: "听并选择：아이스 아메리카노 하나 주세요",
        answer: "请给我一杯冰美式",
        choices: [
          "请给我一杯冰美式",
          "我想去地铁站",
          "我没有时间",
          "我不是学生"
        ],
        speak: "아이스 아메리카노 하나 주세요",
        explain: "하나 주세요 是“给我一个/一杯”。"
      }
    ],
    unlocks: [
      "l07-location"
    ]
  },
  {
    id: "l07-location",
    order: 14,
    milestone: "m1",
    title: "在哪里、去哪里、在哪里做",
    subtitle: "어디, 에, 에서。",
    duration: 14,
    focus: [
      "grammar",
      "travel"
    ],
    objectives: [
      "会问洗手间在哪里",
      "区分 에 和 에서",
      "能确认距离"
    ],
    teach: [
      "어디예요? 是询问位置的基本句。",
      "에 用于目的地或存在位置。",
      "에서 用于动作发生的地点。"
    ],
    drills: [
      {
        type: "choice",
        prompt: "학교___ 공부해요.",
        answer: "에서",
        choices: [
          "에",
          "에서",
          "을",
          "는"
        ],
        explain: "学习这个动作发生在学校，用 에서。"
      },
      {
        type: "type",
        prompt: "洗手间在哪里？화장실이 ___?",
        answer: "어디예요",
        acceptable: ["어디예요"],
        explain: "标准写法是 어디예요。"
      },
      {
        type: "choice",
        prompt: "집에 있어요 中 에 表示？",
        answer: "存在位置",
        choices: [
          "动作发生地",
          "存在位置",
          "宾语",
          "对比"
        ],
        explain: "있다 的位置常用 에。"
      }
    ],
    unlocks: [
      "l38-time-date",
      "l11-shopping-price"
    ]
  },
  {
    id: "l38-time-date",
    order: 15,
    milestone: "m1",
    title: "几点、几号与星期几",
    subtitle: "混用两套数字表达钟点，用 에 安排具体时间。",
    duration: 22,
    focus: ["vocab", "grammar", "listening"],
    objectives: ["询问和回答时间", "表达年月日与星期", "用时间 + 에 说出行程"],
    teach: [
      { title: "小时用固有词，分钟用汉字词", body: "报时间时，시 前用 한/두/세 等固有词，분 前用 일/이/삼 等汉字词。", speak: "세 시 이십 분", examples: [{ ko: "세 시 이십 분", zh: "三点二十分" }, { ko: "일곱 시 반", zh: "七点半" }] },
      { title: "몇 시예요?：问几点", body: "询问当前或约定时间都可用 몇 시예요?；回答时直接说时间 + 이에요/예요。", speak: "지금 몇 시예요", examples: [{ ko: "지금 몇 시예요?", zh: "现在几点？" }, { ko: "두 시예요.", zh: "两点。" }] },
      { title: "日期全部用汉字词数字", body: "年、月、日用汉字词数字：이천이십육 년 칠월 십오 일。六月读 유월，十月读 시월。", speak: "칠월 십오 일", examples: [{ ko: "칠월 십오 일", zh: "7 月 15 日" }, { ko: "유월", zh: "六月；不读 육월" }] },
      { title: "时间点后加 에", body: "具体几点、星期几或日期后加 에，再接动作；오늘、내일 等词通常不加 에。", speak: "월요일 세 시에 만나요", examples: [{ ko: "월요일 세 시에 만나요.", zh: "星期一三点见。" }, { ko: "내일 만나요.", zh: "明天见；내일 后通常不加 에" }] }
    ],
    drills: [
      { type: "choice", prompt: "8 点 20 分应说？", answer: "여덟 시 이십 분", choices: ["팔 시 스무 분", "여덟 시 이십 분", "여덟 분 이십 시", "팔 분 이십 시"], explain: "小时用固有词 여덟，分钟用汉字词 이십。" },
      { type: "choice", prompt: "“星期三”是？", answer: "수요일", choices: ["월요일", "화요일", "수요일", "목요일"], explain: "수요일 表示星期三。" },
      { type: "listen", prompt: "听时间并选择正确答案。", answer: "三点半", choices: ["两点半", "三点", "三点半", "三点十分"], speak: "세 시 반", explain: "세 시 是三点，반 是半。" },
      { type: "cloze", prompt: "补全约定时间的助词。", clozeText: "금요일 두 시___ 만나요.", answer: "에", choices: ["에", "에서", "를", "보다"], explain: "具体时间点后用 에。" },
      { type: "translate", prompt: "翻译成韩语：星期一三点见。", answer: "월요일 세 시에 만나요", acceptable: ["월요일 세 시에 만나요", "월요일 세 시에 만나요."], explain: "星期和钟点后用 에，再接 만나요。" },
      { type: "dictation", prompt: "听日期并输入韩语。", answer: "칠월 십오 일", acceptable: ["칠월 십오 일", "칠월 십오일"], speak: "칠월 십오 일", explain: "月份和日期都使用汉字词数字。" }
    ],
    unlocks: ["l11-shopping-price"]
  },
  {
    id: "l11-shopping-price",
    order: 16,
    milestone: "m1",
    title: "购物、价格和数量",
    subtitle: "얼마예요, 개/병/잔, 더 주세요。",
    duration: 16,
    focus: [
      "vocab",
      "travel",
      "pragmatics"
    ],
    objectives: [
      "询问价格",
      "表达数量",
      "礼貌追加或更换"
    ],
    teach: [
      "얼마예요? 是最安全的价格问句，想更礼貌可说 얼마인가요?",
      "韩语数量常需要量词：한 개, 두 병, 세 잔。",
      "더 주세요 可以表示“请再给一点”，换货时要说 바꿔 주세요。"
    ],
    drills: [
      {
        type: "choice",
        prompt: "询问价格最自然的是？",
        answer: "얼마예요?",
        choices: [
          "어디예요?",
          "얼마예요?",
          "누구예요?",
          "왜요?"
        ],
        explain: "얼마 表示多少金额。"
      },
      {
        type: "type",
        prompt: "请再给一个：하나 더 ___",
        answer: "주세요",
        acceptable: [
          "주세요"
        ],
        explain: "数量 + 더 주세요 表示再来一个。"
      },
      {
        type: "choice",
        prompt: "두 병 的意思是？",
        answer: "两瓶",
        choices: [
          "两瓶",
          "两杯",
          "两个人",
          "两天"
        ],
        explain: "병 是瓶的量词。"
      }
    ],
    unlocks: [
      "l08-past"
    ]
  }
];
