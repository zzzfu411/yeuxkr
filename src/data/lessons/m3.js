export const m3Lessons = [
  {
    id: "l44-passive-causative",
    order: 34,
    milestone: "m3",
    title: "被动与使动入门",
    subtitle: "보이다, 들리다, 먹이다, -아/어지다。",
    duration: 20,
    focus: [
      "grammar",
      "listening"
    ],
    objectives: [
      "认出并理解 이/히/리/기 被动动词",
      "会用 들려요/보여요 说出听得见、看得见",
      "区分高频使动词 먹이다/입히다/알리다 与原动词",
      "用 -아/어지다 描述状态变化"
    ],
    teach: [
      {
        title: "被动四兄弟 이/히/리/기",
        body: "韩语一部分动词在词干后加 이/히/리/기 变成被动：보다→보이다（被看见）、듣다→들리다（被听见）、열다→열리다（被打开）、잡다→잡히다（被抓住）、끊다→끊기다（被切断）。哪个动词配哪个后缀没有万能规则，把高频的当成单词整个记住最划算。",
        speak: "문이 열렸어요.",
        romanization: "muni yeollyeosseoyo",
        examples: [
          {
            ko: "문이 열렸어요.",
            zh: "门开了（被打开了）。",
            note: "열다（开）→ 열리다（被打开）。"
          },
          {
            ko: "도둑이 경찰에게 잡혔어요.",
            zh: "小偷被警察抓住了。",
            note: "잡다（抓）→ 잡히다（被抓），施动者用 에게。"
          }
        ]
      },
      {
        title: "最高频：들려요 / 보여요",
        body: "日常口语里最常用的被动是 들리다（听得见）和 보이다（看得见）：소리가 안 들려요（听不见声音）、여기서 바다가 보여요（从这里看得到海）。注意主语用 이/가——中文说“我听得见”，韩语的结构其实是“声音被听见”。",
        speak: "소리가 잘 안 들려요.",
        romanization: "soriga jal an deullyeoyo",
        examples: [
          {
            ko: "소리가 잘 안 들려요.",
            zh: "声音听不太清。"
          },
          {
            ko: "여기서 한강이 보여요.",
            zh: "从这里看得见汉江。"
          }
        ]
      },
      {
        title: "使动：让人做、给人做",
        body: "使动表示“让/给别人做某事”，很多也用 이/히/리/기 系后缀：먹다→먹이다（喂）、입다→입히다（给……穿）、알다→알리다（告知）。아기에게 밥을 먹여요 = 给宝宝喂饭，动作对象常用 에게 标记。",
        speak: "아기에게 밥을 먹여요.",
        romanization: "agiege babeul meogyeoyo",
        examples: [
          {
            ko: "아기에게 밥을 먹여요.",
            zh: "给宝宝喂饭。",
            note: "먹이다 + 어요 → 먹여요。"
          },
          {
            ko: "아이에게 옷을 입혔어요.",
            zh: "给孩子穿上了衣服。"
          },
          {
            ko: "결과를 팀에 알렸어요.",
            zh: "把结果通知了团队。"
          }
        ]
      },
      {
        title: "-아/어지다：状态被改变",
        body: "没有专门被动形的动词，常用 -아/어지다 表示“被弄成某状态”或“自然变成”：켜다→켜지다（被打开/亮起）、깨다→깨지다（碎掉）、지우다→지워지다（被擦掉）。불이 켜졌어요 = 灯亮了。",
        speak: "불이 갑자기 켜졌어요.",
        romanization: "buri gapjagi kyeojyeosseoyo",
        examples: [
          {
            ko: "불이 갑자기 켜졌어요.",
            zh: "灯突然亮了。"
          },
          {
            ko: "컵이 깨졌어요.",
            zh: "杯子碎了。",
            note: "깨지다 强调结果状态，不追究是谁弄的。"
          }
        ]
      },
      {
        title: "被动 vs 使动速查",
        body: "同一个后缀家族既造被动又造使动，靠句子意思区分：보이다 既是“被看见”（산이 보여요），也是“给人看”（사진을 보여 줬어요）。判断口诀：主语是承受者→被动；句里有“让/给某人”→使动。拿不准就看助词：被动句常见 이/가 + 动词，使动句常见 에게 + 을/를。"
      }
    ],
    drills: [
      {
        type: "choice",
        prompt: "열리다 是哪个动词的被动形？",
        answer: "열다（开）",
        choices: [
          "열다（开）",
          "듣다（听）",
          "보다（看）",
          "잡다（抓）"
        ],
        explain: "열다 + 리 → 열리다（被打开）：문이 열려요 = 门开了/门是开的。"
      },
      {
        type: "listen",
        prompt: "听录音，说话人遇到了什么情况？",
        speak: "소리가 잘 안 들려요.",
        answer: "声音听不太清",
        choices: [
          "声音听不太清",
          "看不见屏幕",
          "门打不开",
          "灯不亮了"
        ],
        explain: "들리다 = 被听见/听得见，잘 안 들려요 = 听不太清。"
      },
      {
        type: "cloze",
        prompt: "填空：从这里看得见汉江。",
        answer: "보여요",
        clozeText: "여기서 한강이 ___.",
        explain: "보이다（看得见）+ 어요 → 보여요，主语 한강 用 이/가 标记。",
        speak: "여기서 한강이 보여요."
      },
      {
        type: "choice",
        prompt: "“给宝宝喂饭”应该用哪个动词？",
        answer: "먹이다",
        choices: [
          "먹이다",
          "먹다",
          "먹히다",
          "마시다"
        ],
        explain: "먹이다 是 먹다 的使动“喂”；먹히다 是被动“被吃掉”。"
      },
      {
        type: "dictation",
        prompt: "听写：写出你听到的句子（描述门的状态变化）。",
        answer: "문이 열렸어요.",
        speak: "문이 열렸어요.",
        explain: "열리다 的过去时 열렸어요：门（被）打开了。"
      },
      {
        type: "type",
        prompt: "灯突然亮了：불이 갑자기 ___（用 켜지다 的过去时）",
        answer: "켜졌어요",
        acceptable: [
          "켜졌어요"
        ],
        explain: "켜지다 + 었어요 → 켜졌어요，表示“（被）打开了、亮了”。"
      },
      {
        type: "translate",
        prompt: "翻译成韩语：把结果通知了团队。",
        answer: "결과를 팀에 알렸어요.",
        acceptable: [
          "결과를 팀에 알렸어요",
          "팀에 결과를 알렸어요.",
          "결과를 팀에게 알렸어요."
        ],
        hint: "通知 = 알리다（알다 的使动）",
        explain: "알리다（告知）的过去时是 알렸어요；机构、团体后多用 에。"
      },
      {
        type: "choice",
        prompt: "下面哪句用的是被动？",
        answer: "컵이 깨졌어요.",
        choices: [
          "컵이 깨졌어요.",
          "아기에게 밥을 먹여요.",
          "아이에게 옷을 입혔어요.",
          "친구에게 소식을 알렸어요."
        ],
        explain: "깨지다 表示“碎了”的被动结果；其余三句都是“给某人做”的使动。"
      }
    ],
    unlocks: []
  },
  {
    id: "l21-slow-news",
    order: 35,
    milestone: "m3",
    title: "慢速新闻入口",
    subtitle: "标题、主题词和第一段复述。",
    duration: 18,
    focus: [
      "media",
      "vocab",
      "grammar"
    ],
    objectives: [
      "抓标题主题",
      "找出谁做了什么",
      "用 2 句中文或韩语复述"
    ],
    completionTask: {
      kind: "retell",
      title: "标题骨架复述",
      prompt: "读完下面这则慢速新闻后合上文本，用自己的韩语复述谁、做了什么、在哪里。至少两句，不要逐字复制。",
      source: "정부가 오늘 새로운 기후 계획을 발표했습니다. 시민들은 서울 광장에서 설명을 들었습니다.",
      minSyllables: 24,
      minClauses: 2,
      markerGroups: [["발표"], ["정부", "시민", "계획"]]
    },
    teach: [
      {
        title: "先抓骨架再看细节",
        body: "读新闻不要从第一个词开始逐词翻译。先扫标题和第一段，圈出主题词、数字、地点和句尾谓词——新闻的核心信息几乎都落在这四类成分上。骨架立住了，细节生词才有地方挂。"
      },
      {
        title: "新闻高频词",
        body: "기사 指新闻报道，발표하다 是发布、宣布，정부 是政府，시민 是市民。慢速新闻翻来覆去就是这批词，先把它们焊牢，阅读速度立刻不一样。",
        speak: "정부가 새로운 계획을 발표했습니다.",
        romanization: "jeongbuga saeroun gyehoegeul balpyohaetseumnida",
        examples: [
          {
            ko: "정부가 새로운 계획을 발표했습니다.",
            zh: "政府公布了新计划。",
            note: "新闻正文常用正式体 -습니다。"
          },
          {
            ko: "이 기사는 어제 나왔어요.",
            zh: "这篇报道是昨天出来的。",
            note: "나오다 在这里表示“刊出、发表出来”。"
          }
        ]
      },
      {
        title: "第一遍只问三件事",
        body: "第一遍阅读只回答三个问题：누가（谁）、어디서（在哪里）、무엇을 했어요（做了什么）。答得出来就算读懂了骨架，生词留到第二遍再查，不要在第一遍就停下来翻词典。",
        speak: "누가, 어디서, 무엇을 했어요?",
        romanization: "nuga, eodiseo, mueoseul haesseoyo"
      },
      {
        title: "认出新闻体句尾",
        body: "新闻正文多用 -습니다/ㅂ니다 或书面体 -했다 这类句尾，例如 발표했습니다（宣布了）、열렸습니다（举行了）。看到这种句尾，就找到了句子的核心动作；열리다 是 열다 的被动，在“会议举行”这类新闻句里出现率极高。",
        speak: "오늘 서울에서 회의가 열렸습니다.",
        romanization: "oneul seoureseo hoeuiga yeollyeotseumnida",
        examples: [
          {
            ko: "오늘 서울에서 회의가 열렸습니다.",
            zh: "今天在首尔举行了会议。",
            note: "회의가 열리다 = 会议被举行/召开。"
          }
        ]
      },
      {
        title: "两句复述法",
        body: "读完第一段，用两句话复述：第一句说谁做了什么，第二句补时间地点或结果。中文韩语都可以，能复述出来才算真正提取了信息，而不是“看过了”。"
      }
    ],
    drills: [
      {
        type: "choice",
        prompt: "기사 的意思是？",
        answer: "新闻报道",
        choices: [
          "新闻报道",
          "药店",
          "周末",
          "邀请"
        ],
        explain: "기사 是新闻/报道。"
      },
      {
        type: "type",
        prompt: "发布/宣布：발표___",
        answer: "하다",
        acceptable: [
          "하다"
        ],
        explain: "발표하다 是动词。"
      },
      {
        type: "choice",
        prompt: "读新闻第一遍最应该抓？",
        answer: "主题词和动作",
        choices: [
          "主题词和动作",
          "所有生词拼写",
          "字体大小",
          "标点数量"
        ],
        explain: "先建立信息骨架。"
      },
      {
        type: "listen",
        prompt: "听录音，选出句子的意思。",
        speak: "정부가 새로운 계획을 발표했습니다.",
        answer: "政府公布了新计划",
        choices: [
          "政府公布了新计划",
          "市民反对新计划",
          "会议明天举行",
          "记者写了一篇报道"
        ],
        explain: "主语是 정부（政府），발표했습니다 是 발표하다 的过去正式体。"
      },
      {
        type: "cloze",
        prompt: "填空：今天在首尔举行了会议。（用新闻体句尾）",
        answer: "열렸습니다",
        clozeText: "오늘 서울에서 회의가 ___.",
        explain: "열리다（被举行/被打开）的过去正式体是 열렸습니다，新闻体高频句尾。",
        speak: "오늘 서울에서 회의가 열렸습니다."
      },
      {
        type: "dictation",
        prompt: "听写：写出你听到的句子。",
        answer: "이 기사는 어제 나왔어요.",
        speak: "이 기사는 어제 나왔어요.",
        explain: "기사（报道）+ 나오다（刊出）：这篇报道是昨天出来的。"
      },
      {
        type: "translate",
        prompt: "翻译成韩语：市民们读了那篇报道。",
        answer: "시민들이 그 기사를 읽었어요.",
        acceptable: [
          "시민들이 그 기사를 읽었어요",
          "시민들이 그 기사를 읽었습니다."
        ],
        hint: "市民 = 시민，报道 = 기사",
        explain: "시민들이（市民们）+ 그 기사를（那篇报道）+ 읽었어요（读了）。"
      }
    ],
    unlocks: [
      "l22-media-shadowing"
    ]
  },
  {
    id: "l22-media-shadowing",
    order: 36,
    milestone: "m3",
    title: "影子跟读和反应句",
    subtitle: "-더라고요, 진짜, 완전, 소름 돋다。",
    duration: 20,
    focus: [
      "listening",
      "native",
      "media"
    ],
    objectives: [
      "跟读短片段",
      "表达亲身发现",
      "控制语气副词强度"
    ],
    completionTask: {
      kind: "shadowing",
      title: "三轮影子跟读",
      prompt: "先只跟节奏，再看文本补齐音节，最后脱离文本追语气。录下最后一轮并回听；设备不能录音时，听后凭记忆写出整句。",
      source: "그 카페 커피가 진짜 맛있더라고요.",
      minRecordingSeconds: 4,
      fallbackMinSyllables: 14
    },
    teach: [
      {
        title: "-더라고요：亲身发现",
        body: "-더라고요 接在动词、形容词词干后，表示说话人亲身经历后的发现或感受，自带一点“我当时一看/一试才发现……”的回忆语气。它只能用于自己看到、听到、感觉到的事，转述别人的话不能用。",
        speak: "그 드라마 생각보다 재밌더라고요.",
        romanization: "geu deurama saenggakboda jaemitdeoragoyo",
        examples: [
          {
            ko: "그 드라마 생각보다 재밌더라고요.",
            zh: "那部剧比想象中有意思（我看了才发现）。"
          },
          {
            ko: "그 카페 커피가 진짜 맛있더라고요.",
            zh: "那家咖啡店的咖啡真的很好喝（亲口尝过）。",
            note: "重点是“亲身经历后的发现”。"
          }
        ]
      },
      {
        title: "갈수록：越往后越……",
        body: "动词词干接 -(으)ㄹ수록 表示随着动作推进，程度越来越明显。가다→갈수록、보다→볼수록。갈수록 재밌어요 就是‘越往后越有意思’，常见于剧集、书和体验评价。",
        speak: "갈수록 재밌더라고요.",
        romanization: "galsurok jaemitdeoragoyo",
        examples: [
          { ko: "드라마가 갈수록 재미있어요.", zh: "电视剧越往后越有意思。" },
          { ko: "볼수록 마음에 들어요.", zh: "越看越喜欢。", note: "보다 + -(으)ㄹ수록 → 볼수록。" }
        ]
      },
      {
        title: "语气副词的火力控制",
        body: "진짜/정말 是“真的”，완전 更口语、相当于“超、完全”，좀 可以缓和语气。副词像调味料：一句话放一个就够味，句句 완전 대박 会显得夸张失真。先听母语者怎么配，再决定自己的用量。",
        speak: "완전 대박이에요.",
        romanization: "wanjeon daebagieyo"
      },
      {
        title: "소름 돋다：起鸡皮疙瘩",
        body: "소름(이) 돋다 字面是“起鸡皮疙瘩”，在综艺字幕和评论区里表示“震撼到了、绝了”。类似的高频反应词还有 대박（厉害/绝了）。这类表达先听懂，再在轻松场合谨慎模仿。",
        speak: "노래 듣다가 소름 돋았어요.",
        romanization: "norae deutdaga soreum dodasseoyo",
        examples: [
          {
            ko: "노래 듣다가 소름 돋았어요.",
            zh: "听歌听到起了鸡皮疙瘩。",
            note: "-다가 表示动作进行中发生了另一件事。"
          }
        ]
      },
      {
        title: "影子跟读三轮法",
        body: "第一轮不看文本，只跟节奏和停顿，嘴里哼出声音轮廓；第二轮看文本，把每个音节补齐；第三轮丢开文本，追语气和情绪。先建立声音轮廓再抠细节，比一开始逐音死磕效率高得多。"
      }
    ],
    drills: [
      {
        type: "choice",
        prompt: "갈수록 재밌더라고요 表示？",
        answer: "越看越觉得有意思",
        choices: [
          "越看越觉得有意思",
          "请不要看",
          "价格很贵",
          "我会去"
        ],
        explain: "-더라고요 有亲身发现感。"
      },
      {
        type: "type",
        prompt: "真的很有趣：___ 재미있어요.",
        answer: "진짜",
        acceptable: [
          "진짜",
          "정말"
        ],
        explain: "진짜/정말 都可加强语气。"
      },
      {
        type: "choice",
        prompt: "影子跟读第一轮更该追？",
        answer: "节奏和停顿",
        choices: [
          "节奏和停顿",
          "汉字写法",
          "所有语法术语",
          "字幕颜色"
        ],
        explain: "先建立声音轮廓。"
      },
      {
        type: "listen",
        prompt: "听录音，说话人想表达什么？",
        speak: "그 카페 커피가 진짜 맛있더라고요.",
        answer: "亲自喝过后发现那家咖啡很好喝",
        choices: [
          "亲自喝过后发现那家咖啡很好喝",
          "听朋友说那家咖啡不错",
          "打算明天去那家咖啡店",
          "觉得那家咖啡太贵了"
        ],
        explain: "-더라고요 表示亲身经历后的发现，不是转述别人的评价。"
      },
      {
        type: "cloze",
        prompt: "填空：那部剧比想象中有意思（亲身看过的发现语气）。",
        answer: "재밌더라고요",
        clozeText: "그 드라마 생각보다 ___.",
        explain: "재밌다 + -더라고요 → 재밌더라고요，亲身发现的语气。",
        speak: "그 드라마 생각보다 재밌더라고요."
      },
      {
        type: "choice",
        prompt: "下面哪种情况可以用 -더라고요？",
        answer: "自己昨天去了那家店，发现人很多",
        choices: [
          "自己昨天去了那家店，发现人很多",
          "转述朋友说那家店人很多",
          "推测明天人会很多",
          "建议别人去那家店"
        ],
        explain: "-더라고요 只能用于说话人亲身经历后的发现。"
      },
      {
        type: "dictation",
        prompt: "听写：写出你听到的感叹句。",
        answer: "완전 대박이에요.",
        speak: "완전 대박이에요.",
        explain: "완전（超/完全）+ 대박（绝了）：太绝了、超厉害。"
      },
      {
        type: "translate",
        prompt: "翻译成韩语：听歌听到起了鸡皮疙瘩。",
        answer: "노래 듣다가 소름 돋았어요.",
        acceptable: [
          "노래 듣다가 소름 돋았어요",
          "노래를 듣다가 소름 돋았어요.",
          "노래를 듣다가 소름이 돋았어요."
        ],
        hint: "听着听着 = 듣다가，起鸡皮疙瘩 = 소름(이) 돋다",
        explain: "-다가 表示动作中途发生另一件事：노래 듣다가 소름 돋았어요。"
      }
    ],
    unlocks: [
      "l23-social-posts"
    ]
  },
  {
    id: "l23-social-posts",
    order: 37,
    milestone: "m3",
    title: "社交媒体短帖",
    subtitle: "省略、语气、评论区反应。",
    duration: 18,
    focus: [
      "media",
      "native",
      "pragmatics"
    ],
    objectives: [
      "读懂短帖主旨",
      "识别省略主语",
      "写一条安全评论"
    ],
    teach: [
      {
        title: "短帖的省略",
        body: "社交短帖为了省字，经常丢掉主语和助词：오늘도 야근... 커피 세 잔째（今天又加班……第三杯咖啡了）。读的时候要靠上下文把“谁、对谁、在哪”补回来，看到没有主语的句子不要慌，先默认是发帖人自己。",
        examples: [
          {
            ko: "오늘도 야근... 커피 세 잔째.",
            zh: "今天又加班……已经第三杯咖啡了。",
            note: "主语“我”和助词都被省略了；-째 表示“第几（杯/次）”。"
          }
        ]
      },
      {
        title: "评论区高频词",
        body: "댓글 是评论，좋아요 是点赞，공감하다 表示“有共鸣、同感”，팔로우 是关注。看到 공감 버튼 就是“共鸣按钮”。这几个词认熟了，评论区一半的内容就能看懂。",
        speak: "댓글 감사합니다.",
        romanization: "daetgeul gamsahamnida",
        examples: [
          {
            ko: "댓글 감사합니다.",
            zh: "感谢评论。"
          },
          {
            ko: "저도 공감해요.",
            zh: "我也有同感。"
          }
        ]
      },
      {
        title: "安全评论模板",
        body: "语境或语气拿不准时，别下强评价。저도 그렇게 생각해요（我也这么想）、좋은 글 감사합니다（谢谢分享好文）这类中性句最安全，不会踩到立场、玩笑或圈内梗的雷。",
        speak: "저도 그렇게 생각해요.",
        romanization: "jeodo geureoke saenggakaeyo"
      },
      {
        title: "网络用语初见",
        body: "评论区常见符号和词：ㅋㅋ 是笑声，ㅠㅠ 是哭/难过，인생샷 是“人生照片”（拍得极好的照片）。这一阶段先做到认识、不误解，自己发帖时不急着用。",
        speak: "인생샷이에요.",
        romanization: "insaengsyasieyo"
      }
    ],
    drills: [
      {
        type: "choice",
        prompt: "댓글 的意思是？",
        answer: "评论",
        choices: [
          "评论",
          "票价",
          "药",
          "家人"
        ],
        explain: "댓글 是网络评论。"
      },
      {
        type: "type",
        prompt: "我也这样想：저도 그렇게 생각___",
        answer: "해요",
        acceptable: [
          "해요"
        ],
        explain: "생각하다 -> 생각해요。"
      },
      {
        type: "choice",
        prompt: "短帖常见难点是？",
        answer: "省略和上下文",
        choices: [
          "省略和上下文",
          "没有任何语气",
          "只有敬语",
          "没有词汇"
        ],
        explain: "自然表达常依赖语境。"
      },
      {
        type: "listen",
        prompt: "听录音，这句评论想表达什么？",
        speak: "저도 공감해요.",
        answer: "我也有同感",
        choices: [
          "我也有同感",
          "我不同意",
          "请删掉这条评论",
          "我要点外卖"
        ],
        explain: "공감하다 是“有共鸣、同感”，저도 = 我也。"
      },
      {
        type: "cloze",
        prompt: "填空：感谢（你的）评论。",
        answer: "댓글",
        clozeText: "___ 감사합니다.",
        explain: "댓글（评论）+ 감사합니다 = 感谢评论，博主回复区高频句。",
        speak: "댓글 감사합니다."
      },
      {
        type: "choice",
        prompt: "帖子写“오늘도 야근... 커피 세 잔째”，它省略了什么？",
        answer: "主语和助词",
        choices: [
          "主语和助词",
          "所有名词",
          "时间信息",
          "数字"
        ],
        explain: "短帖靠语境补主语（나/저）和助词，名词和数字都还在。"
      },
      {
        type: "translate",
        prompt: "翻译成韩语：我也这么想。",
        answer: "저도 그렇게 생각해요.",
        acceptable: [
          "저도 그렇게 생각해요",
          "나도 그렇게 생각해요."
        ],
        hint: "我也 = 저도，那样 = 그렇게",
        explain: "저도（我也）+ 그렇게（那样）+ 생각해요（想），最安全的附和句。"
      }
    ],
    unlocks: [
      "l24-opinion-paragraph"
    ]
  },
  {
    id: "l24-opinion-paragraph",
    order: 38,
    milestone: "m3",
    title: "写出第一段观点",
    subtitle: "제 생각에는, 왜냐하면, 예를 들면。",
    duration: 20,
    focus: [
      "grammar",
      "discourse",
      "native"
    ],
    objectives: [
      "表达观点",
      "给出理由",
      "添加例子"
    ],
    completionTask: {
      kind: "paragraph",
      title: "四步观点段",
      prompt: "选择一个你真正有看法的话题，用韩语写观点、理由、例子和小结四句。每一部分都必须由你自己完成。",
      minSyllables: 48,
      minClauses: 4,
      markerGroups: [["제 생각에는"], ["왜냐하면"], ["예를 들면"], ["그래서"]]
    },
    teach: [
      {
        title: "제 생각에는：亮出个人视角",
        body: "제 생각에는 相当于“在我看来”，把断言变成个人观点，语气立刻柔和、不绝对。句尾再配 -는 것 같아요 或 -다고 생각해요，就是一套完整的温和表态。",
        speak: "제 생각에는 한국어 발음이 제일 어려운 것 같아요.",
        romanization: "je saenggakeneun hangugeo bareumi jeil eoryeoun geot gatayo",
        examples: [
          {
            ko: "제 생각에는 한국어 발음이 제일 어려운 것 같아요.",
            zh: "在我看来，韩语发音好像是最难的。",
            note: "제 생각에는 + -는 것 같아요 是常见搭配。"
          }
        ]
      },
      {
        title: "왜냐하면……-기 때문이에요",
        body: "왜냐하면 引出原因，句尾常收在 -기 때문이에요（因为……）上，前后呼应：왜냐하면 매일 쓰기 때문이에요（因为每天都在用）。只写 왜냐하면 不收尾，句子会显得悬在半空。",
        speak: "왜냐하면 매일 쓰기 때문이에요.",
        romanization: "waenyahamyeon maeil sseugi ttaemunieyo",
        examples: [
          {
            ko: "왜냐하면 매일 쓰기 때문이에요.",
            zh: "因为（我）每天都在用。",
            note: "왜냐하면 与 -기 때문이에요 前后呼应。"
          }
        ]
      },
      {
        title: "예를 들면：加一个例子",
        body: "예를 들면 是“举例来说”。观点后面跟一个具体例子，说服力立刻翻倍：예를 들면 드라마를 볼 때 자막 없이 이해할 수 있어요（比如看剧时不用字幕也能听懂）。",
        speak: "예를 들면 드라마를 볼 때 자막 없이 이해할 수 있어요.",
        romanization: "yereul deulmyeon deuramareul bol ttae jamak eopsi ihaehal su isseoyo"
      },
      {
        title: "四步段落骨架",
        body: "一段观点的最小结构：① 观点（제 생각에는...）② 原因（왜냐하면...）③ 例子（예를 들면...）④ 小结（그래서 저는 ...다고 생각해요）。四步各写一句，就是一段像样的短文；随机罗列生词不构成段落。"
      },
      {
        title: "小结句式",
        body: "结尾用 그래서 저는 ...다고/라고 생각해요 收束，把观点再说一遍但换个说法，做到首尾呼应。首尾呼应正是“段落感”的来源。",
        speak: "그래서 저는 연습이 제일 중요하다고 생각해요.",
        romanization: "geuraeseo jeoneun yeonseubi jeil jungyohadago saenggakaeyo"
      }
    ],
    drills: [
      {
        type: "choice",
        prompt: "表达“在我看来”可用？",
        answer: "제 생각에는",
        choices: [
          "제 생각에는",
          "얼마예요",
          "여보세요",
          "포장해 주세요"
        ],
        explain: "제 생각에는 是观点框架。"
      },
      {
        type: "type",
        prompt: "例如：예를 ___",
        answer: "들면",
        acceptable: [
          "들면"
        ],
        explain: "예를 들면 = 举例来说。"
      },
      {
        type: "choice",
        prompt: "观点段最小结构不包括？",
        answer: "随机罗列生词",
        choices: [
          "观点",
          "原因",
          "例子",
          "随机罗列生词"
        ],
        explain: "输出要有信息逻辑。"
      },
      {
        type: "listen",
        prompt: "听录音，说话人这句话在段落里起什么作用？",
        speak: "왜냐하면 매일 쓰기 때문이에요.",
        answer: "给出原因",
        choices: [
          "给出原因",
          "举例子",
          "下结论",
          "提出问题"
        ],
        explain: "왜냐하면 ... -기 때문이에요 是给出原因的框架。"
      },
      {
        type: "cloze",
        prompt: "填空：因为（我）每天都在用。",
        answer: "때문이에요",
        clozeText: "왜냐하면 매일 쓰기 ___.",
        explain: "왜냐하면 开头的句子常用 -기 때문이에요 收尾，前后呼应。",
        speak: "왜냐하면 매일 쓰기 때문이에요."
      },
      {
        type: "translate",
        prompt: "翻译成韩语：所以我认为练习最重要。",
        answer: "그래서 저는 연습이 제일 중요하다고 생각해요.",
        acceptable: [
          "그래서 저는 연습이 제일 중요하다고 생각해요",
          "그래서 연습이 제일 중요하다고 생각해요."
        ],
        hint: "认为…… = -다고 생각하다，最 = 제일",
        explain: "중요하다 + -다고 생각해요 = 认为重要；그래서 引出小结句。"
      },
      {
        type: "dictation",
        prompt: "听写：写出这句表达个人看法的话。",
        answer: "제 생각에는 그게 더 좋은 것 같아요.",
        speak: "제 생각에는 그게 더 좋은 것 같아요.",
        explain: "제 생각에는（在我看来）+ -는/은 것 같아요（好像）是温和表态组合：我觉得那个更好。"
      }
    ],
    unlocks: [
      "l25-retelling"
    ]
  },
  {
    id: "l25-retelling",
    order: 39,
    milestone: "m3",
    title: "复述经历和故事",
    subtitle: "먼저, 그다음에, 결국。",
    duration: 20,
    focus: [
      "discourse",
      "grammar",
      "speaking"
    ],
    objectives: [
      "按顺序复述",
      "使用连接副词",
      "保留关键细节"
    ],
    completionTask: {
      kind: "retell",
      title: "合上原文复述",
      prompt: "听完下面的短故事后合上文本，用自己的韩语复述人物、动作、转折和结果。至少四句，不能逐字复制。",
      source: "지수는 주말에 친구를 만나러 기차역에 갔어요. 먼저 표를 샀고 그다음에 커피를 샀어요. 그런데 기차가 삼십 분 늦게 왔어요. 결국 친구에게 연락하고 역에서 오래 기다렸어요.",
      minSyllables: 42,
      minClauses: 4,
      markerGroups: [["먼저"], ["그다음에", "그 다음에"], ["그런데"], ["결국"]]
    },
    teach: [
      {
        title: "顺序三件套",
        body: "먼저（首先）、그다음에（然后）、마지막으로（最后）是复述的路标。每讲一个动作换一个路标，听的人自然跟得上：먼저 표를 샀어요. 그다음에 기차를 탔어요. 마지막으로 호텔에 도착했어요.",
        speak: "먼저 표를 샀어요. 그다음에 기차를 탔어요.",
        romanization: "meonjeo pyoreul sasseoyo. geudaeume gichareul tasseoyo",
        examples: [
          {
            ko: "먼저 표를 샀어요.",
            zh: "首先买了票。"
          },
          {
            ko: "그다음에 기차를 탔어요.",
            zh: "然后上了火车。"
          },
          {
            ko: "마지막으로 호텔에 도착했어요.",
            zh: "最后到了酒店。"
          }
        ]
      },
      {
        title: "转折与结果",
        body: "故事要有起伏：그런데 引出转折（可是），결국 引出最终结果（最终、结果）。결국 늦게 도착했어요 = 结果到晚了。有转折、有结果，复述才像故事，而不是流水账。",
        speak: "그런데 길이 막혔어요. 결국 늦게 도착했어요.",
        romanization: "geureonde giri makhyeosseoyo. gyeolguk neutge dochakaesseoyo",
        examples: [
          {
            ko: "그런데 길이 막혔어요.",
            zh: "可是路上堵车了。",
            note: "길이 막히다 = 堵车；막히다 是 막다 的被动。"
          },
          {
            ko: "결국 늦게 도착했어요.",
            zh: "结果到晚了。"
          }
        ]
      },
      {
        title: "复述保留什么",
        body: "复述不是背原文。合上材料问自己四件事：人物是谁、做了什么、哪里出了转折、结局如何。这四样在，细节丢一半也不影响；这四样丢一样，故事就散架了。"
      },
      {
        title: "用进行时铺背景",
        body: "描述背景可用 -고 있었어요（当时正在……）：집에 가고 있었어요. 그런데 비가 왔어요（正在回家，可是下起了雨）。背景用过去进行，事件用过去时，故事的层次立刻分明。",
        speak: "집에 가고 있었어요. 그런데 비가 왔어요.",
        romanization: "jibe gago isseosseoyo. geureonde biga wasseoyo"
      }
    ],
    drills: [
      {
        type: "choice",
        prompt: "그다음에 的意思是？",
        answer: "然后/接下来",
        choices: [
          "然后/接下来",
          "但是",
          "因为",
          "也许"
        ],
        explain: "用于顺序推进。"
      },
      {
        type: "type",
        prompt: "最终：___ 집에 갔어요.",
        answer: "결국",
        acceptable: [
          "결국"
        ],
        explain: "결국 表示最后结果。"
      },
      {
        type: "choice",
        prompt: "复述时最该保留？",
        answer: "人物、动作、转折和结果",
        choices: [
          "人物、动作、转折和结果",
          "每个助词的术语",
          "所有标点",
          "字体颜色"
        ],
        explain: "复述重在信息结构。"
      },
      {
        type: "listen",
        prompt: "听录音，事情的结局是什么？",
        speak: "그런데 길이 막혔어요. 결국 늦게 도착했어요.",
        answer: "结果到晚了",
        choices: [
          "结果到晚了",
          "准时到达了",
          "取消了行程",
          "改乘了地铁"
        ],
        explain: "그런데 引出堵车这个转折，결국 늦게 도착했어요 = 结果晚到了。"
      },
      {
        type: "cloze",
        prompt: "填空：首先买了票。",
        answer: "먼저",
        clozeText: "___ 표를 샀어요.",
        explain: "먼저 放在第一个动作前，表示“首先”。",
        speak: "먼저 표를 샀어요."
      },
      {
        type: "choice",
        prompt: "그런데 在故事里的作用是？",
        answer: "引出转折",
        choices: [
          "引出转折",
          "表示原因",
          "表示举例",
          "结束对话"
        ],
        explain: "그런데 = 可是/不过，是故事的转折路标。"
      },
      {
        type: "dictation",
        prompt: "听写：写出这句描述背景的话。",
        answer: "집에 가고 있었어요.",
        speak: "집에 가고 있었어요.",
        explain: "-고 있었어요 表示过去正在进行：当时正在回家。"
      },
      {
        type: "translate",
        prompt: "翻译成韩语：然后上了火车。",
        answer: "그다음에 기차를 탔어요.",
        acceptable: [
          "그다음에 기차를 탔어요",
          "그 다음에 기차를 탔어요."
        ],
        hint: "乘、上（车）= 타다",
        explain: "그다음에（然后）+ 기차를 탔어요（上了火车）；타다 前面用 을/를。"
      }
    ],
    unlocks: [
      "l26-indirect-speech"
    ]
  },
  {
    id: "l26-indirect-speech",
    order: 40,
    milestone: "m3",
    title: "转述别人说的话",
    subtitle: "-다고 하다, -라고 하다。",
    duration: 20,
    focus: [
      "grammar",
      "discourse"
    ],
    objectives: [
      "转述陈述句",
      "转述名词句",
      "避免硬翻“他说”"
    ],
    completionTask: {
      kind: "paragraph",
      title: "转述两个人的话",
      prompt: "用 -다고 하다 / -라고 하다 转述至少两句别人说过的话。不要写成 他说 + 中文语序。",
      minSyllables: 28,
      minClauses: 3,
      markerGroups: [["다고", "라고"]]
    },
    teach: [
      {
        title: "-다고 하다：转述陈述句",
        body: "转述别人说的动词/形容词陈述句用 -다고 하다。形容词词干直接接：바쁘다고 해요（说很忙）；动词现在时要变 -ㄴ/는다고：매일 운동한다고 해요（说每天运动）；过去时接 -았/었다고：어제 갔다고 해요（说昨天去了）。",
        speak: "친구가 요즘 바쁘다고 해요.",
        romanization: "chinguga yojeum bappeudago haeyo",
        examples: [
          {
            ko: "친구가 요즘 바쁘다고 해요.",
            zh: "朋友说最近很忙。",
            note: "形容词词干直接 + 다고。"
          },
          {
            ko: "동생이 매일 운동한다고 해요.",
            zh: "弟弟/妹妹说自己每天运动。",
            note: "动词现在时用 -ㄴ/는다고。"
          }
        ]
      },
      {
        title: "-(이)라고 하다：转述名词句",
        body: "“是学生”这类名词句的转述用 -(이)라고 하다：名词有收音接 이라고（학생이라고 해요），无收音接 라고（의사라고 해요）。自我介绍的 저는 ...라고 합니다 用的也是同一个结构。",
        speak: "그분이 의사라고 해요.",
        romanization: "geubuni uisarago haeyo",
        examples: [
          {
            ko: "그분이 의사라고 해요.",
            zh: "听说那位是医生。",
            note: "의사 无收音 → 라고。"
          },
          {
            ko: "동생이 아직 학생이라고 해요.",
            zh: "（他）说弟弟还是学生。",
            note: "학생 有收音 → 이라고。"
          }
        ]
      },
      {
        title: "口语缩略 -대요 / -래요",
        body: "口语里 -다고 해요 常缩成 -대요：바쁘대요（听说很忙）、온대요（听说要来）；名词句的 -(이)라고 해요 缩成 -(이)래요：학생이래요（听说是学生）。播客、综艺里 -대요/-래요 出现频率极高，听到就当“听说……”处理。",
        speak: "내일 비가 온대요.",
        romanization: "naeil biga ondaeyo",
        examples: [
          {
            ko: "내일 비가 온대요.",
            zh: "听说明天下雨。",
            note: "온다고 해요 → 온대요。"
          }
        ]
      },
      {
        title: "别硬翻“他说”",
        body: "中文习惯说“他说他很忙”，韩语不需要再补一个 말했어요：一个 바쁘다고 했어요 就同时包含“说”和内容。转述句里再叠 말하다 反而生硬啰嗦。"
      }
    ],
    drills: [
      {
        type: "choice",
        prompt: "친구가 바쁘다고 했어요 表示？",
        answer: "朋友说他/她忙",
        choices: [
          "朋友说他/她忙",
          "朋友正在吃饭",
          "朋友想买东西",
          "朋友在药店"
        ],
        explain: "-다고 했어요 是过去转述。"
      },
      {
        type: "type",
        prompt: "听说很好吃：맛있___ 해요.",
        answer: "다고",
        acceptable: [
          "다고"
        ],
        explain: "맛있다 -> 맛있다고 해요。"
      },
      {
        type: "choice",
        prompt: "名词句转述常用？",
        answer: "-(이)라고 하다",
        choices: [
          "-(이)라고 하다",
          "-지 마세요",
          "-고 있어요",
          "보다"
        ],
        explain: "名词 + 이라고/라고。"
      },
      {
        type: "listen",
        prompt: "听录音，这句话的意思是？",
        speak: "내일 비가 온대요.",
        answer: "听说明天下雨",
        choices: [
          "听说明天下雨",
          "昨天下了雨",
          "明天我要出门",
          "听说明天放晴"
        ],
        explain: "온대요 = 온다고 해요 的缩略，表示“听说（雨）要来”。"
      },
      {
        type: "cloze",
        prompt: "填空：听说那位是医生。",
        answer: "라고",
        clozeText: "그분이 의사___ 해요.",
        explain: "의사 无收音，名词句转述接 라고 하다。",
        speak: "그분이 의사라고 해요."
      },
      {
        type: "choice",
        prompt: "동생이 학생이라고 해요 中用 이라고 的原因是？",
        answer: "학생 以收音结尾",
        choices: [
          "학생 以收音结尾",
          "学生是敬语对象",
          "句子是过去时",
          "表示疑问"
        ],
        explain: "有收音的名词接 이라고，无收音的接 라고。"
      },
      {
        type: "dictation",
        prompt: "听写：写出这句转述。",
        answer: "친구가 요즘 바쁘다고 해요.",
        speak: "친구가 요즘 바쁘다고 해요.",
        explain: "바쁘다 + -다고 해요 = 说很忙；요즘 = 最近。"
      },
      {
        type: "translate",
        prompt: "翻译成韩语：朋友说每天都运动。",
        answer: "친구가 매일 운동한다고 해요.",
        acceptable: [
          "친구가 매일 운동한다고 해요",
          "친구가 매일 운동한다고 했어요."
        ],
        hint: "动词现在时转述用 -ㄴ/는다고",
        explain: "운동하다 → 운동한다고 해요，动词现在时转述用 -ㄴ/는다고 하다。"
      }
    ],
    unlocks: [
      "l27-honorific-register"
    ]
  }
];
