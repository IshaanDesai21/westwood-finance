// ─── API Client ───────────────────────────────────────────────────────────────
// All fetch calls to the backend go through here.

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

/**
 * @param {string} path
 * @param {RequestInit} options
 */
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

// ── Expenses & Orders ─────────────────────────────────────────────────────────
export const api = {
  expenses: {
    list:   ()          => request('/expenses'),
    create: (/** @type {any} */ data) => request('/expenses', { method: 'POST', body: JSON.stringify(data) }),
  },

  orders: {
    list:         (sync = false) => request(`/orders${sync ? '?sync=true' : ''}`),
    create:       (/** @type {any} */ data) => request('/orders', { method: 'POST', body: JSON.stringify(data) }),
    updateStatus: (/** @type {number} */ rowIndex, /** @type {string} */ status, /** @type {string} */ tracking = '') =>
      request(`/orders/${rowIndex}/status`, { method: 'PATCH', body: JSON.stringify({ status, tracking }) }),
  },

  stats: {
    get: (sync = false) => request(`/stats${sync ? '?sync=true' : ''}`),
  },

  funding: {
    getAll:         (sync = false) => request(`/funding${sync ? '?sync=true' : ''}`),
    addFundraising: (/** @type {any} */ data) => request('/funding/fundraising', { method: 'POST', body: JSON.stringify(data) }),
    addSponsor:     (/** @type {any} */ data) => request('/funding/sponsor',     { method: 'POST', body: JSON.stringify(data) }),
    addGrant:       (/** @type {any} */ data) => request('/funding/grant',       { method: 'POST', body: JSON.stringify(data) }),
    addClubDues:    (/** @type {any} */ data) => request('/funding/club-dues',   { method: 'POST', body: JSON.stringify(data) }),
    addOther:       (/** @type {any} */ data) => request('/funding/other',       { method: 'POST', body: JSON.stringify(data) }),
  },

  budget: {
    get:    ()                                              => request('/budget'),
    update: (/** @type {any} */ budgets, /** @type {string} */ password) =>
      request('/budget', { method: 'PUT', body: JSON.stringify({ budgets, password }) }),
  },

  auth: {
    verify: (/** @type {string} */ password) => request('/auth/verify', { method: 'POST', body: JSON.stringify({ password }) }),
  }
};
