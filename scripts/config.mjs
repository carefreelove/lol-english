import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));

export const ROOT = dirname(HERE);
export const CACHE_DIR = join(ROOT, '.cache');
export const PUBLIC_DIR = join(ROOT, 'public');
export const DATA_DIR = join(PUBLIC_DIR, 'data');

export const DDRAGON = 'https://ddragon.leagueoflegends.com';
export const VERSIONS_URL = `${DDRAGON}/api/versions.json`;

// 官方数据只取这两种官方语言包，中英文案均来自官方库
export const LOCALES = ['en_US', 'zh_CN'];

// 网络并发与重试
export const CONCURRENCY = 8;
export const RETRIES = 4;
export const TIMEOUT_MS = 20000;

// 词典来源（unpkg 上的 ECDICT）
export const ECDICT_CSV_URL = 'https://unpkg.com/ecdict@0.0.4/assets/ecdict.csv';
export const ECDICT_LEMMA_URL = 'https://unpkg.com/ecdict@0.0.4/assets/lemma.en.txt';
export const ECDICT_MIN_BYTES = 60 * 1024 * 1024;

// 召唤师峡谷地图 id
export const SR_MAP_ID = '11';
