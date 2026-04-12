// ─── Expenses Store ───────────────────────────────────────────────────────────
import { writable, derived } from 'svelte/store';
import { api } from '../api.js';

export const expenses    = writable([]);
export const loading     = writable(false);
export const error       = writable(null);
export const lastSynced  = writable(null);

/** Load expenses from the backend (sync=true bypasses server cache) */
export async function loadExpenses(sync = false) {
  loading.set(true);
  error.set(null);
  try {
    const data = await api.expenses.list(sync);
    expenses.set(data);
    lastSynced.set(new Date());
  } catch (e) {
    error.set(e.message);
  } finally {
    loading.set(false);
  }
}

/** Add a new expense and refresh */
export async function addExpense(data) {
  const res = await api.expenses.create(data);
  await loadExpenses(true);
  return res;
}

/** Derived: total count */
export const expenseCount = derived(expenses, $e => $e.length);

/** Derived: total spent */
export const totalSpent = derived(expenses, $e => $e.reduce((s, e) => s + (e.total || 0), 0));
