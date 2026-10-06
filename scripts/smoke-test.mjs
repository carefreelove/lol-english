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

  const e1 = window.Annotate.lookup('slams');
  check('词典 slams→slam（音标 slæm）', e1 && e1.p === 'slæm', e1 && e1.p);
  const e2 = window.Annotate.lookup('obliterate');
  check('词典 obliterate 标为生僻', e2 && e2.r === 1);
  check('跳过集含英雄专名 aatrox', window.Annotate.skip.has('aatrox'));

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
  const wSpan = doc.querySelector('.en .w');
  check('英文被切成可点击单词', !!wSpan && !!wSpan.dataset.w, wSpan && wSpan.dataset.w);

  wSpan.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await tick();
  const pop = doc.getElementById('popover');
  check('点击单词弹出释义层', !pop.classList.contains('hidden'));
  check('弹层含发音/收藏按钮', pop.querySelectorAll('button').length >= 2);

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

  window.App.go('runes');
  await tick();
  check('符文树 5 棵', doc.querySelectorAll('.rune-tree').length === 5, doc.querySelectorAll('.rune-tree').length);
  window.App.go('summoners');
  await tick();
  check('召唤师技能 16 个', doc.querySelectorAll('.grid .card').length === 16, doc.querySelectorAll('.grid .card').length);

  window.Store.setSetting('showZh', false);
  check('关闭中文 → body.hide-zh', doc.body.classList.contains('hide-zh'));
  window.Store.setSetting('showZh', true);
  check('恢复中文对照', !doc.body.classList.contains('hide-zh'));

  window.Favorites.add({ lemma: 'abyss', w: 'abyss', phonetic: "ə'bis", zh: '深渊' });
  window.App.go('favorites');
  await tick();
  check('生词本视图渲染收藏', doc.querySelectorAll('.fav-item').length === 1, doc.querySelectorAll('.fav-item').length);

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
