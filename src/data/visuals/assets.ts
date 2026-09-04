export type VisualAssetId =
  | "hero"
  | "workspace"
  | "path"
  | "selfStudy"
  | "hangul"
  | "vocabulary"
  | "grammar"
  | "native"
  | "immersion"
  | "quiz"
  | "lesson"
  | "lessonPronunciation"
  | "lessonCafe"
  | "lessonTransit"
  | "lessonTime"
  | "lessonHealth"
  | "lessonMedia"
  | "lessonHonorific"
  | "lessonOutput"
  | "review"
  | "complete"
  | "empty"
  | "iconBase";

export type DisplayVisualAssetId = Exclude<VisualAssetId, "iconBase">;

export interface VisualAsset {
  id: VisualAssetId;
  src: string;
  source: string;
  alt: string;
  promptSummary: string;
  manifestLabel: string;
}

function createGeneratedAsset(
  id: Exclude<VisualAssetId, "iconBase">,
  fileStem: string,
  alt: string,
  promptSummary: string,
  manifestLabel: string
): VisualAsset {
  return {
    id,
    src: `/assets/generated/${fileStem}.webp`,
    source: `/assets/generated/${fileStem}.png`,
    alt,
    promptSummary,
    manifestLabel
  };
}

function createIconBaseAsset(alt: string, promptSummary: string, manifestLabel: string): VisualAsset {
  const source = "/assets/generated/icon-base.png";
  return { id: "iconBase", src: source, source, alt, promptSummary, manifestLabel };
}

const studyStudioPrompt = "Quiet lived-in apartment study corner beside a spring window, with a completely blank open notebook, pencil, lightweight headphones, clear water glass, soft daylight, real home texture, and cinematic 35mm grain.";
const hangulPrompt = "Contemporary Hangul study close-up using translucent abstract acrylic bars, circles, and corners beside a blank notebook, with cool window light and no readable or invented characters.";
const pathPrompt = "Empty neighborhood train platform after summer rain, with a powder-blue bench, transparent umbrella, wet tracks receding into soft morning mist, greenery, and quiet Korean coming-of-age cinematography.";
const dialoguePrompt = "Two simple blue and muted-rose chairs angled toward each other across a small table at dusk, using a divided window and contrasting light to express conversational distance and connection.";
const immersionPrompt = "Empty city-bus window seat on a gentle autumn rain night, wired earbuds on worn navy fabric, fogged glass, restrained street-light bokeh, and reflective 35mm cinematography.";
const reviewPrompt = "Soft early-autumn bedroom morning with a numeral-free analog clock, a tidy stack of completely blank study cards, pencil, water, and reassuring cool daylight.";

export const visualAssets = {
  hero: createGeneratedAsset(
    "hero",
    "hero",
    "春雨后的城市窗边，两只杯子和山茶花枝映着蓝色暮光。",
    "Seoul apartment window at blue hour after spring rain, with two ceramic cups, a camellia branch, a sheer curtain, broad negative space, and quiet original romance-drama cinematography.",
    "Spring-rain opening frame"
  ),
  workspace: createGeneratedAsset(
    "workspace",
    "workspace",
    "窗光落在安静的学习桌、空白笔记本、耳机和水杯上。",
    studyStudioPrompt,
    "Window-side study scene"
  ),
  path: createGeneratedAsset(
    "path",
    "path",
    "雨后清晨的空站台，蓝色长椅旁的透明伞与轨道一起伸向远处。",
    pathPrompt,
    "Rain-washed learning path"
  ),
  selfStudy: createGeneratedAsset(
    "selfStudy",
    "self-study",
    "公寓窗边的空白笔记本和耳机，为今天留出一段安静的自学时间。",
    studyStudioPrompt,
    "Self-study window scene"
  ),
  hangul: createGeneratedAsset(
    "hangul",
    "hangul",
    "半透明几何字块在窗边组合，旁边放着空白练习本和铅笔。",
    hangulPrompt,
    "Abstract Hangul building blocks"
  ),
  vocabulary: createGeneratedAsset(
    "vocabulary",
    "vocabulary",
    "雨天社区咖啡馆的窗边桌上，摆着杯子、点心、橘子和一张无字卡片。",
    "Neighborhood cafe window table on a cloudy late-summer afternoon, with an unbranded ceramic cup, plain pastry, cotton tote, blank transit card, tangerines, and candid everyday texture.",
    "Everyday cafe vocabulary scene"
  ),
  grammar: createGeneratedAsset(
    "grammar",
    "grammar",
    "暮色客厅里，一蓝一粉两把椅子隔桌相对，像一句话里的距离与连接。",
    dialoguePrompt,
    "Conversation-distance scene"
  ),
  native: createGeneratedAsset(
    "native",
    "native",
    "两把颜色不同的椅子在黄昏窗前相对，留出恰好的礼貌距离。",
    dialoguePrompt,
    "Natural-expression dialogue scene"
  ),
  immersion: createGeneratedAsset(
    "immersion",
    "immersion",
    "雨夜公交的空座上放着耳机，窗外灯光在水汽里变成柔和光点。",
    immersionPrompt,
    "Rainy-night listening scene"
  ),
  quiz: createGeneratedAsset(
    "quiz",
    "quiz",
    "半透明几何字块和空白练习本在窗光里等待重新组合。",
    hangulPrompt,
    "Transfer-check scene"
  ),
  lesson: createGeneratedAsset(
    "lesson",
    "lesson",
    "有使用痕迹的学习桌沐在窗光里，笔记本仍留着下一页空白。",
    studyStudioPrompt,
    "Everyday lesson scene"
  ),
  lessonPronunciation: createGeneratedAsset(
    "lessonPronunciation",
    "lesson-pronunciation",
    "透明字块、圆形和折角在桌上排列，帮助观察声音与字形的位置。",
    hangulPrompt,
    "Pronunciation building-block scene"
  ),
  lessonCafe: createGeneratedAsset(
    "lessonCafe",
    "lesson-cafe",
    "社区咖啡馆窗边放着无品牌杯子、点心、橘子和随身布袋。",
    "Lived-in neighborhood cafe table with an unbranded drink, plain pastry, cotton tote, blank card, tangerines, soft rainy-day window light, and no commercial styling.",
    "Cafe lesson scene"
  ),
  lessonTransit: createGeneratedAsset(
    "lessonTransit",
    "lesson-transit",
    "雨后站台的轨道通向远处，蓝色长椅旁靠着一把透明伞。",
    pathPrompt,
    "Transit lesson scene"
  ),
  lessonTime: createGeneratedAsset(
    "lessonTime",
    "lesson-time",
    "无数字时钟、空白卡片和水杯在清晨窗光里排好。",
    reviewPrompt,
    "Time lesson morning scene"
  ),
  lessonHealth: createGeneratedAsset(
    "lessonHealth",
    "lesson-health",
    "雨天窗边的水杯、无字药袋、毛巾和橘子组成安静的恢复场景。",
    "Calm rainy apartment table with a water glass, completely unmarked medicine packet, face-down thermometer, pale-blue towel, and one tangerine in gentle domestic light.",
    "Health lesson recovery scene"
  ),
  lessonMedia: createGeneratedAsset(
    "lessonMedia",
    "lesson-media",
    "公交空座上的有线耳机等着播放下一段，雨水顺着夜色中的车窗滑落。",
    immersionPrompt,
    "Media listening night scene"
  ),
  lessonHonorific: createGeneratedAsset(
    "lessonHonorific",
    "lesson-honorific",
    "黄昏窗前的两把椅子与两杯水，安静地表现说话时的分寸。",
    dialoguePrompt,
    "Honorific-distance scene"
  ),
  lessonOutput: createGeneratedAsset(
    "lessonOutput",
    "lesson-output",
    "窗边学习桌上摊着空白笔记本，耳机和铅笔留出表达的起点。",
    studyStudioPrompt,
    "Output lesson writing scene"
  ),
  review: createGeneratedAsset(
    "review",
    "review",
    "清晨床边放着无数字时钟、空白卡片、铅笔和一杯水。",
    reviewPrompt,
    "Morning review-return scene"
  ),
  complete: createGeneratedAsset(
    "complete",
    "complete",
    "春日窗台上，合起的旧书、蓝色书签和一朵山茶花迎着明亮窗光。",
    "Hopeful final episode frame with a well-used unmarked clothbound book, pale-blue bookmark, one camellia bloom, lifted sheer curtains, spring greenery, and luminous space after rain.",
    "Quiet completion frame"
  ),
  empty: createGeneratedAsset(
    "empty",
    "empty",
    "雨停后的河边长椅空着，一把透明伞靠在旁边，地上落着几片山茶花瓣。",
    "Gentle in-between frame at a riverside park after spring rain, with an empty wooden bench, transparent umbrella, wet pavement, a few camellia petals, and broad calm space.",
    "Rain-cleared empty state"
  ),
  iconBase: createIconBaseAsset(
    "Kirina Korean 四季窗格应用图标。",
    "Minimal square brand mark built from one deep-navy rounded window frame, four unequal panes, a continuous curved learning path, mist blue and leaf green fields, and one camellia endpoint.",
    "Four-season window icon"
  )
} satisfies Record<VisualAssetId, VisualAsset>;
