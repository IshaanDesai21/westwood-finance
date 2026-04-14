const BASE_URL = "https://script.google.com/macros/s/AKfycbyN3GVRJLgyyOy35q6FUnnKdVlMxFVTVlpsemhyI8qu6DvXkLhP43zRbxPD_lhJ8nXwXQ/exec";
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
 * @property {number} rowIndex
 */

/**
 * Global reactive data store for the application.
 * Uses Svelte 5 $state with localStorage persistence for "Instant Load".
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

  constructor() {
    // 🏠 Initialize from localStorage for instant boot
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('westwood_finance_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          this.orders = parsed.orders || [];
          this.funds = parsed.funds || [];
          this.budget = parsed.budget || null;
          this.lastFetched = parsed.lastFetched || null;
        }
      } catch (e) {
        console.warn("Failed to load cache:", e);
      }
    }
  }

  /**
   * Persists current state to localStorage
   */
  persist() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('westwood_finance_cache', JSON.stringify({
        orders: this.orders,
        funds: this.funds,
        budget: this.budget,
        lastFetched: this.lastFetched
      }));
    }
  }

  /**
   * Normalizes order data from the API
   * @param {any[]} data 
   * @returns {Order[]}
   */
  normalizeOrders(data) {
    return data.map((o, index) => ({
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
      orderUUID: o["Order UUID"] || o.orderUUID || "",
      rowIndex: o.rowIndex ?? (index + 3)
    }));
  }

  /**
   * Performance-optimized loader.
   * Uses getAllData to fetch everything in ONE request.
   * @param {boolean} force - If true, ignores cache and re-fetches
   */
  async load(force = false) {
    // If not forced and we have fresh data (under 2 mins), skip background refresh
    if (!force && this.orders.length > 0 && this.lastFetched && (Date.now() - this.lastFetched < 120000)) {
      return;
    }

    // Only show loading indicator if we have NO data at all
    if (this.orders.length === 0) {
      this.loading = true;
    }
    
    this.error = null;

    try {
      // 🚀 Consolidated 'getAllData' call (Faster Dashboard)
      const res = await fetch(`${BASE_URL}?action=getAllData&key=${SECRET_KEY}`);
      if (!res.ok) throw new Error("Network response was not ok");

      const data = await res.json();
      
      this.orders = this.normalizeOrders(data.orders || []);
      this.funds = data.funds || []; 
      this.budget = data.budget || null;
      this.lastFetched = Date.now();
      
      this.persist();
    } catch (e) {
      this.error = e instanceof Error ? e.message : "Failed to load data";
      console.error("DataStore Load Error:", e);
    } finally {
      this.loading = false;
    }
  }
}

export const dataService = new DataStore();
