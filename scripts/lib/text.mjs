// 文本清洗 / 分词 / 归一 的唯一真源。
// 构建脚本直接 import；前端版本由 build.mjs 剥离 `export` 后生成 public/data/text.js。
// 本文件不得引入任何依赖，也不得使用 ESM 之外仅 Node 可用的 API（需兼容浏览器）。

/**
 * 官方文本里混有标记：{{ qdamage }}、%i:xxx%、@Variable@、<br>、<physicalDamage>…</physicalDamage>、
 * <lol-uikit-tooltipped-keyword>、&nbsp; 等。统一清洗成可读纯文本。
 * <br> 转为换行以保留装备属性行的结构。
 */
export function clean(text) {
  if (text == null) return '';
  let s = String(text);
  s = s.replace(/<\s*br\s*\/?\s*>/gi, '\n');
  s = s.replace(/\{\{[^}]*\}\}/g, ' ');   // {{ qdamage }}
  s = s.replace(/%i:[^%]*%/g, ' ');       // %i:scaleAD%
  s = s.replace(/@[A-Za-z0-9_.]+@/g, ' '); // @Variable@
  s = s.replace(/<[^>]*>/g, ' ');         // 其余标签
  s = s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'");
  s = s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
  s = s.replace(/[^\S\n]+/g, ' ');   // 折叠横向空白，保留换行
  s = s.replace(/ *\n */g, '\n');
  s = s.replace(/\n{2,}/g, '\n');
  return s.trim();
}

// 仅匹配拉丁字母词，天然跳过中文；保留撇号以正确处理 champion's / don't
const TOKEN_RE = /[A-Za-z]+(?:['’][A-Za-z]+)*/g;

/**
 * 把一段英文切成 [文本段 | 单词段] 序列，保证拼接后与原文完全一致。
 * 长度 < 2 的片段当作普通文本（a / I 之类不标注）。
 */
export function segment(text) {
  const s = text == null ? '' : String(text);
  const out = [];
  let last = 0;
  let m;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(s))) {
    if (m[0].length < 2) continue;
    if (m.index > last) out.push({ type: 'text', value: s.slice(last, m.index) });
    out.push({ type: 'word', value: m[0], key: normalize(m[0]) });
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push({ type: 'text', value: s.slice(last) });
  return out;
}

/** 归一：小写 → 去所有格 → 去缩写后缀。返回可查词典的键（surface）。 */
export function normalize(token) {
  let w = String(token).toLowerCase().replace(/’/g, "'");
  w = w.replace(/^(.+)'s$/, '$1');      // champion's -> champion
  w = w.replace(/n't$/, '');            // don't -> do
  w = w.replace(/'(ll|re|ve|d|m)$/, ''); // we'll -> we
  return w;
}

/** 收集一段文本里出现过的全部词（归一后），用于构建期生成词表 */
export function collectWords(text) {
  const s = text == null ? '' : String(text);
  const set = new Set();
  let m;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(s))) {
    if (m[0].length < 2) continue;
    const w = normalize(m[0]);
    if (w.length >= 2) set.add(w);
  }
  return set;
}

/** 清洗后残留的标记（构建期自检用）。返回命中的类型数组，空数组表示干净。 */
export function findMarkup(text) {
  const s = text == null ? '' : String(text);
  const hits = [];
  if (/<[^>]+>/.test(s)) hits.push('tag');
  if (/\{\{/.test(s)) hits.push('placeholder-double-curly');
  if (/%i:/.test(s)) hits.push('placeholder-percent');
  if (/@[A-Za-z0-9_.]+@/.test(s)) hits.push('placeholder-at');
  return hits;
}
