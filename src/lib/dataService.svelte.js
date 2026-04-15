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
 * Includes improved error handling and GAS-specific response validation.
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
          console.log("💾 DataStore: Initialized from cache");
        }
      } catch (e) {
        console.warn("DataStore Cache Load Failed:", e);
      }
    }
  }

  /**
   * Persists current state to localStorage
   */
  persist() {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('westwood_finance_cache', JSON.stringify({
          orders: this.orders,
          funds: this.funds,
          budget: this.budget,
          lastFetched: this.lastFetched
        }));
      } catch (e) {
        console.warn("DataStore Cache Save Failed:", e);
      }
    }
  }

  /**
   * Normalizes order data from the API
   * @param {any[]} data 
   * @returns {Order[]}
   */
  normalizeOrders(data) {
    if (!Array.isArray(data)) return [];
    return data.map((o, index) => ({
      item: o.Item ?? o.item ?? "Unknown",
      company: o.Company ?? o.company ?? "",
      link: o.Link ?? o.link ?? "",
      price: Number(o.Price ?? o.price) || 0,
      quantity: Number(o.Quantity ?? o.quantity) || 1,
      notes: o.Notes ?? o.notes ?? "",
      category: (o.Category || o.category || "miscellaneous").toString().toLowerCase().trim(),
      team: o.Team ?? o.team ?? o.user ?? "",
      timestamp: o.Timestamp ?? o.timestamp ?? "",
      total: Number(o.Total ?? o.total) || (Number(o.Price ?? o.price) * Number(o.Quantity ?? o.quantity)) || 0,
      status: (o.Status ?? o.status ?? "Submitted and in review").toString().trim(),
      tracking: o.Tracking ?? o.tracking ?? "",
      id: o["List UUID"] || o.orderUUID || o.id || `order-${index}-${Date.now()}`,
      orderUUID: o["Order UUID"] || o.orderUUID || "",
      rowIndex: o.rowIndex ?? (index + 3)
    }));
  }

  /**
   * Performance-optimized loader.
   * Uses getAllData to fetch everything in ONE request.
   */
  async load(force = false) {
    // If not forced and we have data less than 2 minutes old, skip background refresh
    if (!force && this.orders.length > 0 && this.lastFetched && (Date.now() - this.lastFetched < 120000)) {
      return;
    }

    // Only show loading indicator if we have NO data at all
    if (this.orders.length === 0) {
      this.loading = true;
    }
    
    this.error = null;
    console.log("DataStore: Syncing with Google Sheets...");

    try {
      // Add a timeout to prevent infinite loading if Google is slow
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

      const res = await fetch(`${BASE_URL}?action=getAllData&key=${SECRET_KEY}`, {
          signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error(`Network error: ${res.status} ${res.statusText}`);

      const data = await res.json();
      
      // Handle GAS internal errors (it returns 200 even for logical errors)
      if (data.error) {
        throw new Error(`Google Script Error: ${data.error}`);
      }

      this.orders = this.normalizeOrders(data.orders || []);
      this.funds = Array.isArray(data.funds) ? data.funds : []; 
      this.budget = data.budget || null;
      this.lastFetched = Date.now();
      
      this.persist();
      console.log("✅ DataStore: Sync complete");
    } catch (e) {
      if (e instanceof Error) {
        this.error = e.name === 'AbortError' ? "Connection timed out. Trying again..." : e.message;
      } else {
        this.error = "Unknown error occurred while fetching data.";
      }
      console.error("DataStore Load Error:", e);
    } finally {
      this.loading = false;
    }
  }
}

export const dataService = new DataStore();
