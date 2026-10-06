import { createReadStream } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parse } from 'csv-parse';
import { ECDICT_CSV_URL, ECDICT_LEMMA_URL, ECDICT_MIN_BYTES, CACHE_DIR, DATA_DIR } from './config.mjs';
import { downloadCached, getTextCached } from './lib/http.mjs';
import { collectWords } from './lib/text.mjs';
import { classify, STOPWORDS, GAME_TERMS } from './lib/rarity.mjs';

function jsLiteral(value) {
  return JSON.stringify(value).replace(/<\//g, '<\\/');
}

/** lemma.en.txt 格式： `lemma/词频 -> 变形1,变形2`，`;` 开头为注释 */
async function loadLemmaMap() {
  const txt = await getTextCached(ECDICT_LEMMA_URL, join(CACHE_DIR, 'lemma.en.txt'));
  const map = new Map();
  if (!txt) return map;
  for (const line of txt.split(/\r?\n/)) {
    if (!line || line[0] === ';') continue;
    const arrow = line.indexOf('->');
    if (arrow < 0) continue;
    const lemma = line.slice(0, arrow).trim().split('/')[0].trim().toLowerCase();
    if (!lemma) continue;
    for (const f of line.slice(arrow + 2).split(',')) {
      const form = f.trim().toLowerCase();
      if (form && !map.has(form)) map.set(form, lemma);
    }
  }
  return map;
}

function exchangeLemma(ex) {
  const s = String(ex || '');
  for (const part of s.split('/')) {
    if (part.startsWith('0:')) return part.slice(2).trim().toLowerCase() || null;
  }
  return null;
}

/** 流式扫描本地 ECDICT CSV，只保留 wanted 里的词（每个词首次出现即收） */
async function scanCsv(csvPath, wanted) {
  const out = new Map();
  const parser = createReadStream(csvPath).pipe(
    parse({ columns: true, relax_quotes: true, relax_column_count: true, skip_empty_lines: true })
  );
  for await (const row of parser) {
    const w = String(row.word || '').toLowerCase();
    if (!w || !wanted.has(w) || out.has(w)) continue;
    out.set(w, row);
  }
  return out;
}

function makeWord(e) {
  const o = {};
  const p = String(e.phonetic || '').trim();
  if (p) o.p = p;
  const t = String(e.translation || '').trim();
  if (t) o.t = t;
  const d = String(e.definition || '').trim().replace(/\s+/g, ' ').slice(0, 240);
  if (d) o.d = d;
  const c = Number(e.collins) || 0;
  if (c) o.c = c;
  const ox = Number(e.oxford) || 0;
  if (ox) o.o = ox;
  const g = String(e.tag || '').trim();
  if (g) o.g = g;
  const bnc = Number(e.bnc) || 0;
  if (bnc) o.bnc = bnc;
  const frq = Number(e.frq) || 0;
  if (frq) o.frq = frq;
  if (classify(e) === 'rare') o.r = 1;
  return o;
}

export async function buildDictionary({ enTexts, properNouns }) {
  // 1. 统计每个 surface 出现在多少段文本里（文档频次）
  const counts = new Map();
  for (const t of enTexts) {
    for (const w of collectWords(t)) counts.set(w, (counts.get(w) || 0) + 1);
  }
  const needed = new Set(counts.keys());

  // 2. 第一遍查找集 = 出现的词 + lemma 表里的原形
  const lemmaMap = await loadLemmaMap();
  const lookup = new Set(needed);
  for (const w of needed) {
    const lm = lemmaMap.get(w);
    if (lm) lookup.add(lm);
  }

  // 3. 扫描 ECDICT
  const csvPath = join(CACHE_DIR, 'ecdict.csv');
  await downloadCached(ECDICT_CSV_URL, csvPath, { minBytes: ECDICT_MIN_BYTES });
  const entries = await scanCsv(csvPath, lookup);

  // 4. 归并到原形
  //    候选原形：exchange 的 `0:` > lemma.en.txt。先补齐候选词条，再决定采用谁。
  const candOf = new Map();
  const missingLemmas = new Set();
  for (const s of needed) {
    const e = entries.get(s);
    const cand = exchangeLemma(e?.exchange) || lemmaMap.get(s);
    candOf.set(s, cand && cand !== s ? cand : null);
    if (cand && !entries.has(cand)) missingLemmas.add(cand);
  }
  if (missingLemmas.size) {
    const extra = await scanCsv(csvPath, missingLemmas);
    for (const [k, v] of extra) if (!entries.has(k)) entries.set(k, v);
  }

  //    采用规则：词条自带音标且不是「复数/过去式」这类变形释义 → 作自身原形；
  //    否则若候选原形是完整词条（有音标）→ 归并过去。
  //    这样既避免 soldier→soldi、holy→ho（规则还原误伤），也避免 seething→sethe（lemma 表误伤）。
  const INFLECTION = /的复数形式|的过去式|的过去分词|的现在分词|的第三人称|pl\. of/;
  const lemmaOf = new Map();
  for (const s of needed) {
    const e = entries.get(s);
    const cand = candOf.get(s);
    let lemma = s;
    if (cand && entries.get(cand)?.phonetic) {
      if (!(e && e.phonetic) || INFLECTION.test(e.translation || '')) lemma = cand;
    }
    lemmaOf.set(s, lemma);
  }

  // 5. 产出词表
  const words = {};
  const forms = {};
  const unresolved = [];
  for (const s of needed) {
    const lemma = lemmaOf.get(s);
    const e = entries.get(lemma) || entries.get(s);
    if (!e) { unresolved.push(s); continue; }
    if (lemma !== s) forms[s] = lemma;
    if (!words[lemma]) words[lemma] = makeWord(e);
  }

  // 6. 跳过集
  //    skip     —— 任何地方都不标注（功能词，如 of/the/and）
  //    softSkip —— 正文里跳过、名称里可点（LoL 造词 + 英雄专名）
  const softSkip = new Set(GAME_TERMS);
  for (const n of properNouns || []) {
    for (const w of collectWords(n)) softSkip.add(w);
  }
  const skip = new Set(STOPWORDS);

  let rareCount = 0;
  for (const k of Object.keys(words)) if (words[k].r === 1) rareCount++;

  const dict = {
    meta: {
      count: Object.keys(words).length,
      forms: Object.keys(forms).length,
      rare: rareCount,
      rule: 'rarity-v1',
    },
    skip: [...skip].sort(),
    softSkip: [...softSkip].sort(),
    forms,
    words,
  };

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(join(DATA_DIR, 'dict.js'), `window.LOL=window.LOL||{};\nwindow.LOL.dict=${jsLiteral(dict)};\n`);

  // 7. 自检报告
  const unknownTop = unresolved
    .map((w) => ({ w, n: counts.get(w) }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 300);

  const report = {
    dictWords: dict.meta.count,
    forms: dict.meta.forms,
    rare: rareCount,
    surfaces: needed.size,
    unresolvedCount: unresolved.length,
    skipCount: skip.size,
    softSkipCount: softSkip.size,
    unknownTop,
  };
  await writeFile(join(DATA_DIR, 'report.dict.js'), `window.LOL=window.LOL||{};\nwindow.LOL.reportDict=${jsLiteral(report)};\n`);

  return { dict, report };
}
