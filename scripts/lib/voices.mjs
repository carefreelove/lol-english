import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT } from '../config.mjs';

export function validateVoices(data, championIds) {
  if (data.schemaVersion !== 1 || !data.champions) throw new Error('语音数据格式不正确');
  for (const id of championIds) {
    const lines = data.champions[id];
    if (!Array.isArray(lines) || !lines.length) throw new Error(`缺少英雄语音：${id}`);
    const seen = new Set();
    for (const line of lines) {
      const fail = () => { throw new Error(`语音条目不完整或不安全：${id}/${line.id}`); };
      if (!line.id || seen.has(line.id) || !['pick', 'ban'].includes(line.event)) fail();
      seen.add(line.id);
      if (![line.textEn, line.textZh].every(t => typeof t === 'string' && t.trim())) fail();
      if (/[一-鿿<>]/.test(line.textEn) || /[<>]/.test(line.textZh)) fail();
      if (line.translationKind !== 'learning') fail();
      for (const key of ['audioEn', 'sourceUrl']) {
        let url;
        try { url = new URL(line[key]); } catch { fail(); }
        if (url.protocol !== 'https:' || url.hostname !== 'wiki.leagueoflegends.com' || url.username || url.password) fail();
      }
      if (!/oldid=\d+/.test(line.sourceUrl)) fail();
    }
    if (!lines.some(l => l.event === 'pick') || !lines.some(l => l.event === 'ban')) {
      throw new Error(`选用/禁用语音缺失：${id}`);
    }
  }
  return data;
}

export async function loadVoices(championIds) {
  return validateVoices(JSON.parse(await readFile(join(ROOT, 'content/voices.json'), 'utf8')), championIds);
}
