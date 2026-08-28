export interface ImmersionLine {
  ko: string;
  zh: string;
  note: string;
}

export interface ImmersionMaterial {
  id: string;
  level: "foundation" | "growth" | "native";
  kind: "dialogue" | "news" | "social" | "essay";
  title: string;
  sourceLabel: string;
  minutes: number;
  focus: string[];
  summary: string;
  lines: ImmersionLine[];
  dictation: string[];
  retellPrompts: string[];
  outputMission: string;
  requiredLessons: string[];
  recommendedLessons: string[];
  selfCheck: string[];
}

export function immersionMaterialHref(materialId: string) {
  return `/immersion?material=${encodeURIComponent(materialId)}`;
}

export function getMissingMaterialPrerequisiteIds(
  material: Pick<ImmersionMaterial, "requiredLessons">,
  masteredLessonIds?: Iterable<string> | null
) {
  const mastered = new Set(masteredLessonIds ?? []);
  return material.requiredLessons.filter((lessonId) => !mastered.has(lessonId));
}

export const immersionMaterials: ImmersionMaterial[] = [
  {
    id: "im-cafe-real-speed",
    level: "foundation",
    kind: "dialogue",
    title: "咖啡店真实语速点单",
    sourceLabel: "생활 대화",
    minutes: 14,
    focus: ["listening", "pragmatics", "vocabulary"],
    summary: "从店员快速问句中抓饮品、冷热、数量、外带和付款方式。",
    lines: [
      { ko: "어서 오세요. 뭐 드릴까요?", zh: "欢迎光临。您要点什么？", note: "드릴까요 是服务场景常用问句。" },
      { ko: "아이스 아메리카노 하나 포장해 주세요.", zh: "请给我一杯冰美式，打包。", note: "아아 是口语缩略，但初学先说全。" },
      { ko: "시럽은 넣어 드릴까요?", zh: "需要给您加糖浆吗？", note: "넣어 드리다 是替顾客做动作。" },
      { ko: "아니요, 괜찮아요. 카드로 계산할게요.", zh: "不用，没关系。我刷卡结账。", note: "괜찮아요 可表示婉拒。" }
    ],
    dictation: ["뭐 드릴까요?", "포장해 주세요.", "카드로 계산할게요."],
    retellPrompts: ["点了什么？", "有没有加糖浆？", "怎么付款？"],
    outputMission: "用韩语录/写一段你自己的咖啡店点单，必须包含饮品、数量、冷热、付款方式。",
    requiredLessons: ["l37-numbers-counters", "l06-cafe", "l11-shopping-price"],
    recommendedLessons: ["l06-cafe", "l11-shopping-price"],
    selfCheck: ["是否先说核心名词再说数量", "是否使用 주세요 或 드릴까요", "是否能不看中文复述交易流程"]
  },
  {
    id: "im-subway-directions",
    level: "foundation",
    kind: "dialogue",
    title: "地铁站问路与换乘",
    sourceLabel: "길 묻기",
    minutes: 15,
    focus: ["listening", "travel", "pragmatics"],
    summary: "在陌生城市里抓住站名、方向、换乘和礼貌确认，不被整句速度吓住。",
    lines: [
      { ko: "홍대입구역은 어디에서 타면 돼요?", zh: "去弘大入口站要在哪里坐车？", note: "-에서 타다 表示从某处上车。" },
      { ko: "이쪽으로 가서 2호선으로 갈아타세요.", zh: "往这边走，然后换乘 2 号线。", note: "갈아타세요 是换乘时最常听到的指令。" },
      { ko: "몇 정거장 가야 해요?", zh: "要坐几站？", note: "몇 정거장 是问站数的固定组合。" },
      { ko: "세 정거장만 가면 돼요. 안내 방송을 잘 들으세요.", zh: "只坐三站就可以。请注意听广播。", note: "만 가면 돼요 表示只要做到这个条件就行。" }
    ],
    dictation: ["어디에서 타면 돼요?", "2호선으로 갈아타세요.", "세 정거장만 가면 돼요."],
    retellPrompts: ["目的地是哪一站？", "需要换乘哪条线？", "一共要坐几站？"],
    outputMission: "用韩语写一段问路对话：目的地、换乘路线、站数、感谢都要出现。",
    requiredLessons: ["l37-numbers-counters", "l07-location", "l40-requests", "l09-connectors", "l12-time-plans", "l42-ability-obligation"],
    recommendedLessons: ["l07-location", "l12-time-plans"],
    selfCheck: ["是否说清楚 목적지", "是否能区分 타다 和 갈아타다", "是否用 주세요/감사합니다 保持礼貌"]
  },
  {
    id: "im-convenience-payment",
    level: "foundation",
    kind: "dialogue",
    title: "便利店结账与袋子",
    sourceLabel: "편의점 계산",
    minutes: 13,
    focus: ["listening", "vocabulary", "pragmatics"],
    summary: "练习数量、是否需要袋子、支付方式和收据，建立日常交易的反应速度。",
    lines: [
      { ko: "봉투 필요하세요?", zh: "需要袋子吗？", note: "필요하세요 是服务人员问需求的敬语。" },
      { ko: "아니요, 괜찮아요. 이것만 계산해 주세요.", zh: "不用，没关系。只结这个就好。", note: "이것만 把范围限定为“只有这个”。" },
      { ko: "영수증 드릴까요?", zh: "要给您收据吗？", note: "영수증 是收据，常和 드릴까요 连用。" },
      { ko: "네, 영수증도 같이 주세요.", zh: "好的，收据也一起给我。", note: "도 같이 表示也一起。" }
    ],
    dictation: ["봉투 필요하세요?", "이것만 계산해 주세요.", "영수증도 같이 주세요."],
    retellPrompts: ["店员先问了什么？", "顾客买了多少东西？", "顾客要不要收据？"],
    outputMission: "用韩语写 4 句便利店结账：袋子、付款、收据和感谢。",
    requiredLessons: ["l37-numbers-counters", "l06-cafe", "l11-shopping-price"],
    recommendedLessons: ["l06-cafe", "l11-shopping-price"],
    selfCheck: ["是否能听出 봉투/영수증", "是否用 만 限定数量", "是否能自然回答 필요하세요"]
  },
  {
    id: "im-pharmacy-symptoms",
    level: "foundation",
    kind: "dialogue",
    title: "药店说明症状",
    sourceLabel: "약국 대화",
    minutes: 17,
    focus: ["listening", "vocabulary", "grammar"],
    summary: "把“哪里不舒服、从什么时候开始、需要什么药”拆成可说的短句。",
    lines: [
      { ko: "목이 아프고 기침이 조금 나요.", zh: "喉咙痛，而且有点咳嗽。", note: "-고 连接两个症状。" },
      { ko: "언제부터 그랬어요?", zh: "从什么时候开始这样？", note: "언제부터 是询问起点时间。" },
      { ko: "어제 밤부터요. 감기약이 있을까요?", zh: "从昨晚开始。会有感冒药吗？", note: "-이 있을까요 是更柔和地询问是否有。" },
      { ko: "식사 후에 하루 세 번 드세요.", zh: "饭后一天吃三次。", note: "식사 후에 和 하루 세 번 是服药说明核心。" }
    ],
    dictation: ["목이 아프고 기침이 조금 나요.", "어제 밤부터요.", "하루 세 번 드세요."],
    retellPrompts: ["顾客有什么症状？", "症状从什么时候开始？", "药应该怎么吃？"],
    outputMission: "用韩语写一段在药店说明症状的对话，包含症状、开始时间和服用频率。",
    requiredLessons: ["l37-numbers-counters", "l09-connectors", "l16-because", "l18-health", "l19-family-honorific"],
    recommendedLessons: ["l18-health", "l16-because"],
    selfCheck: ["是否用 -고 连接症状", "是否说清楚 언제부터", "是否能听懂 하루 세 번"]
  },
  {
    id: "im-hotel-checkin",
    level: "foundation",
    kind: "dialogue",
    title: "住宿入住与请求",
    sourceLabel: "숙소 체크인",
    minutes: 16,
    focus: ["listening", "travel", "pragmatics"],
    summary: "完成姓名确认、预约、入住时间和简单请求，让旅行第一天不慌。",
    lines: [
      { ko: "예약하신 성함이 어떻게 되세요?", zh: "请问预约姓名是什么？", note: "성함 是姓名的敬语说法。" },
      { ko: "왕리 이름으로 예약했어요.", zh: "我用王丽的名字预约了。", note: "이름으로 예약하다 表示用某个名字预约。" },
      { ko: "체크인은 세 시부터 가능합니다.", zh: "入住从三点开始可以办理。", note: "事物作主语时用 가능합니다，不给 체크인 添加主体敬语。" },
      { ko: "짐을 먼저 맡길 수 있을까요?", zh: "可以先寄放行李吗？", note: "맡길 수 있을까요 是礼貌请求。" }
    ],
    dictation: ["예약하신 성함이 어떻게 되세요?", "세 시부터 가능합니다.", "짐을 먼저 맡길 수 있을까요?"],
    retellPrompts: ["预约用的名字是什么？", "几点可以入住？", "客人想先做什么？"],
    outputMission: "用韩语写一段入住对话：预约姓名、入住时间、寄放行李请求。",
    requiredLessons: ["l07-location", "l38-time-date", "l08-past", "l13-permission", "l42-ability-obligation", "l27-honorific-register"],
    recommendedLessons: ["l07-location", "l13-permission"],
    selfCheck: ["是否能说 이름으로 예약했어요", "是否听出 -부터 가능합니다", "是否用 수 있을까요 提请求"]
  },
  {
    id: "im-weekend-plan",
    level: "growth",
    kind: "dialogue",
    title: "约周末计划和改期",
    sourceLabel: "친구 대화",
    minutes: 16,
    focus: ["pragmatics", "grammar", "native"],
    summary: "练习邀请、确认方便、说明已有安排和提出替代时间。",
    lines: [
      { ko: "이번 주말에 시간 괜찮아요?", zh: "这周末时间方便吗？", note: "괜찮아요 用来确认是否方便。" },
      { ko: "토요일은 약속이 있어서 조금 힘들 것 같아요.", zh: "周六有约，所以可能有点困难。", note: "힘들 것 같아요 是柔和拒绝。" },
      { ko: "그럼 일요일 점심은 어때요?", zh: "那周日午饭怎么样？", note: "어때요 是提出方案。" },
      { ko: "좋아요. 그때 봐요.", zh: "好。那时候见。", note: "그때 指双方刚确认的时间。" }
    ],
    dictation: ["시간 괜찮아요?", "조금 힘들 것 같아요.", "일요일 점심은 어때요?"],
    retellPrompts: ["谁提出邀请？", "为什么周六不行？", "最终约在什么时候？"],
    outputMission: "用韩语写一段你拒绝某个时间但给出替代方案的对话。",
    requiredLessons: ["l38-time-date", "l16-because", "l20-invitation", "l10-native-softeners", "l28-soft-refusal"],
    recommendedLessons: ["l20-invitation", "l10-native-softeners"],
    selfCheck: ["是否先缓冲再拒绝", "是否给出理由", "是否提出替代时间"]
  },
  {
    id: "im-slow-news-climate",
    level: "growth",
    kind: "news",
    title: "慢速新闻：城市降温政策",
    sourceLabel: "느린 뉴스",
    minutes: 20,
    focus: ["media", "grammar", "discourse"],
    summary: "用标题、地点、动作和原因抓住新闻第一段，不逐词翻译。",
    lines: [
      { ko: "서울시는 여름 폭염에 대비해 그늘막을 추가로 설치한다고 발표했습니다.", zh: "首尔市宣布，为应对夏季酷暑，将追加设置遮阳设施。", note: "발표했습니다 是新闻报道高频谓词。" },
      { ko: "시민들은 버스 정류장에서 더 안전하게 기다릴 수 있습니다.", zh: "市民可以在公交站更安全地等待。", note: "-(으)ㄹ 수 있습니다 用正式体说明可实现的结果。" },
      { ko: "전문가들은 작은 변화도 체감 온도를 낮추는 데 도움이 된다고 말했습니다.", zh: "专家表示，小变化也有助于降低体感温度。", note: "다고 말했습니다 是转述。" }
    ],
    dictation: ["서울시는 발표했습니다.", "안전하게 기다릴 수 있습니다.", "도움이 된다고 말했습니다."],
    retellPrompts: ["谁宣布了什么？", "措施的目的是什么？", "专家怎么看？"],
    outputMission: "用 3 句韩语复述这条新闻：主体、措施、原因/评价。",
    requiredLessons: ["l39-hamnida", "l42-ability-obligation", "l43-adnominal", "l21-slow-news", "l25-retelling", "l26-indirect-speech"],
    recommendedLessons: ["l21-slow-news", "l25-retelling"],
    selfCheck: ["是否抓住主体和动作", "是否使用原因或目的结构", "是否能用自己的词复述而不是背原句"]
  },
  {
    id: "im-apartment-repair",
    level: "growth",
    kind: "dialogue",
    title: "公寓维修请求",
    sourceLabel: "관리실 통화",
    minutes: 19,
    focus: ["pragmatics", "grammar", "vocabulary"],
    summary: "把问题现象、发生时间、希望处理方式说清楚，并保留礼貌语气。",
    lines: [
      { ko: "욕실 전등이 어제부터 계속 깜빡거려요.", zh: "浴室灯从昨天开始一直闪。", note: "계속 + 动词 表示持续发生。" },
      { ko: "사용하는 데 위험할 수도 있어서 확인 부탁드립니다.", zh: "使用时可能会危险，所以麻烦确认一下。", note: "-는 데 表示在某个使用场景中。" },
      { ko: "오늘 오후에 기사님을 보내 드릴게요.", zh: "今天下午给您派维修师傅过去。", note: "보내 드릴게요 是服务方承诺处理。" },
      { ko: "부재중이면 문 앞에 연락처를 남겨 주세요.", zh: "如果我不在，请在门口留下联系方式。", note: "부재중이면 是“如果不在”的书面/服务表达。" }
    ],
    dictation: ["계속 깜빡거려요.", "확인 부탁드립니다.", "연락처를 남겨 주세요."],
    retellPrompts: ["哪里出了问题？", "为什么需要处理？", "如果不在家要怎么做？"],
    outputMission: "用韩语写一段维修请求：现象、风险、希望时间、无法见面时的安排。",
    requiredLessons: ["l38-time-date", "l39-hamnida", "l13-permission", "l42-ability-obligation", "l16-because", "l17-phone-message", "l27-honorific-register"],
    recommendedLessons: ["l13-permission", "l17-phone-message"],
    selfCheck: ["是否说明从什么时候开始", "是否使用 부탁드립니다 降低强硬感", "是否提出可执行安排"]
  },
  {
    id: "im-clinic-appointment",
    level: "growth",
    kind: "dialogue",
    title: "诊所预约与改时间",
    sourceLabel: "병원 접수",
    minutes: 18,
    focus: ["listening", "pragmatics", "grammar"],
    summary: "在电话里听懂可预约时段，说明不方便，并快速确认新时间。",
    lines: [
      { ko: "오늘 오후 네 시에 진료 예약이 가능합니다.", zh: "今天下午四点可以预约看诊。", note: "预约作主语时用 가능합니다；不对事物使用 -(으)시-。" },
      { ko: "제가 그 시간에는 회의가 있어서 어렵습니다.", zh: "我那个时间有会议，所以不太方便。", note: "-가 있어서 어렵습니다 是礼貌说明困难。" },
      { ko: "그럼 내일 오전 열 시는 어떠세요?", zh: "那明天上午十点怎么样？", note: "어떠세요 比 어때요 更正式。" },
      { ko: "네, 내일 오전 열 시로 예약 부탁드립니다.", zh: "好的，请帮我预约明天上午十点。", note: "-로 예약 表示预约到某个时段。" }
    ],
    dictation: ["진료 예약이 가능합니다.", "회의가 있어서 어렵습니다.", "열 시로 예약 부탁드립니다."],
    retellPrompts: ["原本给了几点？", "为什么那个时间不行？", "最终预约在什么时候？"],
    outputMission: "用韩语写一段电话预约：拒绝一个时段，并确认另一个时段。",
    requiredLessons: ["l38-time-date", "l39-hamnida", "l13-permission", "l16-because", "l17-phone-message", "l18-health", "l27-honorific-register", "l28-soft-refusal"],
    recommendedLessons: ["l17-phone-message", "l18-health"],
    selfCheck: ["是否用正式语尾", "是否给出不方便的原因", "是否用 -로 예약 确认时间"]
  },
  {
    id: "im-group-chat-schedule",
    level: "growth",
    kind: "social",
    title: "群聊协调聚会时间",
    sourceLabel: "단톡방",
    minutes: 17,
    focus: ["native", "pragmatics", "discourse"],
    summary: "理解群聊里的省略、投票式提议和轻松确认，避免说得像正式邮件。",
    lines: [
      { ko: "이번 주 금요일 저녁 괜찮은 사람?", zh: "这周五晚上方便的人？", note: "群聊常省略完整句尾，语气轻松。" },
      { ko: "저는 7시 이후면 가능해요.", zh: "我七点以后可以。", note: "-이후면 가능해요 表示条件。" },
      { ko: "그럼 7시 반쯤 홍대에서 볼까요?", zh: "那七点半左右在弘大见怎么样？", note: "-쯤 让时间不那么僵硬。" },
      { ko: "좋아요. 장소는 제가 찾아보고 공유할게요.", zh: "好。地点我找一下再分享。", note: "찾아보고 공유할게요 是先做再分享。" }
    ],
    dictation: ["괜찮은 사람?", "7시 이후면 가능해요.", "찾아보고 공유할게요."],
    retellPrompts: ["大家在协调什么？", "谁几点以后可以？", "谁负责找地点？"],
    outputMission: "用韩语写一段群聊：提出时间、说明自己可行时段、确认地点分工。",
    requiredLessons: ["l07-location", "l38-time-date", "l09-connectors", "l12-time-plans", "l42-ability-obligation", "l20-invitation", "l23-social-posts"],
    recommendedLessons: ["l20-invitation", "l23-social-posts"],
    selfCheck: ["是否能使用轻松省略", "是否有 이후면/쯤 这样的弹性表达", "是否能自然承担下一步"]
  },
  {
    id: "im-weather-alert-news",
    level: "growth",
    kind: "news",
    title: "天气提醒：强雨与通勤",
    sourceLabel: "생활 뉴스",
    minutes: 21,
    focus: ["media", "listening", "discourse"],
    summary: "训练新闻提醒里的时间、区域、建议行动，建立听关键信息的顺序。",
    lines: [
      { ko: "내일 아침 수도권에는 강한 비가 내릴 것으로 예상됩니다.", zh: "预计明早首都圈将有强降雨。", note: "-것으로 예상됩니다 是新闻预测表达。" },
      { ko: "출근 시간대에는 지하철과 버스 이용객이 늘어날 수 있습니다.", zh: "上班时段地铁和公交乘客可能增加。", note: "-ㄹ 수 있습니다 表示可能性。" },
      { ko: "우산을 준비하고 평소보다 조금 일찍 출발하는 것이 좋겠습니다.", zh: "建议准备雨伞，并比平时稍早出发。", note: "-는 것이 좋겠습니다 是正式建议。" }
    ],
    dictation: ["강한 비가 내릴 것으로 예상됩니다.", "이용객이 늘어날 수 있습니다.", "조금 일찍 출발하는 것이 좋겠습니다."],
    retellPrompts: ["天气会怎样？", "哪个时段可能受影响？", "新闻建议怎么做？"],
    outputMission: "用 3 句韩语写一条生活天气提醒：天气、影响、建议行动。",
    requiredLessons: ["l39-hamnida", "l09-connectors", "l42-ability-obligation", "l16-because", "l43-adnominal", "l21-slow-news"],
    recommendedLessons: ["l21-slow-news", "l16-because"],
    selfCheck: ["是否抓住时间和地区", "是否使用可能性表达", "是否能把建议说成正式语体"]
  },
  {
    id: "im-social-review",
    level: "native",
    kind: "social",
    title: "社交媒体：看剧短评",
    sourceLabel: "SNS 댓글",
    minutes: 18,
    focus: ["native", "media", "pragmatics"],
    summary: "识别省略、情绪副词和让步式评价，写出不突兀的评论。",
    lines: [
      { ko: "처음엔 그냥 그랬는데 갈수록 몰입됐어요.", zh: "一开始一般，但越看越投入。", note: "그냥 그랬다 是温和的一般。" },
      { ko: "배우들 연기가 진짜 자연스럽더라고요.", zh: "演员们的表演真的很自然。", note: "-더라고요 表示亲身发现。" },
      { ko: "결말은 살짝 아쉽긴 했지만 그래도 추천해요.", zh: "结局稍微有点遗憾，但还是推荐。", note: "-긴 했지만 是让步后转折。" }
    ],
    dictation: ["갈수록 몰입됐어요.", "진짜 자연스럽더라고요.", "살짝 아쉽긴 했지만"],
    retellPrompts: ["一开始感觉如何？", "后来为什么变好？", "最终是否推荐？"],
    outputMission: "用韩语写一条 2-3 句短评，包含一个让步和一个推荐/不推荐理由。",
    requiredLessons: ["l08-past", "l09-connectors", "l22-media-shadowing", "l23-social-posts", "l24-opinion-paragraph"],
    recommendedLessons: ["l22-media-shadowing", "l23-social-posts"],
    selfCheck: ["是否用了情绪强度合适的副词", "是否有让步结构", "是否避免只有 좋다/재미있다 的单薄评价"]
  },
  {
    id: "im-work-feedback",
    level: "native",
    kind: "dialogue",
    title: "工作反馈：不伤人的修改建议",
    sourceLabel: "업무 피드백",
    minutes: 22,
    focus: ["native", "pragmatics", "discourse"],
    summary: "学习用肯定、观察、建议的顺序指出问题，避免生硬否定。",
    lines: [
      { ko: "전체적으로 방향은 좋은데, 도입 부분이 조금 길게 느껴져요.", zh: "整体方向不错，但开头部分感觉稍微有点长。", note: "좋은데 先承认优点再转向。" },
      { ko: "핵심 메시지를 앞에 두면 더 잘 보일 것 같아요.", zh: "如果把核心信息放前面，应该会更清楚。", note: "것 같아요 降低断言。" },
      { ko: "제가 한번 구조를 정리해서 보내 드릴게요.", zh: "我整理一下结构后发给您。", note: "드릴게요 表示为对方做。" }
    ],
    dictation: ["전체적으로 방향은 좋은데", "더 잘 보일 것 같아요", "보내 드릴게요"],
    retellPrompts: ["先肯定了什么？", "指出了什么问题？", "提出了什么帮助？"],
    outputMission: "用韩语把一句直接批评改写成柔和反馈：先肯定，再观察，再建议。",
    requiredLessons: ["l09-connectors", "l42-ability-obligation", "l27-honorific-register", "l10-native-softeners"],
    recommendedLessons: ["l27-honorific-register", "l10-native-softeners"],
    selfCheck: ["是否避免直接 틀렸어요", "是否使用 것 같아요/조금 等缓冲", "是否给出下一步而不只是评价"]
  },
  {
    id: "im-podcast-opinion",
    level: "native",
    kind: "essay",
    title: "播客独白：效率和休息",
    sourceLabel: "팟캐스트",
    minutes: 23,
    focus: ["native", "discourse", "listening"],
    summary: "听出说话人如何先承认常见观点，再转向自己的立场和例子。",
    lines: [
      { ko: "많은 사람들이 쉬는 시간을 낭비라고 생각하지만, 저는 조금 다르게 봐요.", zh: "很多人把休息时间看作浪费，但我稍微有不同看法。", note: "다르게 봐요 表示从不同角度看。" },
      { ko: "오히려 잠깐 멈췄을 때 중요한 문제가 더 잘 보여요.", zh: "反而短暂停下来时，更能看清重要问题。", note: "오히려 表示结果和常见预想相反。" },
      { ko: "그래서 저는 매일 일부러 아무 일정도 잡지 않고 쉬는 시간을 가지려고 해요.", zh: "所以我每天都会刻意留出一段不安排任何事情的休息时间。", note: "일부러 表示有意识地、刻意地。" }
    ],
    dictation: ["조금 다르게 봐요.", "중요한 문제가 더 잘 보여요.", "일부러 아무 일정도 잡지 않고 쉬는 시간을 가지려고 해요."],
    retellPrompts: ["常见观点是什么？", "说话人为什么不同意？", "说话人具体怎么做？"],
    outputMission: "用韩语写 4 句观点独白：常见看法、你的不同意见、理由、自己的做法。",
    requiredLessons: ["l09-connectors", "l45-desire-intent", "l43-adnominal", "l24-opinion-paragraph", "l26-indirect-speech", "l29-abstract-discussion"],
    recommendedLessons: ["l24-opinion-paragraph", "l29-abstract-discussion"],
    selfCheck: ["是否先承接他人观点", "是否使用 오히려 转换立场", "是否给出个人例子"]
  },
  {
    id: "im-news-comment-thread",
    level: "native",
    kind: "social",
    title: "新闻评论区：立场不撕裂",
    sourceLabel: "댓글 토론",
    minutes: 20,
    focus: ["native", "media", "pragmatics"],
    summary: "练习在不同意见里保留边界，用“部分同意 + 条件 + 担忧”表达立场。",
    lines: [
      { ko: "취지는 이해하지만 실행 방식은 조금 더 논의가 필요해 보여요.", zh: "初衷我理解，但执行方式看起来还需要更多讨论。", note: "취지는 이해하지만 是降低对立的开头。" },
      { ko: "특히 비용 부담이 분명하지 않아서 걱정돼요.", zh: "尤其是费用负担不明确，所以令人担心。", note: "-지 않아서 用已经学过的原因连接担忧。" },
      { ko: "그래도 방향 자체는 의미가 있다고 생각합니다.", zh: "不过方向本身我认为是有意义的。", note: "그래도 保留认可，避免全盘否定。" }
    ],
    dictation: ["취지는 이해하지만", "비용 부담이 분명하지 않아서 걱정돼요.", "의미가 있다고 생각합니다."],
    retellPrompts: ["评论者同意什么？", "担心什么？", "最后保留了什么认可？"],
    outputMission: "用韩语写一条评论：先部分同意，再提出担忧，最后保留建设性态度。",
    requiredLessons: ["l39-hamnida", "l09-connectors", "l16-because", "l43-adnominal", "l23-social-posts", "l24-opinion-paragraph", "l26-indirect-speech", "l29-abstract-discussion"],
    recommendedLessons: ["l23-social-posts", "l29-abstract-discussion"],
    selfCheck: ["是否避免绝对化", "是否把担忧说成 구체적인 점", "是否有 그래도/다만 这样的转折"]
  },
  {
    id: "im-academic-seminar-question",
    level: "native",
    kind: "dialogue",
    title: "研讨会提问：礼貌挑战观点",
    sourceLabel: "세미나 Q&A",
    minutes: 25,
    focus: ["native", "grammar", "discourse"],
    summary: "把尖锐问题包装成确认、限定和补充问题，训练高级场合的关系管理。",
    lines: [
      { ko: "말씀하신 부분은 이해했는데, 한 가지 확인하고 싶은 점이 있습니다.", zh: "您说的部分我理解了，但有一点想确认。", note: "先承接再提问，减少对抗。" },
      { ko: "자료가 서울 지역에만 있습니다. 다른 지역에도 같은 결론을 적용할 수 있을까요?", zh: "资料只限于首尔地区。能否把同样结论应用到其他地区？", note: "先陈述限制，再用 수 있을까요 礼貌询问可否推广。" },
      { ko: "혹시 그 부분에 대한 추가 분석 계획도 궁금합니다.", zh: "也想了解关于这部分的追加分析计划。", note: "혹시 和 궁금합니다 让追问保持礼貌。" }
    ],
    dictation: ["확인하고 싶은 점이 있습니다.", "같은 결론을 적용할 수 있을까요?", "추가 분석 계획도 궁금합니다."],
    retellPrompts: ["提问者先做了什么缓冲？", "问题的条件是什么？", "最后追问了什么？"],
    outputMission: "用韩语把一个直接质疑改写成研讨会提问：承接、限定条件、礼貌追问。",
    requiredLessons: ["l39-hamnida", "l09-connectors", "l42-ability-obligation", "l45-desire-intent", "l43-adnominal", "l27-honorific-register", "l29-abstract-discussion"],
    recommendedLessons: ["l27-honorific-register", "l29-abstract-discussion"],
    selfCheck: ["是否先承接对方观点", "是否用 조건절 限定问题", "是否避免 단정적인 반박"]
  },
  {
    id: "im-opinion-mini-essay",
    level: "native",
    kind: "essay",
    title: "观点短文：学习语言为什么难",
    sourceLabel: "짧은 글",
    minutes: 24,
    focus: ["native", "grammar", "discourse"],
    summary: "从观点、理由、例子到小结，搭建一段抽象表达。",
    lines: [
      { ko: "제 생각에는 언어를 배우는 것은 단어를 외우는 것보다 훨씬 복잡해요.", zh: "在我看来，学习语言比背单词复杂得多。", note: "-는 것 名词化承载抽象话题。" },
      { ko: "왜냐하면 표현은 항상 맥락과 관계 속에서 달라지기 때문이에요.", zh: "因为表达总会随语境和关系而变化。", note: "-기 때문이에요 是明确原因。" },
      { ko: "그래서 저는 매일 조금씩 듣고, 따라 하고, 직접 말해 보는 과정이 중요하다고 생각해요.", zh: "所以我认为每天一点点听、跟读、亲自说的过程很重要。", note: "다고 생각해요 表达观点。" }
    ],
    dictation: ["단어를 외우는 것보다", "맥락과 관계 속에서", "중요하다고 생각해요"],
    retellPrompts: ["作者的观点是什么？", "理由是什么？", "作者推荐什么过程？"],
    outputMission: "写 4 句韩语观点段：제 생각에는 + 왜냐하면 + 예를 들면 + 그래서。",
    requiredLessons: ["l09-connectors", "l15-comparison", "l16-because", "l43-adnominal", "l24-opinion-paragraph", "l26-indirect-speech", "l30-native-capstone"],
    recommendedLessons: ["l24-opinion-paragraph", "l30-native-capstone"],
    selfCheck: ["是否有清楚观点", "是否有原因和例子", "是否使用至少一个名词化或转述结构"]
  }
];

export const outputRubric = [
  { id: "structure", title: "结构", detail: "信息是否有顺序：背景、动作、原因、结果。" },
  { id: "accuracy", title: "准确", detail: "核心助词、时态、敬语是否不会误导意思。" },
  { id: "naturalness", title: "自然", detail: "是否用了韩语常见表达，而不是中文顺序硬翻。" },
  { id: "register", title: "语气", detail: "是否根据对象和场合调整了直接程度。" }
];
