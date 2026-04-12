// ─── Orders Store (From Google Sheets) ──────────────────────────────────────
import { writable, derived } from 'svelte/store';
import { api } from '../api.js';

/** @type {import('svelte/store').Writable<any[]>} */
export const orders      = writable([]);
/** @type {import('svelte/store').Writable<boolean>} */
export const loading     = writable(false);
/** @type {import('svelte/store').Writable<string | null>} */
export const error       = writable(null);
/** @type {import('svelte/store').Writable<Date | null>} */
export const lastSynced  = writable(null);

/** Load orders from the backend (sync=true bypasses server cache) */
export async function loadOrders(sync = false) {
  loading.set(true);
  error.set(null);
  try {
    const data = await api.orders.list(sync);
    orders.set(data);
    lastSynced.set(new Date());
  } catch (e) {
    error.set(/** @type {Error} */ (e).message);
  } finally {
    loading.set(false);
  }
}

/** Derived: total count */
export const orderCount = derived(orders, $o => $o.length);

/** Derived: total spent on orders */
export const totalOrders = derived(orders, $o => $o.reduce((s, o) => s + (o.total || 0), 0));
