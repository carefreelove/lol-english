// 抓取候选台词供人工翻译与核对；不覆盖已审核的 content/voices.json。
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';
import { CACHE_DIR, DDRAGON, CONTENT_VERSION } from './config.mjs';
import { getJsonCached, mapLimit } from './lib/http.mjs';

const version = CONTENT_VERSION;
const origin = 'https://wiki.leagueoflegends.com';
const index = await getJsonCached(`${DDRAGON}/cdn/${version}/data/en_US/champion.json`, join(CACHE_DIR, 'ddragon', version, 'en_US', 'champion.json'));
const champions = {};
await mapLimit(Object.values(index.data), 3, async (champion) => {
  const name = champion.id === 'Nunu' ? 'Nunu' : champion.name;
  const page = name.replaceAll(' ', '_') + '/Audio';
  const api = `${origin}/en-us/api.php?${new URLSearchParams({ action: 'parse', page, prop: 'text|revid', section: '1', format: 'json' })}`;
  const response = await getJsonCached(api, join(CACHE_DIR, 'voice-sources', version, `${champion.id}.json`));
  if (!response?.parse?.text?.['*']) throw new Error(`${champion.id}: ${JSON.stringify(response?.error)}`);
  const dom = new JSDOM(response.parse.text['*']);
  const doc = dom.window.document;
  const lines = [];
  for (const label of doc.querySelectorAll('dt')) {
    const event = { Pick: 'pick', Ban: 'ban' }[label.textContent.trim()];
    if (!event) continue;
    const list = label.closest('dl').nextElementSibling;
    if (!list || list.tagName !== 'UL') continue;
    for (const item of list.children) {
      const quotes = Array.from(item.querySelectorAll('i')).filter(i => i.textContent.trim() !== 'Sound Effect');
      const audio = item.querySelector('source[type="audio/mpeg"]');
      if (!quotes.length || !audio) continue;
      const nonverbal = !quotes.some(i => /["“]/.test(i.textContent));
      const textEn = quotes.map(i => {
        const speaker = i.previousElementSibling?.tagName === 'B' ? i.previousElementSibling.textContent.trim() + ' ' : '';
        return speaker + i.textContent.trim();
      }).join('\n');
      lines.push({ id: `${event}-${lines.filter(l => l.event === event).length + 1}`, event,
        textEn, textZh: '', ...(nonverbal ? { nonverbal: true } : {}),
        translationKind: 'learning', audioEn: new URL(audio.getAttribute('src'), origin).href,
        sourceUrl: `${origin}/en-us/${encodeURI(page)}?oldid=${response.parse.revid}` });
    }
  }
  dom.window.close();
  champions[champion.id] = lines;
  console.log(`${champion.id}: ${lines.length}`);
});
await mkdir(CACHE_DIR, { recursive: true });
await writeFile(join(CACHE_DIR, 'voices-candidates.json'), JSON.stringify({ schemaVersion: 1, version, scope: 'pick-ban',
  attribution: 'League of Legends Wiki contributors; original dialogue © Riot Games',
  license: 'CC-BY-SA-3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
  champions: Object.fromEntries(Object.entries(champions).sort(([a], [b]) => a.localeCompare(b))) }, null, 2) + '\n');
console.log('候选文件：.cache/voices-candidates.json；核对、补译后再更新 content/voices.json。');
