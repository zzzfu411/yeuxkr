const HANGUL_SOUND_BY_ID = {
  "v-a": "아", "v-ya": "야", "v-eo": "어", "v-yeo": "여", "v-o": "오", "v-yo": "요", "v-u": "우", "v-yu": "유", "v-eu": "으", "v-i": "이",
  "v-ae": "애", "v-e": "에", "v-yae": "얘", "v-ye": "예", "v-wa": "와", "v-wae": "왜", "v-oe": "외", "v-wo": "워", "v-we": "웨", "v-wi": "위", "v-ui": "의",
  "c-g": "가", "c-n": "나", "c-d": "다", "c-r": "라", "c-m": "마", "c-b": "바", "c-s": "사", "c-ng": "아, 앙", "c-j": "자", "c-h": "하",
  "c-kh": "카", "c-th": "타", "c-ph": "파", "c-ch": "차", "c-kk": "까", "c-tt": "따", "c-pp": "빠", "c-ss": "싸", "c-jj": "짜",
  "b-k": "밖", "b-n": "문", "b-t": "옷", "b-l": "물", "b-m": "밤", "b-p": "밥", "b-ng": "강"
};

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
    id: "vowels-compound",
    title: "复合元音",
    track: "sound",
    summary: "复合元音由基础元音组合而成。没有它们，예요、회사、왜 这些高频字都拼不出来。",
    items: [
      { id: "v-ae", glyph: "ㅐ", romanization: "ae", ipa: "ɛ", cue: "ㅏ + ㅣ 合成，现代首尔话里和 ㅔ 几乎同音", example: "개", exampleMeaning: "狗", parts: ["ㅏ", "ㅣ"] },
      { id: "v-e", glyph: "ㅔ", romanization: "e", ipa: "e", cue: "ㅓ + ㅣ 合成，比 ㅐ 略闭，口语中两者靠词汇区分", example: "네", exampleMeaning: "是；好的", parts: ["ㅓ", "ㅣ"] },
      { id: "v-yae", glyph: "ㅒ", romanization: "yae", ipa: "jɛ", cue: "ㅑ + ㅣ，等于 y + ㅐ，出现频率低", example: "얘기", exampleMeaning: "聊天；话", parts: ["ㅑ", "ㅣ"] },
      { id: "v-ye", glyph: "ㅖ", romanization: "ye", ipa: "je", cue: "ㅕ + ㅣ，等于 y + ㅔ；예요 就靠它", example: "예요", exampleMeaning: "是……（陈述句尾）", parts: ["ㅕ", "ㅣ"] },
      { id: "v-wa", glyph: "ㅘ", romanization: "wa", ipa: "wa", cue: "ㅗ 滑向 ㅏ，像干脆的 wa", example: "과일", exampleMeaning: "水果", parts: ["ㅗ", "ㅏ"] },
      { id: "v-wae", glyph: "ㅙ", romanization: "wae", ipa: "wɛ", cue: "ㅗ + ㅐ，口型从圆到开", example: "왜", exampleMeaning: "为什么", parts: ["ㅗ", "ㅐ"] },
      { id: "v-oe", glyph: "ㅚ", romanization: "oe", ipa: "we", cue: "写作 ㅗ + ㅣ，但现代发音同 ㅞ", example: "회사", exampleMeaning: "公司", parts: ["ㅗ", "ㅣ"] },
      { id: "v-wo", glyph: "ㅝ", romanization: "wo", ipa: "wʌ", cue: "ㅜ 滑向 ㅓ；韩元 원 就是它", example: "원", exampleMeaning: "韩元；圆", parts: ["ㅜ", "ㅓ"] },
      { id: "v-we", glyph: "ㅞ", romanization: "we", ipa: "we", cue: "ㅜ + ㅔ，多见于外来词", example: "스웨터", exampleMeaning: "毛衣", parts: ["ㅜ", "ㅔ"] },
      { id: "v-wi", glyph: "ㅟ", romanization: "wi", ipa: "wi", cue: "ㅜ 滑向 ㅣ，像法语 oui", example: "위", exampleMeaning: "上面；胃", parts: ["ㅜ", "ㅣ"] },
      { id: "v-ui", glyph: "ㅢ", romanization: "ui", ipa: "ɰi", cue: "ㅡ 快速滑向 ㅣ；词首读 ui，词中常读 i，表示“的”时常读 e", example: "의사", exampleMeaning: "医生", parts: ["ㅡ", "ㅣ"] }
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
].map((group) => ({
  ...group,
  items: group.items.map((item) => ({ ...item, sound: HANGUL_SOUND_BY_ID[item.id] ?? item.example }))
}));

export const syllableLabs = [
  { pattern: "CV", blocks: ["ㄱ", "ㅏ"], result: "가", note: "辅音在左，竖元音在右。" },
  { pattern: "CV", blocks: ["ㄱ", "ㅗ"], result: "고", note: "横元音放在辅音下方。" },
  { pattern: "CV", blocks: ["ㄱ", "ㅘ"], result: "과", note: "复合元音 ㅘ = ㅗ + ㅏ，横竖两部分包住辅音。" },
  { pattern: "CV", blocks: ["ㅇ", "ㅢ"], result: "의", note: "ㅢ = ㅡ + ㅣ；ㅇ 在音节首不发音。" },
  { pattern: "CVC", blocks: ["ㅎ", "ㅏ", "ㄴ"], result: "한", note: "收音放在底部。" },
  { pattern: "CVCC", blocks: ["ㅇ", "ㅏ", "ㄹㄱ"], result: "읽", note: "双收音需要按词形和后续音变判断。" }
];

export const pronunciationPairs = [
  { id: "plain-aspirated-k", a: "가", b: "카", focus: "松音 ㄱ vs 送气 ㅋ", tip: "手放嘴前，카 的气流明显。" },
  { id: "plain-tense-k", a: "가", b: "까", focus: "松音 ㄱ vs 紧音 ㄲ", tip: "까 不送气，但喉部更紧。" },
  { id: "eo-o", a: "어", b: "오", focus: "ㅓ vs ㅗ", tip: "오 圆唇，어 不圆唇且更靠后。" },
  { id: "eu-u", a: "으", b: "우", focus: "ㅡ vs ㅜ", tip: "우 圆唇，으 嘴唇放松。" },
  { id: "s-si", a: "사", b: "시", focus: "ㅅ 遇 ㅣ 的音色变化", tip: "시 更接近 xi，不要读成 si。" },
  { id: "ae-e", a: "개", b: "게", focus: "ㅐ vs ㅔ", tip: "现代口语两者几乎同音，靠词汇和拼写记忆区分。" },
  { id: "ye-e", a: "예", b: "에", focus: "ㅖ vs ㅔ", tip: "예 前面有 y 滑音，에 直接发元音。" },
  { id: "wa-o", a: "와", b: "오", focus: "ㅘ vs ㅗ", tip: "와 从圆唇滑向开口，오 保持圆唇不动。" },
  { id: "oe-we", a: "외", b: "웨", focus: "ㅚ vs ㅞ", tip: "两者现代发音相同，都读 we，差别只在拼写。" },
  { id: "ui-i", a: "의", b: "이", focus: "ㅢ vs ㅣ", tip: "의 先经过 ㅡ 再滑到 ㅣ，词中位置常弱化成 이。" }
];
