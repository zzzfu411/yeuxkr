export type VisualAssetId =
  | "letterK"
  | "letterH"
  | "letterHello"
  | "letterHangul"
  | "letterAgain"
  | "letterSlowly"
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
export type LetterAssetId = Extract<VisualAssetId, `letter${string}`>;

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

export const visualAssets = {
  letterK: createGeneratedAsset("letterK", "letter-k", "单个钴蓝色韩文字母 ㅋ 贴片。", "One isolated cobalt Korean consonant ㅋ, close white die-cut outline, transparent alpha, bold printed type, no extra words, no scene, no photograph, no watermark.", "Korean letter ㅋ"),
  letterH: createGeneratedAsset("letterH", "letter-h", "柠檬黄色纸片上的单个韩文字母 ㅎ。", "One black Korean consonant ㅎ on a tiny lemon yellow paper scrap, transparent alpha, bold printed lettering, no other graphics, no photograph, no watermark.", "Korean letter ㅎ"),
  letterHello: createGeneratedAsset("letterHello", "letter-annyeong", "淡紫色短纸条上的韩文 안녕，意为你好。", "One short lilac typographic sticker reading exactly 안녕, two black Korean syllables, transparent alpha, no additional marks, no photographs, no watermark.", "Korean word 안녕"),
  letterHangul: createGeneratedAsset("letterHangul", "letter-hangul", "钴蓝色短贴纸上的白色韩文 한글。", "One short cobalt paper cutout with the exact white word 한글, accurate heavy Korean type, transparent alpha, no scene, no photograph, no watermark.", "Korean word 한글"),
  letterAgain: createGeneratedAsset("letterAgain", "letter-dasi", "橘色小纸条上的韩文 다시，意为再一次。", "One short tangerine paper scrap reading exactly 다시 in chunky black Korean type, transparent alpha, no additional characters, no photograph, no watermark.", "Korean word 다시"),
  letterSlowly: createGeneratedAsset("letterSlowly", "letter-jogeumssik", "白色纸片上的钴蓝韩文 조금씩，意为一点一点。", "One die-cut Korean word 조금씩, three accurate cobalt syllables on close white contour, transparent alpha, no collage, no photographs, no watermark.", "Korean word 조금씩"),
  hero: createGeneratedAsset("hero", "seoul-street", "首尔街角、书店和咖啡馆照片，与问候语 안녕!、서울、한글 彩色韩文贴纸拼贴。", "Use case: stylized-concept. Make one original square hero ART COLLAGE for a Korean learning website named Kirina (do not write the brand). Art direction: SEOUL STREET + HANGUL STICKER WALL, contemporary independent Seoul magazine / street poster culture. This must NOT be a landscape painting, NOT watercolor, NOT a quiet porcelain still life. Build a tactile ", "Seoul street sticker collage"),
  workspace: createGeneratedAsset("workspace", "seoul-bookshop", "首尔街角书店、书架与 책방、공부、차근차근 韩文贴纸。", "Generate one NEW original square editorial collage, matching the supplied Kirina Seoul sticker reference in visual language, NOT copying its specific composition. Hero artwork for an integrated Korean study space. Central photographic cut-out of a tiny independent Seoul bookshop: glass door, outdoor book rack, blue metal stool, warm brick facade, a", "Seoul neighborhood bookshop"),
  path: createGeneratedAsset("path", "seoul-bookshop", "首尔街角书店、书架与 책방、공부、차근차근 韩文贴纸。", "Generate one NEW original square editorial collage, matching the supplied Kirina Seoul sticker reference in visual language, NOT copying its specific composition. Hero artwork for an integrated Korean study space. Central photographic cut-out of a tiny independent Seoul bookshop: glass door, outdoor book rack, blue metal stool, warm brick facade, a", "Seoul neighborhood bookshop"),
  selfStudy: createGeneratedAsset("selfStudy", "seoul-bookshop", "首尔街角书店、书架与 책방、공부、차근차근 韩文贴纸。", "Generate one NEW original square editorial collage, matching the supplied Kirina Seoul sticker reference in visual language, NOT copying its specific composition. Hero artwork for an integrated Korean study space. Central photographic cut-out of a tiny independent Seoul bookshop: glass door, outdoor book rack, blue metal stool, warm brick facade, a", "Seoul neighborhood bookshop"),
  hangul: createGeneratedAsset("hangul", "hangul-wall", "钴蓝 한글 标题与 ㄱ、ㄴ、ㄷ、ㅏ、가、나、다 韩文字母贴纸。", "Use case: stylized-concept. Generate one NEW original square artwork in the visual family of the reference, which is ONLY a style reference. Scene: a graphic HANGUL STICKER WALL, no photographs: original oversized crisp typography die-cut stickers reading exactly '한글', 'ㄱ', 'ㄴ', 'ㄷ', 'ㅏ', '가', '나', '다'. The main 한글 label in cobalt occupies the upper center, ", "Hangul sticker wall"),
  vocabulary: createGeneratedAsset("vocabulary", "seoul-market", "首尔分食店、辣炒年糕与 맛있다!、골목、한 입 韩文贴纸。", "Generate one NEW original square Seoul street photography and Hangul sticker collage in the supplied reference visual family, using the reference ONLY for style. Photographic cut-outs of an ordinary Seoul neighborhood snack storefront with simple sign '분식', a little stainless counter, a bright orange tray of tteokbokki, unbranded banana milk carton", "Seoul neighborhood market"),
  grammar: createGeneratedAsset("grammar", "cafe-talk", "绿色遮阳篷咖啡馆、纸杯与 커피、한 잔、이야기 韩文贴纸。", "Use case: stylized-concept. Generate one NEW original square artwork in the visual family of the reference, which is ONLY a style reference. Scene: a cut-out color film photograph of a small Seoul red-brick neighborhood cafe, green striped awning, open window, two mismatched stools, one takeaway cup in the foreground, tiny unbranded bakery paper bag. Overlay", "Cafe conversation collage"),
  native: createGeneratedAsset("native", "cafe-talk", "绿色遮阳篷咖啡馆、纸杯与 커피、한 잔、이야기 韩文贴纸。", "Use case: stylized-concept. Generate one NEW original square artwork in the visual family of the reference, which is ONLY a style reference. Scene: a cut-out color film photograph of a small Seoul red-brick neighborhood cafe, green striped awning, open window, two mismatched stools, one takeaway cup in the foreground, tiny unbranded bakery paper bag. Overlay", "Cafe conversation collage"),
  immersion: createGeneratedAsset("immersion", "seoul-records", "首尔夜间唱片店、耳机与 듣다、오늘、천천히 韩文贴纸。", "Generate one NEW original square Seoul street photography + bold Hangul sticker collage in the supplied reference visual family. Reference is ONLY a style reference. An original fictional small vinyl record shop on a Seoul street after sunset, indigo door, warm rectangular window, a modest sign reading '음악', a close photographic crop of wired headp", "Seoul evening records"),
  quiz: createGeneratedAsset("quiz", "practice-stickers", "钴蓝 다시!、柠檬黄 할 수 있어!、淡紫 조금씩 与 가、나、다 练习贴纸。", "Generate one NEW original square artwork matching the supplied Kirina Seoul sticker reference ONLY in style. A graphic Korean STICKER WALL for a friendly practice space, typographic artwork rather than a photo scene. Oversized accurate Hangul die-cut stickers reading exactly '다시!' (dominant cobalt blue type on white rim), '할 수 있어!' (black on lemon ", "Hangul practice stickers"),
  lesson: createGeneratedAsset("lesson", "seoul-street", "首尔街角、书店和咖啡馆照片，与问候语 안녕!、서울、한글 彩色韩文贴纸拼贴。", "Use case: stylized-concept. Make one original square hero ART COLLAGE for a Korean learning website named Kirina (do not write the brand). Art direction: SEOUL STREET + HANGUL STICKER WALL, contemporary independent Seoul magazine / street poster culture. This must NOT be a landscape painting, NOT watercolor, NOT a quiet porcelain still life. Build a tactile ", "Seoul street sticker collage"),
  lessonPronunciation: createGeneratedAsset("lessonPronunciation", "hangul-wall", "钴蓝 한글 标题与 ㄱ、ㄴ、ㄷ、ㅏ、가、나、다 韩文字母贴纸。", "Use case: stylized-concept. Generate one NEW original square artwork in the visual family of the reference, which is ONLY a style reference. Scene: a graphic HANGUL STICKER WALL, no photographs: original oversized crisp typography die-cut stickers reading exactly '한글', 'ㄱ', 'ㄴ', 'ㄷ', 'ㅏ', '가', '나', '다'. The main 한글 label in cobalt occupies the upper center, ", "Hangul sticker wall"),
  lessonCafe: createGeneratedAsset("lessonCafe", "cafe-talk", "绿色遮阳篷咖啡馆、纸杯与 커피、한 잔、이야기 韩文贴纸。", "Use case: stylized-concept. Generate one NEW original square artwork in the visual family of the reference, which is ONLY a style reference. Scene: a cut-out color film photograph of a small Seoul red-brick neighborhood cafe, green striped awning, open window, two mismatched stools, one takeaway cup in the foreground, tiny unbranded bakery paper bag. Overlay", "Cafe conversation collage"),
  lessonTransit: createGeneratedAsset("lessonTransit", "seoul-listening", "首尔街道、绿色公交车、耳机与 듣다、서울、출발! 韩文贴纸。", "Use case: stylized-concept. Create a new square Seoul street photograph + Hangul sticker collage in the attached reference's graphic family. A cut-out candid color film photograph of a pale mint-green Seoul city bus seen at a street corner with a zebra crossing and brick neighborhood buildings. Smaller photo fragment of a subway stair entrance; close-up of o", "Seoul listening collage"),
  lessonTime: createGeneratedAsset("lessonTime", "seoul-listening", "首尔街道、绿色公交车、耳机与 듣다、서울、출발! 韩文贴纸。", "Use case: stylized-concept. Create a new square Seoul street photograph + Hangul sticker collage in the attached reference's graphic family. A cut-out candid color film photograph of a pale mint-green Seoul city bus seen at a street corner with a zebra crossing and brick neighborhood buildings. Smaller photo fragment of a subway stair entrance; close-up of o", "Seoul listening collage"),
  lessonHealth: createGeneratedAsset("lessonHealth", "seoul-market", "首尔分食店、辣炒年糕与 맛있다!、골목、한 입 韩文贴纸。", "Generate one NEW original square Seoul street photography and Hangul sticker collage in the supplied reference visual family, using the reference ONLY for style. Photographic cut-outs of an ordinary Seoul neighborhood snack storefront with simple sign '분식', a little stainless counter, a bright orange tray of tteokbokki, unbranded banana milk carton", "Seoul neighborhood market"),
  lessonMedia: createGeneratedAsset("lessonMedia", "seoul-records", "首尔夜间唱片店、耳机与 듣다、오늘、천천히 韩文贴纸。", "Generate one NEW original square Seoul street photography + bold Hangul sticker collage in the supplied reference visual family. Reference is ONLY a style reference. An original fictional small vinyl record shop on a Seoul street after sunset, indigo door, warm rectangular window, a modest sign reading '음악', a close photographic crop of wired headp", "Seoul evening records"),
  lessonHonorific: createGeneratedAsset("lessonHonorific", "cafe-talk", "绿色遮阳篷咖啡馆、纸杯与 커피、한 잔、이야기 韩文贴纸。", "Use case: stylized-concept. Generate one NEW original square artwork in the visual family of the reference, which is ONLY a style reference. Scene: a cut-out color film photograph of a small Seoul red-brick neighborhood cafe, green striped awning, open window, two mismatched stools, one takeaway cup in the foreground, tiny unbranded bakery paper bag. Overlay", "Cafe conversation collage"),
  lessonOutput: createGeneratedAsset("lessonOutput", "seoul-bookshop", "首尔街角书店、书架与 책방、공부、차근차근 韩文贴纸。", "Generate one NEW original square editorial collage, matching the supplied Kirina Seoul sticker reference in visual language, NOT copying its specific composition. Hero artwork for an integrated Korean study space. Central photographic cut-out of a tiny independent Seoul bookshop: glass door, outdoor book rack, blue metal stool, warm brick facade, a", "Seoul neighborhood bookshop"),
  review: createGeneratedAsset("review", "practice-stickers", "钴蓝 다시!、柠檬黄 할 수 있어!、淡紫 조금씩 与 가、나、다 练习贴纸。", "Generate one NEW original square artwork matching the supplied Kirina Seoul sticker reference ONLY in style. A graphic Korean STICKER WALL for a friendly practice space, typographic artwork rather than a photo scene. Oversized accurate Hangul die-cut stickers reading exactly '다시!' (dominant cobalt blue type on white rim), '할 수 있어!' (black on lemon ", "Hangul practice stickers"),
  complete: createGeneratedAsset("complete", "practice-stickers", "钴蓝 다시!、柠檬黄 할 수 있어!、淡紫 조금씩 与 가、나、다 练习贴纸。", "Generate one NEW original square artwork matching the supplied Kirina Seoul sticker reference ONLY in style. A graphic Korean STICKER WALL for a friendly practice space, typographic artwork rather than a photo scene. Oversized accurate Hangul die-cut stickers reading exactly '다시!' (dominant cobalt blue type on white rim), '할 수 있어!' (black on lemon ", "Hangul practice stickers"),
  empty: createGeneratedAsset("empty", "seoul-street", "首尔街角、书店和咖啡馆照片，与问候语 안녕!、서울、한글 彩色韩文贴纸拼贴。", "Use case: stylized-concept. Make one original square hero ART COLLAGE for a Korean learning website named Kirina (do not write the brand). Art direction: SEOUL STREET + HANGUL STICKER WALL, contemporary independent Seoul magazine / street poster culture. This must NOT be a landscape painting, NOT watercolor, NOT a quiet porcelain still life. Build a tactile ", "Seoul street sticker collage"),
  iconBase: createIconBaseAsset("柠檬黄色贴纸上的钴蓝韩文 ㅋ，Kirina 应用图标。", "Use case: logo-brand. Generate one minimalist square Korean-letter app icon, a counterpart to the reference sticker art. ONLY a single perfectly accurate Korean consonant 'ㅋ', large and very bold geometric, cobalt blue #3155E7, centered inside a softly irregular lemon-yellow #F2EB98 rounded square sticker on plain white. Straight frontal view, not tilted. Th", "Kirina Hangul sticker icon")
} satisfies Record<VisualAssetId, VisualAsset>;
