# Kirina Korean

Kirina Korean 是一个从零基础开始学习韩语的 Next.js PWA。当前设计方向是 **Seoul Editorial Learning Atlas**：成人学习、首尔编辑部感、纸本学习资产、韩文字形、青瓷绿、深海蓝、朱砂红和黄铜细节。

## 当前能力

- Next.js 16 + React 19 + TypeScript + Tailwind。
- PWA 文件位于 `public/`，包含 manifest、service worker、offline fallback 和 maskable icons。
- 学习方式支持“路径推荐”和“自由自学”，两者共用同一套进度、SRS、输出档案和能力护照。
- `LearningWorkspace` 会综合课程进度、自学目标、能力短板和 SRS 到期状态，生成推荐任务和自由入口。
- 课程练习、综合测验、韩文、词汇、语法、语用、真实材料和输出弱点会进入统一复习闭环；答错会写入 mistake SRS。
- `Immersion Lab` 提供真实材料输入、逐句播放、遮译文听写、复述提示、输出草稿、自评 rubric 和 output SRS。
- 图片资产通过 `my-image-gen` / imagegen 工作流生成后接入 `public/assets/generated/`，页面通过 `src/data/visuals/assets.ts` 引用，并由 `src/data/visuals/manifest.ts` 记录 provider、prompt、源 PNG 和 WebP 派生关系。

## 命令

```bash
npm install
npm run dev
npm run validate
npm run test
npm run build
npm run check
npm run lint
npm run smoke:http
npm run smoke:browser
npm run smoke:offline
npm run check:smoke
```

`check:smoke` 需要先执行 `npm run build`，然后会用 `next start` 启动本地生产预览并连续运行 HTTP、浏览器和离线导航 smoke。

## 结构

```text
src/app/                  # Next App Router 页面
src/components/           # 布局、UI、学习组件、视觉组件
src/data/                 # 韩语课程、韩文、词汇、语法、语用、自学规划、能力护照
src/data/native-roadmap.js # 母语者路线扩容蓝图
src/data/visuals/         # 视觉资产索引和 image-gen manifest
src/lib/learning/          # 学习工作台、进度、SRS、测验逻辑
public/assets/generated/   # imagegen 生成并接入的页面资产
public/sw.js               # PWA 缓存
tests/                     # Node 单测
scripts/validate.mjs       # 数据、PWA、视觉资产校验
```

## 图片资产

当前视觉资产包括 hero、workspace、path、selfStudy、hangul、vocabulary、grammar、native、immersion、quiz、lesson、review、complete、empty。

生成美学约束：Seoul Editorial Learning Atlas、premium Korean stationery、warm paper texture、abstract Hangul typography、celadon green、deep ocean blue、cinnabar red、brass details；禁止人物、水印、UI 截图和可读中英文文本。

每张资产都需要：

- `public/assets/generated/*.png` 源图
- `public/assets/generated/*.webp` 页面展示图
- `src/data/visuals/assets.ts` 页面引用
- `src/data/visuals/manifest.ts` 生成来源和 prompt 记录
- `scripts/validate.mjs` 校验通过

## 内容规模与路线

当前内容规模：30 节核心课、64 个词、24 个语法点、12 个语用场景、12 个语义细差集合和 17 组分层真实材料（基础真实场景、连续理解、母语者桥接）。这个规模可以支撑从零基础进入真实材料和 C1 bridge preview，但不等同完整母语者水平。

长期母语者路线由 `src/data/native-roadmap.js` 维护，目标包括：

- 5000+ 可调用词汇与搭配
- 200+ 分级真实材料
- 120+ 口语/写作输出档案
- 24+ 阶段检查点
- 新闻、职场、学术、社交媒体、亲密关系、敬语、口语缩略、幽默、暗示、反讽和立场边界训练

原则：每个可达阶段都必须由课程、真实材料、输出档案、复习记录和检查点共同证明，不能用站内分数把 30 节核心课包装成完整母语者终点。
