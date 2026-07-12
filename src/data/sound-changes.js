export const soundChangeRules = [
  {
    id: "sc-liaison",
    korean: "연음",
    title: "连音",
    summary: "收音遇到元音开头的音节时，会移过去当下一个音节的初声。这是韩语听起来“连成一片”的最大原因。",
    rule: "收音 + ㅇ 开头音节 → 收音变成下一音节的初声",
    stage: "foundation",
    examples: [
      { written: "한국어", spoken: "한구거", romanization: "han-gu-geo", zh: "韩语", speak: "한국어" },
      { written: "음악", spoken: "으막", romanization: "eu-mak", zh: "音乐", speak: "음악" },
      { written: "옷이", spoken: "오시", romanization: "o-si", zh: "衣服（+主格助词）", speak: "옷이" }
    ]
  },
  {
    id: "sc-nasalization",
    korean: "비음화",
    title: "鼻音化",
    summary: "塞音收音（ㄱ/ㄷ/ㅂ 类）遇到鼻音 ㄴ/ㅁ 时，自己也变成对应的鼻音 ㅇ/ㄴ/ㅁ。감사합니다 听起来是 함니다 就是它。",
    rule: "ㄱ→ㅇ、ㄷ→ㄴ、ㅂ→ㅁ（后面跟 ㄴ/ㅁ 时）",
    stage: "foundation",
    examples: [
      { written: "감사합니다", spoken: "감사함니다", romanization: "gam-sa-ham-ni-da", zh: "谢谢", speak: "감사합니다" },
      { written: "한국말", spoken: "한궁말", romanization: "han-gung-mal", zh: "韩国话", speak: "한국말" },
      { written: "있는", spoken: "인는", romanization: "in-neun", zh: "有的/在的（定语形）", speak: "있는" }
    ]
  },
  {
    id: "sc-liquidization",
    korean: "유음화",
    title: "流音化",
    summary: "ㄴ 和 ㄹ 相邻时，ㄴ 会被同化成 ㄹ，两个音节间读成 ㄹㄹ。",
    rule: "ㄴ + ㄹ 或 ㄹ + ㄴ → ㄹㄹ",
    stage: "growth",
    examples: [
      { written: "연락", spoken: "열락", romanization: "yeol-lak", zh: "联络", speak: "연락" },
      { written: "설날", spoken: "설랄", romanization: "seol-lal", zh: "春节", speak: "설날" },
      { written: "한라산", spoken: "할라산", romanization: "hal-la-san", zh: "汉拿山", speak: "한라산" }
    ]
  },
  {
    id: "sc-aspiration",
    korean: "격음화",
    title: "激音化",
    summary: "ㅎ 和 ㄱ/ㄷ/ㅂ/ㅈ 相邻时合并成送气音 ㅋ/ㅌ/ㅍ/ㅊ。축하 读作 추카 就是它。",
    rule: "ㅎ + ㄱ/ㄷ/ㅂ/ㅈ（或反过来）→ ㅋ/ㅌ/ㅍ/ㅊ",
    stage: "foundation",
    examples: [
      { written: "축하해요", spoken: "추카해요", romanization: "chu-ka-hae-yo", zh: "祝贺", speak: "축하해요" },
      { written: "좋다", spoken: "조타", romanization: "jo-ta", zh: "好", speak: "좋다" },
      { written: "입학", spoken: "이팍", romanization: "i-pak", zh: "入学", speak: "입학" }
    ]
  },
  {
    id: "sc-tensification",
    korean: "경음화",
    title: "紧音化",
    summary: "塞音收音后面的 ㄱ/ㄷ/ㅂ/ㅅ/ㅈ 会读成紧音。학교 听起来是 학꾜，식당 听起来是 식땅。",
    rule: "塞音收音 + ㄱ/ㄷ/ㅂ/ㅅ/ㅈ → ㄲ/ㄸ/ㅃ/ㅆ/ㅉ",
    stage: "foundation",
    examples: [
      { written: "학교", spoken: "학꾜", romanization: "hak-kkyo", zh: "学校", speak: "학교" },
      { written: "식당", spoken: "식땅", romanization: "sik-ttang", zh: "食堂/餐厅", speak: "식당" },
      { written: "듣다", spoken: "듣따", romanization: "deut-tta", zh: "听", speak: "듣다" }
    ]
  },
  {
    id: "sc-h-drop",
    korean: "ㅎ탈락",
    title: "ㅎ 脱落",
    summary: "收音 ㅎ 遇到元音开头的音节时直接消失。좋아요 读作 조아요，많이 读作 마니。",
    rule: "收音 ㅎ + 元音 → ㅎ 不发音",
    stage: "foundation",
    examples: [
      { written: "좋아요", spoken: "조아요", romanization: "jo-a-yo", zh: "好/喜欢", speak: "좋아요" },
      { written: "많이", spoken: "마니", romanization: "ma-ni", zh: "很多", speak: "많이" },
      { written: "넣어요", spoken: "너어요", romanization: "neo-eo-yo", zh: "放进去", speak: "넣어요" }
    ]
  },
  {
    id: "sc-palatalization",
    korean: "구개음화",
    title: "腭化",
    summary: "收音 ㄷ/ㅌ 遇到 이 时，会变成 지/치。같이 读作 가치 是最高频的例子。",
    rule: "ㄷ + 이 → 지；ㅌ + 이 → 치",
    stage: "growth",
    examples: [
      { written: "같이", spoken: "가치", romanization: "ga-chi", zh: "一起", speak: "같이" },
      { written: "굳이", spoken: "구지", romanization: "gu-ji", zh: "非要/偏要", speak: "굳이" },
      { written: "해돋이", spoken: "해도지", romanization: "hae-do-ji", zh: "日出", speak: "해돋이" }
    ]
  }
];
