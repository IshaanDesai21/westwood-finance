// ─── Budget Store ─────────────────────────────────────────────────────────────
import { writable, derived } from 'svelte/store';
import { api } from '../api.js';

/** @type {import('svelte/store').Writable<Record<string,number>>} */
export const budgetCategories = writable({
  hardware: 0,
  software: 0,
  outreach: 0,
  food: 0,
  miscellaneous: 0,
});

export const budgetLoading = writable(false);
export const budgetError   = writable(/** @type {string|null} */ (null));
export const budgetTotal   = derived(budgetCategories, $b =>
  Object.values($b).reduce((s, v) => s + v, 0)
);

export async function loadBudget() {
  budgetLoading.set(true);
  budgetError.set(null);
  try {
    const data = await api.budget.get();
    budgetCategories.set(data.budgets || {});
  } catch (/** @type {any} */ e) {
    budgetError.set(e.message);
  } finally {
    budgetLoading.set(false);
  }
}

/**
 * Save category budgets (admin only — requires password)
 * @param {Record<string,number>} budgets
 * @param {string} password
 */
export async function saveBudget(budgets, password) {
  budgetLoading.set(true);
  budgetError.set(null);
  try {
    const data = await api.budget.update(budgets, password);
    budgetCategories.set(data.budgets || {});
    return data;
  } catch (/** @type {any} */ e) {
    budgetError.set(e.message);
    throw e;
  } finally {
    budgetLoading.set(false);
  }
}
