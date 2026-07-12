export const extraLessons = [
  {
    id: "l11-shopping-price",
    order: 8,
    milestone: "m1",
    title: "购物、价格和数量",
    subtitle: "얼마예요, 개/병/잔, 더 주세요。",
    duration: 16,
    focus: ["vocab", "travel", "pragmatics"],
    objectives: ["询问价格", "表达数量", "礼貌追加或更换"],
    teach: [
      "얼마예요? 是最安全的价格问句，想更礼貌可说 얼마인가요?",
      "韩语数量常需要量词：한 개, 두 병, 세 잔。",
      "더 주세요 可以表示“请再给一点”，换货时要说 바꿔 주세요。"
    ],
    drills: [
      { type: "choice", prompt: "询问价格最自然的是？", answer: "얼마예요?", choices: ["어디예요?", "얼마예요?", "누구예요?", "왜요?"], explain: "얼마 表示多少金额。" },
      { type: "type", prompt: "请再给一个：하나 더 ___", answer: "주세요", acceptable: ["주세요"], explain: "数量 + 더 주세요 表示再来一个。" },
      { type: "choice", prompt: "두 병 的意思是？", answer: "两瓶", choices: ["两瓶", "两杯", "两个人", "两天"], explain: "병 是瓶的量词。" }
    ],
    unlocks: ["l08-past"]
  },
  {
    id: "l12-time-plans",
    order: 11,
    milestone: "m2",
    title: "时间、计划和将来",
    subtitle: "오늘/내일/주말 + -(으)ㄹ 거예요。",
    duration: 18,
    focus: ["grammar", "time", "sentence"],
    objectives: ["说今天和明天的安排", "表达将来计划", "用时间词组织句子"],
    teach: [
      "动词词干接 -(으)ㄹ 거예요 表示打算或预测。",
      "时间词通常放在句首或主题后：내일 친구를 만날 거예요。",
      "有收音接 을 거예요，无收音接 ㄹ 거예요。"
    ],
    drills: [
      { type: "choice", prompt: "가다 的将来计划是？", answer: "갈 거예요", choices: ["가을 거예요", "갈 거예요", "갔어요", "가고 있어요"], explain: "가다 无收音，接 ㄹ 거예요。" },
      { type: "type", prompt: "明天见朋友：내일 친구를 만___ 거예요.", answer: "날", acceptable: ["날"], explain: "만나다 -> 만날 거예요。" },
      { type: "choice", prompt: "주말에 공부할 거예요 的意思是？", answer: "周末会学习", choices: ["周末会学习", "昨天学习了", "正在学习", "不想学习"], explain: "-ㄹ 거예요 表示将来。" }
    ],
    unlocks: ["l13-permission"]
  },
  {
    id: "l13-permission",
    order: 12,
    milestone: "m2",
    title: "许可、禁止和请求",
    subtitle: "-아/어도 돼요, -지 마세요, 부탁드려요。",
    duration: 18,
    focus: ["grammar", "pragmatics"],
    objectives: ["询问是否可以", "礼貌禁止", "提出不过分的请求"],
    teach: [
      "-아/어도 돼요? 表示“可以……吗”。",
      "-지 마세요 是礼貌禁止，比直接 안 돼요 更像提示。",
      "부탁드려요 比 부탁해요 更郑重，适合工作或陌生场景。"
    ],
    drills: [
      { type: "choice", prompt: "可以拍照吗？", answer: "사진 찍어도 돼요?", choices: ["사진 찍어도 돼요?", "사진 찍지 마세요.", "사진이 있어요?", "사진이에요?"], explain: "-아/어도 돼요? 用于请求许可。" },
      { type: "type", prompt: "请不要说：말하___ 마세요.", answer: "지", acceptable: ["지"], explain: "动词词干 + 지 마세요。" },
      { type: "choice", prompt: "조금만 기다려 주세요 的语气是？", answer: "礼貌请求", choices: ["强烈命令", "礼貌请求", "过去经历", "自我介绍"], explain: "주세요 可把要求变成请求。" }
    ],
    unlocks: ["l14-progressive"]
  },
  {
    id: "l14-progressive",
    order: 13,
    milestone: "m2",
    title: "正在做什么",
    subtitle: "-고 있어요 与状态表达。",
    duration: 16,
    focus: ["grammar", "sentence"],
    objectives: ["表达正在进行", "区分动作和状态", "讲当前学习状态"],
    teach: [
      "-고 있어요 表示动作正在进行，也能表示穿戴等结果状态。",
      "공부하고 있어요 是“正在学习”，알고 있어요 是“知道着/已经知道”。",
      "与时间词 지금 连用可以明确当前时刻。"
    ],
    drills: [
      { type: "choice", prompt: "正在吃饭是？", answer: "밥을 먹고 있어요.", choices: ["밥을 먹었어요.", "밥을 먹고 있어요.", "밥을 먹을 거예요.", "밥이 없어요."], explain: "-고 있어요 表示正在进行。" },
      { type: "type", prompt: "正在学韩语：한국어를 공부하___ 있어요.", answer: "고", acceptable: ["고"], explain: "공부하다 -> 공부하고 있어요。" },
      { type: "choice", prompt: "지금 뭐 하고 있어요? 在问什么？", answer: "现在正在做什么", choices: ["昨天做了什么", "现在正在做什么", "明天做什么", "在哪里买"], explain: "지금 + -고 있어요 指当前动作。" }
    ],
    unlocks: ["l15-comparison"]
  },
  {
    id: "l15-comparison",
    order: 14,
    milestone: "m2",
    title: "比较、偏好和最喜欢",
    subtitle: "보다, 더, 제일, 좋아해요。",
    duration: 18,
    focus: ["grammar", "vocab", "native"],
    objectives: ["比较两件事", "表达偏好", "避免 좋아요/좋아해요 混用"],
    teach: [
      "A보다 B가 더 좋아요 表示“比起 A，B 更好/更喜欢 B”。",
      "제일 좋아해요 是“最喜欢”，对象常用 을/를 或 이/가。",
      "좋아요 偏评价，좋아해요 偏主动喜欢。"
    ],
    drills: [
      { type: "choice", prompt: "比咖啡更喜欢茶：커피___ 차가 더 좋아요.", answer: "보다", choices: ["보다", "에서", "까지", "처럼"], explain: "A보다 B 表示比较基准。" },
      { type: "type", prompt: "最喜欢这个：이걸 제일 좋아___", answer: "해요", acceptable: ["해요"], explain: "좋아하다 -> 좋아해요。" },
      { type: "choice", prompt: "이 노래가 좋아요 更接近？", answer: "这首歌不错/合我意", choices: ["这首歌不错/合我意", "我讨厌这首歌", "请给我这首歌", "这首歌在哪里"], explain: "좋아요 可以是评价。"}
    ],
    unlocks: ["l16-because"]
  },
  {
    id: "l16-because",
    order: 15,
    milestone: "m2",
    title: "把原因说清楚",
    subtitle: "-아서/어서, -기 때문에, 그래서。",
    duration: 18,
    focus: ["grammar", "discourse"],
    objectives: ["表达自然原因", "表达正式原因", "避免中文式因为所以堆叠"],
    teach: [
      "-아서/어서 适合自然原因或先后动作。",
      "-기 때문에 更明确、书面，常用于解释和论述。",
      "그래서 是承接结果的连接词，不一定每句都要出现。"
    ],
    drills: [
      { type: "choice", prompt: "바빠서 못 갔어요 的原因是？", answer: "忙", choices: ["忙", "远", "贵", "冷"], explain: "바쁘다 -> 바빠서。" },
      { type: "type", prompt: "因为下雨：비가 오___ 집에 있었어요.", answer: "아서", acceptable: ["아서"], explain: "오다 -> 와서，但题干保留 오，需要写 아서 作结构识别。" },
      { type: "choice", prompt: "-기 때문에 常用于？", answer: "更明确的原因说明", choices: ["更明确的原因说明", "数量单位", "请求许可", "道歉结尾"], explain: "때문에 表示原因。"}
    ],
    unlocks: ["l17-phone-message"]
  },
  {
    id: "l17-phone-message",
    order: 16,
    milestone: "m2",
    title: "电话、留言和确认",
    subtitle: "여보세요, 다시 말씀해 주세요, 문자。",
    duration: 16,
    focus: ["listening", "pragmatics", "vocab"],
    objectives: ["接电话", "请求重复", "确认信息"],
    teach: [
      "여보세요 是接电话常用开场。",
      "다시 말씀해 주세요 能礼貌请求对方再说一遍。",
      "문자로 보내 주세요 可以把听不清的信息转成文字。"
    ],
    drills: [
      { type: "choice", prompt: "接电话第一句常说？", answer: "여보세요", choices: ["여보세요", "얼마예요", "어디예요", "맛있어요"], explain: "여보세요 用于电话开场。" },
      { type: "type", prompt: "请再说一遍：다시 말씀해 ___", answer: "주세요", acceptable: ["주세요"], explain: "礼貌请求用 주세요。" },
      { type: "choice", prompt: "문자로 보내 주세요 的意思是？", answer: "请用短信发给我", choices: ["请用短信发给我", "请换成咖啡", "请不要说", "请打包"], explain: "문자 是短信/文字消息。"}
    ],
    unlocks: ["l18-health"]
  },
  {
    id: "l18-health",
    order: 17,
    milestone: "m2",
    title: "身体不舒服和药店",
    subtitle: "아파요, 약국, 증상 설명。",
    duration: 18,
    focus: ["vocab", "pragmatics", "sentence"],
    objectives: ["描述症状", "在药店求助", "表达持续时间"],
    teach: [
      "머리가 아파요, 목이 아파요 可以描述具体部位疼。",
      "약국이 어디예요? 是寻找药店的直接问法。",
      "어제부터 表示从昨天开始，有助于描述病程。"
    ],
    drills: [
      { type: "choice", prompt: "头疼是？", answer: "머리가 아파요.", choices: ["머리가 아파요.", "물이 없어요.", "학교에 가요.", "커피가 좋아요."], explain: "머리 + 가 아파요。" },
      { type: "type", prompt: "药店在哪里？약국이 ___?", answer: "어디예요", acceptable: ["어디예요", "어디에요"], explain: "地点询问用 어디예요。" },
      { type: "choice", prompt: "어제부터 的意思是？", answer: "从昨天开始", choices: ["从昨天开始", "到明天为止", "现在马上", "一点也不"], explain: "부터 表示起点。"}
    ],
    unlocks: ["l19-family-honorific"]
  },
  {
    id: "l19-family-honorific",
    order: 18,
    milestone: "m2",
    title: "家人、关系和敬语入口",
    subtitle: "가족, 부모님, -(으)세요。",
    duration: 20,
    focus: ["grammar", "pragmatics", "native"],
    objectives: ["介绍家庭关系", "识别基础敬语", "理解上下关系影响表达"],
    teach: [
      "부모님 的 님 已经带敬意，常用于自己的父母也可使用。",
      "-(으)세요 可以表示尊敬或礼貌请求。",
      "韩语关系表达常先判断年龄、亲疏和场合。"
    ],
    drills: [
      { type: "choice", prompt: "请坐的礼貌说法是？", answer: "앉으세요.", choices: ["앉으세요.", "앉았어요.", "앉고 있어요.", "앉지 마세요."], explain: "-으세요 可作礼貌请求。" },
      { type: "type", prompt: "父母：부모___", answer: "님", acceptable: ["님"], explain: "부모님 是带敬意的表达。" },
      { type: "choice", prompt: "-세요 常带有什么功能？", answer: "尊敬或礼貌请求", choices: ["尊敬或礼貌请求", "过去式", "比较", "数量"], explain: "-시- 是敬语核心之一。"}
    ],
    unlocks: ["l20-invitation"]
  },
  {
    id: "l20-invitation",
    order: 19,
    milestone: "m2",
    title: "邀请、约时间和婉转",
    subtitle: "같이, 시간 괜찮아요?, -(으)ㄹ래요?",
    duration: 20,
    focus: ["pragmatics", "grammar", "sentence"],
    objectives: ["发出邀请", "确认对方时间", "用缓冲降低压力"],
    teach: [
      "같이 가실래요? 比 같이 가요 更像邀请和询问意愿。",
      "시간 괜찮으세요? 是确认对方是否方便。",
      "如果拒绝，可先感谢再给原因：미안해요, 그날은 약속이 있어요。"
    ],
    drills: [
      { type: "choice", prompt: "一起去吗？更柔和可说？", answer: "같이 가실래요?", choices: ["같이 가실래요?", "같이 갔어요.", "같이 가지 마세요.", "같이 있어요."], explain: "-실래요? 询问意愿。" },
      { type: "type", prompt: "时间方便吗？시간 괜찮___?", answer: "으세요", acceptable: ["으세요"], explain: "괜찮다 + 으세요。" },
      { type: "choice", prompt: "그날은 약속이 있어요 通常用于？", answer: "说明那天已有约", choices: ["说明那天已有约", "询问价格", "点一杯咖啡", "表达最喜欢"], explain: "약속 是约定/预约。"}
    ],
    unlocks: ["l21-slow-news"]
  },
  {
    id: "l21-slow-news",
    order: 20,
    milestone: "m3",
    title: "慢速新闻入口",
    subtitle: "标题、主题词和第一段复述。",
    duration: 22,
    focus: ["media", "vocab", "grammar"],
    objectives: ["抓标题主题", "找出谁做了什么", "用 2 句中文或韩语复述"],
    teach: [
      "读新闻先找主题词、数字、地点和谓词，不要逐词翻译。",
      "기사 表示新闻报道，발표하다 表示发布/宣布。",
      "第一遍只问：누가, 어디서, 무엇을 했어요?"
    ],
    drills: [
      { type: "choice", prompt: "기사 的意思是？", answer: "新闻报道", choices: ["新闻报道", "药店", "周末", "邀请"], explain: "기사 是新闻/报道。" },
      { type: "type", prompt: "发布/宣布：발표___", answer: "하다", acceptable: ["하다"], explain: "발표하다 是动词。" },
      { type: "choice", prompt: "读新闻第一遍最应该抓？", answer: "主题词和动作", choices: ["主题词和动作", "所有生词拼写", "字体大小", "标点数量"], explain: "先建立信息骨架。"}
    ],
    unlocks: ["l22-media-shadowing"]
  },
  {
    id: "l22-media-shadowing",
    order: 21,
    milestone: "m3",
    title: "影子跟读和反应句",
    subtitle: "-더라고요, 진짜, 완전, 소름 돋다。",
    duration: 24,
    focus: ["listening", "native", "media"],
    objectives: ["跟读短片段", "表达亲身发现", "控制语气副词强度"],
    teach: [
      "-더라고요 表示说话人亲身经历后发现。",
      "진짜/완전 能增强情绪，但过量会显得夸张。",
      "影子跟读先追节奏和停顿，再追每个音。"
    ],
    drills: [
      { type: "choice", prompt: "갈수록 재밌더라고요 表示？", answer: "越看越觉得有意思", choices: ["越看越觉得有意思", "请不要看", "价格很贵", "我会去"], explain: "-더라고요 有亲身发现感。" },
      { type: "type", prompt: "真的很有趣：___ 재미있어요.", answer: "진짜", acceptable: ["진짜", "정말"], explain: "진짜/정말 都可加强语气。" },
      { type: "choice", prompt: "影子跟读第一轮更该追？", answer: "节奏和停顿", choices: ["节奏和停顿", "汉字写法", "所有语法术语", "字幕颜色"], explain: "先建立声音轮廓。"}
    ],
    unlocks: ["l23-social-posts"]
  },
  {
    id: "l23-social-posts",
    order: 22,
    milestone: "m3",
    title: "社交媒体短帖",
    subtitle: "省略、语气、评论区反应。",
    duration: 22,
    focus: ["media", "native", "pragmatics"],
    objectives: ["读懂短帖主旨", "识别省略主语", "写一条安全评论"],
    teach: [
      "短帖常省略主语和助词，要靠上下文补齐。",
      "댓글 是评论，공감해요 表示有共鸣/认同。",
      "不确定语气时，用 저도 그렇게 생각해요 比强评价更安全。"
    ],
    drills: [
      { type: "choice", prompt: "댓글 的意思是？", answer: "评论", choices: ["评论", "票价", "药", "家人"], explain: "댓글 是网络评论。" },
      { type: "type", prompt: "我也这样想：저도 그렇게 생각___", answer: "해요", acceptable: ["해요"], explain: "생각하다 -> 생각해요。" },
      { type: "choice", prompt: "短帖常见难点是？", answer: "省略和上下文", choices: ["省略和上下文", "没有任何语气", "只有敬语", "没有词汇"], explain: "真实材料常依赖语境。"}
    ],
    unlocks: ["l24-opinion-paragraph"]
  },
  {
    id: "l24-opinion-paragraph",
    order: 23,
    milestone: "m3",
    title: "写出第一段观点",
    subtitle: "제 생각에는, 왜냐하면, 예를 들면。",
    duration: 24,
    focus: ["grammar", "discourse", "native"],
    objectives: ["表达观点", "给出理由", "添加例子"],
    teach: [
      "제 생각에는 可以把观点变成个人视角，降低绝对感。",
      "왜냐하면 引出原因，예를 들면 引出例子。",
      "一段话最小结构：观点 + 原因 + 例子 + 小结。"
    ],
    drills: [
      { type: "choice", prompt: "表达“在我看来”可用？", answer: "제 생각에는", choices: ["제 생각에는", "얼마예요", "여보세요", "포장해 주세요"], explain: "제 생각에는 是观点框架。" },
      { type: "type", prompt: "例如：예를 ___", answer: "들면", acceptable: ["들면"], explain: "예를 들면 = 举例来说。" },
      { type: "choice", prompt: "观点段最小结构不包括？", answer: "随机罗列生词", choices: ["观点", "原因", "例子", "随机罗列生词"], explain: "输出要有信息逻辑。"}
    ],
    unlocks: ["l25-retelling"]
  },
  {
    id: "l25-retelling",
    order: 24,
    milestone: "m3",
    title: "复述经历和故事",
    subtitle: "먼저, 그다음에, 결국。",
    duration: 24,
    focus: ["discourse", "grammar", "speaking"],
    objectives: ["按顺序复述", "使用连接副词", "保留关键细节"],
    teach: [
      "먼저/그다음에/마지막으로 能让复述有顺序。",
      "결국 表示最终结果，适合故事收束。",
      "复述不是背原文，而是保留人物、动作、转折和结果。"
    ],
    drills: [
      { type: "choice", prompt: "그다음에 的意思是？", answer: "然后/接下来", choices: ["然后/接下来", "但是", "因为", "也许"], explain: "用于顺序推进。" },
      { type: "type", prompt: "最终：___ 집에 갔어요.", answer: "결국", acceptable: ["결국"], explain: "결국 表示最后结果。" },
      { type: "choice", prompt: "复述时最该保留？", answer: "人物、动作、转折和结果", choices: ["人物、动作、转折和结果", "每个助词的术语", "所有标点", "字体颜色"], explain: "复述重在信息结构。"}
    ],
    unlocks: ["l26-indirect-speech"]
  },
  {
    id: "l26-indirect-speech",
    order: 25,
    milestone: "m3",
    title: "转述别人说的话",
    subtitle: "-다고 하다, -라고 하다。",
    duration: 24,
    focus: ["grammar", "discourse"],
    objectives: ["转述陈述句", "转述名词句", "避免硬翻“他说”"],
    teach: [
      "动词/形容词陈述常用 -다고 하다。",
      "名词句常用 -(이)라고 하다。",
      "口语里常缩成 -대요，表示“听说/他说”。"
    ],
    drills: [
      { type: "choice", prompt: "친구가 바쁘다고 했어요 表示？", answer: "朋友说他/她忙", choices: ["朋友说他/她忙", "朋友正在吃饭", "朋友想买东西", "朋友在药店"], explain: "-다고 했어요 是过去转述。" },
      { type: "type", prompt: "听说很好吃：맛있___ 해요.", answer: "다고", acceptable: ["다고"], explain: "맛있다 -> 맛있다고 해요。" },
      { type: "choice", prompt: "名词句转述常用？", answer: "-(이)라고 하다", choices: ["-(이)라고 하다", "-지 마세요", "-고 있어요", "보다"], explain: "名词 + 이라고/라고。"}
    ],
    unlocks: ["l27-honorific-register"]
  },
  {
    id: "l27-honorific-register",
    order: 26,
    milestone: "m4",
    title: "敬语和语域切换",
    subtitle: "-(으)시-, 드리다, 말씀。",
    duration: 26,
    focus: ["native", "pragmatics", "grammar"],
    objectives: ["识别尊敬对象", "切换普通词和敬语词", "避免过度敬语"],
    teach: [
      "-(으)시- 尊敬句子的主语，不是尊敬所有名词。",
      "말하다 的敬语相关表达有 말씀하시다/말씀드리다。",
      "敬语过度也会不自然，关键是关系、场合和动作方向。"
    ],
    drills: [
      { type: "choice", prompt: "老师来了更自然是？", answer: "선생님이 오셨어요.", choices: ["선생님이 오셨어요.", "선생님이 왔어.", "선생님이 먹었어요.", "선생님을 갔어요."], explain: "오다 + 시 + 었어요 -> 오셨어요。" },
      { type: "type", prompt: "向您说明：말씀___", answer: "드릴게요", acceptable: ["드릴게요", "드리겠습니다"], explain: "말씀드리다 是谦逊地说给对方。" },
      { type: "choice", prompt: "敬语判断核心是？", answer: "关系、场合和动作方向", choices: ["关系、场合和动作方向", "句子长度", "是否有外来词", "是否有数字"], explain: "敬语是社会关系系统。"}
    ],
    unlocks: ["l10-native-softeners"]
  },
  {
    id: "l28-soft-refusal",
    order: 28,
    milestone: "m4",
    title: "委婉拒绝和保留关系",
    subtitle: "어렵다, 힘들다, 다음에, 아쉽다。",
    duration: 24,
    focus: ["native", "pragmatics"],
    objectives: ["拒绝但不切断关系", "表达遗憾", "提出替代方案"],
    teach: [
      "힘들 것 같아요 常用于委婉表示不太可行。",
      "아쉽지만 可以先表达遗憾，再说明原因。",
      "가능하면 다음에 같이 해요 给关系留出口。"
    ],
    drills: [
      { type: "choice", prompt: "明天可能不太行：내일은 좀 ___ 것 같아요.", answer: "힘들", choices: ["힘들", "맛있", "멀", "비싸"], explain: "힘들 것 같아요 是柔和拒绝。" },
      { type: "type", prompt: "很遗憾但是：___ 다음에 만나요.", answer: "아쉽지만", acceptable: ["아쉽지만"], explain: "아쉽지만 先缓冲。" },
      { type: "choice", prompt: "保留关系的拒绝通常会？", answer: "给原因或替代方案", choices: ["给原因或替代方案", "直接说错了", "只发一个名词", "完全不回应"], explain: "韩语语用重视余地。"}
    ],
    unlocks: ["l29-abstract-discussion"]
  },
  {
    id: "l29-abstract-discussion",
    order: 29,
    milestone: "m4",
    title: "抽象话题讨论",
    subtitle: "맥락, 관점, 결국, 반면에。",
    duration: 28,
    focus: ["native", "grammar", "discourse"],
    objectives: ["讨论观点差异", "使用抽象名词", "组织对比段落"],
    teach: [
      "관점 表示观点/视角，맥락 表示语境/脉络。",
      "반면에 用于对比另一面，比 하지만 更适合段落结构。",
      "抽象讨论要用缓冲：제 생각에는, 어느 정도, 것 같아요。"
    ],
    drills: [
      { type: "choice", prompt: "맥락 的意思是？", answer: "上下文/脉络", choices: ["上下文/脉络", "药店", "数量", "电话"], explain: "맥락 是语境分析高频词。" },
      { type: "type", prompt: "另一方面：___ 다른 관점도 있어요.", answer: "반면에", acceptable: ["반면에"], explain: "반면에 表示对比另一面。" },
      { type: "choice", prompt: "抽象讨论中缓冲的作用是？", answer: "降低绝对感并留出讨论空间", choices: ["降低绝对感并留出讨论空间", "让句子变成过去式", "表示数量", "表示禁止"], explain: "高级表达不只追求正确，还追求关系处理。"}
    ],
    unlocks: ["l30-native-capstone"]
  },
  {
    id: "l30-native-capstone",
    order: 30,
    milestone: "m4",
    title: "母语者层输出总复盘",
    subtitle: "从信息正确到表达合适。",
    duration: 30,
    focus: ["native", "pragmatics", "discourse"],
    objectives: ["完成 2 分钟韩语输出", "自查语气和结构", "把弱点送回复习"],
    teach: [
      "母语者层不等于不用犯错，而是能根据对象和语境调整表达。",
      "输出自查四件事：信息顺序、语气强度、敬语距离、连接自然度。",
      "完成输出后，把不稳词、句型和表达加入 SRS，形成下一轮学习。"
    ],
    drills: [
      { type: "choice", prompt: "母语者层输出最该自查？", answer: "信息顺序、语气、敬语和连接", choices: ["信息顺序、语气、敬语和连接", "只查字数", "只查罗马音", "只查图片"], explain: "高级输出看整体适配。" },
      { type: "type", prompt: "在我看来：제 생각___", answer: "에는", acceptable: ["에는"], explain: "제 생각에는 是安全观点框架。" },
      { type: "choice", prompt: "完成输出后下一步是？", answer: "把不稳点送回复习", choices: ["把不稳点送回复习", "删除所有记录", "只换主题", "跳过复盘"], explain: "闭环来自输出后的复盘。"}
    ],
    unlocks: []
  }
];

export const extraVocab = [
  { id: "v-eolmayeyo", level: "survival", category: "travel", korean: "얼마예요", romanization: "eolmayeyo", meaning: "多少钱", register: "礼貌通用", example: "이거 얼마예요?", exampleMeaning: "这个多少钱？", note: "购物和市场高频句。" },
  { id: "v-hana", level: "survival", category: "food", korean: "하나", romanization: "hana", meaning: "一个", register: "中性", example: "아이스 아메리카노 하나 주세요.", exampleMeaning: "请给我一杯冰美式。", note: "固有数词，点单高频。" },
  { id: "v-du", level: "survival", category: "food", korean: "두", romanization: "du", meaning: "两个", register: "中性", example: "물 두 병 주세요.", exampleMeaning: "请给我两瓶水。", note: "둘 在量词前变 두。" },
  { id: "v-byeong", level: "survival", category: "food", korean: "병", romanization: "byeong", meaning: "瓶", register: "量词", example: "주스 한 병 샀어요.", exampleMeaning: "买了一瓶果汁。", note: "常用于瓶装饮料。" },
  { id: "v-oneul", level: "survival", category: "time", korean: "오늘", romanization: "oneul", meaning: "今天", register: "中性", example: "오늘 시간이 있어요.", exampleMeaning: "今天有时间。", note: "和 내일/어제 组成基础时间轴。" },
  { id: "v-naeil", level: "survival", category: "time", korean: "내일", romanization: "naeil", meaning: "明天", register: "中性", example: "내일 만날 거예요.", exampleMeaning: "明天会见面。", note: "将来计划高频。" },
  { id: "v-jumal", level: "daily", category: "time", korean: "주말", romanization: "jumal", meaning: "周末", register: "中性", example: "주말에 뭐 할 거예요?", exampleMeaning: "周末要做什么？", note: "에 标记时间点。" },
  { id: "v-yaksok", level: "daily", category: "time", korean: "약속", romanization: "yaksok", meaning: "约定；预约", register: "中性", example: "그날은 약속이 있어요.", exampleMeaning: "那天我有约。", note: "既可私人约定，也可预约。" },
  { id: "v-sajin", level: "daily", category: "media", korean: "사진", romanization: "sajin", meaning: "照片", register: "中性", example: "사진 찍어도 돼요?", exampleMeaning: "可以拍照吗？", note: "찍다 搭配照片/视频。" },
  { id: "v-gidarida", level: "daily", category: "travel", korean: "기다리다", romanization: "gidarida", meaning: "等待", register: "中性", example: "조금만 기다려 주세요.", exampleMeaning: "请稍等一下。", note: "服务场景高频。" },
  { id: "v-mwo", level: "survival", category: "greetings", korean: "뭐", romanization: "mwo", meaning: "什么", register: "口语", example: "뭐 먹고 싶어요?", exampleMeaning: "想吃什么？", note: "무엇 的口语形式。" },
  { id: "v-jigeum-progressive", level: "survival", category: "time", korean: "지금", romanization: "jigeum", meaning: "现在", register: "中性", example: "지금 공부하고 있어요.", exampleMeaning: "现在正在学习。", note: "常和 -고 있어요 搭配。" },
  { id: "v-cha", level: "survival", category: "food", korean: "차", romanization: "cha", meaning: "茶；车", register: "中性", example: "커피보다 차가 더 좋아요.", exampleMeaning: "比起咖啡，我更喜欢茶。", note: "靠上下文区分茶和车。" },
  { id: "v-jeil", level: "daily", category: "feelings", korean: "제일", romanization: "jeil", meaning: "最", register: "口语高频", example: "이 노래를 제일 좋아해요.", exampleMeaning: "我最喜欢这首歌。", note: "가장 更书面。" },
  { id: "v-bappeuda", level: "daily", category: "work", korean: "바쁘다", romanization: "bappeuda", meaning: "忙", register: "中性", example: "바빠서 못 갔어요.", exampleMeaning: "因为忙所以没去。", note: "ㅂ 不规则：바빠요。" },
  { id: "v-geuraeseo", level: "daily", category: "work", korean: "그래서", romanization: "geuraeseo", meaning: "所以", register: "口语/书面", example: "비가 왔어요. 그래서 집에 있었어요.", exampleMeaning: "下雨了，所以在家。", note: "承接结果，不要每句滥用。" },
  { id: "v-yeoboseyo", level: "survival", category: "greetings", korean: "여보세요", romanization: "yeoboseyo", meaning: "喂；电话开场", register: "电话", example: "여보세요? 잘 들려요?", exampleMeaning: "喂？听得清吗？", note: "不用作面对面问候。" },
  { id: "v-munja", level: "daily", category: "media", korean: "문자", romanization: "munja", meaning: "短信；文字", register: "中性", example: "문자로 보내 주세요.", exampleMeaning: "请用短信发给我。", note: "문자 메시지 的缩略也常见。" },
  { id: "v-meori", level: "survival", category: "feelings", korean: "머리", romanization: "meori", meaning: "头", register: "中性", example: "머리가 아파요.", exampleMeaning: "头疼。", note: "身体部位常用 이/가 아파요。" },
  { id: "v-yakguk", level: "survival", category: "travel", korean: "약국", romanization: "yakguk", meaning: "药店", register: "中性", example: "약국이 어디예요?", exampleMeaning: "药店在哪里？", note: "국 发 /국/，注意收音。" },
  { id: "v-eojebuteo", level: "daily", category: "time", korean: "어제부터", romanization: "eojebuteo", meaning: "从昨天开始", register: "中性", example: "어제부터 목이 아파요.", exampleMeaning: "从昨天开始嗓子疼。", note: "부터 表示起点。" },
  { id: "v-gajok", level: "daily", category: "identity", korean: "가족", romanization: "gajok", meaning: "家人；家庭", register: "中性", example: "가족이 몇 명이에요?", exampleMeaning: "家里有几口人？", note: "족 有收音。" },
  { id: "v-bumonim", level: "daily", category: "identity", korean: "부모님", romanization: "bumonim", meaning: "父母", register: "敬称", example: "부모님은 서울에 계세요.", exampleMeaning: "父母在首尔。", note: "계세요 是 있다 的敬语。" },
  { id: "v-gachi", level: "daily", category: "greetings", korean: "같이", romanization: "gachi", meaning: "一起", register: "中性", example: "같이 갈래요?", exampleMeaning: "要一起去吗？", note: "口语邀请高频。" },
  { id: "v-gwaenchanhda", level: "daily", category: "feelings", korean: "괜찮다", romanization: "gwaenchanhda", meaning: "没关系；可以", register: "中性", example: "시간 괜찮으세요?", exampleMeaning: "时间方便吗？", note: "可表示身体、情况、许可。" },
  { id: "v-gisa", level: "daily", category: "media", korean: "기사", romanization: "gisa", meaning: "新闻报道", register: "中性", example: "오늘 기사를 읽었어요.", exampleMeaning: "今天读了新闻。", note: "也可表示司机，靠语境判断。" },
  { id: "v-balpyo", level: "daily", category: "work", korean: "발표하다", romanization: "balpyohada", meaning: "发表；宣布；做报告", register: "中性", example: "회사에서 새 계획을 발표했어요.", exampleMeaning: "公司发布了新计划。", note: "学校报告也叫 발표。" },
  { id: "v-jinjja", level: "daily", category: "feelings", korean: "진짜", romanization: "jinjja", meaning: "真的", register: "口语", example: "진짜 재미있어요.", exampleMeaning: "真的很有趣。", note: "强度较高，正式场合少用。" },
  { id: "v-daetgeul", level: "daily", category: "media", korean: "댓글", romanization: "daetgeul", meaning: "评论", register: "网络", example: "댓글을 읽고 공감했어요.", exampleMeaning: "读了评论后有共鸣。", note: "대댓글 是回复评论。" },
  { id: "v-gonggam", level: "daily", category: "feelings", korean: "공감하다", romanization: "gonggamhada", meaning: "共鸣；认同", register: "中性", example: "저도 그 말에 공감해요.", exampleMeaning: "我也认同那句话。", note: "社交媒体和讨论高频。" },
  { id: "v-waenyahamyeon", level: "daily", category: "work", korean: "왜냐하면", romanization: "waenyahamyeon", meaning: "因为", register: "说明", example: "왜냐하면 시간이 없기 때문이에요.", exampleMeaning: "因为没有时间。", note: "常和 때문이에요 呼应。" },
  { id: "v-manjeo", level: "daily", category: "time", korean: "먼저", romanization: "meonjeo", meaning: "首先；先", register: "中性", example: "먼저 물을 마셨어요.", exampleMeaning: "先喝了水。", note: "复述顺序高频。" },
  { id: "v-jip", level: "survival", category: "identity", korean: "집", romanization: "jip", meaning: "家；房子", register: "中性", example: "집에 가고 싶어요.", exampleMeaning: "我想回家。", note: "집에 가다 是最早能使用的生活句。" },
  { id: "v-hakgyo", level: "survival", category: "identity", korean: "학교", romanization: "hakgyo", meaning: "学校", register: "中性", example: "학교가 어디예요?", exampleMeaning: "学校在哪里？", note: "可和 회사/집 组成基础地点网络。" },
  { id: "v-sukso", level: "survival", category: "travel", korean: "숙소", romanization: "sukso", meaning: "住处；住宿", register: "旅行", example: "숙소가 역 근처에 있어요.", exampleMeaning: "住处在车站附近。", note: "旅行中比 호텔 更泛用。" },
  { id: "v-bang", level: "survival", category: "travel", korean: "방", romanization: "bang", meaning: "房间", register: "中性", example: "방이 조금 추워요.", exampleMeaning: "房间有点冷。", note: "住宿、租房、房间状态都高频。" },
  { id: "v-juso", level: "survival", category: "travel", korean: "주소", romanization: "juso", meaning: "地址", register: "中性", example: "주소를 문자로 보내 주세요.", exampleMeaning: "请把地址用短信发给我。", note: "问路、打车、预约确认都常用。" },
  { id: "v-yeogi", level: "survival", category: "travel", korean: "여기", romanization: "yeogi", meaning: "这里", register: "中性", example: "여기 앉아도 돼요?", exampleMeaning: "这里可以坐吗？", note: "和 저기/거기 形成指示词基础。" },
  { id: "v-jeogi", level: "survival", category: "travel", korean: "저기", romanization: "jeogi", meaning: "那里；打扰一下", register: "口语", example: "저기, 화장실이 어디예요?", exampleMeaning: "不好意思，洗手间在哪里？", note: "句首 저기 可用来礼貌地引起注意。" },
  { id: "v-hwajangsil", level: "survival", category: "travel", korean: "화장실", romanization: "hwajangsil", meaning: "洗手间", register: "中性", example: "화장실이 어디예요?", exampleMeaning: "洗手间在哪里？", note: "零基础旅行最实用地点词之一。" },
  { id: "v-oreunjjok", level: "survival", category: "travel", korean: "오른쪽", romanization: "oreunjjok", meaning: "右边", register: "中性", example: "오른쪽으로 가세요.", exampleMeaning: "请往右走。", note: "问路时常和 으로 가세요 搭配。" },
  { id: "v-oenjjok", level: "survival", category: "travel", korean: "왼쪽", romanization: "oenjjok", meaning: "左边", register: "中性", example: "왼쪽에 약국이 있어요.", exampleMeaning: "左边有药店。", note: "和 오른쪽 成对记更稳定。" },
  { id: "v-jihacheol", level: "survival", category: "travel", korean: "지하철", romanization: "jihacheol", meaning: "地铁", register: "中性", example: "지하철역이 가까워요.", exampleMeaning: "地铁站很近。", note: "철 有收音，跟读时不要吞掉。" },
  { id: "v-beoseu", level: "survival", category: "travel", korean: "버스", romanization: "beoseu", meaning: "公交车", register: "中性", example: "버스를 타고 갈 거예요.", exampleMeaning: "我会坐公交去。", note: "交通动词常用 타다。" },
  { id: "v-pyo", level: "survival", category: "travel", korean: "표", romanization: "pyo", meaning: "票", register: "中性", example: "표를 어디서 사요?", exampleMeaning: "票在哪里买？", note: "交通、演出、排队场景都高频。" },
  { id: "v-gage", level: "survival", category: "food", korean: "가게", romanization: "gage", meaning: "店；店铺", register: "中性", example: "이 가게는 사람이 많아요.", exampleMeaning: "这家店人很多。", note: "比 식당 更泛，可以指各种店。" },
  { id: "v-bongtu", level: "survival", category: "food", korean: "봉투", romanization: "bongtu", meaning: "袋子", register: "购物", example: "봉투 필요하세요?", exampleMeaning: "需要袋子吗？", note: "便利店和超市常听到。" },
  { id: "v-kadeu", level: "survival", category: "food", korean: "카드", romanization: "kadeu", meaning: "卡；银行卡", register: "支付", example: "카드로 계산할게요.", exampleMeaning: "我刷卡结账。", note: "로 表示手段，用卡付款说 카드로。" },
  { id: "v-hyeongeum", level: "survival", category: "food", korean: "현금", romanization: "hyeongeum", meaning: "现金", register: "支付", example: "현금은 없어요.", exampleMeaning: "我没有现金。", note: "和 카드 成对覆盖支付场景。" },
  { id: "v-yak", level: "daily", category: "feelings", korean: "약", romanization: "yak", meaning: "药", register: "中性", example: "약을 먹어야 해요.", exampleMeaning: "我得吃药。", note: "먹다 也用于吃药。" },
  { id: "v-gamgi", level: "daily", category: "feelings", korean: "감기", romanization: "gamgi", meaning: "感冒", register: "中性", example: "감기에 걸렸어요.", exampleMeaning: "我感冒了。", note: "自然搭配是 감기에 걸리다。" },
  { id: "v-jeungsang", level: "daily", category: "feelings", korean: "증상", romanization: "jeungsang", meaning: "症状", register: "药店/医院", example: "증상을 설명해 주세요.", exampleMeaning: "请说明症状。", note: "药店求助时比只说 아파요 更清楚。" },
  { id: "v-hwagin", level: "daily", category: "work", korean: "확인하다", romanization: "hwaginhada", meaning: "确认", register: "中性", example: "예약을 다시 확인하고 싶어요.", exampleMeaning: "我想重新确认预约。", note: "工作、预约、信息核对都高频。" },
  { id: "v-yeollak", level: "daily", category: "work", korean: "연락", romanization: "yeollak", meaning: "联系", register: "中性", example: "나중에 연락드릴게요.", exampleMeaning: "我稍后联系您。", note: "드릴게요 让联系动作更礼貌。" },
  { id: "v-gyeyak", level: "daily", category: "work", korean: "계약", romanization: "gyeyak", meaning: "合同；签约", register: "正式", example: "계약 내용을 확인했어요.", exampleMeaning: "我确认了合同内容。", note: "职场和租房场景常见。" },
  { id: "v-sigan", level: "daily", category: "time", korean: "시간", romanization: "sigan", meaning: "时间", register: "中性", example: "시간이 조금 더 필요해요.", exampleMeaning: "还需要一点时间。", note: "시간 괜찮으세요? 是约时间核心句。" },
  { id: "v-gyeolguk", level: "native", category: "media", korean: "결국", romanization: "gyeolguk", meaning: "最终；结果", register: "讨论", example: "결국 집에 가기로 했어요.", exampleMeaning: "最后决定回家。", note: "总结结果时常用。" },
  { id: "v-jeonhada", level: "native", category: "work", korean: "전하다", romanization: "jeonhada", meaning: "转达；传递", register: "中性", example: "소식을 전해 들었어요.", exampleMeaning: "听人转达了消息。", note: "间接信息相关。" },
  { id: "v-malsseum", level: "native", category: "greetings", korean: "말씀", romanization: "malsseum", meaning: "话语；说的敬语", register: "敬语", example: "말씀해 주셔서 감사합니다.", exampleMeaning: "谢谢您告诉我。", note: "말 的敬语相关名词。" },
  { id: "v-deurida", level: "native", category: "greetings", korean: "드리다", romanization: "deurida", meaning: "给；做给您的谦逊表达", register: "敬语", example: "제가 도와드릴게요.", exampleMeaning: "我来帮您。", note: "动作方向朝向尊敬对象。" },
  { id: "v-aswipda", level: "native", category: "feelings", korean: "아쉽다", romanization: "aswipda", meaning: "遗憾；可惜", register: "中性", example: "아쉽지만 다음에 만나요.", exampleMeaning: "很遗憾，但下次见吧。", note: "委婉拒绝和评价高频。" },
  { id: "v-gwanjeom", level: "native", category: "media", korean: "관점", romanization: "gwanjeom", meaning: "观点；视角", register: "讨论", example: "다른 관점도 있어요.", exampleMeaning: "也有其他观点。", note: "抽象讨论关键词。" },
  { id: "v-banmyeone", level: "native", category: "media", korean: "반면에", romanization: "banmyeone", meaning: "另一方面；相反", register: "书面/讨论", example: "반면에 단점도 있어요.", exampleMeaning: "另一方面也有缺点。", note: "段落对比连接词。" },
  { id: "v-eoneu-jeongdo", level: "native", category: "feelings", korean: "어느 정도", romanization: "eoneu jeongdo", meaning: "某种程度上", register: "缓冲", example: "어느 정도 이해해요.", exampleMeaning: "某种程度上我理解。", note: "降低绝对感的好工具。" }
];

export const extraGrammarPoints = [
  { id: "g-future-plan", level: "growth", title: "-(으)ㄹ 거예요", pattern: "动词词干 + (으)ㄹ 거예요", meaning: "将要；打算", explanation: "表达计划或预测。有收音接 을 거예요，无收音接 ㄹ 거예요。", examples: [{ ko: "내일 친구를 만날 거예요.", zh: "明天会见朋友。", note: "만나다 -> 만날 거예요。" }, { ko: "주말에 쉴 거예요.", zh: "周末会休息。", note: "쉬다 -> 쉴 거예요。" }], pitfalls: ["不要和过去式 -았/었어요 混用。"] },
  { id: "g-progressive", level: "growth", title: "-고 있어요", pattern: "动词词干 + 고 있어요", meaning: "正在做", explanation: "表示动作进行，也可表示某些结果状态。", examples: [{ ko: "한국어를 공부하고 있어요.", zh: "正在学韩语。", note: "动作进行。" }, { ko: "문을 열고 있어요.", zh: "正在开门/门开着。", note: "需靠上下文判断。" }], pitfalls: ["不是所有状态都要翻成正在。"] },
  { id: "g-permission", level: "growth", title: "-아/어도 돼요", pattern: "谓词词干 + 아/어도 돼요", meaning: "可以……", explanation: "用于许可和请求许可，问句语调即可变成“可以吗”。", examples: [{ ko: "사진 찍어도 돼요?", zh: "可以拍照吗？", note: "찍다 -> 찍어도 돼요。" }, { ko: "여기 앉아도 돼요.", zh: "这里可以坐。", note: "许可。" }], pitfalls: ["正式标识中常见 -면 안 됩니다 表示禁止。"] },
  { id: "g-prohibition", level: "growth", title: "-지 마세요", pattern: "动词词干 + 지 마세요", meaning: "请不要……", explanation: "礼貌禁止或提醒，比直接说 안 돼요 更像规则说明。", examples: [{ ko: "여기서 사진 찍지 마세요.", zh: "请不要在这里拍照。", note: "禁止动作。" }, { ko: "걱정하지 마세요.", zh: "请不要担心。", note: "安慰也可用。" }], pitfalls: ["亲近场景可用 -지 마，但对陌生人太硬。"] },
  { id: "g-comparison", level: "growth", title: "보다 / 더 / 제일", pattern: "A보다 B가 더 + 形容词", meaning: "比……更……；最……", explanation: "보다 标出比较基准，더 表示更，제일/가장 表示最。", examples: [{ ko: "커피보다 차가 더 좋아요.", zh: "比起咖啡，茶更好。", note: "A보다 B。" }, { ko: "이걸 제일 좋아해요.", zh: "最喜欢这个。", note: "最喜欢。" }], pitfalls: ["좋아요 和 좋아해요 的语义重心不同。"] },
  { id: "g-because-formal", level: "growth", title: "-기 때문에", pattern: "谓词词干 + 기 때문에", meaning: "因为……", explanation: "比 -아서/어서 更明确、解释性更强，适合论述。", examples: [{ ko: "시간이 없기 때문에 못 가요.", zh: "因为没时间所以不能去。", note: "明确原因。" }, { ko: "중요하기 때문에 다시 확인해요.", zh: "因为重要所以再确认。", note: "形容词也可接。" }], pitfalls: ["口语闲聊中过多使用会显得偏硬。"] },
  { id: "g-invitation-eullae", level: "growth", title: "-(으)ㄹ래요?", pattern: "动词词干 + (으)ㄹ래요?", meaning: "要不要……；愿意……吗", explanation: "询问对方意愿，常用于邀请和选择。", examples: [{ ko: "같이 갈래요?", zh: "要一起去吗？", note: "亲近或轻松邀请。" }, { ko: "뭐 마실래요?", zh: "想喝什么？", note: "询问意愿。" }], pitfalls: ["对长辈可用 -실래요? 更礼貌。"] },
  { id: "g-sequence", level: "growth", title: "먼저 / 그다음에 / 결국", pattern: "连接副词 + 句子", meaning: "首先/然后/最终", explanation: "用于复述经历、讲故事和组织段落。", examples: [{ ko: "먼저 밥을 먹었어요.", zh: "先吃了饭。", note: "顺序起点。" }, { ko: "결국 집에 갔어요.", zh: "最后回家了。", note: "结果。" }], pitfalls: ["不要只用 그리고 串所有句子。"] },
  { id: "g-indirect-speech", level: "native", title: "-다고 하다", pattern: "谓词 + 다고 하다", meaning: "转述说……", explanation: "转述陈述内容，口语中常缩成 -대요。", examples: [{ ko: "친구가 바쁘다고 했어요.", zh: "朋友说他/她忙。", note: "过去转述。" }, { ko: "맛있대요.", zh: "听说很好吃。", note: "-다고 해요 的口语缩略。" }], pitfalls: ["名词句要用 -(이)라고 하다。"] },
  { id: "g-honorific-si", level: "native", title: "-(으)시-", pattern: "词干 + (으)시 + 어요", meaning: "尊敬主语", explanation: "用于尊敬动作或状态的主体，是敬语系统核心。", examples: [{ ko: "선생님이 오셨어요.", zh: "老师来了。", note: "오다 + 시 + 었어요。" }, { ko: "어머니가 주무세요.", zh: "母亲睡觉。", note: "자다 的敬语是 주무시다。" }], pitfalls: ["-시- 尊敬主语，不是自动尊敬听者。"] },
  { id: "g-soft-refusal", level: "native", title: "-기는 힘들 것 같아요", pattern: "动词名词化 + 힘들 것 같아요", meaning: "恐怕不太能……", explanation: "委婉拒绝或表达困难，保留关系空间。", examples: [{ ko: "내일 가기는 힘들 것 같아요.", zh: "明天去恐怕不太行。", note: "柔和拒绝。" }, { ko: "오늘 끝내기는 어려울 것 같아요.", zh: "今天完成可能有点难。", note: "工作语境常用。" }], pitfalls: ["比直接 못 가요 更柔和，但仍需给原因或替代方案。"] },
  { id: "g-contrast-paragraph", level: "native", title: "반면에", pattern: "句子. 반면에 + 对比句", meaning: "另一方面；相反", explanation: "用于段落级对比，比单纯 하지만 更有论述感。", examples: [{ ko: "장점이 많아요. 반면에 비용이 높아요.", zh: "优点很多。另一方面费用高。", note: "段落对比。" }, { ko: "저는 동의해요. 반면에 걱정도 있어요.", zh: "我同意。另一方面也有担心。", note: "保留复杂立场。" }], pitfalls: ["不要把所有转折都塞进 하지만。"] }
];

export const extraPragmaticScenarios = [
  { id: "p-shopping-price", level: "foundation", title: "市场和便利店购物", goal: "问价格、确认数量、礼貌追加。", context: "店员语速快时先抓 가격, 봉투, 카드 等关键词。", lines: [{ ko: "이거 얼마예요?", zh: "这个多少钱？", note: "直接问价。" }, { ko: "하나 더 주세요.", zh: "请再给一个。", note: "追加数量。" }, { ko: "카드로 계산할게요.", zh: "我刷卡结账。", note: "付款方式。" }], nativeMove: "如果只是看看，可说 그냥 구경하는 거예요，避免店员继续推荐。" },
  { id: "p-pharmacy-help", level: "growth", title: "药店说明症状", goal: "说明哪里不舒服、持续多久、请求建议。", context: "药剂师会问 언제부터요? 알레르기 있어요? 先准备时间和过敏信息。", lines: [{ ko: "어제부터 목이 아파요.", zh: "从昨天开始嗓子疼。", note: "症状 + 时间。" }, { ko: "감기약 있어요?", zh: "有感冒药吗？", note: "询问药品。" }, { ko: "하루에 몇 번 먹어요?", zh: "一天吃几次？", note: "确认用法。" }], nativeMove: "不确定药名时，用 증상 설명 + 추천해 주세요，比硬找中文药名更实用。" },
  { id: "p-schedule-invite", level: "growth", title: "约时间和改期", goal: "邀请、确认方便、提出改期。", context: "朋友间可以轻松，但对同事或前辈要多一点缓冲。", lines: [{ ko: "이번 주말에 시간 괜찮으세요?", zh: "这周末时间方便吗？", note: "确认方便。" }, { ko: "같이 점심 먹을래요?", zh: "要一起吃午饭吗？", note: "轻松邀请。" }, { ko: "혹시 다음 주로 미뤄도 될까요?", zh: "可以推到下周吗？", note: "改期缓冲。" }], nativeMove: "혹시 能给对方拒绝空间，是约时间时很好用的缓冲词。" },
  { id: "p-group-chat", level: "growth", title: "群聊里的安全回应", goal: "表达认同、补充和不确定。", context: "群聊中语气太硬容易显得突兀，先用 완전/저도/아마 控制温度。", lines: [{ ko: "저도 그렇게 생각해요.", zh: "我也这么想。", note: "安全认同。" }, { ko: "아마 시간이 조금 더 필요할 것 같아요.", zh: "可能还需要一点时间。", note: "不确定表达。" }, { ko: "제가 확인해 볼게요.", zh: "我来确认一下。", note: "承担行动。" }], nativeMove: "읽씹/답장 늦었어요 같은真实社交语境，语气比语法更影响关系。" },
  { id: "p-work-feedback", level: "native", title: "工作反馈不伤人", goal: "指出问题、保留面子、提出下一步。", context: "韩国职场反馈常用 완충 + 관찰 + 제안 的顺序。", lines: [{ ko: "전체적으로 좋은데, 이 부분은 조금 더 다듬으면 좋을 것 같아요.", zh: "整体不错，这部分再打磨一下会更好。", note: "先肯定再建议。" }, { ko: "제가 보기에는 흐름이 조금 빨라요.", zh: "在我看来节奏有点快。", note: "个人视角降低绝对感。" }, { ko: "다시 한번 맞춰 볼까요?", zh: "我们再对一下怎么样？", note: "提议式推进。" }], nativeMove: "틀렸어요 不是不能说，而是要看关系、责任归属和是否需要立即纠错。" },
  { id: "p-soft-refusal-plan", level: "native", title: "拒绝邀请但保留余地", goal: "说明困难、表达遗憾、给替代方案。", context: "直接拒绝可能太硬，通常先感谢或遗憾，再说明原因。", lines: [{ ko: "초대해 주셔서 감사한데, 그날은 좀 힘들 것 같아요.", zh: "谢谢邀请，但那天可能不太行。", note: "感谢 + 拒绝。" }, { ko: "아쉽지만 다음에 꼭 같이 가요.", zh: "很可惜，但下次一定一起去。", note: "保留关系。" }, { ko: "다음 주는 괜찮을 것 같아요.", zh: "下周应该可以。", note: "替代方案。" }], nativeMove: "좋아요/싫어요 的直接程度很高，拒绝时多用 힘들다/어렵다/아쉽다。" },
  { id: "p-news-discussion", level: "native", title: "讨论新闻和观点", goal: "表达立场、引用信息、承认另一面。", context: "抽象讨论里，맥락/관점/반면에 能让表达更成熟。", lines: [{ ko: "제 생각에는 맥락을 조금 더 봐야 해요.", zh: "在我看来还需要多看一点语境。", note: "观点 + 缓冲。" }, { ko: "반면에 다른 관점도 이해돼요.", zh: "另一方面，我也理解其他观点。", note: "承认另一面。" }, { ko: "결국 균형이 중요한 것 같아요.", zh: "最终平衡好像很重要。", note: "总结判断。" }], nativeMove: "高级讨论不是把话说满，而是能表示证据强弱和立场边界。" }
];

export const extraNuanceSets = [
  { id: "n-request-temperature", title: "주세요 / 부탁드려요 / 해 주세요", level: "foundation", contrast: ["주세요", "해 주세요", "부탁드려요"], explanation: "주세요 可用于给东西或做动作；부탁드려요 更郑重，适合请求对方付出精力。", examples: [{ ko: "물 주세요.", zh: "请给我水。", register: "点单" }, { ko: "확인 부탁드려요.", zh: "麻烦您确认。", register: "工作礼貌" }] },
  { id: "n-permission-politeness", title: "돼요? / 될까요? / 가능할까요?", level: "growth", contrast: ["돼요?", "될까요?", "가능할까요?"], explanation: "돼요? 直接自然；될까요? 更柔和；가능할까요? 更像正式询问可行性。", examples: [{ ko: "여기 앉아도 돼요?", zh: "这里可以坐吗？", register: "日常" }, { ko: "내일로 미뤄도 될까요?", zh: "可以推到明天吗？", register: "柔和协商" }] },
  { id: "n-because-register", title: "그래서 / -아서 / -기 때문에", level: "growth", contrast: ["그래서", "-아서/어서", "-기 때문에"], explanation: "그래서 接结果；-아서/어서 自然连接原因；-기 때문에 解释感更强。", examples: [{ ko: "바빠서 못 갔어요.", zh: "因为忙所以没去。", register: "自然口语" }, { ko: "중요하기 때문에 다시 확인해요.", zh: "因为重要所以再确认。", register: "说明/论述" }] },
  { id: "n-uncertainty", title: "아마 / 것 같아요 / -지도 몰라요", level: "native", contrast: ["아마", "것 같아요", "-지도 몰라요"], explanation: "三者都能降低确定性；-지도 몰라요 更像开放可能性，常用于推测。", examples: [{ ko: "아마 내일은 힘들 것 같아요.", zh: "明天可能不太行。", register: "委婉" }, { ko: "비가 올지도 몰라요.", zh: "说不定会下雨。", register: "可能性" }] },
  { id: "n-disagree-distance", title: "아니요 / 그럴 수도 있는데 / 제 생각에는", level: "native", contrast: ["아니요", "그럴 수도 있는데", "제 생각에는"], explanation: "直接否定清楚但硬；先承认可能性再表达观点，更适合维持对话。", examples: [{ ko: "그럴 수도 있는데 저는 조금 다르게 생각해요.", zh: "也可能是那样，不过我想得稍微不同。", register: "柔和不同意" }, { ko: "제 생각에는 이 방법이 좋아요.", zh: "在我看来这个方法好。", register: "个人观点" }] },
  { id: "n-honorific-direction", title: "말하다 / 말씀하시다 / 말씀드리다", level: "native", contrast: ["말하다", "말씀하시다", "말씀드리다"], explanation: "말씀하시다 尊敬说话的人；말씀드리다 是自己谦逊地向对方说。", examples: [{ ko: "선생님이 말씀하셨어요.", zh: "老师说了。", register: "尊敬主语" }, { ko: "제가 다시 말씀드릴게요.", zh: "我再跟您说明。", register: "谦逊给对方" }] },
  { id: "n-reaction-degree", title: "정말 / 진짜 / 완전 / 살짝", level: "native", contrast: ["정말", "진짜", "완전", "살짝"], explanation: "정말 较稳，진짜 口语，완전 强度高，살짝 可柔化负面评价。", examples: [{ ko: "완전 재밌었어요.", zh: "超级有趣。", register: "强口语" }, { ko: "살짝 아쉬웠어요.", zh: "稍微有点可惜。", register: "柔和评价" }] },
  { id: "n-written-spoken", title: "하지만 / 그런데 / 근데", level: "growth", contrast: ["하지만", "그런데", "근데"], explanation: "하지만 清晰偏书面；그런데 自然转向；근데 是口语缩略。", examples: [{ ko: "좋아요. 그런데 조금 비싸요.", zh: "不错，不过有点贵。", register: "自然转折" }, { ko: "근데 시간이 없어요.", zh: "不过没时间。", register: "口语" }] }
];
