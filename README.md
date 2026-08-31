# Kirina Korean

Kirina Korean 是一个从零基础开始学习韩语的 Next.js 在线学习应用。界面属于 **YEUX KR 纸本家族**：以 yeuxark.com 的低饱和个人纸站为亲缘，把韩纸纤维、稀释墨、手写路标和克制朱印带进完整的韩语学习流程。它不是杂志式作品集、SaaS 仪表盘或音乐播放器桌面；路径、复习和材料被整理成一册可以长期使用的个人学习图集。

视觉提供原纸、月白、淡青与夜墨四种纸色。正文使用 LXGW WenKai Screen，毛笔题签使用 Ma Shan Zheng，英文批注使用 Caveat，大型韩文与细读内容保留 Noto Serif KR；夜墨是带纤维和层次的深紫墨纸，而非纯黑屏幕。

![学习工作台](docs/screenshots/hero-workspace.png)

<p align="center"><em>学习工作台：路径推荐、到期复习和能力护照收在同一张今日地图上。</em></p>

### 产品界面

| Hangul Studio | Immersion Lab |
|:---:|:---:|
| ![韩文实验室](docs/screenshots/hangul.png) | ![情境材料](docs/screenshots/immersion.png) |
| 韩文实验室：拆音节块、听对立，再把掌握项送进 SRS。 | 咖啡店真实语速：逐句听读、遮译文听写与复述检查。 |

| 五阶段路径 | 间隔复习 |
|:---:|:---:|
| ![学习路径](docs/screenshots/path.png) | ![SRS 复习](docs/screenshots/review.png) |
| 五阶段能力路线：从文字对齐走到母语者语用。 | 到期队列：韩文、词汇和错题进入同一套间隔复习。 |

![咖啡店点单课](docs/screenshots/lesson.png)

<p align="center"><em>课程页：目标、讲解、听读和练习共用同一份进度证据。</em></p>

## 当前能力

- Next.js 16 + React 19 + TypeScript + Tailwind。
- Node.js `>=20.9.0`（与 Next 16 / sharp 0.35 的运行时要求一致）。
- Web App manifest 与图标位于 `public/`；课程始终联网加载，不注册 Service Worker 或离线学习包。
- 学习方式支持“路径推荐”和“自由自学”，两者共用同一套进度、SRS、输出档案和能力护照。
- `LearningWorkspace` 会综合课程进度、自学目标、能力短板和 SRS 到期状态，生成推荐任务和自由入口。
- 课程练习、综合测验、韩文、词汇、语法、语用、真实材料和输出弱点会进入统一复习闭环；答错会写入 mistake SRS。
- `Immersion Lab` 提供真实材料输入、逐句播放、遮译文听写、复述提示、输出草稿、自评 rubric 和 output SRS。
- 课程朗读优先使用 `public/assets/audio/ko/` 中的 1212 条统一韩语 MP3；未收录的动态内容才回退到浏览器系统韩语语音。
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
npm run audit:prod
```

`check:smoke` 需要先执行 `npm run build`，然后会在测试进程内启动 Next production server，连续运行 HTTP 与浏览器 smoke，并在结束时关闭服务，不留下后台 Node 进程。

浏览器 smoke 需要可用的 Playwright Chromium；如果本机使用的是全局或自定义安装，可通过 `PLAYWRIGHT_ENTRY` 指定模块。公开站点的 canonical metadata 可在 `.env` 中设置 `NEXT_PUBLIC_SITE_URL`，未设置时使用 `http://localhost:3000`。

## 数据与安全边界

学习进度、复习卡、草稿和作品集默认只保存在当前浏览器的 `localStorage`；录音 Blob 保存在同源 IndexedDB，不会随备份导出。产品没有账号、服务端 API 或跨用户数据边界，因此本地数据不是可验证的认证凭据。导入备份会先做 schema/大小校验（最大 4 MB），失败时回滚已写入的学习键。

生产依赖升级后可用 `npm audit --omit=dev --audit-level=high` 做阻断式检查；仓库 CI 会执行同一检查。完整 `npm audit` 可能仍报告仅供开发期 lint 工具链使用的依赖，不能把它们误解为线上运行时依赖。

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

当前视觉资产仍登记在 `public/assets/generated/`（hero、workspace、hangul、immersion、empty 等），并通过 VisualPanel 的纸色叠印接入新纸面。新的韩纸静物 / 朱印插画应在 imagegen 可用时替换旧的 editorial 摄影，而不是热链库存图。

生成美学约束：低饱和韩纸、石墨与水墨、可见纸纤维、充足留白、Hangul 活字 / 笔触、砚台静物、首尔街巷或咖啡馆淡彩，以及面积很小的褪色朱印。禁止 KAZAM / player-desk chrome、neo-brutal 黄块与热粉按钮、硬偏移阴影、鱼仔主角、水印、UI 截图和生成式可读乱码。

页面通过连续纸面、grain、vignette、轻微 roughen、胶带角、日期行和柔和纸影组织内容，圆角约为 `3px`。所有图像与控件都必须同时适配原纸、月白、淡青和夜墨；视觉层可以重构，课程、SRS、quiz engine、workspace model、speech 和进度数据契约保持不变。

每张资产都需要：

- `public/assets/generated/*.png` 源图
- `public/assets/generated/*.webp` 页面展示图
- `src/data/visuals/assets.ts` 页面引用
- `src/data/visuals/manifest.ts` 生成来源和 prompt 记录
- `scripts/validate.mjs` 校验通过

## 内容规模与路线

当前内容规模：60 节核心课、722 个词、83 个语法点、20 个语用场景、12 个语义细差集合和 29 组分层真实材料（基础真实场景、连续理解、母语者桥接）。这个规模可以支撑从零基础进入真实材料和 C1 bridge preview，但不等同完整母语者水平。

长期母语者路线由 `src/data/native-roadmap.js` 维护，目标包括：

- 5000+ 可调用词汇与搭配
- 200+ 分级真实材料
- 120+ 口语/写作输出档案
- 24+ 阶段检查点
- 新闻、职场、学术、社交媒体、亲密关系、敬语、口语缩略、幽默、暗示、反讽和立场边界训练

原则：每个可达阶段都必须由课程、真实材料、输出档案、复习记录和检查点共同证明，不能用站内分数把 30 节核心课包装成完整母语者终点。
