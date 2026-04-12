// ─── Funding Store ────────────────────────────────────────────────────────────
import { writable, derived } from 'svelte/store';
import { api } from '../api.js';

export const fundraising = /** @type {import('svelte/store').Writable<any[]>} */ (writable([]));
export const sponsors    = /** @type {import('svelte/store').Writable<any[]>} */ (writable([]));
export const grants      = /** @type {import('svelte/store').Writable<any[]>} */ (writable([]));
export const clubDues    = /** @type {import('svelte/store').Writable<any[]>} */ (writable([]));
export const loading     = writable(false);
export const error       = writable(null);

export async function loadFunding(sync = false) {
  loading.set(true);
  error.set(null);
  try {
    const data = await api.funding.getAll(sync);
    fundraising.set(data.fundraising || []);
    sponsors.set(data.sponsors || []);
    grants.set(data.grants || []);
    clubDues.set(data.clubDues || []);
  } catch (/** @type {any} */ e) {
    error.set(e.message);
  } finally {
    loading.set(false);
  }
}

export const totalRaised = derived(
  [fundraising, sponsors, clubDues],
  ([$fr, $sp, $cd]) =>
    $fr.reduce((s, r) => s + (r.amount || 0), 0) +
    $sp.filter(s => s.contributionType === 'money').reduce((s, r) => s + (r.amount || 0), 0) +
    $cd.reduce((s, r) => s + (r.amount || 0), 0)
);
