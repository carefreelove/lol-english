window.Annotate = (function () {
  const dict = window.LOL.dict || {};
  // skip：任何地方都不标注（功能词）；softSkip：正文里跳过、名称里可点（造词 + 英雄专名）
  const skip = new Set(dict.skip || []);
  const softSkip = new Set(dict.softSkip || []);

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
   * opts.inName：名称模式 —— 专名/造词也可点，且不做生僻高亮（名字要保持干净）
   */
  function renderInto(container, text, opts) {
    const inName = !!(opts && opts.inName);
    const segs = window.LoLText.segment(text || '');
    const highlight = !inName && window.Store.settings().highlightRare;
    for (let i = 0; i < segs.length; i++) {
      const seg = segs[i];
      const plain = seg.type !== 'word'
        || skip.has(seg.key)
        || (!inName && softSkip.has(seg.key));
      if (plain) {
        container.appendChild(document.createTextNode(seg.value));
        continue;
      }
      const span = document.createElement('span');
      span.className = 'w';
      span.textContent = seg.value;
      span.dataset.w = seg.key;
      span.tabIndex = 0;
      if (!inName) {
        const entry = lookup(seg.key);
        if (entry && entry.r === 1) {
          if (highlight) span.classList.add('rare');
        } else if (!entry) {
          span.classList.add('unknown');
        }
      }
      container.appendChild(span);
    }
  }

  return { lookup: lookup, renderInto: renderInto, skip: skip, softSkip: softSkip };
})();
