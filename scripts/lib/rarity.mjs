// 生僻词判定（仅构建期使用）。

// 常见功能词：任何地方都不标注
export const STOPWORDS = new Set(
  `a an the and or but if then than that this these those of to in on at by for with from into over under about as is are was were be been being am do does did done doing have has had having will would shall should can could may might must not no nor so such it its it's he she they them their his her him we us our you your i me my mine who whom whose what which when where why how there here all any both each few more most other some only own same too very just also even still yet ever never again once always often sometimes now then thus hence however therefore because while during before after above below up down out off again further both either neither each every much many little less least`
    .split(/\s+/)
    .filter(Boolean)
);

// 游戏专有造词 / 缩写：词典无收录或易误标，正文里不标注，但名称里仍可点（听发音用）
// （像 turret/minion/jungle/ward/dodge 等本身是正常英文词，保留可查，不列入此表）
export const GAME_TERMS = new Set(
  `ad ap cc aoe kda cs moba aram smurf jungler gank ganks ult ults ulting proc procs nerf nerfed buffed baron drake nexus inhibitor inhibitors yordle vastaya darkin runeterra hextech chemtech`
    .split(/\s+/)
    .filter(Boolean)
);

/**
 * @param {?{collins:number,oxford:number,tag:string,bnc:number,frq:number}} e 词典条目（可为 null）
 * @returns {'core'|'rare'|'unknown'}
 */
export function classify(e) {
  if (!e) return 'unknown';
  const collins = Number(e.collins) || 0;
  const oxford = Number(e.oxford) || 0;
  const bnc = Number(e.bnc) || 0;
  const frq = Number(e.frq) || 0;
  const tags = String(e.tag || '').split(/\s+/).filter(Boolean);

  if (oxford === 1 || collins >= 4) return 'core';
  if (tags.some((t) => t === 'zk' || t === 'gk' || t === 'cet4')) return 'core';
  if (collins >= 3 && tags.some((t) => ['cet6', 'ky', 'toefl', 'ielts', 'gre'].includes(t))) return 'core';
  const rank = Math.min(bnc || Infinity, frq || Infinity);
  if (rank <= 8000) return 'core';
  return 'rare';
}
