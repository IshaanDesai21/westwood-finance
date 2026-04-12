// ─── Shared Utility Functions ─────────────────────────────────────────────────

/** 
 * Format a number as USD currency 
 * @param {number} n 
 */
export function formatCurrency(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0);
}

/** 
 * Format an ISO timestamp to "Jan 5, 2025" 
 * @param {string | number | Date} ts 
 */
export function formatDate(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return String(ts);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/** 
 * Turn "2025-04" into "Apr 2025" 
 * @param {string} key 
 */
export function formatMonth(key) {
  if (!key) return '';
  const [y, m] = key.split('-');
  return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

/** 
 * Capitalize first letter 
 * @param {string} str 
 */
export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/** 
 * Safe truncate 
 * @param {string} str 
 * @param {number} max 
 */
export function truncate(str, max = 40) {
  if (!str) return '—';
  return str.length > max ? str.slice(0, max) + '…' : str;
}

/** Category color map (CSS var names) */
export const CATEGORY_COLORS = {
  hardware:      '#e07b30',
  software:      '#4e9af1',
  outreach:      '#6bcb77',
  food:          '#f1a94e',
  miscellaneous: '#b97cf3',
};

/** Valid categories (mirrors backend config) */
export const CATEGORIES = ['hardware', 'software', 'outreach', 'food', 'miscellaneous'];

/** Contribution types for sponsors */
export const CONTRIBUTION_TYPES = ['money', 'parts', 'services'];

/** Grant statuses */
export const GRANT_STATUSES = ['Applied', 'Pending', 'Awarded', 'Rejected'];
