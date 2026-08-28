# Kirina Korean Notes

请用中文回复用户。

这是一个 Next.js 在线学习应用，不再是无构建静态 SPA。项目目标是稳定、可维护，并保持与 Yasashi Japanese 不同的审美方向。

当前视觉方向是 **Seoul Editorial Learning Atlas**：成人学习、首尔编辑部感、纸本学习资产、韩文字形、青瓷绿、深海蓝、朱砂红和黄铜细节。

## 关键约定

- 页面使用 `src/app/*`，共享 UI 使用 `src/components/*`。
- 学习数据仍优先放在 `src/data/*`，不要把新增课程/词汇/语法硬写进 UI。
- 路径学习和自由自学都必须通过 `src/lib/learning/workspace.ts` 汇总到同一个工作台模型。
- SRS 操作走 `src/lib/learning/srs.ts`，不要在页面里直接改 SRS 数据结构。
- 测验/课程题目走 `src/lib/learning/quiz.ts` 和 `DrillRunner`，答错应进入 mistake SRS。
- TTS 统一走 `src/lib/speech.js` 的 `speakKorean` / `speakSequence`。
- 不注册 Service Worker 或提供离线学习包；`PwaRegister` 只负责清理历史 Worker/缓存，并可保留需要联网的桌面入口。
- 图片资产必须来自 `imagegen` 或 `my-image-gen`，最终放入 `public/assets/generated/`，并登记到 `src/data/visuals/assets.ts`。

## 验证

```bash
npm run validate
npm run test
npm run build
npm run check
```
