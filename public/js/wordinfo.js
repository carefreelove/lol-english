window.WordInfo = (function () {
  const pop = document.getElementById('popover');
  const TAG_NAMES = {
    zk: '中考', gk: '高考', cet4: '四级', cet6: '六级',
    ky: '考研', toefl: '托福', ielts: '雅思', gre: 'GRE',
  };

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function hide() { pop.classList.add('hidden'); }

  function position(anchor) {
    const r = anchor.getBoundingClientRect();
    pop.style.left = '0px';
    pop.style.top = '0px';
    const pw = pop.offsetWidth;
    const ph = pop.offsetHeight;
    let left = r.left;
    let top = r.bottom + 6;
    if (left + pw > window.innerWidth - 8) left = window.innerWidth - pw - 8;
    if (left < 8) left = 8;
    if (top + ph > window.innerHeight - 8) top = Math.max(8, r.top - ph - 6);
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
  }

  function show(anchor, key) {
    const dict = window.LOL.dict || {};
    const lemma = (dict.forms && dict.forms[key]) || key;
    const entry = Annotate.lookup(key);

    pop.textContent = '';

    const head = el('div');
    head.appendChild(el('span', 'pw', anchor.textContent));
    if (lemma !== key) head.appendChild(el('span', 'lemma', '  → ' + lemma));
    pop.appendChild(head);

    if (!entry) {
      pop.appendChild(el('div', 'none', '词典未收录（可能是专有名词或游戏术语）'));
    } else {
      if (entry.p) pop.appendChild(el('div', 'ph', '[' + entry.p + ']'));

      const tags = el('div', 'tags');
      String(entry.g || '').split(/\s+/).filter(Boolean).forEach(function (t) {
        tags.appendChild(el('span', 'tag', TAG_NAMES[t] || t));
      });
      if (entry.o === 1) tags.appendChild(el('span', 'tag star', '牛津3000'));
      if (entry.c) tags.appendChild(el('span', 'tag star', '柯林斯 ' + entry.c + '★'));
      const freq = Math.min(entry.bnc || Infinity, entry.frq || Infinity);
      if (isFinite(freq)) tags.appendChild(el('span', 'tag', '词频 #' + freq));
      if (entry.r === 1) tags.appendChild(el('span', 'tag', '生僻'));
      if (tags.childNodes.length) pop.appendChild(tags);

      if (entry.t) pop.appendChild(el('div', 'zh-def', entry.t));
      if (entry.d) pop.appendChild(el('div', 'en-def', entry.d));
    }

    const acts = el('div', 'acts');
    const speakBtn = el('button', null, '发音');
    if (!TTS.supported) speakBtn.disabled = true;
    speakBtn.addEventListener('click', function () { TTS.speak(anchor.textContent); });
    acts.appendChild(speakBtn);

    const favBtn = el('button', null, Favorites.has(lemma) ? '已收藏 ✓' : '收藏');
    if (Favorites.has(lemma)) favBtn.classList.add('on');
    favBtn.addEventListener('click', function () {
      const added = Favorites.toggle({ lemma: lemma, w: anchor.textContent, phonetic: entry ? entry.p || '' : '', zh: entry ? entry.t || '' : '' });
      favBtn.textContent = added ? '已收藏 ✓' : '收藏';
      favBtn.classList.toggle('on', added);
    });
    acts.appendChild(favBtn);
    pop.appendChild(acts);

    pop.classList.remove('hidden');
    position(anchor);
  }

  // 事件委托：单词 / 关闭
  document.addEventListener('click', function (e) {
    const span = e.target.closest ? e.target.closest('.w') : null;
    if (span) { e.stopPropagation(); show(span, span.dataset.w); return; }
    if (!pop.contains(e.target)) hide();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') hide();
    if (e.key === 'Enter' && document.activeElement && document.activeElement.classList.contains('w')) {
      show(document.activeElement, document.activeElement.dataset.w);
    }
  });
  window.addEventListener('resize', hide);
  window.addEventListener('scroll', hide, true);

  return { show: show, hide: hide };
})();
