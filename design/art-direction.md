# YEUX KR — 美术与信息架构重构计划

把 Kirina Korean 从「首尔编辑部学习图集」改成 **Yeux 家族里的韩语播放器**：纸面来自 YeuxPage，chrome 来自 `D:\Develop\grok\163music`（KAZAM）。

产品名仍是 **Kirina Korean**（manifest / 标题 / 校验保留）。界面品牌是 **YEUX KR!**，与 KAZAM!、鱼仔站同一套工作室口吻。

---

## 1. 两个源的 DNA

### YeuxPage（`E:\YuexPage`，yeuxark.com）

- 气质：一张被反复涂画过的旧纸。低饱和、手作、留白。
- 纸面：`--paper #d8d3cc`，不要发黄。
- 墨：`--ink #1b1815`。唯一彩色是印章朱红 `--seal #8c3a2c`，面积 < 3%。
- 字体：马善政标题、霞鹜文楷正文、Caveat 英文点缀。
- 质感：CSS 纸纹、胶片噪点 `.grain`、暗角 `.vignette`。圆角几乎为 0。
- 导航：中文 + 英文小字。纸色主题（原纸 / 月白 / 淡青 / 夜墨）。

### 163music / KAZAM（`D:\Develop\grok\163music\kazamusic`）

- 浅色：cream neo-brutalism。`--bg #fdf6e3`、`--yellow #facc15`、`--red #ff4d6a`、3px 墨线、`4px 4px 0` 错位阴影。
- 深色：Void Navy。黑底 + 唯一强调 `#173A52`。
- 骨架：顶栏 logo / 搜索 / 分段 tab；左栏 Now Playing（封面、曲名、进度、大红播放键）；右栏歌单行。
- 字体：DM Sans 900 logo，`letter-spacing: -1px`。
- 交互：hover 时 `translate(-1px,-1px)`，像实体按钮被按下去。

两者不能生拼：YeuxPage 禁止发黄纸和大面积高饱和，KAZAM 的灵魂却是黄块和厚边框。融合规则见下节。

---

## 2. 融合原则（YEUX KR Player Desk）

一句话：**在暖灰纸上放一台厚边框的韩语学习唱机。**

| 层 | 来源 | 落地 |
|---|---|---|
| 空间气质 | YeuxPage | 暖灰纸、噪点、暗角、楷书标题、朱红印章点缀 |
| 应用骨架 | KAZAM | 顶栏 stamp logo + 分段 tab；左栏正在学；右栏歌单；底栏手机迷你条 |
| 交互控件 | KAZAM | 3px 边、错位阴影、黄 CTA、红播放键 |
| 阅读面 | YeuxPage | 语法/材料长文用楷体、细线、低饱和，不把整页涂成积木 |
| 韩文 | 本应用 | 封面位置放大 Noto Serif KR 音节，当作专辑封面 |
| 暗色 | KAZAM | 夜墨纸 `#2a2733` 不够黑；播放器暗色走 `#000` + `#173A52` |

红线：

- 纸面不发黄。黄只出现在 logo、播放/主 CTA、音质式小徽章。
- 朱红印章只用于掌握、错误、强调链接。
- 不搬鱼仔角色、不搬网易云官方红 `#C20C0C`。
- 学习逻辑、SRS、workspace、路由一律不动。

隐喻映射：

| 音乐 | 学习 |
|---|---|
| 正在播放 | 今天最值得做的下一步 |
| 封面 | 韩文音节 / 课程静物 |
| 播放键 | 开始这张「曲子」（课 / 复习 / 材料） |
| 进度条 | 今日分钟 / 课程掌握 |
| 歌单 | 推荐任务队列 |
| 电台 | 路径 / 自学 / 复习 / 材料 轨道 |
| 音质 | 学习强度（轻 / 稳 / 深） |
| 曲库 | 词汇、语法、韩文库 |

---

## 3. Token

浅色（默认，原纸）：

```
--paper        #d8d3cc
--paper-hi     #e7e3db
--paper-lo     #c6c0b6
--card         #fffef9
--ink          #1b1815
--mild         #4b453d
--border       #1a1a2e
--yellow       #facc15
--red          #ff4d6a
--seal         #8c3a2c
--navy         #173A52
--green        #166534
--shadow       4px 4px 0 #1a1a2e
```

暗色：

```
--paper / --bg #000000
--card         #050505
--ink          #f0f0f0
--border       #2a2a2a
--navy         #173A52
--shadow       4px 4px 0 #173A52
--seal         #cf7a63
```

旧变量别名继续可用，避免 20+ 页面一次性改 class：`--ocean → navy`，`--cinnabar → seal`，`--celadon → green`，`--brass → 深黄墨`，`--muted → mild`，`--surface-solid → card`。

---

## 4. 字体

| 角色 | 字体 | 来源 |
|---|---|---|
| UI / logo 拉丁 | DM Sans | KAZAM，`next/font` |
| 中文界面 | Noto Sans SC | 可读 |
| 韩文界面 | Noto Sans KR | 正文、按钮 |
| 韩文封面/标题 | Noto Serif KR | 当作唱机上的大音节 |
| 中文大标题 | Ma Shan Zheng | YeuxPage 毛笔 |
| 英文 eyebrow | Caveat | YeuxPage |

不把 YeuxPage 97 个文楷 woff2 拷进本仓。中文长文回落到楷体 / Noto Sans SC。

---

## 5. 信息架构（壳层）

```
[ YEUX KR! ] [工作台 路径 复习 韩文 词汇 …] [学习数据] [☾]
+------------------+--------------------------------------+
| NOW PLAYING      |  当前页（歌单 / 课 / 材料）            |
| 大韩文封面       |                                      |
| 下一步标题       |                                      |
| 今日进度         |                                      |
| ▶ 开始           |                                      |
+------------------+--------------------------------------+
手机：左栏收起，底部迷你播放条。
```

导航分组仍是工作台 / 规划 / 练习 / 能力材料，只改成 KAZAM 那种相连厚边 tab。

---

## 6. 实施顺序

1. Token、字体、主题、全局质感（纸、噪点、暗角、brutal 控件）。
2. AppShell + Now Playing + 主题切换。
3. Button / Surface / TaskCard（歌单行）/ Compass / 首页。
4. 其余页面吃新 token；深色 slab、筛选、输入框跟上厚边。
5. 更新校验里纯视觉断言；学习逻辑断言不动。
6. 浏览器走通首页、路径、复习、一课、设置。

非本轮：

- 重做 imagegen 静物（旧图加厚相框继续用）。
- 月白 / 淡青纸色点（先 light/dark）。
- 真搜索（KAZAM 搜歌框）；需要的话以后搜课程/词汇。

---

## 7. 关键决策

1. **不改学习引擎。** 重构停在 `src/app`、`src/components`、`globals.css`、字体和壳层。
2. **品牌双名。** 对外仍叫 Kirina Korean；壳层 stamp 用 YEUX KR! 归入 Yeux 站群。
3. **纸面克制、控件吵闹。** 背景是 YeuxPage，按钮是 KAZAM。
4. **Now Playing 常驻。** 任何页都能看到「下一步」和播放键，像音乐站永远有当前曲。
5. **旧 CSS 变量做别名。** 语法/词汇等页先换肤，再按需改结构。
