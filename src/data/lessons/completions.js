import { depthTeach, depthDrills } from "./depth.js";

const replacementTeach = {
  "l06-cafe": [
    { title: "주세요：点单核心", body: "把想要的饮品放在 주세요 前面，就能组成最基础、也最安全的点单句。", speak: "커피 주세요", examples: [{ ko: "커피 주세요.", zh: "请给我咖啡。" }] },
    { title: "数量放在物品后", body: "韩语点单常用“物品 + 数量 + 주세요”。杯装饮品用 잔，口语点一杯也常说 하나。", speak: "아메리카노 한 잔 주세요", examples: [{ ko: "아메리카노 한 잔 주세요.", zh: "请给我一杯美式咖啡。" }] },
    { title: "冷热与大小", body: "아이스 表示冰的，따뜻한 表示热的；사이즈 前可加 큰 表示大杯。", speak: "따뜻한 라테 주세요", examples: [{ ko: "따뜻한 라테 주세요.", zh: "请给我热拿铁。" }] },
    { title: "堂食还是外带", body: "포장해 주세요 表示请打包带走；店员问堂食还是外带时，可以用 매장에서 마실게요 表示“我会在店里喝”。", speak: "포장해 주세요, 매장에서 마실게요", examples: [{ ko: "포장해 주세요.", zh: "请帮我打包。" }, { ko: "매장에서 마실게요.", zh: "我会在店里喝。" }] },
    { title: "-(으)ㄹ게요：当场决定或承诺", body: "动词词干有收音接 -을게요，无收音接 -ㄹ게요：먹다→먹을게요，마시다→마실게요。它通常宣布说话人自己的决定或承诺，所以主语一般是“我”，不要用来断定第三人称或天气。", speak: "제가 계산할게요", examples: [{ ko: "제가 계산할게요.", zh: "我来结账。", note: "由说话人承担动作" }, { ko: "매장에서 마실게요.", zh: "我会在店里喝。", note: "当场说明自己的选择" }] }
  ],
  "l07-location": [
    { title: "어디예요?：问位置", body: "在地点名词后说 어디예요?，就能问“在哪里”。不知道名词时也可以单独问 어디예요?。", speak: "화장실이 어디예요", examples: [{ ko: "화장실이 어디예요?", zh: "洗手间在哪里？" }] },
    { title: "에：去向与存在", body: "에 接在目的地后表示去哪里，也接在存在地点后表示人或物在哪里。", speak: "학교에 가요", examples: [{ ko: "학교에 가요.", zh: "去学校。" }, { ko: "집에 있어요.", zh: "在家。" }] },
    { title: "에서：动作发生地", body: "吃饭、学习、工作等动作在哪里发生，要用 에서。", speak: "도서관에서 공부해요", examples: [{ ko: "도서관에서 공부해요.", zh: "在图书馆学习。" }] },
    { title: "位置词放在名词后", body: "앞、뒤、옆、안 分别表示前、后、旁边、里面，常接 에 있어요。", speak: "역 앞에 있어요", examples: [{ ko: "역 앞에 있어요.", zh: "在车站前面。" }] }
  ],
  "l11-shopping-price": [
    { title: "얼마예요?：问价格", body: "指着商品说 이거 얼마예요?，是购物时最直接也礼貌的问法。", speak: "이거 얼마예요", examples: [{ ko: "이거 얼마예요?", zh: "这个多少钱？" }] },
    { title: "金额用汉字词数字", body: "韩元价格使用 일、이、삼 等汉字词数字，千元是 천 원，一万韩元是 만 원。", speak: "오천 원이에요", examples: [{ ko: "오천 원이에요.", zh: "是五千韩元。" }] },
    { title: "数量要配量词", body: "物品常用 개，瓶装用 병，杯装用 잔；量词前说 한、두、세、네。", speak: "두 개 주세요", examples: [{ ko: "두 개 주세요.", zh: "请给我两个。" }] },
    { title: "追加与更换", body: "하나 더 주세요 表示再给一个，바꿔 주세요 表示请更换。", speak: "이걸로 바꿔 주세요", examples: [{ ko: "이걸로 바꿔 주세요.", zh: "请换成这个。" }] }
  ],
  "l15-comparison": [
    { title: "보다 标记比较基准", body: "A보다 B가 더 + 形容词表示“B 比 A 更……”，보다 紧跟被比较的 A。", speak: "커피보다 차가 더 싸요", examples: [{ ko: "커피보다 차가 더 싸요.", zh: "茶比咖啡更便宜。" }] },
    { title: "더 与 제일", body: "더 表示更，제일 表示最；先用熟悉的形容词 만들어요、좋아요 来练。", speak: "이게 제일 좋아요", examples: [{ ko: "이게 제일 좋아요.", zh: "这个最好。" }] },
    { title: "좋아요 是评价", body: "좋아요 常表示某物不错、令人满意，主语通常用 이/가。", speak: "이 노래가 좋아요", examples: [{ ko: "이 노래가 좋아요.", zh: "这首歌很好/我觉得不错。" }] },
    { title: "좋아해요 是喜欢", body: "좋아해요 表示主动喜欢某个对象，初学时可以把对象记成 을/를 좋아해요。", speak: "저는 한국 음식을 좋아해요", examples: [{ ko: "저는 한국 음식을 좋아해요.", zh: "我喜欢韩国料理。" }] }
  ],
  "l16-because": [
    { title: "-아서/어서：自然原因", body: "日常说明原因时，把谓词变成 -아서/어서，再接结果。", speak: "비가 와서 집에 있었어요", examples: [{ ko: "비가 와서 집에 있었어요.", zh: "因为下雨，所以待在家。" }] },
    { title: "하다 变成 해서", body: "하다 与 -아서 结合时变成 해서，如 피곤하다 → 피곤해서。", speak: "피곤해서 일찍 잤어요", examples: [{ ko: "피곤해서 일찍 잤어요.", zh: "因为累，所以早睡了。" }] },
    { title: "-기 때문에：明确解释", body: "需要更明确或更书面的原因时，用谓词词干 + 기 때문에。", speak: "시간이 없기 때문에 못 가요", examples: [{ ko: "시간이 없기 때문에 못 가요.", zh: "因为没有时间，所以去不了。" }] },
    { title: "그래서 承接结果", body: "前一句先说原因，下一句可用 그래서 开头说结果；初学时不要把两套因为所以全堆在一句里。", speak: "비가 와요. 그래서 집에 있어요", examples: [{ ko: "비가 와요. 그래서 집에 있어요.", zh: "下雨了，所以我在家。" }] }
  ],
  "l17-phone-message": [
    { title: "여보세요：电话开场", body: "여보세요 主要用于接打电话，不用作面对面问候。", speak: "여보세요", examples: [{ ko: "여보세요?", zh: "喂？" }] },
    { title: "听不清就请求重复", body: "다시 말씀해 주세요 比 다시 말해 주세요 更尊敬，适合陌生人或客服场景。", speak: "다시 말씀해 주세요", examples: [{ ko: "천천히 다시 말씀해 주세요.", zh: "请慢一点再说一遍。" }] },
    { title: "把信息转成文字", body: "电话号码、地址听不清时，可以请求对方用短信发送。", speak: "문자로 보내 주세요", examples: [{ ko: "주소를 문자로 보내 주세요.", zh: "请用短信把地址发给我。" }] },
    { title: "复述一遍做确认", body: "日期或号码后加 맞아요?，可确认自己有没有听对。", speak: "세 시 맞아요", examples: [{ ko: "내일 세 시 맞아요?", zh: "是明天三点，对吗？" }] }
  ],
  "l18-health": [
    { title: "部位 + 이/가 아파요", body: "描述疼痛时，把身体部位放在 이/가 前，再接 아파요。", speak: "머리가 아파요", examples: [{ ko: "머리가 아파요.", zh: "我头疼。" }, { ko: "목이 아파요.", zh: "我嗓子疼。" }] },
    { title: "症状可以直接说", body: "감기에 걸렸어요 表示感冒了，열이 나요 表示发烧。", speak: "열이 나요", examples: [{ ko: "열이 나고 기침을 해요.", zh: "我发烧，还咳嗽。" }] },
    { title: "부터 说明开始时间", body: "在时间后加 부터 表示从何时开始，有助于医生判断病程。", speak: "어제부터 아팠어요", examples: [{ ko: "어제부터 아팠어요.", zh: "从昨天开始不舒服。" }] },
    { title: "在药店说明需求", body: "药店里可以说 감기약 주세요；有过敏史时补充 알레르기가 있어요。", speak: "감기약 주세요", examples: [{ ko: "감기약 주세요.", zh: "请给我感冒药。" }] }
  ],
  "l19-family-honorific": [
    { title: "家人称呼", body: "가족 是家人，부모님 是父母；님 让称呼带上敬意。", speak: "부모님과 같이 살아요", examples: [{ ko: "부모님과 같이 살아요.", zh: "我和父母一起住。" }] },
    { title: "-(으)세요 的接法", body: "词干有收音通常接 으세요，无收音接 세요：앉다 → 앉으세요，가다 → 가세요。", speak: "여기 앉으세요", examples: [{ ko: "여기 앉으세요.", zh: "请坐这里。" }] },
    { title: "尊敬的是句子主语", body: "说长辈的动作时加 -(으)시-，不是因为听话的人年长就给所有动词加敬语。", speak: "할머니가 주무세요", examples: [{ ko: "할머니가 주무세요.", zh: "奶奶在睡觉。" }] },
    { title: "先判断关系和场合", body: "对陌生人、长辈和工作对象，先使用 해요体与敬语词；关系确认后再调整。", speak: "성함이 어떻게 되세요", examples: [{ ko: "성함이 어떻게 되세요?", zh: "请问您怎么称呼？" }] }
  ],
  "l20-invitation": [
    { title: "같이 + 动词：一起做", body: "같이 放在动作前表示一起，先用 같이 가요、같이 먹어요 建立整句反应。", speak: "같이 점심 먹어요", examples: [{ ko: "같이 점심 먹어요.", zh: "一起吃午饭吧。" }] },
    { title: "-(으)ㄹ래요?：询问意愿", body: "邀请对方时用 -(으)ㄹ래요?，比直接命令更给对方选择空间。", speak: "주말에 영화 볼래요", examples: [{ ko: "주말에 영화 볼래요?", zh: "周末要一起看电影吗？" }] },
    { title: "先确认是否方便", body: "提出具体安排前先问 시간 괜찮아요?，能让邀请更自然。", speak: "토요일에 시간 괜찮아요", examples: [{ ko: "토요일에 시간 괜찮아요?", zh: "星期六时间方便吗？" }] },
    { title: "拒绝时保留关系", body: "先说 미안해요 或 아쉽지만，再给简短原因和替代时间。", speak: "미안해요. 다음 주는 어때요", examples: [{ ko: "미안해요. 다음 주는 어때요?", zh: "抱歉。下周怎么样？" }] }
  ]
};

const additions = {
  "l01-hangul-map": {
    teach: [{ title: "拆块时从上到下", body: "先找初声和中声，再看底部有没有收音；不要把一个音节块当成一幅无法拆开的图。", speak: "문", examples: [{ ko: "문", zh: "ㅁ 是初声，ㅜ 是中声，ㄴ 是收音。" }] }],
    drills: [
      { type: "listen", prompt: "听音后选择对应的音节块。", answer: "고", choices: ["가", "고", "한", "아"], speak: "고", explain: "고 由 ㄱ 和横元音 ㅗ 组成。" },
      { type: "cloze", prompt: "补全音节块结构。", clozeText: "한 = ㅎ + ㅏ + ___", answer: "ㄴ", choices: ["ㄱ", "ㄴ", "ㅁ", "ㅇ"], explain: "한 底部的收音是 ㄴ。" },
      { type: "dictation", prompt: "听音并输入你听到的一个音节块。", answer: "가", acceptable: ["가"], speak: "가", explain: "가 是 ㄱ + ㅏ 的左右结构。" }
    ]
  },
  "l02-vowels": {
    teach: [{ title: "ㅣ 与 ㅡ 不要混", body: "ㅣ 发音时嘴角略向两侧，ㅡ 则保持嘴唇放松；用 이/으 交替跟读。", speak: "이, 으", examples: [{ ko: "이", zh: "基础元音 ㅣ" }, { ko: "으", zh: "基础元音 ㅡ" }] }],
    drills: [
      { type: "listen", prompt: "听音后选择带 y 起音的圆唇元音。", answer: "ㅠ", choices: ["ㅜ", "ㅠ", "ㅓ", "ㅕ"], speak: "유", explain: "유 的中声是 ㅠ；它是在 ㅜ 前加入 y 起音。" },
      { type: "cloze", prompt: "补全音节中的基础元音。", clozeText: "우 = ㅇ + ___", answer: "ㅜ", choices: ["ㅗ", "ㅜ", "ㅡ", "ㅣ"], explain: "우 的中声是圆唇元音 ㅜ。" },
      { type: "type", prompt: "输入由 ㅇ 和 ㅣ 组成的音节。", answer: "이", acceptable: ["이"], explain: "音节首 ㅇ 不发音，整个音节读 ㅣ。" },
      { type: "dictation", prompt: "听音并输入对应的音节。", answer: "어", acceptable: ["어"], speak: "어", explain: "어 由 ㅇ + ㅓ 组成。" }
    ]
  },
  "l03-consonants": {
    teach: [{ title: "鼻音先练稳", body: "ㄴ、ㅁ、ㅇ 分别在舌尖、双唇和舌根形成鼻音；用 나、마、강 比较位置。", speak: "나, 마, 강", examples: [{ ko: "나", zh: "ㄴ 起始的音节" }, { ko: "마", zh: "ㅁ 起始的音节" }] }],
    drills: [
      { type: "listen", prompt: "听音后选择以 ㅎ 开头的音节。", answer: "하", choices: ["아", "사", "하", "자"], speak: "하", explain: "하 的初声是带气流的 ㅎ。" },
      { type: "cloze", prompt: "补全以 ㅅ 开头的音节。", clozeText: "시 = ___ + ㅣ", answer: "ㅅ", choices: ["ㅅ", "ㅈ", "ㅎ", "ㅇ"], explain: "시 的初声是 ㅅ；在 ㅣ 前音色会稍靠近 sh。" },
      { type: "listen", prompt: "听音后选择以 ㅁ 开头的音节。", answer: "마", choices: ["나", "마", "라", "자"], speak: "마", explain: "마 的初声是双唇音 ㅁ。" },
      { type: "cloze", prompt: "补全音节的初声。", clozeText: "라 = ___ + ㅏ", answer: "ㄹ", choices: ["ㄴ", "ㄹ", "ㅁ", "ㅂ"], explain: "라 的初声是 ㄹ。" },
      { type: "dictation", prompt: "听音并输入对应的基础音节。", answer: "바", acceptable: ["바"], speak: "바", explain: "바 由 ㅂ + ㅏ 组成。" }
    ]
  },
  "l04-first-sentences": {
    teach: [{ title: "问名字并回应", body: "礼貌询问姓名可说 이름이 뭐예요?，回答仍用 저는 + 名字 + 예요/이에요。", speak: "이름이 뭐예요", examples: [{ ko: "이름이 뭐예요?", zh: "你叫什么名字？" }, { ko: "저는 왕밍이에요.", zh: "我是王明。" }] }],
    drills: [
      { type: "listen", prompt: "听自我介绍并选择说话人的名字。", answer: "민준", choices: ["리나", "민준", "지수", "수미"], speak: "저는 민준이에요", explain: "句中名字是 민준，有收音所以接 이에요。" },
      { type: "cloze", prompt: "补全自我介绍。", clozeText: "저는 리나___", answer: "예요", choices: ["이에요", "예요", "가요", "세요"], explain: "리나 没有收音，接 예요。" },
      { type: "dictation", prompt: "听问候语并完整输入。", answer: "안녕하세요", acceptable: ["안녕하세요"], speak: "안녕하세요", explain: "안녕하세요 是通用礼貌问候。" }
    ]
  },
  "l05-particles": {
    teach: [{ title: "有收音选 은/이", body: "名词有收音时用 은、이；无收音时用 는、가。先判断最后一个音节有没有收音。", speak: "책은, 학교는, 책이, 학교가", examples: [{ ko: "책은 있어요.", zh: "书呢，是有的。" }, { ko: "학교가 커요.", zh: "学校很大。" }] }],
    drills: [
      { type: "listen", prompt: "听句子后选择使用的主语助词。", answer: "가", choices: ["은", "는", "이", "가"], speak: "친구가 와요", explain: "친구 没有收音，表示新信息的主体时接 가。" },
      { type: "cloze", prompt: "补全话题助词。", clozeText: "저___ 학생이에요.", answer: "는", choices: ["은", "는", "이", "가"], explain: "저 没有收音，设定话题时用 는。" },
      { type: "type", prompt: "补全：비___ 와요.", answer: "가", acceptable: ["가"], explain: "비 没有收音，新出现的主体用 가。" },
      { type: "dictation", prompt: "听句子并输入完整韩语。", answer: "제가 학생이에요", acceptable: ["제가 학생이에요", "제가 학생이에요."], speak: "제가 학생이에요", explain: "回答“谁是学生”时，新信息主语 저 与 가 合成 제가。" }
    ]
  },
  "l06-cafe": { drills: [
    { type: "choice", prompt: "想在店里喝，应选择哪一句？", answer: "매장에서 마실게요.", choices: ["매장에서 마실게요.", "포장해 주세요.", "집에 가요.", "문자로 보내 주세요."], explain: "-(으)ㄹ게요 表示说话人当场作出的决定；这里由顾客说明自己会在店里喝。" },
    { type: "choice", prompt: "哪一句正确使用了 -(으)ㄹ게요？", answer: "제가 계산할게요.", choices: ["제가 계산할게요.", "민수가 계산할게요.", "어제 계산할게요.", "날씨가 좋을게요."], explain: "-(으)ㄹ게요 通常承诺或宣布说话人自己的决定，所以主语通常是第一人称。" },
    { type: "cloze", prompt: "补全点单句。", clozeText: "아메리카노 한 잔 ___", answer: "주세요", choices: ["주세요", "있어요", "가요", "아파요"], explain: "物品和数量后接 주세요 完成请求。" },
    { type: "dictation", prompt: "听店员常用点单句并输入。", answer: "포장해 주세요", acceptable: ["포장해 주세요", "포장해 주세요."], speak: "포장해 주세요", explain: "포장해 주세요 表示请打包。" }
  ] },
  "l07-location": { drills: [
    { type: "listen", prompt: "听句子并选择动作发生的地点。", answer: "图书馆", choices: ["学校", "图书馆", "家", "车站"], speak: "도서관에서 공부해요", explain: "도서관에서 表示在图书馆做学习这个动作。" },
    { type: "cloze", prompt: "补全动作地点助词。", clozeText: "카페___ 커피를 마셔요.", answer: "에서", choices: ["에", "에서", "이", "를"], explain: "喝咖啡是动作，发生地点用 에서。" },
    { type: "dictation", prompt: "听位置问句并输入完整韩语。", answer: "화장실이 어디예요", acceptable: ["화장실이 어디예요", "화장실이 어디예요?"], speak: "화장실이 어디예요", explain: "询问洗手间在哪里用 화장실이 어디예요?。" }
  ] },
  "l11-shopping-price": { drills: [
    { type: "listen", prompt: "听价格并选择正确金额。", answer: "五千韩元", choices: ["五百韩元", "五千韩元", "一万韩元", "五万韩元"], speak: "오천 원이에요", explain: "오천 원 是五千韩元。" },
    { type: "cloze", prompt: "补全询价句。", clozeText: "이거 ___예요?", answer: "얼마", choices: ["얼마", "어디", "누구", "언제"], explain: "얼마예요? 用来问价格。" },
    { type: "dictation", prompt: "听购物请求并输入完整韩语。", answer: "두 개 주세요", acceptable: ["두 개 주세요", "두 개 주세요."], speak: "두 개 주세요", explain: "두 개 주세요 表示请给我两个。" }
  ] },
  "l15-comparison": { drills: [
    { type: "listen", prompt: "听句子并选择说话人更喜欢的饮品。", answer: "茶", choices: ["咖啡", "茶", "水", "牛奶"], speak: "커피보다 차가 더 좋아요", explain: "A보다 B가 더 좋아요 中更喜欢的是 B，也就是 차。" },
    { type: "cloze", prompt: "补全比较句。", clozeText: "버스___ 지하철이 더 빨라요.", answer: "보다", choices: ["보다", "에서", "하고", "까지"], explain: "버스보다 把公交车设为比较基准。" },
    { type: "dictation", prompt: "听最高级评价并输入完整韩语。", answer: "이게 제일 좋아요", acceptable: ["이게 제일 좋아요", "이게 제일 좋아요."], speak: "이게 제일 좋아요", explain: "제일 좋아요 表示最好或最合心意。" }
  ] },
  "l16-because": { drills: [
    { type: "listen", prompt: "听句子并选择没去的原因。", answer: "没有时间", choices: ["没有时间", "天气很好", "价格便宜", "想去旅行"], speak: "시간이 없어서 못 갔어요", explain: "시간이 없어서 表示因为没有时间。" },
    { type: "cloze", prompt: "补全原因连接。", clozeText: "피곤___ 일찍 잤어요.", answer: "해서", choices: ["해서", "지만", "보다", "부터"], explain: "피곤하다 与 -아서 结合为 피곤해서。" },
    { type: "dictation", prompt: "听结果连接句并输入完整韩语。", answer: "그래서 집에 있었어요", acceptable: ["그래서 집에 있었어요", "그래서 집에 있었어요."], speak: "그래서 집에 있었어요", explain: "그래서 放在结果句开头表示所以。" }
  ] },
  "l17-phone-message": { drills: [
    { type: "listen", prompt: "听请求并选择对方需要做什么。", answer: "再慢慢说一遍", choices: ["再慢慢说一遍", "发送咖啡", "马上挂断", "更换商品"], speak: "천천히 다시 말씀해 주세요", explain: "천천히 是慢慢地，다시 是再一次。" },
    { type: "cloze", prompt: "补全短信请求。", clozeText: "주소를 문자로 보내 ___", answer: "주세요", choices: ["주세요", "있어요", "봤어요", "싶어요"], explain: "-아/어 주세요 用于请对方为自己做某事。" },
    { type: "dictation", prompt: "听电话开场并输入。", answer: "여보세요", acceptable: ["여보세요", "여보세요?"], speak: "여보세요", explain: "电话开场使用 여보세요。" }
  ] },
  "l18-health": { drills: [
    { type: "listen", prompt: "听症状并选择不舒服的部位。", answer: "嗓子", choices: ["头", "嗓子", "肚子", "腿"], speak: "목이 아파요", explain: "목 表示脖子或嗓子。" },
    { type: "cloze", prompt: "补全病程表达。", clozeText: "어제___ 아팠어요.", answer: "부터", choices: ["부터", "보다", "하고", "에서"], explain: "어제부터 表示从昨天开始。" },
    { type: "dictation", prompt: "听药店请求并输入完整韩语。", answer: "감기약 주세요", acceptable: ["감기약 주세요", "감기약 주세요."], speak: "감기약 주세요", explain: "감기약 是感冒药。" }
  ] },
  "l19-family-honorific": { drills: [
    { type: "listen", prompt: "听句子并选择正在休息的人。", answer: "爷爷", choices: ["爷爷", "朋友", "弟弟", "说话人"], speak: "할아버지가 쉬세요", explain: "할아버지 是爷爷，쉬세요 是带尊敬的休息。" },
    { type: "cloze", prompt: "补全礼貌请求。", clozeText: "여기 앉___", answer: "으세요", choices: ["으세요", "았어요", "고 싶어요", "지 마세요"], explain: "앉다 有收音，接 으세요。" },
    { type: "dictation", prompt: "听家庭句并输入完整韩语。", answer: "부모님과 같이 살아요", acceptable: ["부모님과 같이 살아요", "부모님과 같이 살아요."], speak: "부모님과 같이 살아요", explain: "부모님과 表示和父母，같이 살아요 表示一起生活。" }
  ] },
  "l20-invitation": { drills: [
    { type: "listen", prompt: "听邀请并选择活动。", answer: "看电影", choices: ["看电影", "买衣服", "去医院", "打电话"], speak: "주말에 같이 영화 볼래요", explain: "영화 볼래요? 是邀请看电影。" },
    { type: "cloze", prompt: "补全询问意愿的句尾。", clozeText: "같이 커피 마실___?", answer: "래요", choices: ["래요", "었어요", "지만", "부터"], explain: "마시다 的词干无收音，接 ㄹ래요。" },
    { type: "dictation", prompt: "听时间确认句并输入完整韩语。", answer: "토요일에 시간 괜찮아요", acceptable: ["토요일에 시간 괜찮아요", "토요일에 시간 괜찮아요?"], speak: "토요일에 시간 괜찮아요", explain: "这句话用于确认星期六是否方便。" }
  ] }
};

export function completeLessons(lessons) {
  return lessons.map((lesson) => {
    const extra = additions[lesson.id];
    return {
      ...lesson,
      teach: [
        ...(replacementTeach[lesson.id] ?? [...(lesson.teach ?? []), ...(extra?.teach ?? [])]),
        ...(depthTeach[lesson.id] ?? [])
      ],
      drills: [...(lesson.drills ?? []), ...(extra?.drills ?? []), ...(depthDrills[lesson.id] ?? [])]
    };
  });
}
