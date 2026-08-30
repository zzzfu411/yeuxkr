# Kirina Korean

Kirina Korean 是一个从零基础开始学习韩语的 Next.js 在线学习应用。界面品牌是 **YEUX KR!**，标题为 **Kirina Korean | YEUX KR 韩语播放器**。产品形态是纸面上的韩语学习唱机：暖灰纸面、厚边框 Desk 导航、左栏 Now Playing、右侧今日歌单。路径、复习和真实材料共用同一条播放队列。

![YEUX KR 播放器工作台](docs/screenshots/hero-desk.png)

<p align="center"><em>Desk：YEUX KR! stamp、厚边框顶栏，以及左栏 Now Playing。下一步像当前曲一样常驻，黄键只给开播。</em></p>

### 产品界面

| Hangul Studio | Immersion / 材料 |
|:---:|:---:|
| ![韩文实验室](docs/screenshots/hangul.png) | ![情境材料](docs/screenshots/immersion.png) |
| 韩文实验室：拆音节块、听对立，再把掌握项送进 SRS。 | 材料轨：逐句听读、遮译文听写与复述检查，排进同一条播放队列。 |

| 五阶段路径 | 间隔复习 |
|:---:|:---:|
| ![学习路径](docs/screenshots/path.png) | ![SRS 复习](docs/screenshots/review.png) |
| Path：五阶段能力路线，从文字对齐走到母语者语用。 | 到期队列：韩文、词汇和错题进入同一套间隔复习。 |

![咖啡店点单课](docs/screenshots/lesson.png)

<p align="center"><em>课程页仍是同一台唱机：目标、讲解、听读和练习共用进度证据，Now Playing 指向下一首。</em></p>

## 当前能力

- Next.js 16 + React 19 + TypeScript + Tailwind。
- 壳层是 **YEUX KR Player Desk**：顶栏 Desk 导航、左栏 Now Playing / 底栏迷你播放条、推荐任务排成播放队列。学习引擎（路径、SRS、工作台）不变。
- Web App manifest 与图标位于 `public/`；课程始终联网加载，不注册 Service Worker 或离线学习包。
- 学习方式支持“路径推荐”和“自由自学”，两者共用同一套进度、SRS、输出档案和能力护照。
- `LearningWorkspace` 会综合课程进度、自学目标、能力短板和 SRS 到期状态，生成推荐任务和自由入口。
- 课程练习、综合测验、韩文、词汇、语法、语用、真实材料和输出弱点会进入统一复习闭环；答错会写入 mistake SRS。
- `Immersion Lab` 提供真实材料输入、逐句播放、遮译文听写、复述提示、输出草稿、自评 rubric 和 output SRS。
- 课程朗读优先使用 `public/assets/audio/ko/` 中的 1197 条统一韩语 MP3；未收录的动态内容才回退到浏览器系统韩语语音。
- 图片资产通过 `my-image-gen` / imagegen 工作流生成后接入 `public/assets/generated/`，页面通过 `src/data/visuals/assets.ts` 引用，并由 `src/data/visuals/manifest.ts` 记录 provider、prompt、源 PNG 和 WebP 派生关系。

## 命令

```bash
npm install
npm run dev
npm run validate
npm run test
npm run build
npm run speech:prepare
npm run speech:generate
npm run check
npm run lint
KIRINA_URL=http://127.0.0.1:4173 npm run smoke:http
KIRINA_URL=http://127.0.0.1:4173 npm run smoke:browser
npm run check:all
npm run check:smoke
```

`check:smoke` 需要先执行 `npm run build`，然后会在测试进程内启动 Next production server，连续运行 HTTP 与浏览器 smoke，并在结束时关闭服务，不留下后台 Node 进程。

README 顶部截图来自当前运行中的应用，可用 `KIRINA_URL=http://127.0.0.1:3000 npm run docs:screenshots` 在本机重拍。

## 结构

```text
src/app/                  # Next App Router 页面
src/components/           # 布局、UI、学习组件、视觉组件
src/data/                 # 韩语课程、韩文、词汇、语法、语用、自学规划、能力护照
src/data/native-roadmap.js # 母语者路线扩容蓝图
src/data/visuals/         # 视觉资产索引和 image-gen manifest
src/lib/learning/          # 学习工作台、进度、SRS、测验逻辑
public/assets/generated/   # imagegen 生成并接入的页面资产
public/assets/audio/ko/    # 本地生成的统一韩语 MP3 与清单
tests/                     # Node 单测
scripts/validate.mjs       # 数据、应用元信息、视觉资产校验
```

## 语音资产

`npm run speech:prepare` 会从课程、练习和页面数据重新收集韩语朗读文本并生成稳定文件名；`npm run speech:generate` 默认使用本机 Sherpa-ONNX 和 `vits-mimic3-ko_KO-kss_low` 模型生成 MP3，不上传课程文本。

本地生成环境约定：

- Sherpa-ONNX 与 `lameenc` 安装在 `.tools/sherpa/`
- 公开 KSS 模型解压到 `.tools/models/vits-mimic3-ko_KO-kss_low/`
- `.tools/` 只用于本地工具并已忽略，不进入项目资产
- `scripts/validate.mjs` 会拒绝缺失、截断、格式错误或与清单不一致的音频

## 图片资产

当前视觉资产包括 hero、workspace、path、selfStudy、hangul、vocabulary、grammar、native、immersion、quiz、lesson、review、complete、empty。这些是页面静物，不是界面 mock。

生成美学约束：纸本韩文静物、warm paper texture、abstract Hangul typography；禁止人物、水印、UI 截图和可读中英文文本。应用壳层是 YEUX KR Player Desk（暖灰纸 + 厚边框播放器），不要把静物图做成旧 Seoul Editorial 界面。

每张资产都需要：

- `public/assets/generated/*.png` 源图
- `public/assets/generated/*.webp` 页面展示图
- `src/data/visuals/assets.ts` 页面引用
- `src/data/visuals/manifest.ts` 生成来源和 prompt 记录
- `scripts/validate.mjs` 校验通过

## 内容规模与路线

当前内容规模：45 节核心课、352 个词、40 个语法点、12 个语用场景、12 个语义细差集合和 17 组分层真实材料（基础真实场景、连续理解、母语者桥接）。这个规模可以支撑从零基础进入真实材料和 C1 bridge preview，但不等同完整母语者水平。

长期母语者路线由 `src/data/native-roadmap.js` 维护，目标包括：

- 5000+ 可调用词汇与搭配
- 200+ 分级真实材料
- 120+ 口语/写作输出档案
- 24+ 阶段检查点
- 新闻、职场、学术、社交媒体、亲密关系、敬语、口语缩略、幽默、暗示、反讽和立场边界训练

原则：每个可达阶段都必须由课程、真实材料、输出档案、复习记录和检查点共同证明，不能用站内分数把 30 节核心课包装成完整母语者终点。
