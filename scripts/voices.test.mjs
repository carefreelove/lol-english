import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateVoices } from './lib/voices.mjs';

const data = JSON.parse(await readFile(new URL('../content/voices.json', import.meta.url), 'utf8'));
test('基线中的每位英雄都有双语选用、禁用语音及来源', () => {
  assert.equal(Object.keys(data.champions).length, 173);
  validateVoices(data, Object.keys(data.champions));
  assert.equal(Object.values(data.champions).flat().length, 346);
});
test('多角色对话完整保留，非语言声音不伪装成英语', () => {
  assert.match(data.champions.Kindred[0].textEn, /Wolf:.*without the other/);
  assert.match(data.champions.Kayn[0].textEn, /Probably not/);
  for (const id of ['Bard', 'RekSai']) assert.ok(data.champions[id].every(l => l.nonverbal));
  assert.ok(data.champions.Sona.find(l => l.event === 'ban').nonverbal);
  assert.ok(data.champions.Gnar.every(l => l.fictionalLanguage));
});
test('新增英雄、缺少译文、重复 ID 和危险来源会阻止构建', () => {
  assert.throws(() => validateVoices(data, ['NewChampion']), /缺少英雄语音/);
  for (const mutate of [
    d => { d.champions.Aatrox[0].textZh = ''; },
    d => { d.champions.Aatrox[0].audioEn = 'javascript:alert(1)'; },
    d => { d.champions.Aatrox[0].sourceUrl = 'https://example.com/?oldid=1'; },
    d => { d.champions.Aatrox[1].id = d.champions.Aatrox[0].id; },
    d => { d.champions.Aatrox.pop(); },
  ]) {
    const copy = structuredClone(data);
    mutate(copy);
    assert.throws(() => validateVoices(copy, ['Aatrox']));
  }
});
