// 开发用冒烟测试：起一个临时静态服务器，用 jsdom 真实加载页面与脚本，驱动 UI 走关键路径。
// 运行： node scripts/smoke-test.mjs
import { readFileSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';
import { createServer } from 'node:http';
import jsdomPkg from 'jsdom';
const { JSDOM, VirtualConsole } = jsdomPkg;

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const PUBLIC = join(ROOT, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
};

const server = createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
  const file = join(PUBLIC, rel);
  if (!existsSync(file) || !statSync(file).isFile()) { res.writeHead(404); res.end('404'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;
const BASE = `http://127.0.0.1:${PORT}`;

const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', (e) => { if (!/Could not load img|Could not load link/i.test(e.message)) errors.push('jsdomError: ' + e.message); });
vc.on('error', (m) => errors.push('console.error: ' + m));

const results = [];
function check(name, cond, extra) { results.push({ name, ok: !!cond, extra }); }

const dom = new JSDOM(readFileSync(join(PUBLIC, 'index.html'), 'utf8'), {
  url: BASE + '/index.html',
  runScripts: 'dangerously',
  resources: 'usable',
  virtualConsole: vc,
  pretendToBeVisual: true,
});
const { window } = dom;
const doc = window.document;

function waitFor(fn, timeout = 10000, step = 50) {
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    (function poll() {
      let v;
      try { v = fn(); } catch (e) { return reject(e); }
      if (v) return resolve(v);
      if (Date.now() - t0 > timeout) return reject(new Error('waitFor 超时'));
      setTimeout(poll, step);
    })();
  });
}
const tick = (ms = 80) => new Promise((r) => setTimeout(r, ms));

async function main() {
  await waitFor(() => window.App && window.Store, 12000);
  await waitFor(() => doc.querySelectorAll('.champ-item').length > 0, 12000);

  check('版本号已注入', !!(window.LOL.meta && window.LOL.meta.version), window.LOL.meta.version);
  check('顶部 6 个标签', doc.querySelectorAll('#tabs button').length === 6);
  check('英雄列表 173 项', doc.querySelectorAll('.champ-item').length === 173, doc.querySelectorAll('.champ-item').length);
  check('metaInfo 已填充', /英雄\s*173/.test(doc.getElementById('metaInfo').textContent), doc.getElementById('metaInfo').textContent);

  // 小图标必须真能取到（曾因构建路径多出一层 img/ 而全部 404）
  async function iconOk(rel) {
    const r = await fetch(BASE + '/' + rel);
    return r.ok && /^image\//.test(r.headers.get('content-type') || '');
  }
  const champIcon = window.LOL.championsIndex[0].icon;
  check('英雄图标可访问', await iconOk(champIcon), champIcon);
  const firstItemIcon = window.LOL.items[0].icon;
  check('装备图标可访问', await iconOk(firstItemIcon), firstItemIcon);
  const firstSumIcon = window.LOL.summoners[0].icon;
  check('召唤师技能图标可访问', await iconOk(firstSumIcon), firstSumIcon);

  const e1 = window.Annotate.lookup('slams');
  check('词典 slams→slam（音标 slæm）', e1 && e1.p === 'slæm', e1 && e1.p);
  const e2 = window.Annotate.lookup('obliterate');
  check('词典 obliterate 标为生僻', e2 && e2.r === 1);
  check('专名 aatrox 进 softSkip（正文跳过、名称可点）', window.Annotate.softSkip.has('aatrox'));
  check('功能词 the 进 skip（从不标注）', window.Annotate.skip.has('the'));

  // 深链接 #/champions/Ahri
  window.location.hash = '#/champions/Ahri';
  await waitFor(function () {
    const a = doc.querySelector('.champ-item.active');
    return a && /Ahri/.test(a.textContent);
  }, 8000);
  check('深链接 #/champions/Ahri 自动选中', true, (doc.querySelector('.champ-item.active') || {}).textContent);

  doc.querySelector('.champ-item').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await waitFor(() => doc.querySelectorAll('.skill').length >= 1, 10000);
  check('技能块渲染（被动+4技能=5）', doc.querySelectorAll('.skill').length === 5, doc.querySelectorAll('.skill').length);
  check('皮肤缩略图渲染', doc.querySelectorAll('.skin').length > 0, doc.querySelectorAll('.skin').length);
  const voiceRows = doc.querySelectorAll('.voice-line');
  check('选用与禁用语音各一条', voiceRows.length === 2);
  check('语音中英对照与学习译文提示', !!doc.querySelector('.voice-line .zh').textContent && /学习译文/.test(doc.querySelector('.voice-section').textContent));
  const voiceWord = doc.querySelector('.voice-line .w[data-w="annihilation"]');
  check('语音词汇进入词典并高亮', !!voiceWord && voiceWord.classList.contains('rare') && !!window.Annotate.lookup('annihilation')?.t);
  voiceWord.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  const voicePop = doc.getElementById('popover');
  check('语音查词展示音标与中文释义', !!voicePop.querySelector('.ph') && !!voicePop.querySelector('.zh-def'));
  voicePop.querySelector('.acts button:last-child').click();
  check('语音生词可收藏', window.Favorites.has('annihilation'));
  voicePop.querySelector('.acts button:last-child').click();
  let spoken;
  const realSpeak = window.TTS.speak;
  window.TTS.speak = text => { spoken = text; };
  doc.querySelector('.voice-speak').click();
  check('整句朗读传入完整台词', spoken === voiceRows[0].querySelector('.en').textContent);
  window.TTS.speak = realSpeak;
  const voiceAudio = doc.querySelector('.voice-audio');
  check('原声音频懒加载且带无障碍标签', voiceAudio.preload === 'none' && voiceAudio.controls && !!voiceAudio.getAttribute('aria-label'));
  voiceAudio.dispatchEvent(new window.Event('error'));
  check('原声失效显示提示而不隐藏译文', /暂时无法加载/.test(doc.querySelector('.voice-status').textContent) && !!doc.querySelector('.voice-line .zh').textContent);
  voiceAudio.dispatchEvent(new window.Event('canplay'));
  check('原声恢复后清除错误提示', doc.querySelector('.voice-status').textContent === '');
  window.Store.setSetting('showZh', false);
  check('自测模式实际隐藏台词中文', window.getComputedStyle(doc.querySelector('.voice-line .zh')).display === 'none');
  check('自测模式实际隐藏技能中文名', window.getComputedStyle(doc.querySelector('.skill .zh-inline')).display === 'none');
  window.Store.setSetting('showZh', true);
  check('恢复台词中文显示', window.getComputedStyle(doc.querySelector('.voice-line .zh')).display !== 'none');
  const allChampions = await Promise.all(window.Store.champions().map(c => window.Store.getChampion(c.id)));
  check('所有英雄的懒加载数据均包含双语语音', allChampions.every(c => c?.voices?.length >= 2 && c.voices.every(v => v.textEn && v.textZh)));
  check('语音数量与构建统计一致', allChampions.reduce((n,c) => n+c.voices.length,0) === window.LOL.meta.counts.voiceLines);
  const skillImg = doc.querySelector('.skill img');
  check('技能/被动图标可访问', !!skillImg && (await iconOk(skillImg.getAttribute('src'))), skillImg && skillImg.getAttribute('src'));
  const skinImg = doc.querySelector('.skin img');
  check('皮肤缩略图走在线地址', !!skinImg && /^https?:\/\//.test(skinImg.getAttribute('src')), skinImg && skinImg.getAttribute('src'));
  const wSpan = doc.querySelector('.en .w');
  check('英文被切成可点击单词', !!wSpan && !!wSpan.dataset.w, wSpan && wSpan.dataset.w);

  wSpan.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await tick();
  const pop = doc.getElementById('popover');
  check('点击单词弹出释义层', !pop.classList.contains('hidden'));
  check('弹层含发音/收藏按钮', pop.querySelectorAll('button').length >= 2);

  // 名称（技能名/被动名/皮肤名）也要能点词查义 —— 名称走的是同一套词条弹层
  const nameW = doc.querySelector('.skill .head .w');
  check('技能名切成可点单词', !!nameW && !!nameW.dataset.w, nameW && nameW.dataset.w);
  check('名称里的词不做生僻高亮', !!nameW && nameW.className === 'w', nameW && nameW.className);
  nameW.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await tick();
  check('点技能名里的词 → 弹层标题为该词',
    !pop.classList.contains('hidden') && pop.querySelector('.pw').textContent === nameW.textContent,
    pop.querySelector('.pw').textContent);

  const skinW = doc.querySelector('.skin .w');
  check('皮肤名切成可点单词', !!skinW && !!skinW.dataset.w, skinW && skinW.dataset.w);
  const imgModal = doc.getElementById('modal');
  check('大图弹层初始隐藏', imgModal.classList.contains('hidden'));
  skinW.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await tick();
  check('点皮肤名里的词 → 弹词条而非大图',
    !pop.classList.contains('hidden') && imgModal.classList.contains('hidden'));

  window.Favorites.add({ lemma: 'testword', w: 'testword', phonetic: 'test', zh: '测试' });
  check('收藏写入成功', window.Favorites.has('testword'));
  check('收藏进入 localStorage', /testword/.test(window.localStorage.getItem('lolEnglish.favorites.v1') || ''));
  window.Favorites.remove('testword');
  check('收藏删除成功', !window.Favorites.has('testword'));

  window.App.go('items');
  await tick();
  check('装备卡片 253 张', doc.querySelectorAll('.item-card').length === 253, doc.querySelectorAll('.item-card').length);
  doc.querySelector('.item-card').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await tick();
  check('装备展开显示描述', doc.querySelectorAll('.item-detail').length === 1);
  check('装备描述里有可点单词', doc.querySelectorAll('.item-detail .w').length > 0, doc.querySelectorAll('.item-detail .w').length);
  const itemNameW = doc.querySelector('.item-card .nm .w');
  check('装备名切成可点单词', !!itemNameW && !!itemNameW.dataset.w, itemNameW && itemNameW.dataset.w);

  window.App.go('runes');
  await tick();
  check('符文树 5 棵', doc.querySelectorAll('.rune-tree').length === 5, doc.querySelectorAll('.rune-tree').length);
  check('符文系名切成可点单词', !!doc.querySelector('.rune-tree > .head .w'), (doc.querySelector('.rune-tree > .head .w') || {}).dataset?.w);
  check('符文名切成可点单词', !!doc.querySelector('.rune .body .head .w'), (doc.querySelector('.rune .body .head .w') || {}).dataset?.w);
  window.App.go('summoners');
  await tick();
  check('召唤师技能 16 个', doc.querySelectorAll('.grid .card').length === 16, doc.querySelectorAll('.grid .card').length);
  check('召唤师技能名切成可点单词', !!doc.querySelector('.grid .card b .w'), (doc.querySelector('.grid .card b .w') || {}).dataset?.w);

  window.Store.setSetting('showZh', false);
  check('关闭中文 → body.hide-zh', doc.body.classList.contains('hide-zh'));
  window.Store.setSetting('showZh', true);
  check('恢复中文对照', !doc.body.classList.contains('hide-zh'));

  window.Favorites.add({ lemma: 'abyss', w: 'abyss', phonetic: "ə'bis", zh: '深渊' });
  window.App.go('favorites');
  await tick();
  check('生词本视图渲染收藏', doc.querySelectorAll('.fav-item').length === 1, doc.querySelectorAll('.fav-item').length);

  window.location.hash = '#/champions/Bard';
  await waitFor(() => doc.querySelector('.voice-line .en')?.textContent === 'Bard chimes.');
  check('非语言英雄显示原声和说明，不提供伪英语朗读', doc.querySelectorAll('.voice-audio').length === 2 && !doc.querySelector('.voice-speak'));
  window.location.hash = '#/champions/Gnar';
  await waitFor(() => /Gnar gada/.test(doc.querySelector('.voice-line .en')?.textContent || ''));
  check('虚构语言保留原声并标注', /虚构语言/.test(doc.querySelector('.voice-line').textContent) && !doc.querySelector('.voice-speak'));

  const fileDom = await JSDOM.fromFile(join(PUBLIC, 'index.html'), {
    runScripts: 'dangerously', resources: 'usable', virtualConsole: vc,
  });
  await waitFor(() => fileDom.window.App && fileDom.window.LOL?.meta);
  const fileChampion = await fileDom.window.Store.getChampion('Aatrox');
  check('file:// 直接打开可加载语音数据与词典', fileChampion.voices.length === 2 && !!fileDom.window.Annotate.lookup('annihilation'));
  fileDom.window.close();

  check('无脚本错误', errors.length === 0, errors.slice(0, 3).join(' | '));

  let pass = 0, fail = 0;
  for (const r of results) {
    console.log((r.ok ? 'PASS ' : 'FAIL ') + r.name + (r.extra != null ? '  → ' + r.extra : ''));
    r.ok ? pass++ : fail++;
  }
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  return fail;
}

main().then((fail) => { server.close(); process.exit(fail ? 1 : 0); })
  .catch((e) => {
    console.error('冒烟测试异常:', e.message);
    errors.slice(0, 5).forEach((x) => console.error('  ' + x));
    server.close();
    process.exit(1);
  });
