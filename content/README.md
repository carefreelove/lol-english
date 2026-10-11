# 英雄语音内容维护

`voices.json` 是入库的双语内容源，当前覆盖 Data Dragon 16.19.1 的 173 位英雄，各收录选用、禁用各一条，共 346 条。包含 5 条非语言声音说明，以及 2 条保留原文的纳尔语；不包含默认皮肤完整对话或特殊皮肤台词。

## 来源与翻译边界

- 英文保留 League of Legends Wiki 的转录文本、标点、角色标记及动作说明；每条 `sourceUrl` 指向获取时的 Wiki 修订版本。
- `audioEn` 来自同一条转录旁的 MP3 音频，不按文件名猜测地址。在线音频可能被上游替换或暂时不可用。
- `textZh` 为根据英文编写的学习译文，`translationKind: "learning"`，**不是国服官方配音稿**，也未经过独立人工审校。双关、口语和角色语气尽量兼顾，欢迎对照来源纠错。
- `nonverbal: true` 表示风铃、嘶吼、乐器等声音说明；`fictionalLanguage: true` 表示纳尔语等虚构语言，不臆造词义。这两类不提供英语 TTS 按钮。
- 两种语言配音可能使用不同本地化表达，因此不把英文学习译文标成国服语音，也不提供未经对应核实的中文原声。

## 补充与更新

```bash
npm install
npm run voices:fetch
```

抓取脚本按英雄列表以 3 路并发读取 Wiki 的 Champion Select 段落，缓存到 `.cache/voice-sources/<version>/`，只生成 `.cache/voices-candidates.json`。**不会覆盖已有译文**。缓存用于重复运行；需要刷新来源时，先备份再移走对应缓存文件。

逐项比对候选与 `voices.json`，核对英文、原声与语境，补充学习译文，再运行：

```bash
npm test
npm run build
npm run smoke
```

构建会检查每个英雄的选用/禁用条目、非空双语、唯一 ID 和可信 HTTPS 来源；缺少任何英雄都会报错，不用空白或占位台词冒充覆盖。所有英文台词都会参与词典构建，沿用技能、装备的词频、生词高亮、音标、查义、朗读及收藏逻辑。

显式升级游戏数据：`DDRAGON_VERSION=<version> npm run build`。先检查新增英雄并补齐语音；测试中的基线数量也应随审核结果更新。Wiki 台词快照和 Data Dragon 游戏版本是两个独立来源，前者并不声称是后者的历史原始配音。

## 署名与许可

台词转录：**League of Legends Wiki contributors**，逐条来源见 `sourceUrl`。

转录及本项目对其编写的学习译文采用 [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/)。本项目做了条目摘选、结构化、中文翻译及声音类型标注。复用时保留署名、来源、许可和修改说明，并遵循相同方式共享要求。原始游戏台词、角色与音频版权归 Riot Games；上述许可不表示本项目拥有游戏素材。
