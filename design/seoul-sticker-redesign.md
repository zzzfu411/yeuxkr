# Kirina · 首尔街头与韩文贴纸

2026-09-08。依据用户修订：取消景物水粉画，以首尔街景、可辨认的韩文字贴纸建立自己的风格。

## 设计约定

- 白底 #FCFCFA；正文 #222222；主操作钴蓝 #3155E7；贴纸橙 #FF784F、柠檬黄 #F2EB98、淡紫 #D8CCF0。
- UI 使用系统无衬线，中文优先 PingFang SC / Microsoft YaHei；韩文标题使用 Apple SD Gothic Neo / Malgun Gothic。韩语阅读可保留现有 Noto Serif KR。标题粗细与留白建立层次，避免通篇大标题。
- 街景与巨型韩字集中在原创拼贴中；学习表单、列表和导航保持整齐。贴纸不可裁去文字，不用电影滤镜、渐变遮罩或通篇纸纹。
- 首页只设一个主要学习入口，然后是今日任务、三个学习栏目。进度与偏好按需展开；所有学习功能保留。
- 模块页缩小重复介绍，先看到当前内容、搜索和练习。字号、键盘焦点、44px 点击目标、夜间主题和减少动效设置一致。

```text
┌ ㅋ Kirina      今日 路线 韩文 复习 听读 更多      主题 数据 ┐
│                                                         │
│   안녕, 오늘도!               首尔街角照片 × 韩文贴纸       │
│   把韩语，                                              │
│   学进日常。                 안녕! / 서울 / 한글          │
│   简短说明 · [开始学习 →]                                │
├ 今天学什么 ─────────────────────────────── 查看学习路线 ┤
│   按进度排列的 1–3 项任务                               │
├ 从你感兴趣的地方开始 ────────────────────────────────── ┤
│   韩文字母墙         街角咖啡馆         城市通勤听读       │
│   韩文字母 →         日常词汇 →         情境听读 →         │
├ 学习进度与安排 ▾          学习偏好 ▾                     ┤
└ Kirina Korean                 每天一点，慢慢听懂。        ┘
```

移动端保持同一阅读顺序，首个按钮在首屏内；主视觉完整展示。主题沿用现有存储键以兼容个人设置。

## 资产制作

生成器：内置 imagegen；生成日期：2026-09-08。以下为原创生成图片，并非真实店铺、公交线路或地图资料。审阅生成字形后采用，UI 文案用真实 DOM 文本。PNG 保留原始像素与透明度；Sharp 只生成 WebP 和图标尺寸，不修改作品内容。旧资产可从 Git 历史恢复，不再随当前站点发布。

### seoul-street

模式：文生图。

原始输出：`C:\Users\zfu\.codex\generated_images\01a07030-b907-7921-b399-b2cbe7d70e6d\exec-e412df7c-e4aa-478a-b54d-d3f6a52cda81.png`。

项目源文件：`public/assets/generated/seoul-street.png`。

最终提示词：

```text
Use case: stylized-concept. Make one original square hero ART COLLAGE for a Korean learning website named Kirina (do not write the brand). Art direction: SEOUL STREET + HANGUL STICKER WALL, contemporary independent Seoul magazine / street poster culture. This must NOT be a landscape painting, NOT watercolor, NOT a quiet porcelain still life. Build a tactile playful yet expertly composed graphic collage: a cut-out COLOR FILM PHOTOGRAPH of a real-looking small Seoul neighborhood street corner, three narrow buildings with tiled or striped shop awnings, a crosswalk fragment, overhead cables, a convex orange traffic mirror, tiny unbranded storefronts. A few short accurate shop signs may say '커피' and '책방'. Frame the urban photo fragments with bold large ORIGINAL Hangul die-cut graphic stickers at different slight angles: exact words '안녕!' in very big heavy rounded cobalt-blue type on a white outlined organic shape, '서울' in heavy dark ink on a tangerine rounded rectangle, '한글' in chunky black on a lemon-yellow blob, and a small purple sticker saying '좋아!'. Letters must be correct, clean and legible; only these Korean words, no Latin or invented filler. Editorial cut-and-paste with crisp white die-cut edges and subtle real sticker shadows, a few tiny four-point sparkles, blue dot and scribbled underlines; controlled overlap and strong negative space between clusters. Off-white untextured background #F8F9F6, vivid cobalt #3155E7, tangerine #FF784F, lemon #F2EB98, lilac #D8CCF0, ink #222222. Roughness only in the photographic/printed artwork, not overall grunge. The photo conveys unmistakable ordinary Seoul, no identifiable people, no corporate brands, no copied artwork. No interface, no buttons, no website mockup, no frame, no watermark. Gallery-quality distinctive graphic art; joyful, urban, cultured, clean composition, not childish kawaii and not neon cyberpunk.
```

### hangul-wall

模式：参考首尔主视觉的新资产生成。

原始输出：`C:\Users\zfu\.codex\generated_images\01a07030-b907-7921-b399-b2cbe7d70e6d\exec-cb652e60-5815-4c2e-b8d8-3e35e6386098.png`。

项目源文件：`public/assets/generated/hangul-wall.png`。

最终提示词：

```text
Use case: stylized-concept. Generate one NEW original square artwork in the visual family of the reference, which is ONLY a style reference. Scene: a graphic HANGUL STICKER WALL, no photographs: original oversized crisp typography die-cut stickers reading exactly '한글', 'ㄱ', 'ㄴ', 'ㄷ', 'ㅏ', '가', '나', '다'. The main 한글 label in cobalt occupies the upper center, single letters scattered thoughtfully around, bottom 가 나 다 letter blocks clearly distinct. Mix chunky rounded Korean letterforms with straight geometric jamo, irregular white die-cut silhouettes, one small black outlined speech bubble, tiny cobalt four-point star. White surface, subtle sticker cast shadows. Compact but airy poster composition; do not crop letters. Seoul independent magazine + Hangul sticker art, NOT paintings, not watercolor or ceramics, not 3D. Crisp accurate Hangul, white die-cut edges, restrained printed texture within the collage, vivid cobalt #3155E7, tangerine #FF784F, lemon #F2EB98, lilac #D8CCF0 and black. Background is clean white or genuinely transparent, no fake checkerboard. No extra writing beyond specified words, no Latin letters, no corporate logos, no watermark, no UI, no frame. Contemporary and playful with confident composition, not childish.
```

### cafe-talk

模式：参考首尔主视觉的新资产生成。

原始输出：`C:\Users\zfu\.codex\generated_images\01a07030-b907-7921-b399-b2cbe7d70e6d\exec-5aad8bbc-94fa-4855-aab6-50d8d3f14700.png`。

项目源文件：`public/assets/generated/cafe-talk.png`。

最终提示词：

```text
Use case: stylized-concept. Generate one NEW original square artwork in the visual family of the reference, which is ONLY a style reference. Scene: a cut-out color film photograph of a small Seoul red-brick neighborhood cafe, green striped awning, open window, two mismatched stools, one takeaway cup in the foreground, tiny unbranded bakery paper bag. Overlay just THREE big original Hangul die-cut stickers, reading exactly '커피', '한 잔', and '이야기'. Cobalt 커피 on white, black 한 잔 on lemon, 이야기에 NOT: write exactly 이야기 on a lavender speech bubble. Clear street-photo collage, a few tape fragments and one tangerine star, large negative spaces, no people. Seoul independent magazine + Hangul sticker art, NOT paintings, not watercolor or ceramics, not 3D. Crisp accurate Hangul, white die-cut edges, restrained printed texture within the collage, vivid cobalt #3155E7, tangerine #FF784F, lemon #F2EB98, lilac #D8CCF0 and black. Background is clean white or genuinely transparent, no fake checkerboard. No extra writing beyond specified words, no Latin letters, no corporate logos, no watermark, no UI, no frame. Contemporary and playful with confident composition, not childish.
```

### seoul-listening

模式：参考首尔主视觉的新资产生成。

原始输出：`C:\Users\zfu\.codex\generated_images\01a07030-b907-7921-b399-b2cbe7d70e6d\exec-4c57058f-233f-4b9b-b79e-f27c96e42211.png`。

项目源文件：`public/assets/generated/seoul-listening.png`。

最终提示词：

```text
Use case: stylized-concept. Create a new square Seoul street photograph + Hangul sticker collage in the attached reference's graphic family. A cut-out candid color film photograph of a pale mint-green Seoul city bus seen at a street corner with a zebra crossing and brick neighborhood buildings. Smaller photo fragment of a subway stair entrance; close-up of orange headphones cut out in foreground. Original bold white-outlined die-cut stickers saying exactly '듣다' in huge cobalt type, '출발!' in black on lemon, and '서울' in black on lilac. No additional text or brands. Buildings and vehicle authentic everyday Seoul feeling but not an actual navigational document. Sharp and clean editorial collage, accurate legible Hangul, generous white background, vivid cobalt, lemon, tangerine, lilac; minimal tiny star details. No people, no watermark, no UI, no scenery painting, no watercolor, no 3D, no border.
```

### icon-base

模式：参考首尔主视觉的新资产生成。

原始输出：`C:\Users\zfu\.codex\generated_images\01a07030-b907-7921-b399-b2cbe7d70e6d\exec-f9334c42-3180-482c-ba53-6a319ff3c683.png`。

项目源文件：`public/assets/generated/icon-base.png`。

最终提示词：

```text
Use case: logo-brand. Generate one minimalist square Korean-letter app icon, a counterpart to the reference sticker art. ONLY a single perfectly accurate Korean consonant 'ㅋ', large and very bold geometric, cobalt blue #3155E7, centered inside a softly irregular lemon-yellow #F2EB98 rounded square sticker on plain white. Straight frontal view, not tilted. The consonant fills 55% of image width and 55% of image height, all inside central safe area. Crisp clean shapes, subtle white die-cut rim. NO additional letter, text, image, photos, flowers, dots, stars, textures, gradients, watermark, shadows or UI. Recognizable at 32px. Square canvas, ample even safe margin.
```

## 自检重点

鲜明特色由街景拼贴与韩文字建立；可读性依靠独立留白区域。不要将贴纸美术误当作教学例句。用桌面与手机实拍截图核验正文、导航、首个按钮、模块搜索和练习位置；以现有功能回归覆盖学习模式、复习、数据恢复与失败反馈。

## 实施结果与验证

- 首页完成双栏街景拼贴、单一主操作、今日任务、三个插画栏目和可展开的进度/偏好。首页移除浮动的重复操作，学习页保留继续入口。
- 导航、品牌、四种主题、按钮、课程标题、词汇/语法筛选、学习列表、听读页与入门页统一更新。长词缩略标记只显示一个韩文字，完整词语仍保留在标题中。
- 手机优先呈现搜索与实际学习内容，辅助模块插画按需隐藏；首页主视觉完整呈现。主题沿用旧存储键，不改变课程、SRS、音频与数据保存规则。
- 四张 WebP 复用到 22 个展示用途；原始 PNG 与一张图标源文件保留。应用图标、maskable 图标、分享图与安装截图同步更新。

最终检查（2026-09-08）：内容校验、ESLint、普通和严格类型检查通过；395 项单元测试通过，无失败或跳过；生产构建生成 77 个页面；95 个页面/资源地址检查通过；完整浏览器回归通过。

浏览器覆盖 320、390、768、1024、1280、1440 六种宽度，包括导航可见性、横向溢出、韩文键盘、分页与筛选、四主题菜单和焦点、学习模式切换、草稿、复习、备份恢复、录音清理和真实音频加载失败。人工检查了首页全页、手机词汇页、课程页、夜间主题，以及更多菜单的 Escape 退出。

最大生产 JS 包为 624,421 字节原始 / 204,600 字节 gzip，处于既有预算内。静态截图另用空白浏览器上下文从生产服务重新采集，确保首屏从滚动位置 0 开始。390×844 下主按钮底边为 422.5px，1440×980 下为 580.8px，均在首屏内。

截图：`public/assets/screenshots/home-wide.png`、`public/assets/screenshots/home-narrow.png`。完整桌面与手机截图及运行日志在本地 `output/playwright/`，浏览器详细证据在 `.browser-check/`（均为忽略的测试产物）。

视觉复核：韩文字与照片承担风格，信息区域保持独立留白；没有文字叠在街景上。手机学习页有意减少辅助图片，保留字号、操作区和阅读空间。生成街景仅用于美术定调，不能代替课程内容或实际地理信息。
