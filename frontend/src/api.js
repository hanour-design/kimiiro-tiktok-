/**
 * Google Apps Script Web App API クライアント
 *
 * GAS のデプロイURLを localStorage に保存し、
 * そこに対してリクエストを送る。
 */

const STORAGE_KEY = 'kimiiro_gas_url';
const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbzsBss6H_YknWEQ9UgaXfHgfMdkvPLX5yWn4Rs_QzZ6AYuGtZcmSAuWc-L0mJC3qY3A3A/exec';

export function getGasUrl() {
  return localStorage.getItem(STORAGE_KEY) || DEFAULT_GAS_URL;
}

export function setGasUrl(url) {
  localStorage.setItem(STORAGE_KEY, url);
}

export function isConfigured() {
  return !!getGasUrl();
}

async function gasGet(params) {
  const url = getGasUrl();
  if (!url) throw new Error('APIのURLが設定されていません。設定画面でURLを入力してください。');

  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${url}?${query}`, {
    method: 'GET',
    redirect: 'follow',
  });

  if (!res.ok) {
    throw new Error('APIエラーが発生しました');
  }
  return res.json();
}

async function gasPost(body) {
  const url = getGasUrl();
  if (!url) throw new Error('APIのURLが設定されていません。設定画面でURLを入力してください。');

  const res = await fetch(url, {
    method: 'POST',
    redirect: 'follow',
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error('APIエラーが発生しました');
  }
  return res.json();
}

export const api = {
  // Characters
  getCharacters: (status) => gasGet({ action: 'characters', status: status || '' }),
  getCharacter: (id) => gasGet({ action: 'character', id }),
  createCharacter: (data) => gasPost({ action: 'createCharacter', data }),
  updateCharacter: (id, data) => gasPost({ action: 'updateCharacter', id, data }),
  deleteCharacter: (id) => gasPost({ action: 'deleteCharacter', id }),

  // Records
  getRecords: (charId, limit) => gasGet({ action: 'records', character_id: charId, limit: limit || '' }),
  createRecord: (data) => gasPost({ action: 'createRecord', data }),

  // Stats & Rankings
  getStats: () => gasGet({ action: 'stats' }),
  getRankings: (period) => gasGet({ action: 'rankings', period: period || 'week' }),

  // Export
  exportCsv: () => {
    const url = getGasUrl();
    return url ? `${url}?action=export` : '#';
  },

  // Seed
  seed: () => gasPost({ action: 'seed' }),
};
