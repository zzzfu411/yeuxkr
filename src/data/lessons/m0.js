export const m0Lessons = [
  {
    id: "l01-hangul-map",
    order: 1,
    milestone: "m0",
    title: "韩文不是字母表，是拼块系统",
    subtitle: "理解辅音、元音、收音如何拼成一个音节块。",
    duration: 12,
    focus: [
      "script",
      "sound"
    ],
    objectives: [
      "认识音节块结构",
      "区分竖元音和横元音布局",
      "会读 가/고/한"
    ],
    teach: [
      {
        title: "拼块，不是字母排队",
        body: "韩文音节块通常由初声、中声、可选终声组成，一个块读一拍。",
        speak: "한",
        romanization: "han",
        examples: [
          {
            ko: "한",
            zh: "ㅎ + ㅏ + ㄴ 压成一个块",
            note: "点击听整块发音"
          }
        ]
      },
      {
        title: "元音决定布局",
        body: "竖元音如 ㅏ 放在辅音右侧，横元音如 ㅗ 放在辅音下方。",
        speak: "가, 고",
        examples: [
          {
            ko: "가",
            zh: "ㄱ + ㅏ，左右结构"
          },
          {
            ko: "고",
            zh: "ㄱ + ㅗ，上下结构"
          }
        ]
      },
      {
        title: "ㅇ 是占位符",
        body: "ㅇ 在音节开头不发音，只占初声的位置；在收音位置读 ng。",
        speak: "아, 강",
        examples: [
          {
            ko: "아",
            zh: "开头 ㅇ 不发音，只读 a"
          },
          {
            ko: "강",
            zh: "收音 ㅇ 读 ng（河）"
          }
        ]
      }
    ],
    drills: [
      {
        type: "choice",
        prompt: "가 的结构是什么？",
        answer: "ㄱ + ㅏ",
        choices: [
          "ㄱ + ㅏ",
          "ㄱ + ㅗ",
          "ㅇ + ㅏ",
          "ㅎ + ㅏ + ㄴ"
        ],
        explain: "ㅏ 是竖元音，放在 ㄱ 右侧。"
      },
      {
        type: "choice",
        prompt: "한 的收音是哪一个？",
        answer: "ㄴ",
        choices: [
          "ㅎ",
          "ㅏ",
          "ㄴ",
          "ㅇ"
        ],
        explain: "底部 ㄴ 是终声/收音。"
      },
      {
        type: "type",
        prompt: "输入 ㄱ + ㅗ 组成的音节",
        answer: "고",
        acceptable: [
          "고"
        ],
        explain: "横元音 ㅗ 放在 ㄱ 下方，组成 고。"
      }
    ],
    unlocks: [
      "l02-vowels"
    ]
  },
  {
    id: "l02-vowels",
    order: 2,
    milestone: "m0",
    title: "10 个基础元音",
    subtitle: "把 ㅏ/ㅓ、ㅗ/ㅜ、ㅡ/ㅣ 的口型差异先定住。",
    duration: 15,
    focus: [
      "sound"
    ],
    objectives: [
      "读出 ㅏ/ㅑ、ㅓ/ㅕ、ㅗ/ㅛ、ㅜ/ㅠ、ㅡ/ㅣ",
      "知道 ㅓ 和 ㅗ 的差异",
      "避免把 ㅡ 读成中文儿化音"
    ],
    teach: [
      {
        title: "开口方向",
        body: "ㅏ 是开口前方，ㅓ 更靠后且不圆唇。先听三遍再跟读。",
        speak: "아, 어",
        examples: [
          {
            ko: "아",
            zh: "a：口腔打开靠前"
          },
          {
            ko: "어",
            zh: "eo：更靠后，不圆唇"
          }
        ]
      },
      {
        title: "圆唇两兄弟",
        body: "ㅗ 与 ㅜ 都圆唇，但 ㅗ 更靠前，ㅜ 更靠后。",
        speak: "오, 우",
        examples: [
          {
            ko: "오",
            zh: "o：圆唇靠前"
          },
          {
            ko: "우",
            zh: "u：圆唇靠后"
          }
        ]
      },
      {
        title: "多一短画，就是 y 起音",
        body: "在 ㅏ、ㅓ、ㅗ、ㅜ 上多加一条短画，就得到 ㅑ、ㅕ、ㅛ、ㅠ。口型不变，只在前面加入短促的 y 起音。",
        speak: "아, 야, 어, 여, 오, 요, 우, 유",
        examples: [
          {
            ko: "야 / 여",
            zh: "ㅑ / ㅕ：先发短促 y，再进入原来的元音口型"
          },
          {
            ko: "요 / 유",
            zh: "ㅛ / ㅠ：保持圆唇，加入 y 起音"
          }
        ]
      },
      {
        title: "最容易读错的 ㅡ",
        body: "ㅡ 的嘴唇放松，舌位高，不要读成中文的“呃儿”。这个音值得单独练。",
        speak: "으",
        romanization: "eu",
        examples: [
          {
            ko: "으",
            zh: "eu：嘴唇完全放松"
          }
        ]
      }
    ],
    drills: [
      {
        type: "choice",
        prompt: "哪个元音需要圆唇？",
        answer: "ㅗ",
        choices: [
          "ㅏ",
          "ㅓ",
          "ㅗ",
          "ㅡ"
        ],
        explain: "ㅗ 是圆唇元音。"
      },
      {
        type: "choice",
        prompt: "어 的元音是？",
        answer: "ㅓ",
        choices: [
          "ㅏ",
          "ㅓ",
          "ㅗ",
          "ㅜ"
        ],
        explain: "어 由不发音的 ㅇ + ㅓ 组成。"
      },
      {
        type: "listen",
        prompt: "跟读 으，然后选择对应元音。",
        answer: "ㅡ",
        choices: [
          "ㅜ",
          "ㅡ",
          "ㅣ",
          "ㅓ"
        ],
        speak: "으",
        explain: "으 的核心是 ㅡ。"
      }
    ],
    unlocks: [
      "l31-compound-vowels",
      "l03-consonants"
    ]
  },
  {
    id: "l31-compound-vowels",
    order: 3,
    milestone: "m0",
    title: "复合元音：从两笔读成一拍",
    subtitle: "掌握 ㅐ/ㅔ、ㅘ/ㅝ、ㅚ/ㅟ 和 ㅢ 的组合与高频读法。",
    duration: 18,
    focus: ["script", "sound"],
    objectives: ["看出复合元音的组成", "读出常见复合元音音节", "识别 예요、왜、회사 等高频词"],
    teach: [
      { title: "ㅐ 与 ㅔ", body: "ㅐ 由 ㅏ+ㅣ 组成，ㅔ 由 ㅓ+ㅣ 组成。现代首尔音中二者常很接近，初学先做到听懂和拼对。", speak: "애, 에", examples: [{ ko: "개", zh: "狗；中声是 ㅐ" }, { ko: "게", zh: "螃蟹；中声是 ㅔ" }] },
      { title: "加一笔变成 y 音", body: "ㅒ、ㅖ 分别可看作 ㅐ、ㅔ 加上 y 起音。高频句尾 예요 使用的是 ㅖ。", speak: "얘, 예", examples: [{ ko: "예요", zh: "是；无收音名词后的礼貌句尾" }] },
      { title: "ㅗ 家族向前滑", body: "ㅘ=ㅗ+ㅏ，ㅙ=ㅗ+ㅐ，ㅚ 现代常接近 we。读时从圆唇快速滑向后半部分。", speak: "와, 왜, 외", examples: [{ ko: "와요", zh: "来；오다 的活用" }, { ko: "왜", zh: "为什么" }, { ko: "회사", zh: "公司" }] },
      { title: "ㅜ 家族与 ㅢ", body: "ㅝ=ㅜ+ㅓ，ㅞ=ㅜ+ㅔ，ㅟ 接近 wi；ㅢ 单独读 ui，在词中会随位置简化，先认准字形。", speak: "워, 웨, 위, 의", examples: [{ ko: "뭐", zh: "什么；包含 ㅝ" }, { ko: "위", zh: "上面；包含 ㅟ" }, { ko: "의자", zh: "椅子；词首 ㅢ" }] }
    ],
    drills: [
      { type: "choice", prompt: "ㅘ 由哪两个基础元音组成？", answer: "ㅗ + ㅏ", choices: ["ㅗ + ㅏ", "ㅜ + ㅓ", "ㅏ + ㅣ", "ㅓ + ㅣ"], explain: "ㅘ 是 ㅗ 与 ㅏ 的组合。" },
      { type: "choice", prompt: "예요 的复合元音是哪一个？", answer: "ㅖ", choices: ["ㅐ", "ㅔ", "ㅒ", "ㅖ"], explain: "예 的中声是 ㅖ。" },
      { type: "listen", prompt: "听音后选择“为什么”。", answer: "왜", choices: ["와", "왜", "워", "위"], speak: "왜", explain: "왜 使用复合元音 ㅙ。" },
      { type: "cloze", prompt: "补全复合元音的组成。", clozeText: "ㅝ = ㅜ + ___", answer: "ㅓ", choices: ["ㅏ", "ㅓ", "ㅗ", "ㅣ"], explain: "ㅜ 与 ㅓ 组合成 ㅝ。" },
      { type: "type", prompt: "输入由 ㅇ 和 ㅟ 组成的音节。", answer: "위", acceptable: ["위"], explain: "ㅇ 在音节首不发音，与 ㅟ 组成 위。" },
      { type: "dictation", prompt: "听音并输入对应的疑问词。", answer: "뭐", acceptable: ["뭐"], speak: "뭐", explain: "뭐 表示什么，中声是 ㅝ。" }
    ],
    unlocks: ["l03-consonants"]
  },
  {
    id: "l03-consonants",
    order: 4,
    milestone: "m0",
    title: "基础辅音与发音力度",
    subtitle: "把 ㄱ/ㄷ/ㅂ/ㅈ 的松音性质和 ㄴ/ㄹ/ㅁ/ㅇ 稳住。",
    duration: 15,
    focus: [
      "sound",
      "script"
    ],
    objectives: [
      "认识 ㄱ/ㄴ/ㄷ/ㄹ/ㅁ/ㅂ/ㅅ/ㅇ/ㅈ/ㅎ",
      "理解词首松音不等于浊音",
      "会读 나/마/바/자"
    ],
    teach: [
      {
        title: "松音随位置变化",
        body: "ㄱ ㄷ ㅂ ㅈ 在词首常听起来偏 k/t/p/ch，在元音之间更接近 g/d/b/j。",
        speak: "가구",
        examples: [
          {
            ko: "가구",
            zh: "家具：第一个 ㄱ 偏 k，第二个偏 g"
          }
        ]
      },
      {
        title: "ㄹ 的两幅面孔",
        body: "ㄹ 在元音之间像轻弹 r，在收音位置像 l。",
        speak: "라디오, 물",
        examples: [
          {
            ko: "라디오",
            zh: "收音机：元音间轻弹 r"
          },
          {
            ko: "물",
            zh: "水：收音位置读 l"
          }
        ]
      },
      {
        title: "别让罗马音接管",
        body: "不要用罗马音决定发音，要用韩文字母和位置决定。罗马音只是查找工具。",
        speak: "나, 마, 바, 자",
        examples: [
          {
            ko: "나, 마, 바, 자",
            zh: "na / ma / ba / ja：跟读四个基础音节"
          }
        ]
      },
      {
        title: "ㅅ 与 ㅎ 补齐高频起音",
        body: "ㅅ 在大多数元音前接近 s，在 ㅣ、ㅑ、ㅕ、ㅛ、ㅠ 前会带轻微 sh 色彩；ㅎ 是明显的喉部送气。先对比 사/시 和 아/하。",
        speak: "사, 시, 하, 호",
        examples: [
          {
            ko: "사 / 시",
            zh: "ㅅ 随后接元音改变细微音色"
          },
          {
            ko: "하 / 호",
            zh: "ㅎ 起音带清楚气流"
          }
        ]
      }
    ],
    drills: [
      {
        type: "choice",
        prompt: "라디오 中 ㄹ 更接近什么？",
        answer: "轻弹 r",
        choices: [
          "轻弹 r",
          "强卷舌 r",
          "完全不发音",
          "m"
        ],
        explain: "元音之间的 ㄹ 是轻弹音。"
      },
      {
        type: "choice",
        prompt: "아이 开头的 ㅇ 怎么读？",
        answer: "不发音",
        choices: [
          "ng",
          "不发音",
          "h",
          "g"
        ],
        explain: "ㅇ 在音节开头是占位符。"
      },
      {
        type: "type",
        prompt: "输入“我”的韩语",
        answer: "나",
        acceptable: [
          "나"
        ],
        explain: "나 是非敬语的我；礼貌自称常用 저。"
      }
    ],
    unlocks: [
      "l32-tense-aspirated",
      "l04-first-sentences"
    ]
  },
  {
    id: "l32-tense-aspirated",
    order: 5,
    milestone: "m0",
    title: "松音、紧音与送气音",
    subtitle: "用喉部紧张和气流区分 가/까/카、다/따/타。",
    duration: 20,
    focus: ["sound", "script", "listening"],
    objectives: ["认识五组发音力度对立", "用纸片感受送气", "听辨常见松音与紧音词"],
    teach: [
      { title: "三档不是清浊三档", body: "ㄱ/ㄷ/ㅂ/ㅈ 是松音，ㄲ/ㄸ/ㅃ/ㅉ 是紧音，ㅋ/ㅌ/ㅍ/ㅊ 是送气音；关键是紧张度和气流。", speak: "가, 까, 카", examples: [{ ko: "가", zh: "松音 ㄱ" }, { ko: "까", zh: "紧音 ㄲ" }, { ko: "카", zh: "送气音 ㅋ" }] },
      { title: "送气音让纸片明显动", body: "读 카、타、파、차 时气流更强。把小纸片放在嘴前，先对比 가/카。", speak: "다, 타, 바, 파", examples: [{ ko: "타요", zh: "乘坐；ㅌ 是送气音" }, { ko: "파", zh: "葱；ㅍ 是送气音" }] },
      { title: "紧音短、紧、不送大气", body: "读 까、따、빠、짜 时喉部先收紧，起音干脆，但不要像送气音那样喷出很多气。", speak: "까, 따, 빠, 짜", examples: [{ ko: "싸요", zh: "便宜；ㅆ 是紧音" }, { ko: "짜요", zh: "咸；ㅉ 是紧音" }] },
      { title: "最小对立要整词练", body: "用 사다/싸다、달/딸 这样的词对练，声音和词义一起记，比只背字母名称更牢。", speak: "사다, 싸다, 달, 딸", examples: [{ ko: "사다", zh: "买" }, { ko: "싸다", zh: "便宜" }, { ko: "달", zh: "月亮/月" }, { ko: "딸", zh: "女儿" }] }
    ],
    drills: [
      { type: "choice", prompt: "哪一个是 ㄱ 的送气音？", answer: "ㅋ", choices: ["ㄱ", "ㄲ", "ㅋ", "ㅎ"], explain: "ㄱ/ㄲ/ㅋ 分别是松音、紧音、送气音。" },
      { type: "choice", prompt: "싸요 中的 ㅆ 属于哪一类？", answer: "紧音", choices: ["松音", "紧音", "送气音", "鼻音"], explain: "双写的 ㅆ 是紧音。" },
      { type: "listen", prompt: "听音后选择带送气音的音节。", answer: "카", choices: ["가", "까", "카", "나"], speak: "카", explain: "카 的初声 ㅋ 是送气音。" },
      { type: "cloze", prompt: "补全同组辅音。", clozeText: "ㄷ（松音）→ ㄸ（紧音）→ ___（送气音）", answer: "ㅌ", choices: ["ㅌ", "ㅋ", "ㅍ", "ㅊ"], explain: "ㄷ/ㄸ/ㅌ 是同一发音部位的三档。" },
      { type: "type", prompt: "输入“便宜”的韩语基本形。", answer: "싸다", acceptable: ["싸다"], explain: "싸다 以紧音 ㅆ 开头；사다 是买。" },
      { type: "dictation", prompt: "听音并输入对应的音节。", answer: "빠", acceptable: ["빠"], speak: "빠", explain: "빠 的初声是紧音 ㅃ。" }
    ],
    unlocks: ["l33-batchim"]
  },
  {
    id: "l33-batchim",
    order: 6,
    milestone: "m0",
    title: "收音：音节底部的七种落点",
    subtitle: "识别终声位置，把复杂字母收进 ㄱ/ㄴ/ㄷ/ㄹ/ㅁ/ㅂ/ㅇ 七类。",
    duration: 20,
    focus: ["script", "sound", "listening"],
    objectives: ["找出音节中的收音", "知道收音只保留七类代表音", "读稳 국/눈/달/밤/밥/강"],
    teach: [
      { title: "底部字母就是收音", body: "一个音节块的下方若还有辅音，它就是终声，也叫收音。读完元音后，口腔在这个位置收住。", speak: "가, 각", examples: [{ ko: "가", zh: "没有收音" }, { ko: "각", zh: "底部 ㄱ 是收音" }] },
      { title: "书写多，实际落点只有七类", body: "收音字母虽然很多，单独位于音节末时归并为 ㄱ、ㄴ、ㄷ、ㄹ、ㅁ、ㅂ、ㅇ 七个代表音。", speak: "국, 눈, 옷, 달, 밤, 밥, 강", examples: [{ ko: "옷", zh: "衣服；末尾 ㅅ 收在 ㄷ 类口型" }, { ko: "밥", zh: "饭；末尾收在 ㅂ" }] },
      { title: "ㄴ/ㄹ/ㅁ/ㅇ 要分舌位", body: "ㄴ 舌尖抵齿龈，ㄹ 舌尖侧边放气，ㅁ 双唇闭合，ㅇ 舌根收住；不要都读成中文 n。", speak: "산, 달, 밤, 강", examples: [{ ko: "산", zh: "山；ㄴ 收音" }, { ko: "강", zh: "河；ㅇ 收音" }] },
      { title: "塞音收音不爆破", body: "국、옷、밥 的末尾只做关闭动作，不要再补一个“克、特、普”的元音尾巴。", speak: "국, 옷, 밥", examples: [{ ko: "국", zh: "汤/国家；ㄱ 收住" }, { ko: "밥", zh: "饭；双唇闭合后停止" }] }
    ],
    drills: [
      { type: "choice", prompt: "강 的收音是哪一个？", answer: "ㅇ", choices: ["ㄱ", "ㅏ", "ㅇ", "ㅎ"], explain: "강 底部的 ㅇ 是收音，读 ng。" },
      { type: "choice", prompt: "下列哪个音节没有收音？", answer: "나", choices: ["난", "날", "남", "나"], explain: "나 只有初声 ㄴ 和中声 ㅏ。" },
      { type: "listen", prompt: "听音后选择以 ㄹ 收尾的词。", answer: "달", choices: ["단", "달", "담", "당"], speak: "달", explain: "달 的收音是 ㄹ。" },
      { type: "cloze", prompt: "补全音节结构。", clozeText: "밥 = ㅂ + ㅏ + ___", answer: "ㅂ", choices: ["ㄴ", "ㄹ", "ㅂ", "ㅇ"], explain: "밥 的初声和收音都是 ㅂ。" },
      { type: "type", prompt: "输入“河”的韩语音节。", answer: "강", acceptable: ["강"], explain: "강 是 ㄱ + ㅏ + 收音 ㅇ。" },
      { type: "dictation", prompt: "听音并输入带收音的词。", answer: "밤", acceptable: ["밤"], speak: "밤", explain: "밤 表示夜晚，收音是 ㅁ。" }
    ],
    unlocks: ["l04-first-sentences"]
  }
];
