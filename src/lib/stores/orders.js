import { writable, derived } from 'svelte/store';

export const orders = writable([]);
export const loading = writable(false);
export const error = writable(null);

export async function loadOrders(force = false) {
  loading.set(true);
  try {
    // Basic mock or actual fetch if needed
    // In a real scenario, this would call an API
    loading.set(false);
  } catch (e) {
    error.set(e.message);
    loading.set(false);
  }
}

export async function updateOrderStatus(id, status, tracking) {
  // Mock update
  return true;
}
