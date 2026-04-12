// ─── API Client ───────────────────────────────────────────────────────────────
// All fetch calls to the backend go through here.
// Base URL is read from an env var so it's easy to switch between dev/prod.

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  const contentType = res.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await res.json() : await res.text();

  if (!res.ok) {
    const msg = body?.error || body || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return body;
}

// ── Expenses ──────────────────────────────────────────────────────────────────
export const api = {
  expenses: {
    list: (sync = false) => request(`/expenses${sync ? '?sync=true' : ''}`),
    create: (data) => request('/expenses', { method: 'POST', body: JSON.stringify(data) }),
  },

  stats: {
    get: (sync = false) => request(`/stats${sync ? '?sync=true' : ''}`),
  },

  funding: {
    getAll: (sync = false) => request(`/funding${sync ? '?sync=true' : ''}`),
    addFundraising: (data) => request('/funding/fundraising', { method: 'POST', body: JSON.stringify(data) }),
    addSponsor:     (data) => request('/funding/sponsor',     { method: 'POST', body: JSON.stringify(data) }),
    addGrant:       (data) => request('/funding/grant',       { method: 'POST', body: JSON.stringify(data) }),
  },
};
