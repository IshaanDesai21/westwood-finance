const BASE_URL = "https://script.google.com/macros/s/AKfycbyXV4zW95BNG4oxUkY-efWG6jX9W9JxsdgO3JC8qGfoZ9EmTqjTVPJpnZiHJc1jA7SXiA/exec";
const SECRET_KEY = "YOUR_SECRET_KEY";

/**
 * @typedef {Object} Order
 * @property {string} item
 * @property {string} company
 * @property {string} link
 * @property {number} price
 * @property {number} quantity
 * @property {string} notes
 * @property {string} category
 * @property {string} team
 * @property {string} timestamp
 * @property {number} total
 * @property {string} status
 * @property {string} tracking
 * @property {string} id
 * @property {string} orderUUID
 */

/**
 * Global reactive data store for the application.
 * Uses Svelte 5 $state for fine-grained reactivity.
 */
class DataStore {
  /** @type {Order[]} */
  orders = $state([]);
  /** @type {any[]} */
  funds = $state([]);
  /** @type {any} */
  budget = $state(null);
  /** @type {boolean} */
  loading = $state(false);
  /** @type {string | null} */
  error = $state(/** @type {string|null} */ (null));
  /** @type {number | null} */
  lastFetched = $state(/** @type {number|null} */ (null));

  /**
   * Normalizes order data from the API
   * @param {any[]} data 
   * @returns {Order[]}
   */
  normalizeOrders(data) {
    return data.map(o => ({
      item: o.Item ?? o.item,
      company: o.Company ?? o.company,
      link: o.Link ?? o.link,
      price: Number(o.Price ?? o.price) || 0,
      quantity: Number(o.Quantity ?? o.quantity) || 1,
      notes: o.Notes ?? o.notes,
      category: (o.Category || o.category || "miscellaneous").toString().toLowerCase().trim(),
      team: o.Team ?? o.user,
      timestamp: o.Timestamp ?? o.timestamp,
      total: Number(o.Total ?? o.total) || (Number(o.Price ?? o.price) * Number(o.Quantity ?? o.quantity)) || 0,
      status: (o.Status ?? o.status ?? "Submitted and in review").toString().trim(),
      tracking: o.Tracking ?? o.tracking,
      id: o["List UUID"] || o.id || crypto.randomUUID(),
      orderUUID: o["Order UUID"] || "",
    }));
  }

  /**
   * Main loader for the entire dataset
   * @param {boolean} force - If true, ignores cache and re-fetches
   */
  async load(force = false) {
    // If not forced and we have data less than 5 minutes old, skip
    if (!force && this.orders.length > 0 && this.lastFetched && (Date.now() - this.lastFetched < 300000)) {
      return;
    }

    this.loading = true;
    this.error = null;

    try {
      const [oRes, fRes, bRes] = await Promise.all([
        fetch(`${BASE_URL}?action=getOrders&key=${SECRET_KEY}`),
        fetch(`${BASE_URL}?action=getFunds&key=${SECRET_KEY}`),
        fetch(`${BASE_URL}?action=getBudget&key=${SECRET_KEY}`),
      ]);

      if (!oRes.ok || !fRes.ok || !bRes.ok) throw new Error("Network response was not ok");

      const [oData, fData, bData] = await Promise.all([
        oRes.json(),
        fRes.json(),
        bRes.json()
      ]);

      this.orders = this.normalizeOrders(oData);
      this.funds = fData; 
      this.budget = bData;
      this.lastFetched = Date.now();
    } catch (e) {
      this.error = e instanceof Error ? e.message : "Failed to load data";
      console.error("DataStore Load Error:", e);
    } finally {
      this.loading = false;
    }
  }
}

export const dataService = new DataStore();
