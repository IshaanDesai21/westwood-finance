// ─── Expenses Store ───────────────────────────────────────────────────────────
import { writable, derived } from 'svelte/store';
import { api } from '../api.js';

/** @type {import('svelte/store').Writable<any[]>} */
export const expenses    = writable([]);
/** @type {import('svelte/store').Writable<boolean>} */
export const loading     = writable(false);
/** @type {import('svelte/store').Writable<string | null>} */
export const error       = writable(null);
/** @type {import('svelte/store').Writable<Date | null>} */
export const lastSynced  = writable(null);

/** Load expenses from the backend */
export async function loadExpenses() {
  loading.set(true);
  error.set(null);
  try {
    const data = await api.expenses.list();
    expenses.set(data);
  } catch (e) {
    error.set(/** @type {Error} */ (e).message);
  } finally {
    loading.set(false);
  }
}

/** Add a new expense and refresh */
export async function addExpense(/** @type {any} */ data) {
  const res = await api.expenses.create(data);
  await loadExpenses();
  return res;
}

/** Derived: total count */
export const expenseCount = derived(expenses, $e => $e.length);

/** Derived: total spent */
export const totalSpent = derived(expenses, $e => $e.reduce((s, e) => s + (e.total || 0), 0));
