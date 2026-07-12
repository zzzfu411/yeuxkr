export const hangulGroups = [
  {
    id: "vowels-basic",
    title: "基础元音",
    track: "sound",
    summary: "先把 10 个核心元音听清楚，避免一开始就用中文近似音替代。",
    items: [
      { id: "v-a", glyph: "ㅏ", romanization: "a", ipa: "a", cue: "口腔打开，像干净短促的 a", example: "아", exampleMeaning: "啊；孩子 아기 的开头" },
      { id: "v-ya", glyph: "ㅑ", romanization: "ya", ipa: "ja", cue: "ㅣ + ㅏ 的滑音", example: "야", exampleMeaning: "喂；非正式呼唤" },
      { id: "v-eo", glyph: "ㅓ", romanization: "eo", ipa: "ʌ", cue: "比 ㅏ 更靠后，不卷舌", example: "어", exampleMeaning: "嗯？；语气词" },
      { id: "v-yeo", glyph: "ㅕ", romanization: "yeo", ipa: "jʌ", cue: "ㅣ + ㅓ 的滑音", example: "여기", exampleMeaning: "这里" },
      { id: "v-o", glyph: "ㅗ", romanization: "o", ipa: "o", cue: "圆唇，声音靠前", example: "오", exampleMeaning: "五；哦" },
      { id: "v-yo", glyph: "ㅛ", romanization: "yo", ipa: "jo", cue: "ㅣ + ㅗ 的滑音", example: "요", exampleMeaning: "礼貌句尾的一部分" },
      { id: "v-u", glyph: "ㅜ", romanization: "u", ipa: "u", cue: "圆唇，声音靠后", example: "우유", exampleMeaning: "牛奶" },
      { id: "v-yu", glyph: "ㅠ", romanization: "yu", ipa: "ju", cue: "ㅣ + ㅜ 的滑音", example: "유리", exampleMeaning: "玻璃；名字 Yuri" },
      { id: "v-eu", glyph: "ㅡ", romanization: "eu", ipa: "ɯ", cue: "嘴唇放松，舌位高，不要读成“呃儿”", example: "으", exampleMeaning: "犹豫或用力声" },
      { id: "v-i", glyph: "ㅣ", romanization: "i", ipa: "i", cue: "像清晰的 i", example: "이", exampleMeaning: "二；这；牙" }
    ]
  },
  {
    id: "consonants-basic",
    title: "基础辅音",
    track: "sound",
    summary: "韩语辅音要从发音力度理解：松音、紧音、送气音会影响听力和拼写。",
    items: [
      { id: "c-g", glyph: "ㄱ", romanization: "g/k", ipa: "k~g", cue: "词首偏 k，元音间偏 g", example: "가", exampleMeaning: "走；家族名开头" },
      { id: "c-n", glyph: "ㄴ", romanization: "n", ipa: "n", cue: "舌尖抵上齿龈", example: "나", exampleMeaning: "我" },
      { id: "c-d", glyph: "ㄷ", romanization: "d/t", ipa: "t~d", cue: "词首偏 t，元音间偏 d", example: "다", exampleMeaning: "全部；句尾形态" },
      { id: "c-r", glyph: "ㄹ", romanization: "r/l", ipa: "ɾ~l", cue: "元音间轻弹 r，收音偏 l", example: "라디오", exampleMeaning: "收音机" },
      { id: "c-m", glyph: "ㅁ", romanization: "m", ipa: "m", cue: "双唇闭合", example: "마음", exampleMeaning: "心；心情" },
      { id: "c-b", glyph: "ㅂ", romanization: "b/p", ipa: "p~b", cue: "词首偏 p，元音间偏 b", example: "바다", exampleMeaning: "海" },
      { id: "c-s", glyph: "ㅅ", romanization: "s", ipa: "s~ɕ", cue: "遇 ㅣ 系音会变得更像 xi", example: "사", exampleMeaning: "四；买 사다 的词根" },
      { id: "c-ng", glyph: "ㅇ", romanization: "silent/ng", ipa: "∅~ŋ", cue: "音节首不发音，收音读 ng", example: "아이", exampleMeaning: "孩子" },
      { id: "c-j", glyph: "ㅈ", romanization: "j", ipa: "tɕ~dʑ", cue: "轻的 j/ch 之间", example: "자", exampleMeaning: "来吧；尺子" },
      { id: "c-h", glyph: "ㅎ", romanization: "h", ipa: "h", cue: "气流明显但不要过重", example: "하나", exampleMeaning: "一；一个" }
    ]
  },
  {
    id: "aspirated-tense",
    title: "送气音与紧音",
    track: "sound",
    summary: "这是中文学习者最容易混的一组：靠“气流”和“喉部紧张度”区分。",
    items: [
      { id: "c-kh", glyph: "ㅋ", romanization: "k", ipa: "kʰ", cue: "明显送气的 ㄱ", example: "커피", exampleMeaning: "咖啡" },
      { id: "c-th", glyph: "ㅌ", romanization: "t", ipa: "tʰ", cue: "明显送气的 ㄷ", example: "타다", exampleMeaning: "乘坐；燃烧" },
      { id: "c-ph", glyph: "ㅍ", romanization: "p", ipa: "pʰ", cue: "明显送气的 ㅂ", example: "파", exampleMeaning: "葱" },
      { id: "c-ch", glyph: "ㅊ", romanization: "ch", ipa: "tɕʰ", cue: "明显送气的 ㅈ", example: "차", exampleMeaning: "车；茶" },
      { id: "c-kk", glyph: "ㄲ", romanization: "kk", ipa: "k͈", cue: "喉部绷紧，不送气", example: "까다", exampleMeaning: "剥；挑剔" },
      { id: "c-tt", glyph: "ㄸ", romanization: "tt", ipa: "t͈", cue: "紧的 ㄷ，不送气", example: "따뜻하다", exampleMeaning: "温暖" },
      { id: "c-pp", glyph: "ㅃ", romanization: "pp", ipa: "p͈", cue: "紧的 ㅂ，不送气", example: "빠르다", exampleMeaning: "快" },
      { id: "c-ss", glyph: "ㅆ", romanization: "ss", ipa: "s͈", cue: "紧的 ㅅ", example: "싸다", exampleMeaning: "便宜；包裹" },
      { id: "c-jj", glyph: "ㅉ", romanization: "jj", ipa: "tɕ͈", cue: "紧的 ㅈ", example: "짜다", exampleMeaning: "咸；编织" }
    ]
  },
  {
    id: "batchim",
    title: "收音规则",
    track: "script",
    summary: "收音不是把所有字母原样读出来，而是归并到 7 个收音口型。",
    items: [
      { id: "b-k", glyph: "ㄱ/ㅋ/ㄲ", romanization: "k", ipa: "k̚", cue: "舌根闭住，不爆破", example: "밖", exampleMeaning: "外面" },
      { id: "b-n", glyph: "ㄴ", romanization: "n", ipa: "n", cue: "舌尖鼻音", example: "문", exampleMeaning: "门" },
      { id: "b-t", glyph: "ㄷ/ㅅ/ㅈ/ㅊ/ㅌ/ㅎ/ㅆ", romanization: "t", ipa: "t̚", cue: "舌尖闭住，不爆破", example: "옷", exampleMeaning: "衣服" },
      { id: "b-l", glyph: "ㄹ", romanization: "l", ipa: "l", cue: "舌尖保持接触", example: "물", exampleMeaning: "水" },
      { id: "b-m", glyph: "ㅁ", romanization: "m", ipa: "m", cue: "双唇鼻音", example: "밤", exampleMeaning: "夜；栗子" },
      { id: "b-p", glyph: "ㅂ/ㅍ", romanization: "p", ipa: "p̚", cue: "双唇闭住，不爆破", example: "밥", exampleMeaning: "饭" },
      { id: "b-ng", glyph: "ㅇ", romanization: "ng", ipa: "ŋ", cue: "舌根鼻音", example: "강", exampleMeaning: "河" }
    ]
  }
];

export const syllableLabs = [
  { pattern: "CV", blocks: ["ㄱ", "ㅏ"], result: "가", note: "辅音在左，竖元音在右。" },
  { pattern: "CV", blocks: ["ㄱ", "ㅗ"], result: "고", note: "横元音放在辅音下方。" },
  { pattern: "CVC", blocks: ["ㅎ", "ㅏ", "ㄴ"], result: "한", note: "收音放在底部。" },
  { pattern: "CVCC", blocks: ["ㅇ", "ㅏ", "ㄹㄱ"], result: "읽", note: "双收音需要按词形和后续音变判断。" }
];

export const pronunciationPairs = [
  { id: "plain-aspirated-k", a: "가", b: "카", focus: "松音 ㄱ vs 送气 ㅋ", tip: "手放嘴前，카 的气流明显。" },
  { id: "plain-tense-k", a: "가", b: "까", focus: "松音 ㄱ vs 紧音 ㄲ", tip: "까 不送气，但喉部更紧。" },
  { id: "eo-o", a: "어", b: "오", focus: "ㅓ vs ㅗ", tip: "오 圆唇，어 不圆唇且更靠后。" },
  { id: "eu-u", a: "으", b: "우", focus: "ㅡ vs ㅜ", tip: "우 圆唇，으 嘴唇放松。" },
  { id: "s-si", a: "사", b: "시", focus: "ㅅ 遇 ㅣ 的音色变化", tip: "시 更接近 xi，不要读成 si。" }
];
