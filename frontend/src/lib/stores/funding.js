// ─── Funding Store ────────────────────────────────────────────────────────────
import { writable, derived } from 'svelte/store';
import { api } from '../api.js';

export const fundraising = /** @type {import('svelte/store').Writable<any[]>} */ (writable([]));
export const sponsors    = /** @type {import('svelte/store').Writable<any[]>} */ (writable([]));
export const grants      = /** @type {import('svelte/store').Writable<any[]>} */ (writable([]));
export const clubDues    = /** @type {import('svelte/store').Writable<any[]>} */ (writable([]));
export const other       = /** @type {import('svelte/store').Writable<any[]>} */ (writable([]));
export const loading     = writable(false);
export const error       = writable(/** @type {string|null} */ (null));

export async function loadFunding(sync = false) {
  loading.set(true);
  error.set(null);
  try {
    const data = await api.funding.getAll(sync);
    fundraising.set(data.fundraising || []);
    sponsors.set(data.sponsors || []);
    grants.set(data.grants || []);
    clubDues.set(data.clubDues || []);
    other.set(data.other || []);
  } catch (/** @type {any} */ e) {
    error.set(e.message);
  } finally {
    loading.set(false);
  }
}

export const totalRaised = derived(
  [fundraising, sponsors, clubDues, other],
  ([$fr, $sp, $cd, $ot]) =>
    $fr.reduce((s, r) => s + (r.amount || 0), 0) +
    $sp.filter(s => s.contributionType === 'money').reduce((s, r) => s + (r.amount || 0), 0) +
    $cd.reduce((s, r) => s + (r.amount || 0), 0) +
    $ot.reduce((s, r) => s + (r.amount || 0), 0)
);
