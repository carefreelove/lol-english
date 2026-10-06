window.Annotate = (function () {
  // 跳过集：功能词 + 游戏造词 + 英雄专名（构建期生成）
  const skip = new Set((window.LOL.dict && window.LOL.dict.skip) || []);

  /** 运行期查词：surface → 原形 → 词条 */
  function lookup(key) {
    const d = window.LOL.dict;
    if (!d) return null;
    const lemma = (d.forms && d.forms[key]) || key;
    return d.words[lemma] || d.words[key] || null;
  }

  /**
   * 把英文按词包成可点击的 <span> 追加进容器；
   * 文本用 createTextNode 原样输出（与官方文案逐字一致），天然防注入。
   */
  function renderInto(container, text) {
    const segs = window.LoLText.segment(text || '');
    const highlight = window.Store.settings().highlightRare;
    for (let i = 0; i < segs.length; i++) {
      const seg = segs[i];
      if (seg.type !== 'word' || skip.has(seg.key)) {
        container.appendChild(document.createTextNode(seg.value));
        continue;
      }
      const entry = lookup(seg.key);
      const span = document.createElement('span');
      span.className = 'w';
      span.textContent = seg.value;
      span.dataset.w = seg.key;
      span.tabIndex = 0;
      if (entry && entry.r === 1) {
        if (highlight) span.classList.add('rare');
      } else if (!entry) {
        span.classList.add('unknown');
      }
      container.appendChild(span);
    }
  }

  return { lookup: lookup, renderInto: renderInto, skip: skip };
})();
