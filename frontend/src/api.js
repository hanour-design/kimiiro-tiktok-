/**
 * Google Apps Script Web App API クライアント
 *
 * GAS のデプロイURLを localStorage に保存し、
 * そこに対してリクエストを送る。
 * レスポンスはメモリキャッシュ（TTL付き）で高速化。
 */

const STORAGE_KEY = 'kimiiro_gas_url';
const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbzsBss6H_YknWEQ9UgaXfHgfMdkvPLX5yWn4Rs_QzZ6AYuGtZcmSAuWc-L0mJC3qY3A3A/exec';

// ─── キャッシュ（TTL: 60秒） ───
const cache = {};
const CACHE_TTL = 60 * 1000;

function getCached(key) {
  const entry = cache[key];
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  return null;
}

function setCache(key, data) {
  cache[key] = { data, ts: Date.now() };
}

export function clearCache() {
  for (const key in cache) delete cache[key];
}

// ─── 設定 ───

export function getGasUrl() {
  return localStorage.getItem(STORAGE_KEY) || DEFAULT_GAS_URL;
}

export function setGasUrl(url) {
  localStorage.setItem(STORAGE_KEY, url);
}

export function isConfigured() {
  return !!getGasUrl();
}

// ─── HTTP ───

async function gasGet(params, cacheKey) {
  if (cacheKey) {
    const cached = getCached(cacheKey);
    if (cached) return cached;
  }

  const url = getGasUrl();
  if (!url) throw new Error('APIのURLが設定されていません。');

  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${url}?${query}`, {
    method: 'GET',
    redirect: 'follow',
  });

  if (!res.ok) throw new Error('APIエラーが発生しました');
  const data = await res.json();

  if (cacheKey) setCache(cacheKey, data);
  return data;
}

async function gasPost(body) {
  const url = getGasUrl();
  if (!url) throw new Error('APIのURLが設定されていません。');

  const res = await fetch(url, {
    method: 'POST',
    redirect: 'follow',
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error('APIエラーが発生しました');
  // POST後はキャッシュクリア（データが変わるため）
  clearCache();
  return res.json();
}

// ─── API ───

export const api = {
  // Dashboard（stats + characters を1回で取得）
  getDashboard: () => gasGet({ action: 'dashboard' }, 'dashboard'),

  // Characters
  getCharacters: (status) => gasGet({ action: 'characters', status: status || '' }, `characters_${status || 'all'}`),
  getCharacter: (id) => gasGet({ action: 'character', id }, `character_${id}`),
  createCharacter: (data) => gasPost({ action: 'createCharacter', data }),
  updateCharacter: (id, data) => gasPost({ action: 'updateCharacter', id, data }),
  deleteCharacter: (id) => gasPost({ action: 'deleteCharacter', id }),

  // Records
  getRecords: (charId, limit) => gasGet({ action: 'records', character_id: charId, limit: limit || '' }, `records_${charId}_${limit || 'all'}`),
  createRecord: (data) => gasPost({ action: 'createRecord', data }),

  // Stats & Rankings
  getStats: () => gasGet({ action: 'stats' }, 'stats'),
  getRankings: (period) => gasGet({ action: 'rankings', period: period || 'week' }, `rankings_${period || 'week'}`),

  // Export
  exportCsv: () => {
    const url = getGasUrl();
    return url ? `${url}?action=export` : '#';
  },

  // Seed
  seed: () => gasPost({ action: 'seed' }),
};
