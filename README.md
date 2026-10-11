# LoL English · 英雄联盟英文学习站

**从熟悉的英雄与台词开始，把每一局里的英语变成自己的词汇。**

技能、装备、皮肤、符文与召唤师技能中英对照；新增 **173 位英雄、346 条选用 / 禁用语音**。听原声、读译文、点击生词查音标和释义，再收藏到生词本复习。

Learn English through League of Legends: bilingual game text, champion voice lines,
original audio, word definitions and a personal vocabulary list.

[中文指南](#中文指南) · [English guide](#english-guide) · [语音内容与来源](content/README.md) · [更新日志 / Changelog](CHANGELOG.md)

![既有界面预览（截图尚未包含新增语音区）](docs/preview.png)

## 中文指南

### 可以怎样学

1. **选一位英雄**：阅读被动、Q/W/E/R、皮肤名和选用 / 禁用台词。
2. **听一句原声**：播放游戏原声，结合英文文本跟读；也可以用浏览器朗读整句。
3. **查一个生词**：点击可标注英文词，查看音标、中文释义、考纲标签与词频，随手收藏。
4. **做一次自测**：隐藏中文，尝试独立理解；在生词本集中复习或导出 JSON。

| 内容 | 学习功能 |
|---|---|
| 英雄技能与被动 | 中英对照、技能数值、点词查义 |
| 英雄语音 | 每位英雄选用 / 禁用各一条，原声播放、学习译文、整句朗读、逐条来源 |
| 装备、符文、召唤师技能 | 双语描述，装备支持搜索和分类筛选 |
| 皮肤 | 双语名称查词，缩略图与大图预览 |
| 生词本 | 本地保存、单词发音、JSON 导出 |
| 学习设置 | 隐藏中文、生词高亮、朗读语速、深色 / 浅色主题 |

语音和技能、装备共用同一套词典与标注流程：**音标、中文释义、考纲、词频、生词高亮、单词发音、收藏**保持一致。常见功能词和正文专名按既有规则跳过标注；未收录词会明确提示，不生成虚假释义。

### 本地使用

仅构建需要 Node.js ≥ 18；运行测试、抓取候选台词需要满足 jsdom 30 的 Node.js 要求（22.22.2+ 的 22.x、24.15.0+ 的 24.x 或 ≥ 26）。建议直接使用受支持的新版 Node.js。

```bash
git clone https://github.com/carefreelove/lol-english.git
cd lol-english
npm ci --omit=dev
npm run build
```

构建后双击 `public/index.html` 即可使用，无需服务器。英雄支持书签，例如 `public/index.html#/champions/Aatrox`。

默认使用 **Data Dragon 16.19.1**，覆盖 173 位英雄。语音源文件已入库；`public/data/` 由构建生成，不入库。下载缓存在 `.cache/`，重复构建会复用已有文件。

- **离线可用**：构建后的双语文本、本地图标、词典、查词与生词本。
- **需要联网**：皮肤大图和英雄原声音频。原声加载失败时会显示提示，文本仍可学习。
- **浏览器朗读**：与游戏原声分开；是否支持离线取决于设备安装的语音。

### 数据从哪里来

| 数据 | 来源与边界 |
|---|---|
| 技能、装备等游戏文本 | [Riot Data Dragon](https://developer.riotgames.com/docs/lol#data-dragon) 的 `en_US` / `zh_CN` 官方语言包 |
| 英文台词、原声音频 | [League of Legends Wiki](https://wiki.leagueoflegends.com/en-us/)，每条保留修订版本链接和对应音频地址 |
| 台词中文 | 根据英文编写的**学习译文，不等同于国服官方配音稿** |
| 音标与词义 | [ECDICT](https://github.com/skywind3000/ECDICT) |

本期是代表语音集，不是全部皮肤、全部游戏内对话。Bard、Rek'Sai 和 Sona 禁用语音中的非语言声音如实标注；纳尔语保留原文，不臆造词义。台词按 Wiki 获取时的修订版本记录，不声称与 Data Dragon 版本的历史配音完全一致。

### 验证与扩充

```bash
npm ci
npm test          # 全英雄语音覆盖、数据完整性和异常输入
npm run build    # 官方双语数据、图标、词典和语音一起构建
npm run smoke    # 真实页面的 jsdom 交互回归
npm run voices:fetch  # 可选：获取候选台词，不覆盖已整理的译文
```

测试覆盖语音查词、音标释义、收藏、整句朗读调用、隐藏中文、原声错误提示和全部英雄数据加载，同时检查原有技能、装备、符文、召唤师技能和皮肤功能。jsdom 不实际播放声音。

词典与内容诊断见 `public/data/report.js` 和 `report.dict.js`。新增英雄缺少语音或条目缺少译文时，构建会报错。升级版本与补充台词的流程见 [内容维护说明](content/README.md)。

```text
content/          入库的双语语音、来源与维护说明
scripts/          内容 / 词典构建、语音抓取和测试
public/           静态站点，兼容 file://
  js/             界面、查词、收藏、朗读
  data/           构建产物（不入库）
docs/             页面预览
.cache/           原始下载缓存（不入库）
```

## English guide

### Learn through familiar game moments

Choose a champion, read an ability or a pick / ban line, listen to the original audio,
and click a word to explore its pronunciation and meaning. Save vocabulary for review,
or hide Chinese translations to test your understanding.

- **173 champions, 346 representative voice entries**: pick and ban lines with source revisions,
  original audio and Chinese learning translations.
- **One learning workflow** across voice lines, abilities and items: phonetics, Chinese definitions,
  exam tags, frequency, rare-word highlighting, pronunciation and favorites.
- **Bilingual reference** for passives, Q/W/E/R, items, skins, runes and summoner spells.
- **Personal study tools**: local vocabulary storage, JSON export, adjustable TTS speed and light / dark themes.

Common function words and proper nouns in body text follow the existing annotation skip rules.
Missing dictionary entries are labeled explicitly.

### Quick start

Building requires Node.js ≥ 18. Tests and candidate fetching use jsdom 30 and require
Node.js `^22.22.2 || ^24.15.0 || >=26.0.0`.

```bash
git clone https://github.com/carefreelove/lol-english.git
cd lol-english
npm ci --omit=dev
npm run build
```

Open `public/index.html` directly. No server is required. The default content baseline is
Data Dragon **16.19.1**. Generated files in `public/data/` are not committed; downloads are
cached in `.cache/`. Use `npm ci`, `npm test` and `npm run smoke` for development checks.

Built text, icons, dictionary and vocabulary tools work offline. Skin artwork and original
voice audio require a connection. Browser TTS is separate from the game recording; offline
availability depends on installed voices.

### Sources and translation policy

Abilities, items and other game descriptions use Riot's official `en_US` / `zh_CN` Data Dragon
packs. Voice transcriptions and recording URLs come from League of Legends Wiki, with a
revision link on each entry. **Chinese voice translations are learning aids, not official
Chinese voice-over scripts**, and have not received independent human review.

This release covers representative pick / ban lines, not every skin or in-game interaction.
Nonverbal sounds are labeled, and Gnar's fictional language is preserved without invented
meanings. Wiki voice snapshots and the Data Dragon patch are independent source versions.

Run `npm run voices:fetch` to create candidates in `.cache/voices-candidates.json`; it never
overwrites curated translations. See [content maintenance and attribution](content/README.md).

## 版权与署名 · Attribution

游戏台词、角色与音频版权归 Riot Games。Wiki 台词转录及本项目的学习译文采用
[CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/)，署名为 League of Legends Wiki
contributors，并保留逐条来源；本项目进行了摘选、结构化、翻译和声音类型标注。
ECDICT 数据遵循其自身许可。

LoL English is not endorsed by Riot Games and does not reflect the views or opinions of Riot Games
or anyone officially involved in producing or managing Riot Games properties. Riot Games and all
associated properties are trademarks or registered trademarks of Riot Games, Inc.
