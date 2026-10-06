import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT, DATA_DIR, LOCALES, VERSIONS_URL } from './config.mjs';
import { getJson } from './lib/http.mjs';
import { buildContent } from './build-content.mjs';
import { buildDictionary } from './build-dictionary.mjs';

function jsLiteral(value) {
  return JSON.stringify(value).replace(/<\//g, '<\\/');
}

/** 把 scripts/lib/text.mjs 内联成浏览器可用的 public/data/text.js（同源，防漂移） */
async function writeTextModule() {
  const src = await readFile(join(ROOT, 'scripts', 'lib', 'text.mjs'), 'utf8');
  const out = src
    .replace(/^export\s+(function|const|let)\s/gm, '$1 ')
    .replace(/^export\s*\{[^}]*\}\s*;?\s*$/gm, '');
  await writeFile(
    join(DATA_DIR, 'text.js'),
    `${out}\nwindow.LoLText = { clean, segment, normalize, collectWords, findMarkup };\n`
  );
}

function reportViolations(enTexts) {
  const cjk = [];
  for (const t of enTexts) {
    if (/[一-鿿]/.test(t)) cjk.push(t.slice(0, 120));
  }
  return cjk;
}

async function main() {
  const t0 = Date.now();
  await mkdir(DATA_DIR, { recursive: true });

  console.log('[1/4] 获取最新版本…');
  const versions = await getJson(VERSIONS_URL);
  const version = versions[0];
  console.log('      version =', version);

  console.log('[2/4] 拉取英雄联盟官方数据（中英双语）…');
  const content = await buildContent(version);
  console.log('      内容统计:', content.counts);

  console.log('[3/4] 生成词典并标注生僻词…');
  const { report: dictReport } = await buildDictionary({
    enTexts: content.enTexts,
    properNouns: content.properNouns,
  });
  console.log('      词典统计:', {
    words: dictReport.dictWords,
    forms: dictReport.forms,
    rare: dictReport.rare,
    unresolved: dictReport.unresolvedCount,
  });

  console.log('[4/4] 写出 meta / text / report…');
  await writeTextModule();
  await writeFile(
    join(DATA_DIR, 'meta.js'),
    `window.LOL=window.LOL||{};\nwindow.LOL.meta=${jsLiteral({
      version,
      locales: LOCALES,
      generatedAt: new Date().toISOString(),
      counts: { ...content.counts, dictWords: dictReport.dictWords },
    })};\n`
  );

  const cjkLeaks = reportViolations(content.enTexts);
  const report = {
    ...content.counts,
    dict: {
      words: dictReport.dictWords,
      forms: dictReport.forms,
      rare: dictReport.rare,
      surfaces: dictReport.surfaces,
      unresolved: dictReport.unresolvedCount,
    },
    markupLeaks: content.diagnostics.markupHits.slice(0, 50),
    cjkLeaksInEnglish: cjkLeaks.slice(0, 50),
    missing: content.diagnostics.missing.slice(0, 50),
    unknownTop: dictReport.unknownTop.slice(0, 100),
  };
  await writeFile(
    join(DATA_DIR, 'report.js'),
    `window.LOL=window.LOL||{};\nwindow.LOL.report=${jsLiteral(report)};\n`
  );

  console.log('\n===== 构建完成 =====');
  console.log('版本          :', version);
  console.log('英雄          :', content.counts.champions);
  console.log('英雄技能      :', content.counts.spells);
  console.log('皮肤          :', content.counts.skins);
  console.log('装备(峡谷)    :', content.counts.items);
  console.log('召唤师技能    :', content.counts.summoners);
  console.log('符文树        :', content.counts.runeTrees);
  console.log('本地图标      :', content.counts.iconsDownloaded, '/', content.counts.icons);
  console.log('词典词条      :', dictReport.dictWords, '（生僻', dictReport.rare, '）');
  console.log('未收录 surface:', dictReport.unresolvedCount);
  console.log('标记残留      :', content.diagnostics.markupHits.length);
  console.log('英文含中文    :', cjkLeaks.length);
  console.log('缺失项        :', content.diagnostics.missing.length);
  console.log('耗时          :', ((Date.now() - t0) / 1000).toFixed(1), 's');
  console.log('产物目录      : public/data');
}

main().catch((e) => {
  console.error('构建失败:', e);
  process.exit(1);
});
