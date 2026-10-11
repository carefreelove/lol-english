# 更新日志 · Changelog

## 2026-10-11 · 英雄语音学习与项目文案优化

### 新增

- 为 Data Dragon 16.19.1 的 **173 位英雄**收录选用、禁用各一条，共 **346 条代表语音**。
- 英雄详情新增语音区域，提供英文转录、中文学习译文、在线原声播放、整句英文朗读和逐条来源链接。
- 台词接入技能、装备使用的同一套词典流程，支持点词查义、音标、考纲标签、词频、生词高亮、单词发音及收藏。
- 新增 `content/voices.json` 内容源和维护说明；提供 `npm run voices:fetch` 获取候选台词，保留已有译文供核对。
- 新增语音数据校验：检查全英雄覆盖、选用 / 禁用条目、非空双语、唯一 ID 和可信来源；缺失内容会阻止构建。

### 改进与修复

- 润色中英 README、学习引导与数据来源说明，增加语音内容维护入口。
- 优化语音卡片及移动端排版，补齐英雄详情图标。
- 隐藏中文时同时隐藏英雄、技能和皮肤的中文名称。
- 切换英雄或页面时停止播放；原声与浏览器朗读互斥，加载失败提示支持恢复后清除。
- 默认构建固定为 Data Dragon 16.19.1，可通过 `DDRAGON_VERSION` 显式升级并检查新增英雄覆盖。

### 内容范围与来源

- 当前收录代表性选用 / 禁用内容，尚不包含全部游戏内对话或特殊皮肤台词。
- 英文转录和音频链接来自 League of Legends Wiki，每条保留获取时的修订版本链接；中文为学习译文，**不等同于国服官方配音稿**，尚未经过独立人工审校。
- 保留多角色对话；5 条非语言声音说明和 2 条纳尔语按实际类型标注，不臆造词义。
- 转录及学习译文保留 CC BY-SA 3.0 署名与许可，原始游戏内容版权归 Riot Games。
- 原声播放需要联网；浏览器 TTS 的离线能力取决于设备安装的语音。

### 验证

- 完整构建通过：173 位英雄、346 条语音，缺失项、标记残留及英文混入中文均为 0。
- 3 组语音数据测试和 58 项页面冒烟检查通过，包含 `file://` 数据加载及原有功能回归。
- 346 条音频链接在本次检查时均返回有效音频响应。
- 页面交互由 jsdom 验证，未完成真实浏览器截图验收及逐条人工试听。

### English summary

- Added 346 representative pick / ban voice entries across all 173 champions in the 16.19.1 baseline.
- Integrated bilingual voice text, original recordings, sentence TTS and source links with the existing dictionary, highlighting and vocabulary workflow.
- Improved documentation, mobile voice layouts, Chinese-name visibility and playback cleanup.
- Added a non-destructive candidate importer, coverage validation and regression checks.
- Chinese text is a learning translation, not an official Chinese voice-over script. Nonverbal sounds and fictional language are explicitly labeled.
- Validation: full build, 3 data tests, 58 UI smoke checks and 346 audio URL checks passed. Real-browser visual review and manual listening remain unverified.
