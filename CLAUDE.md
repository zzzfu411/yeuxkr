# Kirina Korean Notes

请用中文回复用户。

这是一个 Next.js 在线学习应用，不再是无构建静态 SPA。项目目标是稳定、可维护，并保持与 Yasashi Japanese 不同的审美方向。

当前视觉方向是 **四季片场**：用原创韩国生活剧式场景、季节光线、冷瓷白、雾蓝、山茶粉和克制的字幕排版组织学习。四个主题是春日、雨季、晚秋与蓝夜；正文使用系统 sans，展示标题与韩文使用 Noto Serif KR。不要恢复纸纹、胶带、印章、毛笔/手写字体、常驻左栏、厚重 SaaS 卡片或纯黑控制台。详细约定见 `design/art-direction.md`，调研与改版记录见 `design/kdrama-redesign.md`。

## 关键约定

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
