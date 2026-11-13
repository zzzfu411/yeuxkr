# Kirina Korean

基于 Next.js 构建的本地优先（Local-First）韩语学习 Web 应用：涵盖韩文音节拼块与音变实验室、五阶段 60 课主线课程、情境听写与复述、词汇语法与语用参考，以及统一的间隔重复（SRS）复习。

[English](README.md) · 简体中文

| 四季学习工作台 | 韩文拼块与辨音实验室 |
| --- | --- |
| ![学习工作台](docs/screenshots/hero-workspace.png) | ![韩文实验室](docs/screenshots/hangul.png) |

## 核心特性

- **五阶段 60 课主线与自由自学** — 从零基础韩文拼读逐步过渡到日常对话与自然表达（80% 掌握度解锁下一课），同时提供可按目标定制的自学规划器，共用同一套工作台进度。
- **韩文拼块与音变实验室** — 拆解初声、中声、终声音节结构与复合元音，配套相近音辨听、屏幕韩文键盘以及 7 类核心音变规则练习。
- **情境听读与表达参考库** — 内置 29 组自编对话、慢速新闻与短文，支持逐句播放、遮罩听写、韩语复述、本机录音与改写自评；配套 722 个词条、83 个语法点、20 个语用场景与 12 组近义辨析。
- **内置韩语语音包** — 预置 1,212 条由 Sherpa-ONNX（KSS 模型）本地生成的韩语 MP3 音频（`public/assets/audio/ko/`），动态文本自动回退至浏览器系统韩语语音。
- **统一的 SRS 与本地数据主权** — 课程练习、迁移测验、韩文、词汇、语法、输出弱项与错题共用同一复习队列；文本记录保存在浏览器 `localStorage`（支持带结构校验的 JSON 导入导出），录音保存在同源 `IndexedDB`，无需账号或后端服务。

## 快速开始

环境要求：**Node.js 20.9+**。

```bash
git clone https://github.com/zzzfu411/yeuxkr.git
cd yeuxkr
npm ci
npm run dev
```

启动后在浏览器访问 `http://localhost:3000`。

## 校验与构建

```bash
npm run validate     # 校验课程同步、词库、内置音频清单与视觉资产契约
npm run check        # 数据校验 + ESLint + TypeScript（含 strict 边界）+ 单测 + 生产构建
npm run check:smoke  # 进程内启动生产服务并执行 HTTP 与 Playwright Chromium 回归
npm run check:all    # 完整 CI 门禁（check + check:smoke）
```

课程构建脚本、语音与插画资产流水线及本地存储边界详见 [docs/ENGINEERING.md](docs/ENGINEERING.md)，安全范围说明见 [SECURITY.md](SECURITY.md)。

## 目录结构

```text
src/
├── app/         Next.js App Router 页面（工作台、路径、课程、韩文、情境听读、复习、测验）
├── components/  四季片场主题外壳、韩文输入与语音控件、交互式练习容器
├── data/        60 节主线课、词库、语法、语用、音变规则与视觉资产清单
└── lib/         工作台状态计算、SRS 排程、备份归一化与韩文字母拼合工具
public/assets/
├── audio/ko/    1,212 条韩语朗读 MP3 与音频清单
└── generated/   适配春日、雨季、晚秋、蓝夜四主题的原创场景图（PNG / WebP）
scripts/
└── validate.mjs 构建期课程引用、音频完整性与视觉资产校验脚本
```
