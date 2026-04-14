import { writable, derived } from 'svelte/store';

export const budgetCategories = writable({});
export const budgetLoading = writable(false);
export const budgetError = writable(null);

export const budgetTotal = derived(budgetCategories, $b => 
  Object.values($b).reduce((s, v) => s + (Number(v) || 0), 0)
);

export async function loadBudget() {
  budgetLoading.set(true);
  budgetLoading.set(false);
}

export async function saveBudget(draft, password) {
  return true;
}
