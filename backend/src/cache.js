// ─── Simple TTL Cache ─────────────────────────────────────────────────────────
// Prevents hammering the Sheets API on every request.
// The Discord bot may write externally — the Sync endpoint bypasses this cache.

const { CACHE_TTL_MS } = require('./config');

class Cache {
  constructor() {
    /** @type {Map<string, { data: any, expiresAt: number }>} */
    this._store = new Map();
  }

  /** Returns cached value or null if missing/expired */
  get(key) {
    const entry = this._store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this._store.delete(key);
      return null;
    }
    return entry.data;
  }

  /** Stores a value with the configured TTL */
  set(key, data) {
    this._store.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
  }

  /** Forcibly invalidates a key (used by the Sync endpoint) */
  invalidate(key) {
    this._store.delete(key);
  }

  /** Clears everything */
  flush() {
    this._store.clear();
  }
}

module.exports = new Cache();
