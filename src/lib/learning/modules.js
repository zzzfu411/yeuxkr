export const studyModuleDescriptors = {
  script: {
    ability: "script",
    title: "韩文与收音",
    href: "/hangul",
    daily: "读 8-12 个音节块，做 3 组最小对立跟读。",
    checkpoint: "看到新词能拆出初声、中声、终声，并能说出收音口型。",
    readiness: 18
  },
  listening: {
    ability: "listening",
    title: "发音与听辨",
    href: "/hangul",
    daily: "先听后读，录一遍自己的声音，重点比较 ㅓ/ㅗ、ㅡ/ㅜ、松音/紧音/送气音。",
    checkpoint: "能稳定听出 5 组最小对立，并能慢速复述短句。",
    readiness: 18
  },
  vocabulary: {
    ability: "vocabulary",
    title: "词汇与搭配",
    href: "/vocabulary",
    daily: "学习 8-15 个词，只把能造句的词加入间隔复习。",
    checkpoint: "能用本周词汇写出 8 句与自己生活有关的句子。",
    readiness: 24
  },
  grammar: {
    ability: "grammar",
    title: "句型骨架",
    href: "/grammar",
    daily: "选 1 个语法点，读例句、替换主语/宾语/时间，造 3 个自己的句子。",
    checkpoint: "能不用中文顺序硬翻，直接用韩语句型表达想法。",
    readiness: 18
  },
  pragmatics: {
    ability: "pragmatics",
    title: "场景语用",
    href: "/native",
    daily: "选 1 个场景，跟读 3 句，再改写成自己的关系和场合。",
    checkpoint: "能根据陌生人、朋友、前辈三种关系调整同一意图。",
    readiness: 16
  },
  native: {
    ability: "native",
    title: "自然表达",
    href: "/native",
    daily: "积累 2 个缓冲表达或语气副词，用它们改写直接句。",
    checkpoint: "能解释为什么同一个中文意思在韩语里需要不同语气。",
    readiness: 16
  },
  media: {
    ability: "listening",
    title: "情境听读",
    href: "/immersion",
    daily: "听一句、遮译文听写、再用韩语复述关键信息。",
    checkpoint: "能从一段情境听读中找出人物、动作、原因或态度。",
    readiness: 12
  }
};

export const studyModuleIds = Object.keys(studyModuleDescriptors);
export const foundationSpine = ["script", "listening"];

export function isStudyModuleId(moduleId) {
  return Boolean(studyModuleDescriptors[moduleId]);
}

export function getStudyModuleDescriptor(moduleId) {
  return studyModuleDescriptors[moduleId] ?? null;
}

export function moduleToAbility(moduleId) {
  return studyModuleDescriptors[moduleId]?.ability ?? null;
}

export function hrefForStudyModule(moduleId) {
  return studyModuleDescriptors[moduleId]?.href ?? "/";
}

export function studyModuleReadinessRequirement(moduleId) {
  return studyModuleDescriptors[moduleId]?.readiness ?? 1;
}

export function uniqueModuleAbilities(moduleIds) {
  return [...new Set(moduleIds.map(moduleToAbility).filter(Boolean))];
}
