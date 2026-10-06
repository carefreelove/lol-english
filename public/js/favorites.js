window.Favorites = (function () {
  const KEY = 'lolEnglish.favorites.v1';
  let items = [];
  let memoryOnly = false;
  const listeners = [];

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      const obj = JSON.parse(raw);
      if (obj && obj.schema === 1 && Array.isArray(obj.items)) items = obj.items;
    } catch (e) { memoryOnly = true; } // 数据损坏 → 当作空表继续，不阻塞启动
  }

  function save() {
    if (memoryOnly) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ schema: 1, items: items, savedAt: new Date().toISOString() }));
    } catch (e) { memoryOnly = true; }
  }

  function notify() { listeners.forEach(function (fn) { try { fn(); } catch (e) {} }); }

  function has(lemma) { return items.some(function (x) { return x.lemma === lemma; }); }

  function add(rec) {
    if (has(rec.lemma)) return false;
    items.unshift({
      lemma: rec.lemma,
      w: rec.w || rec.lemma,
      phonetic: rec.phonetic || '',
      zh: (rec.zh || '').split('\n')[0].slice(0, 80),
      addedAt: new Date().toISOString(),
    });
    save(); notify();
    return true;
  }

  function remove(lemma) {
    const before = items.length;
    items = items.filter(function (x) { return x.lemma !== lemma; });
    if (items.length !== before) { save(); notify(); }
  }

  function toggle(rec) {
    if (has(rec.lemma)) { remove(rec.lemma); return false; }
    add(rec); return true;
  }

  function exportJson() {
    const data = JSON.stringify({ schema: 1, exportedAt: new Date().toISOString(), items: items }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lol-english-favorites.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  load();

  return {
    all: function () { return items; },
    has: has,
    add: add,
    remove: remove,
    toggle: toggle,
    exportJson: exportJson,
    onChange: function (fn) { listeners.push(fn); },
  };
})();
