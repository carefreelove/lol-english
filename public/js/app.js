window.App = (function () {
  const view = document.getElementById('view');
  const metaInfo = document.getElementById('metaInfo');
  const modal = document.getElementById('modal');
  const toastEl = document.getElementById('toast');

  const CHAMP_TAGS = {
    Fighter: '战士', Tank: '坦克', Mage: '法师', Assassin: '刺客',
    Marksman: '射手', Support: '辅助',
  };
  const ITEM_TAGS = {
    Damage: '攻击', AttackSpeed: '攻速', LifeSteal: '吸血', SpellDamage: '法强',
    CooldownReduction: '冷却缩减', AbilityHaste: '技能急速', Armor: '护甲', SpellBlock: '魔抗',
    Health: '生命', Mana: '法力', ManaRegen: '法力回复', HealthRegen: '生命回复',
    Boots: '鞋子', Consumable: '消耗品', Trinket: '饰品', Vision: '视野', GoldPer: '金币',
    Slow: '减速', OnHit: '攻击特效', Active: '主动', NonbootsMovement: '移速', Tenacity: '韧性',
    MagicPenetration: '法穿', ArmorPenetration: '护穿', Jungle: '打野', Lane: '对线',
    Stealth: '隐身', Aura: '光环', SpellVamp: '法术吸血', CriticalStrike: '暴击',
  };

  // ---------- 小工具 ----------
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  /** 英文名 → 可点单词（沿用词条弹层：音标 / 释义 / 发音） */
  function nameEn(text, tag, cls) {
    const e = el(tag || 'span', cls || null);
    Annotate.renderInto(e, text || '', { inName: true });
    return e;
  }

  /** 名称行：英文名（可点）＋ 中文名（原样文本），中间两空格，与旧版排版一致 */
  function nameLine(text, zh, tag, cls) {
    const e = nameEn(text, tag, cls);
    if (zh) e.appendChild(document.createTextNode('  ' + zh));
    return e;
  }

  function img(src, cls) {
    const i = document.createElement('img');
    i.loading = 'lazy';
    i.alt = '';
    i.src = src;
    i.addEventListener('error', function () {
      i.style.visibility = 'hidden';
    });
    if (cls) i.className = cls;
    return i;
  }

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.remove('hidden');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { toastEl.classList.add('hidden'); }, 1800);
  }

  /** 英文段（可标注）+ 中文段 */
  function biBlock(en, zh) {
    const wrap = el('div');
    const enP = el('p', 'en');
    Annotate.renderInto(enP, en || '');
    wrap.appendChild(enP);
    wrap.appendChild(el('p', 'zh', zh || ''));
    return wrap;
  }

  function tagChips(values, map, activeSet, onToggle) {
    const box = el('div', 'toolbar');
    values.forEach(function (v) {
      const b = el('button', 'chip' + (activeSet.has(v) ? ' active' : ''), (map && map[v]) || v);
      b.addEventListener('click', function () { onToggle(v); });
      box.appendChild(b);
    });
    return box;
  }

  function openModal(src, caption) {
    modal.textContent = '';
    const box = el('div');
    box.appendChild(img(src));
    box.appendChild(el('div', 'cap', caption));
    modal.appendChild(box);
    modal.classList.remove('hidden');
  }
  modal.addEventListener('click', function () { modal.classList.add('hidden'); });

  // ---------- 视图：英雄 ----------
  let champId = null;
  let champQuery = '';
  const champTagFilter = new Set();

  function renderChampions() {
    view.textContent = '';
    const layout = el('div', 'layout');
    const left = el('div');
    const right = el('div');

    const search = document.createElement('input');
    search.type = 'search';
    search.placeholder = '搜索英雄（中/英）…';
    search.value = champQuery;
    const bar = el('div', 'toolbar');
    bar.appendChild(search);
    left.appendChild(bar);

    const allTags = ['Fighter', 'Tank', 'Mage', 'Assassin', 'Marksman', 'Support'];
    left.appendChild(tagChips(allTags, CHAMP_TAGS, champTagFilter, function (t) {
      if (champTagFilter.has(t)) champTagFilter.delete(t); else champTagFilter.add(t);
      renderChampions();
    }));

    const list = el('div', 'champ-list');
    const all = Store.champions();
    const q = champQuery.trim().toLowerCase();
    const filtered = all.filter(function (c) {
      if (champTagFilter.size && !c.tags.some(function (t) { return champTagFilter.has(t); })) return false;
      if (!q) return true;
      return (c.nameEn + ' ' + c.nameZh + ' ' + c.titleEn + ' ' + c.titleZh + ' ' + c.id).toLowerCase().indexOf(q) >= 0;
    });
    filtered.forEach(function (c) {
      const item = el('div', 'champ-item' + (c.id === champId ? ' active' : ''));
      item.appendChild(img(c.icon));
      const nm = el('div', 'nm');
      nm.appendChild(el('b', null, c.nameEn));
      nm.appendChild(el('span', null, c.nameZh + ' · ' + c.titleZh));
      item.appendChild(nm);
      item.addEventListener('click', function () {
        champId = c.id;
        setHash('champions', c.id);   // 可收藏书签，不触发 hashchange 重复渲染
        renderChampions();
      });
      list.appendChild(item);
    });
    left.appendChild(list);
    if (!filtered.length) left.appendChild(el('p', 'muted', '没有匹配的英雄'));

    right.appendChild(el('p', 'muted', '选择左侧英雄查看技能与皮肤'));
    layout.appendChild(left);
    layout.appendChild(right);
    view.appendChild(layout);

    search.addEventListener('input', function () {
      champQuery = search.value;
      renderChampions();
      const s = view.querySelector('input[type=search]');
      if (s) { s.focus(); s.setSelectionRange(s.value.length, s.value.length); }
    });

    if (champId) renderChampionDetail(right);

    return layout;
  }

  function renderChampionDetail(right) {
    right.textContent = '';
    right.appendChild(el('div', 'loading', '加载中…'));
    Store.getChampion(champId).then(function (c) {
      if (!c) { right.textContent = ''; right.appendChild(el('p', 'muted', '英雄数据缺失')); return; }
      right.textContent = '';

      const head = el('div', 'card');
      const top = el('div', 'top');
      top.style.cssText = 'display:flex;gap:12px;align-items:center';
      top.appendChild(img(c.icon));
      const h = el('div');
      h.appendChild(nameLine(c.nameEn, c.nameZh, 'h3'));
      h.appendChild(el('div', 'muted', c.titleEn + ' · ' + c.titleZh));
      top.appendChild(h);
      head.appendChild(top);
      const tags = el('div', 'toolbar');
      tags.style.marginTop = '8px';
      c.tags.forEach(function (t) { tags.appendChild(el('span', 'chip', CHAMP_TAGS[t] || t)); });
      head.appendChild(tags);

      // 皮肤
      if (c.skins && c.skins.length) {
        head.appendChild(el('div', 'muted', '皮肤 Skin'));
        const strip = el('div', 'skin-strip');
        c.skins.forEach(function (s) {
          const box = el('div', 'skin');
          box.appendChild(img(s.loading));
          box.appendChild(nameEn(s.nameEn, 'span'));
          box.appendChild(el('span', null, s.nameZh));
          box.addEventListener('click', function (e) {
            if (e.target.classList.contains('w')) return;   // 点名字里的词 → 只弹词条，不开大图
            openModal(s.splash, s.nameEn + ' / ' + s.nameZh);
          });
          strip.appendChild(box);
        });
        head.appendChild(strip);
      }
      right.appendChild(head);

      // 被动
      const pCard = el('div', 'card');
      const p = el('div', 'skill');
      p.appendChild(img(c.passive.icon));
      const pb = el('div', 'body');
      const pHead = el('div', 'head');
      pHead.appendChild(document.createTextNode('被动 · '));
      pHead.appendChild(nameLine(c.passive.nameEn, c.passive.nameZh, 'b'));
      pb.appendChild(pHead);
      pb.appendChild(biBlock(c.passive.descEn, c.passive.descZh));
      p.appendChild(pb);
      pCard.appendChild(p);
      right.appendChild(pCard);

      // Q/W/E/R
      const cards = el('div', 'card');
      c.spells.forEach(function (s) {
        const row = el('div', 'skill');
        row.appendChild(img(s.icon));
        const b = el('div', 'body');
        const hd = el('div', 'head');
        hd.appendChild(el('span', 'slot', s.slot));
        hd.appendChild(nameLine(s.nameEn, s.nameZh, 'b'));
        b.appendChild(hd);
        b.appendChild(el('div', 'stats', '冷却 ' + (s.cooldown || '-') + ' · 消耗 ' + (s.cost || '-') + ' · 距离 ' + (s.range || '-')));
        b.appendChild(biBlock(s.descEn, s.descZh));
        row.appendChild(b);
        cards.appendChild(row);
      });
      right.appendChild(cards);
    }).catch(function (e) {
      right.textContent = '';
      right.appendChild(el('p', 'muted', '加载失败：' + e.message));
    });
  }

  // ---------- 视图：装备 ----------
  let itemQuery = '';
  const itemTagFilter = new Set();
  const expandedItems = new Set();

  function renderItems() {
    view.textContent = '';
    const bar = el('div', 'toolbar');
    const search = document.createElement('input');
    search.type = 'search';
    search.placeholder = '搜索装备（中/英）…';
    search.value = itemQuery;
    bar.appendChild(search);
    view.appendChild(bar);

    const all = Store.items();
    const tagSet = new Set();
    all.forEach(function (i) { (i.tags || []).forEach(function (t) { tagSet.add(t); }); });
    const tags = [...tagSet].sort();
    view.appendChild(tagChips(tags, ITEM_TAGS, itemTagFilter, function (t) {
      if (itemTagFilter.has(t)) itemTagFilter.delete(t); else itemTagFilter.add(t);
      renderItems();
    }));

    const q = itemQuery.trim().toLowerCase();
    const list = all.filter(function (i) {
      if (itemTagFilter.size && !(i.tags || []).some(function (t) { return itemTagFilter.has(t); })) return false;
      if (!q) return true;
      return (i.nameEn + ' ' + i.nameZh + ' ' + i.plainEn).toLowerCase().indexOf(q) >= 0;
    });

    const grid = el('div', 'grid');
    list.forEach(function (i) {
      const card = el('div', 'item-card');
      const top = el('div', 'top');
      top.appendChild(img(i.icon));
      const nm = el('div', 'nm');
      nm.appendChild(nameEn(i.nameEn, 'b'));
      nm.appendChild(el('span', null, i.nameZh));
      nm.appendChild(el('span', 'gold', '  ' + i.gold + 'g'));
      top.appendChild(nm);
      card.appendChild(top);

      if (expandedItems.has(i.id)) {
        const d = el('div', 'item-detail');
        d.appendChild(biBlock(i.descEn, i.descZh));
        card.appendChild(d);
      }
      card.addEventListener('click', function (e) {
        if (e.target.classList.contains('w')) return; // 点单词不折叠
        if (expandedItems.has(i.id)) expandedItems.delete(i.id); else expandedItems.add(i.id);
        renderItems();
      });
      grid.appendChild(card);
    });
    view.appendChild(grid);
    if (!list.length) view.appendChild(el('p', 'empty', '没有匹配的装备'));

    search.addEventListener('input', function () {
      itemQuery = search.value;
      renderItems();
      const s = view.querySelector('input[type=search]');
      if (s) { s.focus(); s.setSelectionRange(s.value.length, s.value.length); }
    });
  }

  // ---------- 视图：符文 ----------
  function renderRunes() {
    view.textContent = '';
    Store.runes().forEach(function (tree) {
      const card = el('div', 'card rune-tree');
      const head = el('div', 'head');
      head.appendChild(img(tree.icon));
      head.appendChild(nameLine(tree.nameEn, tree.nameZh));
      card.appendChild(head);
      tree.slots.forEach(function (slot) {
        slot.runes.forEach(function (r) {
          const row = el('div', 'rune');
          row.appendChild(img(r.icon));
          const b = el('div', 'body');
          b.appendChild(nameLine(r.nameEn, r.nameZh, 'div', 'head'));
          b.appendChild(biBlock(r.shortEn, r.shortZh));
          row.appendChild(b);
          card.appendChild(row);
        });
      });
      view.appendChild(card);
    });
  }

  // ---------- 视图：召唤师技能 ----------
  function renderSummoners() {
    view.textContent = '';
    const grid = el('div', 'grid');
    Store.summoners().forEach(function (s) {
      const card = el('div', 'card');
      const top = el('div', 'top');
      top.style.cssText = 'display:flex;gap:10px;align-items:center';
      top.appendChild(img(s.icon));
      const nm = el('div');
      nm.appendChild(nameLine(s.nameEn, s.nameZh, 'b'));
      nm.appendChild(el('div', 'muted', '冷却 ' + (s.cooldown || '-')));
      top.appendChild(nm);
      card.appendChild(top);
      card.appendChild(biBlock(s.descEn, s.descZh));
      grid.appendChild(card);
    });
    view.appendChild(grid);
  }

  // ---------- 视图：生词本 ----------
  function renderFavorites() {
    view.textContent = '';
    const bar = el('div', 'toolbar');
    const exportBtn = el('button', 'chip', '导出 JSON');
    exportBtn.addEventListener('click', function () { Favorites.exportJson(); });
    bar.appendChild(exportBtn);
    bar.appendChild(el('span', 'muted', '共 ' + Favorites.all().length + ' 个词'));
    view.appendChild(bar);

    const list = Favorites.all();
    if (!list.length) { view.appendChild(el('p', 'empty', '还没有收藏。点击任意英文单词，在弹层里点「收藏」。')); return; }

    const card = el('div', 'card');
    list.forEach(function (f) {
      const row = el('div', 'fav-item');
      row.appendChild(el('span', 'pw', f.w));
      row.appendChild(el('span', 'ph', f.phonetic ? '[' + f.phonetic + ']' : ''));
      row.appendChild(el('span', 'def', f.zh || ''));
      const speak = el('button', 'chip', '发音');
      speak.addEventListener('click', function () { TTS.speak(f.w); });
      row.appendChild(speak);
      const del = el('button', 'chip', '删除');
      del.addEventListener('click', function () { Favorites.remove(f.lemma); renderFavorites(); });
      row.appendChild(del);
      card.appendChild(row);
    });
    view.appendChild(card);
  }

  // ---------- 视图：设置 ----------
  function renderSettings() {
    view.textContent = '';
    const s = Store.settings();
    const card = el('div', 'card');

    function toggleRow(label, key) {
      const row = el('div', 'row');
      const lab = el('label', 'sw');
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = !!s[key];
      cb.addEventListener('change', function () {
        Store.setSetting(key, cb.checked);
        if (key === 'highlightRare') rerender();
      });
      lab.appendChild(cb);
      lab.appendChild(el('span', null, label));
      row.appendChild(lab);
      return row;
    }

    card.appendChild(toggleRow('显示中文对照（关闭后进入自测模式）', 'showZh'));
    card.appendChild(toggleRow('高亮生僻词', 'highlightRare'));

    const themeRow = el('div', 'row');
    themeRow.appendChild(el('span', null, '外观主题'));
    const themeBox = el('div', 'toolbar');
    themeBox.style.marginBottom = '0';
    [['dark', '深色 · 海克斯'], ['light', '浅色']].forEach(function (pair) {
      const b = el('button', 'chip' + (s.theme === pair[0] ? ' active' : ''), pair[1]);
      b.addEventListener('click', function () {
        Store.setSetting('theme', pair[0]);
        renderSettings();
      });
      themeBox.appendChild(b);
    });
    themeRow.appendChild(themeBox);
    card.appendChild(themeRow);

    const rateRow = el('div', 'row');
    rateRow.appendChild(el('span', null, '朗读语速'));
    const range = document.createElement('input');
    range.type = 'range';
    range.min = '0.5';
    range.max = '1.5';
    range.step = '0.1';
    range.value = String(s.rate);
    const rateVal = el('span', 'muted', s.rate + '×');
    range.addEventListener('input', function () {
      Store.setSetting('rate', parseFloat(range.value));
      rateVal.textContent = range.value + '×';
    });
    rateRow.appendChild(range);
    rateRow.appendChild(rateVal);
    card.appendChild(rateRow);

    view.appendChild(card);

    const info = el('div', 'card');
    const meta = Store.meta();
    info.appendChild(el('h3', null, '数据来源'));
    info.appendChild(el('p', 'muted', '英雄联盟官方数据库 (Data Dragon) 版本 ' + (meta.version || '?') + '，中英文案均来自官方，未做机器翻译。'));
    info.appendChild(el('p', 'muted', '词典：开源英汉词典 ECDICT（音标 / 中文释义 / 考纲标签 / 词频）。'));
    info.appendChild(el('p', 'muted', '生成时间：' + (meta.generatedAt || '?')));
    view.appendChild(info);
  }

  // ---------- 路由 ----------
  const VIEWS = {
    champions: renderChampions,
    items: renderItems,
    runes: renderRunes,
    summoners: renderSummoners,
    favorites: renderFavorites,
    settings: renderSettings,
  };
  let currentView = 'champions';

  function rerender() {
    WordInfo.hide();
    (VIEWS[currentView] || renderChampions)();
    updateTabs();
  }

  function updateTabs() {
    document.querySelectorAll('#tabs button').forEach(function (b) {
      b.classList.toggle('active', b.dataset.view === currentView);
    });
  }

  /** 解析 #/view[/arg]，如 #/champions/Aatrox */
  function parseHash() {
    const parts = (location.hash || '').replace(/^#\/?/, '').split('/').filter(Boolean);
    return {
      view: VIEWS[parts[0]] ? parts[0] : 'champions',
      arg: parts[1] ? decodeURIComponent(parts[1]) : null,
    };
  }

  /** 只改地址栏不触发 hashchange（用 replaceState），file:// 失败则忽略 */
  function setHash(view, arg) {
    const target = '#/' + view + (arg ? '/' + encodeURIComponent(arg) : '');
    if (location.hash === target) return;
    try { history.replaceState(null, '', target); } catch (e) { location.hash = target; }
  }

  function go(name) {
    if (!VIEWS[name]) name = 'champions';
    currentView = name;
    setHash(name);
    rerender();
  }

  function init() {
    Store.loadSettings();
    document.querySelectorAll('#tabs button').forEach(function (b) {
      b.addEventListener('click', function () { go(b.dataset.view); });
    });
    window.addEventListener('hashchange', function () {
      const h = parseHash();
      if (h.arg && h.view === 'champions') champId = h.arg;
      if (h.view !== currentView || h.arg) { currentView = h.view; rerender(); }
    });

    const meta = Store.meta();
    metaInfo.textContent = 'v' + (meta.version || '?') + ' · 英雄 ' + Store.champions().length + ' · 装备 ' + Store.items().length;

    function updateFavCount() {
      const el2 = document.getElementById('favCount');
      if (el2) el2.textContent = String(Favorites.all().length);
    }
    Favorites.onChange(updateFavCount);
    updateFavCount();

    const h = parseHash();
    currentView = h.view;
    if (h.arg && h.view === 'champions') champId = h.arg;
    rerender();
  }

  return { init: init, toast: toast, go: go, rerender: rerender };
})();

document.addEventListener('DOMContentLoaded', function () {
  try { window.App.init(); }
  catch (e) {
    document.getElementById('view').textContent = '初始化失败：' + e.message;
    console.error(e);
  }
});
