// ─── Orders Store (From Google Sheets) ──────────────────────────────────────
import { writable, derived } from 'svelte/store';
import { api } from '../api.js';

export const orders      = writable([]);
export const loading     = writable(false);
export const error       = writable(null);
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
    error.set(e.message);
  } finally {
    loading.set(false);
  }
}

/** Derived: total count */
export const orderCount = derived(orders, $o => $o.length);

/** Derived: total spent on orders */
export const totalOrders = derived(orders, $o => $o.reduce((s, o) => s + (o.total || 0), 0));
