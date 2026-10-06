# LoL 英文学习站 · LoL English

借《英雄联盟》学英语：把**英雄技能与被动、装备、皮肤名、召唤师技能、符文**做中英对照整理，
生僻词自动高亮，任意英文词可点击查看**音标、中文释义、考纲标签、词频**。

Learn English with League of Legends — a bilingual (English / 中文) reference for champion
abilities & passives, items, skins, summoner spells and runes. Uncommon words are highlighted
automatically, and **every English word is clickable** for its phonetic, definition, exam tag
and word frequency.

**[中文文档](#中文文档) · [English](#english)**

![预览 Preview](docs/preview.png)

---

## 中文文档

### 特点

| 项 | 说明 |
|---|---|
| 中英对照 | 文案**全部取自官方数据**，不做机器翻译 |
| 生词高亮 | 按词频/考纲自动判定生僻词并高亮 |
| 点词查义 | 任意英文词 → 音标 + 中文释义 + 考纲标签 + 词频 |
| 发音 | 浏览器内置语音朗读（离线可用） |
| 生词本 | 收藏生词，本地持久保存，可导出 JSON |
| 无需服务器 | 双击 `public/index.html` 即可打开 |
| 自测模式 | 一键隐藏中文，检验自己是否读懂 |

### 数据来源

- **英雄联盟官方数据库** [Riot Data Dragon](https://developer.riotgames.com/docs/lol#data-dragon)
  —— 取 `zh_CN` / `en_US` 两种官方语言包，游戏内文案（名称、描述）**直接来自官方库，未做机器翻译**；
  仅当某字段官方缺失时才自行补译。
- **词典** [ECDICT](https://github.com/skywind3000/ECDICT) —— 提供音标、中文释义、考纲标签、词频、柯林斯星级。

当前版本：DDragon **16.19.1**（英雄 173 · 装备 253 · 召唤师技能 16 · 符文 5 系 · 皮肤 2100+）。

### 使用步骤

**前置要求**：Node.js ≥ 18（构建需要联网）。

```bash
# 1. 一次性构建（下载官方数据 + 词典，生成本地数据文件）
npm install --omit=dev   # 构建只需要一个依赖 csv-parse
npm run build

# 2. 打开网站
#    直接双击 public/index.html，无需启动任何服务器
```

构建产物在 `public/data/`，该目录**不入库**（体积大），克隆后需自行构建一次。

构建支持**断点续传**：中途失败重跑会跳过已下载的内容；原始下载物缓存在 `.cache/`，
重复构建不会重新下载 65 MB 的词典。

> 说明：小图标已下载到本地，核心内容完全离线可用；
> 皮肤大图（loading/splash）体积过大改为在线加载，断网时自动隐藏并回退占位。

### 自检（可选）

```bash
npm install    # 安装 jsdom（dev 依赖）
npm run smoke  # 用 jsdom 真实加载页面，跑端到端断言
```

断言覆盖：英雄/装备/符文/召唤师列表渲染、词典查词与词形归并、深链接路由、
点词弹层、收藏读写、图标可访问、设置生效等。

构建产物里的 `public/data/report.js`、`report.dict.js` 含自检信息
（标记残留、英文中混入的中文、词典未收录词 Top 榜等），可直接阅读排查。

### 功能

- **英雄**：搜索 + 按定位筛选；查看被动与 Q/W/E/R 的中英对照；皮肤缩略图点开看大图
  - 支持深链接，如 `index.html#/champions/Aatrox` 直达指定英雄（可加书签）
- **装备**：按类型筛选，展开查看双语描述
- **符文 / 召唤师技能**：双语对照
- **生词标注**：生僻词自动高亮；任意英文词点击弹出音标 + 释义 + 考纲标签 + 词频
- **发音**：浏览器内置语音朗读单词（离线可用）
- **生词本**：收藏生词，持久保存，可导出 JSON
- **设置**：隐藏中文（自测模式）、高亮开关、朗读语速、深色/浅色主题

### 目录

```
scripts/          构建脚本（Node，ESM）
  ├─ lib/         并发抓取 / 文本清洗 / 生僻词判定
  └─ smoke-test   端到端冒烟测试
public/           静态站点；双击 index.html 打开
  ├─ js/          前端脚本
  └─ data/        构建产物（自动生成，不入库）
.cache/           原始下载缓存（自动生成，不入库）
docs/             截图
```

### 版权

仅供个人学习使用。游戏内容版权归 Riot Games 所有，遵循其 Legal Jibber Jabber；
词典数据遵循 ECDICT 自身开源协议。

---

## English

### Highlights

| | |
|---|---|
| Bilingual | All in-game text comes **straight from Riot's official data** — no machine translation |
| Rare-word highlighting | Words are auto-classified by frequency and exam syllabus |
| Click any word | Phonetic + Chinese definition + exam tag + word frequency |
| Pronunciation | Built-in browser speech synthesis, works offline |
| Vocabulary list | Save words locally, export as JSON |
| No server needed | Just double-click `public/index.html` |
| Self-test mode | Hide all Chinese to check whether you actually understood the text |

### Data sources

- **[Riot Data Dragon](https://developer.riotgames.com/docs/lol#data-dragon)** — both the
  `en_US` and `zh_CN` official locale packs. All in-game copy (names, descriptions) is taken
  **verbatim from the official database, never machine-translated**; we only translate a field
  ourselves when the official data is missing it.
- **[ECDICT](https://github.com/skywind3000/ECDICT)** — an open-source English–Chinese dictionary
  supplying phonetics, definitions, exam tags, word frequency and Collins star ratings.

Pinned patch: DDragon **16.19.1** (173 champions · 253 items · 16 summoner spells · 5 rune trees · 2100+ skins).

### Quick start

**Requires:** Node.js ≥ 18 and a network connection for the build.

```bash
# 1. One-time build (downloads official data + dictionary, writes local data files)
npm install --omit=dev   # the build needs a single dependency: csv-parse
npm run build

# 2. Open the site
#    Double-click public/index.html — no server required
```

The build output lives in `public/data/` and is **not committed** (it is large), so you need to
run the build once after cloning.

The build is **resumable**: if it fails partway, re-running skips whatever was already fetched.
Raw downloads are cached in `.cache/`, so the 65 MB dictionary is only fetched once.

> Note: small icons are downloaded locally, so the core content works fully offline.
> Skin splash/loading art is too large to bundle and is hot-linked instead — offline it
> falls back to a placeholder.

### Verification (optional)

```bash
npm install    # installs jsdom (dev dependency)
npm run smoke  # loads the real page under jsdom and runs end-to-end assertions
```

Coverage includes list rendering for champions/items/runes/summoner spells, dictionary lookup
and lemmatization, deep-link routing, the word popover, favorites read/write, icon
availability, and settings toggles.

The build also emits `public/data/report.js` and `report.dict.js`, which list leftover markup,
Chinese text leaking into English fields, and the top words missing from the dictionary.

### Features

- **Champions** — search and filter by role; bilingual passives and Q/W/E/R; click a skin
  thumbnail to enlarge it
  - Deep links supported, e.g. `index.html#/champions/Aatrox` (bookmarkable)
- **Items** — filter by tag, expand for the bilingual description
- **Runes / Summoner spells** — bilingual
- **Word annotation** — rare words highlighted; click any English word for its phonetic,
  definition, exam tag and frequency
- **Pronunciation** — browser speech synthesis, offline
- **Vocabulary list** — persisted locally, exportable as JSON
- **Settings** — hide Chinese (self-test mode), toggle highlighting, speech rate, dark/light theme

### Layout

```
scripts/          Build scripts (Node, ESM)
  ├─ lib/         Concurrent fetching / text cleaning / rarity rules
  └─ smoke-test   End-to-end smoke test
public/           Static site; double-click index.html
  ├─ js/          Front-end scripts
  └─ data/        Build output (generated, not committed)
.cache/           Raw download cache (generated, not committed)
docs/             Screenshots
```

### License

For personal study only. Game content is copyright Riot Games, used under their Legal Jibber
Jabber; dictionary data follows ECDICT's own open-source license.
