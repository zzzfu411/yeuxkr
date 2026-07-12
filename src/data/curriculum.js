import { extraLessons } from "./extended-content.js";

export const milestones = [
  {
    id: "m0",
    title: "文字与声音对齐",
    range: "Day 1-14",
    outcome: "能读写基础韩文字母、拼出音节、听出核心最小对立。",
    modules: ["hangul", "pronunciation", "starter-vocab"]
  },
  {
    id: "m1",
    title: "礼貌日常句",
    range: "Week 3-8",
    outcome: "能完成自我介绍、点餐、问路、表达需要和简单过去。",
    modules: ["particles", "yo-style", "survival-dialogues"]
  },
  {
    id: "m2",
    title: "连续表达",
    range: "Month 3-6",
    outcome: "能用连接词组织原因、转折、愿望、计划和经历。",
    modules: ["connectors", "daily-vocab", "listening-shadowing"]
  },
  {
    id: "m3",
    title: "真实材料入口",
    range: "Month 6-12",
    outcome: "能读懂慢速新闻、综艺片段和社交媒体短帖，并做复述。",
    modules: ["media", "nuance", "paragraph"]
  },
  {
    id: "m4",
    title: "母语者级语用",
    range: "Year 2+",
    outcome: "能根据关系、场合、语域和隐含态度调整表达。",
    modules: ["register", "discourse", "native-collocations"]
  }
];

export const lessons = [
  {
    id: "l01-hangul-map",
    order: 1,
    milestone: "m0",
    title: "韩文不是字母表，是拼块系统",
    subtitle: "理解辅音、元音、收音如何拼成一个音节块。",
    duration: 12,
    focus: ["script", "sound"],
    objectives: ["认识音节块结构", "区分竖元音和横元音布局", "会读 가/고/한"],
    teach: [
      {
        title: "拼块，不是字母排队",
        body: "韩文音节块通常由初声、中声、可选终声组成，一个块读一拍。",
        speak: "한",
        romanization: "han",
        examples: [{ ko: "한", zh: "ㅎ + ㅏ + ㄴ 压成一个块", note: "点击听整块发音" }]
      },
      {
        title: "元音决定布局",
        body: "竖元音如 ㅏ 放在辅音右侧，横元音如 ㅗ 放在辅音下方。",
        speak: "가, 고",
        examples: [
          { ko: "가", zh: "ㄱ + ㅏ，左右结构" },
          { ko: "고", zh: "ㄱ + ㅗ，上下结构" }
        ]
      },
      {
        title: "ㅇ 是占位符",
        body: "ㅇ 在音节开头不发音，只占初声的位置；在收音位置读 ng。",
        speak: "아, 강",
        examples: [
          { ko: "아", zh: "开头 ㅇ 不发音，只读 a" },
          { ko: "강", zh: "收音 ㅇ 读 ng（河）" }
        ]
      }
    ],
    drills: [
      { type: "choice", prompt: "가 的结构是什么？", answer: "ㄱ + ㅏ", choices: ["ㄱ + ㅏ", "ㄱ + ㅗ", "ㅇ + ㅏ", "ㅎ + ㅏ + ㄴ"], explain: "ㅏ 是竖元音，放在 ㄱ 右侧。" },
      { type: "choice", prompt: "한 的收音是哪一个？", answer: "ㄴ", choices: ["ㅎ", "ㅏ", "ㄴ", "ㅇ"], explain: "底部 ㄴ 是终声/收音。" },
      { type: "type", prompt: "输入 ㄱ + ㅗ 组成的音节", answer: "고", acceptable: ["고"], explain: "横元音 ㅗ 放在 ㄱ 下方，组成 고。" }
    ],
    unlocks: ["l02-vowels"]
  },
  {
    id: "l02-vowels",
    order: 2,
    milestone: "m0",
    title: "10 个基础元音",
    subtitle: "把 ㅏ/ㅓ、ㅗ/ㅜ、ㅡ/ㅣ 的口型差异先定住。",
    duration: 15,
    focus: ["sound"],
    objectives: ["读出基础元音", "知道 ㅓ 和 ㅗ 的差异", "避免把 ㅡ 读成中文儿化音"],
    teach: [
      {
        title: "开口方向",
        body: "ㅏ 是开口前方，ㅓ 更靠后且不圆唇。先听三遍再跟读。",
        speak: "아, 어",
        examples: [
          { ko: "아", zh: "a：口腔打开靠前" },
          { ko: "어", zh: "eo：更靠后，不圆唇" }
        ]
      },
      {
        title: "圆唇两兄弟",
        body: "ㅗ 与 ㅜ 都圆唇，但 ㅗ 更靠前，ㅜ 更靠后。",
        speak: "오, 우",
        examples: [
          { ko: "오", zh: "o：圆唇靠前" },
          { ko: "우", zh: "u：圆唇靠后" }
        ]
      },
      {
        title: "最容易读错的 ㅡ",
        body: "ㅡ 的嘴唇放松，舌位高，不要读成中文的“呃儿”。这个音值得单独练。",
        speak: "으",
        romanization: "eu",
        examples: [{ ko: "으", zh: "eu：嘴唇完全放松" }]
      }
    ],
    drills: [
      { type: "choice", prompt: "哪个元音需要圆唇？", answer: "ㅗ", choices: ["ㅏ", "ㅓ", "ㅗ", "ㅡ"], explain: "ㅗ 是圆唇元音。" },
      { type: "choice", prompt: "어 的元音是？", answer: "ㅓ", choices: ["ㅏ", "ㅓ", "ㅗ", "ㅜ"], explain: "어 由不发音的 ㅇ + ㅓ 组成。" },
      { type: "listen", prompt: "跟读 으，然后选择对应元音。", answer: "ㅡ", choices: ["ㅜ", "ㅡ", "ㅣ", "ㅓ"], speak: "으", explain: "으 的核心是 ㅡ。" }
    ],
    unlocks: ["l03-consonants"]
  },
  {
    id: "l03-consonants",
    order: 3,
    milestone: "m0",
    title: "基础辅音与发音力度",
    subtitle: "把 ㄱ/ㄷ/ㅂ/ㅈ 的松音性质和 ㄴ/ㄹ/ㅁ/ㅇ 稳住。",
    duration: 15,
    focus: ["sound", "script"],
    objectives: ["认识基础辅音", "理解词首松音不等于浊音", "会读 나/마/바/자"],
    teach: [
      {
        title: "松音随位置变化",
        body: "ㄱ ㄷ ㅂ ㅈ 在词首常听起来偏 k/t/p/ch，在元音之间更接近 g/d/b/j。",
        speak: "가구",
        examples: [{ ko: "가구", zh: "家具：第一个 ㄱ 偏 k，第二个偏 g" }]
      },
      {
        title: "ㄹ 的两幅面孔",
        body: "ㄹ 在元音之间像轻弹 r，在收音位置像 l。",
        speak: "라디오, 물",
        examples: [
          { ko: "라디오", zh: "收音机：元音间轻弹 r" },
          { ko: "물", zh: "水：收音位置读 l" }
        ]
      },
      {
        title: "别让罗马音接管",
        body: "不要用罗马音决定发音，要用韩文字母和位置决定。罗马音只是查找工具。",
        speak: "나, 마, 바, 자",
        examples: [{ ko: "나, 마, 바, 자", zh: "na / ma / ba / ja：跟读四个基础音节" }]
      }
    ],
    drills: [
      { type: "choice", prompt: "라디오 中 ㄹ 更接近什么？", answer: "轻弹 r", choices: ["轻弹 r", "强卷舌 r", "完全不发音", "m"], explain: "元音之间的 ㄹ 是轻弹音。" },
      { type: "choice", prompt: "아이 开头的 ㅇ 怎么读？", answer: "不发音", choices: ["ng", "不发音", "h", "g"], explain: "ㅇ 在音节开头是占位符。" },
      { type: "type", prompt: "输入“我”的韩语", answer: "나", acceptable: ["나"], explain: "나 是非敬语的我；礼貌自称常用 저。" }
    ],
    unlocks: ["l04-first-sentences"]
  },
  {
    id: "l04-first-sentences",
    order: 4,
    milestone: "m1",
    title: "第一组能用的句子",
    subtitle: "안녕하세요, 저는..., ...예요/이에요。",
    duration: 14,
    focus: ["sentence", "pragmatics"],
    objectives: ["会打招呼", "会介绍名字", "会用 이에요/예요"],
    teach: [
      {
        title: "最安全的问候",
        body: "안녕하세요 是最安全的通用问候，任何场合都不会失礼。",
        speak: "안녕하세요",
        romanization: "annyeonghaseyo",
        examples: [{ ko: "안녕하세요", zh: "你好（礼貌通用）" }]
      },
      {
        title: "一句完成自我介绍",
        body: "저는 + 名字 + 예요/이에요 可以完成自我介绍。",
        speak: "저는 리나예요",
        examples: [{ ko: "저는 리나예요.", zh: "我是 Lina。" }]
      },
      {
        title: "收音决定 예요 还是 이에요",
        body: "名字最后一个字有收音接 이에요，没有收音接 예요。注意 예 是复合元音 ㅖ。",
        speak: "리나예요, 민준이에요",
        examples: [
          { ko: "리나예요", zh: "리나 无收音 → 예요" },
          { ko: "민준이에요", zh: "민준 有收音 ㄴ → 이에요" }
        ]
      }
    ],
    drills: [
      { type: "choice", prompt: "리나 后面应接？", answer: "예요", choices: ["이에요", "예요", "입니다가", "은요"], explain: "리나 没有收音，所以用 예요。" },
      { type: "type", prompt: "补全：저는 민수___", answer: "예요", acceptable: ["예요"], explain: "민수 没有收音，用 예요。" },
      { type: "choice", prompt: "처음 만났을 때 가장 안전한 인사는？", answer: "안녕하세요", choices: ["안녕", "야", "안녕하세요", "뭐"], explain: "陌生或礼貌场景使用 안녕하세요。" }
    ],
    unlocks: ["l05-particles"]
  },
  {
    id: "l05-particles",
    order: 5,
    milestone: "m1",
    title: "은/는 与 이/가 的第一层直觉",
    subtitle: "不是死背“主语助词”，而是建立话题与焦点。",
    duration: 16,
    focus: ["grammar"],
    objectives: ["理解话题和新信息", "会说 저는 학생이에요", "会用 제가 回答“谁”"],
    teach: [
      {
        title: "은/는 把话题放上桌",
        body: "은/는 常把一个对象放到桌面上：关于它，我们来说点什么。",
        speak: "저는 학생이에요",
        examples: [{ ko: "저는 학생이에요.", zh: "（要说我了）我是学生。" }]
      },
      {
        title: "이/가 指出主体",
        body: "이/가 常指出句中真正发生状态或动作的主体，回答“谁/什么”。",
        speak: "제가 할게요",
        examples: [{ ko: "제가 할게요.", zh: "（问谁做？）我来做。" }]
      },
      {
        title: "靠真实句子建立直觉",
        body: "学习初期不要背规则清单，最重要的是在真实句子里建立话题 vs 焦点的直觉。",
        speak: "비가 와요",
        examples: [{ ko: "비가 와요.", zh: "下雨了（新信息用 가）。" }]
      }
    ],
    drills: [
      { type: "choice", prompt: "表达“我是学生”最自然的是？", answer: "저는 학생이에요.", choices: ["제가 학생이에요.", "저는 학생이에요.", "저를 학생이에요.", "저에 학생이에요."], explain: "自我介绍通常用 저는 设定话题。" },
      { type: "choice", prompt: "回答“누가 할 거예요?”可说？", answer: "제가 할게요.", choices: ["저는 할게요.", "제가 할게요.", "저를 할게요.", "저에 할게요."], explain: "누가 问“谁”，回答用 제가 强调主体。" }
    ],
    unlocks: ["l06-cafe"]
  },
  {
    id: "l06-cafe",
    order: 6,
    milestone: "m1",
    title: "咖啡店点单",
    subtitle: "名词 + 数量 + 주세요，把生存韩语跑通。",
    duration: 12,
    focus: ["vocab", "pragmatics"],
    objectives: ["会用 주세요", "会说数量 하나", "会表达外带"],
    teach: [
      "주세요 是请求“请给我”的核心表达。",
      "아이스 아메리카노 하나 주세요 是完整点单句。",
      "포장해 주세요 表示请打包。"
    ],
    drills: [
      { type: "type", prompt: "请给我一杯水：물 한 잔 ___", answer: "주세요", acceptable: ["주세요"], explain: "物品 + 数量 + 주세요。" },
      { type: "choice", prompt: "포장해 주세요 的意思是？", answer: "请打包", choices: ["请打包", "请加热", "请推荐", "请取消"], explain: "포장 是包装/外带。" },
      { type: "listen", prompt: "听并选择：아이스 아메리카노 하나 주세요", answer: "请给我一杯冰美式", choices: ["请给我一杯冰美式", "我想去地铁站", "我没有时间", "我不是学生"], speak: "아이스 아메리카노 하나 주세요", explain: "하나 주세요 是“给我一个/一杯”。" }
    ],
    unlocks: ["l07-location"]
  },
  {
    id: "l07-location",
    order: 7,
    milestone: "m1",
    title: "在哪里、去哪里、在哪里做",
    subtitle: "어디, 에, 에서。",
    duration: 14,
    focus: ["grammar", "travel"],
    objectives: ["会问洗手间在哪里", "区分 에 和 에서", "能确认距离"],
    teach: [
      "어디예요? 是询问位置的基本句。",
      "에 用于目的地或存在位置。",
      "에서 用于动作发生的地点。"
    ],
    drills: [
      { type: "choice", prompt: "학교___ 공부해요.", answer: "에서", choices: ["에", "에서", "을", "는"], explain: "学习这个动作发生在学校，用 에서。" },
      { type: "type", prompt: "洗手间在哪里？화장실이 ___?", answer: "어디예요", acceptable: ["어디예요", "어디에요"], explain: "标准写法是 어디예요。" },
      { type: "choice", prompt: "집에 있어요 中 에 表示？", answer: "存在位置", choices: ["动作发生地", "存在位置", "宾语", "对比"], explain: "있다 的位置常用 에。" }
    ],
    unlocks: ["l11-shopping-price"]
  },
  {
    id: "l08-past",
    order: 9,
    milestone: "m2",
    title: "昨天发生了什么",
    subtitle: "过去式 -았/었어요 和第一段复述。",
    duration: 18,
    focus: ["grammar", "sentence"],
    objectives: ["会构造过去式", "能说昨天做了什么", "开始连接两句经历"],
    teach: [
      "보다 过去式是 봤어요，먹다 是 먹었어요，하다 是 했어요。",
      "过去式不仅是考试语法，也是聊天中讲经历的入口。",
      "加上 어제, 친구랑, 집에서 可以让句子立刻变真实。"
    ],
    drills: [
      { type: "choice", prompt: "공부하다 的过去式是？", answer: "공부했어요", choices: ["공부하었어요", "공부했어요", "공부았어요", "공부해요었어요"], explain: "하다 变 했어요。" },
      { type: "type", prompt: "看了电影：영화를 ___", answer: "봤어요", acceptable: ["봤어요"], explain: "보다 -> 봤어요。" },
      { type: "choice", prompt: "맛있었어요 的意思是？", answer: "很好吃/曾经好吃", choices: ["正在吃", "很好吃/曾经好吃", "想吃", "不能吃"], explain: "있다 的过去是 있었어요。" }
    ],
    unlocks: ["l09-connectors"]
  },
  {
    id: "l09-connectors",
    order: 10,
    milestone: "m2",
    title: "把短句连成表达",
    subtitle: "-아서/어서, -지만, 그리고, 그런데。",
    duration: 18,
    focus: ["grammar", "discourse"],
    objectives: ["表达原因", "表达转折", "连接 3 句以上小段落"],
    teach: [
      "-아서/어서 可以表达自然原因或先后。",
      "-지만 表达虽然但是。",
      "그런데/근데 在口语中负责转向，比机械地说 하지만 更自然。"
    ],
    drills: [
      { type: "choice", prompt: "바빠서 못 갔어요 表示？", answer: "因为忙所以没去", choices: ["虽然忙但去了", "因为忙所以没去", "想忙", "正在忙"], explain: "-아서/어서 在这里表示原因。" },
      { type: "type", prompt: "虽然难但有意思：어렵___ 재미있어요.", answer: "지만", acceptable: ["지만"], explain: "-지만 表转折。" },
      { type: "choice", prompt: "更口语的“不过/话说回来”是？", answer: "근데", choices: ["그리고", "근데", "그래서", "또"], explain: "근데 是 그런데 的口语缩略。" }
    ],
    unlocks: ["l12-time-plans"]
  },
  {
    id: "l10-native-softeners",
    order: 27,
    milestone: "m4",
    title: "母语者不总是硬说结论",
    subtitle: "좀, 것 같아요, 아마, -긴 해요。",
    duration: 20,
    focus: ["native", "pragmatics"],
    objectives: ["柔和表达意见", "委婉拒绝", "做让步式评价"],
    teach: [
      "것 같아요 常把判断变成“我看来是这样”，减少压迫感。",
      "좀 既能表示一点，也能缓和负面评价。",
      "-긴 해요 表示承认一部分事实，为后续转折留空间。"
    ],
    drills: [
      { type: "choice", prompt: "最柔和的表达是哪句？", answer: "이건 좀 어려운 것 같아요.", choices: ["이건 틀렸어요.", "이건 좀 어려운 것 같아요.", "안 돼요.", "별로예요."], explain: "좀 + 것 같아요 同时缓冲。" },
      { type: "type", prompt: "补全：좋___ 한데, 조금 비싸요.", answer: "긴", acceptable: ["긴"], explain: "좋긴 한데 = 好是好，但是..." },
      { type: "choice", prompt: "아마 내일은 힘들 것 같아요 通常用于？", answer: "委婉表示明天不太行", choices: ["强烈命令", "委婉表示明天不太行", "确认已完成", "点餐"], explain: "아마 + 것 같아요 降低确定性。" }
    ],
    unlocks: ["l28-soft-refusal"]
  }
].concat(extraLessons).sort((a, b) => a.order - b.order);

export function getLessonById(id) {
  return lessons.find((lesson) => lesson.id === id);
}

// teach 条目支持两种形态（渐进迁移）：
//   "一句讲解文本"
//   { title?, body, speak?, romanization?, examples?: [{ ko, zh, note? }] }
export function normalizeTeachEntry(entry) {
  if (typeof entry === "string") return { body: entry };
  if (entry && typeof entry === "object" && typeof entry.body === "string") {
    return {
      title: typeof entry.title === "string" ? entry.title : undefined,
      body: entry.body,
      speak: typeof entry.speak === "string" && entry.speak.trim() ? entry.speak : undefined,
      romanization: typeof entry.romanization === "string" && entry.romanization.trim() ? entry.romanization : undefined,
      examples: Array.isArray(entry.examples)
        ? entry.examples.filter((example) => example && typeof example.ko === "string" && typeof example.zh === "string")
        : undefined
    };
  }
  return { body: String(entry ?? "") };
}

export const UNLOCK_SCORE = 65;

export function getLessonPrerequisites(lessonId) {
  const lesson = getLessonById(lessonId);
  if (!lesson || lesson.order === 1) return [];
  const direct = lessons.filter((item) => item.unlocks?.includes(lessonId)).sort((a, b) => a.order - b.order);
  if (direct.length) return direct;
  const previous = lessons.find((item) => item.order === lesson.order - 1);
  return previous ? [previous] : [];
}

export function isLessonMastered(lessonId, completedIds, scores = {}) {
  return completedIds.has(lessonId) && Number(scores[lessonId] ?? 0) >= UNLOCK_SCORE;
}

export function isLessonUnlocked(lessonId, completedIds, scores = {}) {
  const lesson = getLessonById(lessonId);
  if (!lesson) return false;
  if (lesson.order === 1) return true;
  return getLessonPrerequisites(lessonId).every((item) => isLessonMastered(item.id, completedIds, scores));
}

export function getNextLesson(completedIds, scores = {}) {
  return lessons.find((lesson) => !isLessonMastered(lesson.id, completedIds, scores) && isLessonUnlocked(lesson.id, completedIds, scores)) ?? null;
}
