// ─── Stats Route ──────────────────────────────────────────────────────────────
const express = require('express');
const router = express.Router();
const { readSheet } = require('../sheetsClient');
const cache = require('../cache');
const { SHEET_NAMES, EXPENSE_COLS, CATEGORIES, SEASON_BUDGET } = require('../config');

const CACHE_KEY = 'stats';

function isHeaderRow(row) {
  return (row[0] || '').toString().toLowerCase() === 'item';
}
function isGrandTotalRow(row) {
  const v = (row[0] || '').toString().toUpperCase();
  return v.includes('GRAND') || v.includes('TOTAL') || v.includes('SUM');
}
function safeNum(val) { return parseFloat(val) || 0; }

// GET /api/stats
router.get('/', async (req, res) => {
  try {
    if (req.query.sync === 'true') cache.invalidate(CACHE_KEY);

    const cached = cache.get(CACHE_KEY);
    if (cached) return res.json(cached);

    const rows = await readSheet(SHEET_NAMES.EXPENSES);
    if (!rows || rows.length === 0) return res.json(buildEmpty());

    const startIndex = isHeaderRow(rows[0]) ? 1 : 0;
    const data = rows.slice(startIndex).filter(r => !isGrandTotalRow(r) && r[EXPENSE_COLS.ITEM]);

    // ── Totals ────────────────────────────────────────────────────────────────
    const totalSpent = data.reduce((sum, r) => sum + safeNum(r[EXPENSE_COLS.TOTAL]), 0);
    const totalItems = data.length;

    // ── By category ──────────────────────────────────────────────────────────
    const byCategory = {};
    CATEGORIES.forEach(c => { byCategory[c] = 0; });
    data.forEach(r => {
      const cat = (r[EXPENSE_COLS.CATEGORY] || 'miscellaneous').toLowerCase();
      const key = CATEGORIES.includes(cat) ? cat : 'miscellaneous';
      byCategory[key] += safeNum(r[EXPENSE_COLS.TOTAL]);
    });

    // ── Monthly trends ────────────────────────────────────────────────────────
    const monthly = {};
    data.forEach(r => {
      const ts = r[EXPENSE_COLS.TIMESTAMP] || '';
      if (!ts) return;
      const d = new Date(ts);
      if (isNaN(d)) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthly[key] = (monthly[key] || 0) + safeNum(r[EXPENSE_COLS.TOTAL]);
    });
    const monthlyTrends = Object.entries(monthly)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => ({ month, amount }));

    // ── Most expensive item ───────────────────────────────────────────────────
    const mostExpensive = data.reduce((best, r) => {
      const t = safeNum(r[EXPENSE_COLS.TOTAL]);
      return t > (best?.total || 0)
        ? { item: r[EXPENSE_COLS.ITEM], total: t, company: r[EXPENSE_COLS.COMPANY] }
        : best;
    }, null);

    // ── Top vendor ───────────────────────────────────────────────────────────
    const vendorCount = {};
    data.forEach(r => {
      const co = (r[EXPENSE_COLS.COMPANY] || '').trim();
      if (co) vendorCount[co] = (vendorCount[co] || 0) + 1;
    });
    const topVendor = Object.entries(vendorCount).sort(([,a],[,b]) => b - a)[0] || null;

    // ── Average cost ──────────────────────────────────────────────────────────
    const avgCost = totalItems > 0 ? totalSpent / totalItems : 0;

    const stats = {
      totalSpent,
      totalItems,
      avgCost,
      seasonBudget: SEASON_BUDGET,
      budgetRemaining: SEASON_BUDGET !== null ? SEASON_BUDGET - totalSpent : null,
      byCategory,
      monthlyTrends,
      mostExpensive,
      topVendor: topVendor ? { company: topVendor[0], count: topVendor[1] } : null,
    };

    cache.set(CACHE_KEY, stats);
    res.json(stats);
  } catch (err) {
    console.error('[stats GET]', err.message);
    res.status(500).json({ error: 'Failed to compute stats', detail: err.message });
  }
});

function buildEmpty() {
  const byCategory = {};
  CATEGORIES.forEach(c => { byCategory[c] = 0; });
  return {
    totalSpent: 0, totalItems: 0, avgCost: 0,
    seasonBudget: SEASON_BUDGET, budgetRemaining: SEASON_BUDGET,
    byCategory, monthlyTrends: [], mostExpensive: null, topVendor: null,
  };
}

module.exports = router;
