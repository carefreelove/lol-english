import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { dirname } from 'node:path';
import { createWriteStream } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { RETRIES, TIMEOUT_MS } from '../config.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 限并发地跑 worker，返回与 items 同序的结果数组 */
export async function mapLimit(items, limit, worker) {
  const out = new Array(items.length);
  let next = 0;
  const run = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await worker(items[i], i);
    }
  };
  const n = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: n }, run));
  return out;
}

async function fetchOnce(url, timeout = TIMEOUT_MS) {
  return fetch(url, { signal: AbortSignal.timeout(timeout) });
}

/** 带指数退避重试的请求；404 返回 null（不重试） */
async function fetchWithRetry(url, { retries = RETRIES, timeout = TIMEOUT_MS } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetchOnce(url, timeout);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
      return res;
    } catch (e) {
      lastErr = e;
      if (attempt < retries) await sleep(Math.min(2 ** attempt * 500, 8000));
    }
  }
  throw lastErr;
}

/** 无缓存的 JSON 请求 */
export async function getJson(url) {
  const res = await fetchWithRetry(url);
  if (!res) return null;
  return res.json();
}

/** 带磁盘缓存的 JSON 请求；cachePath 存在则直接读 */
export async function getJsonCached(url, cachePath) {
  try {
    const txt = await readFile(cachePath, 'utf8');
    return JSON.parse(txt);
  } catch {
    /* miss */
  }
  const res = await fetchWithRetry(url);
  if (!res) return null;
  const data = await res.json();
  await mkdir(dirname(cachePath), { recursive: true });
  await writeFile(cachePath, JSON.stringify(data));
  return data;
}

/** 带磁盘缓存的纯文本请求 */
export async function getTextCached(url, cachePath) {
  try {
    return await readFile(cachePath, 'utf8');
  } catch {
    /* miss */
  }
  const res = await fetchWithRetry(url);
  if (!res) return null;
  const txt = await res.text();
  await mkdir(dirname(cachePath), { recursive: true });
  await writeFile(cachePath, txt);
  return txt;
}

/** 下载文件（缓存命中则跳过）。返回是否真的下载了 */
export async function downloadCached(url, destPath, { minBytes = 0 } = {}) {
  try {
    const s = await stat(destPath);
    if (s.size >= minBytes) return false;
  } catch {
    /* miss */
  }
  const res = await fetchWithRetry(url);
  if (!res) return false;
  await mkdir(dirname(destPath), { recursive: true });
  await pipeline(Readable.fromWeb(res.body), createWriteStream(destPath));
  return true;
}

/**
 * 流式解析远程 CSV：拿 fetch 的 body 流转成 Node 流，
 * onRow 逐行回调。避免把 65MB 一次性读进内存。
 */
export async function streamRemote(url, onStream) {
  const res = await fetchWithRetry(url, { timeout: 120000 });
  if (!res) throw new Error('下载失败: ' + url);
  return onStream(Readable.fromWeb(res.body));
}

/** 直接读取本地文件为流（用于缓存的 ECDICT CSV） */
export function isReadable(path, minBytes = 0) {
  return stat(path)
    .then((s) => s.size >= minBytes)
    .catch(() => false);
}
