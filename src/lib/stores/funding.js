import { writable, derived } from 'svelte/store';

export const fundraising = writable([]);
export const sponsors = writable([]);
export const grants = writable([]);
export const clubDues = writable([]);
export const other = writable([]);
export const loading = writable(false);
export const error = writable(null);

export const totalRaised = derived(
  [fundraising, sponsors, clubDues, other],
  ([$f, $s, $c, $o]) => {
    const sum = (arr) => arr.reduce((acc, item) => acc + (item.amount || 0), 0);
    return sum($f) + sum($s) + sum($c) + sum($o);
  }
);

export async function loadFunding(force = false) {
  loading.set(true);
  loading.set(false);
}
