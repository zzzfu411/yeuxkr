# Kirina Korean Notes

请用中文回复用户。

这是一个 Next.js 在线学习应用，不再是无构建静态 SPA。项目目标是稳定、可维护，并保持与 Yasashi Japanese 不同的审美方向。

当前视觉方向是 **韩文字碎片 × 简洁留白**：单个字母或 2–3 字短词的小图片独立分散在页角、标题旁与留白处，不使用生活场景碎片或整张拼贴。六张 letter-* 资产保留真实透明背景，白底、深色正文、钴蓝主操作，柠檬黄、橙色、淡紫用于小贴片。正文与标题以系统 sans 为主，韩语阅读可保留 Noto Serif KR；四个主题为白昼、蓝调、暖阳、夜行，沿用原存储键。顶层导航只有今日、学习、练习，个人空间集中计划与工具；内容通过 URL 栏目集成，保留旧链接。学习控件不叠加纹理、胶带、电影遮罩或重阴影。详细约定见 `design/art-direction.md`，文字碎片规范见 `design/scattered-fragments.md`，功能整合记录见 `design/quiet-learning-spaces.md`，首轮生成记录见 `design/seoul-sticker-redesign.md`。

## 关键约定

- 学习工作区采用内容优先层级：统一轻量页头，课程先显示近期课程，词汇/语法筛选与长期目标按需展开；韩文提供拼字切换与主题直达。听读可先试听，归档保留原门槛；表达草稿使用现有 drafts 存储与备份体系。新约定见 `design/content-first-workspaces.md`。

- 首页采用居中的韩语学习笺：韩文字片为主视觉，中文标题减轻字重，学习和练习使用两行开放目录；避免恢复粗重双行标题、框格入口、整页左右分栏或四角均匀装饰。当前规范见 `design/learning-note-home.md`，视觉验收必须直接查看截图，不能以功能检查通过代替美感判断。

- 页面使用 `src/app/*`，共享 UI 使用 `src/components/*`。
- 学习数据仍优先放在 `src/data/*`，不要把新增课程/词汇/语法硬写进 UI。
- 路径学习和自由自学都必须通过 `src/lib/learning/workspace.ts` 汇总到同一个工作台模型。
- SRS 操作走 `src/lib/learning/srs.ts`，不要在页面里直接改 SRS 数据结构。
- 测验/课程题目走 `src/lib/learning/quiz.ts` 和 `DrillRunner`，答错应进入 mistake SRS。
- TTS 统一走 `src/lib/speech.js` 的 `speakKorean` / `speakSequence`。
- 不注册 Service Worker 或提供离线学习包；`PwaRegister` 只负责清理历史 Worker/缓存，并可保留需要联网的桌面入口。
- 图片资产必须来自 `imagegen` 或经用户授权的图像生成工作流，最终放入 `public/assets/generated/`，并登记到 `src/data/visuals/assets.ts` 与 `src/data/visuals/manifest.ts`。

## 验证

```bash
npm run validate
npm run test
npm run build
npm run check
```

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
