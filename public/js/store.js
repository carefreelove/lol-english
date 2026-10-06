window.Store = (function () {
  const SETTINGS_KEY = 'lolEnglish.settings.v1';
  const DEFAULTS = { showZh: true, highlightRare: true, rate: 0.9 };
  let settings = Object.assign({}, DEFAULTS);

  function apply() {
    document.body.classList.toggle('hide-zh', !settings.showZh);
    document.body.classList.toggle('no-highlight', !settings.highlightRare);
  }

  function loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) settings = Object.assign({}, DEFAULTS, JSON.parse(raw));
    } catch (e) { /* 隐私模式 / 损坏数据 → 用默认值 */ }
    apply();
  }

  function saveSettings() {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) { /* 忽略 */ }
    apply();
  }

  function setSetting(key, value) {
    settings[key] = value;
    saveSettings();
  }

  // ---- 英雄详情懒加载（每个英雄一个 .js，动态注入 <script>，兼容 file://）----
  window.LOL.championDetails = window.LOL.championDetails || {};
  const pending = Object.create(null);

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      const s = document.createElement('script');
      s.src = src;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('加载失败: ' + src)); };
      document.head.appendChild(s);
    });
  }

  function getChampion(id) {
    const cache = window.LOL.championDetails;
    if (cache[id]) return Promise.resolve(cache[id]);
    if (pending[id]) return pending[id];
    pending[id] = loadScript('data/champions/' + id + '.js').then(function () {
      delete pending[id];
      return cache[id] || null;
    }, function (err) {
      delete pending[id];
      throw err;
    });
    return pending[id];
  }

  return {
    loadSettings: loadSettings,
    saveSettings: saveSettings,
    setSetting: setSetting,
    settings: function () { return settings; },
    getChampion: getChampion,
    meta: function () { return window.LOL.meta || {}; },
    champions: function () { return window.LOL.championsIndex || []; },
    items: function () { return window.LOL.items || []; },
    runes: function () { return window.LOL.runes || []; },
    summoners: function () { return window.LOL.summoners || []; },
  };
})();
