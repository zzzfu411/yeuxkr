# Kirina Korean

Kirina Korean 是一个从零基础开始学习韩语的 Next.js 在线学习应用。新版采用 **四季片场** 视觉：把每天的学习安排成一集安静的韩国生活剧，用季节光线、原创日常场景和清楚的字幕式排版，引导学习者知道现在学什么、为什么学、学完去哪里。

视觉提供春日、雨季、晚秋与蓝夜四种季节主题。正文使用清楚的系统 sans，大型标题与韩文细读使用 Noto Serif KR；冷瓷白、雾蓝、山茶粉和新叶绿随季节改变，但学习结构保持一致。

![学习工作台](docs/screenshots/hero-workspace.png)

<p align="center"><em>今日片场：一幅季节场景、一个下一步，以及当天最值得完成的三幕学习。</em></p>

### 产品界面

| Hangul Studio | Immersion Lab |
|:---:|:---:|
| ![韩文实验室](docs/screenshots/hangul.png) | ![情境材料](docs/screenshots/immersion.png) |
| 韩文实验室：拆音节块、辨听相近发音，再把掌握项加入复习。 | 自编咖啡店情境：逐句听读、遮住译文听写，再用韩语复述。 |

| 五阶段路径 | 间隔复习 |
|:---:|:---:|
| ![学习路径](docs/screenshots/path.png) | ![间隔复习](docs/screenshots/review.png) |
| 五阶段学习路线：从读写韩文逐步走到自然表达。 | 到期队列：韩文、词汇和错题使用同一套间隔复习。 |

![咖啡店点单课](docs/screenshots/lesson.png)

<p align="center"><em>课程页：目标、讲解、听读和练习会汇总到同一份学习记录。</em></p>

## 当前能力

- Next.js 16 + React 19 + TypeScript + Tailwind。
- Node.js `>=20.9.0`（与 Next 16 / sharp 0.35 的运行时要求一致）。
- Web App manifest 与图标位于 `public/`；课程始终联网加载，不注册 Service Worker 或离线学习包。
- 学习方式支持“路径推荐”和“自由自学”，两者共用课程进度、间隔复习、输出档案和学习记录。
- `LearningWorkspace` 会参考课程进度、自学目标、薄弱项和到期复习，推荐下一项任务，也保留自由入口。
- 课程练习、综合测验、韩文、词汇、语法、语用、情境听读和输出弱点都能加入复习；答错的题会进入错题复习。
- `Immersion Lab` 使用自编情境脚本，支持逐句播放、遮住译文听写、复述提示、输出草稿、自评和后续复习。
- 课程朗读优先使用 `public/assets/audio/ko/` 中的 1212 条统一韩语 MP3；未收录的动态内容才回退到浏览器系统韩语语音。
- 图片资产通过 OpenAI ImageGen 工作流生成后接入 `public/assets/generated/`，页面通过 `src/data/visuals/assets.ts` 引用，并由 `src/data/visuals/manifest.ts` 记录 provider、prompt、源 PNG 和 WebP 派生关系。

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
src/data/                 # 韩语课程、韩文、词汇、语法、语用、自学规划、学习进度
src/data/native-roadmap.js # 长期进阶路线蓝图
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

当前视觉资产登记在 `public/assets/generated/`（hero、workspace、hangul、immersion、empty 等），并通过 VisualPanel 的场景调色、字幕遮罩与局部 film grain 接入页面。23 个登记项均已替换为同一套原创四季场景。

生成美学约束：原创韩国生活剧照感、季节自然光、可信的日常质感、35mm 轻颗粒、充足留白、低饱和蓝绿与少量山茶粉。禁止复制剧照、演员肖像、片名标志、可读伪文字、水印、假 UI、霓虹赛博、奢华棚拍和宝丽来拼贴。

页面通过宽银幕 Hero、开放排版、三幕列表、季节色温与轻量浮动“下一集”组织内容。普通内容面、大场景和控件使用不同层级的圆角；所有图像与控件都必须同时适配春日、雨季、晚秋和蓝夜。视觉层可以重构，课程、SRS、quiz engine、workspace model、speech 和进度数据契约保持不变。

每张资产都需要：

- `public/assets/generated/*.png` 源图
- `public/assets/generated/*.webp` 页面展示图
- `src/data/visuals/assets.ts` 页面引用
- `src/data/visuals/manifest.ts` 生成来源和 prompt 记录
- `scripts/validate.mjs` 校验通过

## 内容规模与路线

当前内容规模：60 节主线课、722 个词、83 个语法点、20 个语用场景、12 组近义表达和 29 组自编情境听读材料。它适合从零基础逐步进入中级内容，但没有经过正式的 CEFR 定级，也不代表学完就达到母语者水平。

长期进阶路线由 `src/data/native-roadmap.js` 维护，规划包括：

- 5000+ 可调用词汇与搭配
- 200+ 分级原生材料
- 120+ 口语/写作输出档案
- 24+ 阶段检查点
- 新闻、职场、学术、社交媒体、亲密关系、敬语、口语缩略、幽默、暗示、反讽和立场边界训练

原则：站内分数只用于反馈当前学习情况，不能当作语言等级证书。若要判断长期能力，还需要结合原生材料、口语和写作作品、复习记录以及阶段检查。
