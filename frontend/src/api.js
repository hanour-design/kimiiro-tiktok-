const API_BASE = '/api';

async function request(url, options = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'エラーが発生しました' }));
    throw new Error(err.error || 'エラーが発生しました');
  }
  return res.json();
}

export const api = {
  // Characters
  getCharacters: (status) => request(`/characters${status ? `?status=${status}` : ''}`),
  getCharacter: (id) => request(`/characters/${id}`),
  createCharacter: (data) => request('/characters', { method: 'POST', body: JSON.stringify(data) }),
  updateCharacter: (id, data) => request(`/characters/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCharacter: (id) => request(`/characters/${id}`, { method: 'DELETE' }),

  // Records
  getRecords: (charId, limit) => request(`/characters/${charId}/records${limit ? `?limit=${limit}` : ''}`),
  createRecord: (data) => request('/records', { method: 'POST', body: JSON.stringify(data) }),

  // Stats & Rankings
  getStats: () => request('/stats'),
  getRankings: (period) => request(`/rankings?period=${period || 'week'}`),

  // Export
  exportCsv: () => `${API_BASE}/export/csv`,

  // Seed
  seed: () => request('/seed', { method: 'POST' }),
};
