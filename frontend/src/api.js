/**
 * Vercel API クライアント
 *
 * Vercel API Routes に対してリクエストを送る。
 * レスポンスはメモリキャッシュ（TTL付き）で高速化。
 */

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

export function isConfigured() {
  return true;
}

// ─── HTTP ───

async function apiGet(path, params, cacheKey) {
  if (cacheKey) {
    const cached = getCached(cacheKey);
    if (cached) return cached;
  }

  const query = params ? '?' + new URLSearchParams(params).toString() : '';
  const res = await fetch(`/api/${path}${query}`);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'APIエラーが発生しました');
  }
  const data = await res.json();

  if (cacheKey) setCache(cacheKey, data);
  return data;
}

async function apiPost(path, body) {
  const res = await fetch(`/api/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'APIエラーが発生しました');
  }
  clearCache();
  return res.json();
}

async function apiPut(path, params, body) {
  const query = params ? '?' + new URLSearchParams(params).toString() : '';
  const res = await fetch(`/api/${path}${query}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'APIエラーが発生しました');
  }
  clearCache();
  return res.json();
}

async function apiDelete(path, params) {
  const query = params ? '?' + new URLSearchParams(params).toString() : '';
  const res = await fetch(`/api/${path}${query}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'APIエラーが発生しました');
  }
  clearCache();
  return res.json();
}

// ─── API ───

export const api = {
  getDashboard: () => apiGet('dashboard', null, 'dashboard'),

  getCharacters: (status) => apiGet('characters', status ? { status } : null, `characters_${status || 'all'}`),
  getCharacter: (id) => apiGet('characters', { id }, `character_${id}`),
  createCharacter: (data) => apiPost('characters', data),
  updateCharacter: (id, data) => apiPut('characters', { id }, data),
  deleteCharacter: (id) => apiDelete('characters', { id }),

  getRecords: (charId, limit) => apiGet('records', { character_id: charId, ...(limit ? { limit } : {}) }, `records_${charId}_${limit || 'all'}`),
  createRecord: (data) => apiPost('records', data),

  getStats: () => apiGet('stats', null, 'stats'),
  getRankings: (period) => apiGet('rankings', { period: period || 'week' }, `rankings_${period || 'week'}`),

  exportCsv: () => '/api/export',

  seed: () => apiPost('seed', {}),
};
