import { writable, derived } from 'svelte/store';

export const expenses = writable([]);
export const loading = writable(false);
export const error = writable(null);
export const totalSpent = derived(expenses, $e => $e.reduce((s, x) => s + (x.amount || 0), 0));

export async function loadExpenses() {
  loading.set(true);
  loading.set(false);
}
