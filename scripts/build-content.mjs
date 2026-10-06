import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DDRAGON, LOCALES, CONCURRENCY, CACHE_DIR, DATA_DIR, IMG_DIR, SR_MAP_ID,
} from './config.mjs';
import { getJsonCached, mapLimit, downloadCached } from './lib/http.mjs';
import { clean, findMarkup } from './lib/text.mjs';

const SPELL_SLOTS = ['Q', 'W', 'E', 'R'];
const basename = (p) => String(p).split('/').pop();

const dataUrl = (ver, loc, file) => `${DDRAGON}/cdn/${ver}/data/${loc}/${file}`;
const cachePathFor = (ver, loc, file) => join(CACHE_DIR, 'ddragon', ver, loc, ...file.split('/'));

function jsLiteral(value) {
  // 转义 </ 以防外部脚本被 HTML 词法错误中断
  return JSON.stringify(value).replace(/<\//g, '<\\/');
}

async function writeJs(relPath, body) {
  const full = join(DATA_DIR, relPath);
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, `window.LOL=window.LOL||{};\n${body}\n`);
}

export async function buildContent(version) {
  const enTexts = [];
  const markupHits = [];
  const missing = [];
  const icons = []; // {url, rel}
  const addIcon = (url, rel) => { if (url && rel) icons.push({ url, rel }); };

  const collectEn = (t) => {
    if (!t) return;
    enTexts.push(t);
    const hits = findMarkup(t);
    if (hits.length) markupHits.push({ hits, sample: t.slice(0, 160) });
  };

  // ---------- 英雄 ----------
  const index = {};
  for (const loc of LOCALES) {
    index[loc] = await getJsonCached(
      dataUrl(version, loc, 'champion.json'),
      cachePathFor(version, loc, 'champion.json')
    );
  }
  if (!index.en_US?.data || !index.zh_CN?.data) throw new Error('英雄索引下载失败');

  const ids = Object.keys(index.en_US.data);
  const details = {};
  for (const loc of LOCALES) {
    details[loc] = {};
    const pairs = await mapLimit(ids, CONCURRENCY, async (id) => {
      const file = `champion/${id}.json`;
      const j = await getJsonCached(dataUrl(version, loc, file), cachePathFor(version, loc, file));
      return [id, j?.data?.[id] ?? null];
    });
    for (const [id, d] of pairs) details[loc][id] = d;
  }

  const championsIndex = [];
  let champSpellCount = 0;
  let skinCount = 0;

  for (const id of ids) {
    const en = details.en_US[id];
    const zh = details.zh_CN[id];
    if (!en || !zh) { missing.push(`champion detail: ${id}`); continue; }

    const zhSkinById = new Map((zh.skins || []).map((s) => [s.id, s.name]));

    const passive = {
      nameEn: en.passive?.name ?? '',
      nameZh: zh.passive?.name ?? '',
      descEn: clean(en.passive?.description),
      descZh: clean(zh.passive?.description),
      icon: `img/passive/${basename(en.passive?.image?.full)}`,
    };
    addIcon(`${DDRAGON}/cdn/${version}/img/passive/${basename(en.passive?.image?.full)}`, passive.icon);

    const spells = (en.spells || []).map((sp, i) => {
      const zsp = zh.spells?.[i] ?? {};
      const icon = `img/spell/${basename(sp.image?.full)}`;
      addIcon(`${DDRAGON}/cdn/${version}/img/spell/${basename(sp.image?.full)}`, icon);
      return {
        slot: SPELL_SLOTS[i] ?? `R${i + 1}`,
        nameEn: sp.name ?? '',
        nameZh: zsp.name ?? '',
        descEn: clean(sp.description),
        descZh: clean(zsp.description),
        cooldown: sp.cooldownBurn ?? '',
        cost: sp.costBurn ?? '',
        range: sp.rangeBurn ?? '',
        icon,
      };
    });

    const skins = (en.skins || [])
      .filter((s) => s.parentSkin == null)
      .map((s) => {
        const zhName = zhSkinById.get(s.id);
        const isDefault = s.num === 0;
        return {
          id: s.id,
          num: s.num,
          nameEn: isDefault ? 'Default' : s.name,
          nameZh: isDefault ? '默认' : (zhName && zhName !== 'default' ? zhName : s.name),
          loading: `${DDRAGON}/cdn/img/champion/loading/${id}_${s.num}.jpg`,
          splash: `${DDRAGON}/cdn/img/champion/splash/${id}_${s.num}.jpg`,
        };
      });

    const detail = {
      id,
      key: en.key,
      nameEn: en.name,
      nameZh: zh.name,
      titleEn: en.title,
      titleZh: zh.title,
      tags: en.tags || [],
      passive,
      spells,
      skins,
    };

    await writeJs(`champions/${id}.js`, `window.LOL.championDetails=window.LOL.championDetails||{};window.LOL.championDetails[${jsLiteral(id)}]=${jsLiteral(detail)};`);

    championsIndex.push({
      id,
      key: en.key,
      nameEn: en.name,
      nameZh: zh.name,
      titleEn: en.title,
      titleZh: zh.title,
      tags: en.tags || [],
      icon: `img/champion/${id}.png`,
    });
    addIcon(`${DDRAGON}/cdn/${version}/img/champion/${id}.png`, `img/champion/${id}.png`);

    champSpellCount += spells.length;
    skinCount += skins.length;

    collectEn(passive.descEn);
    collectEn(en.name);
    collectEn(en.title);
    for (const sp of spells) { collectEn(sp.descEn); collectEn(sp.nameEn); }
  }

  championsIndex.sort((a, b) => a.nameEn.localeCompare(b.nameEn));
  await writeJs('champions.index.js', `window.LOL.championsIndex=${jsLiteral(championsIndex)};`);

  // ---------- 装备 ----------
  const itemsEn = await getJsonCached(dataUrl(version, 'en_US', 'item.json'), cachePathFor(version, 'en_US', 'item.json'));
  const itemsZh = await getJsonCached(dataUrl(version, 'zh_CN', 'item.json'), cachePathFor(version, 'zh_CN', 'item.json'));
  if (!itemsEn?.data || !itemsZh?.data) throw new Error('装备数据下载失败');

  const items = [];
  for (const itemId of Object.keys(itemsEn.data)) {
    const en = itemsEn.data[itemId];
    const zh = itemsZh.data[itemId];
    if (!zh) continue;
    if (!(en.maps && en.maps[SR_MAP_ID] === true)) continue;
    if (!en.gold || en.gold.purchasable !== true) continue;
    if (!en.description) continue;

    const icon = `img/item/${itemId}.png`;
    addIcon(`${DDRAGON}/cdn/${version}/img/item/${itemId}.png`, icon);

    const rec = {
      id: itemId,
      nameEn: en.name ?? '',
      nameZh: zh.name ?? '',
      plainEn: clean(en.plaintext),
      plainZh: clean(zh.plaintext),
      descEn: clean(en.description),
      descZh: clean(zh.description),
      gold: en.gold.total ?? 0,
      tags: en.tags || [],
      icon,
    };
    items.push(rec);
    collectEn(rec.nameEn);
    collectEn(rec.plainEn);
    collectEn(rec.descEn);
  }
  items.sort((a, b) => a.nameEn.localeCompare(b.nameEn));
  await writeJs('items.js', `window.LOL.items=${jsLiteral(items)};`);

  // ---------- 召唤师技能 ----------
  const sumEn = await getJsonCached(dataUrl(version, 'en_US', 'summoner.json'), cachePathFor(version, 'en_US', 'summoner.json'));
  const sumZh = await getJsonCached(dataUrl(version, 'zh_CN', 'summoner.json'), cachePathFor(version, 'zh_CN', 'summoner.json'));
  const summoners = [];
  for (const key of Object.keys(sumEn?.data ?? {})) {
    if (/Jade|Cherry/i.test(key)) continue;
    const en = sumEn.data[key];
    const zh = sumZh?.data?.[key];
    if (!zh) continue;
    const icon = `img/summoner/${basename(en.image?.full)}`;
    addIcon(`${DDRAGON}/cdn/${version}/img/spell/${basename(en.image?.full)}`, icon);
    const rec = {
      key,
      nameEn: en.name ?? '',
      nameZh: zh.name ?? '',
      descEn: clean(en.description),
      descZh: clean(zh.description),
      cooldown: en.cooldownBurn ?? '',
      range: en.rangeBurn ?? '',
      icon,
    };
    summoners.push(rec);
    collectEn(rec.nameEn);
    collectEn(rec.descEn);
  }
  summoners.sort((a, b) => a.nameEn.localeCompare(b.nameEn));
  await writeJs('summoners.js', `window.LOL.summoners=${jsLiteral(summoners)};`);

  // ---------- 符文 ----------
  const runesEn = await getJsonCached(dataUrl(version, 'en_US', 'runesReforged.json'), cachePathFor(version, 'en_US', 'runesReforged.json'));
  const runesZh = await getJsonCached(dataUrl(version, 'zh_CN', 'runesReforged.json'), cachePathFor(version, 'zh_CN', 'runesReforged.json'));
  const zhTreeByKey = new Map((runesZh || []).map((t) => [t.key, t]));
  const runes = (runesEn || []).map((tree) => {
    const ztree = zhTreeByKey.get(tree.key);
    const zhRuneById = new Map();
    (ztree?.slots || []).forEach((sl) => (sl.runes || []).forEach((r) => zhRuneById.set(r.id, r)));

    const icon = `img/rune/${basename(tree.icon)}`;
    addIcon(`${DDRAGON}/cdn/img/${tree.icon}`, icon);

    return {
      key: tree.key,
      nameEn: tree.name ?? '',
      nameZh: ztree?.name ?? '',
      icon,
      slots: (tree.slots || []).map((sl) => ({
        runes: (sl.runes || []).map((r) => {
          const zr = zhRuneById.get(r.id);
          const rIcon = `img/rune/${basename(r.icon)}`;
          addIcon(`${DDRAGON}/cdn/img/${r.icon}`, rIcon);
          const rec = {
            id: r.id,
            key: r.key,
            nameEn: r.name ?? '',
            nameZh: zr?.name ?? '',
            shortEn: clean(r.shortDesc),
            shortZh: clean(zr?.shortDesc),
            longEn: clean(r.longDesc),
            longZh: clean(zr?.longDesc),
            icon: rIcon,
          };
          collectEn(rec.nameEn);
          collectEn(rec.shortEn);
          collectEn(rec.longEn);
          return rec;
        }),
      })),
    };
  });
  await writeJs('runes.js', `window.LOL.runes=${jsLiteral(runes)};`);

  // ---------- 图标本地化 ----------
  const uniqueIcons = new Map();
  for (const ic of icons) if (ic.rel && ic.rel !== 'img/spell/undefined' && !ic.rel.endsWith('/undefined')) uniqueIcons.set(ic.rel, ic);
  let iconDownloaded = 0;
  await mapLimit([...uniqueIcons.values()], 12, async (ic) => {
    try {
      const did = await downloadCached(ic.url, join(IMG_DIR, ic.rel), { minBytes: 1 });
      if (did) iconDownloaded++;
    } catch (e) {
      missing.push(`icon: ${ic.rel} (${e.message})`);
    }
  });

  return {
    version,
    enTexts,
    counts: {
      champions: championsIndex.length,
      spells: champSpellCount,
      skins: skinCount,
      items: items.length,
      summoners: summoners.length,
      runeTrees: runes.length,
      icons: uniqueIcons.size,
      iconsDownloaded: iconDownloaded,
    },
    diagnostics: { markupHits, missing },
    properNouns: ids.map((id) => details.en_US[id]?.name).filter(Boolean),
  };
}

// 允许单独运行
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { getJson } = await import('./lib/http.mjs');
  const { VERSIONS_URL } = await import('./config.mjs');
  const [latest] = await getJson(VERSIONS_URL);
  const r = await buildContent(latest);
  console.log('build-content 完成', r.counts);
}
